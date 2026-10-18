/**
 * API service for Krishi Sathi AI: Complete Farmer & Agriculture Officer Advisory Platform.
 * Connects React frontend to the Python/Flask database-backed backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const AUTH_STORAGE_KEY = 'krishi_sathi_auth_token';
export const USER_STORAGE_KEY = 'krishi_sathi_user';

export function getStoredToken() {
  return localStorage.getItem(AUTH_STORAGE_KEY);
}

export function getStoredUser() {
  const u = localStorage.getItem(USER_STORAGE_KEY);
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export function setStoredSession(token, user) {
  if (token) localStorage.setItem(AUTH_STORAGE_KEY, token);
  if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function getAuthHeaders(isFormData = false) {
  const headers = {};
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

/* ========================================================
   MODULE 1 & 2: AUTHENTICATION & OFFICER VERIFICATION
   ======================================================== */
export async function registerUser(registrationData) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registrationData)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  if (data.data?.token) {
    setStoredSession(data.data.token, data.data.user);
  }
  return data;
}

export async function loginUser(identifier, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  if (data.data?.token) {
    setStoredSession(data.data.token, data.data.user);
  }
  return data;
}

export async function logoutUser() {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch {
    // Silent catch
  } finally {
    clearStoredSession();
  }
}

export async function getCurrentUser() {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      clearStoredSession();
      return null;
    }
    const data = await res.json();
    if (data.authenticated && data.user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      return data.user;
    }
    // Session expired or revoked on server
    clearStoredSession();
    return null;
  } catch {
    return getStoredUser();
  }
}

export async function forgotPassword(identifier) {
  const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Password reset request failed');
  }
  return data;
}

export async function adminVerifyOfficer(officerUserId, status, rejectionReason = '') {
  const res = await fetch(`${API_BASE_URL}/api/auth/admin/verify-officer`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      officer_user_id: officerUserId,
      status,
      rejection_reason: rejectionReason
    })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Verification failed');
  }
  return data;
}

export async function fetchPendingOfficers() {
  const res = await fetch(`${API_BASE_URL}/api/auth/admin/pending-officers`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch pending officers');
  return await res.json();
}

/* ========================================================
   MODULE 3 & 6: CROP INQUIRY & FARMER HISTORY
   ======================================================== */
export async function submitCropAdvisory(formDataPayload) {
  const token = getStoredToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/advisory/submit`, {
    method: 'POST',
    headers,
    body: formDataPayload
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit crop inquiry');
  }
  return data;
}

export async function fetchFarmerHistory(params = {}) {
  const token = getStoredToken();
  const qs = new URLSearchParams();
  if (params.farmerName) qs.append('farmer_name', params.farmerName);
  if (params.crop) qs.append('crop', params.crop);
  if (params.status) qs.append('status', params.status);

  const res = await fetch(`${API_BASE_URL}/api/advisory/history?${qs.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch case history');
  return await res.json();
}

export async function fetchCaseDetails(caseId) {
  const res = await fetch(`${API_BASE_URL}/api/advisory/case/${caseId}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch case details');
  return data.case;
}

/* ========================================================
   MODULE 4: TWO-WAY FARMER-OFFICER COMMUNICATION
   ======================================================== */
export async function fetchCaseMessages(caseId) {
  const res = await fetch(`${API_BASE_URL}/api/advisory/case/${caseId}/messages`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch messages');
  return data.messages || [];
}

export async function sendCaseMessage(caseId, messageText, attachmentFile = null) {
  const token = getStoredToken();
  let headers = {};
  let body;

  if (attachmentFile) {
    const formData = new FormData();
    formData.append('message_text', messageText);
    formData.append('attachment', attachmentFile);
    if (token) headers['Authorization'] = `Bearer ${token}`;
    body = formData;
  } else {
    headers = getAuthHeaders();
    body = JSON.stringify({ message_text: messageText });
  }

  const res = await fetch(`${API_BASE_URL}/api/advisory/case/${caseId}/messages`, {
    method: 'POST',
    headers,
    body
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send message');
  return data.message;
}

/* ========================================================
   MODULE 5 & 7: OFFICER CASE MANAGEMENT & RATINGS
   ======================================================== */
export async function fetchOfficerCases(params = {}) {
  const qs = new URLSearchParams();
  if (params.priority && params.priority !== 'ALL') qs.append('priority', params.priority);
  if (params.status && params.status !== 'ALL') qs.append('status', params.status);
  if (params.search) qs.append('search', params.search);

  const res = await fetch(`${API_BASE_URL}/api/officer/cases?${qs.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch officer cases');
  return await res.json();
}

export async function submitOfficerReview(caseId, status, notes, finalAdvisory = '') {
  const res = await fetch(`${API_BASE_URL}/api/officer/review/${caseId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, notes, final_advisory: finalAdvisory })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Officer review update failed');
  return data;
}

export async function submitCaseFeedback(caseId, feedbackPayload) {
  const res = await fetch(`${API_BASE_URL}/api/advisory/case/${caseId}/feedback`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(feedbackPayload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Feedback submission failed');
  return data;
}

export async function fetchFeedbackSummary() {
  const res = await fetch(`${API_BASE_URL}/api/officer/feedback-summary`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to fetch feedback summary');
  return data.summary;
}

/* ========================================================
   MODULE 8: ENVIRONMENTAL & CLUSTER DATA
   ======================================================== */
export async function fetchEnvironmentalCluster(location) {
  const res = await fetch(`${API_BASE_URL}/api/advisory/environmental-cluster?location=${encodeURIComponent(location || 'Wardha, Maharashtra')}`);
  if (!res.ok) throw new Error('Failed to fetch environmental data');
  return await res.json();
}

export async function fetchWeatherContext(location) {
  try {
    const url = `${API_BASE_URL}/api/advisory/weather?location=${encodeURIComponent(location || 'Wardha, Maharashtra')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch weather');
    return await res.json();
  } catch {
    return {
      location: location || 'Farming Zone',
      temperature: 28.0,
      temperature_unit: '°C',
      relative_humidity: 65,
      humidity_unit: '%',
      wind_speed: 10.5,
      wind_unit: 'km/h',
      rainfall_risk: 'Low to Moderate',
      advisory_weather_note: 'Standard field conditions. Avoid foliar spray if convective cloud cover develops.',
      source: 'Default Baseline Context'
    };
  }
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      service: 'Crop Health Advisory Backend (Offline)',
      error: err.message
    };
  }
}

export async function fetchModelStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/advisory/status`);
    if (!res.ok) throw new Error('Status fetch failed');
    return await res.json();
  } catch {
    return {
      ml_model_loaded: false,
      status_label: 'Model Offline / Not Loaded',
      notice: 'ML inference model weights pending training. System operating in rule-based advisory and specialist escalation mode.',
      confidence_reporting: 'Disabled until model connection'
    };
  }
}

/* ========================================================
   CASCADING LOCATION API (State -> District -> Taluka -> Village)
   ======================================================== */
import {
  getDemoStates,
  getDemoDistricts,
  getDemoTalukas,
  getDemoVillages
} from '../data/demoLocations';

export async function fetchStates() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/locations/states`);
    if (!res.ok) throw new Error('Network failed');
    const data = await res.json();
    if (data.states && data.states.length > 0) return data.states;
    return getDemoStates();
  } catch {
    return getDemoStates();
  }
}

export async function fetchDistricts(state) {
  if (!state) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/locations/districts?state=${encodeURIComponent(state)}`);
    if (!res.ok) throw new Error('Network failed');
    const data = await res.json();
    if (data.districts && data.districts.length > 0) return data.districts;
    return getDemoDistricts(state);
  } catch {
    return getDemoDistricts(state);
  }
}

export async function fetchTalukas(state, district) {
  if (!state || !district) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/locations/talukas?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
    if (!res.ok) throw new Error('Network failed');
    const data = await res.json();
    if (data.talukas && data.talukas.length > 0) return data.talukas;
    return getDemoTalukas(state, district);
  } catch {
    return getDemoTalukas(state, district);
  }
}

export async function fetchVillages(state, district, taluka) {
  if (!state || !district || !taluka) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/locations/villages?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&taluka=${encodeURIComponent(taluka)}`);
    if (!res.ok) throw new Error('Network failed');
    const data = await res.json();
    if (data.villages && data.villages.length > 0) return data.villages;
    return getDemoVillages(state, district, taluka);
  } catch {
    return getDemoVillages(state, district, taluka);
  }
}

export async function updateFarmerProfile(profileData) {
  const res = await fetch(`${API_BASE_URL}/api/auth/profile/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(profileData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update farm profile');
  if (data.user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  }
  return data;
}

