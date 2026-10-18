import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Check, X, ShieldCheck, Sparkles, Copy } from 'lucide-react';

export default function PasswordStrengthField({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  disabled = false
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [suggestedNotice, setSuggestedNotice] = useState('');

  // Password rules evaluation
  const hasMinLength = password.length >= 8;
  const isRecommendedLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\/`~]/.test(password);

  // Score calculation: 0 to 4
  let score = 0;
  if (hasMinLength) score++;
  if (hasUpper && hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial && isRecommendedLength) score++;

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#15803d'];
  const strengthWidths = ['20%', '40%', '60%', '80%', '100%'];

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Cryptographically secure password generator
  const generateStrongPassword = () => {
    const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijkmnpqrstuvwxyz';
    const numberChars = '23456789';
    const specialChars = '!@#$%^&*-_+=';

    const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
    const array = new Uint32Array(16);
    window.crypto.getRandomValues(array);

    // Ensure at least one of each category
    let res = [
      uppercaseChars[array[0] % uppercaseChars.length],
      lowercaseChars[array[1] % lowercaseChars.length],
      numberChars[array[2] % numberChars.length],
      specialChars[array[3] % specialChars.length]
    ];

    for (let i = 4; i < 16; i++) {
      res.push(allChars[array[i] % allChars.length]);
    }

    // Shuffle characters
    res.sort(() => Math.random() - 0.5);
    const suggested = res.join('');

    onPasswordChange(suggested);
    onConfirmPasswordChange(suggested);

    // Copy to clipboard
    try {
      navigator.clipboard.writeText(suggested);
      setSuggestedNotice('Strong password generated, filled & copied to clipboard! You can edit it if desired.');
    } catch {
      setSuggestedNotice('Strong password generated and filled! You can edit it if desired.');
    }

    setTimeout(() => {
      setSuggestedNotice('');
    }, 6000);
  };

  return (
    <div className="password-strength-field-container">
      {/* Password Header with Suggest Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <label className="form-label" htmlFor="reg-password" style={{ marginBottom: 0 }}>
          Account Password <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <button
          type="button"
          onClick={generateStrongPassword}
          disabled={disabled}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary-700)',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            borderRadius: '4px'
          }}
        >
          <Sparkles size={14} />
          <span>Suggest a strong password</span>
        </button>
      </div>

      {suggestedNotice && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.6rem' }}>
          <Check size={14} color="#059669" />
          <span>{suggestedNotice}</span>
        </div>
      )}

      {/* Primary Password Input */}
      <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
        <input
          id="reg-password"
          type={showPassword ? 'text' : 'password'}
          className="form-input"
          placeholder="Enter your secure password..."
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          disabled={disabled}
          autoComplete="new-password"
          style={{ paddingRight: '40px' }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--neutral-500)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '4px'
          }}
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {/* Password Strength Meter */}
      {password.length > 0 && (
        <div style={{ marginBottom: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px', fontWeight: 600 }}>
            <span>Strength:</span>
            <span style={{ color: strengthColors[score] }}>{strengthLabels[score]}</span>
          </div>
          <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: strengthWidths[score],
                background: strengthColors[score],
                height: '100%',
                transition: 'all 0.3s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* Requirement Checklist */}
      <div style={{ background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasMinLength ? '#15803d' : 'var(--neutral-500)' }}>
          {hasMinLength ? <Check size={13} color="#15803d" /> : <div style={{ width: '13px', textAlign: 'center' }}>•</div>}
          <span>8+ chars ({isRecommendedLength ? '12+ ✓' : '12+ rec.'})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: (hasUpper && hasLower) ? '#15803d' : 'var(--neutral-500)' }}>
          {(hasUpper && hasLower) ? <Check size={13} color="#15803d" /> : <div style={{ width: '13px', textAlign: 'center' }}>•</div>}
          <span>Upper & lowercase</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasNumber ? '#15803d' : 'var(--neutral-500)' }}>
          {hasNumber ? <Check size={13} color="#15803d" /> : <div style={{ width: '13px', textAlign: 'center' }}>•</div>}
          <span>At least one number</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasSpecial ? '#15803d' : 'var(--neutral-500)' }}>
          {hasSpecial ? <Check size={13} color="#15803d" /> : <div style={{ width: '13px', textAlign: 'center' }}>•</div>}
          <span>Special symbol (!@#$%)</span>
        </div>
      </div>

      {/* Confirm Password Field */}
      <div className="form-group">
        <label className="form-label" htmlFor="reg-confirm-password">
          Confirm Password <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="reg-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            className="form-input"
            placeholder="Re-enter your password..."
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            disabled={disabled}
            autoComplete="new-password"
            style={{ paddingRight: '40px' }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--neutral-500)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
            title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Real-time matching feedback */}
        {passwordsMatch && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontSize: '0.8rem', marginTop: '4px', fontWeight: 600 }}>
            <Check size={14} />
            <span>Passwords match</span>
          </div>
        )}
        {passwordsMismatch && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontSize: '0.8rem', marginTop: '4px', fontWeight: 600 }}>
            <X size={14} />
            <span>Passwords do not match</span>
          </div>
        )}
      </div>
    </div>
  );
}
