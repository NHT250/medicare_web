"""MoMo payment gateway service for building payment URLs and verifying IPN."""

from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from typing import Dict
from datetime import datetime

import requests

from config import Config


def hmac_sha256(key: str, data: str) -> str:
    """Return the hexadecimal SHA256 HMAC for the given data."""
    return hmac.new(key.encode('utf-8'), data.encode('utf-8'), hashlib.sha256).hexdigest()


def create_momo_payment(order: dict) -> dict:
    """
    Create MoMo payment request.
    
    Args:
        order: Order document from MongoDB with:
            - _id: order ID
            - total_usd: total in USD (float)
            - total_vnd: total in VND (int) - should already be set during order creation
    
    Returns:
        MoMo API response dict with payUrl and resultCode
    
    Logic:
        - Web display: USD (total_usd)
        - MoMo gateway: VND (total_vnd) - MoMo amount is VND directly, NOT x100 like VNPAY
        - If order missing total_vnd, compute from total_usd * EXCHANGE_RATE and save to DB
    """
    if not Config.MOMO_ACCESS_KEY or not Config.MOMO_SECRET_KEY:
        return {
            'success': False,
            'message': 'MoMo not configured',
            'resultCode': -1
        }

    # Ensure order has total_vnd (VND amount for payment gateway)
    order_total_vnd = order.get('totalVnd')
    if not order_total_vnd:
        try:
            usd_total = float(order.get('total') or order.get('totalUsd') or 0)
        except (TypeError, ValueError):
            usd_total = 0
        order_total_vnd = int(round(usd_total * Config.EXCHANGE_RATE))
        # Persist computed VND total back to order document
        from pymongo import MongoClient
        client = MongoClient(Config.MONGODB_URI)
        db = client[Config.DATABASE_NAME]
        db.orders.update_one({'_id': order['_id']}, {'$set': {'totalVnd': order_total_vnd}})
        print(f"💾 Saved computed totalVnd={order_total_vnd} to order {order['_id']}")

    # Build MoMo request parameters
    order_id = str(order.get('_id', uuid.uuid4()))
    request_id = str(uuid.uuid4())
    
    # MoMo expects amount as VND (NOT x100 like VNPAY)
    amount = str(order_total_vnd)
    order_info = f"Thanh toan don hang {order_id}"
    
    # Build raw signature for HMAC SHA256
    # Format: accessKey=<key>&amount=<amount>&extraData=<data>&ipnUrl=<url>&orderId=<id>&orderInfo=<info>&partnerCode=<code>&redirectUrl=<url>&requestId=<reqId>&requestType=<type>
    raw_signature = (
        f"accessKey={Config.MOMO_ACCESS_KEY}"
        f"&amount={amount}"
        f"&extraData="
        f"&ipnUrl={Config.MOMO_IPN_URL}"
        f"&orderId={order_id}"
        f"&orderInfo={order_info}"
        f"&partnerCode={Config.MOMO_PARTNER_CODE}"
        f"&redirectUrl={Config.MOMO_REDIRECT_URL}"
        f"&requestId={request_id}"
        f"&requestType={Config.MOMO_REQUEST_TYPE}"
    )
    
    # Generate HMAC SHA256 signature
    signature = hmac_sha256(Config.MOMO_SECRET_KEY, raw_signature)
    
    # Build MoMo API request payload
    payload = {
        'partnerCode': Config.MOMO_PARTNER_CODE,
        'partnerName': 'Medicare',
        'storeId': 'Medicare Store',
        'requestId': request_id,
        'amount': amount,
        'orderId': order_id,
        'orderInfo': order_info,
        'redirectUrl': Config.MOMO_REDIRECT_URL,
        'ipnUrl': Config.MOMO_IPN_URL,
        'lang': 'vi',
        'extraData': '',
        'requestType': Config.MOMO_REQUEST_TYPE,
        'signature': signature
    }
    
    print(f"📤 MoMo Request - orderId={order_id}, amount_vnd={amount}, requestId={request_id}")
    
    try:
        response = requests.post(
            Config.MOMO_ENDPOINT,
            data=json.dumps(payload),
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        result = response.json()
        print(f"📥 MoMo Response - resultCode={result.get('resultCode')}, payUrl exists={bool(result.get('payUrl'))}")
        return result
    except Exception as e:
        print(f"❌ MoMo API Error: {str(e)}")
        return {
            'success': False,
            'message': str(e),
            'resultCode': -1
        }


def verify_momo_signature(data: Dict[str, str]) -> bool:
    """
    Verify MoMo IPN signature.
    
    Args:
        data: IPN payload from MoMo
    
    Returns:
        True if signature is valid, False otherwise
    
    Logic:
        - Extract signature from data
        - Build rawSignature in MoMo's required order
        - Generate HMAC SHA256 and compare
    """
    if not data:
        return False
    
    momo_signature = data.get('signature')
    if not momo_signature:
        print("⚠️ Missing signature in MoMo IPN")
        return False
    
    # MoMo IPN signature is built from: accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType, transId, transTime
    # For verification, we typically use: accessKey + amount + orderId + partnerCode + requestId + requestType + transId + transTime
    # Refer to MoMo documentation for exact fields in IPN
    
    access_key = Config.MOMO_ACCESS_KEY
    
    # Build raw data for signature verification (based on MoMo's IPN format)
    raw_data = (
        f"accessKey={access_key}"
        f"&amount={data.get('amount', '')}"
        f"&extraData={data.get('extraData', '')}"
        f"&ipnUrl={Config.MOMO_IPN_URL}"
        f"&orderId={data.get('orderId', '')}"
        f"&orderInfo={data.get('orderInfo', '')}"
        f"&partnerCode={data.get('partnerCode', '')}"
        f"&redirectUrl={Config.MOMO_REDIRECT_URL}"
        f"&requestId={data.get('requestId', '')}"
        f"&requestType={data.get('requestType', '')}"
        f"&transId={data.get('transId', '')}"
        f"&transTime={data.get('transTime', '')}"
    )
    
    calculated_signature = hmac_sha256(Config.MOMO_SECRET_KEY, raw_data)
    
    is_valid = calculated_signature.lower() == momo_signature.lower()
    if not is_valid:
        print(f"⚠️ MoMo signature mismatch. Expected={calculated_signature}, Got={momo_signature}")
    
    return is_valid
