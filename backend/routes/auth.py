from functools import wraps
from flask import Blueprint, request, jsonify
from services.auth_service import (
    register_user, authenticate_user, get_user_by_token, logout_user,
    verify_officer_account, process_forgot_password
)
from config import Config
from models.database import SessionLocal
from models.schema import User, OfficerProfile

auth_bp = Blueprint("auth", __name__)

def extract_token_from_request():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return request.args.get("token") or request.headers.get("X-Session-Token")

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = extract_token_from_request()
        if not token:
            return jsonify({"error": "Authentication token missing or invalid."}), 401
        user = get_user_by_token(token)
        if not user:
            return jsonify({"error": "Session expired or invalid. Please log in again."}), 401
        request.current_user = user
        return f(*args, **kwargs)
    return decorated_function

def officer_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = extract_token_from_request()
        if not token:
            return jsonify({"error": "Authentication required."}), 401
        user = get_user_by_token(token)
        if not user or user.get("role") not in ("officer", "admin"):
            return jsonify({"error": "Access restricted to Agriculture Extension Officers."}), 403
        
        # Module 2 restriction: check verification status!
        if user.get("role") == "officer":
            status = user.get("verification_status")
            if status != "VERIFIED":
                return jsonify({
                    "error": "Account pending administrative verification.",
                    "verification_status": status,
                    "notice": "Per safety protocols, agricultural officers cannot review live farmer cases until institutional credentials have been verified by an administrator."
                }), 403
        
        request.current_user = user
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        admin_key = request.headers.get("X-Admin-Key")
        if admin_key and admin_key == Config.ADMIN_API_KEY:
            request.current_user = {"id": "system_admin", "full_name": "System Administrator", "role": "admin"}
            return f(*args, **kwargs)

        token = extract_token_from_request()
        if token:
            user = get_user_by_token(token)
            if user and user.get("role") == "admin":
                request.current_user = user
                return f(*args, **kwargs)

        return jsonify({"error": "Administrator privilege required."}), 403
    return decorated_function

@auth_bp.route("/register", methods=["POST"])
def register():
    """Register farmer or agriculture officer with full profile persistence."""
    try:
        data = request.get_json(silent=True) or {}
        result = register_user(data)
        return jsonify({
            "success": True,
            "message": "Account created successfully.",
            "data": result
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    """Login with mobile/email and password."""
    try:
        data = request.get_json(silent=True) or {}
        identifier = data.get("identifier") or data.get("mobile") or data.get("email")
        password = data.get("password")
        result = authenticate_user(identifier, password)
        return jsonify({
            "success": True,
            "message": f"Welcome back, {result['user']['full_name']}!",
            "data": result
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        return jsonify({"error": f"Login failed: {str(e)}"}), 500

@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Terminate active session token."""
    token = extract_token_from_request()
    if token:
        logout_user(token)
    return jsonify({"success": True, "message": "Signed out successfully."}), 200

@auth_bp.route("/me", methods=["GET"])
def get_current_user_profile():
    """Returns validated profile from session token."""
    token = extract_token_from_request()
    user = get_user_by_token(token)
    if not user:
        return jsonify({"authenticated": False, "user": None}), 200
    return jsonify({"authenticated": True, "user": user}), 200

@auth_bp.route("/profile/update", methods=["POST"])
@login_required
def update_profile():
    """Updates farmer profile and location with backend validation."""
    from services.auth_service import update_farmer_profile
    try:
        data = request.get_json(silent=True) or {}
        user_id = request.current_user.get("id")
        updated_user = update_farmer_profile(user_id, data)
        return jsonify({
            "success": True,
            "message": "Farm profile and location updated successfully.",
            "user": updated_user
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to update profile: {str(e)}"}), 500

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Password recovery query."""
    try:
        data = request.get_json(silent=True) or {}
        identifier = data.get("identifier") or data.get("mobile") or data.get("email")
        result = process_forgot_password(identifier)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Admin Officer Verification Endpoints (Module 2)
@auth_bp.route("/admin/pending-officers", methods=["GET"])
@admin_required
def get_pending_officers():
    """Lists officers awaiting institutional verification."""
    db = SessionLocal()
    try:
        officers = db.query(OfficerProfile).all()
        return jsonify({
            "total": len(officers),
            "officers": [
                {
                    "user_id": o.user_id,
                    "full_name": o.user.full_name if o.user else "Officer",
                    "designation": o.official_designation,
                    "institution": o.institution,
                    "department": o.department,
                    "jurisdiction": o.district_jurisdiction,
                    "employee_id": o.employee_id_reference,
                    "verification_status": o.verification_status,
                    "verified_by": o.verified_by,
                    "verified_at": o.verified_at.isoformat() if o.verified_at else None
                }
                for o in officers
            ]
        }), 200
    finally:
        db.close()

@auth_bp.route("/admin/verify-officer", methods=["POST"])
@admin_required
def verify_officer():
    """Approves or rejects officer credentials."""
    try:
        data = request.get_json(silent=True) or {}
        user_id = data.get("officer_user_id")
        status = data.get("status") # 'VERIFIED', 'REJECTED'
        reason = data.get("rejection_reason")
        admin_name = getattr(request, "current_user", {}).get("full_name", "System Administrator")

        updated = verify_officer_account(user_id, status, admin_name, reason)
        return jsonify({
            "success": True,
            "message": f"Officer verification status set to {status}.",
            "profile": updated
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
