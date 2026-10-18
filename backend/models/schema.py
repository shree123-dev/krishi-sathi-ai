from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from models.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True)
    full_name = Column(String(120), nullable=False)
    mobile = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="farmer") # 'farmer', 'officer', 'admin'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    farmer_profile = relationship("FarmerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    officer_profile = relationship("OfficerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def to_safe_dict(self):
        data = {
            "id": self.id,
            "full_name": self.full_name,
            "mobile": self.mobile,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
        if self.role == "farmer" and self.farmer_profile:
            data.update(self.farmer_profile.to_dict())
        elif self.role == "officer" and self.officer_profile:
            data.update(self.officer_profile.to_dict())
        return data

class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    village = Column(String(100), nullable=False, default="Not Specified")
    taluka = Column(String(100), nullable=True, default="Not Specified")
    district = Column(String(100), nullable=False, default="Not Specified")
    state = Column(String(100), nullable=False, default="Not Specified")
    pincode = Column(String(20), nullable=True)
    preferred_language = Column(String(50), default="English")
    main_crops = Column(String(255), nullable=True) # e.g. "Cotton, Wheat"
    farm_location_lat = Column(Float, nullable=True)
    farm_location_lng = Column(Float, nullable=True)
    farm_area = Column(Float, nullable=True)
    farm_area_unit = Column(String(30), default="Acres")
    crop_growth_stage = Column(String(100), nullable=True)

    user = relationship("User", back_populates="farmer_profile")

    def to_dict(self):
        return {
            "village": self.village,
            "taluka": self.taluka,
            "district": self.district,
            "state": self.state,
            "pincode": self.pincode,
            "preferred_language": self.preferred_language,
            "main_crops": self.main_crops,
            "farm_location_lat": self.farm_location_lat,
            "farm_location_lng": self.farm_location_lng,
            "farm_area": self.farm_area,
            "farm_area_unit": self.farm_area_unit,
            "crop_growth_stage": self.crop_growth_stage
        }

class OfficerProfile(Base):
    __tablename__ = "officer_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    official_designation = Column(String(120), nullable=False)
    department = Column(String(150), nullable=False)
    institution = Column(String(150), nullable=False)
    district_jurisdiction = Column(String(200), nullable=False)
    state = Column(String(100), nullable=False)
    official_email = Column(String(120), nullable=True)
    employee_id_reference = Column(String(100), nullable=True)
    expertise_areas = Column(String(255), nullable=True)
    verification_status = Column(String(50), default="PENDING_VERIFICATION") # 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'
    verified_by = Column(String(120), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    user = relationship("User", back_populates="officer_profile")

    def to_dict(self):
        return {
            "official_designation": self.official_designation,
            "department": self.department,
            "institution": self.institution,
            "district_jurisdiction": self.district_jurisdiction,
            "state": self.state,
            "official_email": self.official_email,
            "employee_id_reference": self.employee_id_reference,
            "expertise_areas": self.expertise_areas,
            "verification_status": self.verification_status,
            "verified_by": self.verified_by,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "rejection_reason": self.rejection_reason
        }

class AdvisoryCase(Base):
    __tablename__ = "advisory_cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), unique=True, nullable=False, index=True)
    farmer_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_officer_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    farmer_name = Column(String(120), nullable=False)
    crop_name = Column(String(100), nullable=False)
    growth_stage = Column(String(100), nullable=False)
    village = Column(String(100), nullable=False)
    taluka = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    question = Column(Text, nullable=True)
    voice_transcript = Column(Text, nullable=True)
    image_path = Column(String(255), nullable=True)

    # ML & Escalation Attributes
    ml_model_status = Column(String(50), default="NOT_CONNECTED")
    ml_prediction = Column(String(150), default="Pending Custom ML Model Weights")
    confidence_score = Column(Float, nullable=True) # Explicitly NULL if model offline
    escalation_reason = Column(String(255), nullable=True)

    # Context JSONs
    weather_context_json = Column(Text, nullable=True)
    agronomic_advisory_json = Column(Text, nullable=True)

    # Lifecycle Status: SUBMITTED, AI_ANALYSIS, PENDING_OFFICER_REVIEW, UNDER_REVIEW, AWAITING_FARMER_RESPONSE, RESOLVED, AI_RESOLVED, CLOSED
    status = Column(String(50), default="PENDING_OFFICER_REVIEW", index=True)
    priority = Column(String(20), default="Standard") # 'Urgent', 'High', 'Standard'

    # SMS & Notification Status (Module 4)
    officer_notification_status = Column(String(50), default="PENDING") # 'PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED', 'IN_APP_ONLY'
    officer_sms_id = Column(String(100), nullable=True)
    officer_sms_error = Column(Text, nullable=True)

    officer_notes = Column(Text, nullable=True)
    final_advisory = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now, index=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    messages = relationship("CaseMessage", backref="case", cascade="all, delete-orphan", order_by="CaseMessage.created_at.asc()")
    feedback = relationship("FarmerFeedback", backref="case", uselist=False, cascade="all, delete-orphan")
    activity_logs = relationship("CaseActivityLog", backref="case", cascade="all, delete-orphan", order_by="CaseActivityLog.created_at.asc()")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id])

    def to_dict(self):
        import json
        weather = {}
        stage_adv = {}
        try:
            if self.weather_context_json:
                weather = json.loads(self.weather_context_json)
        except Exception:
            pass
        try:
            if self.agronomic_advisory_json:
                stage_adv = json.loads(self.agronomic_advisory_json)
        except Exception:
            pass

        loc_parts = [p for p in [self.village, self.taluka, self.district, self.state] if p and p != "Not Specified"]
        location_display = ", ".join(loc_parts) if loc_parts else (self.village or "Local Farm")

        officer_name = self.assigned_officer.full_name if self.assigned_officer else None
        officer_desig = self.assigned_officer.officer_profile.official_designation if (self.assigned_officer and self.assigned_officer.officer_profile) else None
        officer_inst = self.assigned_officer.officer_profile.institution if (self.assigned_officer and self.assigned_officer.officer_profile) else None

        return {
            "case_id": self.case_id,
            "farmer_id": self.farmer_id,
            "assigned_officer_id": self.assigned_officer_id,
            "assigned_officer_name": officer_name,
            "assigned_officer_designation": officer_desig,
            "assigned_officer_institution": officer_inst,
            "farmer_name": self.farmer_name,
            "crop_name": self.crop_name,
            "growth_stage": self.growth_stage,
            "village": self.village,
            "taluka": self.taluka,
            "district": self.district,
            "state": self.state,
            "location": location_display,
            "question": self.question,
            "voice_transcript": self.voice_transcript,
            "image_filename": self.image_path,
            "ml_model_status": self.ml_model_status,
            "detected_condition": self.ml_prediction,
            "confidence_score": self.confidence_score,
            "escalation_reason": self.escalation_reason,
            "weather_context": weather,
            "stage_advisory": stage_adv,
            "status": self.status,
            "officer_status": self.status.replace("_", " ").title(),
            "priority": self.priority,
            "officer_notification_status": self.officer_notification_status,
            "officer_sms_id": self.officer_sms_id,
            "officer_sms_error": self.officer_sms_error,
            "officer_notes": self.officer_notes,
            "final_advisory": self.final_advisory,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "timestamp": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "messages_count": len(self.messages) if self.messages else 0,
            "has_feedback": self.feedback is not None
        }

class CaseMessage(Base):
    __tablename__ = "case_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("advisory_cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sender_role = Column(String(20), nullable=False) # 'farmer', 'officer', 'system'
    sender_name = Column(String(120), nullable=False)
    message_text = Column(Text, nullable=False)
    attachment_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "sender_id": self.sender_id,
            "sender_role": self.sender_role,
            "sender_name": self.sender_name,
            "message_text": self.message_text,
            "attachment_url": self.attachment_url,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "time_formatted": self.created_at.strftime("%b %d, %H:%M") if self.created_at else None
        }

class FarmerFeedback(Base):
    __tablename__ = "farmer_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("advisory_cases.case_id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    farmer_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False) # 1 to 5
    was_helpful = Column(Boolean, default=True)
    written_feedback = Column(Text, nullable=True)
    outcome_update = Column(Text, nullable=True) # whether tried advice & what happened
    submitted_at = Column(DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "farmer_id": self.farmer_id,
            "rating": self.rating,
            "was_helpful": self.was_helpful,
            "written_feedback": self.written_feedback,
            "outcome_update": self.outcome_update,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None
        }

class CaseActivityLog(Base):
    __tablename__ = "case_activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("advisory_cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(String(64), nullable=True)
    actor_name = Column(String(120), nullable=True)
    actor_role = Column(String(30), nullable=True)
    action = Column(String(50), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "actor_name": self.actor_name,
            "actor_role": self.actor_role,
            "action": self.action,
            "details": self.details,
            "timestamp": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else None
        }

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(String(64), nullable=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="INFO") # 'MESSAGE', 'STATUS_CHANGE', 'ASSIGNMENT', 'VERIFICATION'
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "case_id": self.case_id,
            "title": self.title,
            "message": self.message,
            "notification_type": self.notification_type,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class OfficerSmsLog(Base):
    __tablename__ = "officer_sms_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("advisory_cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    officer_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_mobile = Column(String(30), nullable=False)
    message_body = Column(Text, nullable=False)
    provider = Column(String(50), default="NONE") # 'TWILIO', 'MSG91', 'CUSTOM', 'NONE'
    provider_message_id = Column(String(120), nullable=True)
    status = Column(String(50), default="PENDING") # 'PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED', 'RETRYING'
    error_message = Column(Text, nullable=True)
    attempt_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.now, index=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        # Mask phone number for data privacy (Module 9)
        masked_phone = self.recipient_mobile
        if len(self.recipient_mobile) >= 10:
            masked_phone = self.recipient_mobile[:3] + "******" + self.recipient_mobile[-4:]

        return {
            "id": self.id,
            "case_id": self.case_id,
            "officer_id": self.officer_id,
            "recipient_mobile_masked": masked_phone,
            "message_body": self.message_body,
            "provider": self.provider,
            "provider_message_id": self.provider_message_id,
            "status": self.status,
            "error_message": self.error_message,
            "attempt_count": self.attempt_count,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class UserSession(Base):
    """
    Persistent server-side session management.
    Stores cryptographic hashes of opaque tokens, expiration timestamps,
    and revocation flags to ensure sessions survive backend restarts.
    """
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)
    token_hash = Column(String(128), unique=True, nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    last_accessed_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    user = relationship("User")

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "role": self.role,
            "is_revoked": self.is_revoked,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_accessed_at": self.last_accessed_at.isoformat() if self.last_accessed_at else None
        }


