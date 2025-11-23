"""
MongoDB Seeder for Medicare.
- Tạo dữ liệu mẫu cho DB.
- Cảnh báo: Mỗi lần chạy sẽ xóa sạch dữ liệu cũ trong users, products, categories.
- Cách chạy: python seed_data.py
"""

import os
from datetime import datetime

import bcrypt
from dotenv import load_dotenv
from pymongo import MongoClient, errors

from constants.categories import FIXED_CATEGORIES

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017/"
DATABASE_NAME = os.getenv("DATABASE_NAME") or "medicare"

def connect_db():
    """Create a MongoDB client and return db handle."""
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        return client, client[DATABASE_NAME]
    except errors.PyMongoError as exc:
        print("❌ Cannot connect to MongoDB. Please check MONGO_URI / network.")
        print(f"Details: {exc}")
        return None, None

client, db = connect_db()
if not db:
    raise SystemExit(1)

# Clear existing data
db.users.delete_many({})
db.products.delete_many({})
db.categories.delete_many({})

# Ensure email uniqueness index exists before inserting documents
db.users.create_index('email', unique=True)

print('🗑️  Cleared existing data...')

# Sample Users
sample_users = [
    {
        'email': 'user@example.com',
        'password': bcrypt.hashpw('password123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        'name': 'John Doe',
        'phone': '0123456789',
        'address': {
            'street': '123 Main Street',
            'ward': 'Ward 1',
            'district': 'District 1',
            'city': 'Ho Chi Minh City'
        },
        'role': 'customer',
        'is_banned': False,
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow()
    },
    {
        'email': 'admin@medicare.com',
        'password': bcrypt.hashpw('Admin@123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        'name': 'Admin User',
        'phone': '0987654321',
        'address': {
            'street': '456 Admin Road',
            'ward': 'Ward 2',
            'district': 'District 3',
            'city': 'Ho Chi Minh City'
        },
        'role': 'admin',
        'is_banned': False,
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow()
    }
]

CATEGORY_DESCRIPTIONS = {
    'pain-relief': 'Medications for pain management',
    'vitamins': 'Vitamin and mineral supplements',
    'skin-care': 'Products for skin health',
    'heart-health': 'Medications for cardiovascular health',
    'mental-health': 'Medications for mental wellbeing',
    'respiratory': 'Medications for breathing and lung health'
}


def build_sample_categories():
    current_time = datetime.now()
    return [
        {
            **category,
            'description': CATEGORY_DESCRIPTIONS.get(category['slug'], ''),
            'createdAt': current_time
        }
        for category in FIXED_CATEGORIES
    ]


# Sample Categories
sample_categories = build_sample_categories()

# Sample Products
sample_products = [
    {
        'name': 'Paracetamol 500mg',
        'slug': 'paracetamol-500mg',
        'category': 'pain-relief',
        'price': 7.00,
        'discount': 12,
        'stock': 100,
        'images': [
            'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80'
        ],
        'description': 'Pain relief tablets for headaches and fever with fast-acting ingredients.',
        'specifications': [
            {'key': 'Dosage', 'value': '500mg'},
            {'key': 'Pack Size', 'value': '10 tablets'},
        ],
        'is_active': True,
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow()
    },
    {
        'name': 'Vitamin C 1000mg',
        'slug': 'vitamin-c-1000mg',
        'category': 'vitamins',
        'price': 24.99,
        'discount': 0,
        'stock': 75,
        'images': [
            'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80'
        ],
        'description': 'High potency Vitamin C supplement for immune support.',
        'specifications': [
            {'key': 'Serving Size', 'value': '1 tablet'},
            {'key': 'Form', 'value': 'Time release'},
        ],
        'is_active': True,
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow()
    },
    {
        'name': 'Omega-3 Fish Oil',
        'slug': 'omega-3-fish-oil',
        'category': 'heart-health',
        'price': 32.99,
        'discount': 15,
        'stock': 50,
        'images': [
            'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80'
        ],
        'description': 'Heart health capsules with essential fatty acids EPA and DHA.',
        'specifications': [
            {'key': 'EPA', 'value': '360mg'},
            {'key': 'DHA', 'value': '240mg'},
        ],
        'is_active': True,
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow()
    },
    {
        'name': 'Daily Multivitamin',
        'slug': 'daily-multivitamin',
        'category': 'vitamins',
        'price': 19.99,
        'discount': 5,
        'stock': 60,
        'images': [
            'https://images.unsplash.com/photo-1550572017-edd951aa0b0a?auto=format&fit=crop&w=800&q=80'
        ],
        'description': 'Complete daily nutrition supplement supporting overall wellness.',
        'specifications': [
            {'key': 'Tablets', 'value': '60'},
            {'key': 'Recommended Use', 'value': 'Take 1 tablet daily'},
        ],
        'is_active': True,
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow()
    }
]

# Insert data
try:
    db.users.insert_many(sample_users)
    print('✅ Inserted users')

    db.categories.insert_many(sample_categories)
    print('✅ Inserted categories')

    db.products.insert_many(sample_products)
    print('✅ Inserted products')

    print('\n🎉 Database seeding completed successfully!')
    print(f'Database: {DATABASE_NAME}')
    print('Collections: users, products, categories')
finally:
    client.close()
