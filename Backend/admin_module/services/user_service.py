from datetime import datetime
from flask import current_app
from ..utils.validators import is_valid_email, to_object_id


def list_users(page=1, limit=20, search=None, role=None, is_banned=None):
    db = current_app.mongo_db
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]
    if role:
        query["role"] = role
    if is_banned is not None:
        query["isBanned"] = is_banned
    skip = (page - 1) * limit
    cursor = db.users.find(query).skip(skip).limit(limit)
    items = []
    for u in cursor:
        u["id"] = str(u.pop("_id"))
        items.append(u)
    total = db.users.count_documents(query)
    return items, {"page": page, "limit": limit, "total": total}


def get_user(user_id):
    db = current_app.mongo_db
    oid = to_object_id(user_id)
    if not oid:
        return None
    user = db.users.find_one({"_id": oid})
    if not user:
        return None
    user["id"] = str(user.pop("_id"))
    return user


def update_user(user_id, payload):
    db = current_app.mongo_db
    oid = to_object_id(user_id)
    if not oid:
        return None, "Invalid id"
    if payload.get("email") and not is_valid_email(payload.get("email")):
        return None, "Invalid email"
    if payload.get("email"):
        exists = db.users.find_one({"email": payload.get("email"), "_id": {"$ne": oid}})
        if exists:
            return None, "Email already in use"
    update = {k: v for k, v in payload.items() if v is not None}
    update["updatedAt"] = datetime.utcnow()
    db.users.update_one({"_id": oid}, {"$set": update})
    return get_user(user_id), None


def set_ban(user_id, is_banned: bool):
    db = current_app.mongo_db
    oid = to_object_id(user_id)
    if not oid:
        return False, "Invalid id"
    db.users.update_one({"_id": oid}, {"$set": {"isBanned": is_banned, "updatedAt": datetime.utcnow()}})
    return True, None


def update_role(user_id, role):
    db = current_app.mongo_db
    oid = to_object_id(user_id)
    if not oid:
        return False, "Invalid id"
    db.users.update_one({"_id": oid}, {"$set": {"role": role, "updatedAt": datetime.utcnow()}})
    return True, None


__all__ = ["list_users", "get_user", "update_user", "set_ban", "update_role"]
