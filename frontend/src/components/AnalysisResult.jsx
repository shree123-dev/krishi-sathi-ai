import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldQuestion, HelpCircle, ArrowRight, UserCheck, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function AnalysisResult({ result }) {
  const { t } = useLanguage();
  if (!result) return null;

  const {
    case_id,
    crop_name,
    growth_stage,
    location,
    analysis_status,
    confidence_score,
    detected_condition,
    stage_advisory,
    status,
    officer_status,
    officer_notes,
    final_advisory,
    assigned_officer_name,
    assigned_officer_designation,
    assigned_officer_institution,
    question,
    voice_transcript,
    image_filename,
    ml_model_status
  } = result;

  const isModelActive = ml_model_status === 'ACTIVE' || (confidence_score !== null && confidence_score !== undefined);
  const isResolvedByOfficer = status === 'RESOLVED' || status === 'AI_RESOLVED';
  const hasOfficerGuidance = Boolean(final_advisory || officer_notes);

  return (
    <div className="analysis-result-box" id="analysis-results-section">
      <div className="result-banner-header">
        <div>
          <span style={{ fontSize: '0.78rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('case_reference')}: {case_id}
          </span>
          <h3 style={{ color: 'white', fontSize: '1.25rem', marginTop: '2px' }}>
            {t('report_title')}
          </h3>
        </div>
        {isModelActive ? (
          <span className="status-badge-active" style={{ background: '#15803d', color: 'white', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
            <Sparkles size={14} />
            {t('model_active') || 'AI Model Active'}
          </span>
        ) : (
          <span className="status-badge-offline" title="Custom ML Model is in training">
            <ShieldQuestion size={14} />
            {t('model_not_connected')}
          </span>
        )}
      </div>

      <div className="result-body">
        {/* ML Status Explicit Disclaimer or Active Notice */}
        {isModelActive ? (
          <div className="ml-notice-box" style={{ marginTop: 0, marginBottom: '1.4rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.9rem 1.1rem', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Sparkles size={20} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ color: '#166534', margin: '0 0 4px 0', fontSize: '0.92rem' }}>
                {t('model_active_title') || 'Automated Preliminary Pattern Diagnosis'}
              </h4>
              <p style={{ color: '#15803d', margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>
                {stage_advisory?.diagnosis_notice || t('model_active_disclaimer') || 'Preliminary visual pattern analysis from trained neural network. Official specialist confirmation recommended.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="ml-disclaimer-box" style={{ marginTop: 0, marginBottom: '1.4rem' }}>
            <AlertTriangle size={20} className="icon" />
            <div>
              <h4>{t('ml_disclaimer_title')}</h4>
              <p>{t('ml_disclaimer_text')}</p>
            </div>
          </div>
        )}

        {/* PROMINENT OFFICER SOLVED PRESCRIPTION & MESSAGE (Requirement 2) */}
        {(isResolvedByOfficer || hasOfficerGuidance) && (
          <div style={{
            background: isResolvedByOfficer ? '#ecfdf5' : '#f0f9ff',
            border: isResolvedByOfficer ? '2px solid #34d399' : '2px solid #7dd3fc',
            borderRadius: '10px',
            padding: '1.2rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: isResolvedByOfficer ? '#059669' : '#0284c7', color: 'white', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 style={{ color: isResolvedByOfficer ? '#065f46' : '#075985', fontSize: '1.05rem', margin: 0 }}>
                    {t('specialist_recommendation')}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: isResolvedByOfficer ? '#047857' : '#0369a1' }}>
                    {assigned_officer_name ? `${assigned_officer_name} • ${assigned_officer_institution || 'Krishi Vigyan Kendra'}` : 'Verified Agriculture Extension Specialist'}
                  </span>
                </div>
              </div>
              <span style={{
                background: isResolvedByOfficer ? '#10b981' : '#0284c7',
                color: 'white',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}>
                {isResolvedByOfficer ? t('solved_badge') : (status ? status.replace(/_/g, ' ') : 'UNDER REVIEW')}
              </span>
            </div>

            {final_advisory && (
              <div style={{ background: 'white', padding: '0.9rem', borderRadius: '8px', border: '1px solid #a7f3d0', marginTop: '0.6rem' }}>
                <strong style={{ color: '#065f46', display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                  💊 {t('officer_advice_label')}:
                </strong>
                <p style={{ color: '#064e3b', fontSize: '0.92rem', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                  {final_advisory}
                </p>
              </div>
            )}

            {officer_notes && (
              <div style={{ marginTop: '0.6rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '6px', borderLeft: '3px solid #059669', fontSize: '0.84rem', color: '#047857' }}>
                <strong>💬 {t('officer_notes_label')}:</strong> {officer_notes}
              </div>
            )}
          </div>
        )}

        {/* Primary Metrics Grid */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">{t('crop_and_stage')}</div>
            <div className="stat-val-highlight">{crop_name}</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
              {growth_stage}
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-label">{t('ai_diagnosis')}</div>
            <div className="stat-val-highlight" style={{ color: isModelActive ? '#15803d' : 'var(--neutral-600)', fontSize: '0.98rem' }}>
              {detected_condition || 'Pending ML Model Weights'}
            </div>
            <span style={{ fontSize: '0.78rem', color: isModelActive ? '#16a34a' : 'var(--neutral-400)' }}>
              {isModelActive ? 'Automated Vision Model' : 'Model In Training'}
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-label">{t('confidence_score')}</div>
            <div className="stat-val-highlight stat-confidence-na" style={{ color: confidence_score ? '#15803d' : undefined }}>
              {confidence_score !== null && confidence_score !== undefined
                ? `${(confidence_score * 100).toFixed(1)}%`
                : 'N/A'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
              {confidence_score !== null && confidence_score !== undefined ? 'Calibrated Softmax Probability' : 'Zero fabricated confidence'}
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-label">{t('escalation_status')}</div>
            <div className="stat-val-highlight" style={{ fontSize: '0.95rem', color: isResolvedByOfficer ? '#059669' : 'var(--primary-700)' }}>
              {isResolvedByOfficer ? t('status_resolved') : (officer_status || t('status_pending'))}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>
              {isResolvedByOfficer ? '✓ Prescribed' : 'Specialist queue active'}
            </span>
          </div>
        </div>

        {/* Input Details Recap */}
        <div style={{ background: 'var(--neutral-50)', padding: '1rem', borderRadius: '8px', marginBottom: '1.4rem', border: '1px solid var(--neutral-200)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--neutral-500)', marginBottom: '0.4rem' }}>
            Submitted Inquiries & Media
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--neutral-700)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {image_filename && (
              <div><strong>Crop Image:</strong> Attached ({image_filename})</div>
            )}
            {question && (
              <div><strong>Question:</strong> "{question}"</div>
            )}
            {voice_transcript && (
              <div><strong>Voice Query:</strong> "{voice_transcript}"</div>
            )}
            <div><strong>Location:</strong> {location}</div>
          </div>
        </div>

        {/* Context-Aware Agronomic Advisory */}
        {stage_advisory && (
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--primary-900)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--primary-600)' }} />
              {t('context_advisory')} ({growth_stage})
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--neutral-600)', marginBottom: '0.5rem' }}>
              {stage_advisory.summary}
            </p>

            <ul className="advisory-bullet-list">
              {stage_advisory.cultural_practices?.map((practice, idx) => (
                <li key={idx}>
                  <ArrowRight size={15} className="bullet-icon" />
                  <span>{practice}</span>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: '0.8rem', padding: '0.75rem', background: 'var(--primary-50)', borderRadius: '8px', borderLeft: '3px solid var(--primary-600)', fontSize: '0.85rem', color: 'var(--primary-900)' }}>
              <strong>{t('irrigation_nutrition')}:</strong> {stage_advisory.irrigation_advice} {stage_advisory.nutrient_guideline}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
