import React from 'react';
import {
  Sprout,
  ShieldCheck,
  CloudSun,
  Languages,
  UserCheck,
  ArrowRight,
  UploadCloud,
  Cpu,
  FileCheck2,
  PhoneCall,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export default function LandingPage({ onGetStarted, onNavigateLogin, onNavigateRegister }) {
  const scrollToFeatures = () => {
    const el = document.getElementById('features-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page-wrapper">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-gradient-overlay"></div>
        <div className="landing-hero-content">
          <div className="hero-pill-badge">
            <Sparkles size={16} />
            <span>Next-Gen Agricultural Intelligence</span>
          </div>

          <h1 className="landing-brand-title">Krishi Sathi AI</h1>
          <p className="landing-hero-tagline">
            “Smarter Farming. Healthier Crops. Better Harvests.”
          </p>

          <p className="landing-hero-description">
            Empowering Indian farmers with context-aware artificial intelligence.
            Capture crop symptoms, examine micro-weather risks, and receive personalized
            agronomic advisory with direct escalation to regional agriculture officers.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="landing-btn-primary"
              onClick={onGetStarted}
              id="hero-btn-get-started"
            >
              Get Started Free
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="landing-btn-secondary"
              onClick={scrollToFeatures}
              id="hero-btn-explore-features"
            >
              Explore Features
            </button>
          </div>

          {/* Quick Stats Banner */}
          <div className="hero-stats-strip">
            <div className="stat-pill">
              <strong>Multi-Modal</strong>
              <span>Image, Text & Voice</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-pill">
              <strong>Microclimate</strong>
              <span>Open-Meteo Free API</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-pill">
              <strong>Human-in-the-Loop</strong>
              <span>Officer Triage Workflow</span>
            </div>
          </div>
        </div>
      </section>

      {/* Model Status Transparency Banner */}
      <section className="landing-notice-strip">
        <div className="container">
          <div className="transparency-card">
            <ShieldAlert size={22} className="alert-icon" />
            <div>
              <strong>Architecture Transparency Notice:</strong>
              <span>
                {' '}Krishi Sathi AI strictly avoids simulated or fabricated AI confidence numbers. While the custom computer-vision model weights are in training, rule-based agronomic stage advisories, live weather synchronization, and officer review queues are 100% operational.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="landing-section" id="features-section">
        <div className="container">
          <div className="section-header-center">
            <span className="section-kicker">Engineered for Bharat</span>
            <h2 className="section-heading">Comprehensive Smart Farming Capabilities</h2>
            <p className="section-subheading">
              Designed from the soil up to assist smallholder farmers, agronomists, and agricultural extension specialists.
            </p>
          </div>

          <div className="features-grid">
            {/* Feature 1 */}
            <div className="feature-card">
              <div className="feature-icon-box green">
                <Sprout size={24} />
              </div>
              <h3>AI Crop Health Detection</h3>
              <p>
                Multi-modal diagnostic capture accepting high-resolution leaf photos, symptom descriptions, and voice queries to identify foliar stress and pathology.
              </p>
              <div className="feature-tag">Inference Pipeline Ready</div>
            </div>

            {/* Feature 2 */}
            <div className="feature-card">
              <div className="feature-icon-box emerald">
                <FileCheck2 size={24} />
              </div>
              <h3>Smart Farmer Advisory</h3>
              <p>
                Actionable cultural practices, irrigation scheduling, and nutrient draw recommendations calibrated to the specific growth stage of each crop.
              </p>
              <div className="feature-tag">Stage-Specific</div>
            </div>

            {/* Feature 3 */}
            <div className="feature-card">
              <div className="feature-icon-box blue">
                <CloudSun size={24} />
              </div>
              <h3>Weather-Aware Insights</h3>
              <p>
                Real-time agro-meteorology tracking ambient temperature, relative humidity, wind speed, and rain risk with zero dependency on expensive paid APIs.
              </p>
              <div className="feature-tag">Live Context Sync</div>
            </div>

            {/* Feature 4 */}
            <div className="feature-card">
              <div className="feature-icon-box amber">
                <Languages size={24} />
              </div>
              <h3>Regional Language Support</h3>
              <p>
                Bridging technical barriers with localized interfaces, voice input recognition, and vernacular support in Hindi, Marathi, Telugu, and more.
              </p>
              <div className="feature-tag">Vernacular Voice</div>
            </div>

            {/* Feature 5 */}
            <div className="feature-card">
              <div className="feature-icon-box purple">
                <UserCheck size={24} />
              </div>
              <h3>Agriculture Officer Assistance</h3>
              <p>
                Dedicated triage portal for Krishi Vigyan Kendra (KVK) officers to review ambiguous cases, request soil tests, and issue verified prescriptions.
              </p>
              <div className="feature-tag">Expert Verification</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="landing-section bg-light" id="how-it-works-section">
        <div className="container">
          <div className="section-header-center">
            <span className="section-kicker">Simple & Intuitive Workflow</span>
            <h2 className="section-heading">How Krishi Sathi AI Works</h2>
            <p className="section-subheading">
              A 4-step diagnostic journey designed to deliver rapid, credible agronomic clarity to farmers.
            </p>
          </div>

          <div className="workflow-steps-grid">
            <div className="workflow-step-card">
              <div className="step-number-badge">01</div>
              <div className="step-icon-wrapper">
                <UploadCloud size={28} />
              </div>
              <h4>Upload Crop Image</h4>
              <p>
                Take a quick photo of the affected crop leaf, or type/speak your observations in your local language.
              </p>
            </div>

            <div className="workflow-arrow-divider">
              <ArrowRight size={24} />
            </div>

            <div className="workflow-step-card">
              <div className="step-number-badge">02</div>
              <div className="step-icon-wrapper">
                <Cpu size={28} />
              </div>
              <h4>AI Analysis</h4>
              <p>
                The backend extracts symptom keywords and pairs crop growth stages with disease indicators.
              </p>
            </div>

            <div className="workflow-arrow-divider">
              <ArrowRight size={24} />
            </div>

            <div className="workflow-step-card">
              <div className="step-number-badge">03</div>
              <div className="step-icon-wrapper">
                <CloudSun size={28} />
              </div>
              <h4>Context-Aware Advisory</h4>
              <p>
                Recommendations factor in immediate weather conditions (e.g. humidity, rainfall risk) and growth phase.
              </p>
            </div>

            <div className="workflow-arrow-divider">
              <ArrowRight size={24} />
            </div>

            <div className="workflow-step-card">
              <div className="step-number-badge">04</div>
              <div className="step-icon-wrapper">
                <PhoneCall size={28} />
              </div>
              <h4>Expert Support</h4>
              <p>
                Uncertain cases automatically escalate to the agricultural extension officer's review queue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="landing-section">
        <div className="container">
          <div className="benefits-dual-wrapper">
            {/* For Farmers */}
            <div className="benefit-card">
              <div className="benefit-header">
                <Sprout size={28} style={{ color: 'var(--primary-600)' }} />
                <h3>For Farmers</h3>
              </div>
              <ul className="benefit-list">
                <li>
                  <CheckCircle2 size={18} className="check-icon" />
                  <span>Early detection of leaf curl, rust, blights, and nutritional chlorosis.</span>
                </li>
                <li>
                  <CheckCircle2 size={18} className="check-icon" />
                  <span>Avoid unnecessary pesticide expenditure with weather-timed spray advice.</span>
                </li>
                <li>
                  <CheckCircle2 size={18} className="check-icon" />
                  <span>Interactive voice query support for effortless vernacular usability.</span>
                </li>
                <li>
                  <CheckCircle2 size={18} className="check-icon" />
                  <span>Transparent tracking with direct extension specialist verification.</span>
                </li>
              </ul>
            </div>

            {/* For Extension Officers */}
            <div className="benefit-card">
              <div className="benefit-header">
                <UserCheck size={28} style={{ color: 'var(--primary-700)' }} />
                <h3>For Agriculture Officers</h3>
              </div>
              <ul className="benefit-list">
                <li>
                  <CheckCircle2 size={18} className="check-icon" />
                  <span>Automated triage prioritizing urgent infestations over routine queries.</span>
                </li>
                <li>
                  <CheckCircle2 size={18} className="check-icon" />
                  <span>Holistic case records with leaf photos, audio notes, and local weather.</span>
                </li>
                <li>
                  <CheckCircle2 size={18} className="check-icon" />
                  <span>Streamlined digital record keeping prepared for PostgreSQL audits.</span>
                </li>
                <li>
                  <CheckCircle2 size={18} className="check-icon" />
                  <span>Rapid dispatch of validated treatments to safeguard village clusters.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pre-Footer Call to Action */}
      <section className="landing-cta-banner">
        <div className="container">
          <div className="cta-banner-content">
            <h2>Ready to Protect Your Harvest?</h2>
            <p>
              Join the Krishi Sathi AI network today. Register as a farmer to diagnose your fields,
              or sign in as an agricultural officer to monitor regional crops.
            </p>
            <div className="cta-buttons-row">
              <button
                type="button"
                className="cta-btn-white"
                onClick={onNavigateRegister}
                id="cta-btn-register"
              >
                Create Free Account
              </button>
              <button
                type="button"
                className="cta-btn-outline"
                onClick={onNavigateLogin}
                id="cta-btn-login"
              >
                Sign In to Portal
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
