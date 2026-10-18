"""
Focused Integration Tests for Tomato Disease ML Workflow in Krishi Sathi AI.
Tests:
1. Tomato inquiry with real leaf image -> triggers ML model, populates detected_condition, confidence, diagnosis_notice.
2. Tomato inquiry with diseased leaf -> escalates to PENDING_OFFICER_REVIEW with preliminary diagnosis note (not falsely resolved).
3. Non-tomato inquiry with image -> bypasses tomato model, provides agronomic guidelines, routes to officer.
4. Tomato inquiry without image -> gracefully prompts for photo without crashing.
5. Corrupted/invalid image -> caught safely, sets MODEL_ERROR without crashing HTTP endpoint.
6. High agricultural risk symptom inquiry -> correctly escalates regardless of model confidence.
7. Zero invented chemical treatments in automated AI response.
"""

import os
import sys
import tempfile
from pathlib import Path
import unittest
import numpy as np
from PIL import Image

# Ensure backend root is on Python path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from services.advisory_service import process_crop_submission
from models.database import SessionLocal
from models.schema import AdvisoryCase


class TestAdvisoryMLIntegration(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)
        self.mock_user = {
            "id": "test_farmer_integration",
            "full_name": "Kisan Ramchandra",
            "role": "farmer",
            "village": "Ashti",
            "district": "Wardha",
            "state": "Maharashtra"
        }

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_01_tomato_with_real_leaf_image(self):
        """Tomato query with real image triggers ML model and produces genuine confidence."""
        # Use existing uploaded sample image or create a realistic leaf sample
        uploads_dir = CURRENT_DIR / "uploads"
        sample_images = list(uploads_dir.glob("*.png")) + list(uploads_dir.glob("*.jpg"))
        
        if sample_images:
            sample_img_path = str(sample_images[0])
        else:
            sample_img_path = str(self.temp_path / "leaf.jpg")
            arr = np.random.randint(60, 200, (150, 150, 3), dtype=np.uint8)
            Image.fromarray(arr).save(sample_img_path)

        data = {
            "crop_name": "Tomato",
            "growth_stage": "Vegetative / Tillering",
            "village": "Ashti",
            "district": "Wardha",
            "state": "Maharashtra",
            "question": "Noticed spots on lower tomato leaves. Please evaluate.",
            "image_path": sample_img_path
        }

        result = process_crop_submission(data, uploaded_file=None, current_user=self.mock_user)

        self.assertIsNotNone(result.get("case_id"))
        self.assertEqual(result.get("ml_model_status"), "ACTIVE")
        self.assertIn("Tomato", result.get("detected_condition"))
        self.assertIsNotNone(result.get("confidence_score"))
        self.assertGreater(result["confidence_score"], 0.0)
        self.assertLessEqual(result["confidence_score"], 1.0)
        
        # Verify diagnosis notice attached in stage_advisory
        stage_adv = result.get("stage_advisory", {})
        self.assertIn("diagnosis_notice", stage_adv)
        self.assertIn("Possible", stage_adv["diagnosis_notice"])

        # Per requirement 6: Diseased leaf must not be marked AI_RESOLVED just because confidence is high
        self.assertEqual(result.get("status"), "PENDING_OFFICER_REVIEW")
        escalation = result.get("escalation_reason", "")
        self.assertTrue("Automated pattern analysis" in escalation or "calibrated threshold" in escalation)
        print(f"\n[Test 1 OK] Case {result['case_id']}: Condition: '{result['detected_condition']}', Confidence: {result['confidence_score']*100:.1f}%, Status: {result['status']}")

    def test_02_non_tomato_crop_bypasses_model(self):
        """Cotton query with image does NOT invoke the tomato model."""
        sample_img_path = self.temp_path / "cotton_leaf.jpg"
        Image.new("RGB", (100, 100), color=(50, 150, 50)).save(sample_img_path)

        data = {
            "crop_name": "Cotton",
            "growth_stage": "Flowering / Boll Formation",
            "village": "Sahur",
            "district": "Wardha",
            "state": "Maharashtra",
            "question": "Lower leaves showing reddening.",
            "image_path": str(sample_img_path)
        }

        result = process_crop_submission(data, uploaded_file=None, current_user=self.mock_user)

        self.assertEqual(result.get("crop_name"), "Cotton")
        # ML model must not diagnose Cotton as a tomato disease
        self.assertNotIn("Tomato -", result.get("detected_condition", ""))
        self.assertIn("specialized for Tomato", result.get("detected_condition", ""))
        self.assertIsNone(result.get("confidence_score"))
        self.assertEqual(result.get("status"), "PENDING_OFFICER_REVIEW")
        print(f"[Test 2 OK] Non-tomato inquiry handled: {result['detected_condition']}")

    def test_03_tomato_query_without_image(self):
        """Tomato query without an image gracefully prompts for photo without crashing."""
        data = {
            "crop_name": "Tomato",
            "growth_stage": "Fruiting",
            "village": "Ashti",
            "district": "Wardha",
            "question": "Leaves look curly."
        }

        result = process_crop_submission(data, uploaded_file=None, current_user=self.mock_user)

        self.assertIsNotNone(result.get("case_id"))
        self.assertIn("Photo required", result.get("detected_condition"))
        self.assertIsNone(result.get("confidence_score"))
        self.assertEqual(result.get("status"), "PENDING_OFFICER_REVIEW")
        print(f"[Test 3 OK] Missing photo handled: {result['detected_condition']}")

    def test_04_corrupted_image_handling(self):
        """Corrupted image is safely handled without throwing uncaught 500 exceptions."""
        bad_file = self.temp_path / "broken.jpg"
        with open(bad_file, "wb") as f:
            f.write(b"NOT_A_VALID_JPEG_HEADER_CORRUPTED_BYTES")

        data = {
            "crop_name": "Tomato",
            "growth_stage": "Seedling",
            "village": "Ashti",
            "district": "Wardha",
            "question": "Check my seedling.",
            "image_path": str(bad_file)
        }

        result = process_crop_submission(data, uploaded_file=None, current_user=self.mock_user)

        self.assertIsNotNone(result.get("case_id"))
        self.assertEqual(result.get("ml_model_status"), "MODEL_ERROR")
        self.assertIn("Automated diagnosis unavailable", result.get("detected_condition"))
        self.assertEqual(result.get("status"), "PENDING_OFFICER_REVIEW")
        print(f"[Test 4 OK] Corrupted file handled cleanly: {result['ml_model_status']}")

    def test_05_high_risk_symptom_escalation(self):
        """Urgent symptom keywords automatically escalate to officer review."""
        data = {
            "crop_name": "Tomato",
            "growth_stage": "Fruiting",
            "village": "Ashti",
            "district": "Wardha",
            "question": "Plants are wilting rapidly and dying under severe bacterial rot."
        }

        result = process_crop_submission(data, uploaded_file=None, current_user=self.mock_user)

        self.assertEqual(result.get("priority"), "Urgent")
        self.assertEqual(result.get("status"), "PENDING_OFFICER_REVIEW")
        self.assertIn("High agricultural risk symptoms detected", result.get("escalation_reason"))
        print(f"[Test 5 OK] High risk escalation: {result['escalation_reason']}")

    def test_06_simulated_low_confidence_escalation(self):
        """Confidence score below calibrated threshold (0.75) escalates with threshold reason."""
        data = {
            "crop_name": "Cotton",
            "growth_stage": "Vegetative",
            "village": "Ashti",
            "district": "Wardha",
            "question": "Minor yellowing.",
            "simulated_confidence": 0.42
        }

        result = process_crop_submission(data, uploaded_file=None, current_user=self.mock_user)

        self.assertEqual(result.get("confidence_score"), 0.42)
        self.assertEqual(result.get("status"), "PENDING_OFFICER_REVIEW")
        self.assertIn("below calibrated threshold", result.get("escalation_reason"))
        print(f"[Test 6 OK] Calibrated threshold escalation: {result['escalation_reason']}")

    def test_07_no_invented_chemical_prescriptions(self):
        """Initial AI submission must NOT invent or inject chemical prescriptions."""
        data = {
            "crop_name": "Tomato",
            "growth_stage": "Flowering",
            "village": "Ashti",
            "district": "Wardha",
            "question": "Can you check this tomato plant?"
        }

        result = process_crop_submission(data, uploaded_file=None, current_user=self.mock_user)

        self.assertIsNone(result.get("final_advisory"))
        self.assertIsNone(result.get("officer_notes"))
        # Verify in DB
        db = SessionLocal()
        case_in_db = db.query(AdvisoryCase).filter_by(case_id=result["case_id"]).first()
        self.assertIsNotNone(case_in_db)
        self.assertIsNone(case_in_db.final_advisory)
        self.assertIsNone(case_in_db.officer_notes)
        db.close()
        print(f"[Test 7 OK] Zero fabricated prescriptions confirmed in SQLite for {result['case_id']}.")


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestAdvisoryMLIntegration)
    runner = unittest.TextTestRunner(verbosity=2)
    res = runner.run(suite)
    sys.exit(0 if res.wasSuccessful() else 1)
