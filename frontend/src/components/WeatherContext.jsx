import React from 'react';
import { CloudSun, Droplets, Wind, AlertCircle, MapPin } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function WeatherContext({ weather, loading }) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="weather-widget" style={{ opacity: 0.8 }}>
        <p>Fetching local agro-meteorological context...</p>
      </div>
    );
  }

  const location = weather?.location || 'Farming Zone';
  const temp = weather?.temperature ?? 27.5;
  const humidity = weather?.relative_humidity ?? 68;
  const wind = weather?.wind_speed ?? 11.0;
  const risk = weather?.rainfall_risk || 'Low';
  const note = weather?.advisory_weather_note || 'Current microclimate favorable for crop inspection.';
  const source = weather?.source || 'Open-Meteo Free API';

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', opacity: 0.9 }}>
            <MapPin size={14} />
            <span>{location}</span>
          </div>
          <h3>{t('weather_title')}</h3>
        </div>
        <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
          Free API
        </span>
      </div>

      <div className="weather-metrics">
        <div className="metric-item">
          <div className="metric-label">{t('temperature')}</div>
          <div className="metric-value">{temp}°C</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">{t('humidity')}</div>
          <div className="metric-value">{humidity}%</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">{t('rain_probability')}</div>
          <div className="metric-value" style={{ fontSize: '1.05rem', marginTop: '3px' }}>
            {risk}
          </div>
        </div>
      </div>

      <div className="weather-note">
        <AlertCircle size={16} style={{ flexShrink: 0 }} />
        <span><strong>{t('weather_advisory_note')}:</strong> {note}</span>
      </div>
    </div>
  );
}
