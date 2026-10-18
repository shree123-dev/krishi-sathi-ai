import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS } from './translations';

const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
  { code: 'hi', label: 'हिन्दी', fullName: 'हिन्दी (Hindi)' },
  { code: 'mr', label: 'मराठी', fullName: 'मराठी (Marathi)' },
  { code: 'en', label: 'English', fullName: 'English' }
];

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('krishi_sathi_lang') || 'hi';
  });

  const setLanguage = (langCode) => {
    if (TRANSLATIONS[langCode]) {
      setLanguageState(langCode);
      localStorage.setItem('krishi_sathi_lang', langCode);
    }
  };

  const t = (key, fallback = '') => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.en;
    if (langDict && langDict[key] !== undefined) {
      return langDict[key];
    }
    // Fallback to English
    if (TRANSLATIONS.en && TRANSLATIONS.en[key] !== undefined) {
      return TRANSLATIONS.en[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
