# Medicare Backend API - Flask Application
import os
import re
from io import BytesIO
from flask import Flask, jsonify, redirect, request, send_file
from flask_cors import CORS
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import DuplicateKeyError
import bcrypt
import jwt
from datetime import datetime, timedelta
from config import Config
from bson import ObjectId
from bson.errors import InvalidId
import json
import requests
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except Exception:
    REPORTLAB_AVAILABLE = False

from routes.admin import admin_bp
from routes.admin_dashboard import dashboard_bp as admin_dashboard_bp
from routes.admin_orders import admin_orders_bp
from routes.admin_uploads import admin_uploads_bp
from utils.auth import token_required
from utils.helpers import serialize_doc
from vnpay_utils import build_payment_url, verify_vnpay_signature
from momo_service import create_momo_payment, verify_momo_signature

SHIPPING_FLAT_RATE = 5.0
TAX_RATE = 0.08


def order_to_dict(order):
    """Serialize an order document into an API friendly structure."""

    if not order:
        return None

    serialized = serialize_doc(order)

    shipping = serialized.get('shipping') or {}
    payment = serialized.get('payment') or {}
    items = serialized.get('items') or []

    def _normalise_status(value):
        if not value:
            return 'Pending'
        text = str(value)
        if not text:
            return 'Pending'
        return text[0].upper() + text[1:]

    def _to_number(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    def _normalise_item(item):
        item = item or {}
        price = item.get('price') or 0
        quantity = item.get('quantity') or 0
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            pass
        subtotal = item.get('subtotal')
        if subtotal is None:
            subtotal = price * quantity
        return {
            'product_id': item.get('productId')
            or item.get('product_id')
            or item.get('id'),
            'name': item.get('name'),
            'image': item.get('image') or item.get('thumbnail'),
            'price': _to_number(price),
            'quantity': quantity,
            'subtotal': _to_number(subtotal),
        }

    def _normalise_shipping(value):
        value = value or {}
        return {
            'full_name': value.get('full_name')
            or value.get('fullName')
            or value.get('recipient')
            or '',
            'phone': value.get('phone') or '',
            'address': value.get('address') or '',
            'city': value.get('city') or '',
            'state': value.get('state') or '',
            'zip': value.get('zip')
            or value.get('zipCode')
            or value.get('postalCode')
            or '',
            'country': value.get('country') or '',
            'note': value.get('note') or value.get('notes') or '',
        }

    def _normalise_payment(value):
        value = value or {}
        method_raw = value.get('method') or value.get('type') or ''
        status_raw = value.get('status') or ''

        method = method_raw if isinstance(method_raw, str) else ''
        if method:
            method = method.upper() if len(method) <= 4 else method.title()

        status = status_raw if isinstance(status_raw, str) else ''
        if status:
            status = status.title()

        return {'method': method, 'status': status}

    return {
        'id': serialized.get('_id'),
        'order_id': serialized.get('orderId') or serialized.get('order_id'),
        'created_at': serialized.get('createdAt'),
        'updated_at': serialized.get('updatedAt'),
        'status': _normalise_status(serialized.get('status')),
        'items': [_normalise_item(item) for item in items],
        'shipping': _normalise_shipping(shipping),
        'payment': _normalise_payment(payment),
        # USD amounts are kept for UI/display; VND is used for VNPAY
        'subtotal': _to_number(serialized.get('subtotal') or serialized.get('subtotalUsd')),
        'shipping_fee': _to_number(
            serialized.get('shippingFee') or serialized.get('shipping_fee') or serialized.get('shippingUsd')
        ),
        'tax': _to_number(serialized.get('tax') or serialized.get('taxUsd')),
        'total': _to_number(serialized.get('total') or serialized.get('totalUsd')),
        'total_vnd': _to_number(serialized.get('totalVnd')),
    }

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
RECAPTCHA_SECRET = os.getenv("RECAPTCHA_SECRET")

# Enable CORS with better configuration
CORS(
    app,
    origins=Config.CORS_ORIGINS,
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],  # allow PATCH
)

# Connect to MongoDB
client = MongoClient(Config.MONGODB_URI)
db = client[Config.DATABASE_NAME]

# Ensure critical indexes exist for data integrity and uniqueness
try:
    db.users.create_index("email", unique=True)
except Exception as exc:  # pragma: no cover - log but continue startup
    print(f"Warning: failed to ensure unique index on users.email: {exc}")
app.mongo_db = db

app.register_blueprint(admin_bp)
app.register_blueprint(admin_dashboard_bp)
app.register_blueprint(admin_orders_bp)
app.register_blueprint(admin_uploads_bp)

# Helper function to verify reCAPTCHA
def verify_recaptcha(recaptcha_token: str | None) -> bool:
    """Validate the reCAPTCHA token when the feature is enabled."""

    if not Config.ENABLE_RECAPTCHA:
        # Allow seamless operation when reCAPTCHA is disabled via configuration.
        return True

    if not recaptcha_token:
        return False

    try:
        response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': Config.RECAPTCHA_SECRET_KEY,
                'response': recaptcha_token
            },
            timeout=5
        )
        result = response.json()
        return result.get('success', False)
    except Exception as e:
        print(f'reCAPTCHA verification error: {str(e)}')
        return False
# ============ ROUTES ============

@app.route('/')
def index():
    return jsonify({
        'message': 'Welcome to Medicare API',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth/register, /api/auth/login',
            'products': '/api/products',
            'categories': '/api/categories',
            'cart': '/api/cart',
            'orders': '/api/orders'
        }
    })

@app.route('/test-db', methods=['GET'])
def test_db():
    """Simple endpoint to verify MongoDB connectivity."""
    try:
        user_count = db.users.count_documents({})
        return jsonify({'ok': True, 'user_count': user_count})
    except Exception as exc:
        return jsonify({'ok': False, 'error': str(exc)}), 500

# ============ AUTHENTICATION ============

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json or {}
        required_fields = ['name', 'email', 'phone', 'password']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({'error': f"Missing fields: {', '.join(missing_fields)}"}), 400



        existing_user = db.users.find_one({'email': data['email']})
        if existing_user:
            return jsonify({'error': 'User already exists and is verified'}), 400

        hashed_password = bcrypt.hashpw(
            data['password'].encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')

        user_doc = {
            'email': data['email'],
            'password': hashed_password,
            'name': data.get('name', ''),
            'phone': data.get('phone', ''),
            'address': data.get('address', {}),
            'role': 'customer',
            'is_banned': False,
            'isVerified': True,
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }

        result = db.users.insert_one(user_doc)
        user_doc['_id'] = str(result.inserted_id)
        user_doc.pop('password', None)

        return jsonify({'message': 'Registration successful', 'user': serialize_doc(user_doc)}), 201

    except DuplicateKeyError:
        return jsonify({'error': 'User already exists'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')
        
        print(f"🔐 LOGIN REQUEST: email={email}, password_length={len(password) if password else 0}")

        if not email or not password:
            print(f"❌ Missing fields: email={email}, password={password}")
            return jsonify({'error': 'Email and password are required'}), 400



        user = db.users.find_one({'email': email})
        if not user:
            print(f"❌ User not found: {email}")
            return jsonify({'error': 'Invalid email or password'}), 401

        if user.get('is_banned'):
            print(f"❌ User banned: {email}")
            return jsonify({'error': 'Account is banned'}), 403

        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            print(f"❌ Invalid password for: {email}")
            return jsonify({'error': 'Invalid email or password'}), 401

        role = user.get('role', 'customer')
        token = jwt.encode({
            'user_id': str(user['_id']),
            'email': user['email'],
            'role': role,
            'exp': datetime.utcnow() + timedelta(seconds=Config.JWT_EXPIRATION_DELTA)
        }, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM)

        user.pop('password', None)
        
        print(f"✅ LOGIN SUCCESSFUL: {email}, role={role}")

        return jsonify({
            'token': token,
            'user': {
                '_id': str(user['_id']),
                'email': user['email'],
                'name': user.get('name', ''),
                'role': role
            }
        })
    except Exception as e:
        print(f"❌ LOGIN ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ============ PRODUCTS ============

@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        try:
            page = max(int(request.args.get('page', 1)), 1)
        except (TypeError, ValueError):
            page = 1

        try:
            limit = int(request.args.get('limit', 20))
        except (TypeError, ValueError):
            limit = 20
        limit = min(max(limit, 1), 100)

        search = (request.args.get('search') or '').strip()
        category = (request.args.get('category') or '').strip()
        sort_param = (request.args.get('sort') or 'newest').strip().lower()

        query = {'is_active': True}
        if category:
            query['category'] = category
        if search:
            query['name'] = {'$regex': search, '$options': 'i'}

        sort_field = 'createdAt'
        sort_direction = DESCENDING

        if sort_param in {'price', 'price_asc', 'price:asc', 'price-asc', 'price_low'}:
            sort_field = 'price'
            sort_direction = ASCENDING
        elif sort_param in {'price_desc', 'price:desc', 'price-desc'}:
            sort_field = 'price'
            sort_direction = DESCENDING
        elif sort_param in {'name', 'name_asc', 'name:asc'}:
            sort_field = 'name'
            sort_direction = ASCENDING
        elif sort_param in {'name_desc', 'name:desc'}:
            sort_field = 'name'
            sort_direction = DESCENDING
        elif sort_param in {'oldest', 'created_at', 'created_at_asc'}:
            sort_field = 'createdAt'
            sort_direction = ASCENDING
        elif sort_param in {'newest', 'created_at_desc'}:
            sort_field = 'createdAt'
            sort_direction = DESCENDING

        total = db.products.count_documents(query)
        skip = (page - 1) * limit
        products_cursor = (
            db.products.find(query)
            .sort(sort_field, sort_direction)
            .skip(skip)
            .limit(limit)
        )
        products = [serialize_doc(product) for product in products_cursor]

        return jsonify({
            'products': products,
            'total': total,
            'page': page,
            'limit': limit,
            'count': len(products)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<product_id>', methods=['GET'])
def get_product(product_id):
    try:
        product = db.products.find_one({'_id': ObjectId(product_id), 'is_active': True})
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        return jsonify(serialize_doc(product))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ CATEGORIES ============

@app.route('/api/categories', methods=['GET'])
def get_categories():
    try:
        categories = list(db.categories.find())
        return jsonify({
            'categories': [serialize_doc(cat) for cat in categories]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/categories/stats', methods=['GET'])
def get_category_stats():
    """
    Return product counts for the six homepage categories.
    Does not change existing /api/categories response.
    """
    try:
        target_categories = [
            {"key": "pain_relief", "name": "Pain Relief", "aliases": ["pain_relief", "pain-relief", "pain relief", "painrelief"]},
            {"key": "vitamins", "name": "Vitamins", "aliases": ["vitamins", "vitamin"]},
            {"key": "skin_care", "name": "Skin Care", "aliases": ["skin_care", "skin-care", "skin care", "skincare"]},
            {"key": "heart_health", "name": "Heart Health", "aliases": ["heart_health", "heart-health", "heart health", "cardio"]},
            {"key": "mental_health", "name": "Mental Health", "aliases": ["mental_health", "mental-health", "mental health", "mentalhealth"]},
            {"key": "respiratory", "name": "Respiratory", "aliases": ["respiratory", "respiration", "lungs", "hô hấp", "hohap"]},
        ]

        alias_map = {}
        for cat in target_categories:
            for alias in cat["aliases"]:
                norm = re.sub(r"[^a-z0-9]+", "_", alias.lower()).strip("_")
                alias_map[norm] = cat["key"]

        counts = {cat["key"]: 0 for cat in target_categories}

        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        ]
        results = list(db.products.aggregate(pipeline))

        for doc in results:
            raw_key = doc.get("_id")
            if raw_key is None:
                continue
            norm = re.sub(r"[^a-z0-9]+", "_", str(raw_key).lower()).strip("_")
            mapped_key = alias_map.get(norm)
            if mapped_key:
                counts[mapped_key] += int(doc.get("count", 0))

        data = [
            {"key": cat["key"], "name": cat["name"], "count": counts.get(cat["key"], 0)}
            for cat in target_categories
        ]

        return jsonify({"success": True, "data": data}), 200

    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route('/api/products/featured', methods=['GET'])
def get_featured_products():
    """
    Best sellers based on total quantity sold in paid/completed orders.
    Does not affect existing product APIs.
    """
    try:
        # Allow overriding via query params
        try:
            limit = int(request.args.get('limit', 8))
        except (TypeError, ValueError):
            limit = 8
        limit = max(1, min(limit, 24))

        paid_statuses = {'paid', 'completed', 'delivered', 'payment success', 'payment successful', 'shipped'}

        pipeline = [
            {"$match": {"status": {"$exists": True}}},
            {
                "$project": {
                    "items": 1,
                    "statusLower": {"$toLower": "$status"},
                }
            },
            {"$match": {"statusLower": {"$in": list(paid_statuses)}}},
            {"$unwind": "$items"},
            {
                "$group": {
                    "_id": "$items.productId",
                    "totalSold": {"$sum": {"$ifNull": ["$items.quantity", 0]}},
                }
            },
            {"$match": {"_id": {"$ne": None}}},
            {"$sort": {"totalSold": -1}},
            {"$limit": limit},
        ]

        agg_results = list(db.orders.aggregate(pipeline))
        if not agg_results:
            return jsonify({"success": True, "data": []})

        # Separate ObjectId and string ids
        object_ids = []
        id_to_total = {}
        for entry in agg_results:
            pid = entry.get("_id")
            total = int(entry.get("totalSold", 0))
            id_to_total[str(pid)] = total
            try:
                object_ids.append(ObjectId(pid))
            except Exception:
                # If pid already ObjectId, keep; if string not convertible, skip fetch
                if isinstance(pid, ObjectId):
                    object_ids.append(pid)

        products_cursor = db.products.find({"_id": {"$in": object_ids}})
        product_map = {str(prod["_id"]): prod for prod in products_cursor}

        featured = []
        for entry in agg_results:
            pid = str(entry.get("_id"))
            prod = product_map.get(pid)
            if not prod:
                continue
            featured.append({
                "_id": pid,
                "name": prod.get("name"),
                "price": prod.get("price"),
                "imageUrl": prod.get("image") or (prod.get("images") or [None])[0],
                "totalSold": int(entry.get("totalSold", 0)),
            })

        return jsonify({"success": True, "data": featured}), 200

    except Exception as exc:
        return jsonify({"success": False, "message": str(exc), "data": []}), 500

# ============ CART ============

@app.route('/api/cart', methods=['GET'])
@token_required
def get_cart(current_user):
    try:
        user_id = str(current_user['_id'])
        
        cart = db.carts.find_one({'userId': user_id})
        if not cart:
            return jsonify({
                'userId': user_id,
                'items': [],
                'total': 0
            })

        # Enrich items with product data for display (backward compatible)
        items = cart.get('items') or []
        for item in items:
            pid = item.get('productId') or item.get('id')
            if not pid:
                continue
            product_doc = None
            try:
                product_doc = db.products.find_one({'_id': ObjectId(pid)})
            except Exception:
                product_doc = db.products.find_one({'_id': pid})
            if product_doc:
                item.setdefault('name', product_doc.get('name'))
                img = product_doc.get('image')
                if not img:
                    imgs = product_doc.get('images')
                    if isinstance(imgs, list) and imgs:
                        img = imgs[0]
                if img:
                    item.setdefault('image', img)
                if 'price' not in item or item.get('price') is None:
                    item['price'] = product_doc.get('price')
                # ensure subtotal present
                try:
                    qty = int(item.get('quantity', 0))
                    price_val = float(item.get('price', 0) or 0)
                    item['subtotal'] = price_val * qty
                except Exception:
                    pass

        cart['items'] = items
        return jsonify(serialize_doc(cart))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cart', methods=['POST'])
@token_required
def add_to_cart(current_user):
    try:
        user_id = str(current_user['_id'])

        data = request.get_json(force=True, silent=True) or {}
        product_identifier = data.get('productId')
        if not product_identifier:
            return jsonify({'error': 'Product ID is required'}), 400

        try:
            product_object_id = ObjectId(product_identifier)
        except (InvalidId, TypeError):
            return jsonify({'error': 'Invalid product ID'}), 400

        # Get product
        product = db.products.find_one({'_id': product_object_id, 'is_active': True})
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        try:
            quantity = int(data.get('quantity', 1))
        except (TypeError, ValueError):
            quantity = 0

        if quantity < 1:
            return jsonify({'error': 'Quantity must be at least 1'}), 400

        available_stock = int(product.get('stock') or 0)
        if available_stock < quantity:
            return jsonify({'message': f"Out of stock for {product.get('name', 'product')}"}), 400

        # Get or create cart
        cart = db.carts.find_one({'userId': user_id})

        if not cart:
            cart = {
                'userId': user_id,
                'items': [],
                'total': 0,
                'updatedAt': datetime.utcnow()
            }
            db.carts.insert_one(cart)

        # Add or update item
        item_existing = False
        for item in cart['items']:
            if item['productId'] == str(product_object_id):
                item['quantity'] += quantity
                item['subtotal'] = item['quantity'] * item['price']
                item_existing = True
                break

        if not item_existing:
            cart['items'].append({
                'productId': str(product['_id']),
                'quantity': quantity,
                'price': product['price'],
                'subtotal': product['price'] * quantity
            })
        
        # Calculate total
        cart['total'] = sum(item['subtotal'] for item in cart['items'])
        cart['updatedAt'] = datetime.utcnow()
        
        # Update cart
        db.carts.update_one({'_id': cart['_id']}, {'$set': cart})
        
        return jsonify({'message': 'Item added to cart', 'cart': serialize_doc(cart)})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ ORDERS ============

@app.route('/api/orders', methods=['GET'])
@token_required
def get_orders(current_user):
    try:
        user_id = str(current_user['_id'])
        
        orders = list(db.orders.find({'userId': user_id}).sort('createdAt', -1))
        
        return jsonify({
            'orders': [serialize_doc(order) for order in orders]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['POST'])
@token_required
def create_order(current_user):
    try:
        data = request.json
        user_id = str(current_user['_id'])

        # Generate order ID
        order_id = f"ORD{datetime.now().strftime('%Y%m%d%H%M%S')}"

        payload = request.get_json(force=True, silent=True) or {}
        raw_items = payload.get('items') or []

        if not isinstance(raw_items, list) or not raw_items:
            return jsonify({'error': 'Order items are required'}), 400

        validated_items = []
        stock_requirements = []
        subtotal = 0.0

        for raw_item in raw_items:
            product_identifier = (
                raw_item.get('productId')
                or raw_item.get('product_id')
                or raw_item.get('id')
            )
            if not product_identifier:
                return jsonify({'error': 'Each item must include a productId'}), 400

            try:
                product_object_id = ObjectId(product_identifier)
            except (InvalidId, TypeError):
                return jsonify({'error': 'Invalid product identifier supplied'}), 400

            try:
                quantity = int(raw_item.get('quantity', 0))
            except (TypeError, ValueError):
                quantity = 0

            if quantity < 1:
                return jsonify({'error': 'Quantity must be at least 1'}), 400

            product = db.products.find_one({'_id': product_object_id})
            if not product:
                return jsonify({'error': 'Product not found'}), 404

            price = float(product.get('price', 0))
            if price < 0:
                return jsonify({'error': f"Invalid price configured for {product.get('name', 'product')}"}), 400

            available_stock = int(product.get('stock') or 0)
            if available_stock < quantity:
                return jsonify({'message': f"Out of stock for {product.get('name', 'product')}"}), 400

            line_total = round(price * quantity, 2)
            subtotal += line_total

            images = product.get('images')
            if not isinstance(images, list):
                images = []
            primary_image = images[0] if images else product.get('image')

            validated_items.append({
                'productId': str(product['_id']),
                'name': product.get('name'),
                'image': primary_image,
                'price': price,
                'quantity': quantity,
                'subtotal': line_total
            })
            stock_requirements.append({
                'product_id': product_object_id,
                'quantity': quantity,
                'name': product.get('name')
            })

        subtotal = round(subtotal, 2)
        shipping_fee = SHIPPING_FLAT_RATE if subtotal > 0 else 0.0
        tax = round(subtotal * TAX_RATE, 2)
        total = round(subtotal + shipping_fee + tax, 2)
        # Convert USD totals to VND for VNPAY (kept separate from USD display values)
        # Convert USD totals to VND for VNPAY (kept separate from USD display values)
        # NOTE: EXCHANGE_RATE is an integer VND per 1 USD, configured in `config.py`.
        exchange_rate = Config.EXCHANGE_RATE
        # total_vnd stored as integer VND
        total_vnd = int(round(total * exchange_rate))

        shipping_info = payload.get('shipping') or {}
        payment_info = payload.get('payment') or {}
        if not isinstance(shipping_info, dict):
            shipping_info = {}
        if not isinstance(payment_info, dict):
            payment_info = {}

        payment_method = str(payment_info.get('method') or 'COD').upper()
        payment_status = str(payment_info.get('status') or 'Pending').title()

        order = {
            'orderId': order_id,
            'userId': user_id,
            'items': validated_items,
            'shipping': shipping_info,
            'payment': {'method': payment_method, 'status': payment_status},
            'subtotal': subtotal,
            'shippingFee': shipping_fee,
            'tax': tax,
            'total': total,
            'subtotalUsd': subtotal,
            'shippingUsd': shipping_fee,
            'taxUsd': tax,
            'totalUsd': total,
            'totalVnd': total_vnd,
            'status': 'Pending',
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }
        
        # ========== UNIFIED PAYMENT RESPONSE SYSTEM ==========
        # Track whether we need to redirect to payment gateway or success page
        payment_redirect_data = {
            'method': payment_method,
            'orderId': None,
            'amount': total,
            'amountVnd': total_vnd,
            'status': 'pending_payment'
        }

        decremented = []
        try:
            for requirement in stock_requirements:
                result = db.products.update_one(
                    {
                        '_id': requirement['product_id'],
                        'stock': {'$gte': requirement['quantity']}
                    },
                    {'$inc': {'stock': -requirement['quantity']}}
                )
                if result.modified_count == 0:
                    # Rollback any prior stock updates before returning an error
                    for change in decremented:
                        db.products.update_one(
                            {'_id': change['product_id']},
                            {'$inc': {'stock': change['quantity']}}
                        )
                    return jsonify({'message': f"Out of stock for {requirement['name'] or 'product'}"}), 400
                decremented.append(requirement)

            result = db.orders.insert_one(order)
            order['_id'] = str(result.inserted_id)
            
            # ========== PREPARE RESPONSE BASED ON PAYMENT METHOD ==========
            payment_redirect_data['orderId'] = order_id
            
            # For COD: Success immediately (no external payment gateway)
            if payment_method == 'COD':
                print(f"✅ COD Order created successfully: {order_id}")
                # COD is considered successful after order creation
                # Frontend will redirect to /payment-success
                return jsonify({
                    'message': 'Order created successfully (COD)',
                    'order': serialize_doc(order),
                    'paymentRedirect': {
                        'method': 'cod',
                        'type': 'success',  # Direct to success page
                        'orderId': order_id,
                        'amount': total,
                        'amountVnd': total_vnd,
                        'description': 'Thanh toán khi nhận hàng',
                        'redirectUrl': f'/payment-success?orderId={order_id}&amount={total}&method=cod&transactionType=direct'
                    }
                }), 201
            
            # For VNPAY/MOMO: Return order for payment gateway setup
            # Frontend will handle calling payment API separately
            return jsonify({
                'message': 'Order created successfully', 
                'order': serialize_doc(order),
                'paymentRedirect': {
                    'method': payment_method.lower(),
                    'type': 'gateway',  # Requires payment gateway
                    'orderId': order_id,
                    'amount': total,
                    'amountVnd': total_vnd,
                    'nextStep': f'call_payment_api_for_{payment_method.lower()}'
                }
            }), 201
        except Exception:
            for change in decremented:
                db.products.update_one(
                    {'_id': change['product_id']},
                    {'$inc': {'stock': change['quantity']}}
                )
            raise

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/payment/vnpay/create', methods=['POST'])
@token_required
def create_vnpay_payment(current_user):
    """
    Tạo URL thanh toán VNPAY
    Frontend sẽ gọi endpoint này sau khi tạo order thành công
    """
    try:
        if not Config.VNP_TMN_CODE or not Config.VNP_HASH_SECRET:
            print("❌ VNPAY not configured")
            return jsonify({'error': 'VNPAY is not configured'}), 503

        payload = request.get_json(force=True, silent=True) or {}
        order_identifier = payload.get('orderId')
        amount = payload.get('amount')  # Amount in VND
        description = payload.get('description')

        print(f"🔗 VNPAY Create Payment: orderId={order_identifier}, amount={amount}")

        if not order_identifier or not amount:
            print("❌ Missing orderId or amount")
            return jsonify({'error': 'orderId and amount are required'}), 400

        # Find order in database
        order = None
        try:
            order_object_id = ObjectId(order_identifier)
            order = db.orders.find_one({'_id': order_object_id})
        except (InvalidId, TypeError):
            order = db.orders.find_one({'orderId': order_identifier})

        if not order:
            print(f"❌ Order not found: {order_identifier}")
            return jsonify({'error': 'Order not found'}), 404

        user_id = str(current_user['_id'])
        if order.get('userId') != user_id:
            print(f"❌ Permission denied for user {user_id}")
            return jsonify({'error': 'You do not have permission to pay for this order'}), 403

        # Check if already paid
        payment_info = order.get('payment') or {}
        if str(payment_info.get('status') or '').lower() == 'paid':
            print("❌ Order already paid")
            return jsonify({'error': 'Order has already been paid'}), 400
        
        if str(payment_info.get('method') or '').upper() != 'VNPAY':
            print("❌ Payment method is not VNPAY")
            return jsonify({'error': 'Payment method is not VNPAY for this order'}), 400

        # Build VNPAY payment URL
        ip_addr = request.remote_addr or '127.0.0.1'
        order_ref = str(order.get('_id') or order_identifier)
        
        # Determine amount to charge in VND. Prefer stored order.totalVnd; if missing, compute and save it.
        order_total_vnd = order.get('totalVnd')
        if not order_total_vnd:
            try:
                usd_total = float(order.get('total') or order.get('totalUsd') or 0)
            except Exception:
                usd_total = 0
            order_total_vnd = int(round(usd_total * Config.EXCHANGE_RATE))
            # Persist computed VND total back to order document for future checks
            db.orders.update_one({'_id': order['_id']}, {'$set': {'totalVnd': order_total_vnd}})

        print(f"📝 Building VNPAY URL: orderId={order_ref}, amount_vnd={order_total_vnd}, ip={ip_addr}")

        # build_payment_url expects amount in VND (it multiplies by 100 internally to produce vnp_Amount)
        payment_url = build_payment_url(
            order_ref,
            int(order_total_vnd),
            ip_addr,
            description or f'Thanh toan don hang {order_ref}',
        )

        # Update order payment status
        db.orders.update_one(
            {'_id': order['_id']},
            {'$set': {
                'payment.method': 'VNPAY',
                'payment.status': 'Pending',
                'updatedAt': datetime.utcnow()
            }},
        )

        print(f"✅ Payment URL created: {payment_url[:50]}...")
        return jsonify({
            'payment_url': payment_url,
            'paymentUrl': payment_url,  # Support both snake_case and camelCase
            'orderId': order_ref,
            'amount_vnd': order_total_vnd
        }), 200

    except Exception as e:
        print(f"❌ VNPAY Payment Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/payment/vnpay', methods=['POST'])
@token_required
def initiate_vnpay_payment(current_user):
    try:
        if not Config.VNP_TMN_CODE or not Config.VNP_HASH_SECRET:
            return jsonify({'error': 'VNPAY is not configured'}), 503

        payload = request.get_json(force=True, silent=True) or {}
        order_identifier = payload.get('orderId')
        description = payload.get('description')

        if not order_identifier:
            return jsonify({'error': 'orderId is required'}), 400

        order = None
        try:
            order_object_id = ObjectId(order_identifier)
            order = db.orders.find_one({'_id': order_object_id})
        except (InvalidId, TypeError):
            order = db.orders.find_one({'orderId': order_identifier})

        if not order:
            return jsonify({'error': 'Order not found'}), 404

        user_id = str(current_user['_id'])
        if order.get('userId') != user_id:
            return jsonify({'error': 'You do not have permission to pay for this order'}), 403

        payment_info = order.get('payment') or {}
        if str(payment_info.get('status') or '').lower() == 'paid':
            return jsonify({'error': 'Order has already been paid'}), 400
        if str(payment_info.get('method') or '').upper() != 'VNPAY':
            return jsonify({'error': 'Payment method is not VNPAY for this order'}), 400

        expected_total_usd = float(order.get('total') or order.get('totalUsd') or 0)
        # Use canonical exchange rate in Config.EXCHANGE_RATE (VND per 1 USD)
        expected_total_vnd = int(order.get('totalVnd') or round(expected_total_usd * Config.EXCHANGE_RATE))

        ip_addr = request.remote_addr or '127.0.0.1'
        order_ref = str(order.get('_id') or order_identifier)
        payment_url = build_payment_url(
            order_ref,
            expected_total_vnd,  # VNPAY expects VND; build_payment_url will x100
            ip_addr,
            description or f'Thanh toan don hang {order_ref}',
        )

        db.orders.update_one(
            {'_id': order['_id']},
            {'$set': {'payment.method': 'VNPAY', 'payment.status': 'Pending', 'updatedAt': datetime.utcnow()}},
        )

        return jsonify({'paymentUrl': payment_url, 'orderId': order_ref})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/vnpay_return', methods=['GET'])
def vnpay_return():
    """
    VNPAY return URL handler - người dùng redirect về đây sau khi thanh toán
    """
    print("=" * 80)
    print("🔔 VNPAY RETURN HANDLER CALLED")
    print("=" * 80)
    
    if not Config.VNP_TMN_CODE or not Config.VNP_HASH_SECRET:
        print("❌ VNPAY config missing")
        return redirect('http://localhost:5173/payment-fail?method=vnpay&message=Config+missing')

    # Lấy tất cả params từ VNPAY
    params = request.args.to_dict()
    print(f"\n📥 Raw params from VNPAY:")
    for k, v in params.items():
        print(f"   {k}: {v}")

    # Verify signature
    if not verify_vnpay_signature(params):
        print("\n❌ Signature verification FAILED")
        return redirect('http://localhost:5173/payment-fail?method=vnpay&message=Invalid+signature')
    print("\n✅ Signature verification PASSED")

    # Extract key params
    response_code = params.get('vnp_ResponseCode')
    txn_ref = params.get('vnp_TxnRef')
    paid_vnd = int(params.get('vnp_Amount', '0')) // 100
    
    print(f"\n📊 Key Parameters:")
    print(f"   Response Code: {response_code}")
    print(f"   TxnRef (Order ID): {txn_ref}")
    print(f"   Paid Amount (VND): {paid_vnd}")

    # Find order
    order = None
    try:
        order = db.orders.find_one({'_id': ObjectId(txn_ref)})
    except (InvalidId, TypeError):
        order = None

    if not order and txn_ref:
        order = db.orders.find_one({'orderId': txn_ref})

    if not order:
        print(f"\n❌ Order NOT found: {txn_ref}")
        return redirect(f'http://localhost:5173/payment-fail?method=vnpay&message=Order+not+found')

    # Verify amount
    expected_total_usd = float(order.get('total') or order.get('totalUsd') or 0)
    expected_total_vnd = int(order.get('totalVnd') or round(expected_total_usd * Config.EXCHANGE_RATE))
    
    print(f"\n💰 Amount Verification:")
    print(f"   Expected VND: {expected_total_vnd}")
    print(f"   Paid VND: {paid_vnd}")
    print(f"   Match: {paid_vnd == expected_total_vnd}")

    if paid_vnd != expected_total_vnd:
        print(f"\n❌ Amount MISMATCH - Setting order to FAILED")
        db.orders.update_one(
            {'_id': order['_id']},
            {'$set': {
                'payment.status': 'Failed',
                'status': 'Payment Failed',
                'payment.note': f'Amount mismatch: paid {paid_vnd} VND vs expected {expected_total_vnd} VND',
                'updatedAt': datetime.utcnow()
            }}
        )
        return redirect(f'http://localhost:5173/payment-fail?orderId={txn_ref}&method=vnpay&message=Amount+mismatch&amount={expected_total_usd}')

    # Determine success
    is_success = response_code == '00'
    print(f"\n🎯 Payment Result: {'SUCCESS' if is_success else 'FAILED'}")
    print(f"   Response Code: {response_code}")

    if is_success:
        # Update order to PAID
        db.orders.update_one(
            {'_id': order['_id']},
            {'$set': {
                'payment.method': 'VNPAY',
                'payment.status': 'Paid',
                'payment.transactionId': params.get('vnp_TransactionNo'),
                'status': 'Paid',
                'updatedAt': datetime.utcnow()
            }}
        )
        print(f"✅ Order {txn_ref} set to PAID status")
        
        redirect_url = f"http://localhost:5173/payment-success?orderId={txn_ref}&amount={expected_total_usd}&method=vnpay"
    else:
        # Update order to FAILED
        db.orders.update_one(
            {'_id': order['_id']},
            {'$set': {
                'payment.method': 'VNPAY',
                'payment.status': 'Failed',
                'payment.transactionId': params.get('vnp_TransactionNo'),
                'status': 'Payment Failed',
                'updatedAt': datetime.utcnow()
            }}
        )
        print(f"❌ Order {txn_ref} set to FAILED status")
        
        error_message = {
            '01': 'Giao dịch bị từ chối',
            '02': 'Merchant closed',
            '04': 'Số tiền không đúng',
            '05': 'Khác',
            '06': 'Sai tham số',
            '07': 'Sai tham số giá trị',
            '08': 'Giao dịch không tồn tại',
            '09': 'Sai chữ ký',
            '10': 'Đã huỷ giao dịch',
            '11': 'Sai mã merchant',
            '12': 'Lỗi khác'
        }.get(response_code, f'Mã lỗi {response_code}')
        
        from urllib.parse import quote
        redirect_url = f"http://localhost:5173/payment-fail?orderId={txn_ref}&amount={expected_total_usd}&method=vnpay&message={quote(error_message)}"

    print(f"\n🔄 Redirecting to: {redirect_url[:80]}...")
    print("=" * 80 + "\n")
    
    return redirect(redirect_url)


@app.route('/api/orders/<order_id>', methods=['GET'])
@token_required
def get_order_detail(current_user, order_id):
    try:
        user_id = str(current_user['_id'])

        try:
            object_id = ObjectId(order_id)
        except (InvalidId, TypeError):
            return jsonify({'error': 'Order not found'}), 404

        order = db.orders.find_one({'_id': object_id})
        if not order:
            return jsonify({'error': 'Order not found'}), 404

        if order.get('userId') != user_id:
            return (
                jsonify({'error': 'You do not have permission to view this order'}),
                403,
            )

        return jsonify(order_to_dict(order))

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/orders/<order_id>/status', methods=['PATCH'])
@token_required
def update_order_status_user(current_user, order_id):
    try:
        user_id = str(current_user['_id'])

        try:
            object_id = ObjectId(order_id)
        except (InvalidId, TypeError):
            return jsonify({'error': 'Order not found'}), 404

        order = db.orders.find_one({'_id': object_id})
        if not order:
            return jsonify({'error': 'Order not found'}), 404

        if order.get('userId') != user_id:
            return (
                jsonify({'error': 'You do not have permission to modify this order'}),
                403,
            )

        current_status = str(order.get('status') or '').lower() or 'pending'
        payload = request.get_json(force=True, silent=True) or {}
        new_status = str(payload.get('status') or '').lower()

        if new_status != 'cancelled':
            return jsonify({'error': 'Only cancellation is supported'}), 400

        if current_status != 'pending':
            return jsonify({'error': 'Only pending orders can be cancelled'}), 400

        update_doc = {
            '$set': {'status': 'cancelled', 'updatedAt': datetime.utcnow()},
        }

        db.orders.update_one({'_id': order['_id']}, update_doc)
        updated = db.orders.find_one({'_id': order['_id']})

        return jsonify(order_to_dict(updated))

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/orders/<order_id>/reorder', methods=['POST'])
@token_required
def reorder_order(current_user, order_id):
    """Replace cart with items from a past order (1:1 clone)."""
    try:
        user_id = str(current_user['_id'])

        def _find_order(oid: str):
            try:
                obj_id = ObjectId(oid)
                found = db.orders.find_one({'_id': obj_id, 'userId': user_id})
                if found:
                    return found
            except Exception:
                pass
            return db.orders.find_one({'orderId': oid, 'userId': user_id})

        order = _find_order(order_id)
        if not order:
            return jsonify({'success': False, 'message': 'Order not found'}), 404

        items = order.get('items') or []
        if not items:
            return jsonify({'success': False, 'message': 'Order has no items'}), 400

        cart = db.carts.find_one({'userId': user_id})
        if not cart:
            cart = {'userId': user_id, 'items': [], 'total': 0, 'updatedAt': datetime.utcnow()}
            res = db.carts.insert_one(cart)
            cart['_id'] = res.inserted_id

        # Replace cart items completely
        cart_items = []
        added_count = 0

        for order_item in items:
            pid = order_item.get('productId')
            if not pid:
                continue
            # Ensure product still exists; allow inactive if no is_active flag
            product_doc = None
            try:
                product_doc = db.products.find_one({'_id': ObjectId(pid)})
            except Exception:
                product_doc = db.products.find_one({'_id': pid})
            if not product_doc:
                continue  # skip missing products

            try:
                qty = int(order_item.get('quantity', 1))
            except Exception:
                qty = 1
            qty = max(qty, 1)

            # Prefer order item price/name/image; fallback to product doc
            price = float(order_item.get('price') or product_doc.get('price') or 0)
            name = order_item.get('name') or product_doc.get('name')
            image = (
                order_item.get('image')
                or (product_doc.get('images')[0] if isinstance(product_doc.get('images'), list) and product_doc.get('images') else None)
                or product_doc.get('image')
            )

            cart_items.append({
                'productId': str(product_doc['_id']),
                'name': name,
                'image': image,
                'price': price,
                'quantity': qty,
                'subtotal': price * qty
            })

            added_count += 1

        cart['items'] = cart_items
        cart['total'] = sum(item.get('subtotal', 0) for item in cart_items)
        cart['updatedAt'] = datetime.utcnow()

        db.carts.update_one({'_id': cart['_id']}, {'$set': cart}, upsert=True)

        return jsonify({
            'success': True,
            'message': 'Items from order have been added to your cart.',
            'cartItemCount': len(cart_items),
            'addedItems': added_count
        }), 200

    except Exception as exc:
        return jsonify({'success': False, 'message': str(exc)}), 500


@app.route('/api/orders/<order_id>/invoice', methods=['GET'])
@token_required
def download_invoice(current_user, order_id):
    """Generate and return a PDF invoice for the order."""
    if not REPORTLAB_AVAILABLE:
        return jsonify({'success': False, 'message': 'PDF generation not available (install reportlab).'}), 503
    try:
        user_id = str(current_user['_id'])

        def _find_order(oid: str):
            try:
                obj_id = ObjectId(oid)
                found = db.orders.find_one({'_id': obj_id, 'userId': user_id})
                if found:
                    return found
            except Exception:
                pass
            return db.orders.find_one({'orderId': oid, 'userId': user_id})

        order = _find_order(order_id)
        if not order:
            return jsonify({'success': False, 'message': 'Order not found'}), 404

        user = None
        try:
            user = db.users.find_one({'_id': ObjectId(user_id)})
        except Exception:
            user = None

        shipping = order.get('shipping') or {}
        payment = order.get('payment') or {}
        items = order.get('items') or []

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        y = height - 40

        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(40, y, "Medicare - Invoice")
        y -= 20
        pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, f"Invoice: {order.get('orderId') or order_id}")
        y -= 14
        pdf.drawString(40, y, f"Date: {order.get('createdAt') or datetime.utcnow().isoformat()}")
        y -= 14
        pdf.drawString(40, y, f"Status: {order.get('status', 'N/A')}")
        y -= 20

        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(40, y, "Billing / Shipping")
        y -= 14
        pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, f"Name: {shipping.get('fullName') or shipping.get('full_name') or (user.get('name') if user else '')}")
        y -= 12
        pdf.drawString(40, y, f"Email: {shipping.get('email') or (user.get('email') if user else '')}")
        y -= 12
        pdf.drawString(40, y, f"Phone: {shipping.get('phone') or ''}")
        y -= 12
        pdf.drawString(40, y, f"Address: {shipping.get('address') or ''}")
        y -= 18

        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(40, y, "Items")
        y -= 14
        pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, "Name")
        pdf.drawString(260, y, "Qty")
        pdf.drawString(320, y, "Price")
        pdf.drawString(400, y, "Subtotal")
        y -= 12
        pdf.line(40, y, 540, y)
        y -= 12

        subtotal = 0
        for item in items:
            if y < 100:
                pdf.showPage()
                y = height - 60
            name = str(item.get('name', ''))[:60]
            qty = int(item.get('quantity', 0))
            price = float(item.get('price', 0))
            sub = float(item.get('subtotal', qty * price))
            subtotal += sub
            pdf.drawString(40, y, name)
            pdf.drawString(260, y, str(qty))
            pdf.drawString(320, y, f"${price:.2f}")
            pdf.drawString(400, y, f"${sub:.2f}")
            y -= 12

        shipping_fee = float(order.get('shippingFee') or order.get('shipping_fee') or 0)
        tax = float(order.get('tax') or 0)
        total = float(order.get('total') or subtotal + shipping_fee + tax)

        y -= 10
        pdf.line(320, y, 480, y)
        y -= 14
        pdf.drawString(320, y, f"Subtotal: ${subtotal:.2f}")
        y -= 12
        pdf.drawString(320, y, f"Shipping: ${shipping_fee:.2f}")
        y -= 12
        pdf.drawString(320, y, f"Tax: ${tax:.2f}")
        y -= 12
        pdf.drawString(320, y, f"Total: ${total:.2f}")
        y -= 20

        pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, f"Payment Method: {payment.get('method', 'N/A')}")
        y -= 12
        pdf.drawString(40, y, f"Payment Status: {payment.get('status', order.get('status', 'N/A'))}")

        pdf.showPage()
        pdf.save()
        buffer.seek(0)

        filename = f"invoice-{order.get('orderId') or order_id}.pdf"
        return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name=filename)

    except Exception as exc:
        return jsonify({'success': False, 'message': str(exc)}), 500
# ============ USER PROFILE ============

@app.route('/api/users/profile', methods=['GET'])
@token_required
def get_user_profile(current_user):
    try:
        user = serialize_doc(current_user)
        user.pop('password', None)  # Remove password from response
        return jsonify({'user': user})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/profile', methods=['PUT'])
@token_required
def update_user_profile(current_user):
    try:
        data = request.json
        user_id = current_user['_id']
        
        update_fields = {}

        allowed_fields = ['name', 'phone', 'address']
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]

        new_email = data.get('email')
        current_email = current_user.get('email')
        if new_email and new_email != current_email:
            if db.users.find_one({'email': new_email, '_id': {'$ne': user_id}}):
                return jsonify({'message': 'Email already exists'}), 400
            update_fields['email'] = new_email

        if not update_fields:
            return jsonify({
                'message': 'No changes made',
                'user': serialize_doc(current_user)
            })

        update_fields['updatedAt'] = datetime.utcnow()

        try:
            db.users.update_one({'_id': user_id}, {'$set': update_fields})
        except DuplicateKeyError:
            return jsonify({'message': 'Email already exists'}), 400

        updated_user = db.users.find_one({'_id': user_id})
        updated_user = serialize_doc(updated_user)
        updated_user.pop('password', None)

        return jsonify({
            'message': 'Profile updated successfully',
            'user': updated_user
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ MOMO PAYMENT ============

@app.route('/api/payment/momo', methods=['POST'])
@token_required
def create_momo_payment_endpoint(current_user):
    """
    Create MoMo payment URL for order.
    Frontend calls this after successful order creation.
    """
    try:
        if not Config.MOMO_ACCESS_KEY or not Config.MOMO_SECRET_KEY:
            print("❌ MoMo not configured")
            return jsonify({'error': 'MoMo is not configured'}), 503

        payload = request.get_json(force=True, silent=True) or {}
        order_identifier = payload.get('orderId')

        print(f"🔗 MoMo Create Payment: orderId={order_identifier}")

        if not order_identifier:
            print("❌ Missing orderId")
            return jsonify({'error': 'orderId is required'}), 400

        # Find order in database
        order = None
        try:
            order_object_id = ObjectId(order_identifier)
            order = db.orders.find_one({'_id': order_object_id})
        except (InvalidId, TypeError):
            order = db.orders.find_one({'orderId': order_identifier})

        if not order:
            print(f"❌ Order not found: {order_identifier}")
            return jsonify({'error': 'Order not found'}), 404

        user_id = str(current_user['_id'])
        if order.get('userId') != user_id:
            print(f"❌ Permission denied for user {user_id}")
            return jsonify({'error': 'You do not have permission to pay for this order'}), 403

        # Check if already paid
        payment_info = order.get('payment') or {}
        if str(payment_info.get('status') or '').lower() == 'paid':
            print("❌ Order already paid")
            return jsonify({'error': 'Order has already been paid'}), 400
        
        if str(payment_info.get('method') or '').upper() != 'MOMO':
            print("❌ Payment method is not MoMo")
            return jsonify({'error': 'Payment method is not MoMo for this order'}), 400

        # Create MoMo payment
        momo_response = create_momo_payment(order)

        if momo_response.get('resultCode') != 0:
            print(f"❌ MoMo creation failed: {momo_response.get('message')}")
            return jsonify({
                'success': False,
                'error': momo_response.get('message') or 'Failed to create MoMo payment',
                'resultCode': momo_response.get('resultCode')
            }), 400

        pay_url = momo_response.get('payUrl')
        if not pay_url:
            print("❌ MoMo response missing payUrl")
            return jsonify({
                'success': False,
                'error': 'MoMo response missing payUrl'
            }), 400

        # Update order payment status to pending
        db.orders.update_one(
            {'_id': order['_id']},
            {'$set': {
                'payment.method': 'MOMO',
                'payment.status': 'Pending',
                'updatedAt': datetime.utcnow()
            }},
        )

        order_total_vnd = order.get('totalVnd') or int(round(float(order.get('total') or 0) * Config.EXCHANGE_RATE))
        
        print(f"✅ MoMo payment created: payUrl={pay_url[:50]}...")
        return jsonify({
            'success': True,
            'payUrl': pay_url,
            'orderId': str(order.get('_id') or order_identifier),
            'amount_vnd': order_total_vnd
        }), 200

    except Exception as e:
        print(f"❌ MoMo Payment Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/payment/momo/ipn', methods=['POST'])
def momo_ipn_handler():
    """
    MoMo IPN (Instant Payment Notification) webhook handler.
    MoMo calls this endpoint to notify payment result.
    """
    print("=" * 80)
    print("🔔 MOMO IPN HANDLER CALLED")
    print("=" * 80)
    
    try:
        data = request.get_json(force=True, silent=True) or {}
        
        print(f"\n📥 Raw IPN data from MoMo:")
        for k, v in data.items():
            if k != 'signature':
                print(f"   {k}: {v}")

        # Verify signature
        if not verify_momo_signature(data):
            print("\n❌ Signature verification FAILED")
            print("=" * 80 + "\n")
            return jsonify({'message': 'Invalid signature', 'resultCode': 1}), 400
        print("\n✅ Signature verification PASSED")

        order_id = data.get('orderId')
        result_code = int(data.get('resultCode', -1))  # 0 = success
        amount_vnd = data.get('amount')  # MoMo returns amount as VND (not x100)
        transaction_id = data.get('transId')
        
        print(f"\n📊 Key Parameters:")
        print(f"   Order ID: {order_id}")
        print(f"   Result Code: {result_code} (0=success)")
        print(f"   Amount VND: {amount_vnd}")
        print(f"   Transaction ID: {transaction_id}")

        # Find order
        order = None
        try:
            if order_id:
                order = db.orders.find_one({'_id': ObjectId(order_id)})
        except (InvalidId, TypeError):
            if order_id:
                order = db.orders.find_one({'orderId': order_id})

        if not order:
            print(f"\n❌ Order NOT found: {order_id}")
            print("=" * 80 + "\n")
            return jsonify({'message': 'Order not found', 'resultCode': 1}), 400

        print(f"✅ Order found: {order.get('orderId')}")

        # Verify amount BEFORE checking result code
        try:
            paid_vnd = int(amount_vnd) if amount_vnd else 0
        except (TypeError, ValueError):
            paid_vnd = 0

        expected_total_usd = float(order.get('total') or order.get('totalUsd') or 0)
        expected_total_vnd = int(order.get('totalVnd') or round(expected_total_usd * Config.EXCHANGE_RATE))
        
        print(f"\n💰 Amount Verification:")
        print(f"   Expected VND: {expected_total_vnd}")
        print(f"   Paid VND: {paid_vnd}")
        print(f"   Match: {paid_vnd == expected_total_vnd}")

        # Amount mismatch is ALWAYS a failure (regardless of resultCode)
        if paid_vnd != expected_total_vnd:
            print(f"\n❌ Amount MISMATCH - Setting order to FAILED")
            db.orders.update_one(
                {'_id': order['_id']},
                {'$set': {
                    'payment.method': 'MOMO',
                    'payment.status': 'Failed',
                    'payment.transactionId': transaction_id,
                    'payment.resultCode': result_code,
                    'payment.note': f'Amount mismatch: paid {paid_vnd} VND vs expected {expected_total_vnd} VND',
                    'status': 'Payment Failed',
                    'updatedAt': datetime.utcnow()
                }}
            )
            print("=" * 80 + "\n")
            return jsonify({'message': 'Amount mismatch', 'resultCode': 0}), 200

        # Now check MoMo result code
        print(f"\n🎯 MoMo Payment Result: {'SUCCESS' if result_code == 0 else 'FAILED'}")
        print(f"   Result Code: {result_code}")

        if result_code == 0:
            # MoMo says success AND amount matches → SET TO PAID
            print(f"✅ Order {order_id} set to PAID status")
            db.orders.update_one(
                {'_id': order['_id']},
                {'$set': {
                    'payment.method': 'MOMO',
                    'payment.status': 'Paid',
                    'payment.transactionId': transaction_id,
                    'payment.resultCode': result_code,
                    'status': 'Paid',
                    'updatedAt': datetime.utcnow()
                }}
            )
        else:
            # MoMo says failure → SET TO FAILED
            print(f"❌ Order {order_id} set to FAILED status (MoMo resultCode={result_code})")
            db.orders.update_one(
                {'_id': order['_id']},
                {'$set': {
                    'payment.method': 'MOMO',
                    'payment.status': 'Failed',
                    'payment.transactionId': transaction_id,
                    'payment.resultCode': result_code,
                    'status': 'Payment Failed',
                    'updatedAt': datetime.utcnow()
                }}
            )

        print("=" * 80 + "\n")
        return jsonify({'message': 'OK', 'resultCode': 0}), 200

    except Exception as e:
        print(f"❌ Exception in MoMo IPN: {str(e)}")
        import traceback
        traceback.print_exc()
        print("=" * 80 + "\n")
        return jsonify({'error': str(e), 'resultCode': 1}), 500


@app.route('/api/payment/momo/return', methods=['GET', 'POST'])
def momo_return_handler():
    """
    MoMo return URL handler - User redirect từ MoMo khi thanh toán xong.
    
    MoMo redirects user từ gateway về URL này với query/body params:
    - orderId: ID của đơn hàng
    - amount: Số tiền (VND)
    - resultCode: 0=success, 4007=user cancel, other=error
    - transId: Transaction ID từ MoMo
    - transTime: Transaction time
    - message: Message từ MoMo
    
    Hàm này:
    1. Nhận return params từ MoMo
    2. Tìm order trong DB
    3. Verify status hiện tại (IPN có thể đã update hay chưa?)
    4. Return JSON cho frontend biết status chắc chắn từ DB
    
    IMPORTANT: Không cập nhật DB ở đây vì:
    - returnUrl không đáng tin cậy (user có thể fake URL)
    - IPN handler sẽ cập nhật DB (server-to-server, đáng tin hơn)
    - Nếu IPN chậm, frontend có thể retry sau 2s
    """
    print("=" * 80)
    print("🔔 MOMO RETURN HANDLER CALLED")
    print("=" * 80)
    
    try:
        # MoMo có thể gửi qua GET hoặc POST
        if request.method == 'POST':
            data = request.get_json(force=True, silent=True) or {}
        else:
            data = request.args.to_dict()
        
        print(f"\n📥 Raw return data from MoMo (Method: {request.method}):")
        for k, v in data.items():
            if k != 'signature':
                print(f"   {k}: {v}")
        
        # Extract key params
        order_id = data.get('orderId')
        result_code_str = data.get('resultCode')
        amount = data.get('amount')
        trans_id = data.get('transId')
        message = data.get('message', '')
        
        try:
            result_code_int = int(result_code_str) if result_code_str else -1
        except (TypeError, ValueError):
            result_code_int = -1
        
        print(f"\n📊 Key parameters:")
        print(f"   Order ID: {order_id}")
        print(f"   Result Code: {result_code_int}")
        print(f"   Amount (VND): {amount}")
        print(f"   Transaction ID: {trans_id}")
        print(f"   Message: {message}")
        
        # Find order in DB
        order = None
        try:
            if order_id:
                order = db.orders.find_one({'_id': ObjectId(order_id)})
        except (InvalidId, TypeError):
            if order_id:
                order = db.orders.find_one({'orderId': order_id})
        
        if not order:
            print(f"\n❌ Order NOT found: {order_id}")
            print("=" * 80 + "\n")
            return jsonify({
                'success': False,
                'status': 'NOT_FOUND',
                'message': 'Order not found in database'
            }), 404
        
        print(f"✅ Order found: {order.get('orderId')}")
        
        # Get current DB status
        db_status = order.get('status') or 'Pending'
        payment_info = order.get('payment') or {}
        payment_status = payment_info.get('status') or 'Pending'
        db_result_code = payment_info.get('resultCode')
        
        print(f"\n📋 Current DB state:")
        print(f"   Order status: {db_status}")
        print(f"   Payment status: {payment_status}")
        print(f"   Payment resultCode: {db_result_code}")
        
        # Map MoMo resultCode to order status
        result_code_map = {
            0: 'Paid',              # Thành công
            1000: 'Failed',         # Lỗi hệ thống MoMo
            1001: 'Failed',         # Giao dịch không tồn tại / timeout
            1002: 'Failed',         # Dữ liệu đầu vào không hợp lệ
            1003: 'Failed',         # Người dùng từ chối
            1004: 'Failed',         # Giao dịch bị từ chối
            1005: 'Failed',         # Không đủ tiền
            1006: 'Failed',         # Giao dịch bị hoàn tiền
            1007: 'Failed',         # Không được hỗ trợ
            4007: 'Failed',         # User hủy ← IMPORTANT
        }
        
        result_code_descriptions = {
            0: "Thanh toán thành công",
            1000: "Lỗi hệ thống MoMo",
            1001: "Giao dịch không tồn tại hoặc hết timeout",
            1002: "Dữ liệu đầu vào không hợp lệ",
            1003: "Người dùng từ chối hoặc không phản hồi",
            1004: "Giao dịch bị từ chối",
            1005: "Không có đủ tiền trong tài khoản",
            1006: "Giao dịch bị hoàn tiền",
            1007: "Giao dịch không được hỗ trợ",
            4007: "Người dùng hủy thanh toán",
            -1: "Lỗi không xác định",
        }
        
        expected_status = result_code_map.get(result_code_int, 'Failed')
        status_description = result_code_descriptions.get(result_code_int, 'Lỗi không xác định')
        
        print(f"\n📖 Result Code mapping:")
        print(f"   {result_code_int} → Expected status: '{expected_status}'")
        print(f"   Description: {status_description}")
        
        # Check if DB is synced with MoMo result
        # Allow small difference: if both are success or both are failure
        is_synced = (
            (db_status == expected_status) or
            (db_result_code == result_code_int)
        )
        
        if is_synced:
            print(f"\n✅ DB status SYNCED with MoMo result code")
        else:
            print(f"\n⚠️ DB status NOT SYNCED yet with MoMo result")
            print(f"   DB says: {db_status}, MoMo says: {expected_status}")
            print(f"   (IPN handler might not have processed yet - will sync soon)")
        
        print("=" * 80 + "\n")
        
        # Return comprehensive response
        return jsonify({
            'success': True,
            'orderId': str(order.get('_id')),
            'orderIdString': order.get('orderId'),
            'dbStatus': db_status,
            'paymentStatus': payment_status,
            'momoResultCode': result_code_int,
            'momoResultDescription': status_description,
            'expectedStatus': expected_status,
            'isSynced': is_synced,
            'amount': float(order.get('total') or 0),
            'amountVnd': order.get('totalVnd') or 0,
            'transId': trans_id,
            'message': 'MoMo return received, DB status verified'
        }), 200
    
    except Exception as e:
        print(f"❌ Exception in MoMo return handler: {str(e)}")
        import traceback
        traceback.print_exc()
        print("=" * 80 + "\n")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error processing MoMo return'
        }), 500

# ============ RUN SERVER ============

if __name__ == '__main__':
    print('Starting Medicare API Server...')
    print(f'MongoDB: {Config.MONGODB_URI}{Config.DATABASE_NAME}')
    app.run(debug=Config.DEBUG, host=Config.HOST, port=Config.PORT)

