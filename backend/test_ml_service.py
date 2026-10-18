"""
Focused Test Suite for Isolated Tomato Disease ML Service.
Tests:
1. Class names loading & formatting.
2. Model singleton loading & caching.
3. Image preprocessing (RGB, RGBA, Grayscale, arbitrary sizes, normalization).
4. Prediction output structure, confidence bounds, and possible-diagnosis disclaimer.
5. Error handling on non-existent files, corrupted files, and non-image data.
6. End-to-end inference on real uploads.
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

from services.ml_service import (
    load_class_names,
    load_model,
    format_class_name,
    preprocess_image,
    predict_tomato_disease,
    is_model_available,
    TARGET_IMAGE_SIZE,
    reset_model_cache
)


class TestMLService(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_01_model_files_exist(self):
        """Verifies that model and class names exist at the expected locations."""
        self.assertTrue(is_model_available(), "Model or class names file is missing!")

    def test_02_class_names_structure(self):
        """Verifies loading the 10 PlantVillage tomato class names."""
        classes = load_class_names()
        self.assertIsInstance(classes, list)
        self.assertEqual(len(classes), 10, f"Expected 10 classes, got {len(classes)}")
        self.assertIn("Tomato___healthy", classes)
        self.assertIn("Tomato___Early_blight", classes)
        self.assertIn("Tomato___Late_blight", classes)

    def test_03_format_class_name(self):
        """Tests conversion of dataset names to user-friendly possible-diagnosis labels."""
        self.assertEqual(format_class_name("Tomato___Early_blight"), "Tomato - Early Blight")
        self.assertEqual(format_class_name("Tomato___healthy"), "Tomato (Healthy)")
        self.assertEqual(format_class_name("Tomato___Bacterial_spot"), "Tomato - Bacterial Spot")

    def test_04_model_singleton_caching(self):
        """Verifies that model is loaded once and cached in memory across calls."""
        model_a = load_model()
        model_b = load_model()
        self.assertIs(model_a, model_b, "Model was reloaded instead of using the cached singleton!")

    def test_05_preprocessing_rgb(self):
        """Verifies preprocessing an RGB image to shape (1, 128, 128, 3) normalized in [0, 1]."""
        test_img_path = self.temp_path / "test_rgb.png"
        img = Image.new("RGB", (300, 200), color=(255, 128, 64))
        img.save(test_img_path)

        tensor = preprocess_image(test_img_path)
        self.assertIsInstance(tensor, np.ndarray)
        self.assertEqual(tensor.shape, (1, 128, 128, 3))
        self.assertEqual(tensor.dtype, np.float32)
        self.assertGreaterEqual(tensor.min(), 0.0)
        self.assertLessEqual(tensor.max(), 1.0)
        # Check normalized values match original colors (255/255=1.0, 128/255~0.502, 64/255~0.251)
        np.testing.assert_allclose(tensor[0, 0, 0, :], [1.0, 128/255.0, 64/255.0], atol=1e-3)

    def test_06_preprocessing_rgba_handling(self):
        """Verifies preprocessing automatically converts 4-channel RGBA to 3-channel RGB."""
        test_img_path = self.temp_path / "test_rgba.png"
        img = Image.new("RGBA", (100, 100), color=(100, 150, 200, 128))
        img.save(test_img_path)

        tensor = preprocess_image(test_img_path)
        self.assertEqual(tensor.shape, (1, 128, 128, 3), "RGBA image was not correctly converted to 3 channels!")

    def test_07_preprocessing_grayscale_handling(self):
        """Verifies preprocessing converts single-channel grayscale to 3-channel RGB."""
        test_img_path = self.temp_path / "test_gray.jpg"
        img = Image.new("L", (80, 80), color=120)
        img.save(test_img_path)

        tensor = preprocess_image(test_img_path)
        self.assertEqual(tensor.shape, (1, 128, 128, 3), "Grayscale image was not converted to 3 channels!")

    def test_08_prediction_output_and_disclaimer(self):
        """Verifies prediction returns structured dict with confidence score and disclaimer."""
        test_img_path = self.temp_path / "synthetic_leaf.jpg"
        # Create a synthetic leaf-like image with green tones
        arr = np.random.randint(40, 180, (200, 200, 3), dtype=np.uint8)
        arr[:, :, 1] = np.clip(arr[:, :, 1] + 50, 0, 255)  # boost green
        Image.fromarray(arr).save(test_img_path)

        result = predict_tomato_disease(test_img_path)

        self.assertTrue(result["success"])
        self.assertIsNone(result["error"])
        self.assertIn("Tomato", result["predicted_class"])
        self.assertIsInstance(result["confidence"], float)
        self.assertGreaterEqual(result["confidence"], 0.0)
        self.assertLessEqual(result["confidence"], 1.0)
        self.assertIn("top_predictions", result)
        self.assertEqual(len(result["top_predictions"]), 3)
        self.assertIn("Possible", result["diagnosis_notice"])
        self.assertIsInstance(result["is_healthy"], bool)

    def test_09_error_handling_non_existent_file(self):
        """Verifies non-existent file returns success=False without crashing."""
        fake_path = self.temp_path / "does_not_exist.jpg"
        result = predict_tomato_disease(fake_path)
        self.assertFalse(result["success"])
        self.assertIn("File not found", result["error"])
        self.assertIsNone(result["confidence"])

    def test_10_error_handling_corrupted_file(self):
        """Verifies corrupted/non-image file returns success=False with clear error."""
        corrupt_path = self.temp_path / "not_an_image.txt"
        with open(corrupt_path, "w") as f:
            f.write("This is a plain text file pretending to be an image.")

        result = predict_tomato_disease(corrupt_path)
        self.assertFalse(result["success"])
        self.assertIn("Validation error", result["error"])

    def test_11_real_uploaded_case_image(self):
        """Tests prediction on an actual saved image in uploads/ if present."""
        uploads_dir = CURRENT_DIR / "uploads"
        sample_images = list(uploads_dir.glob("*.png")) + list(uploads_dir.glob("*.jpg"))
        if sample_images:
            sample_path = sample_images[0]
            result = predict_tomato_disease(sample_path)
            self.assertTrue(result["success"], f"Prediction on {sample_path.name} failed: {result.get('error')}")
            self.assertIsNotNone(result["predicted_class"])
            self.assertGreater(result["confidence"], 0.0)
            print(f"\n[Live Upload Test on {sample_path.name}] -> {result['predicted_class']} (Confidence: {round(result['confidence']*100, 2)}%)")


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestMLService)
    runner = unittest.TextTestRunner(verbosity=2)
    res = runner.run(suite)
    sys.exit(0 if res.wasSuccessful() else 1)
