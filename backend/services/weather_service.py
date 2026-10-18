import requests
import logging

logger = logging.getLogger(__name__)

# Fallback typical agricultural weather context if offline or API unreachable
DEFAULT_WEATHER_FALLBACK = {
    "location": "Local Farming Zone",
    "temperature": 27.5,
    "temperature_unit": "°C",
    "relative_humidity": 68,
    "humidity_unit": "%",
    "wind_speed": 11.2,
    "wind_unit": "km/h",
    "weather_code": 1,
    "condition": "Partly Cloudy",
    "rainfall_risk": "Moderate",
    "advisory_weather_note": "Favorable conditions for routine inspection; avoid foliar spraying if sudden rain clouds develop."
}

def get_weather_context(village_or_location: str) -> dict:
    """
    Fetch weather context for the given location using Open-Meteo's free public API.
    Zero API keys or paid subscriptions required.
    Includes robust offline fallback.
    """
    if not village_or_location or not village_or_location.strip():
        loc_display = "Unspecified Location"
    else:
        loc_display = village_or_location.strip()

    try:
        # Step 1: Free geocoding lookup
        geo_url = "https://geocoding-api.open-meteo.com/v1/search"
        geo_params = {"name": loc_display, "count": 1, "language": "en", "format": "json"}
        geo_resp = requests.get(geo_url, params=geo_params, timeout=3)
        
        if geo_resp.status_code == 200:
            data = geo_resp.json()
            results = data.get("results")
            if results and len(results) > 0:
                best_match = results[0]
                lat = best_match.get("latitude")
                lon = best_match.get("longitude")
                name = best_match.get("name", loc_display)
                country = best_match.get("country", "")
                admin1 = best_match.get("admin1", "")

                # Step 2: Fetch current weather for coordinates
                weather_url = "https://api.open-meteo.com/v1/forecast"
                weather_params = {
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
                }
                w_resp = requests.get(weather_url, params=weather_params, timeout=3)
                if w_resp.status_code == 200:
                    w_data = w_resp.json().get("current", {})
                    temp = w_data.get("temperature_2m", 28.0)
                    humidity = w_data.get("relative_humidity_2m", 65)
                    wind = w_data.get("wind_speed_10m", 10.0)
                    precip = w_data.get("precipitation", 0.0)
                    
                    # Interpret rainfall risk
                    if precip > 2.0:
                        risk = "High (Rain active/imminent)"
                        note = "High soil moisture expected. Delay irrigation and pesticide application to prevent runoff."
                    elif humidity > 80:
                        risk = "Elevated Fungal Risk"
                        note = "High humidity promotes fungal proliferation. Monitor leaves for mildew or blight signs."
                    else:
                        risk = "Low"
                        note = "Ideal window for scheduled irrigation and field scouting."

                    location_str = f"{name}, {admin1} ({country})".strip(", ")

                    return {
                        "location": location_str if location_str else loc_display,
                        "temperature": temp,
                        "temperature_unit": "°C",
                        "relative_humidity": humidity,
                        "humidity_unit": "%",
                        "wind_speed": wind,
                        "wind_unit": "km/h",
                        "rainfall_risk": risk,
                        "condition": "Live Context (Open-Meteo Free API)",
                        "advisory_weather_note": note,
                        "source": "Open-Meteo Free API (No key required)"
                    }
    except Exception as e:
        logger.warning(f"Could not reach live weather API ({e}); applying fallback context.")

    # Return clean fallback context tailored to the farmer's location name
    fallback = dict(DEFAULT_WEATHER_FALLBACK)
    fallback["location"] = loc_display
    fallback["source"] = "Standard Agro-Climatic Baseline (Offline Context)"
    return fallback
