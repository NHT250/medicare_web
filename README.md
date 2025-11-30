# Medicare Web - Run Guide

## Structure
- Backend: Flask (Python) in `Backend`
- Frontend: React (Vite) in `Frontend_React`

## Environment setup
- Python 3.10+ and Node.js 18+
- Create `.env` files for Backend and Frontend (do not commit secrets).

### Backend `.env` sample
```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/?appName=Cluster0
DATABASE_NAME=medicare

JWT_SECRET_KEY=<jwt-secret>
ENABLE_RECAPTCHA=False
RECAPTCHA_SECRET_KEY=<recaptcha-secret-key>

# VNPAY sandbox
VNP_TMN_CODE=<code>
VNP_HASH_SECRET=<hash-secret>
VNP_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:5000/vnpay_return
```

### Frontend `.env` sample
```
VITE_API_BASE_URL=http://localhost:5000
VITE_RECAPTCHA_SITE_KEY=<recaptcha-site-key>
```

## Run Backend
```
cd Backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## Run Frontend
```
cd Frontend_React
npm install
npm run dev
```

## Security note
- Never commit keys/secrets. Keep all tokens in local .env files.
