"""
Focused test suite for officer case status lifecycle, jurisdiction enforcement, and resolution persistence.
Tests:
1. Officer review with UNDER_REVIEW preserves non-resolved state.
2. Officer review with AWAITING_FARMER_RESPONSE preserves non-resolved state.
3. Officer review with RESOLVED saves prescription and status atomically.
4. Attempting to resolve without prescription is rejected (400).
5. Attempting to pass an invalid status is rejected (400).
6. Unauthorized officer modifying a case outside jurisdiction is rejected (403).
7. Unverified officer is rejected (403).
8. Farmer history returns accurate persisted status.
"""

import os
import sys
import uuid
from datetime import datetime

# Ensure backend root on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models.database import SessionLocal
from models.schema import User, OfficerProfile, AdvisoryCase, UserSession
from services.auth_service import register_user, authenticate_user
from services.advisory_service import process_crop_submission

def run_tests():
    print("=" * 70)
    print(">>> RUNNING FOCUSED CASE STATUS & JURISDICTION TEST SUITE")
    print("=" * 70)

    app = create_app()
    client = app.test_client()
    db = SessionLocal()

    # 1. Setup Verified Officer A (Wardha, Maharashtra)
    officer_a_mobile = f"97{uuid.uuid4().int % 100000000:08d}"
    officer_a_pwd = "SecureOfficer123!@"
    reg_off_a = register_user({
        "full_name": "Dr. Sunita Sharma",
        "mobile": officer_a_mobile,
        "email": f"sharma_{uuid.uuid4().hex[:6]}@kvk.in",
        "password": officer_a_pwd,
        "confirm_password": officer_a_pwd,
        "role": "officer",
        "official_designation": "Senior Plant Pathologist",
        "department": "Department of Agriculture",
        "institution": "Krishi Vigyan Kendra, Wardha",
        "district_jurisdiction": "Wardha, Nagpur, Amravati",
        "state": "Maharashtra"
    })
    token_off_a = reg_off_a["token"]
    user_id_off_a = reg_off_a["user"]["id"]

    # Mark Officer A as VERIFIED in DB
    prof_a = db.query(OfficerProfile).filter_by(user_id=user_id_off_a).first()
    prof_a.verification_status = "VERIFIED"
    prof_a.verified_at = datetime.now()
    db.commit()

    # 2. Setup Verified Officer B (Punjab only jurisdiction)
    officer_b_mobile = f"96{uuid.uuid4().int % 100000000:08d}"
    reg_off_b = register_user({
        "full_name": "Dr. Harpreet Singh",
        "mobile": officer_b_mobile,
        "email": f"harpreet_{uuid.uuid4().hex[:6]}@pau.edu",
        "password": officer_a_pwd,
        "confirm_password": officer_a_pwd,
        "role": "officer",
        "official_designation": "Extension Agronomist",
        "department": "Punjab Agricultural University",
        "institution": "PAU Ludhiana",
        "district_jurisdiction": "Ludhiana, Jalandhar",
        "state": "Punjab"
    })
    token_off_b = reg_off_b["token"]
    user_id_off_b = reg_off_b["user"]["id"]
    prof_b = db.query(OfficerProfile).filter_by(user_id=user_id_off_b).first()
    prof_b.verification_status = "VERIFIED"
    db.commit()

    # 3. Setup Unverified Officer C
    officer_c_mobile = f"95{uuid.uuid4().int % 100000000:08d}"
    reg_off_c = register_user({
        "full_name": "Officer Pending Verification",
        "mobile": officer_c_mobile,
        "email": f"pending_{uuid.uuid4().hex[:6]}@gov.in",
        "password": officer_a_pwd,
        "confirm_password": officer_a_pwd,
        "role": "officer",
        "district_jurisdiction": "Wardha",
        "state": "Maharashtra"
    })
    token_off_c = reg_off_c["token"]

    # 4. Setup Farmer in Wardha, Maharashtra
    farmer_mobile = f"94{uuid.uuid4().int % 100000000:08d}"
    reg_farmer = register_user({
        "full_name": "Gajanan Patil",
        "mobile": farmer_mobile,
        "password": officer_a_pwd,
        "confirm_password": officer_a_pwd,
        "role": "farmer",
        "state": "Maharashtra",
        "district": "Wardha",
        "taluka": "Wardha",
        "village": "Sewagram"
    })
    token_farmer = reg_farmer["token"]
    user_farmer = reg_farmer["user"]

    # Create a test case in Wardha
    case_res = process_crop_submission({
        "crop_name": "Tomato",
        "growth_stage": "Flowering",
        "village": "Sewagram",
        "taluka": "Wardha",
        "district": "Wardha",
        "state": "Maharashtra",
        "question": "Tomato leaf curl and yellow mottling observed on 20% of plants."
    }, uploaded_file=None, current_user=user_farmer)
    test_case_id = case_res["case_id"]
    print(f"\n[Setup OK] Created test Case {test_case_id} (Crop: Tomato, District: Wardha, Status: {case_res['status']})")

    # TEST 1: Saving an UNDER_REVIEW case preserves non-resolved state
    print("\n--- Test 1: Preserving UNDER_REVIEW Status ---")
    headers_a = {"Authorization": f"Bearer {token_off_a}"}
    res_under = client.post(f"/api/officer/review/{test_case_id}", json={
        "status": "UNDER_REVIEW",
        "notes": "Suspecting Tomato Yellow Leaf Curl Virus (TYLCV). Sent leaf tissue to district lab.",
        "final_advisory": ""
    }, headers=headers_a)
    assert res_under.status_code == 200, f"Expected 200, got {res_under.data}"
    
    # Verify in DB
    db_case = db.query(AdvisoryCase).filter_by(case_id=test_case_id).first()
    assert db_case.status == "UNDER_REVIEW", f"Expected UNDER_REVIEW, got {db_case.status}"
    assert db_case.resolved_at is None, "resolved_at must be None for UNDER_REVIEW"
    assert "TYLCV" in db_case.officer_notes
    print("  [PASS] Test 1: UNDER_REVIEW status, notes, and non-resolved state verified in SQLite.")

    # TEST 2: Preserving AWAITING_FARMER_RESPONSE
    print("\n--- Test 2: Preserving AWAITING_FARMER_RESPONSE Status ---")
    res_await = client.post(f"/api/officer/review/{test_case_id}", json={
        "status": "AWAITING_FARMER_RESPONSE",
        "notes": "Asked farmer to check for whitefly populations under lower leaves.",
        "final_advisory": ""
    }, headers=headers_a)
    assert res_await.status_code == 200
    db_case = db.query(AdvisoryCase).filter_by(case_id=test_case_id).first()
    assert db_case.status == "AWAITING_FARMER_RESPONSE"
    assert db_case.resolved_at is None
    print("  [PASS] Test 2: AWAITING_FARMER_RESPONSE status preserved correctly in SQLite.")

    # TEST 3: Attempting to RESOLVE without final_advisory is rejected (400)
    print("\n--- Test 3: Rejecting RESOLVED Without Prescription ---")
    res_no_adv = client.post(f"/api/officer/review/{test_case_id}", json={
        "status": "RESOLVED",
        "notes": "Tried to close without giving prescription",
        "final_advisory": ""
    }, headers=headers_a)
    assert res_no_adv.status_code == 400, f"Expected 400, got {res_no_adv.status_code}"
    print("  [PASS] Test 3: Resolving without prescription correctly rejected with 400 Bad Request.")

    # TEST 4: Attempting invalid status is rejected (400)
    print("\n--- Test 4: Rejecting Invalid Status ---")
    res_inv = client.post(f"/api/officer/review/{test_case_id}", json={
        "status": "COMPLETELY_CURED_CUSTOM",
        "notes": "Custom invented status"
    }, headers=headers_a)
    assert res_inv.status_code == 400
    print("  [PASS] Test 4: Invented status rejected with 400 Bad Request.")

    # TEST 5: Unauthorized Officer Jurisdiction Enforcement (403)
    print("\n--- Test 5: Rejecting Officer Outside Jurisdiction ---")
    headers_b = {"Authorization": f"Bearer {token_off_b}"} # Punjab officer
    res_juris = client.post(f"/api/officer/review/{test_case_id}", json={
        "status": "UNDER_REVIEW",
        "notes": "Trying to edit Maharashtra case from Punjab jurisdiction"
    }, headers=headers_b)
    assert res_juris.status_code == 403, f"Expected 403 Forbidden, got {res_juris.status_code}"
    print("  [PASS] Test 5: Punjab officer prevented from editing Wardha case (403 Forbidden).")

    # TEST 6: Unverified Officer Rejection (403)
    print("\n--- Test 6: Rejecting Unverified Officer ---")
    headers_c = {"Authorization": f"Bearer {token_off_c}"}
    res_unver = client.post(f"/api/officer/review/{test_case_id}", json={
        "status": "UNDER_REVIEW",
        "notes": "Unverified officer attempt"
    }, headers=headers_c)
    assert res_unver.status_code == 403
    print("  [PASS] Test 6: Unverified officer rejected with 403 Forbidden.")

    # TEST 7: Atomically Resolving Case and Persisting Prescription
    print("\n--- Test 7: Resolving Case & Saving Prescription Atomically ---")
    final_rx = "Confirmed whitefly vector transmission of TYLCV. Install yellow sticky traps (15/acre). Spray Diafenthiuron 50 WP @ 250g/acre or Pyriproxyfen 10 EC @ 400ml/acre in 200 liters of water."
    res_resolve = client.post(f"/api/officer/review/{test_case_id}", json={
        "status": "RESOLVED",
        "notes": "Lab confirmed TYLCV. Official vector management advisory issued.",
        "final_advisory": final_rx
    }, headers=headers_a)
    assert res_resolve.status_code == 200

    db_case = db.query(AdvisoryCase).filter_by(case_id=test_case_id).first()
    assert db_case.status == "RESOLVED", f"Expected RESOLVED in DB, got {db_case.status}"
    assert db_case.final_advisory == final_rx
    assert db_case.resolved_at is not None
    print(f"  [PASS] Test 7: Case {test_case_id} status updated to RESOLVED and prescription persisted together!")

    # TEST 8: Farmer History API Reflects Persisted Status
    print("\n--- Test 8: Farmer History Reflects Persisted Status ---")
    headers_farmer = {"Authorization": f"Bearer {token_farmer}"}
    hist_res = client.get(f"/api/advisory/history", headers=headers_farmer)
    assert hist_res.status_code == 200
    farmer_cases = hist_res.get_json()["cases"]
    matching = [c for c in farmer_cases if c["case_id"] == test_case_id]
    assert len(matching) == 1
    assert matching[0]["status"] == "RESOLVED"
    assert matching[0]["final_advisory"] == final_rx
    print("  [PASS] Test 8: Farmer history endpoint correctly returns persisted status RESOLVED and prescription.")

    db.close()
    print("\n" + "=" * 70)
    print("[SUCCESS] ALL 8 FOCUSED CASE STATUS & RESOLUTION TESTS PASSED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
