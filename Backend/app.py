# Medicare Backend API - Flask Application
import os
from flask import Flask, jsonify, redirect, request
from flask_cors import CORS
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import DuplicateKeyError
import bcrypt
import jwt
from datetime import datetime, timedelta
from config import Config
from bson import ObjectId
from bson.errors import InvalidId
import json
import requests

from routes.admin import admin_bp
from routes.admin_dashboard import dashboard_bp as admin_dashboard_bp
from routes.admin_orders import admin_orders_bp
from routes.admin_uploads import admin_uploads_bp
from utils.auth import token_required
from utils.helpers import serialize_doc
from vnpay_utils import build_payment_url, verify_vnpay_signature

SHIPPING_FLAT_RATE = 5.0
TAX_RATE = 0.08


def order_to_dict(order):
    """Serialize an order document into an API friendly structure."""

    if not order:
        return None

    serialized = serialize_doc(order)

    shipping = serialized.get('shipping') or {}
    payment = serialized.get('payment') or {}
    items = serialized.get('items') or []

    def _normalise_status(value):
        if not value:
            return 'Pending'
        text = str(value)
        if not text:
            return 'Pending'
        return text[0].upper() + text[1:]

    def _to_number(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    def _normalise_item(item):
        item = item or {}
        price = item.get('price') or 0
        quantity = item.get('quantity') or 0
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            pass
        subtotal = item.get('subtotal')
        if subtotal is None:
            subtotal = price * quantity
        return {
            'product_id': item.get('productId')
            or item.get('product_id')
            or item.get('id'),
            'name': item.get('name'),
            'image': item.get('image') or item.get('thumbnail'),
            'price': _to_number(price),
            'quantity': quantity,
            'subtotal': _to_number(subtotal),
        }

    def _normalise_shipping(value):
        value = value or {}
        return {
            'full_name': value.get('full_name')
            or value.get('fullName')
            or value.get('recipient')
            or '',
            'phone': value.get('phone') or '',
            'address': value.get('address') or '',
            'city': value.get('city') or '',
            'state': value.get('state') or '',
            'zip': value.get('zip')
            or value.get('zipCode')
            or value.get('postalCode')
            or '',
            'country': value.get('country') or '',
            'note': value.get('note') or value.get('notes') or '',
        }

    def _normalise_payment(value):
        value = value or {}
        method_raw = value.get('method') or value.get('type') or ''
        status_raw = value.get('status') or ''

        method = method_raw if isinstance(method_raw, str) else ''
        if method:
            method = method.upper() if len(method) <= 4 else method.title()

        status = status_raw if isinstance(status_raw, str) else ''
        if status:
            status = status.title()

        return {'method': method, 'status': status}

    return {
        'id': serialized.get('_id'),
        'order_id': serialized.get('orderId') or serialized.get('order_id'),
        'created_at': serialized.get('createdAt'),
        'updated_at': serialized.get('updatedAt'),
        'status': _normalise_status(serialized.get('status')),
        'items': [_normalise_item(item) for item in items],
        'shipping': _normalise_shipping(shipping),
        'payment': _normalise_payment(payment),
        # USD amounts are kept for UI/display; VND is used for VNPAY
        'subtotal': _to_number(serialized.get('subtotal') or serialized.get('subtotalUsd')),
        'shipping_fee': _to_number(
            serialized.get('shippingFee') or serialized.get('shipping_fee') or serialized.get('shippingUsd')
        ),
        'tax': _to_number(serialized.get('tax') or serialized.get('taxUsd')),
        'total': _to_number(serialized.get('total') or serialized.get('totalUsd')),
        'total_vnd': _to_number(serialized.get('totalVnd')),
    }

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
RECAPTCHA_SECRET = os.getenv("RECAPTCHA_SECRET")

# Enable CORS with better configuration
CORS(
    app,
    origins=Config.CORS_ORIGINS,
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],  # allow PATCH
)

# Connect to MongoDB
client = MongoClient(Config.MONGODB_URI)
db = client[Config.DATABASE_NAME]

# Ensure critical indexes exist for data integrity and uniqueness
try:
    db.users.create_index("email", unique=True)
except Exception as exc:  # pragma: no cover - log but continue startup
    print(f"Warning: failed to ensure unique index on users.email: {exc}")
app.mongo_db = db

app.register_blueprint(admin_bp)
app.register_blueprint(admin_dashboard_bp)
app.register_blueprint(admin_orders_bp)
app.register_blueprint(admin_uploads_bp)

# Helper function to verify reCAPTCHA
def verify_recaptcha(recaptcha_token: str | None) -> bool:
    """Validate the reCAPTCHA token when the feature is enabled."""

    if not Config.ENABLE_RECAPTCHA:
        # Allow seamless operation when reCAPTCHA is disabled via configuration.
        return True

    if not recaptcha_token:
        return False

    try:
        response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': Config.RECAPTCHA_SECRET_KEY,
                'response': recaptcha_token
            },
            timeout=5
        )
        result = response.json()
        return result.get('success', False)
    except Exception as e:
        print(f'reCAPTCHA verification error: {str(e)}')
        return False
# ============ ROUTES ============

@app.route('/')
def index():
    return jsonify({
        'message': 'Welcome to Medicare API',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth/register, /api/auth/login',
            'products': '/api/products',
            'categories': '/api/categories',
            'cart': '/api/cart',
            'orders': '/api/orders'
        }
    })

@app.route('/test-db', methods=['GET'])
def test_db():
    """Simple endpoint to verify MongoDB connectivity."""
    try:
        user_count = db.users.count_documents({})
        return jsonify({'ok': True, 'user_count': user_count})
    except Exception as exc:
        return jsonify({'ok': False, 'error': str(exc)}), 500

# ============ AUTHENTICATION ============

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json or {}
        required_fields = ['name', 'email', 'phone', 'password']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({'error': f"Missing fields: {', '.join(missing_fields)}"}), 400



        existing_user = db.users.find_one({'email': data['email']})
        if existing_user:
            return jsonify({'error': 'User already exists and is verified'}), 400

        hashed_password = bcrypt.hashpw(
            data['password'].encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')

        user_doc = {
            'email': data['email'],
            'password': hashed_password,
            'name': data.get('name', ''),
            'phone': data.get('phone', ''),
            'address': data.get('address', {}),
            'role': 'customer',
            'is_banned': False,
            'isVerified': True,
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }

        result = db.users.insert_one(user_doc)
        user_doc['_id'] = str(result.inserted_id)
        user_doc.pop('password', None)

        return jsonify({'message': 'Registration successful', 'user': serialize_doc(user_doc)}), 201

    except DuplicateKeyError:
        return jsonify({'error': 'User already exists'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')
        
        print(f"🔐 LOGIN REQUEST: email={email}, password_length={len(password) if password else 0}")

        if not email or not password:
            print(f"❌ Missing fields: email={email}, password={password}")
            return jsonify({'error': 'Email and password are required'}), 400



        user = db.users.find_one({'email': email})
        if not user:
            print(f"❌ User not found: {email}")
            return jsonify({'error': 'Invalid email or password'}), 401

        if user.get('is_banned'):
            print(f"❌ User banned: {email}")
            return jsonify({'error': 'Account is banned'}), 403

        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            print(f"❌ Invalid password for: {email}")
            return jsonify({'error': 'Invalid email or password'}), 401

        role = user.get('role', 'customer')
        token = jwt.encode({
            'user_id': str(user['_id']),
            'email': user['email'],
            'role': role,
            'exp': datetime.utcnow() + timedelta(seconds=Config.JWT_EXPIRATION_DELTA)
        }, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM)

        user.pop('password', None)
        
        print(f"✅ LOGIN SUCCESSFUL: {email}, role={role}")

        return jsonify({
            'token': token,
            'user': {
                '_id': str(user['_id']),
                'email': user['email'],
                'name': user.get('name', ''),
                'role': role
            }
        })
    except Exception as e:
        print(f"❌ LOGIN ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ============ PRODUCTS ============

@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        try:
            page = max(int(request.args.get('page', 1)), 1)
        except (TypeError, ValueError):
            page = 1

        try:
            limit = int(request.args.get('limit', 20))
        except (TypeError, ValueError):
            limit = 20
        limit = min(max(limit, 1), 100)

        search = (request.args.get('search') or '').strip()
        category = (request.args.get('category') or '').strip()
        sort_param = (request.args.get('sort') or 'newest').strip().lower()

        query = {'is_active': True}
        if category:
            query['category'] = category
        if search:
            query['name'] = {'$regex': search, '$options': 'i'}

        sort_field = 'createdAt'
        sort_direction = DESCENDING

        if sort_param in {'price', 'price_asc', 'price:asc', 'price-asc', 'price_low'}:
            sort_field = 'price'
            sort_direction = ASCENDING
        elif sort_param in {'price_desc', 'price:desc', 'price-desc'}:
            sort_field = 'price'
            sort_direction = DESCENDING
        elif sort_param in {'name', 'name_asc', 'name:asc'}:
            sort_field = 'name'
            sort_direction = ASCENDING
        elif sort_param in {'name_desc', 'name:desc'}:
            sort_field = 'name'
            sort_direction = DESCENDING
        elif sort_param in {'oldest', 'created_at', 'created_at_asc'}:
            sort_field = 'createdAt'
            sort_direction = ASCENDING
        elif sort_param in {'newest', 'created_at_desc'}:
            sort_field = 'createdAt'
            sort_direction = DESCENDING

        total = db.products.count_documents(query)
        skip = (page - 1) * limit
        products_cursor = (
            db.products.find(query)
            .sort(sort_field, sort_direction)
            .skip(skip)
            .limit(limit)
        )
        products = [serialize_doc(product) for product in products_cursor]

        return jsonify({
            'products': products,
            'total': total,
            'page': page,
            'limit': limit,
            'count': len(products)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<product_id>', methods=['GET'])
def get_product(product_id):
    try:
        product = db.products.find_one({'_id': ObjectId(product_id), 'is_active': True})
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        return jsonify(serialize_doc(product))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ CATEGORIES ============

@app.route('/api/categories', methods=['GET'])
def get_categories():
    try:
        categories = list(db.categories.find())
        return jsonify({
            'categories': [serialize_doc(cat) for cat in categories]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ CART ============

@app.route('/api/cart', methods=['GET'])
@token_required
def get_cart(current_user):
    try:
        user_id = str(current_user['_id'])
        
        cart = db.carts.find_one({'userId': user_id})
        if not cart:
            return jsonify({
                'userId': user_id,
                'items': [],
                'total': 0
            })
        
        return jsonify(serialize_doc(cart))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cart', methods=['POST'])
@token_required
def add_to_cart(current_user):
    try:
        user_id = str(current_user['_id'])

        data = request.get_json(force=True, silent=True) or {}
        product_identifier = data.get('productId')
        if not product_identifier:
            return jsonify({'error': 'Product ID is required'}), 400

        try:
            product_object_id = ObjectId(product_identifier)
        except (InvalidId, TypeError):
            return jsonify({'error': 'Invalid product ID'}), 400

        # Get product
        product = db.products.find_one({'_id': product_object_id, 'is_active': True})
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        try:
            quantity = int(data.get('quantity', 1))
        except (TypeError, ValueError):
            quantity = 0

        if quantity < 1:
            return jsonify({'error': 'Quantity must be at least 1'}), 400

        available_stock = int(product.get('stock') or 0)
        if available_stock < quantity:
            return jsonify({'message': f"Out of stock for {product.get('name', 'product')}"}), 400

        # Get or create cart
        cart = db.carts.find_one({'userId': user_id})

        if not cart:
            cart = {
                'userId': user_id,
                'items': [],
                'total': 0,
                'updatedAt': datetime.utcnow()
            }
            db.carts.insert_one(cart)

        # Add or update item
        item_existing = False
        for item in cart['items']:
            if item['productId'] == str(product_object_id):
                item['quantity'] += quantity
                item['subtotal'] = item['quantity'] * item['price']
                item_existing = True
                break

        if not item_existing:
            cart['items'].append({
                'productId': str(product['_id']),
                'quantity': quantity,
                'price': product['price'],
                'subtotal': product['price'] * quantity
            })
        
        # Calculate total
        cart['total'] = sum(item['subtotal'] for item in cart['items'])
        cart['updatedAt'] = datetime.utcnow()
        
        # Update cart
        db.carts.update_one({'_id': cart['_id']}, {'$set': cart})
        
        return jsonify({'message': 'Item added to cart', 'cart': serialize_doc(cart)})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ ORDERS ============

@app.route('/api/orders', methods=['GET'])
@token_required
def get_orders(current_user):
    try:
        user_id = str(current_user['_id'])
        
        orders = list(db.orders.find({'userId': user_id}).sort('createdAt', -1))
        
        return jsonify({
            'orders': [serialize_doc(order) for order in orders]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['POST'])
@token_required
def create_order(current_user):
    try:
        data = request.json
        user_id = str(current_user['_id'])

        # Generate order ID
        order_id = f"ORD{datetime.now().strftime('%Y%m%d%H%M%S')}"

        payload = request.get_json(force=True, silent=True) or {}
        raw_items = payload.get('items') or []

        if not isinstance(raw_items, list) or not raw_items:
            return jsonify({'error': 'Order items are required'}), 400

        validated_items = []
        stock_requirements = []
        subtotal = 0.0

        for raw_item in raw_items:
            product_identifier = (
                raw_item.get('productId')
                or raw_item.get('product_id')
                or raw_item.get('id')
            )
            if not product_identifier:
                return jsonify({'error': 'Each item must include a productId'}), 400

            try:
                product_object_id = ObjectId(product_identifier)
            except (InvalidId, TypeError):
                return jsonify({'error': 'Invalid product identifier supplied'}), 400

            try:
                quantity = int(raw_item.get('quantity', 0))
            except (TypeError, ValueError):
                quantity = 0

            if quantity < 1:
                return jsonify({'error': 'Quantity must be at least 1'}), 400

            product = db.products.find_one({'_id': product_object_id})
            if not product:
                return jsonify({'error': 'Product not found'}), 404

            price = float(product.get('price', 0))
            if price < 0:
                return jsonify({'error': f"Invalid price configured for {product.get('name', 'product')}"}), 400

            available_stock = int(product.get('stock') or 0)
            if available_stock < quantity:
                return jsonify({'message': f"Out of stock for {product.get('name', 'product')}"}), 400

            line_total = round(price * quantity, 2)
            subtotal += line_total

            images = product.get('images')
            if not isinstance(images, list):
                images = []
            primary_image = images[0] if images else product.get('image')

            validated_items.append({
                'productId': str(product['_id']),
                'name': product.get('name'),
                'image': primary_image,
                'price': price,
                'quantity': quantity,
                'subtotal': line_total
            })
            stock_requirements.append({
                'product_id': product_object_id,
                'quantity': quantity,
                'name': product.get('name')
            })

        subtotal = round(subtotal, 2)
        shipping_fee = SHIPPING_FLAT_RATE if subtotal > 0 else 0.0
        tax = round(subtotal * TAX_RATE, 2)
        total = round(subtotal + shipping_fee + tax, 2)
        # Convert USD totals to VND for VNPAY (kept separate from USD display values)
        # Convert USD totals to VND for VNPAY (kept separate from USD display values)
        # NOTE: EXCHANGE_RATE is an integer VND per 1 USD, configured in `config.py`.
        exchange_rate = Config.EXCHANGE_RATE
        # total_vnd stored as integer VND
        total_vnd = int(round(total * exchange_rate))

        shipping_info = payload.get('shipping') or {}
        payment_info = payload.get('payment') or {}
        if not isinstance(shipping_info, dict):
            shipping_info = {}
        if not isinstance(payment_info, dict):
            payment_info = {}

        payment_method = str(payment_info.get('method') or 'COD').upper()
        payment_status = str(payment_info.get('status') or 'Pending').title()

        order = {
            'orderId': order_id,
            'userId': user_id,
            'items': validated_items,
            'shipping': shipping_info,
            'payment': {'method': payment_method, 'status': payment_status},
            'subtotal': subtotal,
            'shippingFee': shipping_fee,
            'tax': tax,
            'total': total,
            'subtotalUsd': subtotal,
            'shippingUsd': shipping_fee,
            'taxUsd': tax,
            'totalUsd': total,
            'totalVnd': total_vnd,
            'status': 'Pending',
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }

        decremented = []
        try:
            for requirement in stock_requirements:
                result = db.products.update_one(
                    {
                        '_id': requirement['product_id'],
                        'stock': {'$gte': requirement['quantity']}
                    },
                    {'$inc': {'stock': -requirement['quantity']}}
                )
                if result.modified_count == 0:
                    # Rollback any prior stock updates before returning an error
                    for change in decremented:
                        db.products.update_one(
                            {'_id': change['product_id']},
                            {'$inc': {'stock': change['quantity']}}
                        )
                    return jsonify({'message': f"Out of stock for {requirement['name'] or 'product'}"}), 400
                decremented.append(requirement)

            result = db.orders.insert_one(order)
            order['_id'] = str(result.inserted_id)

            return jsonify({'message': 'Order created successfully', 'order': serialize_doc(order)}), 201
        except Exception:
            for change in decremented:
                db.products.update_one(
                    {'_id': change['product_id']},
                    {'$inc': {'stock': change['quantity']}}
                )
            raise

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/payment/vnpay/create', methods=['POST'])
@token_required
def create_vnpay_payment(current_user):
    """
    Tạo URL thanh toán VNPAY
    Frontend sẽ gọi endpoint này sau khi tạo order thành công
    """
    try:
        if not Config.VNP_TMN_CODE or not Config.VNP_HASH_SECRET:
            print("❌ VNPAY not configured")
            return jsonify({'error': 'VNPAY is not configured'}), 503

        payload = request.get_json(force=True, silent=True) or {}
        order_identifier = payload.get('orderId')
        amount = payload.get('amount')  # Amount in VND
        description = payload.get('description')

        print(f"🔗 VNPAY Create Payment: orderId={order_identifier}, amount={amount}")

        if not order_identifier or not amount:
            print("❌ Missing orderId or amount")
            return jsonify({'error': 'orderId and amount are required'}), 400

        # Find order in database
        order = None
        try:
            order_object_id = ObjectId(order_identifier)
            order = db.orders.find_one({'_id': order_object_id})
        except (InvalidId, TypeError):
            order = db.orders.find_one({'orderId': order_identifier})

        if not order:
            print(f"❌ Order not found: {order_identifier}")
            return jsonify({'error': 'Order not found'}), 404

        user_id = str(current_user['_id'])
        if order.get('userId') != user_id:
            print(f"❌ Permission denied for user {user_id}")
            return jsonify({'error': 'You do not have permission to pay for this order'}), 403

        # Check if already paid
        payment_info = order.get('payment') or {}
        if str(payment_info.get('status') or '').lower() == 'paid':
            print("❌ Order already paid")
            return jsonify({'error': 'Order has already been paid'}), 400
        
        if str(payment_info.get('method') or '').upper() != 'VNPAY':
            print("❌ Payment method is not VNPAY")
            return jsonify({'error': 'Payment method is not VNPAY for this order'}), 400

        # Build VNPAY payment URL
        ip_addr = request.remote_addr or '127.0.0.1'
        order_ref = str(order.get('_id') or order_identifier)
        
        # Determine amount to charge in VND. Prefer stored order.totalVnd; if missing, compute and save it.
        order_total_vnd = order.get('totalVnd')
        if not order_total_vnd:
            try:
                usd_total = float(order.get('total') or order.get('totalUsd') or 0)
            except Exception:
                usd_total = 0
            order_total_vnd = int(round(usd_total * Config.EXCHANGE_RATE))
            # Persist computed VND total back to order document for future checks
            db.orders.update_one({'_id': order['_id']}, {'$set': {'totalVnd': order_total_vnd}})

        print(f"📝 Building VNPAY URL: orderId={order_ref}, amount_vnd={order_total_vnd}, ip={ip_addr}")

        # build_payment_url expects amount in VND (it multiplies by 100 internally to produce vnp_Amount)
        payment_url = build_payment_url(
            order_ref,
            int(order_total_vnd),
            ip_addr,
            description or f'Thanh toan don hang {order_ref}',
        )

        # Update order payment status
        db.orders.update_one(
            {'_id': order['_id']},
            {'$set': {
                'payment.method': 'VNPAY',
                'payment.status': 'Pending',
                'updatedAt': datetime.utcnow()
            }},
        )

        print(f"✅ Payment URL created: {payment_url[:50]}...")
        return jsonify({
            'payment_url': payment_url,
            'paymentUrl': payment_url,  # Support both snake_case and camelCase
            'orderId': order_ref,
            'amount_vnd': order_total_vnd
        }), 200

    except Exception as e:
        print(f"❌ VNPAY Payment Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/payment/vnpay', methods=['POST'])
@token_required
def initiate_vnpay_payment(current_user):
    try:
        if not Config.VNP_TMN_CODE or not Config.VNP_HASH_SECRET:
            return jsonify({'error': 'VNPAY is not configured'}), 503

        payload = request.get_json(force=True, silent=True) or {}
        order_identifier = payload.get('orderId')
        description = payload.get('description')

        if not order_identifier:
            return jsonify({'error': 'orderId is required'}), 400

        order = None
        try:
            order_object_id = ObjectId(order_identifier)
            order = db.orders.find_one({'_id': order_object_id})
        except (InvalidId, TypeError):
            order = db.orders.find_one({'orderId': order_identifier})

        if not order:
            return jsonify({'error': 'Order not found'}), 404

        user_id = str(current_user['_id'])
        if order.get('userId') != user_id:
            return jsonify({'error': 'You do not have permission to pay for this order'}), 403

        payment_info = order.get('payment') or {}
        if str(payment_info.get('status') or '').lower() == 'paid':
            return jsonify({'error': 'Order has already been paid'}), 400
        if str(payment_info.get('method') or '').upper() != 'VNPAY':
            return jsonify({'error': 'Payment method is not VNPAY for this order'}), 400

        expected_total_usd = float(order.get('total') or order.get('totalUsd') or 0)
        # Use canonical exchange rate in Config.EXCHANGE_RATE (VND per 1 USD)
        expected_total_vnd = int(order.get('totalVnd') or round(expected_total_usd * Config.EXCHANGE_RATE))

        ip_addr = request.remote_addr or '127.0.0.1'
        order_ref = str(order.get('_id') or order_identifier)
        payment_url = build_payment_url(
            order_ref,
            expected_total_vnd,  # VNPAY expects VND; build_payment_url will x100
            ip_addr,
            description or f'Thanh toan don hang {order_ref}',
        )

        db.orders.update_one(
            {'_id': order['_id']},
            {'$set': {'payment.method': 'VNPAY', 'payment.status': 'Pending', 'updatedAt': datetime.utcnow()}},
        )

        return jsonify({'paymentUrl': payment_url, 'orderId': order_ref})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/vnpay_return', methods=['GET'])
def vnpay_return():
    if not Config.VNP_TMN_CODE or not Config.VNP_HASH_SECRET:
        return redirect('http://localhost:5173/payment-result?status=fail&reason=config')

    params = request.args.to_dict()

    if not verify_vnpay_signature(params):
        return redirect('http://localhost:5173/payment-result?status=fail&reason=checksum')

    response_code = params.get('vnp_ResponseCode')
    txn_ref = params.get('vnp_TxnRef')
    # VNPAY returns amount in smallest currency unit (x100); convert back to VND
    paid_vnd = int(params.get('vnp_Amount', '0')) // 100

    order = None
    try:
        if txn_ref:
            order = db.orders.find_one({'_id': ObjectId(txn_ref)})
    except (InvalidId, TypeError):
        order = None

    if not order and txn_ref:
        order = db.orders.find_one({'orderId': txn_ref})

    if not order:
        return redirect('http://localhost:5173/payment-result?status=fail&reason=notfound')

    expected_total_usd = float(order.get('total') or order.get('totalUsd') or 0)
    # Use canonical exchange rate in Config.EXCHANGE_RATE when deriving expected VND total
    expected_total_vnd = int(order.get('totalVnd') or round(expected_total_usd * Config.EXCHANGE_RATE))

    # Compare VNPAY paid VND amount against stored VND total
    if paid_vnd != expected_total_vnd:
        return redirect(
            f'http://localhost:5173/payment-result?status=fail&orderId={txn_ref}&amount={paid_vnd}&reason=amount'
        )

    is_success = response_code == '00'
    payment_status = 'Paid' if is_success else 'Failed'
    status_label = 'Paid' if is_success else 'Payment Failed'

    db.orders.update_one(
        {'_id': order['_id']},
        {
            '$set': {
                'payment.method': 'VNPAY',
                'payment.status': payment_status,
                'payment.transactionId': params.get('vnp_TransactionNo'),
                'status': status_label,
                'updatedAt': datetime.utcnow(),
            }
        },
    )

    redirect_url = f"http://localhost:5173/payment-result?status={'success' if is_success else 'fail'}&orderId={txn_ref}&amount={paid_vnd}"
    return redirect(redirect_url)


@app.route('/api/orders/<order_id>', methods=['GET'])
@token_required
def get_order_detail(current_user, order_id):
    try:
        user_id = str(current_user['_id'])

        try:
            object_id = ObjectId(order_id)
        except (InvalidId, TypeError):
            return jsonify({'error': 'Order not found'}), 404

        order = db.orders.find_one({'_id': object_id})
        if not order:
            return jsonify({'error': 'Order not found'}), 404

        if order.get('userId') != user_id:
            return (
                jsonify({'error': 'You do not have permission to view this order'}),
                403,
            )

        return jsonify(order_to_dict(order))

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/orders/<order_id>/status', methods=['PATCH'])
@token_required
def update_order_status_user(current_user, order_id):
    try:
        user_id = str(current_user['_id'])

        try:
            object_id = ObjectId(order_id)
        except (InvalidId, TypeError):
            return jsonify({'error': 'Order not found'}), 404

        order = db.orders.find_one({'_id': object_id})
        if not order:
            return jsonify({'error': 'Order not found'}), 404

        if order.get('userId') != user_id:
            return (
                jsonify({'error': 'You do not have permission to modify this order'}),
                403,
            )

        current_status = str(order.get('status') or '').lower() or 'pending'
        payload = request.get_json(force=True, silent=True) or {}
        new_status = str(payload.get('status') or '').lower()

        if new_status != 'cancelled':
            return jsonify({'error': 'Only cancellation is supported'}), 400

        if current_status != 'pending':
            return jsonify({'error': 'Only pending orders can be cancelled'}), 400

        update_doc = {
            '$set': {'status': 'cancelled', 'updatedAt': datetime.utcnow()},
        }

        db.orders.update_one({'_id': order['_id']}, update_doc)
        updated = db.orders.find_one({'_id': order['_id']})

        return jsonify(order_to_dict(updated))

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ USER PROFILE ============

@app.route('/api/users/profile', methods=['GET'])
@token_required
def get_user_profile(current_user):
    try:
        user = serialize_doc(current_user)
        user.pop('password', None)  # Remove password from response
        return jsonify({'user': user})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/profile', methods=['PUT'])
@token_required
def update_user_profile(current_user):
    try:
        data = request.json
        user_id = current_user['_id']
        
        update_fields = {}

        allowed_fields = ['name', 'phone', 'address']
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]

        new_email = data.get('email')
        current_email = current_user.get('email')
        if new_email and new_email != current_email:
            if db.users.find_one({'email': new_email, '_id': {'$ne': user_id}}):
                return jsonify({'message': 'Email already exists'}), 400
            update_fields['email'] = new_email

        if not update_fields:
            return jsonify({
                'message': 'No changes made',
                'user': serialize_doc(current_user)
            })

        update_fields['updatedAt'] = datetime.utcnow()

        try:
            db.users.update_one({'_id': user_id}, {'$set': update_fields})
        except DuplicateKeyError:
            return jsonify({'message': 'Email already exists'}), 400

        updated_user = db.users.find_one({'_id': user_id})
        updated_user = serialize_doc(updated_user)
        updated_user.pop('password', None)

        return jsonify({
            'message': 'Profile updated successfully',
            'user': updated_user
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ RUN SERVER ============

if __name__ == '__main__':
    print('Starting Medicare API Server...')
    print(f'MongoDB: {Config.MONGODB_URI}{Config.DATABASE_NAME}')
    app.run(debug=Config.DEBUG, host=Config.HOST, port=Config.PORT)

