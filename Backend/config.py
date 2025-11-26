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
    EXCHANGE_RATE_USD_TO_VND = float(os.getenv('EXCHANGE_RATE_USD_TO_VND', 24000))

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
        'http://127.0.0.1:5173'       # Vite (React)
    ]

    # Email (SMTP - Gmail) configuration
    SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
    SMTP_USERNAME = os.getenv('SMTP_USERNAME')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
    SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', SMTP_USERNAME)

    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print('Warning: SMTP credentials are missing; email features are disabled.')

