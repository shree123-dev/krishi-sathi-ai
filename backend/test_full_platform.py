import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000"

def test_full_pipeline():
    print("=== STARTING FULL PLATFORM INTEGRATION TEST ===")
    
    # 1. Health Check
    res = requests.get(f"{BASE_URL}/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] 1. Backend Health Check OK")
    
    # 2. Farmer Registration & Login
    rand_id = int(time.time())
    farmer_mobile = f"987{str(rand_id)[-7:]}"
    farmer_data = {
        "mobile": farmer_mobile,
        "email": f"farmer_{rand_id}@test.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "full_name": f"Ramesh Test Patil {rand_id}",
        "role": "farmer",
        "village": "Ashti",
        "district": "Wardha",
        "state": "Maharashtra",
        "pincode": "442202",
        "preferred_language": "Marathi",
        "crops_cultivated": "Cotton, Soybean",
        "farm_area": 4.5,
        "area_unit": "Acres"
    }
    
    res = requests.post(f"{BASE_URL}/api/auth/register", json=farmer_data)
    assert res.status_code == 201, f"Farmer registration failed: {res.text}"
    farmer_json = res.json()["data"]
    farmer_token = farmer_json["token"]
    print(f"[PASS] 2. Farmer Registered successfully: {farmer_json['user']['full_name']}")
    
    # 3. Officer Login (using pre-seeded verified officer Dr. Sunita Sharma)
    officer_login = {
        "identifier": "officer@krishisathi.ai",
        "password": "password123"
    }
    res = requests.post(f"{BASE_URL}/api/auth/login", json=officer_login)
    assert res.status_code == 200, f"Officer login failed: {res.text}"
    officer_token = res.json()["data"]["token"]
    print("[PASS] 3. Officer Login OK (Dr. Sunita Sharma - VERIFIED)")
    
    # 4. Submit Case Inquiry by Farmer (Module 3 - AI Escalation)
    headers_farmer = {"Authorization": f"Bearer {farmer_token}"}
    case_payload = {
        "crop_name": "Cotton",
        "growth_stage": "Flowering / Boll Formation",
        "location": "Ashti, Wardha, Maharashtra",
        "question": "Leaves showing red marginal scorching and curling upwards. Are thrips or jassids responsible?"
    }
    
    res = requests.post(f"{BASE_URL}/api/advisory/submit", data=case_payload, headers=headers_farmer)
    assert res.status_code in (200, 201), f"Case submission failed: {res.text}"
    case_data = res.json()["data"]
    case_id = case_data["case_id"]
    print(f"[PASS] 4. Case Created: {case_id} (Status: {case_data['status']}, Escalation Reason: {case_data.get('escalation_reason')})")
    
    # 5. Officer Inspects Case Dossier
    headers_officer = {"Authorization": f"Bearer {officer_token}"}
    res = requests.get(f"{BASE_URL}/api/advisory/case/{case_id}", headers=headers_officer)
    assert res.status_code == 200, f"Officer get case failed: {res.text}"
    dossier = res.json()["case"]
    print(f"[PASS] 5. Officer Retrieved Dossier for {dossier['case_id']} (Priority: {dossier.get('priority')})")
    
    # 6. Officer Sends Message Requesting Clarification (Module 4)
    msg_payload = {
        "message": "Hello Ramesh ji, please check under the leaves. Do you see tiny green wedge-shaped insects jumping when disturbed? Also let us know the date of your last fertilizer application."
    }
    res = requests.post(f"{BASE_URL}/api/advisory/case/{case_id}/messages", json=msg_payload, headers=headers_officer)
    assert res.status_code == 201, f"Officer send message failed: {res.text}"
    print("[PASS] 6. Officer sent clarification message to farmer")
    
    # 7. Farmer Replies with requested info
    farmer_reply = {
        "message": "Yes madam, tiny light-green insects are jumping. Last urea application was 10 days ago (1 bag/acre)."
    }
    res = requests.post(f"{BASE_URL}/api/advisory/case/{case_id}/messages", json=farmer_reply, headers=headers_farmer)
    assert res.status_code == 201, f"Farmer reply failed: {res.text}"
    print("[PASS] 7. Farmer replied with pest observation")
    
    # 8. Check Message Thread
    res = requests.get(f"{BASE_URL}/api/advisory/case/{case_id}/messages", headers=headers_farmer)
    assert res.status_code == 200
    msgs = res.json()["messages"]
    assert len(msgs) >= 2, f"Expected at least 2 messages, got {len(msgs)}"
    print(f"[PASS] 8. Two-Way Message Thread verified ({len(msgs)} messages)")
    
    # 9. Officer Reviews and Issues Prescription (Module 5)
    review_payload = {
        "status": "RESOLVED",
        "notes": "Jassid (leafhopper) infestation confirmed by hopper burn symptoms.",
        "final_advisory": "Spray Flonicamid 50 WG @ 60g/acre or Dinotefuran 20 SG @ 60g/acre in 200 liters of water. Avoid excess nitrogenous fertilizer (Urea) which accelerates succulence and pest proliferation. Re-inspect after 5 days."
    }
    res = requests.post(f"{BASE_URL}/api/officer/review/{case_id}", json=review_payload, headers=headers_officer)
    assert res.status_code == 200, f"Officer review failed: {res.text}"
    print(f"[PASS] 9. Officer Resolved Case & Issued Official Prescription for {case_id}")
    
    # 10. Farmer Submits Satisfaction Feedback & Rating (Module 7)
    feedback_payload = {
        "rating": 5,
        "was_helpful": True,
        "written_feedback": "Dr. Sunita Sharma responded within minutes. The Flonicamid spray controlled the jassid hopper burn completely!",
        "outcome_update": "New leaves are emerging green and healthy. Boll shedding prevented."
    }
    res = requests.post(f"{BASE_URL}/api/advisory/case/{case_id}/feedback", json=feedback_payload, headers=headers_farmer)
    assert res.status_code == 201, f"Feedback submission failed: {res.text}"
    print("[PASS] 10. Farmer Feedback (5 Stars) submitted successfully")
    
    # 11. Officer Reviews Aggregated Feedback Summary (Module 7)
    res = requests.get(f"{BASE_URL}/api/officer/feedback-summary", headers=headers_officer)
    assert res.status_code == 200
    summary = res.json()["summary"]
    print(f"[PASS] 11. Feedback Summary: Avg Rating {summary.get('average_rating')}/5, Helpfulness: {summary.get('helpfulness_percentage')}% (Total: {summary.get('total_feedbacks')})")
    
    # 12. Environmental Cluster Data Test (Module 8)
    res = requests.get(f"{BASE_URL}/api/advisory/environmental-cluster?location=Wardha, Maharashtra")
    assert res.status_code == 200
    env = res.json()
    assert env.get("source"), "Missing data source"
    assert "temperature" in env, "Missing temperature"
    print(f"[PASS] 12. Environmental Cluster Data: {env.get('location')} - Temp: {env.get('temperature')}°C, Humidity: {env.get('relative_humidity')}%, Soil: {env.get('soil_moisture_status')}")
    
    print("\n=== ALL 12 INTEGRATION PIPELINE TESTS PASSED WITH 100% SUCCESS! ===")

if __name__ == "__main__":
    test_full_pipeline()
