# Medicare Backend API - Flask Application
from flask import Flask, jsonify, request
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
import random
import secrets
import string
import smtplib
import ssl
from email.mime.text import MIMEText
from email.utils import formataddr

from routes.admin import admin_bp
from routes.admin_dashboard import dashboard_bp as admin_dashboard_bp
from routes.admin_orders import admin_orders_bp
from routes.admin_uploads import admin_uploads_bp
from utils.auth import token_required
from utils.helpers import serialize_doc

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
        'subtotal': _to_number(serialized.get('subtotal')),
        'shipping_fee': _to_number(
            serialized.get('shippingFee') or serialized.get('shipping_fee')
        ),
        'total': _to_number(serialized.get('total')),
    }

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS with better configuration
CORS(app, 
     origins=Config.CORS_ORIGINS,
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

# Connect to MongoDB
client = MongoClient(Config.MONGODB_URI)
db = client[Config.DATABASE_NAME]

# Ensure critical indexes exist for data integrity and uniqueness
try:
    db.users.create_index("email", unique=True)
except Exception as exc:  # pragma: no cover - log but continue startup
    print(f"Warning: failed to ensure unique index on users.email: {exc}")
try:
    db.email_verification.create_index("expiresAt", expireAfterSeconds=0)
    db.email_verification.create_index("email", unique=True)
except Exception as exc:  # pragma: no cover - log but continue startup
    print(f"Warning: failed to ensure TTL/unique indexes on email_verification: {exc}")
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


def generate_otp(length: int = 8) -> str:
    """Generate a random alphanumeric OTP of the specified length."""

    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choices(characters, k=length))


def send_otp_email(recipient_email: str, otp: str) -> None:
    """Send the OTP to the user via Gmail SMTP."""

    subject = "Medicare Email Verification OTP"
    body = (
        f"Your Medicare verification code is {otp}.\n\n"
        "This code will expire in 2 minutes."
    )

    message = MIMEText(body)
    message['Subject'] = subject
    message['From'] = formataddr(("Medicare Support", Config.SMTP_FROM_EMAIL))
    message['To'] = recipient_email

    context = ssl.create_default_context()
    with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT) as server:
        server.starttls(context=context)
        server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
        server.sendmail(Config.SMTP_FROM_EMAIL, [recipient_email], message.as_string())

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

# ============ AUTHENTICATION ============

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json or {}
        required_fields = ['name', 'email', 'phone', 'password']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({'error': f"Missing fields: {', '.join(missing_fields)}"}), 400

        # Verify reCAPTCHA when enabled
        if Config.ENABLE_RECAPTCHA and not verify_recaptcha(data.get('recaptcha_token')):
            return jsonify({'error': 'reCAPTCHA verification failed'}), 400

        existing_user = db.users.find_one({'email': data['email']})
        if existing_user:
            return jsonify({'error': 'User already exists and is verified'}), 400

        # Prepare OTP verification record
        hashed_password = bcrypt.hashpw(
            data['password'].encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')

        otp_code = generate_otp()
        verification_record = {
            'email': data['email'],
            'otp': otp_code,
            'createdAt': datetime.utcnow(),
            'expiresAt': datetime.utcnow() + timedelta(minutes=2),
            'user_data': {
                'email': data['email'],
                'password': hashed_password,
                'name': data.get('name', ''),
                'phone': data.get('phone', ''),
                'address': data.get('address', {}),
                'role': 'customer',
                'is_banned': False,
                'isVerified': False,
                'createdAt': datetime.utcnow(),
                'updatedAt': datetime.utcnow()
            }
        }

        # Upsert OTP entry for the email
        db.email_verification.update_one(
            {'email': data['email']},
            {'$set': verification_record},
            upsert=True
        )

        send_otp_email(data['email'], otp_code)

        return jsonify({'message': 'OTP sent'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json

        # Verify reCAPTCHA when enabled
        if Config.ENABLE_RECAPTCHA and not verify_recaptcha(data.get('recaptcha_token')):
            return jsonify({'error': 'reCAPTCHA verification failed'}), 400
        
        # Find user
        user = db.users.find_one({'email': data['email']})
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401

        if user.get('is_banned'):
            return jsonify({'error': 'Account is banned'}), 403
        
        # Check password
        if not bcrypt.checkpw(data['password'].encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate JWT token
        role = user.get('role', 'customer')

        token = jwt.encode({
            'user_id': str(user['_id']),
            'email': user['email'],
            'role': role,
            'exp': datetime.utcnow() + timedelta(seconds=Config.JWT_EXPIRATION_DELTA)
        }, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM)

        user.pop('password')

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'role': role,
            'name': user.get('name', ''),
            'email': user['email'],
            'user': serialize_doc(user)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    try:
        data = request.json or {}
        email = data.get('email')
        otp = data.get('otp')

        if not email or not otp:
            return jsonify({'error': 'Email and OTP are required'}), 400

        verification = db.email_verification.find_one({'email': email})
        if not verification:
            return jsonify({'error': 'No OTP found for this email'}), 404

        if verification.get('otp') != otp:
            return jsonify({'error': 'Invalid OTP'}), 400

        if verification.get('expiresAt') < datetime.utcnow():
            return jsonify({'error': 'OTP has expired'}), 400

        # Avoid duplicate account creation
        existing_user = db.users.find_one({'email': email})
        if existing_user:
            db.email_verification.delete_one({'_id': verification['_id']})
            existing_user.pop('password', None)
            return jsonify({'message': 'User already verified', 'user': serialize_doc(existing_user)})

        user_data = verification.get('user_data', {})
        user_data['isVerified'] = True
        user_data['updatedAt'] = datetime.utcnow()

        result = db.users.insert_one(user_data)
        db.email_verification.delete_one({'_id': verification['_id']})

        user_data['_id'] = str(result.inserted_id)
        user_data.pop('password', None)
        return jsonify({'message': 'verified', 'user': serialize_doc(user_data)}), 200
    except DuplicateKeyError:
        return jsonify({'error': 'User already exists'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/resend-otp', methods=['POST'])
def resend_otp():
    try:
        data = request.json or {}
        email = data.get('email')
        if not email:
            return jsonify({'error': 'Email is required'}), 400

        if db.users.find_one({'email': email}):
            return jsonify({'error': 'User already verified'}), 400

        verification = db.email_verification.find_one({'email': email})
        if not verification:
            return jsonify({'error': 'No pending verification found for this email'}), 404

        otp_code = generate_otp()
        db.email_verification.update_one(
            {'email': email},
            {
                '$set': {
                    'otp': otp_code,
                    'createdAt': datetime.utcnow(),
                    'expiresAt': datetime.utcnow() + timedelta(minutes=2)
                }
            }
        )

        send_otp_email(email, otp_code)
        return jsonify({'message': 'OTP resent'}), 200
    except Exception as e:
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

        shipping_info = payload.get('shipping') or {}
        payment_info = payload.get('payment') or {}
        if not isinstance(shipping_info, dict):
            shipping_info = {}
        if not isinstance(payment_info, dict):
            payment_info = {}

        order = {
            'orderId': order_id,
            'userId': user_id,
            'items': validated_items,
            'shipping': shipping_info,
            'payment': payment_info,
            'subtotal': subtotal,
            'shippingFee': shipping_fee,
            'tax': tax,
            'total': total,
            'status': 'Pending',
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
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

            return jsonify({'message': 'Order created successfully', 'order': serialize_doc(order)}), 201
        except Exception:
            for change in decremented:
                db.products.update_one(
                    {'_id': change['product_id']},
                    {'$inc': {'stock': change['quantity']}}
                )
            raise

    except Exception as e:
        return jsonify({'error': str(e)}), 500


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

# ============ RUN SERVER ============

if __name__ == '__main__':
    print('Starting Medicare API Server...')
    print(f'MongoDB: {Config.MONGODB_URI}{Config.DATABASE_NAME}')
    app.run(debug=Config.DEBUG, host=Config.HOST, port=Config.PORT)

