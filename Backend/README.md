# Medicare Backend API - Flask + MongoDB

## 📋 Overview
Backend API for Medicare online pharmacy platform using Flask (Python) and MongoDB.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd Backend
pip install -r requirements.txt
```

### 2. Start MongoDB
```bash
# macOS
brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod
```

### 3. Seed Database
```bash
python seed_data.py
```

### 4. Run Server
```bash
python app.py
```

Server will run on `http://localhost:5000`

## 📁 Project Structure
```
Backend/
├── app.py              # Main Flask application
├── config.py           # Configuration settings
├── requirements.txt    # Python dependencies
├── seed_data.py       # Database seeder
├── README.md          # Documentation
└── config.env         # Environment variables
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Products
- `GET /api/products` - Get all products
- `GET /api/products?category=pain-relief` - Filter by category
- `GET /api/products/<product_id>` - Get product by ID

### Categories
- `GET /api/categories` - Get all categories

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart` - Add item to cart

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order

## 📝 Configuration

Edit `config.py` or set environment variables:
```bash
MONGODB_URI=mongodb://localhost:27017/
DATABASE_NAME=medicare
FLASK_PORT=5000
```

## 🔒 Security
- Passwords hashed with bcrypt
- JWT tokens for authentication
- CORS enabled for frontend

## 📚 Technologies
- Flask - Python web framework
- MongoDB - NoSQL database
- PyMongo - MongoDB driver
- Flask-CORS - CORS support
- bcrypt - Password hashing
- PyJWT - JWT tokens

