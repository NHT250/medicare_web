import os
from dotenv import load_dotenv

load_dotenv()


def get_env(key: str, default=None):
    value = os.getenv(key)
    return value if value is not None else default


class Config:
    MONGO_URI = get_env("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME = get_env("MONGO_DB_NAME", "medicare")
    JWT_SECRET_KEY = get_env("JWT_SECRET_KEY", "supersecret")
    FRONTEND_ORIGIN = get_env("FRONTEND_ORIGIN", "http://localhost:5173")

    # Allow multiple local dev origins to avoid CORS errors when the
    # admin app is served from different ports or protocols.
    CORS_ORIGINS = [
        FRONTEND_ORIGIN,
        "http://localhost:5173",
        "https://localhost:5173",
        "http://localhost:3000",
        "https://localhost:3000",
        "http://localhost:8080",
        "https://localhost:8080",
    ]

    UPLOAD_FOLDER = get_env("UPLOAD_FOLDER", os.path.join(os.path.dirname(__file__), "static", "uploads"))
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    JWT_ALGORITHM = "HS256"


__all__ = ["Config"]
