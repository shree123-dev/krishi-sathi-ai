import React, { useState, useRef } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Languages,
  UserCheck,
  Sprout,
  ArrowRight,
  AlertCircle,
  Building,
  Briefcase,
  Layers,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { registerUser } from '../services/api';
import CascadingLocationSelector from './CascadingLocationSelector';
import PasswordStrengthField from './PasswordStrengthField';

const INDIAN_LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Hindi', label: 'हिन्दी (Hindi)' },
  { code: 'Marathi', label: 'मराठी (Marathi)' },
  { code: 'Telugu', label: 'తెలుగు (Telugu)' },
  { code: 'Punjabi', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'Gujarati', label: 'ગુજરાતી (Gujarati)' },
  { code: 'Tamil', label: 'தமிழ் (Tamil)' },
  { code: 'Kannada', label: 'ಕನ್ನಡ (Kannada)' }
];

export default function RegisterPage({ onRegisterSuccess, onNavigateLogin, onBackToHome }) {
  const [role, setRole] = useState('farmer');

  // Common Fields
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Farmer Specific Fields (Module 1 - Cascading State -> District -> Taluka -> Village)
  const [locationData, setLocationData] = useState({
    state: 'Maharashtra',
    district: 'Wardha',
    taluka: 'Wardha',
    village: 'Sewagram',
    manualTaluka: '',
    manualVillage: ''
  });

  const [pincode, setPincode] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('Hindi');
  const [mainCrops, setMainCrops] = useState('');
  const [farmArea, setFarmArea] = useState('');
  const [farmAreaUnit, setFarmAreaUnit] = useState('Acres');
  const [cropGrowthStage, setCropGrowthStage] = useState('Vegetative / Tillering');

  // Officer Specific Fields (Module 2)
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Department of Agriculture');
  const [institution, setInstitution] = useState('Krishi Vigyan Kendra (KVK)');
  const [jurisdiction, setJurisdiction] = useState('');
  const [officerState, setOfficerState] = useState('Maharashtra');
  const [employeeId, setEmployeeId] = useState('');
  const [expertise, setExpertise] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isDuplicateMobile, setIsDuplicateMobile] = useState(false);

  const errorTopRef = useRef(null);
  const errorBottomRef = useRef(null);

  const triggerError = (msg, isDuplicate = false) => {
    setErrorMessage(msg);
    setIsDuplicateMobile(isDuplicate);
    setTimeout(() => {
      if (errorBottomRef.current) {
        errorBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errorTopRef.current) {
        errorTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Helper to generate guaranteed fresh mobile number for testing/prototyping
  const generateRandomMobile = () => {
    return '98' + Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  const fillDemoFarmer = () => {
    setRole('farmer');
    setFullName('Rameshwar Patil');
    const freshMobile = generateRandomMobile();
    setMobile(freshMobile);
    setEmail(`ramesh.patil${freshMobile.slice(-4)}@krishisathi.ai`);
    setLocationData({
      state: 'Maharashtra',
      district: 'Wardha',
      taluka: 'Wardha',
      village: 'Sewagram',
      manualTaluka: '',
      manualVillage: ''
    });
    setMainCrops('Cotton, Soybean, Wheat');
    setFarmArea('4.5');
    setFarmAreaUnit('Acres');
    setPincode('442001');
    setPreferredLanguage('Hindi');
    setPassword('Krishi@2026!');
    setConfirmPassword('Krishi@2026!');
    setErrorMessage('');
    setIsDuplicateMobile(false);
    setSuccessNotice('⚡ Demo Farmer profile populated! Click Register below to test instant registration.');
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  const fillDemoOfficer = () => {
    setRole('officer');
    setFullName('Dr. Priya Deshmukh');
    const freshMobile = generateRandomMobile();
    setMobile(freshMobile);
    setEmail(`dr.priya${freshMobile.slice(-4)}@krishisathi.ai`);
    setDesignation('Senior Agricultural Specialist');
    setDepartment('Department of Agriculture & Plant Pathology');
    setInstitution('Krishi Vigyan Kendra Wardha');
    setJurisdiction('Wardha District');
    setOfficerState('Maharashtra');
    setEmployeeId('MH-KVK-2026');
    setExpertise('Integrated Pest Management, Bollworm Control, Soil Diagnostics');
    setPassword('Krishi@2026!');
    setConfirmPassword('Krishi@2026!');
    setErrorMessage('');
    setIsDuplicateMobile(false);
    setSuccessNotice('⚡ Demo Officer profile populated! Click Register below to test instant registration.');
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsDuplicateMobile(false);

    if (!fullName.trim()) {
      triggerError('Please enter your full name.');
      return;
    }

    // Clean Indian mobile numbers: handles +91, 91 prefix, leading 0, spaces
    let cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.startsWith('91') && cleanMobile.length === 12) {
      cleanMobile = cleanMobile.substring(2);
    } else if (cleanMobile.startsWith('0') && cleanMobile.length === 11) {
      cleanMobile = cleanMobile.substring(1);
    }

    if (cleanMobile.length !== 10) {
      triggerError('Please enter a valid 10-digit mobile number (e.g. 9823456789 or +91 9823456789).');
      return;
    }

    // Module 2: Strong Password Policy Validation
    if (password.length < 8) {
      triggerError('Password must be at least 8 characters long. (You can click "Use Suggested Password" below).');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\/`~]/.test(password)) {
      triggerError('Password must contain uppercase (A-Z), lowercase (a-z), a number (0-9), and at least one special character (!@#$%). Or use the "✨ Suggest Strong Password" button.');
      return;
    }
    if (password !== confirmPassword) {
      triggerError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    const payload = {
      role,
      full_name: fullName.trim(),
      mobile: cleanMobile,
      email: email.trim() || null,
      password,
      confirm_password: confirmPassword
    };

    if (role === 'farmer') {
      const finalTaluka = (locationData.taluka === 'Other / Enter manually'
        ? locationData.manualTaluka.trim()
        : locationData.taluka.trim()) || 'Wardha';

      let finalVillage = locationData.village === 'Other / Enter manually'
        ? locationData.manualVillage.trim()
        : locationData.village.trim();

      if (!finalVillage) {
        finalVillage = `${finalTaluka} Gram`;
      }

      if (!locationData.state || !locationData.district || !finalTaluka || !finalVillage) {
        triggerError('Please select complete administrative location: State, District, Taluka/Tehsil, and Village.');
        return;
      }

      payload.state = locationData.state;
      payload.district = locationData.district;
      payload.taluka = finalTaluka;
      payload.village = finalVillage;
      payload.pincode = pincode.trim() || null;
      payload.preferred_language = preferredLanguage;
      payload.main_crops = mainCrops.trim() || 'Cotton, Wheat';
      payload.farm_area = farmArea ? parseFloat(farmArea) : null;
      payload.farm_area_unit = farmAreaUnit;
      payload.crop_growth_stage = cropGrowthStage;
    } else {
      if (!designation.trim() || !jurisdiction.trim()) {
        triggerError('Please provide your official designation and area of jurisdiction.');
        return;
      }
      payload.state = officerState;
      payload.official_designation = designation.trim();
      payload.department = department.trim();
      payload.institution = institution.trim();
      payload.district_jurisdiction = jurisdiction.trim();
      payload.employee_id_reference = employeeId.trim() || null;
      payload.expertise_areas = expertise.trim() || 'Integrated Pest Management, Crop Diagnostics';
    }

    setLoading(true);
    try {
      const resp = await registerUser(payload);
      if (resp?.data?.user) {
        setSuccessNotice('✓ Registration successful! Launching your Krishi Sathi dashboard...');
        setTimeout(() => {
          onRegisterSuccess(resp.data.user);
        }, 600);
      }
    } catch (err) {
      const isDup = err.message && (err.message.includes('already exists') || err.message.includes('mobile'));
      triggerError(err.message || 'Registration failed. Please review your details.', isDup);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container" id="farmer-register-view">
      <div className="auth-card register-wide" style={{ maxWidth: '840px' }}>
        {/* Header */}
        <div className="auth-header">
          <div className="auth-brand-badge">
            <Sprout size={16} />
            <span>Krishi Sathi Identity Portal</span>
          </div>
          <h2>Create Your Krishi Sathi Account</h2>
          <p>
            Join Indian farmers and verified agricultural officers in the AI-powered crop advisory network.
          </p>
        </div>

        {/* 1-Click Prototype / Testing Helpers */}
        <div className="demo-credentials-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', padding: '0.85rem 1.1rem' }}>
          <div>
            <span className="demo-title" style={{ color: 'var(--primary-800)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} /> Quick Demo Registration (1-Click Fill):
            </span>
            <div style={{ fontSize: '0.78rem', color: 'var(--neutral-600)', marginTop: '2px' }}>
              Instantly fills realistic details with a fresh unique phone number & verified location.
            </div>
          </div>
          <div className="demo-buttons-group">
            <button
              type="button"
              className="demo-badge-btn farmer"
              onClick={fillDemoFarmer}
              title="Populate complete demo farmer details"
            >
              ⚡ Fill Farmer Demo
            </button>
            <button
              type="button"
              className="demo-badge-btn officer"
              onClick={fillDemoOfficer}
              title="Populate complete demo officer details"
            >
              ⚡ Fill Officer Demo
            </button>
          </div>
        </div>

        {successNotice && (
          <div className="auth-success-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', background: '#ecfdf5', color: '#047857', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #a7f3d0' }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{successNotice}</span>
          </div>
        )}

        {errorMessage && (
          <div ref={errorTopRef} className="auth-error-banner" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0.85rem 1rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fecaca' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 600 }}>{errorMessage}</span>
            </div>
            {isDuplicateMobile && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={onNavigateLogin}
                  style={{ background: '#b91c1c', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Sign In With This Mobile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const freshMobile = generateRandomMobile();
                    setMobile(freshMobile);
                    setErrorMessage('');
                    setIsDuplicateMobile(false);
                  }}
                  style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={12} /> Generate Fresh Mobile Number
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Role Selector Tabs */}
          <div className="form-group" style={{ marginBottom: '1.2rem' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              Select Account Type:
            </label>
            <div className="role-selector-dual">
              <button
                type="button"
                className={`role-choice-card ${role === 'farmer' ? 'active' : ''}`}
                onClick={() => setRole('farmer')}
              >
                <Sprout size={22} className="role-icon" />
                <div className="role-text">
                  <strong>Farmer Account</strong>
                  <span>Diagnose crops & get guidance</span>
                </div>
              </button>

              <button
                type="button"
                className={`role-choice-card ${role === 'officer' ? 'active' : ''}`}
                onClick={() => setRole('officer')}
              >
                <UserCheck size={22} className="role-icon" />
                <div className="role-text">
                  <strong>Agriculture Officer</strong>
                  <span>Verify cases & guide farmers</span>
                </div>
              </button>
            </div>
          </div>

          {role === 'officer' && (
            <div className="ml-disclaimer-box" style={{ margin: '0.5rem 0 1.2rem', padding: '0.75rem 1rem' }}>
              <ShieldAlert size={18} className="icon" />
              <div>
                <strong style={{ fontSize: '0.85rem' }}>Officer Verification Protocol (Module 2):</strong>
                <p style={{ fontSize: '0.78rem', margin: 0 }}>
                  New officer accounts begin as <code>PENDING_VERIFICATION</code>. Credential review by a district administrator is required before issuing live recommendations.
                </p>
              </div>
            </div>
          )}

          {/* Account Basics: Name & Mobile */}
          <div className="form-grid-dual">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">
                Full Name <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <User size={18} className="field-icon" />
                <input
                  id="reg-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Patel"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-mobile">
                Mobile Number <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <Phone size={18} className="field-icon" />
                <input
                  id="reg-mobile"
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9823456789 or +91 9823456789"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  maxLength={15}
                  required
                />
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--neutral-500)', marginTop: '2px', display: 'block' }}>
                10-digit Indian mobile number (with or without +91)
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Email Address <span style={{ color: 'var(--neutral-400)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <div className="input-with-icon">
              <Mail size={18} className="field-icon" />
              <input
                id="reg-email"
                type="email"
                className="form-input"
                placeholder="e.g. user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Farmer Specific Profile Fields: Cascading Location Selector (Item 1) */}
          {role === 'farmer' && (
            <>
              <div style={{ margin: '1rem 0', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--neutral-200)' }}>
                <CascadingLocationSelector
                  value={locationData}
                  onChange={setLocationData}
                  required={true}
                />
              </div>

              <div className="form-grid-dual">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-crops">
                    Main Crops Cultivated:
                  </label>
                  <div className="input-with-icon">
                    <Sprout size={18} className="field-icon" />
                    <input
                      id="reg-crops"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Cotton, Soybean, Wheat"
                      value={mainCrops}
                      onChange={(e) => setMainCrops(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-language">
                    Preferred Language for Advisory:
                  </label>
                  <div className="input-with-icon">
                    <Languages size={18} className="field-icon" />
                    <select
                      id="reg-language"
                      className="form-select"
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                    >
                      {INDIAN_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-grid-dual">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-area">
                    Farm Area <span style={{ color: 'var(--neutral-400)', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      id="reg-area"
                      type="number"
                      step="0.1"
                      className="form-input"
                      placeholder="e.g. 5.0"
                      value={farmArea}
                      onChange={(e) => setFarmArea(e.target.value)}
                    />
                    <select
                      className="form-select"
                      style={{ width: '110px' }}
                      value={farmAreaUnit}
                      onChange={(e) => setFarmAreaUnit(e.target.value)}
                    >
                      <option value="Acres">Acres</option>
                      <option value="Hectares">Hectares</option>
                      <option value="Bigha">Bigha</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-pincode">
                    PIN Code <span style={{ color: 'var(--neutral-400)', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    id="reg-pincode"
                    type="text"
                    className="form-input"
                    placeholder="e.g. 442001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    maxLength={6}
                  />
                </div>
              </div>
            </>
          )}

          {/* Officer Specific Fields */}
          {role === 'officer' && (
            <>
              <div className="form-grid-dual">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-designation">
                    Official Designation <span className="req">*</span>
                  </label>
                  <div className="input-with-icon">
                    <Briefcase size={18} className="field-icon" />
                    <input
                      id="reg-designation"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Agronomy Specialist / KVK Officer"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-institution">
                    Agricultural Institution / KVK <span className="req">*</span>
                  </label>
                  <div className="input-with-icon">
                    <Building size={18} className="field-icon" />
                    <input
                      id="reg-institution"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Krishi Vigyan Kendra Wardha"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-grid-dual">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-jurisdiction">
                    District Responsibility Area <span className="req">*</span>
                  </label>
                  <div className="input-with-icon">
                    <MapPin size={18} className="field-icon" />
                    <input
                      id="reg-jurisdiction"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Wardha District"
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-empid">
                    Employee ID / Reference No. <span style={{ color: 'var(--neutral-400)', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    id="reg-empid"
                    type="text"
                    className="form-input"
                    placeholder="e.g. MH-AGRI-1094"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-expertise">
                  Areas of Agricultural Expertise:
                </label>
                <input
                  id="reg-expertise"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Cotton Bollworm, Soil Health, Sucking Pests, Fungal Blights"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Item 2: Strong Password Guidance and Live Strength Validation */}
          <div style={{ marginTop: '0.8rem' }}>
            <PasswordStrengthField
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              disabled={loading}
            />
            <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setPassword('Krishi@2026!');
                  setConfirmPassword('Krishi@2026!');
                  setErrorMessage('');
                }}
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #6ee7b7',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  color: '#065f46',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                💡 Fill Compliant Password: Krishi@2026!
              </button>
            </div>
          </div>

          {/* Bottom Error Display (Ensures immediate visibility right above submit button) */}
          {errorMessage && (
            <div ref={errorBottomRef} className="auth-error-banner" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0.85rem 1rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', marginTop: '1.2rem', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{errorMessage}</span>
              </div>
              {isDuplicateMobile && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={onNavigateLogin}
                    style={{ background: '#b91c1c', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Sign In With This Mobile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const freshMobile = generateRandomMobile();
                      setMobile(freshMobile);
                      setErrorMessage('');
                      setIsDuplicateMobile(false);
                    }}
                    style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 12px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={12} /> Generate Fresh Mobile
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
            style={{ width: '100%', marginTop: '1.2rem' }}
          >
            <span>{loading ? 'Creating Account & Setting Location...' : `Register as ${role === 'farmer' ? 'Farmer' : 'Agriculture Officer'}`}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer-prompt">
          <span>Already registered with Krishi Sathi?</span>
          <button type="button" className="auth-link-btn" onClick={onNavigateLogin}>
            Sign In to Your Account
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.2rem' }}>
          <button type="button" className="btn-back-home" onClick={onBackToHome}>
            ← Return to Krishi Sathi Home
          </button>
        </div>
      </div>
    </div>
  );
}
