"""Authentication utilities for the Medicare backend."""
from functools import wraps
from typing import Callable, Any

import jwt
from bson import ObjectId
from flask import current_app, jsonify, request

from config import Config


def _extract_bearer_token() -> str | None:
    """Extract the bearer token from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def token_required(fn: Callable) -> Callable:
    """Decorator to ensure the request is authenticated with a valid JWT."""

    @wraps(fn)
    def decorated(*args: Any, **kwargs: Any):
        # Let CORS preflight through without auth
        if request.method == "OPTIONS":
            return ("", 204)

        token = _extract_bearer_token()
        if not token:
            return jsonify({"error": "Token is missing"}), 401

        try:
            payload = jwt.decode(
                token,
                Config.JWT_SECRET_KEY,
                algorithms=[Config.JWT_ALGORITHM],
            )
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        mongo_db = getattr(current_app, "mongo_db", None)
        if mongo_db is None:
            return jsonify({"error": "Database connection not configured"}), 500

        current_user = mongo_db.users.find_one({"_id": ObjectId(payload["user_id"])})
        if not current_user:
            return jsonify({"error": "User not found"}), 401

        if current_user.get("is_banned"):
            return jsonify({"error": "Account is banned"}), 403

        return fn(current_user, *args, **kwargs)

    return decorated


def admin_required(fn: Callable) -> Callable:
    """Ensure the authenticated user has admin privileges and is not banned."""

    @wraps(fn)
    def decorated(current_user: dict, *args: Any, **kwargs: Any):
        # Let CORS preflight through without auth/role checks
        if request.method == "OPTIONS":
            return ("", 204)
        if current_user.get("role") != "admin":
            return jsonify({"error": "Admin privileges required"}), 403
        if current_user.get("is_banned"):
            return jsonify({"error": "Admin account is banned"}), 403
        return fn(current_user, *args, **kwargs)

    return decorated
