import os
import re
import uuid
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import hashlib
import secrets
from config import Config
from models.database import SessionLocal
from models.schema import User, FarmerProfile, OfficerProfile, CaseActivityLog, UserSession

# Rate limiting tracker: ip/identifier -> list of timestamps
_login_attempts = {}

RATE_LIMIT_MAX_ATTEMPTS = 5
RATE_LIMIT_WINDOW_SECONDS = 60

def _hash_token(raw_token: str) -> str:
    """Returns SHA-256 hash of token to avoid storing plaintext tokens."""
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()

def _create_persistent_session(db, user_id: str, role: str) -> str:
    """
    Generates a cryptographically secure opaque token (sess_<hex>),
    hashes it with SHA-256, and stores the session record in the database.
    Returns the raw token to send to the client.
    """
    raw_token = f"sess_{secrets.token_hex(24)}"
    token_hash = _hash_token(raw_token)
    session_id = f"sid_{uuid.uuid4().hex[:16]}"
    lifetime_days = getattr(Config, "SESSION_LIFETIME_DAYS", 14)
    expires_at = datetime.now() + timedelta(days=lifetime_days)

    session_record = UserSession(
        session_id=session_id,
        token_hash=token_hash,
        user_id=user_id,
        role=role,
        is_revoked=False,
        expires_at=expires_at,
        created_at=datetime.now(),
        last_accessed_at=datetime.now()
    )
    db.add(session_record)
    return raw_token


def normalize_mobile(raw_mobile: str) -> str:
    """Normalizes Indian mobile numbers by stripping country codes (+91, 91) and leading zeros."""
    if not raw_mobile:
        return ""
    digits = re.sub(r'\D', '', str(raw_mobile))
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits

def validate_password_strength(password: str) -> tuple:
    """
    Module 2: Strong password policy enforcement.
    Requires:
    - At least 8 characters (12 recommended)
    - Uppercase letter
    - Lowercase letter
    - Numeric digit
    - Special character
    """
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long (12+ recommended)."
    if not re.search(r'[A-Z]', password):
        return False, "Password must include at least one uppercase letter (A-Z)."
    if not re.search(r'[a-z]', password):
        return False, "Password must include at least one lowercase letter (a-z)."
    if not re.search(r'\d', password):
        return False, "Password must include at least one numeric digit (0-9)."
    if not re.search(r'[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\/`~]', password):
        return False, "Password must include at least one special character (!@#$%^&* etc.)."
    return True, ""

def _check_rate_limit(identifier: str):
    now = datetime.now()
    attempts = _login_attempts.get(identifier, [])
    # Filter attempts within window
    recent = [t for t in attempts if (now - t).total_seconds() < RATE_LIMIT_WINDOW_SECONDS]
    _login_attempts[identifier] = recent
    if len(recent) >= RATE_LIMIT_MAX_ATTEMPTS:
        raise ValueError("Too many failed login attempts. Please wait 1 minute before trying again.")

def _record_failed_attempt(identifier: str):
    now = datetime.now()
    attempts = _login_attempts.get(identifier, [])
    attempts.append(now)
    _login_attempts[identifier] = attempts

def register_user(data: dict) -> dict:
    """
    Registers a new Farmer or Agriculture Extension Officer.
    Persists profile to database.
    Officer starts as 'PENDING_VERIFICATION' per Module 2 specifications.
    """
    db = SessionLocal()
    try:
        full_name = (data.get("full_name") or "").strip()
        raw_mobile = data.get("mobile") or ""
        mobile = normalize_mobile(raw_mobile)
        email = (data.get("email") or "").strip().lower() or None
        password = data.get("password") or ""
        confirm_password = data.get("confirm_password") or ""
        role = (data.get("role") or "farmer").lower()

        if not full_name:
            raise ValueError("Full name is required.")
        if not mobile or len(mobile) != 10:
            raise ValueError("A valid 10-digit mobile number is required.")

        # Module 2: Strong Password Policy Validation (Backend Enforcement)
        is_pwd_valid, pwd_err = validate_password_strength(password)
        if not is_pwd_valid:
            raise ValueError(pwd_err)

        if password != confirm_password:
            raise ValueError("Passwords do not match.")
        if role not in ("farmer", "officer", "admin"):
            role = "farmer"

        # Duplicate checks in DB
        existing_mobile = db.query(User).filter_by(mobile=mobile).first()
        if existing_mobile:
            raise ValueError(f"An account with mobile number {mobile} already exists.")

        if email:
            existing_email = db.query(User).filter_by(email=email).first()
            if existing_email:
                raise ValueError(f"An account with email {email} already exists.")

        user_id = f"user_{role}_{uuid.uuid4().hex[:8]}"
        new_user = User(
            id=user_id,
            full_name=full_name,
            mobile=mobile,
            email=email,
            password_hash=generate_password_hash(password),
            role=role,
            is_active=True
        )
        db.add(new_user)
        db.flush()

        # Handle Role-Specific Profiles
        if role == "farmer":
            state = (data.get("state") or "").strip() or "Maharashtra"
            district = (data.get("district") or "").strip() or "Wardha"
            taluka = (data.get("taluka") or "").strip() or "Wardha"
            village = (data.get("village") or "").strip() or "Sewagram"

            # Validate location hierarchy if provided
            from services.location_service import validate_location
            is_loc_valid, loc_err, sanitized_loc = validate_location(state, district, taluka, village)
            if not is_loc_valid:
                # If invalid combination, do not silently save invalid hierarchy
                raise ValueError(f"Invalid location details: {loc_err}")

            state = sanitized_loc["state"]
            district = sanitized_loc["district"]
            taluka = sanitized_loc["taluka"]
            village = sanitized_loc["village"]

            pincode = (data.get("pincode") or "").strip() or None
            preferred_language = data.get("preferred_language") or "English"
            main_crops = data.get("main_crops") or data.get("crop_name") or "Not Specified"
            
            try:
                lat = float(data.get("farm_location_lat")) if data.get("farm_location_lat") else None
                lng = float(data.get("farm_location_lng")) if data.get("farm_location_lng") else None
            except (ValueError, TypeError):
                lat, lng = None, None

            try:
                farm_area = float(data.get("farm_area")) if data.get("farm_area") else None
            except (ValueError, TypeError):
                farm_area = None

            farm_area_unit = data.get("farm_area_unit") or "Acres"
            crop_growth_stage = data.get("crop_growth_stage") or None

            farmer_profile = FarmerProfile(
                user_id=new_user.id,
                village=village,
                taluka=taluka,
                district=district,
                state=state,
                pincode=pincode,
                preferred_language=preferred_language,
                main_crops=main_crops,
                farm_location_lat=lat,
                farm_location_lng=lng,
                farm_area=farm_area,
                farm_area_unit=farm_area_unit,
                crop_growth_stage=crop_growth_stage
            )
            db.add(farmer_profile)

        elif role == "officer":
            designation = (data.get("official_designation") or "").strip() or "Agricultural Extension Officer"
            department = (data.get("department") or "").strip() or "Department of Agriculture"
            institution = (data.get("institution") or "").strip() or "Krishi Vigyan Kendra"
            jurisdiction = (data.get("district_jurisdiction") or data.get("district") or "").strip() or "Regional District"
            state = (data.get("state") or "").strip() or "National"
            employee_id = (data.get("employee_id_reference") or "").strip() or None
            expertise = data.get("expertise_areas") or "Crop Health, Pest Diagnostics, Soil Health"

            # Officer begins as PENDING_VERIFICATION
            officer_profile = OfficerProfile(
                user_id=new_user.id,
                official_designation=designation,
                department=department,
                institution=institution,
                district_jurisdiction=jurisdiction,
                state=state,
                official_email=email,
                employee_id_reference=employee_id,
                expertise_areas=expertise,
                verification_status="PENDING_VERIFICATION",
                verified_by=None,
                verified_at=None
            )
            db.add(officer_profile)

        # Generate persistent database session token
        token = _create_persistent_session(db, new_user.id, new_user.role)
        db.commit()

        return {
            "user": new_user.to_safe_dict(),
            "token": token
        }

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def authenticate_user(identifier: str, password: str) -> dict:
    """Authenticates by mobile or email with rate-limit protection and database session persistence."""
    if not identifier or not password:
        raise ValueError("Please provide your email/mobile and password.")

    ident = identifier.strip().lower()
    norm_ident = normalize_mobile(ident)
    _check_rate_limit(ident)

    db = SessionLocal()
    try:
        query_filter = (User.mobile == ident) | (User.email == ident)
        if norm_ident and len(norm_ident) == 10:
            query_filter = query_filter | (User.mobile == norm_ident)
        user = db.query(User).filter(query_filter).first()

        if not user:
            _record_failed_attempt(ident)
            raise ValueError("Invalid credentials. No account found with that email or mobile.")

        if not check_password_hash(user.password_hash, password):
            _record_failed_attempt(ident)
            raise ValueError("Incorrect password. Please verify and try again.")

        if not user.is_active:
            raise ValueError("This account has been deactivated. Contact administration.")

        # Create persistent database session token
        token = _create_persistent_session(db, user.id, user.role)
        db.commit()

        return {
            "user": user.to_safe_dict(),
            "token": token
        }

    finally:
        db.close()

def get_user_by_token(token: str):
    """
    Validates session token against the persistent database session store.
    Rejects expired or revoked sessions.
    Returns safe user dict or None.
    """
    if not token or not isinstance(token, str):
        return None

    token_str = token.strip()
    token_hash = _hash_token(token_str)
    now = datetime.now()

    db = SessionLocal()
    try:
        session_record = db.query(UserSession).filter_by(
            token_hash=token_hash,
            is_revoked=False
        ).first()

        if not session_record:
            return None

        # Check expiration
        if session_record.expires_at <= now:
            session_record.is_revoked = True
            db.commit()
            return None

        user = db.query(User).filter_by(id=session_record.user_id).first()
        if not user or not user.is_active:
            return None

        # Touch last accessed timestamp
        try:
            session_record.last_accessed_at = now
            db.commit()
        except Exception:
            db.rollback()

        return user.to_safe_dict()
    finally:
        db.close()

def logout_user(token: str) -> bool:
    """Terminates session on logout by marking it revoked in the database."""
    if not token or not isinstance(token, str):
        return False

    token_hash = _hash_token(token.strip())
    db = SessionLocal()
    try:
        session_record = db.query(UserSession).filter_by(
            token_hash=token_hash,
            is_revoked=False
        ).first()

        if session_record:
            session_record.is_revoked = True
            db.commit()
            return True
        return False
    except Exception:
        db.rollback()
        return False
    finally:
        db.close()


def verify_officer_account(officer_user_id: str, status: str, admin_name: str, rejection_reason: str = None) -> dict:
    """Admin-only workflow to verify or reject an agriculture officer's credentials."""
    if status not in ("VERIFIED", "REJECTED", "PENDING_VERIFICATION"):
        raise ValueError("Invalid verification status.")

    db = SessionLocal()
    try:
        officer = db.query(OfficerProfile).filter_by(user_id=officer_user_id).first()
        if not officer:
            raise ValueError("Officer profile not found.")

        officer.verification_status = status
        officer.verified_by = admin_name
        officer.verified_at = datetime.now() if status == "VERIFIED" else None
        officer.rejection_reason = rejection_reason if status == "REJECTED" else None

        db.commit()
        return officer.to_dict()
    finally:
        db.close()

def process_forgot_password(identifier: str) -> dict:
    """Honest recovery flow checking database records."""
    ident = (identifier or "").strip().lower()
    if not ident:
        raise ValueError("Please provide your registered mobile number or email address.")

    db = SessionLocal()
    try:
        user = db.query(User).filter(
            (User.mobile == ident) | (User.email == ident)
        ).first()

        if not user:
            raise ValueError("No account registered with that mobile or email.")

        recovery_code = f"KS-{uuid.uuid4().hex[:6].upper()}"
        return {
            "success": True,
            "message": f"Account identified for {user.full_name}. Real SMS/Email gateway is unconfigured; use simulated OTP code: {recovery_code}.",
            "recovery_code": recovery_code,
            "identifier": ident
        }
    finally:
        db.close()

def update_farmer_profile(user_id: str, data: dict) -> dict:
    """Updates farmer profile (location, crops, area) with validation and persistence."""
    from services.location_service import validate_location

    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=user_id).first()
        if not user or user.role != "farmer":
            raise ValueError("Farmer account not found.")

        profile = user.farmer_profile
        if not profile:
            profile = FarmerProfile(user_id=user.id)
            db.add(profile)

        # Validate location if state/district/taluka/village provided
        state = (data.get("state") or profile.state or "Maharashtra").strip()
        district = (data.get("district") or profile.district or "Wardha").strip()
        taluka = (data.get("taluka") or profile.taluka or "Wardha").strip()
        village = (data.get("village") or profile.village or "Sewagram").strip()

        is_valid, err_msg, sanitized = validate_location(state, district, taluka, village)
        if not is_valid:
            raise ValueError(f"Invalid location: {err_msg}")

        profile.state = sanitized["state"]
        profile.district = sanitized["district"]
        profile.taluka = sanitized["taluka"]
        profile.village = sanitized["village"]

        if "pincode" in data:
            profile.pincode = (data.get("pincode") or "").strip() or None
        if "preferred_language" in data:
            profile.preferred_language = data.get("preferred_language") or profile.preferred_language
        if "main_crops" in data:
            profile.main_crops = data.get("main_crops") or profile.main_crops
        if "farm_area" in data and data.get("farm_area"):
            try:
                profile.farm_area = float(data.get("farm_area"))
            except (ValueError, TypeError):
                pass
        if "farm_area_unit" in data:
            profile.farm_area_unit = data.get("farm_area_unit") or profile.farm_area_unit

        db.commit()
        return user.to_safe_dict()
    finally:
        db.close()

