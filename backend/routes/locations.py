from flask import Blueprint, request, jsonify
from services.location_service import (
    get_all_states,
    get_districts_for_state,
    get_talukas_for_district,
    get_villages_for_taluka,
    validate_location
)

locations_bp = Blueprint("locations", __name__, url_prefix="/api/locations")

@locations_bp.route("/states", methods=["GET"])
def list_states():
    """Returns all supported Indian states."""
    states = get_all_states()
    return jsonify({"success": True, "states": states}), 200

@locations_bp.route("/districts", methods=["GET"])
def list_districts():
    """Returns districts belonging to the selected state."""
    state = request.args.get("state", "").strip()
    if not state:
        return jsonify({"error": "Query param 'state' is required."}), 400
    districts = get_districts_for_state(state)
    return jsonify({"success": True, "state": state, "districts": districts}), 200

@locations_bp.route("/talukas", methods=["GET"])
def list_talukas():
    """Returns talukas/tehsils belonging to the selected state and district."""
    state = request.args.get("state", "").strip()
    district = request.args.get("district", "").strip()
    if not state or not district:
        return jsonify({"error": "Query params 'state' and 'district' are required."}), 400
    talukas = get_talukas_for_district(state, district)
    return jsonify({
        "success": True,
        "state": state,
        "district": district,
        "talukas": talukas
    }), 200

@locations_bp.route("/villages", methods=["GET"])
def list_villages():
    """Returns villages belonging to the selected taluka."""
    state = request.args.get("state", "").strip()
    district = request.args.get("district", "").strip()
    taluka = request.args.get("taluka", "").strip()
    if not state or not district or not taluka:
        return jsonify({"error": "Query params 'state', 'district', and 'taluka' are required."}), 400
    villages = get_villages_for_taluka(state, district, taluka)
    return jsonify({
        "success": True,
        "state": state,
        "district": district,
        "taluka": taluka,
        "villages": villages
    }), 200

@locations_bp.route("/validate", methods=["POST"])
def check_location():
    """Validates complete location hierarchy."""
    data = request.get_json(silent=True) or {}
    state = data.get("state", "")
    district = data.get("district", "")
    taluka = data.get("taluka", "")
    village = data.get("village", "")

    is_valid, error_msg, sanitized = validate_location(state, district, taluka, village)
    if not is_valid:
        return jsonify({"success": False, "error": error_msg}), 400

    return jsonify({"success": True, "location": sanitized}), 200
