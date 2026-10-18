"""
PostgreSQL Schema Architecture Definition for Crop Health Advisory System.
This file outlines the relational database schema prepared for future PostgreSQL integration.
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class CropAdvisoryCase:
    """
    Data model representing a farmer's query and advisory transaction.
    Ready to be mapped directly to SQLAlchemy / PostgreSQL table: 'advisory_cases'.
    """
    id: Optional[int]
    case_uuid: str
    farmer_name: str
    crop_name: str
    village_location: str
    growth_stage: str
    question_text: Optional[str]
    voice_transcript: Optional[str]
    image_url: Optional[str]
    ml_model_version: Optional[str]
    ml_confidence_score: Optional[float]
    ml_diagnosis: Optional[str]
    officer_review_status: str
    officer_notes: Optional[str]
    created_at: datetime

# SQL DDL for PostgreSQL setup when user connects database:
POSTGRESQL_DDL_TEMPLATE = """
CREATE TABLE IF NOT EXISTS advisory_cases (
    id SERIAL PRIMARY KEY,
    case_uuid VARCHAR(64) UNIQUE NOT NULL,
    farmer_name VARCHAR(120),
    crop_name VARCHAR(100) NOT NULL,
    village_location VARCHAR(150) NOT NULL,
    growth_stage VARCHAR(100) NOT NULL,
    question_text TEXT,
    voice_transcript TEXT,
    image_path VARCHAR(255),
    ml_model_version VARCHAR(50) DEFAULT 'unconnected',
    ml_confidence_score NUMERIC(5,2),
    ml_diagnosis VARCHAR(150),
    officer_review_status VARCHAR(50) DEFAULT 'Pending Review',
    officer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"""
