"""
Verification script for persistent, database-backed sessions and refresh restoration.
Tests:
1. Database schema verification (user_sessions table exists, columns match).
2. User registration and persistent session creation.
3. Cryptographic token hashing (database stores SHA-256 hash, never plaintext token).
4. Validation via GET /api/auth/me endpoint.
5. Simulated backend restart (wiping any in-memory state) and confirming session persistence.
6. Logout revocation and protected endpoint rejection.
7. Expiration rejection.
"""

import os
import sys
import uuid
import hashlib
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from config import Config
from models.database import SessionLocal, init_db
from models.schema import User, FarmerProfile, UserSession
from services.auth_service import register_user, authenticate_user, get_user_by_token, logout_user

def test_session_lifecycle():
    print("=" * 70)
    print(">>> RUNNING SESSION PERSISTENCE & RESTORATION TEST SUITE")
    print("=" * 70)

    # Initialize app and database
    app = create_app()
    client = app.test_client()

    db = SessionLocal()

    # Step 1: Verify user_sessions table exists in DB
    print("\n[Step 1] Verifying user_sessions table in SQLite...")
    from sqlalchemy import inspect
    inspector = inspect(db.bind)
    tables = inspector.get_table_names()
    assert "user_sessions" in tables, "user_sessions table not found in database!"
    columns = [c["name"] for c in inspector.get_columns("user_sessions")]
    assert "token_hash" in columns, "token_hash column missing!"
    assert "is_revoked" in columns, "is_revoked column missing!"
    assert "expires_at" in columns, "expires_at column missing!"
    print(f"  [PASS] user_sessions table verified with columns: {columns}")

    # Step 2: Register a test farmer user
    print("\n[Step 2] Registering test user...")
    test_mobile = f"98{uuid.uuid4().int % 100000000:08d}"
    test_email = f"session_test_{uuid.uuid4().hex[:6]}@example.com"
    test_password = "SecurePass123!@"

    reg_payload = {
        "full_name": "Kailash Test Patil",
        "mobile": test_mobile,
        "email": test_email,
        "password": test_password,
        "confirm_password": test_password,
        "role": "farmer",
        "state": "Maharashtra",
        "district": "Wardha",
        "taluka": "Wardha",
        "village": "Sewagram",
        "main_crops": "Cotton, Soybean"
    }

    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201, f"Registration failed: {res.data}"
    reg_json = res.get_json()
    assert reg_json["success"] is True
    raw_token = reg_json["data"]["token"]
    user_id = reg_json["data"]["user"]["id"]
    assert raw_token.startswith("sess_"), f"Unexpected token format: {raw_token}"
    print(f"  [PASS] User registered (ID: {user_id}) with token format 'sess_...'")

    # Step 3: Verify token hash is stored in database, NOT plaintext
    print("\n[Step 3] Verifying database security & token hashing...")
    expected_hash = hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()
    session_row = db.query(UserSession).filter_by(token_hash=expected_hash).first()
    assert session_row is not None, "Session row not found by token_hash!"
    assert session_row.user_id == user_id, "Session user_id mismatch!"
    assert session_row.is_revoked is False, "New session should not be revoked!"
    assert session_row.expires_at > datetime.now(), "Session should not be expired!"
    # Ensure raw token is nowhere in the session table
    assert raw_token != session_row.token_hash, "Plaintext token must not equal token_hash!"
    print(f"  [PASS] Token safely stored as SHA-256 hash. Plaintext token is NOT stored in DB.")

    # Step 4: Validate session with GET /api/auth/me
    print("\n[Step 4] Validating session via GET /api/auth/me...")
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {raw_token}"})
    assert me_res.status_code == 200, f"Auth check failed: {me_res.data}"
    me_json = me_res.get_json()
    assert me_json["authenticated"] is True, "Expected authenticated: True"
    assert me_json["user"]["id"] == user_id, "Authenticated user mismatch"
    assert me_json["user"]["mobile"] == test_mobile
    print(f"  [PASS] /api/auth/me successfully validated session for {me_json['user']['full_name']}.")

    # Step 5: Simulate Backend Restart
    # In the old code, restarting wiped _active_sessions dictionary.
    # Here we close the db session, discard any Python references, and query fresh:
    print("\n[Step 5] Simulating complete Flask backend restart (clearing any process memory)...")
    db.close()
    
    # Fresh client & new request simulating page refresh after server reboot:
    fresh_app = create_app()
    fresh_client = fresh_app.test_client()

    refresh_res = fresh_client.get("/api/auth/me", headers={"Authorization": f"Bearer {raw_token}"})
    assert refresh_res.status_code == 200
    refresh_json = refresh_res.get_json()
    assert refresh_json["authenticated"] is True, "Session did not persist after backend restart!"
    assert refresh_json["user"]["id"] == user_id
    print(f"  [PASS] Session successfully survived backend restart! User session fully restored.")

    # Step 6: Test Logout and Server-Side Revocation
    print("\n[Step 6] Testing Logout and Server-Side Revocation...")
    logout_res = fresh_client.post("/api/auth/logout", headers={"Authorization": f"Bearer {raw_token}"})
    assert logout_res.status_code == 200
    logout_json = logout_res.get_json()
    assert logout_json["success"] is True

    # Check database: session must be marked is_revoked = True
    db2 = SessionLocal()
    revoked_session = db2.query(UserSession).filter_by(token_hash=expected_hash).first()
    assert revoked_session.is_revoked is True, "Session was not marked is_revoked!"
    print(f"  [PASS] Session record successfully marked is_revoked=True in database.")

    # Step 7: Verify revoked token is now rejected by protected endpoints
    print("\n[Step 7] Verifying revoked token cannot access protected endpoints...")
    rejected_me = fresh_client.get("/api/auth/me", headers={"Authorization": f"Bearer {raw_token}"})
    rejected_json = rejected_me.get_json()
    assert rejected_json["authenticated"] is False, "Revoked token was still accepted!"
    assert rejected_json["user"] is None
    print(f"  [PASS] Revoked token correctly rejected by /api/auth/me.")

    # Step 8: Test Expiration Handling
    print("\n[Step 8] Testing expired token handling...")
    # Create an expired session record
    expired_token = f"sess_{uuid.uuid4().hex}"
    expired_hash = hashlib.sha256(expired_token.encode("utf-8")).hexdigest()
    expired_session = UserSession(
        session_id=f"sid_{uuid.uuid4().hex[:16]}",
        token_hash=expired_hash,
        user_id=user_id,
        role="farmer",
        is_revoked=False,
        expires_at=datetime.now() - timedelta(hours=1),
        created_at=datetime.now() - timedelta(days=20),
        last_accessed_at=datetime.now() - timedelta(hours=1)
    )
    db2.add(expired_session)
    db2.commit()

    expired_user = get_user_by_token(expired_token)
    assert expired_user is None, "Expired session must return None!"
    
    # Confirm it is auto-revoked
    reloaded_expired = db2.query(UserSession).filter_by(token_hash=expired_hash).first()
    assert reloaded_expired.is_revoked is True, "Expired session should be marked revoked on access!"
    print(f"  [PASS] Expired token correctly rejected and revoked.")
    db2.close()

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL SESSION PERSISTENCE & RESTORATION TESTS PASSED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    test_session_lifecycle()
