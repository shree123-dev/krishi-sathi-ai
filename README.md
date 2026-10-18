# 🌱 Krishi Sathi AI
## AI-Powered Crop Health Detection and Context-Aware Farmer Advisory System

> **Internship Project**  
> *“Smarter Farming. Healthier Crops. Better Harvests.”*  
> An intelligent agronomic diagnostic and advisory platform combining multi-modal farmer input, localized microclimate context, secure authentication, and agricultural extension officer escalation.

---

## 📋 Project Highlights

1. **Attractive Landing Page**: Modern agricultural technology startup landing experience introducing the platform, core features, 4-step workflow, benefits, and call to action.
2. **Registration & Secure Authentication**: Fully functional registration and login flows with hashed passwords (`werkzeug.security`), role-based routing (Farmer vs. Agriculture Extension Officer), session tokens, and password recovery.
3. **Multi-Modal Diagnostic Capture**: Farmers can submit leaf/crop images, type symptom observations, or use voice query input in regional languages.
4. **Context-Aware Agro-Meteorology**: Real-time microclimate sync (temperature, relative humidity, wind speed, precipitation risk) via Open-Meteo's open endpoints with zero paid API dependencies.
5. **Transparent Machine Learning Status**: Clear disclaimers stating that custom computer-vision model weights are in training; no fabricated predictions or fake confidence numbers are ever displayed (`Confidence: N/A — Model Not Connected`).
6. **Upgraded Farmer Dashboard**: Personalized greetings, field location prefill, quick-action cards, live weather context, and a **Recent Farm Inquiries & Case History** tracking section.
7. **Upgraded Extension Officer Dashboard**: Real-time triage portal featuring dynamic KPI metrics, instant keyword search, priority filter tags, and a case inspection & verified prescription modal.
8. **Relational Database Foundation**: Prepared PostgreSQL schema and data models in `backend/models/case.py`.

---

## 🔑 Demo Login Accounts

For testing and evaluation, the backend comes pre-seeded with verified demo accounts:

| Role | Email | Mobile | Password | Notes |
|---|---|---|---|---|
| **Farmer** | `farmer@krishisathi.ai` | `9876543210` | `password123` | Ramesh Patel (Wardha, Maharashtra) |
| **Agriculture Officer** | `officer@krishisathi.ai` | `9123456780` | `password123` | Dr. Sunita Sharma (Nagpur Extension Center) |

> *Tip: On the Login screen, click the **🌱 Demo Farmer** or **🛡️ Demo Officer** buttons to populate credentials with one click!*

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite | Fast single-page application with modern responsive UI |
| **Styling & Icons** | Vanilla CSS + Lucide React | Curated agricultural emerald green theme, micro-interactions |
| **Backend** | Python 3 + Flask + Flask-CORS | REST API handling auth, advisory submission, and officer reviews |
| **Security** | Werkzeug Security | Secure password hashing (`generate_password_hash`, `check_password_hash`) |
| **Agro-Weather** | Open-Meteo Free API | Live meteorological context without paid API keys |
| **Database** | PostgreSQL *(Integration Ready)* | Schema and DDL defined in `backend/models/case.py` |

---

## 📁 Repository Structure

```
crop-health-advisory/
├── .env.example                     # Environment configuration template
├── .gitignore                       # Git ignore file for Python, Node, and envs
├── README.md                        # Project documentation
├── backend/
│   ├── app.py                       # Flask entry point with CORS & Blueprints
│   ├── config.py                    # Configurations & env settings
│   ├── requirements.txt             # Flask, Flask-Cors, python-dotenv, requests
│   ├── .env.example                 # Backend environment template
│   ├── routes/
│   │   ├── auth.py                  # /api/auth/register, login, me, forgot-password
│   │   ├── advisory.py              # /api/advisory/submit, status, history, weather
│   │   ├── officer.py               # /api/officer/cases & review endpoints
│   │   └── health.py                # Health check endpoint
│   ├── services/
│   │   ├── auth_service.py          # User management, password hashing & sessions
│   │   ├── advisory_service.py      # Case triage, history, and stage guidance
│   │   └── weather_service.py       # Zero-paid-key weather context engine
│   └── models/
│       └── case.py                  # PostgreSQL schema definition & data classes
└── frontend/
    ├── package.json                 # React 19, Lucide icons, Vite
    ├── vite.config.js               # Vite configuration
    ├── index.html                   # HTML entry point with typography
    ├── src/
    │   ├── main.jsx                 # React root mounting
    │   ├── App.jsx                  # Top-level view coordinator & auth state
    │   ├── index.css                # Agricultural design system & responsive styling
    │   ├── services/
    │   │   └── api.js               # API service with auth & offline resilience
    │   └── components/
    │       ├── Navbar.jsx           # Dynamic navigation header & profile menu
    │       ├── LandingPage.jsx      # Attractive Krishi Sathi AI homepage
    │       ├── LoginPage.jsx        # Login with demo buttons & forgot-password modal
    │       ├── RegisterPage.jsx     # Registration with role & language selection
    │       ├── FarmerDashboard.jsx  # Upgraded farmer portal with history & quick actions
    │       ├── OfficerDashboard.jsx # Upgraded officer portal with search & dynamic KPIs
    │       ├── CropForm.jsx         # Multi-modal input form (image, text, voice)
    │       ├── ImageUploader.jsx    # Photo dropzone & preview
    │       ├── VoiceQueryInput.jsx  # Web Speech API voice capture
    │       ├── WeatherContext.jsx   # Microclimate widget
    │       └── AnalysisResult.jsx   # Honest ML disclaimer & agronomic advice
```

---

## ⚡ Quick Start: Running the Project Locally

### 1. Prerequisites
- **Node.js** (v18 or higher) and **npm**
- **Python** (v3.10 or higher)

---

### 2. Run Backend (Flask API)

Open a terminal window in the project root:

```powershell
# Navigate to backend directory
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start the Flask API
python app.py
```
> The backend will start on **`http://127.0.0.1:5000`**.  
> Test health: [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health)

---

### 3. Run Frontend (React + Vite)

Open a **separate** terminal window in the project root:

```powershell
# Navigate to frontend directory
cd frontend

# Start the Vite development server
npm run dev
```
> Open your browser to **`http://localhost:5173`**.

---

## 🧪 Testing the User Flows

1. **Explore the Landing Page**:
   - Scroll through the hero section, core features, 4-step workflow, and benefits.
   - Click **Get Started Free** or **Live Workspace** in the navbar to open the application dashboard.
2. **Test Authentication**:
   - Click **Login** in the top navbar.
   - Click **🌱 Demo Farmer** to fill credentials and click **Sign In**.
   - Notice the customized welcome banner: *"Namaste, Ramesh Patel!"*, with Wardha pre-selected as field location.
   - Click **Sign Out** from the user badge and test **Register** to create a custom farmer or officer profile.
3. **Submit a Crop Inquiry**:
   - Enter or select a crop (e.g. *Cotton*), select growth stage (*Flowering / Anthesis*).
   - Test the 3 inputs: attach an image, type symptom notes, or click **Speak Your Query**.
   - Click **Submit Crop Inquiry & Generate Advisory**.
   - Review the honest disclaimer (`Confidence: N/A — Model Not Connected`), context weather, and growth stage guidance.
   - Scroll down to check your inquiry in the **Recent Farm Inquiries & Case History** section.
4. **Officer Review Workflow**:
   - Sign in as **🛡️ Demo Officer** (or switch to Officer Portal).
   - Use the **search bar** to find cases by crop or farmer name.
   - Click **Inspect & Review** on any case, select a decision (e.g. *Verified by Officer*), type specialist guidance, and save.
   - Notice the dynamic KPIs (*Pending Review*, *Verified & Prescribed*) update instantly.
