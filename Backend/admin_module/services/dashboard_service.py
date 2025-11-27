from datetime import datetime, timedelta
from flask import current_app
from bson import ObjectId


def _parse_range_to_dates(range_str: str) -> tuple[datetime, datetime]:
    # Accept "7d", "30d", etc. Default 7d if invalid.
    try:
        if range_str.endswith("d"):
            days = int(range_str[:-1])
        else:
            days = int(range_str)
    except Exception:
        days = 7
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    return start_date, end_date


def _date_filter(from_date, to_date):
    query = {}
    if from_date or to_date:
        query["createdAt"] = {}
        if from_date:
            query["createdAt"]["$gte"] = from_date
        if to_date:
            query["createdAt"]["$lte"] = to_date
    return query


def get_summary(from_date=None, to_date=None):
    db = current_app.mongo_db
    order_match = {"status": {"$in": ["CONFIRMED", "DELIVERED"]}}
    order_match.update(_date_filter(from_date, to_date))
    pipeline = [
        {"$match": order_match},
        {"$group": {"_id": None, "totalRevenue": {"$sum": "$totalAmount"}}},
    ]
    revenue_doc = next(db.orders.aggregate(pipeline), None)
    total_revenue = revenue_doc.get("totalRevenue", 0) if revenue_doc else 0
    return {
        "totalRevenue": total_revenue,
        "totalOrders": db.orders.count_documents({}),
        "totalUsers": db.users.count_documents({}),
        "activeProducts": db.products.count_documents({"isActive": True}),
    }


def get_recent_orders(limit=5):
    db = current_app.mongo_db
    cursor = (
        db.orders.find({}, {"orderCode": 1, "userId": 1, "totalAmount": 1, "status": 1, "paymentMethod": 1, "createdAt": 1})
        .sort("createdAt", -1)
        .limit(limit)
    )
    users_map = {str(u["_id"]): u for u in db.users.find({"_id": {"$in": [doc.get("userId") for doc in cursor]}})}
    results = []
    cursor.rewind()
    for doc in cursor:
        user = users_map.get(str(doc.get("userId")), {})
        results.append({
            "id": str(doc.get("_id")),
            "orderCode": doc.get("orderCode"),
            "customerName": user.get("name"),
            "customerEmail": user.get("email"),
            "totalAmount": doc.get("totalAmount", 0),
            "status": doc.get("status"),
            "paymentMethod": doc.get("paymentMethod"),
            "createdAt": doc.get("createdAt"),
        })
    return results


def get_recent_users(limit=5, role=None):
    db = current_app.mongo_db
    query = {}
    if role:
        query["role"] = role.upper()
    cursor = db.users.find(query, {"name": 1, "email": 1, "createdAt": 1}).sort("createdAt", -1).limit(limit)
    users = []
    for u in cursor:
        users.append({
            "id": str(u.get("_id")),
            "name": u.get("name"),
            "email": u.get("email"),
            "createdAt": u.get("createdAt"),
        })
    return users


def get_revenue(range_days=7, from_date=None, to_date=None, group_by="day"):
    db = current_app.mongo_db
    if not from_date and not to_date:
        to_date = datetime.utcnow()
        from_date = to_date - timedelta(days=range_days)
    match = {"status": {"$in": ["CONFIRMED", "DELIVERED"]}}
    match.update(_date_filter(from_date, to_date))
    date_format = "%Y-%m-%d" if group_by == "day" else "%Y-%m"
    pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": {"$dateToString": {"format": date_format, "date": "$createdAt"}},
                "revenue": {"$sum": "$totalAmount"},
                "orders": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    results = []
    for row in db.orders.aggregate(pipeline):
        orders = row.get("orders", 0) or 1
        results.append({
            "date": row.get("_id"),
            "revenue": row.get("revenue", 0),
            "orders": orders,
            "avgOrderValue": (row.get("revenue", 0) / orders) if orders else 0,
        })
    return results


def get_category_stats(range_str: str):
    db = current_app.mongo_db
    start_date, end_date = _parse_range_to_dates(range_str)
    pipeline = [
        {
            "$match": {
                "createdAt": {"$gte": start_date, "$lte": end_date},
                "status": {"$in": ["CONFIRMED", "DELIVERED"]},
            }
        },
        {
            "$lookup": {
                "from": "order_items",
                "localField": "_id",
                "foreignField": "orderId",
                "as": "items",
            }
        },
        {"$unwind": "$items"},
        {
            "$lookup": {
                "from": "products",
                "localField": "items.productId",
                "foreignField": "_id",
                "as": "product",
            }
        },
        {"$unwind": "$product"},
        {
            "$lookup": {
                "from": "categories",
                "localField": "product.categoryId",
                "foreignField": "_id",
                "as": "category",
            }
        },
        {"$unwind": "$category"},
        {
            "$group": {
                "_id": "$category._id",
                "categoryName": {"$first": "$category.name"},
                "totalRevenue": {"$sum": {"$ifNull": ["$items.totalPrice", 0]}},
                "totalQuantity": {"$sum": {"$ifNull": ["$items.quantity", 0]}},
            }
        },
        {"$sort": {"categoryName": 1}},
    ]

    results = []
    for row in db.orders.aggregate(pipeline):
        results.append(
            {
                "categoryId": str(row.get("_id")),
                "categoryName": row.get("categoryName"),
                "totalRevenue": row.get("totalRevenue", 0),
                "totalQuantity": row.get("totalQuantity", 0),
            }
        )

    return results


def get_payment_method_stats(range_str: str):
    db = current_app.mongo_db
    start_date, end_date = _parse_range_to_dates(range_str)
    pipeline = [
        {
            "$match": {
                "createdAt": {"$gte": start_date, "$lte": end_date},
                "status": {"$in": ["CONFIRMED", "DELIVERED"]},
            }
        },
        {
            "$group": {
                "_id": {"$ifNull": ["$paymentMethod", "UNKNOWN"]},
                "orders": {"$sum": 1},
                "revenue": {"$sum": {"$ifNull": ["$totalAmount", 0]}},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    return [
        {"method": row.get("_id"), "orders": row.get("orders", 0), "revenue": row.get("revenue", 0)}
        for row in db.orders.aggregate(pipeline)
    ]


def get_order_status_summary(range_str: str):
    db = current_app.mongo_db
    start_date, end_date = _parse_range_to_dates(range_str)
    pipeline = [
        {"$match": {"createdAt": {"$gte": start_date, "$lte": end_date}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]

    summary = {"PENDING": 0, "CONFIRMED": 0, "DELIVERED": 0, "CANCELLED": 0}
    for row in db.orders.aggregate(pipeline):
        status = row.get("_id") or "PENDING"
        if status not in summary:
            summary[status] = 0
        summary[status] = row.get("count", 0)

    return summary


__all__ = [
    "get_summary",
    "get_recent_orders",
    "get_recent_users",
    "get_revenue",
    "get_category_stats",
    "get_payment_method_stats",
    "get_order_status_summary",
]
