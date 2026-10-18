import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  ShieldAlert,
  AlertCircle,
  FileText,
  CheckCircle2,
  Clock,
  X,
  MessageSquare,
  Search,
  Filter,
  Image as ImageIcon,
  Star,
  Award,
  RefreshCw,
  Building,
  MapPin,
  Briefcase,
  HelpCircle,
  Calendar,
  Layers,
  ThumbsUp,
  Inbox
} from 'lucide-react';
import { fetchOfficerCases, fetchFeedbackSummary } from '../services/api';
import CaseDetailModal from './CaseDetailModal';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';

export default function OfficerDashboard({ currentUser, onUpdateReview }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview'); // overview, pending, all_cases, messages, feedback, profile
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // Filters & Search
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Feedback Summary State (Module 7)
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Load cases from backend
  const loadCases = async () => {
    try {
      setLoadingCases(true);
      const data = await fetchOfficerCases();
      if (data && data.cases) {
        setCases(data.cases);
      }
    } catch (err) {
      console.error('Failed to load officer cases:', err);
    } finally {
      setLoadingCases(false);
    }
  };

  // Load feedback summary
  const loadFeedback = async () => {
    try {
      setLoadingFeedback(true);
      const summary = await fetchFeedbackSummary();
      setFeedbackSummary(summary);
    } catch (err) {
      console.error('Failed to load feedback summary:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  useEffect(() => {
    loadCases();
    loadFeedback();
  }, []);

  // Filter cases
  const filteredCases = cases.filter((c) => {
    const matchesPriority = filterPriority === 'ALL' || c.priority?.toUpperCase() === filterPriority;
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesPriority && matchesStatus;

    const matchesSearch =
      c.case_id?.toLowerCase().includes(q) ||
      c.farmer_name?.toLowerCase().includes(q) ||
      c.crop_name?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.question?.toLowerCase().includes(q);

    return matchesPriority && matchesStatus && matchesSearch;
  });

  const pendingCases = cases.filter(
    (c) => c.status === 'PENDING_OFFICER_REVIEW' || c.status === 'UNDER_REVIEW'
  );
  const awaitingFarmerCases = cases.filter((c) => c.status === 'AWAITING_FARMER_RESPONSE');
  const resolvedCases = cases.filter((c) => c.status === 'RESOLVED' || c.status === 'AI_RESOLVED');
  const urgentCount = cases.filter((c) => c.priority === 'Urgent').length;
  const highCount = cases.filter((c) => c.priority === 'High').length;

  const isVerified = currentUser?.verification_status === 'VERIFIED';

  return (
    <div className="officer-dashboard-view" id="officer-dashboard-view">
      {/* Officer Top Verification Banner */}
      <div className={`officer-welcome-banner ${!isVerified ? 'banner-pending' : ''}`}>
        <div className="officer-welcome-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <div className="officer-badge" style={{ margin: 0 }}>
              {isVerified ? <UserCheck size={16} /> : <ShieldAlert size={16} />}
              <span>
                {isVerified
                  ? t('officer_verified_badge')
                  : t('officer_pending_badge')}
              </span>
            </div>
            <LanguageSwitcher compact={true} />
          </div>
          <h2>
            {currentUser?.full_name ? `${t('welcome_farmer')}, ${currentUser.full_name}` : t('officer_portal_title')}
          </h2>
          <p>
            {isVerified
              ? `Designation: ${currentUser?.designation || 'Extension Specialist'} | Center / District: ${currentUser?.district || currentUser?.village || 'District Office'}`
              : t('officer_welcome_sub')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="refresh-btn-secondary"
            onClick={() => {
              loadCases();
              loadFeedback();
            }}
            title="Refresh Cases"
          >
            <RefreshCw size={15} className={loadingCases ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Subtabs Navigation (Module 11) */}
      <div className="farmer-subtabs-nav" style={{ marginTop: '1.2rem', marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`subtab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Layers size={16} />
          <span>{t('tab_overview')}</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <Clock size={16} />
          <span>{t('metric_pending_review')} ({pendingCases.length})</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${activeTab === 'all_cases' ? 'active' : ''}`}
          onClick={() => setActiveTab('all_cases')}
        >
          <FileText size={16} />
          <span>{t('tab_triage')} ({cases.length})</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          <MessageSquare size={16} />
          <span>{t('metric_awaiting_farmer')} ({awaitingFarmerCases.length})</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('feedback');
            loadFeedback();
          }}
        >
          <Star size={16} />
          <span>{t('tab_feedback')}</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <UserCheck size={16} />
          <span>{t('tab_officer_profile')}</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="tab-pane-content">
          {/* KPI Cards based on actual data */}
          <div className="officer-stats-row">
            <div className="officer-kpi-card">
              <div className="kpi-num">{cases.length}</div>
              <div className="kpi-label">{t('metric_total_cases')}</div>
            </div>
            <div className="officer-kpi-card" style={{ borderColor: '#fed7aa' }}>
              <div className="kpi-num" style={{ color: 'var(--amber-700)' }}>
                {pendingCases.length}
              </div>
              <div className="kpi-label">{t('metric_pending_review')}</div>
            </div>
            <div className="officer-kpi-card" style={{ borderColor: '#bbf7d0' }}>
              <div className="kpi-num" style={{ color: 'var(--primary-700)' }}>
                {resolvedCases.length}
              </div>
              <div className="kpi-label">{t('metric_resolved_cases')}</div>
            </div>
            <div className="officer-kpi-card" style={{ borderColor: '#fecaca' }}>
              <div className="kpi-num" style={{ color: 'var(--red-500)' }}>
                {urgentCount + highCount}
              </div>
              <div className="kpi-label">{t('metric_high_urgent')}</div>
            </div>
          </div>

          {/* Quick Notice: ML Model Offline */}
          <div className="offline-notice-banner" style={{ marginTop: '1.2rem', marginBottom: '1.5rem' }}>
            <AlertCircle size={18} style={{ color: 'var(--amber-700)', flexShrink: 0 }} />
            <div>
              <strong>Advisory Escalation Active:</strong> ML Vision Model is in manual weights mode
              (Confidence: N/A). Inquiries with ambiguous symptoms or high severity are automatically
              routed to officers for human validation.
            </div>
          </div>

          {/* Pending Cases Quick Section */}
          <div className="section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--neutral-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: 'var(--amber-600)' }} />
                Priority Cases Awaiting Immediate Review ({pendingCases.length})
              </h3>
              <button
                type="button"
                className="action-btn-sm"
                onClick={() => setActiveTab('pending')}
              >
                View All Pending →
              </button>
            </div>

            {renderCasesTable(pendingCases.slice(0, 5))}
          </div>
        </div>
      )}

      {/* TAB 2: PENDING CASES */}
      {activeTab === 'pending' && (
        <div className="tab-pane-content">
          <div className="section-card">
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--neutral-900)' }}>
                Pending Review Cases
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--neutral-600)' }}>
                These farmer inquiries require human agricultural expert assessment. Inspect the photo, symptoms, weather context, and issue verified recommendations.
              </p>
            </div>
            {renderCasesTable(pendingCases)}
          </div>
        </div>
      )}

      {/* TAB 3: ALL CASES (WITH FILTERS & SEARCH) */}
      {activeTab === 'all_cases' && (
        <div className="tab-pane-content">
          <div className="section-card">
            {/* Filter and Search Bar */}
            <div className="officer-controls-row" style={{ marginBottom: '1.2rem' }}>
              <div className="search-box-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by Case ID, Farmer Name, Crop, or Village..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  className="form-select-sm"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="STANDARD">Standard Priority</option>
                </select>

                <select
                  className="form-select-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING_OFFICER_REVIEW">Pending Review</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="AWAITING_FARMER_RESPONSE">Awaiting Farmer</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="AI_RESOLVED">AI Resolved</option>
                </select>
              </div>
            </div>

            {renderCasesTable(filteredCases)}
          </div>
        </div>
      )}

      {/* TAB 4: MESSAGES / CONVERSATIONS */}
      {activeTab === 'messages' && (
        <div className="tab-pane-content">
          <div className="section-card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.6rem', color: 'var(--neutral-900)' }}>
              Two-Way Farmer–Officer Communication Threads
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--neutral-600)', marginBottom: '1.2rem' }}>
              Active inquiries where additional information, clearer photos, or symptom clarifications were requested from the farmer.
            </p>

            {awaitingFarmerCases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--neutral-500)' }}>
                <Inbox size={40} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                <p>No cases are currently awaiting farmer response. All active cases have received prescriptions or initial reviews.</p>
              </div>
            ) : (
              renderCasesTable(awaitingFarmerCases)
            )}
          </div>
        </div>
      )}

      {/* TAB 5: FEEDBACK & RATINGS (MODULE 7) */}
      {activeTab === 'feedback' && (
        <div className="tab-pane-content">
          <div className="section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--neutral-900)' }}>
                  Farmer Satisfaction & Advisory Quality Feedback
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--neutral-600)' }}>
                  Transparent feedback collected directly from registered farmers after receiving AI or officer advisories (Module 7).
                </p>
              </div>
              <button
                type="button"
                className="refresh-btn-secondary"
                onClick={loadFeedback}
              >
                <RefreshCw size={14} className={loadingFeedback ? 'spin' : ''} />
                <span>Refresh Data</span>
              </button>
            </div>

            {loadingFeedback ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                Loading feedback statistics...
              </div>
            ) : feedbackSummary ? (
              <div>
                {/* Scorecards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--primary-50)', padding: '1.2rem', borderRadius: '10px', border: '1px solid var(--primary-200)' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--primary-900)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Average Rating
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-800)' }}>
                        {feedbackSummary.average_rating || 0}
                      </span>
                      <span style={{ color: 'var(--primary-600)', fontSize: '0.9rem' }}>/ 5.0</span>
                    </div>
                    <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={15}
                          fill={star <= Math.round(feedbackSummary.average_rating || 0) ? '#eab308' : '#e2e8f0'}
                          color={star <= Math.round(feedbackSummary.average_rating || 0) ? '#eab308' : '#cbd5e1'}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ background: '#f0fdf4', padding: '1.2rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                      Helpfulness Rate
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                      {feedbackSummary.helpfulness_percentage || 0}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '4px' }}>
                      Farmers confirmed the advisory solved their field problem
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: '1px solid var(--neutral-300)' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Total Feedbacks Submitted
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neutral-800)', marginTop: '4px' }}>
                      {feedbackSummary.total_feedbacks || 0}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', marginTop: '4px' }}>
                      Genuine verified post-advisory submissions
                    </div>
                  </div>
                </div>

                {/* Rating Distribution */}
                {feedbackSummary.rating_distribution && (
                  <div style={{ marginBottom: '1.5rem', background: '#ffffff', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--neutral-200)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--neutral-800)' }}>
                      Star Rating Breakdown
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[5, 4, 3, 2, 1].map((s) => {
                        const count = feedbackSummary.rating_distribution[s] || 0;
                        const pct = feedbackSummary.total_feedbacks
                          ? Math.round((count / feedbackSummary.total_feedbacks) * 100)
                          : 0;
                        return (
                          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                            <span style={{ width: '55px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              {s} <Star size={13} fill="#eab308" color="#eab308" />
                            </span>
                            <div style={{ flex: 1, background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, background: 'var(--primary-600)', height: '100%', borderRadius: '4px' }}></div>
                            </div>
                            <span style={{ width: '60px', color: 'var(--neutral-500)', textAlign: 'right' }}>
                              {count} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Written Feedback */}
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--neutral-800)' }}>
                    Recent Farmer Comments & Field Outcome Reports
                  </h4>
                  {(!feedbackSummary.recent_feedbacks || feedbackSummary.recent_feedbacks.length === 0) ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-500)', background: '#f8fafc', borderRadius: '8px' }}>
                      No written feedback submitted yet. Feedback forms appear in the farmer's history once cases are resolved.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {feedbackSummary.recent_feedbacks.map((fb, idx) => (
                        <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--neutral-200)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--neutral-900)' }}>
                                Case: {fb.case_id}
                              </span>
                              <div style={{ display: 'flex', gap: '2px' }}>
                                {[1, 2, 3, 4, 5].map((st) => (
                                  <Star
                                    key={st}
                                    size={12}
                                    fill={st <= fb.rating ? '#eab308' : '#e2e8f0'}
                                    color={st <= fb.rating ? '#eab308' : '#cbd5e1'}
                                  />
                                ))}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>
                              {fb.submitted_at}
                            </span>
                          </div>
                          {fb.written_feedback && (
                            <p style={{ fontSize: '0.88rem', color: 'var(--neutral-800)', margin: '4px 0' }}>
                              "{fb.written_feedback}"
                            </p>
                          )}
                          {fb.outcome_update && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary-800)', background: 'var(--primary-50)', padding: '4px 8px', borderRadius: '4px', marginTop: '6px' }}>
                              <strong>Field Outcome:</strong> {fb.outcome_update}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--neutral-500)' }}>No feedback data available.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: OFFICER PROFILE (MODULE 2) */}
      {activeTab === 'profile' && (
        <div className="tab-pane-content">
          <div className="section-card" style={{ maxWidth: '780px' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '1.2rem' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-700)', fontWeight: 800, fontSize: '1.8rem' }}>
                {currentUser?.full_name ? currentUser.full_name.charAt(0) : 'O'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.35rem', color: 'var(--neutral-900)', margin: 0 }}>
                    {currentUser?.full_name || 'Dr. Agricultural Specialist'}
                  </h3>
                  {isVerified ? (
                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.78rem', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> Verified Officer
                    </span>
                  ) : (
                    <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.78rem', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} /> Pending Verification
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--neutral-600)', marginTop: '4px' }}>
                  {currentUser?.designation || 'Senior Agriculture Extension Officer'} • {currentUser?.organization || 'Krishi Vigyan Kendra'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--neutral-50)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Official Contact & Login
                </div>
                <div style={{ fontWeight: 600, marginTop: '4px', color: 'var(--neutral-800)' }}>
                  Email: {currentUser?.email || 'N/A'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
                  Mobile: {currentUser?.mobile || 'N/A'}
                </div>
              </div>

              <div style={{ background: 'var(--neutral-50)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Jurisdiction & Office
                </div>
                <div style={{ fontWeight: 600, marginTop: '4px', color: 'var(--neutral-800)' }}>
                  District: {currentUser?.district || 'Wardha'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
                  State: {currentUser?.state || 'Maharashtra'} | Center: {currentUser?.village || 'Regional KVK'}
                </div>
              </div>

              <div style={{ background: 'var(--neutral-50)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Employee Reference & Badge
                </div>
                <div style={{ fontWeight: 600, marginTop: '4px', color: 'var(--neutral-800)' }}>
                  ID: {currentUser?.employee_id || 'AGRI-OFFICER-2026-V'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
                  Verification Audit: Recorded in System DB
                </div>
              </div>

              <div style={{ background: 'var(--neutral-50)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Specialization
                </div>
                <div style={{ fontWeight: 600, marginTop: '4px', color: 'var(--neutral-800)' }}>
                  {currentUser?.specialization || 'Cotton, Soybean & Integrated Pest Management'}
                </div>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.85rem', color: '#166534' }}>
              <strong>Audit Notice (Module 2 & 9):</strong> Every advisory, prescription, and message issued by this account is cryptographically timestamped and logged in the case activity history.
            </div>
          </div>
        </div>
      )}

      {/* Case Details & Two-Way Messaging Modal (Module 4 & 5) */}
      {selectedCaseId && (
        <CaseDetailModal
          caseId={selectedCaseId}
          currentUser={currentUser}
          onClose={() => setSelectedCaseId(null)}
          onCaseUpdated={() => {
            loadCases();
            loadFeedback();
          }}
        />
      )}
    </div>
  );

  // Helper renderer for cases table
  function renderCasesTable(casesList) {
    return (
      <div className="cases-table-container">
        <table className="cases-table">
          <thead>
            <tr>
              <th>Case ID / Time</th>
              <th>Farmer & Location</th>
              <th>Crop & Stage</th>
              <th>Inquiry / Symptoms</th>
              <th>Evidence</th>
              <th>AI Confidence</th>
              <th>Priority</th>
              <th>Case Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {casesList.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--neutral-500)' }}>
                  No cases matching criteria.
                </td>
              </tr>
            ) : (
              casesList.map((c) => (
                <tr key={c.case_id}>
                  <td>
                    <strong>{c.case_id}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{c.timestamp}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.farmer_name || 'Farmer'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>{c.location}</div>
                  </td>
                  <td>
                    <strong>{c.crop_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{c.growth_stage}</div>
                  </td>
                  <td style={{ maxWidth: '220px' }}>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--neutral-700)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {c.question || c.voice_transcript || 'Image attached for inspection'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {c.image_filename ? (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: '#0369a1',
                            background: '#e0f2fe',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <ImageIcon size={11} /> Photo
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--neutral-400)' }}>No Photo</span>
                      )}
                      {c.voice_transcript && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--primary-700)',
                            background: 'var(--primary-50)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          🎙️ Voice
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--amber-700)',
                        background: 'var(--amber-50)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}
                    >
                      Offline (N/A)
                    </span>
                  </td>
                  <td>
                    <span className={`priority-pill priority-${(c.priority || 'standard').toLowerCase()}`}>
                      {c.priority || 'Standard'}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: c.status?.includes('RESOLVED')
                          ? '#dcfce7'
                          : c.status?.includes('PENDING')
                          ? '#fef3c7'
                          : '#e0f2fe',
                        color: c.status?.includes('RESOLVED')
                          ? '#15803d'
                          : c.status?.includes('PENDING')
                          ? '#b45309'
                          : '#0369a1'
                      }}
                    >
                      {c.status || 'PENDING_OFFICER_REVIEW'}
                    </span>
                    {c.officer_notification_status && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--neutral-500)', marginTop: '3px' }}>
                        Alert: {c.officer_notification_status}
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="action-btn-sm"
                      onClick={() => setSelectedCaseId(c.case_id)}
                      title="Inspect full case dossier and open messaging"
                    >
                      Inspect & Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }
}
