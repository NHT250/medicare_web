"""VNPAY sandbox helpers for building payment URLs and verifying callbacks."""

from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timedelta
from typing import Dict
from urllib.parse import urlencode

try:
    import requests  # used to fetch correct time if local clock is skewed
except Exception:  # pragma: no cover - requests may not be available
    requests = None

from config import Config


def hmac_sha512(key: str, data: str) -> str:
    """Return the hexadecimal SHA512 HMAC for the given data."""

    return hmac.new(key.encode("utf-8"), data.encode("utf-8"), hashlib.sha512).hexdigest()


def _format_datetime(dt: datetime) -> str:
    return dt.strftime("%Y%m%d%H%M%S")


def _now_gmt7() -> datetime:
    """
    Return current time in GMT+7.
    If local system clock is wrong, try multiple external sources before falling back.
    """
    if requests:
        # Source 1: worldtimeapi.org
        try:
            resp = requests.get(
                "https://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh", timeout=2
            )
            if resp.ok:
                data = resp.json()
                dt_str = data.get("datetime")
                if dt_str:
                    return datetime.fromisoformat(dt_str)
        except Exception:
            pass

        # Source 2: timeapi.io
        try:
            resp = requests.get(
                "https://timeapi.io/api/Time/current/zone?timeZone=Asia/Ho_Chi_Minh",
                timeout=2,
            )
            if resp.ok:
                data = resp.json()
                # timeapi.io returns fields year, month, day, hour, minute, seconds
                return datetime(
                    data["year"],
                    data["month"],
                    data["day"],
                    data["hour"],
                    data["minute"],
                    int(data["seconds"]),
                )
        except Exception:
            pass

        # Source 3: Date header from a HEAD request (UTC), then shift +7
        try:
            resp = requests.head("https://www.google.com", timeout=2)
            date_hdr = resp.headers.get("Date")
            if date_hdr:
                # Example: 'Wed, 27 Nov 2024 01:00:00 GMT'
                dt = datetime.strptime(date_hdr, "%a, %d %b %Y %H:%M:%S GMT")
                return dt + timedelta(hours=7)
        except Exception:
            pass

    # Fallback: local system clock
    return datetime.utcnow() + timedelta(hours=7)


def build_payment_url(
    order_id: str, amount: int, ip_addr: str, order_desc: str, locale: str = "vn"
) -> str:
    """
    Build a signed VNPAY payment URL.
    
    IMPORTANT - Amount Handling:
    ============================
    - amount parameter MUST be an integer (VND), not float.
    - If you have USD amount, convert FIRST before calling:
        amount_usd = 14.5  # float USD
        amount_vnd = int(amount_usd * Config.EXCHANGE_RATE)  # 14.5 * 25000 = 362500
        url = build_payment_url(order_id, amount_vnd, ip_addr, desc)
    
    Args:
        order_id: Order ID (used as vnp_TxnRef).
        amount: Amount in VND (integer). VNPAY expects this multiplied by 100.
        ip_addr: Client IP address.
        order_desc: Order description for vnp_OrderInfo.
        locale: Locale code (default: "vn").
    
    Returns:
        Full VNPAY payment URL with signed parameters and vnp_SecureHashType=SHA512.
    """

    now = _now_gmt7()
    expire_at = now + timedelta(minutes=15)
    
    # CRITICAL FIX #1: Enforce amount is integer (defensive type checking)
    # Prevents float USD (e.g., 14.5) from slipping through and causing "1450.0" instead of "36250000"
    amount = int(amount)

    params: Dict[str, str | int] = {
        "vnp_Version": Config.VNP_VERSION,
        "vnp_Command": Config.VNP_COMMAND,
        "vnp_TmnCode": Config.VNP_TMN_CODE,
        # CRITICAL FIX #2: amount is now guaranteed to be int (VND)
        # Multiply by 100 as required by VNPAY (returns int, then stringify)
        # Example: 362500 VND → "36250000" (not "36250000.0")
        "vnp_Amount": str(int(amount * 100)),
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
    
    # For signing, use URL-encoded string of sorted params (same encoding as query)
    sorted_items = sorted(params.items())
    hash_data = urlencode(sorted_items)
    vnp_secure_hash = hmac_sha512(Config.VNP_HASH_SECRET, hash_data)

    # Build final payment URL using the same encoded string
    payment_url = (
        f"{Config.VNP_PAY_URL}?{hash_data}"
        f"&vnp_SecureHashType=SHA512&vnp_SecureHash={vnp_secure_hash}"
    )
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
    hash_data = "&".join([f"{k}={v}" for k, v in sorted_items])
    calculated_hash = hmac_sha512(Config.VNP_HASH_SECRET, hash_data)

    return calculated_hash.lower() == secure_hash.lower()
