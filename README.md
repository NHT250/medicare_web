This project is an e-commerce website built for the pharmacy sector. Today, many people want to buy medicine online. However, it is hard to find clear and correct information about drugs on the internet.

Our system solves this problem. It helps users search for medicine, read accurate information, and buy products safely. It also helps pharmacy owners manage their business easily.
 Main Features
For Users: Create an account, search for drugs, and place orders quickly.

AI Chatbot: A smart chatbot works 24/7. It answers basic questions about medicine, like ingredients and how to use them safely.

For Admins: A clear dashboard to manage products, users, orders, and sales.

Payment System: Supports online payment simulation (Sandbox) using MoMo, ZaloPay, and VNPay.

High Security: Protects user data with strict security (JWT, password encryption, and CAPTCHA).

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
