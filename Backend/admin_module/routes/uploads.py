from flask import Blueprint, request, jsonify
from ..middlewares.auth import admin_required
from ..services.upload_service import save_image

bp = Blueprint("admin_uploads", __name__, url_prefix="/api/admin/uploads")


@bp.post("")
@admin_required
def upload_image():
    file = request.files.get("image")
    doc, error = save_image(file)
    if error:
        return jsonify({"error": {"message": error, "code": "VALIDATION_ERROR"}}), 400
    return jsonify({"data": doc}), 201
