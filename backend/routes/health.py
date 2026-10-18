from flask import Blueprint, jsonify
from config import Config

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "AI-Powered Crop Health Detection & Advisory API",
        "ml_model_status": "CONNECTED (Tomato Disease Detection Model Active)" if Config.ML_MODEL_ENABLED else "DISCONNECTED (Awaiting trained model)",
        "database_status": "Ready for PostgreSQL connection",
        "version": "1.0.0"
    }), 200
