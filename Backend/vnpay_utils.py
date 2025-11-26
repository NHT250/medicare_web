"""VNPAY sandbox helpers for building payment URLs and verifying callbacks."""

from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Dict
from urllib.parse import quote_plus

from config import Config


def hmac_sha512(key: str, data: str) -> str:
    """Return the hexadecimal SHA512 HMAC for the given data."""

    return hmac.new(key.encode("utf-8"), data.encode("utf-8"), hashlib.sha512).hexdigest()


def _format_datetime(dt: datetime) -> str:
    return dt.strftime("%Y%m%d%H%M%S")


def build_payment_url(
    order_id: str, amount: int, ip_addr: str, order_desc: str, locale: str = "vn"
) -> str:
    """Build a signed VNPAY payment URL using sandbox credentials."""

    now = datetime.utcnow() + timedelta(hours=7)
    expire_at = now + timedelta(minutes=15)

    params: Dict[str, str | int] = {
        "vnp_Version": Config.VNP_VERSION,
        "vnp_Command": Config.VNP_COMMAND,
        "vnp_TmnCode": Config.VNP_TMN_CODE,
        # VNPAY expects amount in smallest currency unit (x100)
        "vnp_Amount": str(amount * 100),
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": order_id,
        "vnp_OrderInfo": order_desc,
        "vnp_OrderType": "other",
        "vnp_Locale": locale,
        "vnp_ReturnUrl": Config.VNP_RETURN_URL,
        "vnp_IpAddr": ip_addr or "127.0.0.1",
        "vnp_CreateDate": _format_datetime(now),
        "vnp_ExpireDate": _format_datetime(expire_at),
    }

    sorted_items = sorted(params.items())
    # Build hash data string in key order for signing
    hash_data = "&".join([f"{k}={quote_plus(str(v))}" for k, v in sorted_items])
    vnp_secure_hash = hmac_sha512(Config.VNP_HASH_SECRET, hash_data)

    query_string = "&".join([f"{k}={quote_plus(str(v))}" for k, v in sorted_items])
    payment_url = f"{Config.VNP_PAY_URL}?{query_string}&vnp_SecureHash={vnp_secure_hash}"
    return payment_url


def verify_vnpay_signature(params: Dict[str, str]) -> bool:
    """Verify VNPAY return payload signature."""

    if not params:
        return False

    secure_hash = params.get("vnp_SecureHash")
    if not secure_hash:
        return False

    data = {k: v for k, v in params.items() if k not in {"vnp_SecureHash", "vnp_SecureHashType"}}
    sorted_items = sorted(data.items())
    hash_data = "&".join([f"{k}={quote_plus(str(v))}" for k, v in sorted_items])
    calculated_hash = hmac_sha512(Config.VNP_HASH_SECRET, hash_data)

    return calculated_hash.lower() == secure_hash.lower()
