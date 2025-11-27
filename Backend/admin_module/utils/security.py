import bcrypt
import jwt
from datetime import datetime, timedelta
from ..config import Config


def hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())


def verify_password(password: str, hashed: bytes | str) -> bool:
    hashed_bytes = hashed if isinstance(hashed, bytes) else hashed.encode("utf-8")
    return bcrypt.checkpw(password.encode("utf-8"), hashed_bytes)


def generate_jwt(user_id: str, role: str, is_banned: bool):
    payload = {
        "sub": user_id,
        "role": role,
        "isBanned": is_banned,
        "exp": datetime.utcnow() + timedelta(hours=8),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM)


def decode_jwt(token: str):
    try:
        return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM])
    except Exception:
        return None


__all__ = ["hash_password", "verify_password", "generate_jwt", "decode_jwt"]
