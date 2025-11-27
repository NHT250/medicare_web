from flask import Blueprint, request, jsonify
from ..middlewares.auth import admin_required
from ..services import product_service

bp = Blueprint("admin_products", __name__, url_prefix="/api/admin/products")


@bp.get("")
@admin_required
def list_products():
    args = request.args
    page = int(args.get("page", 1))
    limit = int(args.get("limit", 20))
    search = args.get("search")
    category_id = args.get("categoryId")
    is_active = args.get("isActive")
    if is_active is not None:
        is_active = is_active.lower() == "true"
    items, meta = product_service.list_products(page, limit, search, category_id, is_active)
    return jsonify({"data": items, "meta": meta})


@bp.get("/<product_id>")
@admin_required
def get_product(product_id):
    product = product_service.get_product(product_id)
    if not product:
        return jsonify({"error": {"message": "Not found", "code": "NOT_FOUND"}}), 404
    return jsonify({"data": product})


@bp.post("")
@admin_required
def create_product():
    payload = request.get_json() or {}
    product, error = product_service.create_product(payload)
    if error:
        return jsonify({"error": {"message": error, "code": "VALIDATION_ERROR"}}), 400
    return jsonify({"data": product}), 201


@bp.patch("/<product_id>")
@admin_required
def update_product(product_id):
    payload = request.get_json() or {}
    product, error = product_service.update_product(product_id, payload)
    if error:
        return jsonify({"error": {"message": error, "code": "VALIDATION_ERROR"}}), 400
    return jsonify({"data": product})


@bp.delete("/<product_id>")
@admin_required
def delete_product(product_id):
    ok, error = product_service.delete_product(product_id)
    if not ok:
        return jsonify({"error": {"message": error, "code": "VALIDATION_ERROR"}}), 400
    return jsonify({"data": True})
