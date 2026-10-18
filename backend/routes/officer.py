from flask import Blueprint, request, jsonify
from services.advisory_service import (
    get_all_officer_cases, update_officer_case_status, get_case_details, get_feedback_summary
)
from routes.auth import officer_required, extract_token_from_request, get_user_by_token

officer_bp = Blueprint("officer", __name__)

# Backward-compatibility wrappers
def get_all_cases():
    res = get_all_officer_cases()
    return res.get("cases", [])

def update_officer_review(case_id, status, notes):
    officer_dummy = {"id": "user_officer_01", "full_name": "Dr. Sunita Sharma", "role": "officer"}
    return update_officer_case_status(case_id, officer_dummy, status, notes)

@officer_bp.route("/cases", methods=["GET"])
def list_officer_cases():
    """
    Module 5: Lists cases with real-time KPI counts, filter by priority,
    filter by status, and full text search.
    """
    priority = request.args.get("priority")
    status = request.args.get("status")
    search = request.args.get("search")

    result = get_all_officer_cases(filter_priority=priority, filter_status=status, search=search)
    return jsonify(result), 200

@officer_bp.route("/case/<case_id>", methods=["GET"])
def get_case(case_id):
    """Retrieves full case dossier with message thread and activity logs."""
    token = extract_token_from_request()
    current_user = get_user_by_token(token) if token else {"id": "guest_officer", "role": "officer"}
    
    details = get_case_details(case_id, current_user)
    if not details:
        return jsonify({"error": f"Case {case_id} not found."}), 404
    return jsonify({"success": True, "case": details}), 200

@officer_bp.route("/review/<case_id>", methods=["POST"])
@officer_required
def submit_review(case_id):
    """
    Module 5: Updates case lifecycle status and records specialist advisory.
    """
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    notes = data.get("notes", "")
    final_advisory = data.get("final_advisory", "")

    current_user = getattr(request, "current_user", None)
    if not current_user:
        token = extract_token_from_request()
        current_user = get_user_by_token(token)

    try:
        updated_case = update_officer_case_status(case_id, current_user, status, notes, final_advisory)
        return jsonify({
            "success": True,
            "message": f"Case {case_id} updated by agricultural specialist.",
            "case": updated_case
        }), 200
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Review update failed: {str(e)}"}), 500

@officer_bp.route("/feedback-summary", methods=["GET"])
def feedback_summary():
    """Module 7: Returns genuine aggregated farmer satisfaction ratings and written feedback."""
    token = extract_token_from_request()
    current_user = get_user_by_token(token) if token else {"id": "officer", "role": "officer"}
    data = get_feedback_summary(current_user)
    return jsonify({"success": True, "summary": data}), 200
