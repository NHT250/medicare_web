"""VNPAY sandbox configuration and helpers."""
from __future__ import annotations

import hmac
import hashlib
import os
from datetime import datetime, timedelta
from typing import Dict
from urllib.parse import quote_plus

VNP_TMNCODE = os.getenv("VNP_TMNCODE", "THAY_TMN_CODE_SANDBOX")
VNP_HASH_SECRET = os.getenv("VNP_HASH_SECRET", "THAY_HASH_SECRET_SANDBOX")
VNP_PAY_URL = os.getenv(
    "VNP_PAY_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
)
VNP_RETURN_URL = os.getenv("VNP_RETURN_URL", "http://localhost:5000/vnpay_return")


def hmac_sha512(key: str, data: str) -> str:
    """Return the hexadecimal SHA512 HMAC for the given data."""

    return hmac.new(key.encode("utf-8"), data.encode("utf-8"), hashlib.sha512).hexdigest()


def _format_datetime(dt: datetime) -> str:
    return dt.strftime("%Y%m%d%H%M%S")


def build_payment_url(
    order_id: str, amount: int, ip_addr: str, order_desc: str, locale: str = "vn"
) -> str:
    """Build a fully signed VNPAY payment URL for the sandbox environment."""

    now = datetime.utcnow() + timedelta(hours=7)
    expire_at = now + timedelta(minutes=15)

    params: Dict[str, str | int] = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": VNP_TMNCODE,
        "vnp_Amount": str(amount * 100),
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": order_id,
        "vnp_OrderInfo": order_desc,
        "vnp_OrderType": "other",
        "vnp_Locale": locale,
        "vnp_ReturnUrl": VNP_RETURN_URL,
        "vnp_IpAddr": ip_addr or "127.0.0.1",
        "vnp_CreateDate": _format_datetime(now),
        "vnp_ExpireDate": _format_datetime(expire_at),
    }

    sorted_items = sorted(params.items())
    hash_data = "&".join([f"{k}={quote_plus(str(v))}" for k, v in sorted_items])
    secure_hash = hmac_sha512(VNP_HASH_SECRET, hash_data)

    query_string = "&".join([f"{k}={quote_plus(str(v))}" for k, v in sorted_items])
    payment_url = f"{VNP_PAY_URL}?{query_string}&vnp_SecureHash={secure_hash}"
    return payment_url


def verify_vnpay_signature(params: Dict[str, str]) -> bool:
    """Verify the VNPAY signature from the return parameters."""

    if not params:
        return False

    secure_hash = params.get("vnp_SecureHash")
    if not secure_hash:
        return False

    data = {k: v for k, v in params.items() if k not in {"vnp_SecureHash", "vnp_SecureHashType"}}
    sorted_items = sorted(data.items())
    hash_data = "&".join([f"{k}={quote_plus(str(v))}" for k, v in sorted_items])
    calculated_hash = hmac_sha512(VNP_HASH_SECRET, hash_data)

    return calculated_hash.lower() == secure_hash.lower()
