"""
Isolated Machine Learning Service for Krishi Sathi AI.
Loads and caches the trained Keras Tomato Disease Detection model and executes
leaf image inference adhering to strict validation, preprocessing, and error handling.

Note: Predictions represent probabilistic pattern classifications (possible diagnoses)
and should always be treated as preliminary indications subject to specialist verification.
"""

import os
import json
import logging
import threading
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List, Union

import numpy as np
from PIL import Image

# Configure module logger
logger = logging.getLogger("ml_service")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

# Base directory paths
BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = BASE_DIR / "ml_models" / "tomato_disease_model.keras"
DEFAULT_CLASS_NAMES_PATH = BASE_DIR / "ml_models" / "class_names.json"

# Input tensor specification
TARGET_IMAGE_SIZE = (128, 128)
EXPECTED_CHANNELS = 3

# Singleton model and class name cache
_model = None
_class_names: Optional[List[str]] = None
_model_lock = threading.Lock()


def get_model_path() -> Path:
    """Returns the resolved path to the trained .keras model."""
    env_path = os.getenv("ML_MODEL_PATH")
    if env_path and os.path.exists(env_path):
        return Path(env_path)
    return DEFAULT_MODEL_PATH


def get_class_names_path() -> Path:
    """Returns the resolved path to the class_names.json file."""
    return DEFAULT_CLASS_NAMES_PATH


def is_model_available() -> bool:
    """Checks whether the model file and class names file exist on disk."""
    return get_model_path().is_file() and get_class_names_path().is_file()


def load_class_names(class_names_path: Optional[Path] = None) -> List[str]:
    """
    Loads and caches the class names from the JSON definition.
    """
    global _class_names
    if _class_names is not None:
        return _class_names

    path = class_names_path or get_class_names_path()
    if not path.is_file():
        raise FileNotFoundError(f"Class names configuration file not found at: {path}")

    with open(path, "r", encoding="utf-8") as f:
        names = json.load(f)

    if not isinstance(names, list) or len(names) == 0:
        raise ValueError(f"Invalid class names format in {path}: expected non-empty list.")

    _class_names = names
    logger.info("Loaded %d class names from %s", len(_class_names), path)
    return _class_names


def load_model(force_reload: bool = False):
    """
    Thread-safe lazy loader for the Keras model.
    Loads the model once and retains it in memory.
    """
    global _model
    if _model is not None and not force_reload:
        return _model

    with _model_lock:
        if _model is not None and not force_reload:
            return _model

        model_path = get_model_path()
        if not model_path.is_file():
            raise FileNotFoundError(
                f"Trained tomato disease model file not found at: {model_path}"
            )

        logger.info("Loading Keras model from %s ...", model_path)
        # Import keras lazily inside load function to optimize initial app import time
        import keras

        loaded = keras.saving.load_model(str(model_path))
        _model = loaded
        logger.info("Tomato disease model loaded successfully into memory.")
        return _model


def reset_model_cache():
    """Resets cached model and class names (useful for unit testing)."""
    global _model, _class_names
    with _model_lock:
        _model = None
        _class_names = None


def format_class_name(raw_name: str) -> str:
    """
    Converts raw dataset class name (e.g. 'Tomato___Bacterial_spot')
    into a clean, human-readable display label (e.g. 'Tomato Bacterial Spot').
    """
    if not raw_name:
        return "Unknown"

    cleaned = raw_name.replace("Tomato___", "").replace("Tomato_", "")
    cleaned = cleaned.replace("_", " ").strip()
    # Normalize multiple spaces
    cleaned = " ".join(cleaned.split())

    # Add back 'Tomato' prefix for display consistency
    if not cleaned.lower().startswith("tomato"):
        display = f"Tomato - {cleaned.title()}"
    else:
        display = cleaned.title()

    if "healthy" in cleaned.lower():
        return "Tomato (Healthy)"

    return display


def preprocess_image(
    image_input: Union[str, Path, Image.Image],
    target_size: Tuple[int, int] = TARGET_IMAGE_SIZE
) -> np.ndarray:
    """
    Preprocesses an input image for model inference:
    1. Validates existence and image integrity.
    2. Converts color mode to 3-channel RGB (safely dropping alpha or converting grayscale).
    3. Resizes to target dimensions (128x128) using bilinear interpolation.
    4. Normalizes pixel values from [0, 255] to [0.0, 1.0].
    5. Adds batch dimension: returns shape (1, 128, 128, 3) as float32 numpy array.
    """
    img: Optional[Image.Image] = None

    if isinstance(image_input, Image.Image):
        img = image_input
    elif isinstance(image_input, (str, Path)):
        img_path = Path(image_input)
        if not img_path.is_file():
            raise FileNotFoundError(f"Image file does not exist: {img_path}")
        try:
            img = Image.open(img_path)
            # Verify file integrity
            img.verify()
            # Image.verify() closes or invalidates the image handle in Pillow, re-open for processing
            img = Image.open(img_path)
        except Exception as e:
            raise ValueError(f"Corrupted or invalid image file: {str(e)}") from e
    else:
        raise TypeError(f"Unsupported image input type: {type(image_input)}")

    if img is None:
        raise ValueError("Failed to open image for preprocessing.")

    # Convert to RGB (handles RGBA, Palette, Grayscale, etc.)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Resize to model input specification
    if img.size != target_size:
        img = img.resize(target_size, resample=Image.Resampling.BILINEAR)

    # Convert to float32 numpy array normalized to [0.0, 1.0]
    img_array = np.asarray(img, dtype=np.float32) / 255.0

    # Ensure shape is (height, width, channels)
    if img_array.ndim != 3 or img_array.shape != (target_size[1], target_size[0], EXPECTED_CHANNELS):
        raise ValueError(f"Unexpected image tensor shape after preprocessing: {img_array.shape}")

    # Add batch dimension: (1, 128, 128, 3)
    batch_tensor = np.expand_dims(img_array, axis=0)
    return batch_tensor


def predict_tomato_disease(
    image_input: Union[str, Path, Image.Image],
    top_k: int = 3
) -> Dict[str, Any]:
    """
    Executes disease inference on a tomato leaf image.

    Returns a standardized dictionary:
    {
        "success": bool,
        "raw_class": str or None,
        "predicted_class": str or None,
        "confidence": float or None,       # In range [0.0, 1.0]
        "is_healthy": bool,
        "top_predictions": list of {class, raw_class, confidence},
        "diagnosis_notice": str,
        "error": str or None
    }
    """
    try:
        # 1. Load model and class names
        model = load_model()
        classes = load_class_names()

        # 2. Preprocess image
        input_tensor = preprocess_image(image_input)

        # 3. Model inference
        # model.predict returns 2D array of shape (1, num_classes) with softmax probabilities
        predictions = model.predict(input_tensor, verbose=0)
        probabilities = predictions[0]

        if len(probabilities) != len(classes):
            raise ValueError(
                f"Model output dimension ({len(probabilities)}) does not match class names count ({len(classes)})."
            )

        # 4. Extract highest probability prediction
        best_idx = int(np.argmax(probabilities))
        raw_best_class = classes[best_idx]
        best_confidence = float(probabilities[best_idx])
        is_healthy = "healthy" in raw_best_class.lower()

        # 5. Extract top-k predictions
        top_indices = np.argsort(probabilities)[::-1][:top_k]
        top_list = []
        for idx in top_indices:
            raw_c = classes[idx]
            top_list.append({
                "raw_class": raw_c,
                "predicted_class": format_class_name(raw_c),
                "confidence": round(float(probabilities[idx]), 4)
            })

        return {
            "success": True,
            "raw_class": raw_best_class,
            "predicted_class": format_class_name(raw_best_class),
            "confidence": round(best_confidence, 4),
            "is_healthy": is_healthy,
            "top_predictions": top_list,
            "diagnosis_notice": (
                "Possible preliminary diagnosis based on automated visual pattern analysis. "
                "Official confirmation by an Agricultural Extension Officer is recommended."
            ),
            "error": None
        }

    except FileNotFoundError as e:
        logger.warning("Image or model file not found: %s", str(e))
        return {
            "success": False,
            "raw_class": None,
            "predicted_class": None,
            "confidence": None,
            "is_healthy": False,
            "top_predictions": [],
            "diagnosis_notice": None,
            "error": f"File not found: {str(e)}"
        }
    except (ValueError, TypeError) as e:
        logger.warning("Image validation error: %s", str(e))
        return {
            "success": False,
            "raw_class": None,
            "predicted_class": None,
            "confidence": None,
            "is_healthy": False,
            "top_predictions": [],
            "diagnosis_notice": None,
            "error": f"Validation error: {str(e)}"
        }
    except Exception as e:
        logger.exception("Unexpected error during tomato disease prediction: %s", str(e))
        return {
            "success": False,
            "raw_class": None,
            "predicted_class": None,
            "confidence": None,
            "is_healthy": False,
            "top_predictions": [],
            "diagnosis_notice": None,
            "error": f"Inference execution error: {str(e)}"
        }
