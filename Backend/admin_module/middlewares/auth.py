from functools import wraps
from flask import request, jsonify, g, current_app
from ..utils.security import decode_jwt


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": {"message": "Authorization header missing", "code": "UNAUTHORIZED"}}), 401
        token = auth_header.split(" ", 1)[1]
        payload = decode_jwt(token)
        if not payload:
            return jsonify({"error": {"message": "Invalid token", "code": "UNAUTHORIZED"}}), 401
        g.current_user = payload
        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        user = getattr(g, "current_user", {})
        if user.get("role") != "ADMIN" or user.get("isBanned"):
            return jsonify({"error": {"message": "Admin access required", "code": "FORBIDDEN"}}), 403
        return f(*args, **kwargs)

    return decorated


__all__ = ["token_required", "admin_required"]
