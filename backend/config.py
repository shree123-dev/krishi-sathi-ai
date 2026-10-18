import os
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base application configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-krishi-sathi-ai")
    FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "t")
    SESSION_LIFETIME_DAYS = int(os.getenv("SESSION_LIFETIME_DAYS", "14"))

    # Machine Learning Model Configuration
    DEFAULT_MODEL_FILE = os.path.join(BASE_DIR, "ml_models", "tomato_disease_model.keras")
    ML_MODEL_ENABLED = os.getenv(
        "ML_MODEL_ENABLED",
        "True" if os.path.isfile(DEFAULT_MODEL_FILE) else "False"
    ).lower() in ("true", "1", "t")
    ML_MODEL_PATH = os.getenv("ML_MODEL_PATH", DEFAULT_MODEL_FILE)

    # Configurable Escalation Threshold (Module 3 requirement)
    CONFIDENCE_ESCALATION_THRESHOLD = float(os.getenv("CONFIDENCE_ESCALATION_THRESHOLD", "0.75"))

    # Database Configuration (PostgreSQL supported, SQLite fallback for zero-setup local persistence)
    DEFAULT_SQLITE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'krishi_sathi.db')}"
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL or DATABASE_URL.strip() == "":
        DATABASE_URL = DEFAULT_SQLITE_URI
    elif DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # Admin verification key for Agriculture Officer credentials (Module 2)
    ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "admin-krishi-sathi-secret-key")

    # Uploads directory & security limits (Module 9)
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload size
