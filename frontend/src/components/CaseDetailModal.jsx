import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  Star,
  CheckCircle2,
  Image as ImageIcon,
  HelpCircle,
  FileText,
  ShieldAlert
} from 'lucide-react';
import {
  fetchCaseDetails,
  fetchCaseMessages,
  sendCaseMessage,
  submitOfficerReview,
  submitCaseFeedback,
  getImageUrl
} from '../services/api';

export default function CaseDetailModal({ caseId, currentUser, onClose, onCaseUpdated }) {
  const [caseData, setCaseData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const [officerStatus, setOfficerStatus] = useState('UNDER_REVIEW');
  const [officerNotes, setOfficerNotes] = useState('');
  const [finalAdvisory, setFinalAdvisory] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Farmer Feedback State (Module 7)
  const [rating, setRating] = useState(5);
  const [wasHelpful, setWasHelpful] = useState(true);
  const [writtenFeedback, setWrittenFeedback] = useState('');
  const [outcomeUpdate, setOutcomeUpdate] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const messagesEndRef = useRef(null);

  const loadCase = async () => {
    try {
      setLoading(true);
      const details = await fetchCaseDetails(caseId);
      setCaseData(details);
      if (details.status) setOfficerStatus(details.status);
      if (details.officer_notes) setOfficerNotes(details.officer_notes);
      if (details.final_advisory) setFinalAdvisory(details.final_advisory);

      const msgs = await fetchCaseMessages(caseId);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [caseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSendingMsg(true);
    try {
      const newMsg = await sendCaseMessage(caseId, replyText.trim());
      setMessages((prev) => [...prev, newMsg]);
      setReplyText('');
      // Reload case status if changed
      const updatedDetails = await fetchCaseDetails(caseId);
      setCaseData(updatedDetails);
      if (onCaseUpdated) onCaseUpdated();
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  const isOfficer = currentUser?.role === 'officer' || currentUser?.role === 'admin';
  const isVerifiedOfficer = (currentUser?.role === 'officer' && currentUser?.verification_status === 'VERIFIED') || currentUser?.role === 'admin';
  const isPendingOfficer = currentUser?.role === 'officer' && currentUser?.verification_status !== 'VERIFIED';

  const officerJurisdiction = (currentUser?.district_jurisdiction || currentUser?.district || '').toLowerCase();
  const caseDistrict = (caseData?.district || '').toLowerCase();
  const caseState = (caseData?.state || '').toLowerCase();
  const officerState = (currentUser?.state || '').toLowerCase();

  const isWithinJurisdiction = currentUser?.role === 'admin' || !caseDistrict || (
    officerJurisdiction && (
      officerJurisdiction.includes(caseDistrict) ||
      (officerState && caseState && officerState.includes(caseState))
    )
  );

  const handleOfficerSave = async () => {
    setReviewError('');
    setReviewSuccess('');

    if (isPendingOfficer) {
      setReviewError('Account pending administrative verification. Unverified officers cannot modify or resolve cases.');
      return;
    }

    if (!isWithinJurisdiction) {
      setReviewError(`Case location (${caseData?.district || 'Unknown'}) is outside your assigned jurisdiction (${currentUser?.district_jurisdiction}).`);
      return;
    }

    if (officerStatus === 'RESOLVED' && !finalAdvisory.trim()) {
      setReviewError('Please provide the final verified agronomic prescription/recommendation before marking the case as RESOLVED.');
      return;
    }

    setSavingReview(true);
    try {
      await submitOfficerReview(caseId, officerStatus, officerNotes, finalAdvisory);
      setReviewSuccess(`Specialist decision recorded successfully: ${officerStatus}`);
      await loadCase();
      if (onCaseUpdated) onCaseUpdated();
    } catch (err) {
      setReviewError(err.message || 'Failed to save review');
    } finally {
      setSavingReview(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      await submitCaseFeedback(caseId, {
        rating,
        was_helpful: wasHelpful,
        written_feedback: writtenFeedback,
        outcome_update: outcomeUpdate
      });
      setFeedbackSuccess(true);
      loadCase();
      if (onCaseUpdated) onCaseUpdated();
    } catch (err) {
      alert('Failed to submit feedback: ' + err.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading || !caseData) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading case dossier and conversation thread...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content case-dossier-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span className="hm-id" style={{ fontSize: '0.85rem' }}>{caseData.case_id}</span>
              <span className={`priority-pill priority-${(caseData.priority || 'standard').toLowerCase()}`}>
                {caseData.priority} Priority
              </span>
              <span style={{ fontSize: '0.78rem', background: 'var(--neutral-100)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                Status: {caseData.status}
              </span>
              {caseData.officer_notification_status && (
                <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  Officer Alert: {caseData.officer_notification_status}
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--primary-900)' }}>
              {caseData.crop_name} Diagnostic Inquiry
            </h3>
          </div>
          <button type="button" className="close-modal-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {/* Assigned Officer Badge if verified */}
        {caseData.assigned_officer ? (
          <div className="assigned-officer-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="officer-verified-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <strong>Assigned Specialist: {caseData.assigned_officer.full_name}</strong>
                <p style={{ fontSize: '0.78rem', margin: 0, opacity: 0.9 }}>
                  {caseData.assigned_officer.designation} • {caseData.assigned_officer.institution} ({caseData.assigned_officer.district_jurisdiction || 'District Specialist'})
                </p>
              </div>
            </div>
            <span className="verified-badge-pill">
              ✓ Institutional Verified
            </span>
          </div>
        ) : (
          <div style={{ background: 'var(--amber-50)', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.82rem', color: '#92400e', marginBottom: '1rem', border: '1px solid #fde68a' }}>
            Escalated to Regional Extension Queue • Awaiting Specialist Assignment
          </div>
        )}

        {/* Case Info Grid */}
        <div className="dossier-grid">
          <div><strong>Farmer:</strong> {caseData.farmer_name}</div>
          <div><strong>Village / Taluka:</strong> {caseData.village} {caseData.taluka ? `(${caseData.taluka})` : ''}</div>
          <div><strong>District / State:</strong> {caseData.district || 'Wardha'}, {caseData.state || 'Maharashtra'}</div>
          <div><strong>Growth Stage:</strong> {caseData.growth_stage}</div>
          <div><strong>Submitted:</strong> {caseData.timestamp}</div>
        </div>

        {/* Farmer Inquiry Question */}
        <div className="dossier-section">
          <h4>Farmer Observations & Question:</h4>
          <div className="dossier-box">
            {caseData.question || 'No written text provided.'}
          </div>
          {caseData.voice_transcript && (
            <div style={{ marginTop: '0.5rem', background: 'var(--primary-50)', border: '1px solid var(--primary-200)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--primary-900)' }}>
              <strong>🎙️ Voice Query Transcript:</strong> "{caseData.voice_transcript}"
            </div>
          )}
        </div>

        {/* Attached Image if present */}
        {caseData.image_filename && (
          <div className="dossier-section">
            <h4>Uploaded Leaf / Crop Sample Photo:</h4>
            <div className="image-preview-wrapper" style={{ maxHeight: '200px' }}>
              <img
                src={getImageUrl(caseData.image_filename)}
                alt="Crop Sample"
                className="image-preview"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Automated ML Status & Escalation Reason */}
        <div className="ml-disclaimer-box" style={{ margin: '1rem 0' }}>
          <AlertTriangle size={18} className="icon" />
          <div>
            <strong style={{ fontSize: '0.85rem' }}>AI Diagnostic Status: Model Offline / Weights in Training</strong>
            <p style={{ fontSize: '0.78rem', margin: '2px 0 0' }}>
              Confidence Score: <strong>N/A</strong> (zero fabricated scores). Reason for escalation: {caseData.escalation_reason}
            </p>
          </div>
        </div>

        {/* Final Specialist Recommendation if resolved */}
        {caseData.final_advisory && (
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '8px', padding: '1rem', margin: '1rem 0' }}>
            <h4 style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <CheckCircle2 size={18} />
              Official Agricultural Specialist Recommendation
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#14532d', lineHeight: 1.5 }}>
              {caseData.final_advisory}
            </p>
            {caseData.officer_notes && (
              <p style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '0.4rem' }}>
                <em>Notes: {caseData.officer_notes}</em>
              </p>
            )}
          </div>
        )}

        {/* Two-Way Conversation Thread (Module 4) */}
        <div className="dossier-section" style={{ borderTop: '1px solid var(--neutral-200)', paddingTop: '1.2rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}>
            <MessageSquare size={18} style={{ color: 'var(--primary-700)' }} />
            Two-Way Case Inquiry Thread ({messages.length} messages)
          </h4>

          <div className="chat-thread-container">
            {messages.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', textAlign: 'center', padding: '1.5rem 0' }}>
                No messages yet. Send a follow-up inquiry or additional photo below.
              </p>
            ) : (
              messages.map((m) => {
                const isMine = m.sender_id === currentUser?.id;
                return (
                  <div key={m.id} className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                    <div className="chat-bubble">
                      <div className="chat-sender-header">
                        <strong>{m.sender_name}</strong>
                        <span>({m.sender_role})</span>
                      </div>
                      <p className="chat-msg-text">{m.message_text}</p>
                      <span className="chat-timestamp">{m.time_formatted || 'Just now'}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSendMessage} className="chat-reply-form">
            <input
              type="text"
              className="form-input"
              placeholder={isOfficer ? "Ask farmer for more information, crop age, or spray notes..." : "Reply to the officer or provide additional details..."}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={sendingMsg}
            />
            <button type="submit" className="btn-chat-send" disabled={sendingMsg || !replyText.trim()}>
              <Send size={16} />
              {sendingMsg ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>

        {/* Module 5: Officer Case Decision Controls (Officers Only) */}
        {isOfficer && (
          <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1.5px solid var(--neutral-200)' }}>
            <h4 style={{ color: 'var(--primary-900)', marginBottom: '0.8rem' }}>
              Specialist Case Management & Prescription
            </h4>

            {/* Administrative Verification Warning Banner */}
            {isPendingOfficer && (
              <div style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: '8px', padding: '0.9rem 1rem', marginBottom: '1.1rem', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <ShieldAlert size={22} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#92400e', display: 'block', fontSize: '0.9rem', marginBottom: '3px' }}>
                    Administrative Verification Pending
                  </strong>
                  <span style={{ color: '#78350f', fontSize: '0.82rem', lineHeight: 1.4, display: 'block' }}>
                    This officer account is awaiting administrator credential verification. In compliance with agricultural safety guidelines, case prescriptions and status updates are restricted until your institutional credentials are verified.
                  </span>
                </div>
              </div>
            )}

            {/* Jurisdiction Notice if verified but outside area */}
            {!isPendingOfficer && !isWithinJurisdiction && (
              <div style={{ background: '#fef2f2', border: '1.5px solid #ef4444', borderRadius: '8px', padding: '0.9rem 1rem', marginBottom: '1.1rem', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <AlertTriangle size={22} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#991b1b', display: 'block', fontSize: '0.9rem', marginBottom: '3px' }}>
                    Outside Assigned Jurisdiction
                  </strong>
                  <span style={{ color: '#7f1d1d', fontSize: '0.82rem', lineHeight: 1.4, display: 'block' }}>
                    Case location ({caseData?.district || 'Unknown'}, {caseData?.state || 'Unknown'}) is outside your assigned jurisdiction ({currentUser?.district_jurisdiction}). Official prescriptions must be recorded by the regional specialist.
                  </span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Update Case Lifecycle Status:</label>
              <select
                className="form-select"
                value={officerStatus}
                onChange={(e) => setOfficerStatus(e.target.value)}
                disabled={isPendingOfficer || !isWithinJurisdiction}
              >
                <option value="PENDING_OFFICER_REVIEW">PENDING_OFFICER_REVIEW (Pending Review)</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW (Active Investigation)</option>
                <option value="AWAITING_FARMER_RESPONSE">AWAITING_FARMER_RESPONSE (Requested More Info)</option>
                <option value="RESOLVED">RESOLVED (Official Advisory Issued)</option>
                <option value="CLOSED">CLOSED (Inquiry Completed)</option>
              </select>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{ fontSize: '0.75rem', background: officerStatus === 'RESOLVED' ? '#dcfce7' : '#f8fafc', border: '1px solid #86efac', color: '#166534', padding: '3px 8px', borderRadius: '4px', cursor: (isPendingOfficer || !isWithinJurisdiction) ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: (isPendingOfficer || !isWithinJurisdiction) ? 0.6 : 1 }}
                  onClick={() => (!isPendingOfficer && isWithinJurisdiction) && setOfficerStatus('RESOLVED')}
                  disabled={isPendingOfficer || !isWithinJurisdiction}
                >
                  ✓ RESOLVED
                </button>
                <button
                  type="button"
                  style={{ fontSize: '0.75rem', background: officerStatus === 'UNDER_REVIEW' ? '#e0f2fe' : '#f8fafc', border: '1px solid #7dd3fc', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', cursor: (isPendingOfficer || !isWithinJurisdiction) ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: (isPendingOfficer || !isWithinJurisdiction) ? 0.6 : 1 }}
                  onClick={() => (!isPendingOfficer && isWithinJurisdiction) && setOfficerStatus('UNDER_REVIEW')}
                  disabled={isPendingOfficer || !isWithinJurisdiction}
                >
                  ⏳ UNDER_REVIEW
                </button>
                <button
                  type="button"
                  style={{ fontSize: '0.75rem', background: officerStatus === 'AWAITING_FARMER_RESPONSE' ? '#f3e8ff' : '#f8fafc', border: '1px solid #d8b4fe', color: '#7e22ce', padding: '3px 8px', borderRadius: '4px', cursor: (isPendingOfficer || !isWithinJurisdiction) ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: (isPendingOfficer || !isWithinJurisdiction) ? 0.6 : 1 }}
                  onClick={() => (!isPendingOfficer && isWithinJurisdiction) && setOfficerStatus('AWAITING_FARMER_RESPONSE')}
                  disabled={isPendingOfficer || !isWithinJurisdiction}
                >
                  ❓ AWAITING_REPLY
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Final Verified Agronomic Prescription / Recommendation:</label>
              <textarea
                className="form-textarea"
                rows="3"
                placeholder={isPendingOfficer ? "Disabled: Officer credentials awaiting verification." : "Prescribe dosage, pesticide/fungicide recommendation, irrigation changes, or cultural practices..."}
                value={finalAdvisory}
                onChange={(e) => setFinalAdvisory(e.target.value)}
                disabled={isPendingOfficer || !isWithinJurisdiction}
              ></textarea>
            </div>

            <div className="form-group">
              <label className="form-label">Internal Officer Investigation Notes (Audit Log):</label>
              <input
                type="text"
                className="form-input"
                placeholder={isPendingOfficer ? "Disabled: Read-only access." : "e.g. Discussed with district lab; confirmed sucking pest thrips infestation."}
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                disabled={isPendingOfficer || !isWithinJurisdiction}
              />
            </div>

            {reviewError && (
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '0.65rem 0.9rem', borderRadius: '6px', marginBottom: '0.8rem', fontSize: '0.84rem' }}>
                ⚠️ {reviewError}
              </div>
            )}
            {reviewSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '0.65rem 0.9rem', borderRadius: '6px', marginBottom: '0.8rem', fontSize: '0.84rem' }}>
                ✓ {reviewSuccess}
              </div>
            )}

            <button
              type="button"
              className="btn-submit"
              style={{
                marginTop: '0.3rem',
                padding: '0.75rem',
                opacity: (isPendingOfficer || !isWithinJurisdiction) ? 0.6 : 1,
                cursor: (isPendingOfficer || !isWithinJurisdiction) ? 'not-allowed' : 'pointer'
              }}
              onClick={handleOfficerSave}
              disabled={savingReview || isPendingOfficer || !isWithinJurisdiction}
            >
              {isPendingOfficer
                ? '🔒 Verification Pending (Read-Only)'
                : (!isWithinJurisdiction
                    ? '🔒 Outside Assigned Jurisdiction'
                    : (savingReview ? 'Saving Changes...' : 'Save Decision & Issue to Farmer'))}
            </button>
          </div>
        )}

        {/* Module 7: Farmer Satisfaction Feedback (Farmers Only, when advisory delivered or case resolved) */}
        {!isOfficer && (caseData.status === 'RESOLVED' || caseData.status === 'UNDER_REVIEW' || caseData.final_advisory) && (
          <div style={{ marginTop: '1.5rem', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '1.2rem' }}>
            <h4 style={{ color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <Star size={18} style={{ color: '#d97706' }} />
              Farmer Advisory Satisfaction & Feedback
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#78350f', marginBottom: '0.8rem' }}>
              Was this agricultural guidance helpful for your crop? Your rating helps extension officers improve service quality.
            </p>

            {feedbackSuccess || caseData.has_feedback ? (
              <div style={{ background: '#dcfce7', padding: '0.8rem', borderRadius: '6px', color: '#166534', fontSize: '0.88rem', fontWeight: 600 }}>
                ✓ Thank you! Your satisfaction feedback has been submitted to the district registry.
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Rating:</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: star <= rating ? '#f59e0b' : '#d1d5db' }}
                      >
                        <Star size={22} fill={star <= rating ? '#f59e0b' : 'none'} />
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, marginLeft: '6px' }}>{rating}/5 Stars</span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.8rem', fontSize: '0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={wasHelpful === true}
                      onChange={() => setWasHelpful(true)}
                    />
                    Yes, advice was helpful
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={wasHelpful === false}
                      onChange={() => setWasHelpful(false)}
                    />
                    Needs further improvement
                  </label>
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Optional written feedback or comments for the officer..."
                    value={writtenFeedback}
                    onChange={(e) => setWrittenFeedback(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  style={{ width: 'auto', padding: '0.5rem 1.4rem', fontSize: '0.88rem' }}
                  disabled={submittingFeedback}
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Satisfaction Rating'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
