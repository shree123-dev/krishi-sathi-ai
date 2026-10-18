import React, { useState, useEffect } from 'react';
import { Send, FileText, Sparkles, MapPin, Layers, CheckCircle } from 'lucide-react';
import ImageUploader from './ImageUploader';
import VoiceQueryInput from './VoiceQueryInput';
import { useLanguage } from '../i18n/LanguageContext';

const COMMON_CROPS = ['Wheat', 'Rice / Paddy', 'Cotton', 'Maize', 'Tomato', 'Potato', 'Soybean', 'Sugarcane'];

const GROWTH_STAGES = [
  'Germination / Emergence',
  'Seedling Stage',
  'Vegetative / Tillering',
  'Flowering / Anthesis',
  'Fruit / Pod / Grain Filling',
  'Maturity / Pre-Harvest'
];

export default function CropForm({ onSubmit, loading, onLocationChange, currentUser }) {
  const { t } = useLanguage();
  const [farmerName, setFarmerName] = useState('');
  const [cropName, setCropName] = useState('');
  const [location, setLocation] = useState('');
  const [growthStage, setGrowthStage] = useState('');
  const [question, setQuestion] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Auto-populate logged-in farmer details if present
  useEffect(() => {
    if (currentUser) {
      if (currentUser.full_name && !farmerName) {
        setFarmerName(currentUser.full_name);
      }
      if (currentUser.village && !location) {
        setLocation(currentUser.village);
        if (onLocationChange) onLocationChange(currentUser.village);
      }
    }
  }, [currentUser]);

  const handleImageSelect = (file) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleImageRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleLocationBlur = () => {
    if (location.trim() && onLocationChange) {
      onLocationChange(location.trim());
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!cropName.trim()) {
      setValidationError('Please select or specify the crop name.');
      return;
    }
    if (!location.trim()) {
      setValidationError('Please specify the farmer village/location.');
      return;
    }
    if (!growthStage) {
      setValidationError('Please select the crop growth stage.');
      return;
    }

    const formData = new FormData();
    formData.append('farmer_name', farmerName || (currentUser?.full_name || 'Farmer'));
    formData.append('crop_name', cropName);
    formData.append('location', location);
    formData.append('village', currentUser?.village || location);
    if (currentUser?.taluka) formData.append('taluka', currentUser.taluka);
    if (currentUser?.district) formData.append('district', currentUser.district);
    if (currentUser?.state) formData.append('state', currentUser.state);
    formData.append('growth_stage', growthStage);
    formData.append('question', question);
    formData.append('voice_transcript', voiceTranscript);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    onSubmit(formData);
  };

  return (
    <form className="agro-card" onSubmit={handleSubmit} id="crop-advisory-form">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-title-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <h2>Farmer Diagnostic Inquiry</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
              Submit crop details, leaf photo, or symptom questions
            </p>
          </div>
        </div>
        {currentUser && (
          <span style={{ fontSize: '0.72rem', background: 'var(--primary-100)', color: 'var(--primary-800)', padding: '3px 8px', borderRadius: '999px', fontWeight: 600 }}>
            Logged in: {currentUser.full_name}
          </span>
        )}
      </div>

      {validationError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem' }}>
          {validationError}
        </div>
      )}

      {/* Basic Demographics & Crop Details */}
      <div className="form-section-title">1. Crop & Field Information</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="farmer-name">
            Farmer's Name <span style={{ color: 'var(--neutral-400)', fontWeight: 400 }}>(Optional)</span>
          </label>
          <input
            id="farmer-name"
            type="text"
            className="form-input"
            placeholder="e.g. Ramesh Patel"
            value={farmerName}
            onChange={(e) => setFarmerName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="farmer-location">
            {t('village_location_label')} <span className="req">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="farmer-location"
              type="text"
              className="form-input"
              placeholder="e.g. Wardha, Maharashtra"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={handleLocationBlur}
              required
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="crop-name">
          {t('crop_name_label')} <span className="req">*</span>
        </label>
        <input
          id="crop-name"
          type="text"
          className="form-input"
          placeholder={t('crop_name_placeholder')}
          value={cropName}
          onChange={(e) => setCropName(e.target.value)}
          required
        />
        <div className="quick-tags">
          {COMMON_CROPS.map((crop) => (
            <button
              key={crop}
              type="button"
              className="quick-tag-btn"
              onClick={() => setCropName(crop)}
            >
              + {crop}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="growth-stage">
          {t('growth_stage_label')} <span className="req">*</span>
        </label>
        <select
          id="growth-stage"
          className="form-select"
          value={growthStage}
          onChange={(e) => setGrowthStage(e.target.value)}
          required
        >
          <option value="">-- {t('growth_stage_label')} --</option>
          {GROWTH_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </div>

      {/* Three Input Options */}
      <div className="form-section-title">2. {t('ask_question_label')}</div>

      <div className="input-options-container">
        {/* Option 1: Image Upload */}
        <ImageUploader
          imageFile={imageFile}
          previewUrl={previewUrl}
          onImageSelect={handleImageSelect}
          onImageRemove={handleImageRemove}
        />

        {/* Option 2: Written Question */}
        <div className={`option-box ${question.trim() ? 'active' : ''}`}>
          <div className="option-box-header">
            <span className="option-title">
              <FileText size={18} style={{ color: 'var(--primary-600)' }} />
              {t('ask_question_label')}
            </span>
          </div>
          <textarea
            id="crop-question-input"
            className="form-textarea"
            rows="3"
            placeholder={t('ask_question_placeholder')}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          ></textarea>
        </div>

        {/* Option 3: Voice Query */}
        <VoiceQueryInput
          voiceTranscript={voiceTranscript}
          setVoiceTranscript={setVoiceTranscript}
        />
      </div>

      {/* Submission Action */}
      <button
        type="submit"
        className="btn-submit"
        disabled={loading}
        id="submit-advisory-btn"
      >
        <Send size={18} />
        {loading ? t('submitting_btn') : t('submit_advisory_btn')}
      </button>
    </form>
  );
}
