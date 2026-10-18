import React, { useState, useEffect } from 'react';
import CropForm from './CropForm';
import WeatherContext from './WeatherContext';
import AnalysisResult from './AnalysisResult';
import EnvironmentalInsights from './EnvironmentalInsights';
import CaseDetailModal from './CaseDetailModal';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Sprout,
  ShieldAlert,
  Info,
  Clock,
  CheckCircle2,
  Calendar,
  CloudSun,
  UserCheck,
  Send,
  HelpCircle,
  FileText,
  MapPin,
  ChevronRight,
  Filter,
  MessageSquare,
  Eye,
  Layers,
  User,
  Star,
  ShieldCheck
} from 'lucide-react';
import CascadingLocationSelector from './CascadingLocationSelector';
import { fetchFarmerHistory, updateFarmerProfile } from '../services/api';

export default function FarmerDashboard({
  weather,
  weatherLoading,
  onLocationChange,
  onSubmitAdvisory,
  submitting,
  analysisResult,
  currentUser
}) {
  const { t } = useLanguage();

  // Sub-navigation tabs (Module 11)
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'analysis' | 'history' | 'environment' | 'profile'

  const [historyCases, setHistoryCases] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filterCrop, setFilterCrop] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Selected case for dossier & two-way messaging modal
  const [inspectCaseId, setInspectCaseId] = useState(null);

  // Profile location editor state (Module 1)
  const [profileLocation, setProfileLocation] = useState({
    state: currentUser?.state || 'Maharashtra',
    district: currentUser?.district || 'Wardha',
    taluka: currentUser?.taluka || 'Wardha',
    village: currentUser?.village || 'Sewagram',
    manualTaluka: '',
    manualVillage: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileUpdateMsg, setProfileUpdateMsg] = useState('');

  // Keep location in sync when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setProfileLocation({
        state: currentUser.state || 'Maharashtra',
        district: currentUser.district || 'Wardha',
        taluka: currentUser.taluka || 'Wardha',
        village: currentUser.village || 'Sewagram',
        manualTaluka: '',
        manualVillage: ''
      });
    }
  }, [currentUser]);

  const handleSaveLocation = async () => {
    setSavingProfile(true);
    setProfileUpdateMsg('');
    try {
      const finalTaluka = profileLocation.taluka === 'Other / Enter manually'
        ? profileLocation.manualTaluka.trim()
        : profileLocation.taluka.trim();
      const finalVillage = profileLocation.village === 'Other / Enter manually'
        ? profileLocation.manualVillage.trim()
        : profileLocation.village.trim();

      await updateFarmerProfile({
        state: profileLocation.state,
        district: profileLocation.district,
        taluka: finalTaluka,
        village: finalVillage
      });

      setProfileUpdateMsg('Farm location updated and persisted to database successfully!');
      if (onLocationChange) {
        onLocationChange(`${finalVillage}, ${profileLocation.district}`);
      }
    } catch (err) {
      setProfileUpdateMsg('Error: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetchFarmerHistory({
        farmerName: currentUser?.full_name || '',
        crop: filterCrop,
        status: filterStatus
      });
      if (res?.cases) {
        setHistoryCases(res.cases);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [currentUser, analysisResult, filterCrop, filterStatus]);

  const uniqueCrops = Array.from(new Set(historyCases.map((c) => c.crop_name))).filter(Boolean);

  const solvedCases = historyCases.filter(
    (c) => c.status === 'RESOLVED' || c.status === 'AI_RESOLVED'
  );

  return (
    <div className="farmer-dashboard-view">
      {/* Personalized Welcome Banner with Quick Language Switcher */}
      <section className="farmer-welcome-card">
        <div className="welcome-left">
          <div className="welcome-avatar-pill">
            🌱
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <div className="welcome-badge" style={{ margin: 0 }}>
                <span>{t('portal_badge')}</span>
              </div>
              <LanguageSwitcher compact={true} />
            </div>
            <h2 className="welcome-title">
              {currentUser
                ? `${t('welcome_farmer')}, ${currentUser.full_name}!`
                : t('welcome_guest')}
            </h2>
            <p className="welcome-sub">
              {currentUser?.village
                ? `${t('field_location')}: ${currentUser.village}, ${currentUser.district || ''} • ${t('main_crops')}: ${currentUser.main_crops || 'General'}`
                : t('sub_desc')}
            </p>
          </div>
        </div>

        {/* Quick Action Badges */}
        <div className="welcome-quick-actions">
          <button
            type="button"
            className="quick-action-card"
            onClick={() => setActiveSubTab('analysis')}
          >
            <div className="qa-icon-circle green">
              <Sprout size={18} />
            </div>
            <div className="qa-text">
              <strong>{t('new_crop_scan')}</strong>
              <span>{t('new_crop_scan_sub')}</span>
            </div>
          </button>

          <button
            type="button"
            className="quick-action-card"
            onClick={() => setActiveSubTab('environment')}
          >
            <div className="qa-icon-circle blue">
              <CloudSun size={18} />
            </div>
            <div className="qa-text">
              <strong>{t('live_weather')}</strong>
              <span>{weather?.temperature ? `${weather.temperature}°C` : t('live_weather_sub')}</span>
            </div>
          </button>

          <button
            type="button"
            className="quick-action-card"
            onClick={() => setActiveSubTab('history')}
          >
            <div className="qa-icon-circle purple">
              <Clock size={18} />
            </div>
            <div className="qa-text">
              <strong>{t('my_cases')}</strong>
              <span>{historyCases.length} {t('my_cases_sub')}</span>
            </div>
          </button>
        </div>
      </section>

      {/* Sub-Navigation Tabs Bar (Module 11) */}
      <div className="farmer-subtabs-nav">
        <button
          type="button"
          className={`subtab-btn ${activeSubTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('overview')}
        >
          {t('tab_overview')}
        </button>
        <button
          type="button"
          className={`subtab-btn ${activeSubTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('analysis')}
        >
          {t('tab_analysis')}
        </button>
        <button
          type="button"
          className={`subtab-btn ${activeSubTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('history')}
        >
          {t('tab_history')} ({historyCases.length})
        </button>
        <button
          type="button"
          className={`subtab-btn ${activeSubTab === 'environment' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('environment')}
        >
          {t('tab_environment')}
        </button>
        <button
          type="button"
          className={`subtab-btn ${activeSubTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('profile')}
        >
          {t('tab_profile')}
        </button>
      </div>

      {/* ========================================================
          TAB 1: OVERVIEW (Combined Diagnostic Form & Quick Feed)
          ======================================================== */}
      {activeSubTab === 'overview' && (
        <>
          <div className="ml-disclaimer-box">
            <Info size={20} className="icon" />
            <div>
              <h4>{t('ml_disclaimer_title')}</h4>
              <p>{t('ml_disclaimer_text')}</p>
            </div>
          </div>

          <div className="farmer-grid">
            <div className="form-column">
              <CropForm
                onSubmit={onSubmitAdvisory}
                loading={submitting}
                onLocationChange={onLocationChange}
                currentUser={currentUser}
              />
            </div>

            <div className="context-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <WeatherContext weather={weather} loading={weatherLoading} />

              {analysisResult ? (
                <AnalysisResult result={analysisResult} />
              ) : (
                <div className="agro-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', borderStyle: 'dashed' }}>
                  <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem', background: 'var(--neutral-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)' }}>
                    <Sprout size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--neutral-700)', marginBottom: '0.4rem' }}>
                    {t('new_crop_scan')}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', maxWidth: '320px', margin: '0 auto' }}>
                    {t('sub_desc')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION: OFFICER SOLVED INQUIRIES & OFFICIAL PRESCRIPTIONS (Requirement 2) */}
          {solvedCases.length > 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <ShieldCheck size={24} style={{ color: '#16a34a' }} />
                    {t('officer_solved_title')}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', margin: '4px 0 0' }}>
                    {t('officer_solved_desc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('history')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-700)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>{t('tab_history')} ({solvedCases.length}) →</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.4rem' }}>
                {solvedCases.map((sc) => (
                  <div key={sc.case_id} style={{
                    background: '#ffffff',
                    border: '2px solid #86efac',
                    borderRadius: '12px',
                    padding: '1.3rem',
                    boxShadow: '0 4px 16px rgba(22, 163, 74, 0.09)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '3px 8px', borderRadius: '4px' }}>
                          {sc.case_id}
                        </span>
                        <span style={{ background: '#16a34a', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {t('solved_badge')}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1.15rem', color: 'var(--neutral-900)', margin: '0 0 4px' }}>
                        {sc.crop_name} <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', fontWeight: 400 }}>({sc.growth_stage})</span>
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} />
                        <span>{sc.location} • {sc.timestamp}</span>
                      </div>

                      <div style={{ background: 'var(--neutral-50)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--neutral-700)', fontStyle: 'italic', marginBottom: '0.8rem', borderLeft: '3px solid var(--neutral-300)' }}>
                        "{sc.question || sc.voice_transcript || 'Leaf photo submitted for review'}"
                      </div>

                      {/* Official Specialist Advice / Prescription */}
                      {sc.final_advisory && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.85rem', marginBottom: '0.6rem' }}>
                          <strong style={{ color: '#15803d', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                            <CheckCircle2 size={16} /> {t('officer_advice_label')}:
                          </strong>
                          <p style={{ fontSize: '0.9rem', color: '#14532d', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                            {sc.final_advisory}
                          </p>
                        </div>
                      )}

                      {/* Officer Guidance Notes & Direct Message */}
                      {sc.officer_notes && (
                        <div style={{ background: '#ecfdf5', borderLeft: '3px solid #10b981', padding: '0.6rem 0.8rem', borderRadius: '4px', fontSize: '0.83rem', color: '#047857', marginBottom: '0.8rem' }}>
                          <strong>💬 {t('officer_notes_label')}:</strong> {sc.officer_notes}
                        </div>
                      )}

                      {/* Specialist Info */}
                      <div style={{ fontSize: '0.8rem', color: '#15803d', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck size={15} />
                        <span><strong>{t('assigned_specialist')}:</strong> {sc.assigned_officer_name || 'Dr. Sunita Sharma'} ({sc.assigned_officer_institution || 'Krishi Vigyan Kendra'})</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInspectCaseId(sc.case_id)}
                      style={{
                        width: '100%',
                        background: 'var(--primary-700)',
                        color: 'white',
                        border: 'none',
                        padding: '0.65rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <MessageSquare size={16} />
                      <span>{t('view_messages_btn')}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================
          TAB 2: CROP HEALTH ANALYSIS ONLY
          ======================================================== */}
      {activeSubTab === 'analysis' && (
        <div className="farmer-grid">
          <div className="form-column">
            <CropForm
              onSubmit={onSubmitAdvisory}
              loading={submitting}
              onLocationChange={onLocationChange}
              currentUser={currentUser}
            />
          </div>
          <div className="context-column">
            {analysisResult ? (
              <AnalysisResult result={analysisResult} />
            ) : (
              <WeatherContext weather={weather} loading={weatherLoading} />
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: COMPLETE CASE HISTORY & MESSAGES (Module 6 & 4)
          ======================================================== */}
      {activeSubTab === 'history' && (
        <section className="farmer-history-full-view">
          <div className="section-header-row" style={{ marginBottom: '1.2rem' }}>
            <div>
              <h3>{t('history_heading')}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
                {t('history_subheading')}
              </p>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">{t('all_statuses')}</option>
                <option value="PENDING_OFFICER_REVIEW">{t('status_pending')}</option>
                <option value="UNDER_REVIEW">{t('status_under_review')}</option>
                <option value="AWAITING_FARMER_RESPONSE">{t('status_awaiting_reply')}</option>
                <option value="RESOLVED">{t('status_resolved')}</option>
              </select>
            </div>
          </div>

          {loadingHistory ? (
            <p style={{ textAlign: 'center', padding: '2rem' }}>Loading case history...</p>
          ) : historyCases.length === 0 ? (
            <div className="agro-card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--neutral-500)' }}>
              {t('no_history_found')}
            </div>
          ) : (
            <div className="history-full-grid">
              {historyCases.map((c) => {
                const isSolved = c.status === 'RESOLVED' || c.status === 'AI_RESOLVED';
                const isPending = c.status === 'PENDING_OFFICER_REVIEW';
                const isUnderReview = c.status === 'UNDER_REVIEW';
                const isAwaiting = c.status === 'AWAITING_FARMER_RESPONSE';

                let statusBadgeBg = '#f1f5f9';
                let statusBadgeColor = '#475569';
                let statusLabel = c.status ? c.status.replace(/_/g, ' ') : 'PENDING';

                if (isSolved) {
                  statusBadgeBg = '#dcfce7';
                  statusBadgeColor = '#166534';
                  statusLabel = t('solved_badge');
                } else if (isPending) {
                  statusBadgeBg = '#fef3c7';
                  statusBadgeColor = '#b45309';
                  statusLabel = t('status_pending');
                } else if (isUnderReview) {
                  statusBadgeBg = '#e0f2fe';
                  statusBadgeColor = '#0369a1';
                  statusLabel = t('status_under_review');
                } else if (isAwaiting) {
                  statusBadgeBg = '#f3e8ff';
                  statusBadgeColor = '#7e22ce';
                  statusLabel = t('status_awaiting_reply');
                }

                return (
                  <div key={c.case_id} className="history-detail-card" style={isSolved ? { border: '1.5px solid #86efac', background: '#fcfdfd' } : {}}>
                    <div className="hdc-header">
                      <div>
                        <span className="hdc-id">{c.case_id}</span>
                        <span className={`priority-pill priority-${(c.priority || 'standard').toLowerCase()}`} style={{ marginLeft: '6px' }}>
                          {c.priority}
                        </span>
                      </div>
                      <span className="hdc-status-tag" style={{ background: statusBadgeBg, color: statusBadgeColor, fontWeight: 700 }}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="hdc-body">
                      <h4 className="hdc-crop">{c.crop_name}</h4>
                      <p className="hdc-stage">{t('growth_stage_label')}: {c.growth_stage}</p>
                      <p className="hdc-location">
                        <MapPin size={13} style={{ display: 'inline', marginRight: '3px' }} />
                        {c.location}
                      </p>

                      <div className="hdc-question-preview">
                        "{c.question || c.voice_transcript || 'Image attached for review'}"
                      </div>

                      {/* Official Specialist Advice / Prescription */}
                      {c.final_advisory && (
                        <div className="hdc-advisory-preview" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.6rem 0.8rem', marginTop: '0.6rem' }}>
                          <strong style={{ color: '#166534' }}>💊 {t('officer_advice_label')}:</strong>
                          <p style={{ margin: '3px 0 0', color: '#14532d', fontSize: '0.85rem' }}>{c.final_advisory}</p>
                        </div>
                      )}

                      {/* Officer Direct Notes & Message */}
                      {c.officer_notes && (
                        <div style={{ background: '#ecfdf5', borderLeft: '3px solid #10b981', padding: '0.5rem 0.7rem', borderRadius: '4px', fontSize: '0.8rem', color: '#047857', marginTop: '0.4rem' }}>
                          <strong>💬 {t('officer_notes_label')}:</strong> {c.officer_notes}
                        </div>
                      )}
                    </div>

                    <div className="hdc-footer">
                      <span className="hdc-time">
                        <Calendar size={13} style={{ display: 'inline', marginRight: '3px' }} />
                        {c.timestamp}
                      </span>
                      <button
                        type="button"
                        className="hdc-btn-open"
                        onClick={() => setInspectCaseId(c.case_id)}
                      >
                        <Eye size={14} />
                        {t('view_messages_btn')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          TAB 4: ENVIRONMENTAL CLUSTER DATA (Module 8)
          ======================================================== */}
      {activeSubTab === 'environment' && (
        <EnvironmentalInsights
          defaultLocation={currentUser?.village ? `${currentUser.village}, ${currentUser.district || ''}` : 'Wardha, Maharashtra'}
          onLocationChange={onLocationChange}
        />
      )}

      {/* ========================================================
          TAB 5: FARMER PROFILE & SETTINGS (Module 1)
          ======================================================== */}
      {activeSubTab === 'profile' && (
        <div className="agro-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-title-icon">
                <User size={20} />
              </div>
              <div>
                <h3>Farmer Registered Profile & Farm Location Settings (Module 1)</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>
                  Persistent administrative location • Synchronizes microclimate and extension specialist routing
                </span>
              </div>
            </div>
          </div>

          {currentUser ? (
            <div>
              {/* Profile Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--neutral-200)', marginBottom: '1.5rem' }}>
                <div><strong>Full Name:</strong> {currentUser.full_name}</div>
                <div><strong>Mobile Number:</strong> {currentUser.mobile}</div>
                <div><strong>Email:</strong> {currentUser.email || 'None Provided'}</div>
                <div><strong>Preferred Language:</strong> {currentUser.preferred_language || 'Hindi'}</div>
                <div><strong>Main Crops:</strong> {currentUser.main_crops || 'Cotton, Soybean'}</div>
                <div><strong>Farm Area:</strong> {currentUser.farm_area ? `${currentUser.farm_area} ${currentUser.farm_area_unit || 'Acres'}` : '4.5 Acres'}</div>
                <div><strong>Village / Town:</strong> {currentUser.village || 'Sewagram'}</div>
                <div><strong>Taluka / Tehsil:</strong> {currentUser.taluka || 'Wardha'}</div>
                <div><strong>District:</strong> {currentUser.district || 'Wardha'}</div>
                <div><strong>State:</strong> {currentUser.state || 'Maharashtra'}</div>
              </div>

              {/* Editable Cascading Location Selector */}
              <div style={{ background: '#ffffff', border: '1.5px solid var(--primary-200)', borderRadius: '10px', padding: '1.2rem', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--primary-900)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={16} />
                  Update Administrative Farm Location
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
                  Select your hierarchical State, District, Taluka, and Village below to update your assigned agro-meteorological cluster.
                </p>

                <CascadingLocationSelector
                  value={profileLocation}
                  onChange={setProfileLocation}
                  required={true}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.2rem', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="action-btn-primary"
                    disabled={savingProfile}
                    onClick={handleSaveLocation}
                    style={{
                      background: 'var(--primary-700)',
                      color: 'white',
                      border: 'none',
                      padding: '0.6rem 1.4rem',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{savingProfile ? 'Saving Changes...' : 'Save & Sync Farm Location'}</span>
                  </button>
                </div>
              </div>

              {profileUpdateMsg && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} />
                  <span>{profileUpdateMsg}</span>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--neutral-600)' }}>
              You are currently exploring as a Guest Farmer. Log in or create an account to save your farm coordinates and profile permanently.
            </p>
          )}
        </div>
      )}

      {/* Case Dossier & Message Thread Modal */}
      {inspectCaseId && (
        <CaseDetailModal
          caseId={inspectCaseId}
          currentUser={currentUser}
          onClose={() => setInspectCaseId(null)}
          onCaseUpdated={loadHistory}
        />
      )}
    </div>
  );
}
