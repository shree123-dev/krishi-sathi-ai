import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import FarmerDashboard from './components/FarmerDashboard';
import OfficerDashboard from './components/OfficerDashboard';
import {
  checkBackendHealth,
  fetchModelStatus,
  fetchWeatherContext,
  submitCropAdvisory,
  fetchOfficerCases,
  submitOfficerReview,
  getCurrentUser,
  clearStoredSession,
  getStoredToken
} from './services/api';

export default function App() {
  // Navigation Views: 'landing' | 'login' | 'register' | 'dashboard'
  const [currentView, setCurrentView] = useState('landing');
  const [activeTab, setActiveTab] = useState('farmer'); // 'farmer' | 'officer'

  // User Authentication State
  const hasStoredToken = Boolean(getStoredToken());
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(hasStoredToken);

  // System & Advisory State
  const [backendStatus, setBackendStatus] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [officerCases, setOfficerCases] = useState([]);
  const [notification, setNotification] = useState(null);

  // Initialize data on component mount
  useEffect(() => {
    async function initData() {
      // 1. Validate existing session against GET /api/auth/me
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setCurrentView('dashboard');
          if (user.role === 'officer') {
            setActiveTab('officer');
          } else {
            setActiveTab('farmer');
          }
        } else {
          setCurrentUser(null);
          clearStoredSession();
        }
      } catch {
        setCurrentUser(null);
        clearStoredSession();
      } finally {
        setAuthLoading(false);
      }


      // 2. Health & Model status
      const health = await checkBackendHealth();
      setBackendStatus(health);

      const mlInfo = await fetchModelStatus();
      setModelStatus(mlInfo);

      // 3. Initial Weather Context for default location (or user's village)
      const loc = user?.village || 'Wardha, Maharashtra';
      setWeatherLoading(true);
      const initialWeather = await fetchWeatherContext(loc);
      setWeather(initialWeather);
      setWeatherLoading(false);

      // 4. Officer Cases
      const casesData = await fetchOfficerCases();
      if (casesData?.cases) {
        setOfficerCases(casesData.cases);
      }
    }

    initData();
  }, []);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    showNotification(`Welcome back, ${user.full_name}!`);
    setCurrentView('dashboard');
    if (user.role === 'officer') {
      setActiveTab('officer');
    } else {
      setActiveTab('farmer');
    }
  };

  const handleRegisterSuccess = (user) => {
    setCurrentUser(user);
    showNotification(`Account created successfully! Welcome to Krishi Sathi, ${user.full_name}.`);
    setCurrentView('dashboard');
    if (user.role === 'officer') {
      setActiveTab('officer');
    } else {
      setActiveTab('farmer');
    }
  };

  const handleLogout = () => {
    clearStoredSession();
    setCurrentUser(null);
    showNotification('You have been signed out successfully.');
    setCurrentView('landing');
  };

  const handleLocationChange = async (newLocation) => {
    if (!newLocation) return;
    setWeatherLoading(true);
    const updatedWeather = await fetchWeatherContext(newLocation);
    setWeather(updatedWeather);
    setWeatherLoading(false);
  };

  const handleSubmitAdvisory = async (formData) => {
    setSubmitting(true);
    try {
      const response = await submitCropAdvisory(formData);
      if (response?.data) {
        setAnalysisResult(response.data);
        // Also update local officer queue so the officer can inspect this new case immediately
        setOfficerCases((prev) => [response.data, ...prev]);
        showNotification(
          `Case ${response.data.case_id} submitted! Weather context synced; ML analysis awaiting model integration.`
        );
      }
    } catch (err) {
      showNotification('Failed to process advisory inquiry: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOfficerReview = async (caseId, status, notes) => {
    try {
      const res = await submitOfficerReview(caseId, status, notes);
      setOfficerCases((prev) =>
        prev.map((c) => (c.case_id === caseId ? { ...c, officer_status: status, officer_notes: notes } : c))
      );
      if (analysisResult?.case_id === caseId) {
        setAnalysisResult((prev) => ({ ...prev, officer_status: status, officer_notes: notes }));
      }
      showNotification(`Case ${caseId} reviewed & updated successfully!`);
    } catch (err) {
      showNotification('Failed to update officer review: ' + err.message, 'error');
    }
  };

  const pendingReviewCount = officerCases.filter(
    (c) => c.officer_status === 'Under Review' || c.officer_status === 'Action Required'
  ).length;

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: notification.type === 'error' ? '#ef4444' : '#15803d',
            color: 'white',
            padding: '0.8rem 1.4rem',
            borderRadius: '8px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            fontSize: '0.9rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {notification.msg}
        </div>
      )}

      {/* Modern Navigation Header */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        pendingCasesCount={pendingReviewCount}
        backendStatus={backendStatus}
      />

      {/* Main Dynamic Viewport */}
      <main className="main-content">
        {authLoading ? (
          <div className="session-loading-container">
            <div className="session-loading-spinner" />
            <p style={{ color: 'var(--neutral-600)', fontSize: '0.95rem', fontWeight: 500, margin: 0 }}>
              Verifying session...
            </p>
          </div>
        ) : (
          <>
            {currentView === 'landing' && (
              <LandingPage
                onGetStarted={() => {
                  if (currentUser) {
                    setCurrentView('dashboard');
                  } else {
                    setCurrentView('dashboard');
                  }
                }}
                onNavigateLogin={() => setCurrentView('login')}
                onNavigateRegister={() => setCurrentView('register')}
              />
            )}

            {currentView === 'login' && (
              <LoginPage
                onLoginSuccess={handleLoginSuccess}
                onNavigateRegister={() => setCurrentView('register')}
                onBackToHome={() => setCurrentView('landing')}
              />
            )}

            {currentView === 'register' && (
              <RegisterPage
                onRegisterSuccess={handleRegisterSuccess}
                onNavigateLogin={() => setCurrentView('login')}
                onBackToHome={() => setCurrentView('landing')}
              />
            )}

            {currentView === 'dashboard' && (
              activeTab === 'farmer' ? (
                <FarmerDashboard
                  weather={weather}
                  weatherLoading={weatherLoading}
                  onLocationChange={handleLocationChange}
                  onSubmitAdvisory={handleSubmitAdvisory}
                  submitting={submitting}
                  analysisResult={analysisResult}
                  currentUser={currentUser}
                />
              ) : (
                <OfficerDashboard
                  cases={officerCases}
                  onUpdateReview={handleUpdateOfficerReview}
                  currentUser={currentUser}
                />
              )
            )}
          </>
        )}
      </main>

      {/* Clean Global Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div>
            <strong style={{ fontSize: '1rem', color: 'white', display: 'block', marginBottom: '4px' }}>
              Krishi Sathi AI
            </strong>
            <p style={{ fontSize: '0.82rem', color: 'var(--neutral-400)', maxWidth: '600px' }}>
              AI-Powered Crop Health Detection and Context-Aware Farmer Advisory System.
              Connecting Indian farmers with stage-specific agronomic intelligence and extension specialists.
            </p>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', textAlign: 'right' }}>
            <div>Internship Engineering Prototype</div>
            <div style={{ color: 'var(--primary-400)', marginTop: '3px' }}>
              React + Vite • Python Flask • PostgreSQL Ready
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
