from datetime import datetime
from flask import current_app
from bson import ObjectId
from ..utils.validators import to_object_id


def list_products(page=1, limit=20, search=None, category_id=None, is_active=None):
    db = current_app.mongo_db
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"slug": {"$regex": search, "$options": "i"}},
        ]
    if category_id:
        oid = to_object_id(category_id)
        if oid:
            query["categoryId"] = oid
    if is_active is not None:
        query["isActive"] = is_active
    skip = (page - 1) * limit
    cursor = db.products.find(query).skip(skip).limit(limit)
    items = []
    for p in cursor:
        p["id"] = str(p.pop("_id"))
        items.append(p)
    total = db.products.count_documents(query)
    return items, {"page": page, "limit": limit, "total": total}


def get_product(product_id):
    db = current_app.mongo_db
    oid = to_object_id(product_id)
    if not oid:
        return None
    product = db.products.find_one({"_id": oid})
    if not product:
        return None
    product["id"] = str(product.pop("_id"))
    return product


def slug_exists(slug, exclude_id=None):
    db = current_app.mongo_db
    query = {"slug": slug}
    if exclude_id:
        query["_id"] = {"$ne": exclude_id}
    return db.products.count_documents(query) > 0


def create_product(payload):
    db = current_app.mongo_db
    if slug_exists(payload.get("slug")):
        return None, "Slug already exists"
    category_id = to_object_id(payload.get("categoryId"))
    if not category_id:
        return None, "Invalid category"
    now = datetime.utcnow()
    doc = {
        "name": payload.get("name"),
        "slug": payload.get("slug"),
        "description": payload.get("description"),
        "price": float(payload.get("price", 0)),
        "stock": int(payload.get("stock", 0)),
        "categoryId": category_id,
        "imageUrl": payload.get("imageUrl"),
        "specs": payload.get("specs") or {},
        "isActive": bool(payload.get("isActive", True)),
        "createdAt": now,
        "updatedAt": now,
    }
    result = db.products.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc, None


def update_product(product_id, payload):
    db = current_app.mongo_db
    oid = to_object_id(product_id)
    if not oid:
        return None, "Invalid id"
    existing = db.products.find_one({"_id": oid})
    if not existing:
        return None, "Not found"
    if payload.get("slug") and payload.get("slug") != existing.get("slug"):
        if slug_exists(payload.get("slug"), exclude_id=oid):
            return None, "Slug already exists"
    update = {k: v for k, v in payload.items() if v is not None}
    if "categoryId" in update:
        cid = to_object_id(update["categoryId"])
        if not cid:
            return None, "Invalid category"
        update["categoryId"] = cid
    update["updatedAt"] = datetime.utcnow()
    db.products.update_one({"_id": oid}, {"$set": update})
    return get_product(product_id), None


def delete_product(product_id):
    db = current_app.mongo_db
    oid = to_object_id(product_id)
    if not oid:
        return False, "Invalid id"
    db.products.update_one({"_id": oid}, {"$set": {"isActive": False, "updatedAt": datetime.utcnow()}})
    return True, None


__all__ = [
    "list_products",
    "get_product",
    "create_product",
    "update_product",
    "delete_product",
]
