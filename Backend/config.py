# Configuration file for Medicare Backend
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # MongoDB Configuration
    # Prefer Atlas URI from env; fallback to legacy MONGODB_URI for backward compatibility
    MONGODB_URI = os.getenv('MONGO_URI') or os.getenv('MONGODB_URI') or 'mongodb://localhost:27017/'
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'medicare')

    # JWT Secret Key
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRATION_DELTA = 86400  # 24 hours

    # reCAPTCHA Configuration
    ENABLE_RECAPTCHA = os.getenv('ENABLE_RECAPTCHA', 'True').lower() in {
        'true',
        '1',
        'yes',
    }
    RECAPTCHA_SECRET_KEY = os.getenv(
        'RECAPTCHA_SECRET_KEY', '6LfGbvwrAAAAADdlE7GTi5LekEyGKzde4J6_L2-z'
    )

    if not JWT_SECRET_KEY:
        raise RuntimeError('Missing JWT secret in environment variables')
    if ENABLE_RECAPTCHA and not RECAPTCHA_SECRET_KEY:
        raise RuntimeError('Missing reCAPTCHA secret key while reCAPTCHA is enabled')
    
    # Currency
    # Exchange rate used to convert USD -> VND for payment processing (default: 25,000 VND = 1 USD)
    # Use `EXCHANGE_RATE` as the canonical integer exchange rate in VND per 1 USD.
    EXCHANGE_RATE = int(os.getenv('EXCHANGE_RATE', 25000))
    # Backwards-compatible name (float) - keep for any existing references
    EXCHANGE_RATE_USD_TO_VND = float(os.getenv('EXCHANGE_RATE_USD_TO_VND', EXCHANGE_RATE))

    # VNPAY configuration
    VNP_TMN_CODE = os.getenv('VNP_TMN_CODE')
    VNP_HASH_SECRET = os.getenv('VNP_HASH_SECRET')
    VNP_PAY_URL = os.getenv('VNP_PAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')
    VNP_RETURN_URL = os.getenv('VNP_RETURN_URL', 'http://localhost:5000/vnpay_return')
    VNP_VERSION = '2.1.0'
    VNP_COMMAND = 'pay'

    if not VNP_TMN_CODE or not VNP_HASH_SECRET:
        print('Warning: VNPAY config missing – VNPAY payment will be disabled.')

    # Flask Configuration
    DEBUG = os.getenv('FLASK_DEBUG', 'True') == 'True'
    HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    PORT = int(os.getenv('FLASK_PORT', 5000))
    
    # CORS Configuration
    CORS_ORIGINS = [
        'http://localhost:3000',      # Old frontend
        'http://127.0.0.1:5500',      # Live Server
        'http://localhost:5500',      # Live Server
        'http://localhost:5173',      # Vite (React)
        'http://127.0.0.1:5173',      # Vite (React)
        '*'                           # Allow all (for development)
    ]

