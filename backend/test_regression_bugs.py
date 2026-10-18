"""
Regression Test Suite for Bug 1 (ML Status Consistency) and Bug 2 (Officer Review Authorization Flow).
"""

import sys
import os
import unittest
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from models.database import SessionLocal
from models.schema import AdvisoryCase, User, OfficerProfile
from services.advisory_service import update_officer_case_status, get_case_details


class TestBugRegression(unittest.TestCase):

    def test_01_bug1_ml_status_consistency_case_39da18(self):
        """Verifies CASE-39DA18 has consistent ML status, prediction, and confidence in DB and serialization."""
        db = SessionLocal()
        try:
            case = db.query(AdvisoryCase).filter_by(case_id="CASE-39DA18").first()
            self.assertIsNotNone(case, "CASE-39DA18 should exist in SQLite database")
            
            # Check DB columns
            self.assertEqual(case.ml_model_status, "ACTIVE")
            self.assertEqual(case.ml_prediction, "Tomato - Late Blight")
            self.assertAlmostEqual(case.confidence_score, 0.7267, places=4)
            self.assertEqual(case.status, "PENDING_OFFICER_REVIEW")
            self.assertIn("below calibrated threshold", case.escalation_reason)

            # Check serialization contract
            d = case.to_dict()
            self.assertEqual(d["ml_model_status"], "ACTIVE")
            self.assertEqual(d["detected_condition"], "Tomato - Late Blight")
            self.assertAlmostEqual(d["confidence_score"], 0.7267, places=4)
            self.assertEqual(d["status"], "PENDING_OFFICER_REVIEW")
            print("\n[PASS] Bug 1 Verified: CASE-39DA18 backend data is 100% consistent (ACTIVE, 72.7% confidence).")
        finally:
            db.close()

    def test_02_bug2_unverified_officer_blocked(self):
        """Verifies unverified officer is rejected with descriptive PermissionError (HTTP 403 equivalent)."""
        db = SessionLocal()
        try:
            # Find an unverified officer or verify shweta
            unverified = db.query(User).filter_by(role="officer").join(OfficerProfile).filter(
                OfficerProfile.verification_status == "PENDING_VERIFICATION"
            ).first()
            self.assertIsNotNone(unverified, "An unverified officer must exist for testing")

            unverified_id = unverified.id
            unverified_name = unverified.full_name

            officer_dict = {
                "id": unverified_id,
                "role": "officer",
                "full_name": unverified_name
            }

            with self.assertRaises(PermissionError) as ctx:
                update_officer_case_status("CASE-39DA18", officer_dict, "UNDER_REVIEW", "Test notes")

            self.assertIn("Account pending administrative verification", str(ctx.exception))
            print(f"[PASS] Bug 2: Unverified officer {unverified_name} ({unverified_id}) blocked: '{ctx.exception}'")
        finally:
            db.close()

    def test_03_bug2_out_of_jurisdiction_officer_blocked(self):
        """Verifies verified officer from Punjab cannot edit a Wardha case."""
        db = SessionLocal()
        try:
            # Dr. Harpreet Singh in Ludhiana
            punjab_officer = db.query(User).filter_by(role="officer").join(OfficerProfile).filter(
                OfficerProfile.verification_status == "VERIFIED",
                OfficerProfile.district_jurisdiction.ilike("%Ludhiana%")
            ).first()
            self.assertIsNotNone(punjab_officer, "Punjab officer should exist")

            officer_dict = {
                "id": punjab_officer.id,
                "role": "officer",
                "full_name": punjab_officer.full_name
            }

            with self.assertRaises(PermissionError) as ctx:
                update_officer_case_status("CASE-39DA18", officer_dict, "UNDER_REVIEW", "Reviewing Wardha case")

            self.assertIn("outside your assigned jurisdiction", str(ctx.exception))
            print(f"[PASS] Bug 2: Out-of-jurisdiction officer blocked: '{ctx.exception}'")
        finally:
            db.close()

    def test_04_bug2_invalid_status_rejected(self):
        """Verifies invalid status transitions are rejected with ValueError."""
        officer = {"id": "user_officer_01", "role": "officer", "full_name": "Dr. Sunita Sharma"}
        with self.assertRaises(ValueError) as ctx:
            update_officer_case_status("CASE-39DA18", officer, "MAGICAL_STATUS", "Invalid test")
        self.assertIn("Invalid case status", str(ctx.exception))
        print(f"[PASS] Bug 2: Invalid status rejected: '{ctx.exception}'")

    def test_05_bug2_resolved_without_prescription_rejected(self):
        """Verifies marking RESOLVED without final_advisory is rejected."""
        officer = {"id": "user_officer_01", "role": "officer", "full_name": "Dr. Sunita Sharma"}
        with self.assertRaises(ValueError) as ctx:
            update_officer_case_status("CASE-39DA18", officer, "RESOLVED", "Notes only", final_advisory="")
        self.assertIn("final agronomic prescription", str(ctx.exception))
        print(f"[PASS] Bug 2: RESOLVED without prescription rejected: '{ctx.exception}'")

    def test_06_bug2_verified_in_jurisdiction_officer_save_success(self):
        """Verifies verified, authorized officer successfully updates case and preserves resolution."""
        officer = {"id": "user_officer_01", "role": "officer", "full_name": "Dr. Sunita Sharma"}
        
        # Step A: Update to UNDER_REVIEW
        res_review = update_officer_case_status(
            "CASE-39DA18", officer, "UNDER_REVIEW", "Foliar necrosis inspection in progress."
        )
        self.assertEqual(res_review["status"], "UNDER_REVIEW")
        self.assertEqual(res_review["officer_notes"], "Foliar necrosis inspection in progress.")
        self.assertIsNone(res_review["final_advisory"])

        # Step B: Resolve with verified prescription
        prescription = "Spray Metalaxyl 8% + Mancozeb 64% WP @ 2.5g/L water. Remove infected lower leaves immediately."
        res_resolved = update_officer_case_status(
            "CASE-39DA18", officer, "RESOLVED", "Confirmed late blight phytophthora.", final_advisory=prescription
        )
        self.assertEqual(res_resolved["status"], "RESOLVED")
        self.assertEqual(res_resolved["final_advisory"], prescription)
        self.assertIsNotNone(res_resolved["resolved_at"])

        # Verify persisted in DB
        db = SessionLocal()
        case_db = db.query(AdvisoryCase).filter_by(case_id="CASE-39DA18").first()
        self.assertEqual(case_db.status, "RESOLVED")
        self.assertEqual(case_db.final_advisory, prescription)
        self.assertIsNotNone(case_db.resolved_at)
        
        # Reset back to PENDING_OFFICER_REVIEW for ongoing platform stability
        case_db.status = "PENDING_OFFICER_REVIEW"
        case_db.officer_notes = None
        case_db.final_advisory = None
        case_db.resolved_at = None
        db.commit()
        db.close()
        print("[PASS] Bug 2: Verified officer resolution & persistence verified, test case cleanly restored.")


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestBugRegression)
    runner = unittest.TextTestRunner(verbosity=2)
    res = runner.run(suite)
    sys.exit(0 if res.wasSuccessful() else 1)
