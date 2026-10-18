import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Shield, X, Sprout } from 'lucide-react';
import { loginUser, forgotPassword } from '../services/api';

export default function LoginPage({ onLoginSuccess, onNavigateRegister, onBackToHome }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState(null);
  const [forgotError, setForgotError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your registered mobile number or email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const resp = await loginUser(identifier.trim(), password);
      if (resp?.data?.user) {
        onLoginSuccess(resp.data.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoFarmer = () => {
    setIdentifier('farmer@krishisathi.ai');
    setPassword('password123');
    setErrorMessage('');
  };

  const fillDemoOfficer = () => {
    setIdentifier('officer@krishisathi.ai');
    setPassword('password123');
    setErrorMessage('');
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotResult(null);

    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your mobile or email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await forgotPassword(forgotIdentifier.trim());
      setForgotResult(res);
    } catch (err) {
      setForgotError(err.message || 'Failed to initiate password reset.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Brand header */}
        <div className="auth-brand-header">
          <div className="auth-brand-icon">
            <Sprout size={24} />
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to your Krishi Sathi AI account</p>
        </div>

        {/* Demo Quick-Fill Helpers */}
        <div className="demo-credentials-box">
          <span className="demo-title">Quick Demo Login:</span>
          <div className="demo-buttons-group">
            <button
              type="button"
              className="demo-badge-btn farmer"
              onClick={fillDemoFarmer}
              title="Click to fill Demo Farmer credentials"
            >
              🌱 Demo Farmer
            </button>
            <button
              type="button"
              className="demo-badge-btn officer"
              onClick={fillDemoOfficer}
              title="Click to fill Demo Extension Officer credentials"
            >
              🛡️ Demo Officer
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="auth-alert error">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-identifier">
              Mobile Number or Email Address
            </label>
            <div className="input-with-icon">
              <User size={18} className="field-icon" />
              <input
                id="login-identifier"
                type="text"
                className="form-input"
                placeholder="e.g. 9876543210 or farmer@krishisathi.ai"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="label-with-action">
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <button
                type="button"
                className="link-btn-text"
                onClick={() => {
                  setForgotIdentifier(identifier);
                  setShowForgotModal(true);
                }}
              >
                Forgot Password?
              </button>
            </div>
            <div className="input-with-icon">
              <Lock size={18} className="field-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="remember-me-row">
            <label className="remember-me-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me on this browser</span>
            </label>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
            id="btn-login-submit"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer-nav">
          <p>
            Don't have an account yet?{' '}
            <button
              type="button"
              className="link-highlight"
              onClick={onNavigateRegister}
            >
              Create New Account
            </button>
          </p>
          <div style={{ marginTop: '0.8rem' }}>
            <button
              type="button"
              className="link-btn-subtle"
              onClick={onBackToHome}
            >
              ← Return to Home Page
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset Your Password</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowForgotModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--neutral-600)', marginBottom: '1.2rem' }}>
              Enter your registered mobile number or email address to receive password recovery instructions.
            </p>

            {forgotError && (
              <div className="auth-alert error" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={18} />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotResult ? (
              <div className="auth-alert success" style={{ display: 'block', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, color: '#166534' }}>
                  <CheckCircle2 size={18} />
                  <span>Recovery Verified</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#14532d', lineHeight: 1.5 }}>
                  {forgotResult.message}
                </p>
                {forgotResult.recovery_code && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#dcfce7', borderRadius: '6px', textAlign: 'center', fontWeight: 800, letterSpacing: '0.05em' }}>
                    Recovery Code: {forgotResult.recovery_code}
                  </div>
                )}
                <button
                  type="button"
                  className="auth-submit-btn"
                  style={{ marginTop: '1rem' }}
                  onClick={() => setShowForgotModal(false)}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-identifier">
                    Registered Mobile / Email:
                  </label>
                  <input
                    id="forgot-identifier"
                    type="text"
                    className="form-input"
                    placeholder="e.g. 9876543210 or farmer@krishisathi.ai"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.2rem' }}>
                  <button
                    type="button"
                    className="landing-btn-secondary"
                    style={{ padding: '0.5rem 1rem' }}
                    onClick={() => setShowForgotModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="auth-submit-btn"
                    style={{ width: 'auto', padding: '0.5rem 1.4rem' }}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? 'Processing...' : 'Send Recovery Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
