import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../i18n/LanguageContext';

export default function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`lang-switcher-container ${compact ? 'compact' : ''}`} style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '3px 6px',
      borderRadius: '24px',
      border: '1px solid var(--primary-200)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--primary-700)', padding: '0 4px', fontSize: '0.78rem', fontWeight: 600 }}>
        <Languages size={14} />
        {!compact && <span>भाषा:</span>}
      </div>

      <div style={{ display: 'flex', gap: '2px' }}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              title={`Switch to ${lang.fullName}`}
              style={{
                border: 'none',
                background: isActive ? 'var(--primary-700)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--neutral-700)',
                padding: '3px 8px',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
