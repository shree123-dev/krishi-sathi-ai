import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Droplets,
  Wind,
  Compass,
  AlertCircle,
  MapPin,
  RefreshCw,
  Layers,
  Thermometer,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { fetchEnvironmentalCluster } from '../services/api';

export default function EnvironmentalInsights({ defaultLocation, onLocationChange }) {
  const [locationInput, setLocationInput] = useState(defaultLocation || 'Wardha, Maharashtra');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadClusterData = async (loc) => {
    setLoading(true);
    try {
      const res = await fetchEnvironmentalCluster(loc);
      setData(res);
      if (onLocationChange) onLocationChange(loc);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClusterData(locationInput);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (locationInput.trim()) {
      loadClusterData(locationInput.trim());
    }
  };

  return (
    <div className="environmental-insights-view">
      {/* Header Banner */}
      <div className="env-header-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <div style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', padding: '6px', borderRadius: '8px' }}>
            <CloudSun size={22} />
          </div>
          <h2>Live Environmental & Agricultural Cluster Data</h2>
        </div>
        <p style={{ color: 'var(--neutral-600)', fontSize: '0.92rem' }}>
          Real-time agro-meteorological indicators calibrated to your regional cluster.
          No physical on-farm hardware required.
        </p>

        {/* Location selector form */}
        <form onSubmit={handleSearch} className="env-location-bar">
          <MapPin size={18} className="env-loc-icon" />
          <input
            type="text"
            className="env-loc-input"
            placeholder="Enter village, district, or agricultural cluster..."
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
          />
          <button type="submit" className="env-loc-btn" disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            {loading ? "Updating..." : "Sync Cluster Data"}
          </button>
        </form>
      </div>

      {data && (
        <div className="env-content-grid">
          {/* Main Weather Card */}
          <div className="agro-card">
            <div className="card-header">
              <div className="card-title-group">
                <div className="card-title-icon">
                  <Thermometer size={20} />
                </div>
                <div>
                  <h3>Ambient Atmospheric Conditions</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>
                    Cluster: {data.location} • Source: Open-Meteo Free API
                  </span>
                </div>
              </div>
              <span className="live-pill">Live Context</span>
            </div>

            <div className="weather-metrics" style={{ margin: '0 0 1.2rem' }}>
              <div className="metric-item" style={{ background: 'var(--primary-50)', color: 'var(--primary-900)' }}>
                <div className="metric-label" style={{ color: 'var(--primary-700)' }}>Air Temperature</div>
                <div className="metric-value">{data.air_temperature}°C</div>
              </div>

              <div className="metric-item" style={{ background: 'var(--primary-50)', color: 'var(--primary-900)' }}>
                <div className="metric-label" style={{ color: 'var(--primary-700)' }}>Relative Humidity</div>
                <div className="metric-value">{data.relative_humidity}%</div>
              </div>

              <div className="metric-item" style={{ background: 'var(--primary-50)', color: 'var(--primary-900)' }}>
                <div className="metric-label" style={{ color: 'var(--primary-700)' }}>Wind Speed</div>
                <div className="metric-value">{data.wind_speed} km/h</div>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '0.9rem', borderRadius: '8px', borderLeft: '4px solid var(--primary-600)', fontSize: '0.88rem', color: 'var(--primary-900)', lineHeight: 1.5 }}>
              <strong>Field Advisory Note:</strong> {data.agro_weather_advisory}
            </div>
          </div>

          {/* Module 8 Honest Soil & Physical Sensors Status */}
          <div className="agro-card">
            <div className="card-header">
              <div className="card-title-group">
                <div className="card-title-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <h3>Soil & Cluster In-Ground Sensors</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>
                    Honest Sensor Data Disclosure (Module 8)
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                Sensor Audit
              </span>
            </div>

            <div className="soil-sensors-list">
              <div className="soil-sensor-item">
                <div>
                  <strong>Volumetric Soil Moisture:</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', margin: '2px 0 0' }}>
                    {data.soil_moisture_status}
                  </p>
                </div>
                <span className="sensor-tag unavailable">Data Unavailable</span>
              </div>

              <div className="soil-sensor-item">
                <div>
                  <strong>Soil Temperature:</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', margin: '2px 0 0' }}>
                    {data.soil_temperature_status}
                  </p>
                </div>
                <span className="sensor-tag unavailable">Data Unavailable</span>
              </div>

              <div className="soil-sensor-item">
                <div>
                  <strong>Soil pH & Chemical Salinity:</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', margin: '2px 0 0' }}>
                    {data.soil_ph_status}
                  </p>
                </div>
                <span className="sensor-tag unavailable">Lab Test Required</span>
              </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--neutral-50)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
              ℹ️ <strong>Compliance Notice:</strong> Krishi Sathi AI explicitly refrains from inventing or fabricating soil moisture readings without physical calibrated probe telemetry.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
