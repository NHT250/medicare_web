from flask_cors import CORS
from flask import Flask
from pymongo import MongoClient
from .config import Config

mongo_client: MongoClient | None = None

def init_extensions(app: Flask):
    global mongo_client
    CORS(app, resources={r"/api/*": {"origins": Config.FRONTEND_ORIGIN}})
    mongo_client = MongoClient(Config.MONGO_URI)
    app.mongo_db = mongo_client[Config.MONGO_DB_NAME]


__all__ = ["init_extensions", "mongo_client"]
