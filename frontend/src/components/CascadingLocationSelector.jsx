import React, { useState, useEffect } from 'react';
import { MapPin, Search, ChevronDown, Check } from 'lucide-react';
import {
  fetchStates,
  fetchDistricts,
  fetchTalukas,
  fetchVillages
} from '../services/api';
import {
  getDemoStates,
  getDemoDistricts,
  getDemoTalukas,
  getDemoVillages
} from '../data/demoLocations';

export default function CascadingLocationSelector({
  value = {},
  onChange,
  disabled = false,
  required = true
}) {
  const {
    state = '',
    district = '',
    taluka = '',
    village = '',
    manualTaluka = '',
    manualVillage = ''
  } = value;

  // Options states initialized instantly with guaranteed demo/prototype data
  const [statesList, setStatesList] = useState(() => getDemoStates());
  const [districtsList, setDistrictsList] = useState(() => getDemoDistricts(state || 'Maharashtra'));
  const [talukasList, setTalukasList] = useState(() => getDemoTalukas(state || 'Maharashtra', district || 'Wardha'));
  const [villagesList, setVillagesList] = useState(() => getDemoVillages(state || 'Maharashtra', district || 'Wardha', taluka || 'Wardha'));

  // 1. Fetch live states from backend (gracefully falls back to demo list)
  useEffect(() => {
    let mounted = true;
    fetchStates().then((data) => {
      if (mounted && data && data.length > 0) {
        setStatesList(data);
      }
    }).catch(() => {
      if (mounted) setStatesList(getDemoStates());
    });
    return () => { mounted = false; };
  }, []);

  // 2. When State changes, instantly update districts from demo and try backend
  useEffect(() => {
    if (!state) {
      setDistrictsList([]);
      setTalukasList([]);
      setVillagesList([]);
      return;
    }
    // Instant demo update
    const demoDistricts = getDemoDistricts(state);
    setDistrictsList(demoDistricts);

    // Backend sync
    let mounted = true;
    fetchDistricts(state).then((data) => {
      if (mounted && data && data.length > 0) {
        setDistrictsList(data);
      }
    }).catch(() => {
      if (mounted) setDistrictsList(demoDistricts);
    });
    return () => { mounted = false; };
  }, [state]);

  // 3. When District changes, instantly update talukas from demo and try backend
  useEffect(() => {
    if (!state || !district) {
      setTalukasList([]);
      setVillagesList([]);
      return;
    }
    // Instant demo update
    const demoTalukas = getDemoTalukas(state, district);
    setTalukasList(demoTalukas);

    // Backend sync
    let mounted = true;
    fetchTalukas(state, district).then((data) => {
      if (mounted && data && data.length > 0) {
        setTalukasList(data);
      }
    }).catch(() => {
      if (mounted) setTalukasList(demoTalukas);
    });
    return () => { mounted = false; };
  }, [state, district]);

  // 4. When Taluka changes, instantly update villages from demo and try backend
  useEffect(() => {
    if (!state || !district || !taluka || taluka === 'Other / Enter manually') {
      setVillagesList(['Other / Enter manually']);
      return;
    }
    // Instant demo update
    const demoVillages = getDemoVillages(state, district, taluka);
    setVillagesList(demoVillages);

    // Backend sync
    let mounted = true;
    fetchVillages(state, district, taluka).then((data) => {
      if (mounted && data && data.length > 0) {
        setVillagesList(data);
      }
    }).catch(() => {
      if (mounted) setVillagesList(demoVillages);
    });
    return () => { mounted = false; };
  }, [state, district, taluka]);

  // Downstream Cascading Reset Handlers
  const handleStateChange = (newState) => {
    const nextDistricts = getDemoDistricts(newState);
    const firstDistrict = nextDistricts.length > 0 ? nextDistricts[0] : '';
    const nextTalukas = firstDistrict ? getDemoTalukas(newState, firstDistrict) : [];
    const firstTaluka = nextTalukas.length > 0 ? nextTalukas[0] : '';
    const nextVillages = (firstDistrict && firstTaluka) ? getDemoVillages(newState, firstDistrict, firstTaluka) : [];
    const firstVillage = nextVillages.length > 0 ? nextVillages[0] : '';

    onChange({
      state: newState,
      district: firstDistrict,
      taluka: firstTaluka,
      village: firstVillage,
      manualTaluka: '',
      manualVillage: ''
    });
  };

  const handleDistrictChange = (newDistrict) => {
    const nextTalukas = getDemoTalukas(state, newDistrict);
    const firstTaluka = nextTalukas.length > 0 ? nextTalukas[0] : '';
    const nextVillages = firstTaluka ? getDemoVillages(state, newDistrict, firstTaluka) : [];
    const firstVillage = nextVillages.length > 0 ? nextVillages[0] : '';

    onChange({
      ...value,
      district: newDistrict,
      taluka: firstTaluka,
      village: firstVillage,
      manualTaluka: '',
      manualVillage: ''
    });
  };

  const handleTalukaChange = (newTaluka) => {
    const nextVillages = getDemoVillages(state, district, newTaluka);
    const firstVillage = nextVillages.length > 0 ? nextVillages[0] : '';

    onChange({
      ...value,
      taluka: newTaluka,
      village: firstVillage,
      manualVillage: ''
    });
  };

  const handleVillageChange = (newVillage) => {
    onChange({
      ...value,
      village: newVillage
    });
  };

  const isManualTaluka = taluka === 'Other / Enter manually';
  const isManualVillage = village === 'Other / Enter manually';

  return (
    <div className="cascading-location-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.8rem', color: 'var(--primary-800)', fontWeight: 600, fontSize: '0.9rem' }}>
        <MapPin size={16} />
        <span>Administrative Location Hierarchy (State → District → Taluka → Village)</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* 1. STATE SELECTOR */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="loc-state-select">
            1. State {required && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <select
              id="loc-state-select"
              className="form-select"
              value={state}
              disabled={disabled}
              onChange={(e) => handleStateChange(e.target.value)}
            >
              <option value="">-- Select State --</option>
              {statesList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. DISTRICT SELECTOR */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="loc-district-select">
            2. District {required && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <select
              id="loc-district-select"
              className="form-select"
              value={district}
              disabled={disabled || !state}
              onChange={(e) => handleDistrictChange(e.target.value)}
            >
              <option value="">
                {!state ? 'Select a State first' : '-- Select District --'}
              </option>
              {districtsList.map((dist) => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. TALUKA / TEHSIL SELECTOR */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="loc-taluka-select">
            3. Taluka / Tehsil {required && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <select
              id="loc-taluka-select"
              className="form-select"
              value={taluka}
              disabled={disabled || !district}
              onChange={(e) => handleTalukaChange(e.target.value)}
            >
              <option value="">
                {!district ? 'Select a District first' : '-- Select Taluka / Tehsil --'}
              </option>
              {talukasList.map((tal) => (
                <option key={tal} value={tal}>{tal}</option>
              ))}
            </select>
          </div>
          {isManualTaluka && (
            <input
              type="text"
              id="loc-manual-taluka"
              className="form-input"
              style={{ marginTop: '6px' }}
              placeholder="Type your Taluka/Tehsil name..."
              value={manualTaluka}
              onChange={(e) => onChange({ ...value, manualTaluka: e.target.value })}
            />
          )}
        </div>

        {/* 4. VILLAGE SELECTOR */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="loc-village-select">
            4. Village / Town {required && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <select
              id="loc-village-select"
              className="form-select"
              value={village}
              disabled={disabled || !taluka}
              onChange={(e) => handleVillageChange(e.target.value)}
            >
              <option value="">
                {!taluka ? 'Select a Taluka first' : '-- Select Village --'}
              </option>
              {villagesList.map((vil) => (
                <option key={vil} value={vil}>{vil}</option>
              ))}
            </select>
          </div>
          {isManualVillage && (
            <input
              type="text"
              id="loc-manual-village"
              className="form-input"
              style={{ marginTop: '6px' }}
              placeholder="Type your Village or Gram Panchayat..."
              value={manualVillage}
              onChange={(e) => onChange({ ...value, manualVillage: e.target.value })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
