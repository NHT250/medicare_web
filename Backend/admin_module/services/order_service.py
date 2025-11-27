from datetime import datetime
from flask import current_app
from ..utils.validators import to_object_id

VALID_TRANSITIONS = {
    "PENDING": {"CONFIRMED", "CANCELLED"},
    "CONFIRMED": {"DELIVERED", "CANCELLED"},
    "DELIVERED": set(),
    "CANCELLED": set(),
}


def list_orders(page=1, limit=20, user_id=None, status=None, search=None, sort_by="createdAt", sort_order="desc"):
    db = current_app.mongo_db
    query = {}
    if user_id:
        oid = to_object_id(user_id)
        if oid:
            query["userId"] = oid
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"orderCode": {"$regex": search, "$options": "i"}},
        ]
    skip = (page - 1) * limit
    sort_dir = -1 if sort_order == "desc" else 1
    cursor = db.orders.find(query).sort(sort_by, sort_dir).skip(skip).limit(limit)
    items = []
    for o in cursor:
        o["id"] = str(o.pop("_id"))
        items.append(o)
    total = db.orders.count_documents(query)
    return items, {"page": page, "limit": limit, "total": total}


def get_order(order_id):
    db = current_app.mongo_db
    oid = to_object_id(order_id)
    if not oid:
        return None
    order = db.orders.find_one({"_id": oid})
    if not order:
        return None
    order["id"] = str(order.pop("_id"))
    order["items"] = list(db.order_items.find({"orderId": oid}))
    order["logs"] = list(db.order_logs.find({"orderId": oid}))
    user = db.users.find_one({"_id": order.get("userId")})
    if user:
        order["customer"] = {"id": str(user.get("_id")), "name": user.get("name"), "email": user.get("email")}
    return order


def update_status(order_id, new_status, admin_id):
    db = current_app.mongo_db
    oid = to_object_id(order_id)
    if not oid:
        return False, "Invalid id"
    order = db.orders.find_one({"_id": oid})
    if not order:
        return False, "Not found"
    current_status = order.get("status", "PENDING")
    allowed = VALID_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        return False, "Invalid status transition"
    db.orders.update_one({"_id": oid}, {"$set": {"status": new_status, "updatedAt": datetime.utcnow()}})
    db.order_logs.insert_one(
        {
            "orderId": oid,
            "action": "STATUS_CHANGED",
            "oldValue": {"status": current_status},
            "newValue": {"status": new_status},
            "createdBy": to_object_id(admin_id),
            "createdAt": datetime.utcnow(),
        }
    )
    return True, None


def update_order(order_id, payload, admin_id):
    db = current_app.mongo_db
    oid = to_object_id(order_id)
    if not oid:
        return False, "Invalid id"
    order = db.orders.find_one({"_id": oid})
    if not order:
        return False, "Not found"
    db.orders.update_one({"_id": oid}, {"$set": payload | {"updatedAt": datetime.utcnow()}})
    db.order_logs.insert_one(
        {
            "orderId": oid,
            "action": "ORDER_UPDATED",
            "oldValue": {},
            "newValue": payload,
            "createdBy": to_object_id(admin_id),
            "createdAt": datetime.utcnow(),
        }
    )
    return True, None


def delete_order(order_id):
    db = current_app.mongo_db
    oid = to_object_id(order_id)
    if not oid:
        return False, "Invalid id"
    db.orders.delete_one({"_id": oid})
    return True, None


__all__ = [
    "list_orders",
    "get_order",
    "update_status",
    "update_order",
    "delete_order",
    "VALID_TRANSITIONS",
]
