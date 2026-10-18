from flask import Blueprint, request, jsonify
from services.advisory_service import (
    process_crop_submission, get_farmer_cases, get_case_details,
    add_case_message, get_case_messages, submit_farmer_feedback
)
from services.weather_service import get_weather_context
from routes.auth import extract_token_from_request, get_user_by_token
from config import Config

advisory_bp = Blueprint("advisory", __name__)

@advisory_bp.route("/status", methods=["GET"])
def model_status():
    """Returns explicit ML Model connectivity status (Module 3)."""
    return jsonify({
        "ml_model_loaded": Config.ML_MODEL_ENABLED,
        "ml_model_path": Config.ML_MODEL_PATH or None,
        "status_label": "Model Active (Tomato Disease Detection)" if Config.ML_MODEL_ENABLED else "Model Offline / Not Loaded",
        "notice": "Trained Keras CNN model active for Tomato foliar disease classification." if Config.ML_MODEL_ENABLED else "Machine learning model has not been trained or integrated yet.",
        "confidence_reporting": "Calibrated softmax probabilities active" if Config.ML_MODEL_ENABLED else "Disabled until model connection to prevent fabricated scores.",
        "escalation_threshold": Config.CONFIDENCE_ESCALATION_THRESHOLD
    }), 200

@advisory_bp.route("/submit", methods=["POST"])
def submit_advisory_case():
    """Receives farmer query submission with multipart/form-data or json."""
    try:
        uploaded_file = None
        if request.files and "image" in request.files:
            uploaded_file = request.files["image"]

        if request.form:
            data = request.form.to_dict()
        else:
            data = request.get_json(silent=True) or {}

        # Validate mandatory field presence
        crop_name = data.get("crop_name", "").strip()
        location = (data.get("village") or data.get("location") or "").strip()
        growth_stage = data.get("growth_stage", "").strip()

        if not crop_name or not location or not growth_stage:
            return jsonify({
                "error": "Missing required fields",
                "required": ["crop_name", "location (or village)", "growth_stage"]
            }), 400

        token = extract_token_from_request()
        current_user = get_user_by_token(token) if token else None

        case_result = process_crop_submission(data, uploaded_file, current_user)
        return jsonify({
            "success": True,
            "message": "Crop inquiry received. Case created, weather synced, and escalated to Agricultural Extension Specialist.",
            "data": case_result
        }), 201

    except Exception as e:
        return jsonify({
            "error": "Failed to process crop advisory submission",
            "details": str(e)
        }), 500

@advisory_bp.route("/history", methods=["GET"])
def farmer_history():
    """Module 6: Complete Query and Advisory History for farmer."""
    token = extract_token_from_request()
    current_user = get_user_by_token(token) if token else {"id": None, "full_name": request.args.get("farmer_name", "")}

    crop_filter = request.args.get("crop")
    status_filter = request.args.get("status")

    cases = get_farmer_cases(current_user, crop_filter=crop_filter, status_filter=status_filter)
    return jsonify({
        "total": len(cases),
        "cases": cases
    }), 200

@advisory_bp.route("/case/<case_id>", methods=["GET"])
def view_case_details(case_id):
    """Retrieves full case details with messages, officer profile, and feedback."""
    token = extract_token_from_request()
    current_user = get_user_by_token(token) if token else None

    try:
        details = get_case_details(case_id, current_user)
        if not details:
            return jsonify({"error": f"Case {case_id} not found."}), 404
        return jsonify({"success": True, "case": details}), 200
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403

# Module 4: Two-Way Farmer–Officer Communication
@advisory_bp.route("/case/<case_id>/messages", methods=["GET"])
def fetch_messages(case_id):
    """Retrieves all messages in the conversation thread for a case."""
    token = extract_token_from_request()
    current_user = get_user_by_token(token) if token else {"id": "guest", "role": "farmer"}
    messages = get_case_messages(case_id, current_user)
    return jsonify({"success": True, "messages": messages}), 200

@advisory_bp.route("/case/<case_id>/messages", methods=["POST"])
def post_message(case_id):
    """Farmer or Officer sends message or additional photo in thread."""
    try:
        uploaded_file = None
        if request.content_type and "multipart/form-data" in request.content_type:
            data = request.form.to_dict()
            if "attachment" in request.files:
                uploaded_file = request.files["attachment"]
        else:
            data = request.get_json(silent=True) or {}

        message_text = data.get("message_text") or data.get("message", "")
        token = extract_token_from_request()
        current_user = get_user_by_token(token)
        if not current_user:
            current_user = {
                "id": data.get("sender_id", "farmer"),
                "full_name": data.get("sender_name", "Farmer"),
                "role": data.get("sender_role", "farmer")
            }

        new_msg = add_case_message(case_id, current_user, message_text, uploaded_file)
        return jsonify({"success": True, "message": new_msg}), 201

    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to send message: {str(e)}"}), 500

# Module 7: Farmer Satisfaction, Ratings, and Feedback
@advisory_bp.route("/case/<case_id>/feedback", methods=["POST"])
def submit_feedback(case_id):
    """Submits 1-5 star rating and satisfaction feedback for resolved cases."""
    try:
        data = request.get_json(silent=True) or {}
        rating = int(data.get("rating", 5))
        was_helpful = bool(data.get("was_helpful", True))
        written_feedback = data.get("written_feedback")
        outcome_update = data.get("outcome_update")

        token = extract_token_from_request()
        current_user = get_user_by_token(token) if token else {"id": "guest", "full_name": "Farmer"}

        fb = submit_farmer_feedback(case_id, current_user, rating, was_helpful, written_feedback, outcome_update)
        return jsonify({"success": True, "message": "Thank you! Your feedback has been recorded.", "feedback": fb}), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Feedback submission failed: {str(e)}"}), 500

# Module 8: Live Environmental and Agricultural Cluster Data
@advisory_bp.route("/weather", methods=["GET"])
def fetch_weather():
    """Returns free weather context for a given location."""
    location = request.args.get("location", "Local Farm")
    weather = get_weather_context(location)
    return jsonify(weather), 200

@advisory_bp.route("/environmental-cluster", methods=["GET"])
def environmental_cluster():
    """
    Module 8: Real agro-meteorological cluster data.
    Clearly specifies observation source, timestamps, and marks unavailable sensor values honestly.
    """
    village = request.args.get("village") or request.args.get("location") or "Wardha, Maharashtra"
    weather = get_weather_context(village)

    return jsonify({
        "success": True,
        "location": weather.get("location"),
        "source": weather.get("source"),
        "observation_time": weather.get("source"),
        "temperature": weather.get("temperature"),
        "air_temperature": weather.get("temperature"),
        "air_temperature_unit": weather.get("temperature_unit"),
        "relative_humidity": weather.get("relative_humidity"),
        "humidity_unit": weather.get("humidity_unit"),
        "wind_speed": weather.get("wind_speed"),
        "wind_unit": weather.get("wind_unit"),
        "rainfall_risk": weather.get("rainfall_risk"),
        "weather_condition": weather.get("condition"),
        "agro_weather_advisory": weather.get("advisory_weather_note"),
        # Explicit honesty per Module 8: "Do not invent soil moisture, humidity, or other sensor values."
        "soil_moisture": None,
        "soil_moisture_status": "Physical in-ground sensor unavailable; regional agro-meteorological model active.",
        "soil_temperature": None,
        "soil_temperature_status": "Sensor hardware not detected in this cluster.",
        "soil_ph": None,
        "soil_ph_status": "Soil pH requires certified lab test or digital pH probe."
    }), 200
