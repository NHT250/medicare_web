"""Admin upload endpoints for product assets."""
from __future__ import annotations

import os
import uuid

from flask import Blueprint, current_app, jsonify, request
from PIL import Image, UnidentifiedImageError
from werkzeug.utils import secure_filename

from utils.auth import admin_required, token_required

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
ALLOWED_IMAGE_FORMATS = {"jpeg", "png", "gif", "webp"}
MAX_SIZE_MB = 5

admin_uploads_bp = Blueprint(
    "admin_uploads", __name__, url_prefix="/api/admin/uploads"
)


def _validate_extension(filename: str) -> bool:
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[-1].lower()
    return ext in ALLOWED_EXTENSIONS


def _is_allowed_size(file_storage) -> bool:
    file_storage.seek(0, os.SEEK_END)
    size_mb = file_storage.tell() / (1024 * 1024)
    file_storage.seek(0)
    return size_mb <= MAX_SIZE_MB


def _validate_image_contents(path: str) -> bool:
    try:
        with Image.open(path) as image:
            detected_format = (image.format or "").lower()
    except UnidentifiedImageError:
        return False

    if detected_format == "jpg":
        detected_format = "jpeg"

    return detected_format in ALLOWED_IMAGE_FORMATS


@admin_uploads_bp.post("")
@token_required
@admin_required
def upload_image(current_user):  # pylint: disable=unused-argument
    """Handle image upload for admin users and return a public URL."""
    if "image" not in request.files:
        return jsonify({"message": "No file uploaded"}), 400

    file = request.files["image"]

    if not _validate_extension(file.filename):
        return jsonify({"message": "Unsupported format"}), 400

    if not _is_allowed_size(file):
        return jsonify({"message": "File too large"}), 400

    ext = file.filename.rsplit(".", 1)[-1].lower()
    filename = secure_filename(f"{uuid.uuid4().hex}.{ext}")
    upload_dir = os.path.join(current_app.root_path, "static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)
    file.save(file_path)

    if not _validate_image_contents(file_path):
        os.remove(file_path)
        return jsonify({"message": "Invalid image content"}), 400

    public_url = f"/static/uploads/{filename}"
    return jsonify({"url": public_url}), 201
