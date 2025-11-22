"""Admin order management endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, current_app, jsonify, request

from utils.auth import admin_required, token_required
from utils.helpers import safe_float, serialize_doc


admin_orders_bp = Blueprint("admin_orders", __name__, url_prefix="/api/admin/orders")

VALID_STATUSES = {"Pending", "Confirmed", "Delivered", "Cancelled"}
ALLOWED_TRANSITIONS = {
    "Pending": {"Confirmed", "Cancelled"},
    "Confirmed": {"Delivered", "Cancelled"},
    "Delivered": set(),
    "Cancelled": set(),
}

SORT_FIELD_MAP = {
    "created_at": "createdAt",
    "updated_at": "updatedAt",
    "total": "total",
}


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


def _canonical_status(status: str | None) -> str | None:
    if not status:
        return None
    normalized = str(status).strip()
    if not normalized:
        return None
    return normalized[0].upper() + normalized[1:].lower()


def _to_iso(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return None
    return str(value)


def _to_camel_case(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


def _collect_user_map(db, orders: Iterable[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    user_ids: set[ObjectId] = set()
    for order in orders:
        user_id = order.get("userId") or order.get("user_id")
        object_id = _parse_object_id(user_id)
        if object_id:
            user_ids.add(object_id)

    if not user_ids:
        return {}

    users_cursor = db.users.find({"_id": {"$in": list(user_ids)}})
    return {str(user["_id"]): serialize_doc(user) for user in users_cursor}


def _serialise_shipping(shipping: dict[str, Any] | None) -> dict[str, Any]:
    shipping = shipping or {}
    return {
        "full_name": shipping.get("full_name")
        or shipping.get("fullName")
        or shipping.get("recipient"),
        "phone": shipping.get("phone"),
        "email": shipping.get("email"),
        "address": shipping.get("address"),
        "city": shipping.get("city"),
        "state": shipping.get("state"),
        "zip": shipping.get("zip") or shipping.get("zip_code") or shipping.get("zipCode"),
        "country": shipping.get("country"),
        "note": shipping.get("note") or shipping.get("instructions"),
    }


def _serialise_payment(payment: dict[str, Any] | None) -> dict[str, Any]:
    payment = payment or {}
    return {
        "method": payment.get("method"),
        "status": payment.get("status") or payment.get("state"),
        "transaction_id": payment.get("transaction_id") or payment.get("transactionId"),
    }


def _serialise_items(items: Iterable[dict[str, Any]] | None) -> list[dict[str, Any]]:
    serialised: list[dict[str, Any]] = []
    for item in items or []:
        price = safe_float(item.get("price"), 0.0) or 0.0
        quantity = int(item.get("quantity") or 0)
        subtotal = safe_float(item.get("subtotal"), None)
        if subtotal is None:
            subtotal = price * quantity
        serialised.append(
            {
                "product_id": item.get("product_id")
                or item.get("productId")
                or item.get("id"),
                "name": item.get("name") or item.get("title"),
                "image": item.get("image") or item.get("thumbnail"),
                "price": price,
                "quantity": quantity,
                "subtotal": subtotal,
            }
        )
    return serialised


def _serialise_activity(entries: Iterable[dict[str, Any]] | None) -> list[dict[str, Any]]:
    serialised: list[dict[str, Any]] = []
    for entry in entries or []:
        serialised.append(
            {
                "type": entry.get("type") or "status_change",
                "status": _canonical_status(entry.get("status")) if entry.get("status") else None,
                "message": entry.get("message") or entry.get("note"),
                "actor": entry.get("actor"),
                "timestamp": _to_iso(entry.get("timestamp")),
            }
        )
    serialised.sort(key=lambda item: item.get("timestamp") or "")
    return serialised


def _serialise_order_summary(order: dict[str, Any], user: dict[str, Any] | None) -> dict[str, Any]:
    shipping = _serialise_shipping(order.get("shipping"))
    payment = _serialise_payment(order.get("payment"))
    total = safe_float(order.get("total"), 0.0) or 0.0

    customer_name = (
        shipping.get("full_name")
        or order.get("customerName")
        or user.get("name") if user else None
    )
    email = shipping.get("email") or (user.get("email") if user else None)

    return {
        "id": str(order.get("_id")),
        "order_number": order.get("order_number")
        or order.get("orderId")
        or str(order.get("_id")),
        "customer_name": customer_name,
        "email": email,
        "total": total,
        "status": _canonical_status(order.get("status")) or "Pending",
        "payment_method": payment.get("method"),
        "created_at": _to_iso(order.get("createdAt")),
        "updated_at": _to_iso(order.get("updatedAt")),
    }


def _serialise_order(order: dict[str, Any], user: dict[str, Any] | None) -> dict[str, Any]:
    shipping = _serialise_shipping(order.get("shipping"))
    payment = _serialise_payment(order.get("payment"))
    subtotal = safe_float(order.get("subtotal"), 0.0) or 0.0
    shipping_fee = safe_float(order.get("shipping_fee"), None)
    if shipping_fee is None:
        shipping_fee = safe_float(order.get("shippingFee"), 0.0) or 0.0
    total = safe_float(order.get("total"), 0.0) or 0.0

    customer = None
    if user:
        customer = {
            "id": user.get("_id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "phone": user.get("phone"),
        }

    return {
        "id": str(order.get("_id")),
        "order_number": order.get("order_number")
        or order.get("orderId")
        or str(order.get("_id")),
        "customer": customer,
        "items": _serialise_items(order.get("items")),
        "shipping": shipping,
        "payment": payment,
        "status": _canonical_status(order.get("status")) or "Pending",
        "subtotal": subtotal,
        "shipping_fee": shipping_fee,
        "total": total,
        "notes": order.get("notes") or "",
        "created_at": _to_iso(order.get("createdAt")),
        "updated_at": _to_iso(order.get("updatedAt")),
        "activity_log": _serialise_activity(order.get("activityLog")),
    }


def _find_order(db, identifier: str) -> dict[str, Any] | None:
    object_id = _parse_object_id(identifier)
    if object_id:
        order = db.orders.find_one({"_id": object_id})
        if order:
            return order
    return db.orders.find_one({"orderId": identifier})


def _prepare_shipping_updates(payload: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    if not isinstance(payload, dict):
        raise ValueError("Shipping payload must be an object")

    mapping = {
        "full_name": ["full_name", "fullName", "recipient"],
        "phone": ["phone"],
        "email": ["email"],
        "address": ["address"],
        "city": ["city"],
        "state": ["state"],
        "zip": ["zip", "zip_code", "zipCode"],
        "country": ["country"],
        "note": ["note", "instructions"],
    }

    updates: dict[str, Any] = {}
    changed: list[str] = []
    for canonical, aliases in mapping.items():
        value_found = False
        for key in aliases:
            if key in payload:
                updates[canonical] = payload.get(key)
                changed.append(canonical)
                value_found = True
                break
        if not value_found and canonical in payload:
            updates[canonical] = payload.get(canonical)
            changed.append(canonical)

    result: dict[str, Any] = {}
    for key, value in updates.items():
        if value is None:
            continue
        result[key] = value
        result[_to_camel_case(key)] = value
        if key == "zip":
            result["zip_code"] = value
            result["zipCode"] = value
    return result, changed


def _prepare_payment_updates(payload: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    if not isinstance(payload, dict):
        raise ValueError("Payment payload must be an object")

    updates: dict[str, Any] = {}
    changed: list[str] = []
    for key in ("method", "status", "transaction_id", "transactionId"):
        if key in payload:
            normalised_key = "transaction_id" if key in {"transaction_id", "transactionId"} else key
            updates[normalised_key] = payload.get(key)
            changed.append(normalised_key)
    return updates, changed


def _build_activity_entry(activity_type: str, actor: dict[str, Any], **extra: Any) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "type": activity_type,
        "actor": actor,
        "timestamp": datetime.utcnow(),
    }
    entry.update(extra)
    return entry


@admin_orders_bp.route("/", methods=["GET"])
@token_required
@admin_required
def list_orders(current_user):  # pylint: disable=unused-argument
    db = _get_db()

    try:
        page = max(int(request.args.get("page", 1)), 1)
    except (TypeError, ValueError):
        page = 1
    try:
        limit = int(request.args.get("limit", 10))
    except (TypeError, ValueError):
        limit = 10
    limit = min(max(limit, 1), 100)

    status_param = (request.args.get("status") or "").strip()
    q = (request.args.get("q") or "").strip()
    sort_param = (request.args.get("sort") or "-created_at").strip() or "-created_at"

    query: dict[str, Any] = {}

    user_filter = (request.args.get("user_id") or "").strip()
    if user_filter:
        if user_filter.isdigit():
            query["userId"] = user_filter
        else:
            object_id = _parse_object_id(user_filter)
            if object_id:
                query["userId"] = str(object_id)
            else:
                query["userId"] = user_filter

    if status_param:
        canonical_status = _canonical_status(status_param)
        if canonical_status not in VALID_STATUSES:
            return jsonify({"error": "Invalid status filter"}), 400
        query["status"] = {"$regex": f"^{canonical_status}$", "$options": "i"}

    if q:
        or_conditions: list[dict[str, Any]] = []
        object_id = _parse_object_id(q)
        if object_id:
            or_conditions.append({"_id": object_id})
        if q.isdigit():
            or_conditions.append({"order_number": q})
        or_conditions.extend(
            [
                {"orderId": {"$regex": q, "$options": "i"}},
                {"shipping.fullName": {"$regex": q, "$options": "i"}},
                {"shipping.full_name": {"$regex": q, "$options": "i"}},
                {"shipping.email": {"$regex": q, "$options": "i"}},
            ]
        )
        user_matches = db.users.find(
            {
                "$or": [
                    {"name": {"$regex": q, "$options": "i"}},
                    {"email": {"$regex": q, "$options": "i"}},
                ]
            },
            {"_id": 1},
        )
        matched_user_ids = [str(user["_id"]) for user in user_matches]
        if matched_user_ids:
            or_conditions.append({"userId": {"$in": matched_user_ids}})
        if or_conditions:
            if "$or" in query:
                query["$and"] = [{"$or": query.pop("$or")}, {"$or": or_conditions}]
            else:
                query["$or"] = or_conditions

    sort_direction = -1 if sort_param.startswith("-") else 1
    sort_key = sort_param.lstrip("+-").lower()
    sort_field = SORT_FIELD_MAP.get(sort_key, "createdAt")

    total = db.orders.count_documents(query)
    cursor = (
        db.orders.find(query)
        .sort(sort_field, sort_direction)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    orders = list(cursor)

    users_map = _collect_user_map(db, orders)
    items = [_serialise_order_summary(order, users_map.get(order.get("userId"))) for order in orders]

    return jsonify({"items": items, "total": total, "page": page, "limit": limit})


@admin_orders_bp.route("/<order_id>", methods=["GET"])
@token_required
@admin_required
def get_order(current_user, order_id):  # pylint: disable=unused-argument
    db = _get_db()
    order = _find_order(db, order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    users_map = _collect_user_map(db, [order])
    user = users_map.get(order.get("userId"))
    return jsonify(_serialise_order(order, user))


@admin_orders_bp.route("/<order_id>/status", methods=["PATCH"])
@token_required
@admin_required
def update_order_status(current_user, order_id):
    db = _get_db()
    order = _find_order(db, order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    payload = request.get_json(force=True, silent=True) or {}
    new_status = _canonical_status(payload.get("status"))
    if new_status not in VALID_STATUSES:
        return jsonify({"error": "Invalid order status"}), 400

    current_status = _canonical_status(order.get("status")) or "Pending"
    if new_status == current_status:
        users_map = _collect_user_map(db, [order])
        return jsonify(_serialise_order(order, users_map.get(order.get("userId"))))

    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        return (
            jsonify(
                {
                    "error": "Invalid status transition",
                    "current": current_status,
                    "allowed": sorted(allowed),
                }
            ),
            400,
        )

    actor = {
        "id": str(current_user.get("_id")),
        "name": current_user.get("name") or current_user.get("email"),
    }
    activity_entry = _build_activity_entry(
        "status_change",
        actor,
        status=new_status,
        message=payload.get("message") or f"Status changed to {new_status}",
    )

    update_doc: dict[str, Any] = {
        "$set": {"status": new_status, "updatedAt": datetime.utcnow()},
        "$push": {"activityLog": activity_entry},
    }

    db.orders.update_one({"_id": order["_id"]}, update_doc)
    updated = db.orders.find_one({"_id": order["_id"]})

    users_map = _collect_user_map(db, [updated])
    return jsonify(_serialise_order(updated, users_map.get(updated.get("userId"))))


@admin_orders_bp.route("/<order_id>", methods=["PATCH"])
@token_required
@admin_required
def update_order(current_user, order_id):
    db = _get_db()
    order = _find_order(db, order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    payload = request.get_json(force=True, silent=True) or {}

    set_fields: dict[str, Any] = {"updatedAt": datetime.utcnow()}
    changed_fields: list[str] = []

    if "notes" in payload:
        notes = payload.get("notes")
        if notes is not None and not isinstance(notes, str):
            return jsonify({"error": "Notes must be a string"}), 400
        set_fields["notes"] = notes or ""
        changed_fields.append("notes")

    if "shipping" in payload:
        try:
            shipping_updates, shipping_changed = _prepare_shipping_updates(payload.get("shipping") or {})
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        if shipping_updates:
            existing_shipping = order.get("shipping") or {}
            merged_shipping = {**existing_shipping, **shipping_updates}
            set_fields["shipping"] = merged_shipping
            changed_fields.extend([f"shipping.{field}" for field in shipping_changed])

    if "payment" in payload:
        try:
            payment_updates, payment_changed = _prepare_payment_updates(payload.get("payment") or {})
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        if payment_updates:
            existing_payment = order.get("payment") or {}
            merged_payment = {**existing_payment, **payment_updates}
            set_fields["payment"] = merged_payment
            changed_fields.extend([f"payment.{field}" for field in payment_changed])

    if len(set_fields) == 1:  # only updatedAt present
        return jsonify({"error": "No valid fields to update"}), 400

    actor = {
        "id": str(current_user.get("_id")),
        "name": current_user.get("name") or current_user.get("email"),
    }

    update_doc: dict[str, Any] = {"$set": set_fields}
    if changed_fields:
        activity_entry = _build_activity_entry(
            "update",
            actor,
            message="Updated order details",
            fields=changed_fields,
        )
        update_doc.setdefault("$push", {})["activityLog"] = activity_entry

    db.orders.update_one({"_id": order["_id"]}, update_doc)
    updated = db.orders.find_one({"_id": order["_id"]})

    users_map = _collect_user_map(db, [updated])
    return jsonify(_serialise_order(updated, users_map.get(updated.get("userId"))))


@admin_orders_bp.route("/<order_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_order(current_user, order_id):  # pylint: disable=unused-argument
    db = _get_db()
    order = _find_order(db, order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    db.orders.delete_one({"_id": order["_id"]})
    return "", 204

