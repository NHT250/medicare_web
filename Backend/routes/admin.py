"""Admin blueprint providing role-protected management endpoints."""
from __future__ import annotations

from datetime import datetime
import random
import string
from typing import Any

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, current_app, jsonify, request

from constants.categories import ALLOWED_CATEGORY_SLUGS
from utils.auth import admin_required, token_required
from utils.helpers import (
    build_paginated_response,
    safe_float,
    safe_int,
    serialize_doc,
    slugify,
)

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

VALID_ROLES = {"admin", "customer"}


def _get_db():
    mongo_db = getattr(current_app, "mongo_db", None)
    if mongo_db is None:
        raise RuntimeError("MongoDB connection is not configured on the application")
    return mongo_db


def _parse_object_id(value: str) -> ObjectId | None:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


def _ensure_unique_slug(db, slug: str, exclude_id: ObjectId | None = None) -> bool:
    query: dict[str, Any] = {"slug": slug}
    if exclude_id:
        query["_id"] = {"$ne": exclude_id}
    return db.products.count_documents(query) == 0


def _normalise_images(images: Any) -> list[str]:
    if not images:
        return []
    if isinstance(images, str):
        return [images]
    if isinstance(images, list):
        return [str(item) for item in images if isinstance(item, str) and item.strip()]
    return []


def _normalise_specifications(specs: Any) -> list[dict[str, str]]:
    cleaned: list[dict[str, str]] = []
    if not specs:
        return cleaned
    if isinstance(specs, dict):
        for key, value in specs.items():
            if key:
                cleaned.append({"key": str(key), "value": "" if value is None else str(value)})
        return cleaned
    if isinstance(specs, list):
        for item in specs:
            if isinstance(item, dict):
                key = str(item.get("key", "")).strip()
                value = item.get("value")
                if key:
                    cleaned.append({"key": key, "value": "" if value is None else str(value)})
    return cleaned


def _validate_product_payload(data: dict[str, Any], for_update: bool = False) -> tuple[list[str], dict[str, Any]]:
    errors: list[str] = []
    payload: dict[str, Any] = {}

    if not for_update or "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            errors.append("Name is required")
        payload["name"] = name
    if not for_update or "category" in data:
        category = (data.get("category") or "").strip()
        if not category:
            errors.append("Category is required")
        elif category not in ALLOWED_CATEGORY_SLUGS:
            errors.append("Category must be one of the allowed options")
        payload["category"] = category

    if "price" in data or not for_update:
        price = safe_float(data.get("price"), None)
        if price is None or price < 0:
            errors.append("Price must be a non-negative number")
        payload["price"] = price

    if "discount" in data:
        discount = safe_float(data.get("discount"), 0) or 0
        if discount < 0 or discount > 100:
            errors.append("Discount must be between 0 and 100")
        payload["discount"] = discount
    elif not for_update:
        payload["discount"] = 0

    if "stock" in data or not for_update:
        stock = safe_int(data.get("stock"), None)
        if stock is None or stock < 0:
            errors.append("Stock must be a non-negative integer")
        payload["stock"] = stock

    if "is_active" in data:
        payload["is_active"] = bool(data.get("is_active"))
    elif not for_update:
        payload["is_active"] = True

    if "slug" in data:
        slug_value = slugify(data.get("slug"))
        if not slug_value:
            errors.append("Slug cannot be empty")
        payload["slug"] = slug_value

    if "description" in data or not for_update:
        payload["description"] = data.get("description", "")

    if "images" in data or not for_update:
        payload["images"] = _normalise_images(data.get("images"))

    if "specifications" in data or not for_update:
        payload["specifications"] = _normalise_specifications(data.get("specifications"))

    return errors, payload


def _serialize_product(product: dict[str, Any]) -> dict[str, Any]:
    serialised = serialize_doc(product)
    serialised.setdefault("images", [])
    serialised.setdefault("specifications", [])
    serialised.setdefault("discount", 0)
    serialised.setdefault("is_active", True)
    return serialised


@admin_bp.route("/products", methods=["GET"])
@token_required
@admin_required
def list_products(current_user):  # pylint: disable=unused-argument
    db = _get_db()
    page = max(int(request.args.get("page", 1)), 1)
    limit = min(max(int(request.args.get("limit", 20)), 1), 100)
    search = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip()

    query: dict[str, Any] = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"slug": {"$regex": search, "$options": "i"}},
        ]
    if category:
        query["category"] = category

    total = db.products.count_documents(query)
    cursor = (
        db.products.find(query)
        .sort("updatedAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    products = [_serialize_product(product) for product in cursor]

    return jsonify(build_paginated_response(products, total, page, limit))


@admin_bp.route("/products/<product_id>", methods=["GET"])
@token_required
@admin_required
def get_product(current_user, product_id):  # pylint: disable=unused-argument
    db = _get_db()
    object_id = _parse_object_id(product_id)
    if not object_id:
        return jsonify({"error": "Product not found"}), 404

    product = db.products.find_one({"_id": object_id})
    if not product:
        return jsonify({"error": "Product not found"}), 404

    return jsonify({"product": _serialize_product(product)})


@admin_bp.route("/products", methods=["POST"])
@token_required
@admin_required
def create_product(current_user):  # pylint: disable=unused-argument
    db = _get_db()
    data = request.get_json(force=True, silent=True) or {}
    errors, payload = _validate_product_payload(data)

    name = payload.get("name")
    slug_value = payload.get("slug") or slugify(name)
    if not slug_value:
        errors.append("Slug cannot be empty")
    elif not _ensure_unique_slug(db, slug_value):
        errors.append("Slug already exists")

    if errors:
        return jsonify({"errors": errors}), 400

    now = datetime.utcnow()
    product_doc = {
        "name": name,
        "slug": slug_value,
        "category": payload["category"],
        "price": payload["price"],
        "discount": payload.get("discount", 0) or 0,
        "stock": payload["stock"],
        "images": payload.get("images", []),
        "description": payload.get("description", ""),
        "specifications": payload.get("specifications", []),
        "is_active": payload.get("is_active", True),
        "createdAt": now,
        "updatedAt": now,
    }

    result = db.products.insert_one(product_doc)
    product_doc["_id"] = result.inserted_id

    return (
        jsonify({"message": "Product created", "product": _serialize_product(product_doc)}),
        201,
    )


@admin_bp.route("/products/<product_id>", methods=["PATCH"])
@token_required
@admin_required
def update_product(current_user, product_id):  # pylint: disable=unused-argument
    db = _get_db()
    object_id = _parse_object_id(product_id)
    if not object_id:
        return jsonify({"error": "Product not found"}), 404

    existing = db.products.find_one({"_id": object_id})
    if not existing:
        return jsonify({"error": "Product not found"}), 404

    data = request.get_json(force=True, silent=True) or {}
    errors, payload = _validate_product_payload(data, for_update=True)

    slug_value = payload.get("slug")
    if slug_value:
        if not _ensure_unique_slug(db, slug_value, exclude_id=object_id):
            errors.append("Slug already exists")
    elif "name" in payload:
        slug_value = slugify(payload["name"])
        if slug_value and not _ensure_unique_slug(db, slug_value, exclude_id=object_id):
            errors.append("Slug already exists")
        elif slug_value:
            payload["slug"] = slug_value

    if errors:
        return jsonify({"errors": errors}), 400

    update_fields: dict[str, Any] = {key: value for key, value in payload.items() if value is not None}
    if "images" in payload:
        update_fields["images"] = payload.get("images", [])
    if "specifications" in payload:
        update_fields["specifications"] = payload.get("specifications", [])
    update_fields["updatedAt"] = datetime.utcnow()

    db.products.update_one({"_id": object_id}, {"$set": update_fields})
    updated = db.products.find_one({"_id": object_id})
    return jsonify({"message": "Product updated", "product": _serialize_product(updated)})


@admin_bp.route("/products/<product_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_product(current_user, product_id):  # pylint: disable=unused-argument
    db = _get_db()
    object_id = _parse_object_id(product_id)
    if not object_id:
        return jsonify({"error": "Product not found"}), 404

    result = db.products.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Product not found"}), 404
    return "", 204


@admin_bp.route("/users", methods=["GET"])
@token_required
@admin_required
def list_users(current_user):  # pylint: disable=unused-argument
    db = _get_db()
    page = max(int(request.args.get("page", 1)), 1)
    limit = min(max(int(request.args.get("limit", 20)), 1), 100)
    search = (request.args.get("q") or "").strip()
    role_filter = (request.args.get("role") or "").strip()
    banned_filter = request.args.get("banned")

    query: dict[str, Any] = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]
    if role_filter:
        query["role"] = role_filter
    if banned_filter is not None:
        if banned_filter.lower() in {"true", "1"}:
            query["is_banned"] = True
        elif banned_filter.lower() in {"false", "0"}:
            query["is_banned"] = False

    total = db.users.count_documents(query)
    cursor = (
        db.users.find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    users = []
    for user in cursor:
        user.pop("password", None)
        users.append(serialize_doc(user))

    return jsonify(build_paginated_response(users, total, page, limit))


@admin_bp.route("/users/<user_id>", methods=["GET"])
@token_required
@admin_required
def get_user(current_user, user_id):
    db = _get_db()
    object_id = _parse_object_id(user_id)
    if not object_id:
        return jsonify({"error": "User not found"}), 404

    user = db.users.find_one({"_id": object_id})
    if not user:
        return jsonify({"error": "User not found"}), 404

    orders_cursor = db.orders.find({"userId": str(user["_id"])})
    orders = list(orders_cursor)
    total_spent = sum(order.get("total", 0) or 0 for order in orders)

    user.pop("password", None)
    return jsonify(
        {
            "user": serialize_doc(user),
            "stats": {
                "orders_count": len(orders),
                "total_spent": total_spent,
            },
        }
    )


@admin_bp.route("/users/<user_id>", methods=["PATCH"])
@token_required
@admin_required
def update_user(current_user, user_id):
    db = _get_db()
    object_id = _parse_object_id(user_id)
    if not object_id:
        return jsonify({"error": "User not found"}), 404

    payload = request.get_json(force=True, silent=True) or {}
    allowed_fields = {"name", "email", "phone", "address"}
    update_fields = {k: v for k, v in payload.items() if k in allowed_fields}

    if "email" in update_fields:
        email = update_fields["email"].strip().lower()
        existing = db.users.find_one({"email": email, "_id": {"$ne": object_id}})
        if existing:
            return jsonify({"error": "Email already in use"}), 409
        update_fields["email"] = email

    if "address" in update_fields and not isinstance(update_fields["address"], dict):
        return jsonify({"error": "Address must be an object"}), 400

    if not update_fields:
        return jsonify({"error": "No valid fields to update"}), 400

    update_fields["updatedAt"] = datetime.utcnow()
    result = db.users.update_one({"_id": object_id}, {"$set": update_fields})
    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    updated = db.users.find_one({"_id": object_id})
    updated.pop("password", None)
    return jsonify({"message": "User updated", "user": serialize_doc(updated)})


@admin_bp.route("/users/<user_id>/ban", methods=["PATCH"])
@token_required
@admin_required
def toggle_user_ban(current_user, user_id):
    db = _get_db()
    object_id = _parse_object_id(user_id)
    if not object_id:
        return jsonify({"error": "User not found"}), 404

    if str(current_user["_id"]) == user_id:
        return jsonify({"error": "You cannot update your own status"}), 400

    payload = request.get_json(force=True, silent=True) or {}
    ban_value = payload.get("ban")
    if not isinstance(ban_value, bool):
        return jsonify({"error": "ban must be a boolean"}), 400

    result = db.users.update_one(
        {"_id": object_id},
        {"$set": {"is_banned": ban_value, "updatedAt": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    updated = db.users.find_one({"_id": object_id})
    updated.pop("password", None)
    return jsonify({"message": "User status updated", "user": serialize_doc(updated)})


@admin_bp.route("/users/<user_id>/role", methods=["PATCH"])
@token_required
@admin_required
def update_user_role(current_user, user_id):
    db = _get_db()
    object_id = _parse_object_id(user_id)
    if not object_id:
        return jsonify({"error": "User not found"}), 404

    if str(current_user["_id"]) == user_id:
        return jsonify({"error": "You cannot change your own role"}), 400

    payload = request.get_json(force=True, silent=True) or {}
    role = (payload.get("role") or "").strip().lower()
    if role not in VALID_ROLES:
        return jsonify({"error": "Invalid role"}), 400

    user = db.users.find_one({"_id": object_id})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("role") == role:
        return jsonify({"message": "Role unchanged", "user": serialize_doc(user)})

    if user.get("role") == "admin" and role != "admin":
        remaining_admins = db.users.count_documents(
            {"role": "admin", "_id": {"$ne": object_id}, "is_banned": False}
        )
        if remaining_admins == 0:
            return jsonify({"error": "Cannot demote the last active admin"}), 400

    db.users.update_one(
        {"_id": object_id},
        {"$set": {"role": role, "updatedAt": datetime.utcnow()}},
    )
    updated = db.users.find_one({"_id": object_id})
    updated.pop("password", None)
    return jsonify({"message": "Role updated", "user": serialize_doc(updated)})


@admin_bp.route("/users/<user_id>/reset-password", methods=["POST"])
@token_required
@admin_required
def reset_user_password(current_user, user_id):
    db = _get_db()
    object_id = _parse_object_id(user_id)
    if not object_id:
        return jsonify({"error": "User not found"}), 404

    if str(current_user["_id"]) == user_id:
        return jsonify({"error": "You cannot reset your own password"}), 400

    user = db.users.find_one({"_id": object_id})
    if not user:
        return jsonify({"error": "User not found"}), 404

    temp_password = "".join(random.choices(string.ascii_letters + string.digits, k=10))
    hashed = bcrypt.hashpw(temp_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    db.users.update_one(
        {"_id": object_id},
        {"$set": {"password": hashed, "updatedAt": datetime.utcnow()}},
    )

    return jsonify(
        {
            "message": "Temporary password generated",
            "tempPassword": temp_password,
        }
    )

