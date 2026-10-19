import os
import sys
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

# Ensure backend directory is always on sys.path
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config import Config
from models.database import init_db
from routes.health import health_bp
from routes.advisory import advisory_bp
from routes.officer import officer_bp
from routes.auth import auth_bp
from routes.locations import locations_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for local React/Vite development
    CORS(app, resources={r"/api/*": {"origins": "*"}, r"/uploads/*": {"origins": "*"}})

    # Ensure database tables and initial baseline seeds are initialized
    init_db()

    # Register API Blueprints
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(advisory_bp, url_prefix="/api/advisory")
    app.register_blueprint(officer_bp, url_prefix="/api/officer")
    app.register_blueprint(locations_bp, url_prefix="/api/locations")

    # Secure Static File Serving for Uploaded Crop Images (Module 9)
    @app.route("/uploads/<filename>")
    def uploaded_file(filename):
        return send_from_directory(Config.UPLOAD_FOLDER, filename)

    @app.route("/")
    def index():
        return jsonify({
            "project": "Krishi Sathi AI: AI-Powered Crop Health Detection and Context-Aware Farmer Advisory System",
            "backend": "Flask API (Database-Backed)",
            "version": "2.0.0",
            "modules": [
                "Module 1: Farmer Registration & Authentication",
                "Module 2: Agriculture Officer Credential Verification",
                "Module 3: AI Confidence & Escalation Engine",
                "Module 4: Two-Way Farmer-Officer Messaging",
                "Module 5: Extension Officer Triage Dashboard",
                "Module 6: Complete Query & Advisory History",
                "Module 7: Farmer Satisfaction & Ratings",
                "Module 8: Environmental Cluster Data",
                "Module 9: Role-Based Data Protection",
                "Module 10: PostgreSQL & SQLite Persistence"
            ]
        })

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("FLASK_PORT", 5000))
    host = os.environ.get("FLASK_HOST", "0.0.0.0")
    print(f"[Krishi Sathi AI] Crop Health Advisory Backend running on http://127.0.0.1:{port}")
    app.run(host=host, port=port, debug=Config.DEBUG)
