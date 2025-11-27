from flask import Blueprint, request, jsonify, g
from ..middlewares.auth import admin_required
from ..services import order_service

bp = Blueprint("admin_orders", __name__, url_prefix="/api/admin/orders")


@bp.get("")
@admin_required
def list_orders():
    args = request.args
    page = int(args.get("page", 1))
    limit = int(args.get("limit", 20))
    user_id = args.get("userId")
    status = args.get("status")
    search = args.get("search")
    sort_by = args.get("sortBy", "createdAt")
    sort_order = args.get("sortOrder", "desc")
    items, meta = order_service.list_orders(page, limit, user_id, status, search, sort_by, sort_order)
    return jsonify({"data": items, "meta": meta})


@bp.get("/<order_id>")
@admin_required
def get_order(order_id):
    order = order_service.get_order(order_id)
    if not order:
        return jsonify({"error": {"message": "Not found", "code": "NOT_FOUND"}}), 404
    return jsonify({"data": order})


@bp.patch("/<order_id>/status")
@admin_required
def update_status(order_id):
    payload = request.get_json() or {}
    status = payload.get("status")
    ok, error = order_service.update_status(order_id, status, getattr(g, "current_user", {}).get("sub"))
    if not ok:
        return jsonify({"error": {"message": error, "code": "VALIDATION_ERROR"}}), 400
    return jsonify({"data": True})


@bp.patch("/<order_id>")
@admin_required
def update_order(order_id):
    payload = request.get_json() or {}
    ok, error = order_service.update_order(order_id, payload, getattr(g, "current_user", {}).get("sub"))
    if not ok:
        return jsonify({"error": {"message": error, "code": "VALIDATION_ERROR"}}), 400
    return jsonify({"data": True})


@bp.delete("/<order_id>")
@admin_required
def delete_order(order_id):
    ok, error = order_service.delete_order(order_id)
    if not ok:
        return jsonify({"error": {"message": error, "code": "VALIDATION_ERROR"}}), 400
    return jsonify({"data": True})
