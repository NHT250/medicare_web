from flask import Blueprint, request, jsonify
from ..services.auth_service import login

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/login")
def login_route():
    data = request.get_json() or {}
    result, error = login(data.get("email"), data.get("password"))
    if error:
        return jsonify({"error": {"message": error, "code": "INVALID_CREDENTIALS"}}), 401
    return jsonify({"data": result})
