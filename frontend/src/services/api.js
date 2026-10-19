/**
 * API service for Krishi Sathi AI: Complete Farmer & Agriculture Officer Advisory Platform.
 * Connects React frontend to the Python/Flask database-backed backend.
 */

// In development, empty API_BASE_URL routes through Vite proxy (see vite.config.js)
// In custom deployments, VITE_API_BASE_URL can override the destination.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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

export function getImageUrl(filename) {
  if (!filename) return '';
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  return `${baseUrl}/uploads/${filename}`;
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

/**
 * Robust fetch wrapper that translates low-level network errors into clear,
 * actionable diagnostics and parses JSON error payloads.
 */
async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
      throw new Error(
        'Unable to connect to Krishi Sathi AI backend service. Please verify that the Flask backend is running on http://127.0.0.1:5000.'
      );
    }
    throw err;
  }

  // Handle gateway or proxy errors that return HTML instead of JSON
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new Error(
        `Backend service unavailable (HTTP ${res.status}). Please verify that the Flask backend is running on http://127.0.0.1:5000.`
      );
    }
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with HTTP status ${res.status}`);
  }

  return data;
}

/* ========================================================
   MODULE 1 & 2: AUTHENTICATION & OFFICER VERIFICATION
   ======================================================== */
export async function registerUser(registrationData) {
  const data = await apiRequest('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registrationData)
  });
  if (data.data?.token) {
    setStoredSession(data.data.token, data.data.user);
  }
  return data;
}

export async function loginUser(identifier, password) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  if (data.data?.token) {
    setStoredSession(data.data.token, data.data.user);
  }
  return data;
}

export async function logoutUser() {
  try {
    await apiRequest('/api/auth/logout', {
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
    const data = await apiRequest('/api/auth/me', {
      headers: getAuthHeaders()
    });
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
  return await apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier })
  });
}

export async function adminVerifyOfficer(officerUserId, status, rejectionReason = '') {
  return await apiRequest('/api/auth/admin/verify-officer', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      officer_user_id: officerUserId,
      status,
      rejection_reason: rejectionReason
    })
  });
}

export async function fetchPendingOfficers() {
  return await apiRequest('/api/auth/admin/pending-officers', {
    headers: getAuthHeaders()
  });
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

  return await apiRequest('/api/advisory/submit', {
    method: 'POST',
    headers,
    body: formDataPayload
  });
}

export async function fetchFarmerHistory(params = {}) {
  const qs = new URLSearchParams();
  if (params.farmerName) qs.append('farmer_name', params.farmerName);
  if (params.crop) qs.append('crop', params.crop);
  if (params.status) qs.append('status', params.status);

  const query = qs.toString() ? `?${qs.toString()}` : '';
  return await apiRequest(`/api/advisory/history${query}`, {
    headers: getAuthHeaders()
  });
}

export async function fetchCaseDetails(caseId) {
  const data = await apiRequest(`/api/advisory/case/${caseId}`, {
    headers: getAuthHeaders()
  });
  return data.case;
}

/* ========================================================
   MODULE 4: TWO-WAY FARMER-OFFICER COMMUNICATION
   ======================================================== */
export async function fetchCaseMessages(caseId) {
  const data = await apiRequest(`/api/advisory/case/${caseId}/messages`, {
    headers: getAuthHeaders()
  });
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

  const data = await apiRequest(`/api/advisory/case/${caseId}/messages`, {
    method: 'POST',
    headers,
    body
  });
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

  const query = qs.toString() ? `?${qs.toString()}` : '';
  return await apiRequest(`/api/officer/cases${query}`, {
    headers: getAuthHeaders()
  });
}

export async function submitOfficerReview(caseId, status, notes, finalAdvisory = '') {
  return await apiRequest(`/api/officer/review/${caseId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, notes, final_advisory: finalAdvisory })
  });
}

export async function submitCaseFeedback(caseId, feedbackPayload) {
  return await apiRequest(`/api/advisory/case/${caseId}/feedback`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(feedbackPayload)
  });
}

export async function fetchFeedbackSummary() {
  const data = await apiRequest('/api/officer/feedback-summary', {
    headers: getAuthHeaders()
  });
  return data.summary;
}

/* ========================================================
   MODULE 8: ENVIRONMENTAL & CLUSTER DATA
   ======================================================== */
export async function fetchEnvironmentalCluster(location) {
  return await apiRequest(`/api/advisory/environmental-cluster?location=${encodeURIComponent(location || 'Wardha, Maharashtra')}`);
}

export async function fetchWeatherContext(location) {
  try {
    const url = `/api/advisory/weather?location=${encodeURIComponent(location || 'Wardha, Maharashtra')}`;
    return await apiRequest(url);
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
    return await apiRequest('/api/health');
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
    return await apiRequest('/api/advisory/status');
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
    const data = await apiRequest('/api/locations/states');
    if (data.states && data.states.length > 0) return data.states;
    return getDemoStates();
  } catch {
    return getDemoStates();
  }
}

export async function fetchDistricts(state) {
  if (!state) return [];
  try {
    const data = await apiRequest(`/api/locations/districts?state=${encodeURIComponent(state)}`);
    if (data.districts && data.districts.length > 0) return data.districts;
    return getDemoDistricts(state);
  } catch {
    return getDemoDistricts(state);
  }
}

export async function fetchTalukas(state, district) {
  if (!state || !district) return [];
  try {
    const data = await apiRequest(`/api/locations/talukas?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
    if (data.talukas && data.talukas.length > 0) return data.talukas;
    return getDemoTalukas(state, district);
  } catch {
    return getDemoTalukas(state, district);
  }
}

export async function fetchVillages(state, district, taluka) {
  if (!state || !district || !taluka) return [];
  try {
    const data = await apiRequest(`/api/locations/villages?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&taluka=${encodeURIComponent(taluka)}`);
    if (data.villages && data.villages.length > 0) return data.villages;
    return getDemoVillages(state, district, taluka);
  } catch {
    return getDemoVillages(state, district, taluka);
  }
}

export async function updateFarmerProfile(profileData) {
  const data = await apiRequest('/api/auth/profile/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(profileData)
  });
  if (data.user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  }
  return data;
}
