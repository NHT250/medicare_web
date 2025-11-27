from datetime import datetime
from bson import ObjectId
from flask import current_app
from ..utils.security import verify_password, generate_jwt


def login(email: str, password: str):
    users = current_app.mongo_db.users
    user = users.find_one({"email": email})
    if not user:
        return None, "Invalid credentials"
    if user.get("isBanned"):
        return None, "User is banned"
    if not verify_password(password, user.get("passwordHash", b"")):
        return None, "Invalid credentials"
    token = generate_jwt(str(user.get("_id")), user.get("role", "CUSTOMER"), user.get("isBanned", False))
    return {
        "token": token,
        "user": {
            "id": str(user.get("_id")),
            "name": user.get("name"),
            "email": user.get("email"),
            "role": user.get("role"),
        },
    }, None


__all__ = ["login"]
