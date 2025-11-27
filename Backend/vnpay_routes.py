"""
VNPAY Payment Routes for Medicare Backend
Integrated payment flow based on official VNPAY documentation
"""

from flask import request, jsonify, redirect
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timedelta
from urllib.parse import urlencode, quote
from functools import wraps
import json

from config import Config
from vnpay_helpers import VNPAYHelper, log_vnpay_transaction


# Helper to get client IP address
def get_client_ip(req):
    """Extract real client IP address"""
    if req.headers.get('X-Forwarded-For'):
        return req.headers.get('X-Forwarded-For').split(',')[0].strip()
    return req.remote_addr or '127.0.0.1'


def setup_vnpay_routes(app, db, token_required):
    """
    Setup VNPAY payment routes
    
    Args:
        app: Flask application
        db: MongoDB database connection
        token_required: Decorator for JWT authentication
    """

    # ============================================================================
    # ENDPOINT 1: POST /api/payment/vnpay/create
    # Purpose: Create VNPAY payment URL and redirect customer to payment gateway
    # Client: Frontend (authenticated user)
    # ============================================================================
    
    @app.route('/api/payment/vnpay/create', methods=['POST'])
    @token_required
    def create_vnpay_payment(current_user):
        """
        Create VNPAY payment URL
        
        Frontend flow:
        1. User has already created order (POST /api/orders)
        2. User selects VNPAY as payment method
        3. Frontend calls this endpoint with orderId
        4. Backend returns payment URL
        5. Frontend redirects user to VNPAY payment gateway
        
        Request body:
        {
            "orderId": "<MongoDB ObjectId>"
        }
        
        Response:
        {
            "paymentUrl": "<full_vnpay_url>",
            "orderId": "<orderId>",
            "amountVnd": <amount_in_vnd>
        }
        """
        
        try:
            # Step 0: Validate VNPAY configuration
            if not Config.VNP_TMN_CODE or not Config.VNP_HASH_SECRET:
                print("❌ VNPAY: Configuration missing")
                return jsonify({
                    'success': False,
                    'error': 'VNPAY payment gateway is not configured'
                }), 503

            # Step 1: Parse request
            payload = request.get_json(force=True, silent=True) or {}
            order_id = payload.get('orderId')

            if not order_id:
                return jsonify({
                    'success': False,
                    'error': 'orderId is required'
                }), 400

            print(f"\n{'='*80}")
            print(f"🔗 VNPAY CREATE PAYMENT: orderId={order_id}")
            print(f"{'='*80}")

            # Step 2: Find order in database
            order = None
            try:
                # Try as MongoDB ObjectId first
                order = db.orders.find_one({'_id': ObjectId(order_id)})
            except (InvalidId, TypeError):
                # Try as string orderId
                order = db.orders.find_one({'orderId': order_id})

            if not order:
                print(f"❌ Order not found: {order_id}")
                return jsonify({
                    'success': False,
                    'error': 'Order not found'
                }), 404

            print(f"✅ Order found: {order_id}")

            # Step 3: Verify user ownership (authorization)
            user_id = str(current_user['_id'])
            order_user_id = order.get('userId') or order.get('user_id')
            
            if str(order_user_id) != user_id:
                print(f"❌ Permission denied: user {user_id} != order owner {order_user_id}")
                return jsonify({
                    'success': False,
                    'error': 'You do not have permission to pay for this order'
                }), 403

            # Step 4: Verify order hasn't been paid already
            payment_info = order.get('payment') or {}
            payment_status = (payment_info.get('status') or '').lower()
            
            if payment_status == 'paid':
                print(f"❌ Order already paid")
                return jsonify({
                    'success': False,
                    'error': 'This order has already been paid'
                }), 400

            # Step 5: Verify payment method is VNPAY
            payment_method = (order.get('paymentMethod') or order.get('payment_method') or '').upper()
            
            if payment_method != 'VNPAY':
                print(f"❌ Payment method mismatch: {payment_method} != VNPAY")
                return jsonify({
                    'success': False,
                    'error': f'This order is configured for {payment_method} payment, not VNPAY'
                }), 400

            # Step 6: Get order amount and convert USD -> VND
            try:
                order_total_usd = float(order.get('total') or order.get('totalUsd') or 0)
                if order_total_usd <= 0:
                    raise ValueError("Order total must be > 0")
            except (ValueError, TypeError) as e:
                print(f"❌ Invalid order total: {e}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid order total amount'
                }), 400

            # Convert USD to VND
            amount_vnd = VNPAYHelper.usd_to_vnd(order_total_usd)
            
            print(f"💱 Currency conversion: {order_total_usd} USD → {amount_vnd} VND")

            # Step 7: Get order description (sanitize for VNPAY)
            order_desc = f"Thanh toan don hang {order.get('orderId') or str(order['_id'])}"
            
            # Step 8: Get client IP address
            client_ip = get_client_ip(request)
            print(f"📍 Client IP: {client_ip}")

            # Step 9: Build VNPAY payment URL
            try:
                payment_url, amount_vnd_verify = VNPAYHelper.build_payment_url(
                    order_id=str(order['_id']),
                    amount_usd=order_total_usd,
                    order_description=order_desc,
                    client_ip=client_ip,
                    locale="vn",
                    bank_code=None  # Let user choose bank at VNPAY
                )
                
                print(f"✅ Payment URL generated (length: {len(payment_url)})")
                print(f"   URL preview: {payment_url[:100]}...")
                
            except Exception as e:
                print(f"❌ Failed to build payment URL: {e}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to generate payment URL: {str(e)}'
                }), 500

            # Step 10: Update order payment status to PENDING
            try:
                db.orders.update_one(
                    {'_id': order['_id']},
                    {
                        '$set': {
                            'payment.method': 'VNPAY',
                            'payment.status': 'Pending',
                            'payment.initiatedAt': datetime.utcnow(),
                            'updatedAt': datetime.utcnow()
                        }
                    },
                    upsert=False
                )
                print(f"📝 Order updated: payment.status = Pending")
                
            except Exception as e:
                print(f"⚠️  Warning: Failed to update order status: {e}")
                # Don't fail the request - payment URL is still valid

            # Step 11: Log transaction event
            log_vnpay_transaction(
                event="CREATE_URL",
                order_id=str(order['_id']),
                status="PENDING",
                amount_vnd=amount_vnd
            )

            # Step 12: Return response
            response = {
                'success': True,
                'paymentUrl': payment_url,
                'orderId': str(order['_id']),
                'amountVnd': amount_vnd,
                'amountUsd': order_total_usd
            }
            
            print(f"✅ Response sent to frontend")
            print(f"{'='*80}\n")
            
            return jsonify(response), 200

        except Exception as e:
            print(f"❌ VNPAY CREATE ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return jsonify({
                'success': False,
                'error': 'An error occurred while creating payment URL'
            }), 500


    # ============================================================================
    # ENDPOINT 2: GET /api/payment/vnpay/ipn
    # Purpose: Receive payment confirmation from VNPAY (server-to-server)
    # Client: VNPAY server
    # ============================================================================

    @app.route('/api/payment/vnpay/ipn', methods=['GET'])
    def vnpay_ipn():
        """
        IPN (Instant Payment Notification) - VNPAY calls this URL to notify payment result
        
        This is the most important endpoint:
        - VNPAY server calls this after payment completes
        - This endpoint is the source of truth for payment status
        - We update order status here
        - We return RspCode to tell VNPAY if we successfully processed
        
        Query parameters: Same as Return URL
        vnp_Amount, vnp_BankCode, vnp_ResponseCode, vnp_TransactionStatus, etc.
        
        Response: JSON with RspCode and Message
        {
            "RspCode": "00",  // 00=success, 01/04/97/99=retry needed
            "Message": "Confirm Success"
        }
        """
        
        try:
            print(f"\n{'='*80}")
            print(f"📬 VNPAY IPN RECEIVED")
            print(f"{'='*80}")

            # Step 1: Get all query parameters from VNPAY
            params = request.args.to_dict()
            
            print(f"\n📥 Received parameters from VNPAY:")
            for key, value in sorted(params.items()):
                if key != 'vnp_SecureHash':
                    print(f"   {key}: {value}")
                else:
                    print(f"   {key}: {value[:20]}...")

            # Step 2: Validate checksum signature
            if not VNPAYHelper.verify_response_signature(params):
                print(f"\n❌ SIGNATURE VERIFICATION FAILED")
                log_vnpay_transaction(
                    event="IPN_VERIFY_FAILED",
                    order_id=params.get('vnp_TxnRef', 'unknown'),
                    status="FAILED",
                    amount_vnd=0,
                    error_msg="Invalid signature"
                )
                
                return jsonify({
                    'RspCode': '97',
                    'Message': 'Invalid Signature'
                }), 200

            print(f"✅ SIGNATURE VERIFICATION PASSED")

            # Step 3: Extract key parameters
            txn_ref = params.get('vnp_TxnRef')  # Order ID
            amount_vnd = int(params.get('vnp_Amount', '0')) // 100  # Convert from x100 format
            response_code = params.get('vnp_ResponseCode')  # Payment result
            transaction_status = params.get('vnp_TransactionStatus')  # Transaction status
            transaction_no = params.get('vnp_TransactionNo')  # VNPAY transaction ID
            bank_code = params.get('vnp_BankCode')
            pay_date = params.get('vnp_PayDate')

            print(f"\n🔍 Key Parameters:")
            print(f"   txn_ref (Order ID): {txn_ref}")
            print(f"   Amount: {amount_vnd} VND")
            print(f"   Response Code: {response_code}")
            print(f"   Transaction Status: {transaction_status}")
            print(f"   Transaction No: {transaction_no}")
            print(f"   Bank: {bank_code}")
            print(f"   Pay Date: {pay_date}")

            # Step 4: Find order in database
            order = None
            try:
                order = db.orders.find_one({'_id': ObjectId(txn_ref)})
            except (InvalidId, TypeError):
                order = db.orders.find_one({'orderId': txn_ref})

            if not order:
                print(f"\n❌ Order not found: {txn_ref}")
                
                return jsonify({
                    'RspCode': '01',
                    'Message': 'Order not found'
                }), 200

            print(f"✅ Order found: {txn_ref}")

            # Step 5: Check if order was already updated before (idempotency)
            payment_info = order.get('payment') or {}
            current_status = payment_info.get('status') or 'Unknown'

            is_first_update = current_status.lower() not in ['paid', 'failed']

            if not is_first_update:
                print(f"\n⚠️  Order already updated with status: {current_status}")
                print(f"   Returning RspCode=02 (Already Updated)")
                
                return jsonify({
                    'RspCode': '02',
                    'Message': 'Order Already Updated'
                }), 200

            print(f"✅ First time update for this order")

            # Step 6: Verify amount matches
            expected_total_usd = float(order.get('total') or order.get('totalUsd') or 0)
            expected_amount_vnd = VNPAYHelper.usd_to_vnd(expected_total_usd)

            if amount_vnd != expected_amount_vnd:
                print(f"\n❌ AMOUNT MISMATCH:")
                print(f"   Expected: {expected_amount_vnd} VND")
                print(f"   Paid: {amount_vnd} VND")

                # Update order to FAILED due to amount mismatch
                db.orders.update_one(
                    {'_id': order['_id']},
                    {
                        '$set': {
                            'payment.status': 'Failed',
                            'payment.failReason': 'Amount mismatch',
                            'payment.expectedAmount': expected_amount_vnd,
                            'payment.receivedAmount': amount_vnd,
                            'status': 'Payment Failed',
                            'updatedAt': datetime.utcnow()
                        }
                    }
                )

                log_vnpay_transaction(
                    event="IPN_AMOUNT_MISMATCH",
                    order_id=txn_ref,
                    status="FAILED",
                    amount_vnd=amount_vnd,
                    response_code=response_code,
                    error_msg=f"Expected {expected_amount_vnd}, got {amount_vnd}"
                )

                return jsonify({
                    'RspCode': '04',
                    'Message': 'Invalid amount'
                }), 200

            print(f"✅ Amount verified: {amount_vnd} VND")

            # Step 7: Determine payment status based on VNPAY response
            # According to VNPAY documentation:
            # ResponseCode '00' = success
            # TransactionStatus '00' = transaction successful
            
            is_payment_success = (response_code == '00') and (transaction_status == '00')

            print(f"\n{'='*60}")
            if is_payment_success:
                print(f"✅ PAYMENT SUCCESSFUL - Updating order to PAID")
                print(f"{'='*60}")
                
                # Update order status to PAID
                db.orders.update_one(
                    {'_id': order['_id']},
                    {
                        '$set': {
                            'payment.method': 'VNPAY',
                            'payment.status': 'Paid',
                            'payment.transactionNo': transaction_no,
                            'payment.bankCode': bank_code,
                            'payment.payDate': pay_date,
                            'payment.ipnReceivedAt': datetime.utcnow(),
                            'status': 'Paid',
                            'paidAt': datetime.utcnow(),
                            'updatedAt': datetime.utcnow()
                        }
                    }
                )

                log_vnpay_transaction(
                    event="IPN_SUCCESS",
                    order_id=txn_ref,
                    status="PAID",
                    amount_vnd=amount_vnd,
                    response_code=response_code,
                    transaction_no=transaction_no
                )

                # Return RspCode 00 to tell VNPAY we successfully processed
                return jsonify({
                    'RspCode': '00',
                    'Message': 'Confirm Success'
                }), 200

            else:
                print(f"❌ PAYMENT FAILED - Updating order to FAILED")
                print(f"   Response Code: {response_code}")
                print(f"   Transaction Status: {transaction_status}")
                print(f"{'='*60}")

                # Get error message from helper
                error_msg = VNPAYHelper.get_response_description(response_code)

                # Update order status to FAILED
                db.orders.update_one(
                    {'_id': order['_id']},
                    {
                        '$set': {
                            'payment.method': 'VNPAY',
                            'payment.status': 'Failed',
                            'payment.responseCode': response_code,
                            'payment.failReason': error_msg,
                            'payment.transactionNo': transaction_no,
                            'payment.ipnReceivedAt': datetime.utcnow(),
                            'status': 'Payment Failed',
                            'updatedAt': datetime.utcnow()
                        }
                    }
                )

                log_vnpay_transaction(
                    event="IPN_FAILED",
                    order_id=txn_ref,
                    status="FAILED",
                    amount_vnd=amount_vnd,
                    response_code=response_code,
                    transaction_no=transaction_no,
                    error_msg=error_msg
                )

                # Return RspCode 00 anyway - we processed the failure successfully
                return jsonify({
                    'RspCode': '00',
                    'Message': 'Confirm Success'
                }), 200

        except Exception as e:
            print(f"\n❌ IPN ERROR: {str(e)}")
            import traceback
            traceback.print_exc()

            # Return error code to trigger VNPAY retry
            return jsonify({
                'RspCode': '99',
                'Message': f'Error: {str(e)}'
            }), 200


    # ============================================================================
    # ENDPOINT 3: GET /api/payment/vnpay/return
    # Purpose: Handle browser redirect from VNPAY after payment (user-facing)
    # Client: Browser (customer)
    # ============================================================================

    @app.route('/api/payment/vnpay/return', methods=['GET'])
    def vnpay_return():
        """
        Return URL - Browser redirect from VNPAY to show payment result
        
        This is called when customer completes payment on VNPAY gateway.
        We validate signature and redirect to frontend result page.
        
        Important:
        - Do NOT update order here - IPN already did that
        - Just read the data and validate signature
        - Then redirect to appropriate success/fail frontend page
        """
        
        try:
            print(f"\n{'='*80}")
            print(f"🔙 VNPAY RETURN HANDLER (Browser Redirect)")
            print(f"{'='*80}")

            # Step 1: Get all query parameters from VNPAY
            params = request.args.to_dict()

            if not params:
                print(f"\n❌ No parameters received")
                return redirect(f"{Config.FRONTEND_URL}/payment-fail?method=vnpay&message=No+parameters")

            # Step 2: Validate signature for security
            if not VNPAYHelper.verify_response_signature(params):
                print(f"\n❌ SIGNATURE VERIFICATION FAILED")
                txn_ref = params.get('vnp_TxnRef', 'unknown')
                
                return redirect(
                    f"{Config.FRONTEND_URL}/payment-fail?orderId={txn_ref}&method=vnpay&message=Invalid+signature"
                )

            print(f"✅ SIGNATURE VERIFICATION PASSED")

            # Step 3: Extract parameters
            txn_ref = params.get('vnp_TxnRef')
            amount_vnd = int(params.get('vnp_Amount', '0')) // 100
            response_code = params.get('vnp_ResponseCode')
            transaction_status = params.get('vnp_TransactionStatus')
            transaction_no = params.get('vnp_TransactionNo')

            print(f"\n🔍 Parameters:")
            print(f"   Order ID: {txn_ref}")
            print(f"   Amount: {amount_vnd} VND")
            print(f"   Response Code: {response_code}")
            print(f"   Transaction Status: {transaction_status}")
            print(f"   Transaction No: {transaction_no}")

            # Step 4: Find order (read current status from DB - IPN should have updated it)
            order = None
            try:
                order = db.orders.find_one({'_id': ObjectId(txn_ref)})
            except (InvalidId, TypeError):
                order = db.orders.find_one({'orderId': txn_ref})

            if not order:
                print(f"\n❌ Order not found: {txn_ref}")
                return redirect(
                    f"{Config.FRONTEND_URL}/payment-fail?orderId={txn_ref}&method=vnpay&message=Order+not+found"
                )

            # Step 5: Get order amount for frontend display
            order_total_usd = float(order.get('total') or order.get('totalUsd') or 0)
            
            print(f"💰 Order amount: {order_total_usd} USD")

            # Step 6: Check current order status (should be updated by IPN)
            payment_info = order.get('payment') or {}
            current_payment_status = payment_info.get('status', 'Unknown')

            print(f"\n📊 Order current status: {current_payment_status}")

            # Step 7: Determine what to display to user
            # Trust the order status set by IPN, but also look at VNPAY response
            
            if current_payment_status.lower() == 'paid' or (response_code == '00' and transaction_status == '00'):
                print(f"\n✅ PAYMENT SUCCESS - Redirecting to success page")
                
                redirect_url = (
                    f"{Config.FRONTEND_URL}/payment-success?"
                    f"orderId={txn_ref}&"
                    f"amount={order_total_usd}&"
                    f"method=vnpay"
                )
                
            else:
                print(f"\n❌ PAYMENT FAILED - Redirecting to failure page")
                
                # Get error message
                error_msg = VNPAYHelper.get_response_description(response_code)
                error_msg_encoded = quote(error_msg)
                
                redirect_url = (
                    f"{Config.FRONTEND_URL}/payment-fail?"
                    f"orderId={txn_ref}&"
                    f"amount={order_total_usd}&"
                    f"method=vnpay&"
                    f"message={error_msg_encoded}"
                )

            print(f"🔄 Redirecting to: {redirect_url[:80]}...")
            print(f"{'='*80}\n")
            
            return redirect(redirect_url), 302

        except Exception as e:
            print(f"\n❌ RETURN ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return redirect(
                f"{Config.FRONTEND_URL}/payment-fail?method=vnpay&message=Error+processing+payment"
            ), 302

    
    return {
        'create_vnpay_payment': create_vnpay_payment,
        'vnpay_ipn': vnpay_ipn,
        'vnpay_return': vnpay_return
    }
