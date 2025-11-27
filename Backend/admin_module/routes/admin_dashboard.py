from datetime import datetime
from flask import Blueprint, jsonify, request
from ..middlewares.auth import admin_required, token_required
from ..services import dashboard_service

admin_dashboard_bp = Blueprint("admin_dashboard", __name__, url_prefix="/api/admin/dashboard")


def parse_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except Exception:
        return None


@admin_dashboard_bp.get("/summary")
@token_required
@admin_required
def summary():
    from_date = parse_date(request.args.get("from"))
    to_date = parse_date(request.args.get("to"))
    data = dashboard_service.get_summary(from_date, to_date)
    return jsonify({"data": data})


@admin_dashboard_bp.get("/recent-orders")
@token_required
@admin_required
def recent_orders():
    limit = int(request.args.get("limit", 5))
    data = dashboard_service.get_recent_orders(limit)
    return jsonify({"data": data})


@admin_dashboard_bp.get("/recent-users")
@token_required
@admin_required
def recent_users():
    limit = int(request.args.get("limit", 5))
    role = request.args.get("role")
    data = dashboard_service.get_recent_users(limit, role.upper() if role else None)
    return jsonify({"data": data})


@admin_dashboard_bp.get("/revenue")
@token_required
@admin_required
def revenue():
    range_param = request.args.get("range")
    group_by = request.args.get("group_by", "day")
    from_date = parse_date(request.args.get("from"))
    to_date = parse_date(request.args.get("to"))
    range_days = int(range_param[:-1]) if range_param and range_param.endswith("d") else 7
    data = dashboard_service.get_revenue(range_days, from_date, to_date, group_by)
    return jsonify({"data": data})


@admin_dashboard_bp.route("/category-stats", methods=["GET", "OPTIONS"])
@token_required
@admin_required
def category_stats():
    range_str = request.args.get("range", "30d")
    data = dashboard_service.get_category_stats(range_str)
    return jsonify({"data": data}), 200


@admin_dashboard_bp.route("/payment-methods", methods=["GET", "OPTIONS"])
@token_required
@admin_required
def payment_methods():
    range_str = request.args.get("range", "30d")
    data = dashboard_service.get_payment_method_stats(range_str)
    return jsonify({"data": data}), 200


@admin_dashboard_bp.route("/order-status-summary", methods=["GET", "OPTIONS"])
@token_required
@admin_required
def order_status_summary():
    range_str = request.args.get("range", "30d")
    data = dashboard_service.get_order_status_summary(range_str)
    return jsonify({"data": data}), 200
