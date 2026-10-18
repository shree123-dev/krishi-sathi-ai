import React from 'react';
import { Sprout, UserCheck, LogOut, LogIn, UserPlus, Home, ShieldAlert, Sparkles, User } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar({
  currentView,
  setCurrentView,
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  pendingCasesCount,
  backendStatus
}) {
  const { t } = useLanguage();
  const isBackendOnline = backendStatus?.status === 'healthy';

  return (
    <header className="navbar">
      <div className="nav-inner">
        {/* Brand Link */}
        <div
          className="nav-brand"
          onClick={() => setCurrentView('landing')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <div className="brand-icon-wrapper">
            <Sprout size={24} />
          </div>
          <div className="brand-text">
            <h1>{t('app_title')}</h1>
            <p>{t('app_tagline')}</p>
          </div>
        </div>

        {/* Center Navigation depending on View */}
        {currentView === 'dashboard' ? (
          <nav className="nav-tabs" aria-label="Dashboard Switcher">
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'farmer' ? 'active' : ''}`}
              onClick={() => setActiveTab('farmer')}
              id="tab-farmer-portal"
            >
              <Sprout size={16} />
              {t('farmer_portal')}
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'officer' ? 'active' : ''}`}
              onClick={() => setActiveTab('officer')}
              id="tab-officer-portal"
            >
              <UserCheck size={16} />
              {t('officer_dashboard')}
              {pendingCasesCount > 0 && (
                <span className="tab-badge" title="Pending cases for officer review">
                  {pendingCasesCount}
                </span>
              )}
            </button>
          </nav>
        ) : (
          <nav className="landing-nav-links">
            <button
              type="button"
              className={`nav-link-item ${currentView === 'landing' ? 'active' : ''}`}
              onClick={() => setCurrentView('landing')}
            >
              <Home size={15} />
              {t('home')}
            </button>
            <button
              type="button"
              className="nav-link-item"
              onClick={() => {
                setCurrentView('landing');
                setTimeout(() => {
                  document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            >
              {t('features')}
            </button>
            <button
              type="button"
              className="nav-link-item"
              onClick={() => {
                setCurrentView('landing');
                setTimeout(() => {
                  document.getElementById('how-it-works-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            >
              {t('how_it_works')}
            </button>
            <button
              type="button"
              className="nav-link-item"
              onClick={() => setCurrentView('dashboard')}
            >
              <Sparkles size={15} />
              {t('live_workspace')}
            </button>
          </nav>
        )}

        {/* Right Section: Language Switcher, System status & User Auth State */}
        <div className="nav-right-actions">
          {/* Universal 3-Language Switcher (Hindi, Marathi, English) */}
          <LanguageSwitcher />

          {/* Status Pill */}
          <div className="system-status-pill" title="Backend & ML Model Status">
            <span className={`status-dot ${isBackendOnline ? 'active' : 'amber'}`}></span>
            <span>{isBackendOnline ? t('api_connected') : t('flask_standby')}</span>
            <span style={{ color: 'var(--neutral-400)' }}>|</span>
            <span style={{ color: 'var(--amber-700)' }}>{t('ml_model_offline')}</span>
          </div>

          {/* User Account / Navigation Buttons */}
          {currentUser ? (
            <div className="user-profile-menu">
              <div className="user-pill-info">
                <div className="avatar-mini">
                  {currentUser.role === 'officer' ? '🛡️' : '🌱'}
                </div>
                <div className="user-details-mini">
                  <span className="user-name-mini">{currentUser.full_name}</span>
                  <span className="user-role-badge">
                    {currentUser.role === 'officer' ? t('officer_role') : t('farmer_role')}
                  </span>
                </div>
              </div>

              {currentView !== 'dashboard' && (
                <button
                  type="button"
                  className="nav-btn-portal"
                  onClick={() => {
                    setCurrentView('dashboard');
                    if (currentUser.role === 'officer') setActiveTab('officer');
                    else setActiveTab('farmer');
                  }}
                >
                  {t('farmer_portal')}
                </button>
              )}

              <button
                type="button"
                className="btn-logout"
                onClick={onLogout}
                title={t('logout')}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="auth-nav-buttons">
              {currentView !== 'login' && (
                <button
                  type="button"
                  className="nav-btn-signin"
                  onClick={() => setCurrentView('login')}
                  id="nav-btn-login"
                >
                  <LogIn size={15} />
                  {t('login')}
                </button>
              )}
              {currentView !== 'register' && (
                <button
                  type="button"
                  className="nav-btn-register"
                  onClick={() => setCurrentView('register')}
                  id="nav-btn-register"
                >
                  <UserPlus size={15} />
                  {t('register')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
