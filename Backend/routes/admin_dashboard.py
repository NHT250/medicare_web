"""Admin dashboard blueprint exposing analytics endpoints."""
from __future__ import annotations

from datetime import datetime, timedelta

from bson import ObjectId
from bson.decimal128 import Decimal128
from bson.errors import InvalidId
from flask import Blueprint, current_app, jsonify, request

from utils.auth import admin_required, token_required


def _get_db():
    db = getattr(current_app, "mongo_db", None)
    if db is None:
        raise RuntimeError("MongoDB connection is not configured on the application")
    return db


def _to_float(value) -> float:
    if isinstance(value, Decimal128):
        return float(value.to_decimal())
    if isinstance(value, (int, float)):
        return float(value)
    if value is None:
        return 0.0
    return float(value)


def _isoformat(value) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return None
    try:
        return datetime.fromisoformat(str(value)).isoformat()
    except (TypeError, ValueError):
        return str(value)


STATUSES_FOR_REVENUE = {"confirmed", "delivered"}

dashboard_bp = Blueprint(
    "admin_dashboard", __name__, url_prefix="/api/admin/dashboard"
)


@dashboard_bp.route("/summary", methods=["GET"])
@token_required
@admin_required
def get_summary(current_user):  # pylint: disable=unused-argument
    """Return aggregated metrics for the admin overview."""

    db = _get_db()

    total_users = db.users.count_documents({})
    total_orders = db.orders.count_documents({})
    active_products = db.products.count_documents(
        {"$or": [{"is_active": True}, {"stock": {"$gt": 0}}]}
    )

    revenue_pipeline = [
        {
            "$match": {
                "$expr": {
                    "$in": [
                        {"$toLower": {"$ifNull": ["$status", ""]}},
                        list(STATUSES_FOR_REVENUE),
                    ]
                }
            }
        },
        {
            "$group": {
                "_id": None,
                "total_revenue": {"$sum": {"$ifNull": ["$total", 0]}},
            }
        },
    ]

    revenue_result = list(db.orders.aggregate(revenue_pipeline))
    total_revenue = (
        _to_float(revenue_result[0].get("total_revenue")) if revenue_result else 0.0
    )

    return jsonify(
        {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "total_users": total_users,
            "active_products": active_products,
        }
    )


@dashboard_bp.route("/recent-orders", methods=["GET"])
@token_required
@admin_required
def get_recent_orders(current_user):  # pylint: disable=unused-argument
    """Return the five most recent orders with customer details."""

    db = _get_db()

    cursor = (
        db.orders.find(
            {}, {"orderId": 1, "userId": 1, "total": 1, "status": 1, "createdAt": 1}
        )
        .sort("createdAt", -1)
        .limit(5)
    )
    orders = list(cursor)

    user_object_ids: list[ObjectId] = []
    for order in orders:
        user_id = order.get("userId")
        if not user_id:
            continue
        try:
            user_object_ids.append(ObjectId(user_id))
        except (InvalidId, TypeError):
            continue

    users_lookup: dict[str, dict] = {}
    if user_object_ids:
        users_cursor = db.users.find(
            {"_id": {"$in": user_object_ids}}, {"name": 1, "email": 1}
        )
        users_lookup = {
            str(user_doc["_id"]): user_doc
            for user_doc in users_cursor
        }

    recent_orders = []
    for order in orders:
        user_id = order.get("userId")
        user_doc = users_lookup.get(user_id) if users_lookup else None
        customer_name = (
            user_doc.get("name")
            if isinstance(user_doc, dict)
            else None
        )
        if not customer_name and isinstance(user_doc, dict):
            customer_name = user_doc.get("email")
        if not customer_name:
            customer_name = order.get("customerName") or "Unknown customer"

        recent_orders.append(
            {
                "id": str(order.get("_id")),
                "order_id": order.get("orderId"),
                "customer_name": customer_name,
                "total": _to_float(order.get("total")),
                "status": order.get("status", "pending"),
                "created_at": _isoformat(order.get("createdAt")),
            }
        )

    return jsonify(recent_orders)


@dashboard_bp.route("/recent-users", methods=["GET"])
@token_required
@admin_required
def get_recent_users(current_user):  # pylint: disable=unused-argument
    """Return the five most recently created users."""

    db = _get_db()

    cursor = (
        db.users.find({}, {"name": 1, "email": 1, "createdAt": 1})
        .sort("createdAt", -1)
        .limit(5)
    )

    users = [
        {
            "id": str(user_doc.get("_id")),
            "name": user_doc.get("name") or user_doc.get("email") or "Unknown",
            "email": user_doc.get("email"),
            "created_at": _isoformat(
                user_doc.get("createdAt") or user_doc.get("updatedAt")
            ),
        }
        for user_doc in cursor
    ]

    return jsonify(users)


@dashboard_bp.route("/revenue", methods=["GET"])
@token_required
@admin_required
def get_revenue_series(current_user):  # pylint: disable=unused-argument
    """Return revenue grouped by day for the requested range."""

    db = _get_db()

    range_param = request.args.get("range", "7d")
    days = 7
    if isinstance(range_param, str) and range_param.endswith("d"):
        try:
            parsed = int(range_param[:-1])
            days = max(parsed, 1)
        except ValueError:
            days = 7

    start_date = datetime.utcnow() - timedelta(days=days - 1)

    pipeline = [
        {
            "$match": {
                "$and": [
                    {
                        "$expr": {
                            "$in": [
                                {"$toLower": {"$ifNull": ["$status", ""]}},
                                list(STATUSES_FOR_REVENUE),
                            ]
                        }
                    },
                    {"createdAt": {"$gte": start_date}},
                ]
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}
                },
                "revenue": {"$sum": {"$ifNull": ["$total", 0]}},
                "orders": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    buckets = list(db.orders.aggregate(pipeline))

    series = [
        {
            "date": bucket.get("_id"),
            "revenue": _to_float(bucket.get("revenue")),
            "orders": int(bucket.get("orders", 0)),
        }
        for bucket in buckets
    ]

    return jsonify(series)
