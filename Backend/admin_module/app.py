from flask import Flask, jsonify
from .config import Config
from .extensions import init_extensions
from .routes.auth import bp as auth_bp
from .routes.admin_dashboard import admin_dashboard_bp
from .routes.admin_products import bp as products_bp
from .routes.admin_users import bp as users_bp
from .routes.admin_orders import bp as orders_bp
from .routes.uploads import bp as uploads_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    init_extensions(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_dashboard_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(orders_bp)
    app.register_blueprint(uploads_bp)

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": {"message": "Not found", "code": "NOT_FOUND"}}), 404

    @app.errorhandler(500)
    def server_error(error):
        return jsonify({"error": {"message": str(error), "code": "SERVER_ERROR"}}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
