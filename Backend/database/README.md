# Medicare MongoDB Database

## 📋 Overview
This directory contains the database configuration, schemas, and seed data for the Medicare project.

## 🗄️ Database Structure

### Collections

#### 1. **users** - User Accounts
```javascript
{
    email: String,
    password: String (hashed),
    name: String,
    phone: String,
    address: {
        street: String,
        ward: String,
        district: String,
        city: String
    },
    createdAt: Date,
    updatedAt: Date
}
```

#### 2. **products** - Medicine/Product Catalog
```javascript
{
    name: String,
    description: String,
    price: Number,
    oldPrice: Number,
    image: String,
    category: String,
    subcategory: String,
    stock: Number,
    inStock: Boolean,
    rating: Number,
    reviews: Number,
    ingredients: [String],
    usage: String,
    sideEffects: String,
    warnings: String,
    createdAt: Date,
    updatedAt: Date
}
```

#### 3. **categories** - Product Categories
```javascript
{
    name: String,
    description: String,
    icon: String,
    slug: String,
    createdAt: Date
}
```

#### 4. **carts** - Shopping Cart
```javascript
{
    userId: String,
    items: [{
        productId: String,
        quantity: Number,
        price: Number,
        subtotal: Number
    }],
    total: Number,
    updatedAt: Date
}
```

#### 5. **orders** - Order History
```javascript
{
    orderId: String,
    userId: String,
    items: [...],
    shipping: {...},
    payment: {...},
    subtotal: Number,
    shippingFee: Number,
    tax: Number,
    total: Number,
    status: String,
    createdAt: Date,
    updatedAt: Date
}
```

## 🚀 Getting Started

### 1. Install MongoDB
```bash
# On macOS
brew install mongodb-community

# On Windows
# Download from https://www.mongodb.com/try/download/community

# On Ubuntu
sudo apt-get install mongodb
```

### 2. Start MongoDB
```bash
# Start MongoDB service
mongod

# Or on macOS
brew services start mongodb-community
```

### 3. Install Dependencies
```bash
cd Backend
npm install mongoose
```

### 4. Run Seeder
```bash
# Populate database with sample data
node database/seeder.js
```

## 📝 Files

- `config.js` - MongoDB connection configuration
- `models.js` - Schema definitions
- `seeder.js` - Sample data seeder
- `README.md` - This file

## 🔧 Configuration

Edit `config.js` to change MongoDB connection:
- Local: `mongodb://localhost:27017/medicare`
- Cloud (Atlas): `mongodb+srv://username:password@cluster.mongodb.net/medicare`

## 📊 Sample Data

The seeder includes:
- 2 sample users
- 6 categories
- 4 sample products

## 🔒 Security Notes

- Always hash passwords using bcrypt
- Use environment variables for sensitive data
- Never commit credentials to version control

