# 🌱 Krishi Sathi AI
## AI-Powered Crop Health Detection and Context-Aware Farmer Advisory System

> **Internship Capstone Project**  
> *“Smarter Farming. Healthier Crops. Better Harvests.”*  
> An intelligent agronomic diagnostic and advisory platform combining computer-vision leaf disease detection, multi-modal farmer input, localized microclimate context, secure authentication, and verified agricultural extension officer escalation.

---

## 📋 Executive Overview & Highlights

1. **Integrated Tomato Disease Detection Model**: A Convolutional Neural Network trained in Google Colab using TensorFlow/Keras on PlantVillage tomato leaf images, loaded and cached in memory for real-time inference on uploaded crop photos.
2. **Transparent Machine Learning Status**: Predictions display calibrated softmax probabilities and dynamic notices clarifying that vision inference provides a preliminary visual pattern analysis requiring officer confirmation before chemical intervention.
3. **Calibrated Confidence & Automated Escalation Engine**: Model confidence scores below the calibrated threshold (75%) or inquiries containing severe agricultural risk symptoms automatically escalate to `PENDING_OFFICER_REVIEW`.
4. **Agriculture Extension Officer Triage Portal**: Real-time management portal featuring dynamic KPIs, multi-parameter case filtering, two-way messaging with farmers, and an atomic case resolution workflow requiring official agronomic prescriptions.
5. **Role-Based Security & Territorial Jurisdiction**: Enforces officer credential verification (`verification_status == 'VERIFIED'`) and regional jurisdiction matching (officers can only review cases within their assigned district or state).
6. **Multi-Modal Diagnostic Capture**: Farmers can submit leaf/crop images, type symptom observations, or use voice query input in regional languages.
7. **Multi-Tier Cascading Administrative Locations**: Dynamic four-level location cascading (State -> District -> Taluka/Tehsil -> Village) for localized crop advisories without orphaned inputs.
8. **Server-Side Session Persistence**: Cryptographic SHA-256 token hashing in SQLite (`user_sessions`), surviving server restarts and providing server-side revocation on logout.
9. **Context-Aware Agro-Meteorology**: Real-time microclimate sync (temperature, relative humidity, wind speed, precipitation risk) via Open-Meteo endpoints with regional agro-meteorological fallbacks.
10. **Trilingual Internationalization (i18n)**: Native UI support for **English**, **हिन्दी (Hindi)**, and **मराठी (Marathi)**.

---

## 🤖 Machine Learning Model Specification

### Model Architecture & Artifacts
- **Model File**: `backend/ml_models/tomato_disease_model.keras` (37.88 MB)
- **Class Mapping**: `backend/ml_models/class_names.json`
- **Inference Service**: `backend/services/ml_service.py`
- **Singleton Caching**: Thread-safe memory caching via `threading.Lock()`; the model is loaded once on first inference.

### 10 Detectable Tomato Leaf Conditions
The integrated model classifies tomato leaf images into 10 distinct classes:

| # | Dataset Label | Display Diagnosis Label | Classification Type |
|---|---|---|---|
| 1 | `Tomato___Bacterial_spot` | Tomato - Bacterial Spot | Bacterial Disease |
| 2 | `Tomato___Early_blight` | Tomato - Early Blight | Fungal Disease |
| 3 | `Tomato___Late_blight` | Tomato - Late Blight | Oomycete / Water Mold |
| 4 | `Tomato___Leaf_Mold` | Tomato - Leaf Mold | Fungal Disease |
| 5 | `Tomato___Septoria_leaf_spot` | Tomato - Septoria Leaf Spot | Fungal Disease |
| 6 | `Tomato___Spider_mites Two-spotted_spider_mite` | Tomato - Two-Spotted Spider Mite | Pest Infestation |
| 7 | `Tomato___Target_Spot` | Tomato - Target Spot | Fungal Disease |
| 8 | `Tomato___Tomato_Yellow_Leaf_Curl_Virus` | Tomato - Yellow Leaf Curl Virus | Viral Disease (Whitefly Vector) |
| 9 | `Tomato___Tomato_mosaic_virus` | Tomato - Mosaic Virus | Viral Disease |
| 10 | `Tomato___healthy` | Tomato (Healthy) | Healthy Plant Tissue |

### Input Preprocessing Pipeline
1. **Validation**: Validates image existence and format integrity using Pillow (`PIL.Image.verify()`), rejecting corrupted files safely without throwing 500 errors.
2. **Channel Normalization**: Converts input color mode to 3-channel RGB (safely discarding alpha channels from PNGs or expanding single-channel grayscale).
3. **Resizing**: Resizes input to `(128, 128)` pixels using bilinear interpolation (`Image.Resampling.BILINEAR`).
4. **Pixel Normalization**: Scales pixel intensities from integer range `[0, 255]` to floating-point range `[0.0, 1.0]` (`float32`).
5. **Batch Dimension**: Expands array to shape `(1, 128, 128, 3)` for model evaluation.

### Held-Out Evaluation Accuracy vs. Real-World Disclaimer
> [!IMPORTANT]
> The reported test accuracy of **93.39%** was evaluated on held-out test splits of the curated PlantVillage tomato leaf dataset under controlled laboratory imaging conditions.
> **This metric does not guarantee identical accuracy under unconstrained, real-world field conditions.** Real agricultural environments present complex variables including variable sunlight, harsh shadows, lens blur, pest-co-infections, and cluttered background soil or foliage.
> 
> Therefore, Krishi Sathi AI treats vision model predictions strictly as **preliminary pattern indications**. No chemical prescriptions or pesticide applications are automated; all suspected disease cases are routed to verified Agricultural Extension Officers for confirmation. Non-tomato crop submissions (e.g. Cotton, Soybean, Wheat) safely bypass the tomato vision model and provide stage-based agronomic guidelines.

---

## 🔑 Pre-Seeded Test Credentials

The local database comes initialized with verified test accounts:

| Role | Identifier / Email | Mobile | Password | Details |
|---|---|---|---|---|
| **Farmer** | `farmer@krishisathi.ai` | `9876543210` | `password123` | Ramesh Patel (Wardha, Maharashtra) |
| **Extension Officer** | `officer@krishisathi.ai` | `9123456780` | `password123` | Dr. Sunita Sharma (Verified, Wardha/Nagpur/Amravati Jurisdiction) |

> *Tip: On the Login screen, click **🌱 Demo Farmer** or **🛡️ Demo Officer** to prefill credentials with a single click.*

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite 8 | Single-page application with component modularity |
| **Reverse Proxy** | Vite Dev/Preview Proxy | Routes `/api` and `/uploads` directly to `127.0.0.1:5000` |
| **Styling & Icons** | Vanilla CSS + Lucide React | Curated agricultural emerald green theme, micro-interactions |
| **Backend** | Python 3.10+ & Flask | RESTful API with Blueprints, session tokens, and input validation |
| **Machine Learning** | TensorFlow 2.19 / Keras | CNN inference on tomato leaf images |
| **Image Processing** | Pillow (PIL) + NumPy | RGB conversion, 128×128 resizing, and tensor normalization |
| **Database** | SQLite + SQLAlchemy ORM | Local persistence with relational schema (PostgreSQL ready) |
| **Agro-Weather** | Open-Meteo Free API | Real-time meteorological sync with zero paid API keys |

---

## 📁 Repository Structure

```
crop-health-advisory/
├── .env.example                     # Environment configuration template
├── .gitignore                       # Git exclusions (.db, .env, venv, node_modules)
├── README.md                        # Project documentation & architectural guide
├── backend/
│   ├── app.py                       # Flask entry point with CORS, Blueprints & sys.path
│   ├── config.py                    # Configurations, thresholds & environment settings
│   ├── requirements.txt             # Backend dependencies (Flask, TensorFlow, SQLAlchemy)
│   ├── krishi_sathi.db              # Local SQLite database (git-ignored)
│   ├── ml_models/
│   │   ├── tomato_disease_model.keras # Trained Keras CNN model (37.88 MB)
│   │   └── class_names.json         # 10 PlantVillage class label mappings
│   ├── models/
│   │   ├── database.py              # SQLAlchemy engine, session maker, init_db()
│   │   └── schema.py                # Database models (User, Profiles, Cases, Sessions)
│   ├── routes/
│   │   ├── auth.py                  # /api/auth (register, login, me, officer verification)
│   │   ├── advisory.py              # /api/advisory (submit, status, history, weather)
│   │   ├── officer.py               # /api/officer (case triage, reviews, metrics)
│   │   ├── locations.py             # /api/locations (states, districts, talukas, villages)
│   │   └── health.py                # /api/health (system health check)
│   ├── services/
│   │   ├── ml_service.py            # Model loading, image preprocessing & inference
│   │   ├── advisory_service.py      # Case triage, history, status & escalation logic
│   │   ├── auth_service.py          # User management, password hashing & sessions
│   │   ├── location_service.py      # Indian administrative boundary data
│   │   ├── sms_service.py           # SMS dispatch logic, rate-limiting & in-app fallback
│   │   └── weather_service.py       # Live microclimate sync via Open-Meteo
│   ├── test_ml_service.py           # ML isolated unit test suite (11 tests)
│   ├── test_advisory_ml_integration.py # ML advisory workflow integration suite (7 tests)
│   ├── test_regression_bugs.py      # Dedicated Bug 1 & Bug 2 regression suite (6 tests)
│   ├── test_case_status_resolution.py # Case lifecycle & jurisdiction suite (8 tests)
│   ├── test_targeted_improvements.py  # Validation & escalation suite (9 tests)
│   ├── test_full_platform.py        # End-to-end integration pipeline suite (12 tests)
│   ├── test_session_persistence.py  # Session hashing & reboot survival suite (8 tests)
│   └── uploads/                     # Uploaded leaf photos (git-ignored)
└── frontend/
    ├── package.json                 # React 19, Lucide icons, Vite
    ├── vite.config.js               # Vite config with reverse proxy for /api and /uploads
    ├── index.html                   # HTML entry point with typography
    └── src/
        ├── App.jsx                  # Top-level view coordinator & auth state
        ├── index.css                # Design system & responsive layout styling
        ├── i18n/
        │   ├── LanguageContext.jsx  # Language context provider
        │   └── translations.js      # English, Hindi, and Marathi dictionaries
        ├── services/
        │   └── api.js               # API service with proxy routing & error handling
        └── components/
            ├── Navbar.jsx           # Header, language selector, and profile menu
            ├── LandingPage.jsx      # Agritech homepage & workflow overview
            ├── LoginPage.jsx        # Login with demo buttons & forgot-password modal
            ├── RegisterPage.jsx     # Registration with cascading location selectors
            ├── FarmerDashboard.jsx  # Farmer portal with history & quick actions
            ├── OfficerDashboard.jsx # Officer triage portal with search & dynamic KPIs
            ├── CropForm.jsx         # Multi-modal input form (image, text, voice)
            ├── ImageUploader.jsx    # Photo dropzone & preview
            ├── VoiceQueryInput.jsx  # Web Speech API voice capture
            ├── WeatherContext.jsx   # Microclimate widget
            ├── AnalysisResult.jsx   # Dynamic ML model status & agronomic advice
            └── CaseDetailModal.jsx  # Officer case inspection & prescription modal
```

---

## ⚡ Quick Start: Running the Project Locally

### 1. Prerequisites
- **Python** (v3.10 or v3.11 recommended for TensorFlow compatibility)
- **Node.js** (v18 or higher) and **npm**

---

### 2. Start Backend (Flask API)

Open a terminal in the project root:

```powershell
# Navigate to backend directory
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run the Flask API
python app.py
```
> The backend will listen on **`http://127.0.0.1:5000`**.  
> Test health: [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health)

---

### 3. Start Frontend (React + Vite)

Open a **separate** terminal in the project root:

```powershell
# Navigate to frontend directory
cd frontend

# Start the Vite development server
npm run dev
```
> Open your browser to **`http://localhost:5173`**.  
> The Vite dev server automatically proxies `/api` and `/uploads` requests to the Flask backend.

---

## 🧪 Running the Backend Regression Test Suites

Krishi Sathi AI includes seven automated test suites covering ML inference, API integration, session persistence, role security, and end-to-end user workflows.

Run each test suite from the `backend/` directory with the virtual environment activated:

```powershell
cd backend
.\venv\Scripts\Activate.ps1

# 1. Machine Learning Unit Tests (11 tests)
# Tests model loading, preprocessing, RGBA/grayscale handling, and error safety
python test_ml_service.py

# 2. Advisory ML Integration Tests (7 tests)
# Tests tomato disease prediction flow, non-tomato bypass, and threshold escalation
python test_advisory_ml_integration.py

# 3. Bug Regression Tests (6 tests)
# Tests status consistency (CASE-39DA18) and officer authorization/jurisdiction checks
python test_regression_bugs.py

# 4. Case Status & Resolution Tests (8 tests)
# Tests atomic prescription saving, intermediate statuses, and unauthorized rejections
python test_case_status_resolution.py

# 5. Targeted Improvements Tests (9 tests)
# Tests location cascading, strong password rules, SMS idempotency, and history
python test_targeted_improvements.py

# 6. Full Platform Integration Pipeline (12 tests)
# Tests registration, login, case submission, officer messaging, resolution, and ratings
python test_full_platform.py

# 7. Session Persistence Tests (8 tests)
# Tests SHA-256 token hashing, session survival across server restarts, and revocation
python test_session_persistence.py
```

### Running Frontend Checks

```powershell
cd frontend

# Production Build Verification
npm run build

# Code Linting
npm run lint
```

---

## 🔍 Implemented Features vs. Planned Enhancements

| Component | Implemented in Current System | Planned Future Enhancements |
|---|---|---|
| **Crop Vision Models** | Trained Keras CNN for Tomato (10 classes, 93.39% test accuracy) | Multi-crop expansion for Cotton, Soybean, and Rice diseases |
| **Environmental Context** | Real-time agro-meteorological sync via Open-Meteo REST API | Physical in-ground IoT soil moisture, NPK, and temperature sensors |
| **SMS Notifications** | Masked recipient logging, rate limiting, and guaranteed in-app alert fallback | Live external SMS gateway dispatch (Twilio / MSG91 API activation) |
| **Storage Architecture** | SQLite zero-setup database with SQLAlchemy models | Direct connection to managed PostgreSQL database in production |
| **Farmer Communications** | In-app two-way messaging thread with image attachments | Push notifications & WhatsApp Business API integration |

---

## 📄 License & Attribution

Developed for academic and internship demonstration.
- **Dataset**: PlantVillage Tomato Leaf Disease Dataset.
- **Meteorological Data**: Courtesy of [Open-Meteo](https://open-meteo.com/) (Free Open API).
- **Icons**: [Lucide React](https://lucide.dev/).
