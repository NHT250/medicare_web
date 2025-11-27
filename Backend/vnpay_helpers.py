"""
VNPAY Payment Integration Helper Functions
Tích hợp cổng thanh toán VNPAY theo tài liệu chính thức PAY - VNPAY
"""

import hashlib
import hmac
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from urllib.parse import urlencode

try:
    import requests  # used to fetch correct time if local clock is skewed
except Exception:  # pragma: no cover
    requests = None

from config import Config


class VNPAYHelper:
    """VNPAY Payment Helper - Build, validate, and process VNPAY transactions"""

    @staticmethod
    def _now_gmt7() -> datetime:
        """
        Return current time in GMT+7.
        If local system clock is wrong, try multiple external sources as fallbacks.
        """
        if requests:
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

            try:
                resp = requests.get(
                    "https://timeapi.io/api/Time/current/zone?timeZone=Asia/Ho_Chi_Minh",
                    timeout=2,
                )
                if resp.ok:
                    data = resp.json()
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

            try:
                resp = requests.head("https://www.google.com", timeout=2)
                date_hdr = resp.headers.get("Date")
                if date_hdr:
                    dt = datetime.strptime(date_hdr, "%a, %d %b %Y %H:%M:%S GMT")
                    return dt + timedelta(hours=7)
            except Exception:
                pass
        return datetime.utcnow() + timedelta(hours=7)

    @staticmethod
    def usd_to_vnd(amount_usd: float) -> int:
        """
        Convert USD amount to VND (integer)
        VNPAY expects amount in VND multiplied by 100
        
        Args:
            amount_usd: Amount in USD (float)
            
        Returns:
            Amount in VND as integer
            
        Example:
            14.5 USD -> int(14.5 * 25000) = 362500 VND
        """
        return int(round(amount_usd * Config.EXCHANGE_RATE))

    @staticmethod
    def build_payment_url(
        order_id: str,
        amount_usd: float,
        order_description: str,
        client_ip: str,
        locale: str = "vn",
        bank_code: Optional[str] = None,
    ) -> str:
        """
        Build VNPAY payment URL (redirect customer to VNPAY gateway)
        
        Args:
            order_id: Order ID from MongoDB (used as vnp_TxnRef)
            amount_usd: Order amount in USD
            order_description: Order description (Vietnamese, no special chars)
            client_ip: Customer IP address
            locale: Language code (vn/en)
            bank_code: Optional bank code (e.g., VNPAYQRcode, VNBANK, INTCARD)
            
        Returns:
            Full VNPAY payment URL
        """
        
        # Step 1: Convert USD -> VND
        amount_vnd = VNPAYHelper.usd_to_vnd(amount_usd)
        
        # Step 2: Generate timestamps (GMT+7)
        now = VNPAYHelper._now_gmt7()
        expire_time = now + timedelta(minutes=15)  # Payment expires in 15 minutes
        
        create_date = now.strftime("%Y%m%d%H%M%S")
        expire_date = expire_time.strftime("%Y%m%d%H%M%S")
        
        # Step 3: Build request data (all required parameters)
        request_data = {
            "vnp_Version": Config.VNP_VERSION,  # "2.1.0"
            "vnp_Command": Config.VNP_COMMAND,  # "pay"
            "vnp_TmnCode": Config.VNP_TMN_CODE,  # Merchant ID
            "vnp_Amount": str(amount_vnd * 100),  # Amount in smallest unit (VND x100)
            "vnp_CurrCode": "VND",
            "vnp_TxnRef": str(order_id),  # Order ID as reference
            "vnp_OrderInfo": order_description,  # Order description
            "vnp_OrderType": "other",  # Category: "other"
            "vnp_Locale": locale,  # Language (vn/en)
            "vnp_IpAddr": client_ip or "127.0.0.1",  # Customer IP
            "vnp_CreateDate": create_date,  # Transaction time
            "vnp_ExpireDate": expire_date,  # Expiration time
            "vnp_ReturnUrl": Config.VNP_RETURN_URL,  # Return URL (browser redirect)
        }
        
        # Step 4: Optional - Add bank code if provided
        if bank_code and bank_code.strip():
            request_data["vnp_BankCode"] = bank_code
        
        # Step 5: Sort parameters by key (required for signature)
        sorted_params = sorted(request_data.items())

        # Step 6: URL-encode sorted params to a query string (used for both hash and final URL)
        hash_data = urlencode(sorted_params)

        # Step 7: Generate HMAC SHA512 signature (do NOT include vnp_SecureHashType in signed data)
        vnp_secure_hash = VNPAYHelper.create_signature(hash_data)

        # Step 8: Build final payment URL, append vnp_SecureHashType explicitly
        payment_url = (
            f"{Config.VNP_PAY_URL}?{hash_data}"
            f"&vnp_SecureHashType=SHA512&vnp_SecureHash={vnp_secure_hash}"
        )
        
        return payment_url, amount_vnd

    @staticmethod
    def create_signature(data: str) -> str:
        """
        Create HMAC SHA512 signature for VNPAY checksum
        
        Args:
            data: Hash data string (sorted parameters)
            
        Returns:
            64-char hex string (SHA512)
        """
        return hmac.new(
            Config.VNP_HASH_SECRET.encode(),
            data.encode(),
            hashlib.sha512
        ).hexdigest()

    @staticmethod
    def verify_response_signature(params: Dict[str, str]) -> bool:
        """
        Verify VNPAY response signature (checksum validation)
        Called when VNPAY returns (IPN or Return URL)
        
        Args:
            params: Query parameters from VNPAY response
            
        Returns:
            True if signature is valid, False otherwise
        """
        
        if not params or "vnp_SecureHash" not in params:
            return False
        
        # Extract signature from params
        vnp_secure_hash = params.get("vnp_SecureHash", "")
        
        # Create copy of params without signature for hash calculation
        params_copy = {k: v for k, v in params.items() if k not in {"vnp_SecureHash", "vnp_SecureHashType"}}
        
        # Sort and create hash data string (URL-encoded)
        sorted_params = sorted(params_copy.items())
        hash_data = urlencode(sorted_params)

        # Generate signature and compare (VNPAY signs with SHA512 HMAC)
        calculated_hash = VNPAYHelper.create_signature(hash_data)
        
        return calculated_hash.lower() == vnp_secure_hash.lower()

    @staticmethod
    def get_response_description(response_code: str) -> str:
        """
        Map VNPAY response code to Vietnamese error/success message
        
        Args:
            response_code: vnp_ResponseCode from VNPAY
            
        Returns:
            Human-readable Vietnamese message
        """
        
        response_descriptions = {
            "00": "Giao dịch thành công",
            "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ gian lận",
            "09": "Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking",
            "10": "Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần",
            "11": "Đã hết hạn chờ thanh toán",
            "12": "Thẻ/Tài khoản của khách hàng bị khóa",
            "13": "Khách hàng nhập sai mật khẩu OTP",
            "24": "Khách hàng hủy giao dịch",
            "51": "Tài khoản không đủ số dư",
            "65": "Tài khoản đã vượt quá hạn mức giao dịch trong ngày",
            "75": "Ngân hàng thanh toán đang bảo trì",
            "79": "Khách hàng nhập sai mật khẩu quá số lần quy định",
            "99": "Lỗi khác",
        }
        
        return response_descriptions.get(response_code, "Lỗi không xác định")

    @staticmethod
    def get_transaction_status_description(status_code: str) -> str:
        """
        Map VNPAY transaction status to description
        
        Args:
            status_code: vnp_TransactionStatus from VNPAY
            
        Returns:
            Human-readable status description
        """
        
        status_descriptions = {
            "00": "Giao dịch thành công",
            "01": "Giao dịch chưa hoàn tất",
            "02": "Giao dịch bị lỗi",
            "04": "Giao dịch đảo (trừ tiền nhưng chưa thành công)",
            "05": "VNPAY đang xử lý hoàn tiền",
            "06": "VNPAY đã gửi yêu cầu hoàn tiền",
            "07": "Giao dịch bị nghi ngờ gian lận",
            "09": "Hoàn trả bị từ chối",
        }
        
        return status_descriptions.get(status_code, "Trạng thái không xác định")


def log_vnpay_transaction(
    event: str,
    order_id: str,
    status: str,
    amount_vnd: int,
    response_code: Optional[str] = None,
    transaction_no: Optional[str] = None,
    error_msg: Optional[str] = None,
) -> None:
    """
    Log VNPAY transaction events for debugging and monitoring
    
    Args:
        event: Event type (CREATE_URL, IPN_RECEIVED, VERIFIED, UPDATED, FAILED_VERIFY, etc.)
        order_id: Order ID
        status: Transaction status (PENDING, PAID, FAILED, etc.)
        amount_vnd: Amount in VND
        response_code: VNPAY response code
        transaction_no: VNPAY transaction number
        error_msg: Error message if any
    """
    
    timestamp = datetime.utcnow() + timedelta(hours=7)
    log_message = f"[{timestamp.strftime('%Y-%m-%d %H:%M:%S')}] VNPAY {event}: OrderID={order_id}, Status={status}, Amount={amount_vnd} VND"
    
    if response_code:
        log_message += f", ResponseCode={response_code}"
    if transaction_no:
        log_message += f", TransactionNo={transaction_no}"
    if error_msg:
        log_message += f", Error={error_msg}"
    
    print(log_message)
    # TODO: Implement proper logging to file/database if needed
