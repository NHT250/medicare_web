import os
import uuid
from datetime import datetime
from flask import current_app
from werkzeug.utils import secure_filename
from PIL import Image
from ..config import Config


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS


def save_image(file_storage):
    if not file_storage or file_storage.filename == "":
        return None, "No file provided"
    if not allowed_file(file_storage.filename):
        return None, "Invalid file type"
    file_storage.stream.seek(0, os.SEEK_END)
    size = file_storage.stream.tell()
    file_storage.stream.seek(0)
    if size > Config.MAX_CONTENT_LENGTH:
        return None, "File too large"
    try:
        Image.open(file_storage.stream).verify()
    except Exception:
        return None, "Invalid image file"
    file_storage.stream.seek(0)
    filename = secure_filename(file_storage.filename)
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    upload_folder = Config.UPLOAD_FOLDER
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, unique_name)
    file_storage.save(file_path)
    public_url = f"/static/uploads/{unique_name}"
    doc = {
        "fileName": unique_name,
        "filePath": file_path,
        "publicUrl": public_url,
        "size": size,
        "mimeType": file_storage.mimetype,
        "createdAt": datetime.utcnow(),
    }
    current_app.mongo_db.uploads.insert_one(doc)
    return doc, None


__all__ = ["save_image"]
