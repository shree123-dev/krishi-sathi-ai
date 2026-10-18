"""
Krishi Sathi AI — Agriculture Extension Officer SMS Dispatch Service
Handles real SMS delivery via Twilio or MSG91 with:
- Idempotency (duplicate suppression)
- Rate limiting per recipient
- Masked metadata logging
- Guaranteed in-app notification fallback
- Asynchronous non-blocking dispatch
"""

import os
import re
import threading
import requests
from datetime import datetime, timedelta
from models.database import SessionLocal
from models.schema import AdvisoryCase, OfficerSmsLog, Notification, User

def mask_mobile(mobile: str) -> str:
    """Masks phone number for privacy preservation in delivery logs (Module 9)."""
    if not mobile:
        return "Unknown"
    digits = re.sub(r"\D", "", mobile)
    if len(digits) >= 10:
        return f"{digits[:3]}******{digits[-4:]}"
    return "****"

def format_e164_indian(mobile: str) -> str:
    """Formats phone number to E.164 international standard."""
    digits = re.sub(r"\D", "", mobile)
    if len(digits) == 10:
        return f"+91{digits}"
    elif len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    elif mobile.startswith("+"):
        return mobile
    return f"+91{digits}"

def send_officer_escalation_sms(case_id: str, district: str, officer_user_id: str) -> dict:
    """
    Sends an escalation alert SMS to the assigned officer.
    Template:
    'Krishi Sathi AI: A new crop advisory case requires your review. Case ID: {case_id}. District: {district}. Please log in to the authorized officer dashboard.'
    """
    db = SessionLocal()
    try:
        officer = db.query(User).filter_by(id=officer_user_id).first()
        if not officer:
            return {"success": False, "status": "FAILED", "error": f"Officer user {officer_user_id} not found."}

        raw_mobile = officer.mobile or ""
        recipient_mobile = format_e164_indian(raw_mobile)
        message_body = (
            f"Krishi Sathi AI: A new crop advisory case requires your review. "
            f"Case ID: {case_id}. District: {district}. "
            f"Please log in to the authorized officer dashboard."
        )

        # 1. Idempotency Check (prevent duplicate SMS on re-escalation)
        existing_sent = db.query(OfficerSmsLog).filter(
            OfficerSmsLog.case_id == case_id,
            OfficerSmsLog.officer_id == officer_user_id,
            OfficerSmsLog.status == "SENT"
        ).first()

        if existing_sent:
            return {
                "success": True,
                "status": "ALREADY_SENT",
                "message": f"SMS already dispatched previously (Provider ID: {existing_sent.provider_message_id})."
            }

        # 2. Rate Limiting Check (max 5 SMS per officer per hour)
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_count = db.query(OfficerSmsLog).filter(
            OfficerSmsLog.officer_id == officer_user_id,
            OfficerSmsLog.status == "SENT",
            OfficerSmsLog.created_at >= one_hour_ago
        ).count()

        if recent_count >= 5:
            err_msg = f"Rate limit exceeded: Officer has received {recent_count} notifications in the past hour."
            _log_sms_attempt(db, case_id, officer_user_id, recipient_mobile, message_body, "RATE_LIMITED", err_msg)
            _create_in_app_fallback(db, officer_user_id, case_id, district, "SMS Rate Limited")
            _update_case_notification_status(db, case_id, "RATE_LIMITED", err_msg)
            db.commit()
            return {"success": False, "status": "RATE_LIMITED", "error": err_msg}

        # 3. Detect Configured SMS Provider
        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
        twilio_auth = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
        twilio_from = os.getenv("TWILIO_FROM_NUMBER", "").strip()

        msg91_key = os.getenv("MSG91_AUTH_KEY", "").strip()
        msg91_sender = os.getenv("MSG91_SENDER_ID", "").strip()

        # Check if provider is unconfigured
        if not (twilio_sid and twilio_auth and twilio_from) and not (msg91_key and msg91_sender):
            status_desc = "SMS_PROVIDER_NOT_CONFIGURED"
            reason = "SMS provider credentials (Twilio or MSG91) not configured in backend environment."
            
            # Record honest non-configured attempt in SMS audit log
            _log_sms_attempt(db, case_id, officer_user_id, recipient_mobile, message_body, "NOT_CONFIGURED", reason)
            
            # Create guaranteed in-app notification
            _create_in_app_fallback(db, officer_user_id, case_id, district, "SMS Unconfigured (In-App Alert Active)")
            
            # Update case notification status
            _update_case_notification_status(db, case_id, "NOT_CONFIGURED", reason)
            db.commit()

            print(f"[SMS Service] Real SMS provider unconfigured. In-app notification created for Officer {officer.full_name} ({mask_mobile(recipient_mobile)}).")
            return {
                "success": False,
                "status": "NOT_CONFIGURED",
                "message": "SMS provider not configured. Case escalated and in-app officer notification created instead."
            }

        # 4. Dispatch via Twilio if configured
        if twilio_sid and twilio_auth and twilio_from:
            try:
                url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
                auth = (twilio_sid, twilio_auth)
                payload = {
                    "From": twilio_from,
                    "To": recipient_mobile,
                    "Body": message_body
                }
                res = requests.post(url, data=payload, auth=auth, timeout=10)
                data = res.json()

                if res.status_code in (200, 201) and data.get("sid"):
                    provider_msg_id = data.get("sid")
                    _log_sms_attempt(db, case_id, officer_user_id, recipient_mobile, message_body, "SENT", None, "TWILIO", provider_msg_id)
                    _update_case_notification_status(db, case_id, "SENT", None, provider_msg_id)
                    db.commit()
                    return {"success": True, "status": "SENT", "provider_message_id": provider_msg_id}
                else:
                    err_text = data.get("message") or f"Twilio API Error {res.status_code}"
                    _log_sms_attempt(db, case_id, officer_user_id, recipient_mobile, message_body, "FAILED", err_text, "TWILIO")
                    _create_in_app_fallback(db, officer_user_id, case_id, district, f"SMS Failed: {err_text}")
                    _update_case_notification_status(db, case_id, "FAILED", err_text)
                    db.commit()
                    return {"success": False, "status": "FAILED", "error": err_text}

            except Exception as e:
                err_text = str(e)
                _log_sms_attempt(db, case_id, officer_user_id, recipient_mobile, message_body, "FAILED", err_text, "TWILIO")
                _create_in_app_fallback(db, officer_user_id, case_id, district, f"SMS Network Exception: {err_text}")
                _update_case_notification_status(db, case_id, "FAILED", err_text)
                db.commit()
                return {"success": False, "status": "FAILED", "error": err_text}

        # 5. Dispatch via MSG91 if configured
        if msg91_key and msg91_sender:
            try:
                url = "https://api.msg91.com/api/v2/sendsms"
                headers = {
                    "authkey": msg91_key,
                    "Content-Type": "application/json"
                }
                payload = {
                    "sender": msg91_sender,
                    "route": "4",
                    "country": "91",
                    "sms": [{
                        "message": message_body,
                        "to": [re.sub(r"\D", "", recipient_mobile)[-10:]]
                    }]
                }
                res = requests.post(url, json=payload, headers=headers, timeout=10)
                data = res.json()
                if res.status_code == 200 and data.get("type") == "success":
                    provider_msg_id = data.get("message", "MSG91-OK")
                    _log_sms_attempt(db, case_id, officer_user_id, recipient_mobile, message_body, "SENT", None, "MSG91", provider_msg_id)
                    _update_case_notification_status(db, case_id, "SENT", None, provider_msg_id)
                    db.commit()
                    return {"success": True, "status": "SENT", "provider_message_id": provider_msg_id}
                else:
                    err_text = data.get("message") or "MSG91 rejected request"
                    _log_sms_attempt(db, case_id, officer_user_id, recipient_mobile, message_body, "FAILED", err_text, "MSG91")
                    _create_in_app_fallback(db, officer_user_id, case_id, district, f"MSG91 Failed: {err_text}")
                    _update_case_notification_status(db, case_id, "FAILED", err_text)
                    db.commit()
                    return {"success": False, "status": "FAILED", "error": err_text}
            except Exception as e:
                err_text = str(e)
                _log_sms_attempt(db, case_id, officer_user_id, recipient_mobile, message_body, "FAILED", err_text, "MSG91")
                _create_in_app_fallback(db, officer_user_id, case_id, district, f"SMS Network Exception: {err_text}")
                _update_case_notification_status(db, case_id, "FAILED", err_text)
                db.commit()
                return {"success": False, "status": "FAILED", "error": err_text}

    finally:
        db.close()

def dispatch_officer_escalation_sms_async(case_id: str, district: str, officer_user_id: str):
    """Launches SMS dispatch in a separate thread so case creation never blocks."""
    if not officer_user_id:
        return
    thread = threading.Thread(
        target=send_officer_escalation_sms,
        args=(case_id, district, officer_user_id),
        daemon=True
    )
    thread.start()

def _log_sms_attempt(db, case_id, officer_id, mobile, body, status, error=None, provider="NONE", msg_id=None):
    """Records an audit log entry for this notification attempt."""
    log = OfficerSmsLog(
        case_id=case_id,
        officer_id=officer_id,
        recipient_mobile=mobile,
        message_body=body,
        provider=provider,
        provider_message_id=msg_id,
        status=status,
        error_message=error,
        created_at=datetime.now()
    )
    db.add(log)

def _create_in_app_fallback(db, officer_id, case_id, district, note=""):
    """Guaranteed in-app alert dispatched when SMS is unconfigured or failed."""
    notif = Notification(
        user_id=officer_id,
        case_id=case_id,
        title=f"Action Required: New Case Escalation ({district})",
        message=f"Case {case_id} in {district} has been forwarded for your official agronomic review. [{note}]",
        notification_type="ASSIGNMENT",
        created_at=datetime.now()
    )
    db.add(notif)

def _update_case_notification_status(db, case_id, status, error=None, msg_id=None):
    """Updates advisory_cases notification metadata."""
    case = db.query(AdvisoryCase).filter_by(case_id=case_id).first()
    if case:
        case.officer_notification_status = status
        if msg_id:
            case.officer_sms_id = msg_id
        if error:
            case.officer_sms_error = error
