import os
import json
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from config import Config

engine = create_engine(
    Config.DATABASE_URL,
    connect_args={"check_same_thread": False} if Config.DATABASE_URL.startswith("sqlite") else {},
    echo=False
)

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()

def get_db():
    """Dependency helper to get a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables and seeds baseline demo data safely."""
    # Import all models so that Base.metadata has all table definitions
    import models.schema # noqa
    Base.metadata.create_all(bind=engine)
    _apply_safe_migrations()
    _seed_initial_data()

def _apply_safe_migrations():
    """Ensures existing tables acquire any new columns without data loss."""
    from sqlalchemy import text
    with engine.connect() as conn:
        # Check farmer_profiles columns
        try:
            res = conn.execute(text("PRAGMA table_info(farmer_profiles)")).fetchall()
            farmer_cols = [row[1] for row in res]
            if "taluka" not in farmer_cols:
                conn.execute(text("ALTER TABLE farmer_profiles ADD COLUMN taluka VARCHAR(100) DEFAULT 'Not Specified'"))
                conn.commit()
        except Exception:
            pass

        # Check advisory_cases columns
        try:
            res = conn.execute(text("PRAGMA table_info(advisory_cases)")).fetchall()
            case_cols = [row[1] for row in res]
            if "taluka" not in case_cols:
                conn.execute(text("ALTER TABLE advisory_cases ADD COLUMN taluka VARCHAR(100)"))
                conn.commit()
            if "officer_notification_status" not in case_cols:
                conn.execute(text("ALTER TABLE advisory_cases ADD COLUMN officer_notification_status VARCHAR(50) DEFAULT 'PENDING'"))
                conn.commit()
            if "officer_sms_id" not in case_cols:
                conn.execute(text("ALTER TABLE advisory_cases ADD COLUMN officer_sms_id VARCHAR(100)"))
                conn.commit()
            if "officer_sms_error" not in case_cols:
                conn.execute(text("ALTER TABLE advisory_cases ADD COLUMN officer_sms_error TEXT"))
                conn.commit()
        except Exception:
            pass

def _seed_initial_data():
    """Seeds baseline demo accounts and sample cases if empty."""
    from werkzeug.security import generate_password_hash
    from models.schema import User, FarmerProfile, OfficerProfile, AdvisoryCase, CaseMessage, CaseActivityLog

    db = SessionLocal()
    try:
        # 1. Seed Demo Farmer
        farmer = db.query(User).filter_by(mobile="9876543210").first()
        if not farmer:
            farmer = User(
                id="user_farmer_01",
                full_name="Ramesh Patel",
                mobile="9876543210",
                email="farmer@krishisathi.ai",
                password_hash=generate_password_hash("password123"),
                role="farmer"
            )
            db.add(farmer)
            db.flush()

            farmer_profile = FarmerProfile(
                user_id=farmer.id,
                village="Wardha",
                district="Wardha",
                state="Maharashtra",
                pincode="442001",
                preferred_language="Hindi",
                main_crops="Cotton, Soybean",
                farm_area=4.5,
                farm_area_unit="Acres",
                crop_growth_stage="Flowering / Anthesis"
            )
            db.add(farmer_profile)

        # 2. Seed Demo Verified Agriculture Officer
        officer = db.query(User).filter_by(mobile="9123456780").first()
        if not officer:
            officer = User(
                id="user_officer_01",
                full_name="Dr. Sunita Sharma",
                mobile="9123456780",
                email="officer@krishisathi.ai",
                password_hash=generate_password_hash("password123"),
                role="officer"
            )
            db.add(officer)
            db.flush()

            officer_profile = OfficerProfile(
                user_id=officer.id,
                official_designation="Senior Agronomy Specialist",
                department="Department of Agriculture & Farmers Welfare",
                institution="Krishi Vigyan Kendra (KVK) Nagpur",
                district_jurisdiction="Wardha, Nagpur, Amravati",
                state="Maharashtra",
                official_email="officer@krishisathi.ai",
                employee_id_reference="MH-AGRI-4821",
                expertise_areas="Cotton Pest Management, Soil Nutrient Dynamics, Integrated Pest Management (IPM)",
                verification_status="VERIFIED",
                verified_by="System Administrator",
                verified_at=datetime.now()
            )
            db.add(officer_profile)

        # 3. Seed Demo Admin Account
        admin = db.query(User).filter_by(email="admin@krishisathi.ai").first()
        if not admin:
            admin = User(
                id="user_admin_01",
                full_name="Chief Agricultural Officer / Admin",
                mobile="9999900001",
                email="admin@krishisathi.ai",
                password_hash=generate_password_hash("admin123"),
                role="admin"
            )
            db.add(admin)

        db.commit()

        # 4. Seed Initial Cases if empty
        if db.query(AdvisoryCase).count() == 0:
            c1 = AdvisoryCase(
                case_id="CASE-1001",
                farmer_id="user_farmer_01",
                assigned_officer_id="user_officer_01",
                farmer_name="Ramesh Patel",
                crop_name="Cotton",
                growth_stage="Flowering / Boll Formation",
                village="Wardha",
                district="Wardha",
                state="Maharashtra",
                question="Lower leaves showing curling and brown marginal necrosis. Need advice on whether this is wilt or sucking pests.",
                voice_transcript="Cotton leaves are curling and drying around edges, please inspect.",
                image_path=None,
                ml_model_status="NOT_CONNECTED",
                ml_prediction="Pending Custom ML Model Weights",
                confidence_score=None,
                escalation_reason="Model offline / Confidence score unavailable; escalated to specialist review.",
                weather_context_json=json.dumps({
                    "location": "Wardha, Maharashtra",
                    "temperature": 27.5,
                    "temperature_unit": "°C",
                    "relative_humidity": 68,
                    "humidity_unit": "%",
                    "rainfall_risk": "Moderate",
                    "advisory_weather_note": "Favorable conditions for routine inspection; avoid foliar spraying if sudden rain clouds develop."
                }),
                agronomic_advisory_json=json.dumps({
                    "summary": "Standard agronomic guidelines for Cotton at Flowering / Boll Formation stage.",
                    "cultural_practices": [
                        "Maintain optimal root zone aeration and avoid stagnation during Flowering / Boll Formation.",
                        "Inspect underside of foliage for early instar pests or fungal spores during morning hours."
                    ],
                    "irrigation_advice": "Align watering with current soil moisture and weather outlook.",
                    "nutrient_guideline": "Ensure balanced N-P-K tailored to Flowering / Boll Formation nutritional draw."
                }),
                status="UNDER_REVIEW",
                priority="High",
                officer_notes="Awaiting soil moisture and leaf sap test results from district lab.",
                created_at=datetime.now()
            )
            db.add(c1)

            c2 = AdvisoryCase(
                case_id="CASE-1002",
                farmer_id="user_farmer_01",
                assigned_officer_id="user_officer_01",
                farmer_name="Sunita Devi",
                crop_name="Wheat",
                growth_stage="Vegetative / Tillering",
                village="Karnal",
                district="Karnal",
                state="Haryana",
                question="Yellow streaks on leaf blades after recent temperature drop.",
                voice_transcript=None,
                image_path=None,
                ml_model_status="NOT_CONNECTED",
                ml_prediction="Pending Custom ML Model Weights",
                confidence_score=None,
                escalation_reason="Model offline; escalated to specialist review.",
                weather_context_json=json.dumps({
                    "location": "Karnal, Haryana",
                    "temperature": 18.0,
                    "temperature_unit": "°C",
                    "relative_humidity": 75,
                    "humidity_unit": "%",
                    "rainfall_risk": "Low",
                    "advisory_weather_note": "Cold wave precautions advised; ensure light irrigation to prevent frost damage."
                }),
                agronomic_advisory_json=json.dumps({
                    "summary": "Agronomic advice for Wheat at Vegetative / Tillering stage.",
                    "cultural_practices": [
                        "Monitor crown root initiation and keep field free from broadleaf weeds.",
                        "Inspect for stripe rust signs (yellow linear pustules)."
                    ],
                    "irrigation_advice": "First irrigation recommended 20-25 days after sowing at CRI stage.",
                    "nutrient_guideline": "Top-dress nitrogen with urea split application before irrigation."
                }),
                status="PENDING_OFFICER_REVIEW",
                priority="Urgent",
                officer_notes="Possible stripe rust precursor or nitrogen deficiency under cold stress.",
                created_at=datetime.now()
            )
            db.add(c2)
            db.commit()

            # Seed initial message in CASE-1001
            m1 = CaseMessage(
                case_id="CASE-1001",
                sender_id="user_officer_01",
                sender_role="officer",
                sender_name="Dr. Sunita Sharma",
                message_text="Hello Ramesh ji, I reviewed your inquiry regarding leaf curling on Cotton. Have you observed small white insects on the undersides of the leaves in the early morning?",
                is_read=False,
                created_at=datetime.now()
            )
            db.add(m1)

            # Seed activity log
            l1 = CaseActivityLog(
                case_id="CASE-1001",
                actor_id="user_officer_01",
                actor_name="Dr. Sunita Sharma",
                actor_role="officer",
                action="CASE_REVIEWED",
                details="Officer reviewed leaf symptoms and dispatched inquiry message to farmer."
            )
            db.add(l1)
            db.commit()

    except Exception as e:
        db.rollback()
        print(f"[Database Seed Error]: {e}")
    finally:
        db.close()
