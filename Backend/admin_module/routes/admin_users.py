from flask import Blueprint, request, jsonify, g
from ..middlewares.auth import admin_required
from ..services import user_service

bp = Blueprint("admin_users", __name__, url_prefix="/api/admin/users")


@bp.get("")
@admin_required
def list_users():
    args = request.args
    page = int(args.get("page", 1))
    limit = int(args.get("limit", 20))
    search = args.get("search")
    role = args.get("role")
    is_banned = args.get("isBanned")
    if is_banned is not None:
        is_banned = is_banned.lower() == "true"
    users, meta = user_service.list_users(page, limit, search, role, is_banned)
    return jsonify({"data": users, "meta": meta})


@bp.get("/<user_id>")
@admin_required
def get_user(user_id):
    user = user_service.get_user(user_id)
    if not user:
        return jsonify({"error": {"message": "Not found", "code": "NOT_FOUND"}}), 404
    return jsonify({"data": user})


@bp.patch("/<user_id>")
@admin_required
def update_user(user_id):
    payload = request.get_json() or {}
    user, error = user_service.update_user(user_id, payload)
    if error:
        return jsonify({"error": {"message": error, "code": "VALIDATION_ERROR"}}), 400
    return jsonify({"data": user})


@bp.patch("/<user_id>/ban")
@admin_required
def ban_user(user_id):
    payload = request.get_json() or {}
    is_banned = bool(payload.get("isBanned"))
    current_user_id = getattr(g, "current_user", {}).get("sub")
    if current_user_id == user_id:
        return jsonify({"error": {"message": "Cannot ban yourself", "code": "FORBIDDEN"}}), 403
    ok, error = user_service.set_ban(user_id, is_banned)
    if not ok:
        return jsonify({"error": {"message": error, "code": "VALIDATION_ERROR"}}), 400
    return jsonify({"data": True})


@bp.patch("/<user_id>/role")
@admin_required
def update_role(user_id):
    payload = request.get_json() or {}
    new_role = payload.get("role")
    current_user_id = getattr(g, "current_user", {}).get("sub")
    if current_user_id == user_id:
        return jsonify({"error": {"message": "Cannot change own role", "code": "FORBIDDEN"}}), 403
    ok, error = user_service.update_role(user_id, new_role)
    if not ok:
        return jsonify({"error": {"message": error, "code": "VALIDATION_ERROR"}}), 400
    return jsonify({"data": True})
