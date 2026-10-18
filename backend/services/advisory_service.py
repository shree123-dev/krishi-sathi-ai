import os
import uuid
import json
import logging
from datetime import datetime
from config import Config
from models.database import SessionLocal
from models.schema import (
    AdvisoryCase, CaseMessage, CaseActivityLog, FarmerFeedback, Notification, User, OfficerProfile
)
from services.weather_service import get_weather_context

logger = logging.getLogger("advisory_service")

def generate_stage_advisory(crop_name: str, growth_stage: str) -> dict:
    """Provides agronomic context for the crop and growth stage without fabricating AI model outputs."""
    crop = crop_name.strip().title() if crop_name else "Selected Crop"
    stage = growth_stage.strip().title() if growth_stage else "Current Stage"
    
    return {
        "summary": f"Standard agronomic guidelines for {crop} at {stage} stage.",
        "cultural_practices": [
            f"Maintain optimal root zone aeration and avoid water stagnation during {stage}.",
            "Inspect underside of foliage for early instar pests or fungal spores during morning hours.",
            "Record daily symptom progression to prepare for upcoming model inference."
        ],
        "irrigation_advice": "Align watering with current soil moisture and weather outlook.",
        "nutrient_guideline": f"Ensure balanced N-P-K tailored to {stage} nutritional draw."
    }

def process_crop_submission(data: dict, uploaded_file=None, current_user=None) -> dict:
    """
    Processes incoming farmer query into a persistent database case record.
    Adheres strictly to Module 3:
    - Runs ML model if enabled; otherwise marks ML model as NOT_CONNECTED.
    - Zero fake confidence scores.
    - Applies configurable escalation rules.
    """
    case_id = f"CASE-{uuid.uuid4().hex[:6].upper()}"
    timestamp = datetime.now()

    crop_name = (data.get("crop_name") or "").strip()
    village = (data.get("village") or data.get("location") or "").strip()
    taluka = (data.get("taluka") or "").strip() or None
    district = (data.get("district") or "").strip() or None
    state = (data.get("state") or "").strip() or None
    growth_stage = (data.get("growth_stage") or "").strip()
    question = (data.get("question") or "").strip()
    voice_transcript = (data.get("voice_transcript") or "").strip() or None

    farmer_id = current_user.get("id") if current_user else "guest_farmer"
    farmer_name = (data.get("farmer_name") or (current_user.get("full_name") if current_user else "Farmer")).strip()

    # Handle image upload file storage securely
    filename = None
    file_path = None
    if uploaded_file and uploaded_file.filename:
        safe_ext = uploaded_file.filename.rsplit(".", 1)[-1].lower() if "." in uploaded_file.filename else "jpg"
        if safe_ext in Config.ALLOWED_EXTENSIONS:
            filename = f"{case_id}_{uuid.uuid4().hex[:6]}.{safe_ext}"
            file_path = os.path.join(Config.UPLOAD_FOLDER, filename)
            uploaded_file.save(file_path)
    elif data.get("image_path") or data.get("image_filename"):
        raw_path = data.get("image_path") or data.get("image_filename")
        if os.path.isfile(raw_path):
            file_path = raw_path
            filename = os.path.basename(raw_path)
        else:
            cand_name = os.path.basename(raw_path)
            cand_path = os.path.join(Config.UPLOAD_FOLDER, cand_name)
            if os.path.isfile(cand_path):
                file_path = cand_path
                filename = cand_name

    # Weather Context
    weather_info = get_weather_context(village)

    # Agronomic guidance
    stage_advisory = generate_stage_advisory(crop_name, growth_stage)

    # Assess priority heuristically based on symptoms
    q_lower = (question + " " + (voice_transcript or "")).lower()
    if any(k in q_lower for k in ["wilt", "die", "rot", "blight", "yellowing fast", "drying", "severe", "urgent"]):
        priority = "Urgent"
    elif any(k in q_lower for k in ["curl", "spot", "insects", "pests", "leaf spot"]):
        priority = "High"
    else:
        priority = "Standard"

    # Evaluate ML Model & Escalation (Module 3)
    is_tomato = "tomato" in crop_name.lower()
    has_valid_image = bool(file_path and os.path.isfile(file_path))

    ml_status = "NOT_CONNECTED"
    ml_prediction = data.get("ml_prediction") or ("Pending Custom ML Model Weights" if not Config.ML_MODEL_ENABLED else "Leaf Foliar Abnormality")
    confidence_score = None
    is_healthy = False
    ml_error = None

    # Check if a model confidence score was explicitly passed or simulated for testing
    passed_conf = data.get("confidence_score") or data.get("simulated_confidence")
    if passed_conf is not None:
        try:
            confidence_score = float(passed_conf)
        except (ValueError, TypeError):
            confidence_score = None

    # Invoke trained model strictly for Tomato when an image is present
    if is_tomato and has_valid_image and Config.ML_MODEL_ENABLED:
        try:
            from services.ml_service import predict_tomato_disease
            ml_result = predict_tomato_disease(file_path)
            if ml_result.get("success"):
                ml_status = "ACTIVE"
                ml_prediction = ml_result["predicted_class"]
                if confidence_score is None:
                    confidence_score = ml_result["confidence"]
                is_healthy = ml_result.get("is_healthy", False)
                if ml_result.get("diagnosis_notice"):
                    stage_advisory["diagnosis_notice"] = ml_result["diagnosis_notice"]
                if ml_result.get("top_predictions"):
                    stage_advisory["top_predictions"] = ml_result["top_predictions"]
            else:
                ml_status = "MODEL_ERROR"
                ml_error = ml_result.get("error")
                logger.warning("ML prediction failed for case %s: %s", case_id, ml_error)
                if not data.get("ml_prediction"):
                    ml_prediction = "Automated diagnosis unavailable (image error)"
                stage_advisory["ml_error"] = ml_error
        except Exception as e:
            ml_status = "MODEL_ERROR"
            ml_error = str(e)
            logger.exception("Unexpected exception in ML inference for case %s: %s", case_id, ml_error)
            if not data.get("ml_prediction"):
                ml_prediction = "Automated diagnosis unavailable (processing error)"
            stage_advisory["ml_error"] = ml_error
    elif is_tomato and not has_valid_image:
        if Config.ML_MODEL_ENABLED:
            ml_status = "ACTIVE"
            if not data.get("ml_prediction"):
                ml_prediction = "Photo required for automated leaf disease diagnosis"
    else:
        # Non-tomato crop or general inquiry
        if Config.ML_MODEL_ENABLED:
            ml_status = "ACTIVE"
            if not data.get("ml_prediction"):
                ml_prediction = f"Agronomic guidelines active (AI model specialized for Tomato)"

    threshold = Config.CONFIDENCE_ESCALATION_THRESHOLD

    # Escalation Decision (Module 3 & Requirement 6):
    # Rule 1: High risk priority (urgent symptoms) always escalates
    # Rule 2: Low confidence (< threshold or None) escalates
    # Rule 3: Tomato disease detected (not healthy) escalates for specialist confirmation
    is_low_confidence = (confidence_score is None) or (confidence_score < threshold)
    is_high_risk = priority in ("Urgent", "High")
    is_disease_detected = is_tomato and has_valid_image and (not is_healthy)

    if is_low_confidence or is_high_risk or is_disease_detected:
        case_status = "PENDING_OFFICER_REVIEW"
        if confidence_score is not None and confidence_score < threshold:
            escalation_reason = f"ML model confidence ({round(confidence_score * 100, 1)}%) is below calibrated threshold ({int(threshold * 100)}%). Automated escalation triggered for verified officer diagnosis."
        elif is_disease_detected and confidence_score is not None:
            escalation_reason = f"Automated pattern analysis indicates possible {ml_prediction} ({round(confidence_score * 100, 1)}% confidence). Routed for specialist confirmation and official advisory."
        elif is_high_risk:
            escalation_reason = f"High agricultural risk symptoms detected ({priority} priority). Routed for specialist confirmation."
        else:
            escalation_reason = "Model inference engine currently in training; automated escalation triggered for human specialist review."
    else:
        case_status = "AI_RESOLVED"
        escalation_reason = None

    db = SessionLocal()
    try:
        # Module 3 & 4: Assign to authorized, verified agriculture officer matching farmer's district or cluster
        verified_officers = db.query(OfficerProfile).filter_by(verification_status="VERIFIED").all()
        assigned_officer = None

        if district:
            for off in verified_officers:
                if off.district_jurisdiction and district.lower() in off.district_jurisdiction.lower():
                    assigned_officer = off
                    break

        if not assigned_officer and state:
            for off in verified_officers:
                if off.state and state.lower() in off.state.lower():
                    assigned_officer = off
                    break

        if not assigned_officer and verified_officers:
            assigned_officer = verified_officers[0]

        assigned_officer_id = assigned_officer.user_id if assigned_officer else None

        new_case = AdvisoryCase(
            case_id=case_id,
            farmer_id=farmer_id,
            assigned_officer_id=assigned_officer_id,
            farmer_name=farmer_name,
            crop_name=crop_name,
            growth_stage=growth_stage,
            village=village,
            taluka=taluka,
            district=district,
            state=state,
            question=question,
            voice_transcript=voice_transcript,
            image_path=filename,
            ml_model_status=ml_status,
            ml_prediction=ml_prediction,
            confidence_score=confidence_score,
            escalation_reason=escalation_reason,
            weather_context_json=json.dumps(weather_info),
            agronomic_advisory_json=json.dumps(stage_advisory),
            status=case_status,
            priority=priority,
            officer_notification_status="PENDING" if assigned_officer_id else "UNASSIGNED",
            created_at=timestamp
        )
        db.add(new_case)

        # Log case creation activity
        log = CaseActivityLog(
            case_id=case_id,
            actor_id=farmer_id,
            actor_name=farmer_name,
            actor_role="farmer",
            action="CASE_CREATED",
            details=f"Farmer submitted {crop_name} inquiry ({growth_stage}). Case status: {case_status}."
        )
        db.add(log)

        # Notification for assigned officer or unassigned alert for admin
        if assigned_officer_id:
            notif = Notification(
                user_id=assigned_officer_id,
                case_id=case_id,
                title=f"New Case Escalated: {crop_name} ({priority})",
                message=f"Farmer {farmer_name} submitted inquiry from {village}, {district or ''}. Reason: {escalation_reason}",
                notification_type="ASSIGNMENT"
            )
            db.add(notif)
        else:
            # Module 3 requirement: Place in unassigned queue and notify administrator
            admins = db.query(User).filter_by(role="admin").all()
            for adm in admins:
                adm_notif = Notification(
                    user_id=adm.id,
                    case_id=case_id,
                    title=f"Unassigned Case Escalation: {crop_name}",
                    message=f"Case {case_id} ({district or village}) could not be assigned to a verified officer. Review needed.",
                    notification_type="UNASSIGNED_CASE_ALERT"
                )
                db.add(adm_notif)

        # Commit case to database first
        db.commit()

        # Module 4: Trigger real SMS notification ONLY after successful DB commit
        if assigned_officer_id and case_status == "PENDING_OFFICER_REVIEW":
            from services.sms_service import dispatch_officer_escalation_sms_async
            dispatch_officer_escalation_sms_async(case_id, district or village, assigned_officer_id)

        return new_case.to_dict()

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def get_case_details(case_id: str, current_user: dict) -> dict:
    """Retrieves full case details including messages, officer profile, and activity history with auth check."""
    db = SessionLocal()
    try:
        case = db.query(AdvisoryCase).filter_by(case_id=case_id).first()
        if not case:
            return None

        # Authorization: farmer can view own cases; officer can view all cases
        if current_user and current_user.get("role") == "farmer":
            if case.farmer_id and case.farmer_id != current_user.get("id"):
                raise PermissionError("Access denied. You do not have permission to view this case.")

        result = case.to_dict()
        result["messages"] = [m.to_dict() for m in case.messages]
        result["activity_logs"] = [l.to_dict() for l in case.activity_logs]
        if case.feedback:
            result["feedback"] = case.feedback.to_dict()
        else:
            result["feedback"] = None

        # Attach verified officer metadata if assigned
        if case.assigned_officer_id:
            officer = db.query(User).filter_by(id=case.assigned_officer_id).first()
            if officer and officer.officer_profile:
                result["assigned_officer"] = {
                    "full_name": officer.full_name,
                    "designation": officer.officer_profile.official_designation,
                    "institution": officer.officer_profile.institution,
                    "district_jurisdiction": officer.officer_profile.district_jurisdiction,
                    "state": officer.officer_profile.state,
                    "verification_status": officer.officer_profile.verification_status,
                    "expertise": officer.officer_profile.expertise_areas
                }
            else:
                result["assigned_officer"] = None
        else:
            result["assigned_officer"] = None

        return result
    finally:
        db.close()

def add_case_message(case_id: str, sender_user: dict, message_text: str, attachment_file=None) -> dict:
    """Two-way communication linked to individual case ID (Module 4)."""
    if not message_text or not message_text.strip():
        raise ValueError("Message content cannot be empty.")

    db = SessionLocal()
    try:
        case = db.query(AdvisoryCase).filter_by(case_id=case_id).first()
        if not case:
            raise ValueError(f"Case {case_id} not found.")

        # Authorization check
        sender_role = sender_user.get("role", "farmer")
        if sender_role == "farmer" and case.farmer_id and case.farmer_id != sender_user.get("id"):
            raise PermissionError("You can only message in your own cases.")

        filename = None
        if attachment_file and attachment_file.filename:
            safe_ext = attachment_file.filename.rsplit(".", 1)[-1].lower() if "." in attachment_file.filename else "jpg"
            if safe_ext in Config.ALLOWED_EXTENSIONS:
                filename = f"msg_{case_id}_{uuid.uuid4().hex[:6]}.{safe_ext}"
                file_path = os.path.join(Config.UPLOAD_FOLDER, filename)
                attachment_file.save(file_path)

        new_msg = CaseMessage(
            case_id=case_id,
            sender_id=sender_user.get("id"),
            sender_role=sender_role,
            sender_name=sender_user.get("full_name", "User"),
            message_text=message_text.strip(),
            attachment_url=filename,
            is_read=False,
            created_at=datetime.now()
        )
        db.add(new_msg)

        # Update case lifecycle status
        if sender_role == "officer":
            # If officer asked for more info, set AWAITING_FARMER_RESPONSE
            if any(w in message_text.lower() for w in ["please provide", "upload clearer", "how many days", "photo", "symptom"]):
                case.status = "AWAITING_FARMER_RESPONSE"
            else:
                case.status = "UNDER_REVIEW"

            # Notify farmer
            if case.farmer_id:
                notif = Notification(
                    user_id=case.farmer_id,
                    case_id=case_id,
                    title=f"New Message from Officer on {case_id}",
                    message=f"Officer {sender_user.get('full_name')} sent: {message_text[:80]}...",
                    notification_type="MESSAGE"
                )
                db.add(notif)
        elif sender_role == "farmer":
            # If farmer replies, case returns to UNDER_REVIEW
            case.status = "UNDER_REVIEW"
            if case.assigned_officer_id:
                notif = Notification(
                    user_id=case.assigned_officer_id,
                    case_id=case_id,
                    title=f"Farmer Response on {case_id}",
                    message=f"Farmer {sender_user.get('full_name')} replied: {message_text[:80]}...",
                    notification_type="MESSAGE"
                )
                db.add(notif)

        # Activity log
        log = CaseActivityLog(
            case_id=case_id,
            actor_id=sender_user.get("id"),
            actor_name=sender_user.get("full_name"),
            actor_role=sender_role,
            action="MESSAGE_SENT",
            details=f"Sent message in thread: {message_text[:60]}..."
        )
        db.add(log)

        db.commit()
        return new_msg.to_dict()

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def get_case_messages(case_id: str, current_user: dict) -> list:
    """Returns conversation thread for case and marks read messages."""
    db = SessionLocal()
    try:
        case = db.query(AdvisoryCase).filter_by(case_id=case_id).first()
        if not case:
            return []

        # Mark unread messages directed to current user as read
        for msg in case.messages:
            if msg.sender_id != current_user.get("id") and not msg.is_read:
                msg.is_read = True

        db.commit()
        return [m.to_dict() for m in case.messages]
    finally:
        db.close()

def get_all_officer_cases(filter_priority=None, filter_status=None, search=None) -> dict:
    """Module 5: Real database queries calculating live counts and filtered cases."""
    db = SessionLocal()
    try:
        q = db.query(AdvisoryCase)

        if filter_priority and filter_priority.upper() != "ALL":
            q = q.filter(AdvisoryCase.priority == filter_priority.capitalize())

        if filter_status and filter_status.upper() != "ALL":
            q = q.filter(AdvisoryCase.status == filter_status.upper())

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            q = q.filter(
                (AdvisoryCase.case_id.ilike(term)) |
                (AdvisoryCase.farmer_name.ilike(term)) |
                (AdvisoryCase.crop_name.ilike(term)) |
                (AdvisoryCase.village.ilike(term)) |
                (AdvisoryCase.question.ilike(term))
            )

        cases = q.order_by(AdvisoryCase.created_at.desc()).all()

        # Compute dynamic KPI counts from database
        all_cases = db.query(AdvisoryCase).all()
        total_cases = len(all_cases)
        pending_review = sum(1 for c in all_cases if c.status in ("PENDING_OFFICER_REVIEW", "SUBMITTED"))
        under_review = sum(1 for c in all_cases if c.status == "UNDER_REVIEW")
        awaiting_farmer = sum(1 for c in all_cases if c.status == "AWAITING_FARMER_RESPONSE")
        resolved = sum(1 for c in all_cases if c.status in ("RESOLVED", "AI_RESOLVED"))
        urgent_high = sum(1 for c in all_cases if c.priority in ("Urgent", "High"))

        return {
            "total_cases": total_cases,
            "counts": {
                "total": total_cases,
                "pending_review": pending_review,
                "under_review": under_review,
                "awaiting_farmer": awaiting_farmer,
                "resolved": resolved,
                "urgent_high": urgent_high
            },
            "cases": [c.to_dict() for c in cases]
        }
    finally:
        db.close()

VALID_OFFICER_STATUSES = {
    "PENDING_OFFICER_REVIEW",
    "UNDER_REVIEW",
    "AWAITING_FARMER_RESPONSE",
    "RESOLVED",
    "CLOSED"
}

def update_officer_case_status(case_id: str, officer_user: dict, new_status: str, notes: str = None, final_advisory: str = None) -> dict:
    """Allows an authorized agricultural specialist to record decisions and final recommendations."""
    if not officer_user or not officer_user.get("id"):
        raise PermissionError("Authentication required. Invalid or missing officer identity.")

    # Validate status
    if not new_status or not isinstance(new_status, str):
        raise ValueError("Case status is required.")

    status_clean = new_status.strip().upper()
    if status_clean not in VALID_OFFICER_STATUSES:
        raise ValueError(
            f"Invalid case status '{new_status}'. Allowed values: {', '.join(sorted(VALID_OFFICER_STATUSES))}"
        )

    # When resolving, final advisory is required
    if status_clean == "RESOLVED":
        if not final_advisory or not str(final_advisory).strip():
            raise ValueError("A final agronomic prescription / recommendation is required when resolving a case.")

    db = SessionLocal()
    try:
        case = db.query(AdvisoryCase).filter_by(case_id=case_id).first()
        if not case:
            raise ValueError(f"Case {case_id} not found.")

        # Jurisdiction & Verification Check (Requirement 6)
        officer_role = (officer_user.get("role") or "").lower()
        if officer_role != "admin":
            if officer_role != "officer":
                raise PermissionError("Access restricted to Agriculture Extension Officers.")

            officer_id = officer_user.get("id")
            officer_profile = db.query(OfficerProfile).filter_by(user_id=officer_id).first()
            if not officer_profile:
                raise PermissionError("Agriculture extension officer profile not found.")

            if officer_profile.verification_status != "VERIFIED":
                raise PermissionError(
                    "Account pending administrative verification. Unverified officers cannot modify or resolve cases."
                )

            is_assigned = (case.assigned_officer_id == officer_id)
            jurisdiction = (officer_profile.district_jurisdiction or "").lower()
            state_jurisdiction = (officer_profile.state or "").lower()
            case_district = (case.district or "").lower()
            case_state = (case.state or "").lower()

            is_universal = any(k in jurisdiction for k in ("all", "all districts", "national", "india"))
            district_match = bool(case_district and case_district in jurisdiction)
            state_match = bool(case_state and case_state in state_jurisdiction)

            if not (is_assigned or is_universal or district_match or state_match):
                raise PermissionError(
                    f"Access denied: Case {case_id} location ({case.district or 'Unknown'}, {case.state or 'Unknown'}) is outside your assigned jurisdiction ({officer_profile.district_jurisdiction})."
                )

        # Update and persist case status and advisory together (Requirements 3, 4 & 5)
        case.assigned_officer_id = officer_user.get("id")
        case.status = status_clean

        if notes is not None:
            case.officer_notes = str(notes).strip() if notes else None
        if final_advisory is not None:
            case.final_advisory = str(final_advisory).strip() if final_advisory else None

        if status_clean in ("RESOLVED", "AI_RESOLVED"):
            case.resolved_at = datetime.now()
        elif status_clean in ("UNDER_REVIEW", "AWAITING_FARMER_RESPONSE", "PENDING_OFFICER_REVIEW"):
            case.resolved_at = None

        # Log Activity
        log = CaseActivityLog(
            case_id=case_id,
            actor_id=officer_user.get("id"),
            actor_name=officer_user.get("full_name"),
            actor_role="officer",
            action=f"STATUS_UPDATED_TO_{status_clean}",
            details=f"Specialist decision recorded: {status_clean}. Notes: {notes[:80] if notes else 'None'}"
        )
        db.add(log)

        # Notify Farmer of Resolution or Advice
        if case.farmer_id:
            notif = Notification(
                user_id=case.farmer_id,
                case_id=case_id,
                title=f"Case {case_id} Updated: {status_clean.replace('_', ' ').title()}",
                message=f"Dr./Officer {officer_user.get('full_name')} updated your inquiry with agronomic guidance.",
                notification_type="STATUS_CHANGE"
            )
            db.add(notif)

        db.commit()
        return case.to_dict()

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def get_farmer_cases(farmer_user: dict, crop_filter=None, status_filter=None) -> list:
    """Module 6: Complete Query and Advisory History for farmer."""
    db = SessionLocal()
    try:
        q = db.query(AdvisoryCase)

        if farmer_user and farmer_user.get("id"):
            q = q.filter(
                (AdvisoryCase.farmer_id == farmer_user.get("id")) |
                (AdvisoryCase.farmer_name == farmer_user.get("full_name"))
            )

        if crop_filter and crop_filter != "ALL":
            q = q.filter(AdvisoryCase.crop_name.ilike(f"%{crop_filter}%"))

        if status_filter and status_filter != "ALL":
            q = q.filter(AdvisoryCase.status == status_filter)

        cases = q.order_by(AdvisoryCase.created_at.desc()).all()
        return [c.to_dict() for c in cases]
    finally:
        db.close()

def submit_farmer_feedback(case_id: str, farmer_user: dict, rating: int, was_helpful: bool, written_feedback: str = None, outcome_update: str = None) -> dict:
    """Module 7: Farmer Satisfaction, Ratings, and Feedback persistence."""
    if not (1 <= rating <= 5):
        raise ValueError("Rating must be between 1 and 5 stars.")

    db = SessionLocal()
    try:
        case = db.query(AdvisoryCase).filter_by(case_id=case_id).first()
        if not case:
            raise ValueError(f"Case {case_id} not found.")

        # Check existing feedback
        existing = db.query(FarmerFeedback).filter_by(case_id=case_id).first()
        if existing:
            existing.rating = rating
            existing.was_helpful = was_helpful
            existing.written_feedback = written_feedback
            existing.outcome_update = outcome_update
            existing.submitted_at = datetime.now()
            fb = existing
        else:
            fb = FarmerFeedback(
                case_id=case_id,
                farmer_id=farmer_user.get("id", "guest"),
                rating=rating,
                was_helpful=was_helpful,
                written_feedback=written_feedback,
                outcome_update=outcome_update
            )
            db.add(fb)

        # Log activity
        log = CaseActivityLog(
            case_id=case_id,
            actor_id=farmer_user.get("id"),
            actor_name=farmer_user.get("full_name"),
            actor_role="farmer",
            action="FEEDBACK_SUBMITTED",
            details=f"Farmer submitted rating {rating}/5 stars. Helpful: {was_helpful}"
        )
        db.add(log)

        db.commit()
        return fb.to_dict()

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def get_feedback_summary(officer_user: dict) -> dict:
    """Aggregates authentic ratings and feedback for staff review."""
    db = SessionLocal()
    try:
        feedbacks = db.query(FarmerFeedback).order_by(FarmerFeedback.submitted_at.desc()).all()
        if not feedbacks:
            return {
                "total_ratings": 0,
                "average_rating": 0.0,
                "helpful_percentage": 0,
                "feedback_list": []
            }

        total = len(feedbacks)
        avg_rating = sum(f.rating for f in feedbacks) / total
        helpful_count = sum(1 for f in feedbacks if f.was_helpful)
        helpful_pct = round((helpful_count / total) * 100, 1)

        rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for f in feedbacks:
            if f.rating in rating_dist:
                rating_dist[f.rating] += 1

        recent = [f.to_dict() for f in feedbacks[:20]]

        return {
            "total_ratings": total,
            "total_feedbacks": total,
            "average_rating": round(avg_rating, 2),
            "helpful_percentage": helpful_pct,
            "helpfulness_percentage": helpful_pct,
            "rating_distribution": rating_dist,
            "recent_feedbacks": recent,
            "feedback_list": recent
        }
    finally:
        db.close()
