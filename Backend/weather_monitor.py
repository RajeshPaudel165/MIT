import requests
import os
from datetime import datetime
import json

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    firebase_available = True
except ImportError:
    firebase_available = False
    print("Firebase not available - using mock/API data only")

class WeatherMonitor:
    def __init__(self):
        self.api_key = os.environ.get('WEATHER_API_KEY', 'demo_key')
        self.base_url = "http://api.openweathermap.org/data/2.5"
        self.default_city = os.environ.get('DEFAULT_CITY', 'Vancouver')
        self.default_country = os.environ.get('DEFAULT_COUNTRY', 'CA')
        self.db = None
        
        # Initialize Firebase if available - simplified approach
        if firebase_available:
            try:
                # Try to get existing app or initialize quickly
                try:
                    app = firebase_admin.get_app()
                    self.db = firestore.client(app)
                    print("✅ Firebase connected for weather monitoring")
                except ValueError:
                    # App doesn't exist, try to initialize with timeout
                    if not firebase_admin._apps:
                        try:
                            # Quick initialization attempt
                            firebase_admin.initialize_app()
                            self.db = firestore.client()
                            print("✅ Firebase connected for weather monitoring")
                        except Exception as cred_error:
                            print(f"⚠️ Firebase credentials not available - using weather API only")
                            self.db = None
                    else:
                        self.db = firestore.client()
                        print("✅ Firebase connected for weather monitoring")
                        
            except Exception as e:
                print(f"⚠️ Firebase initialization issue - using weather API only")
                self.db = None
        else:
            print("⚠️ Firebase not available - using weather API/mock data only")
        
    def get_outdoor_sensor_data(self):
        """Get weather data from outdoor sensors stored in Firebase"""
        if not self.db:
            return None
            
        try:
            # Try to get weather data from outdoor sensors
            outdoor_ref = self.db.collection('outdoor_weather_data')
            docs = outdoor_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(1).get()
            
            if docs:
                doc = docs[0]
                data = doc.to_dict()
                
                # Transform to standard format
                outdoor_weather = {
                    'temperature': data.get('temperature', 22),
                    'humidity': data.get('humidity', 60),
                    'pressure': data.get('pressure', 1013),
                    'description': self._get_weather_description_from_sensors(data),
                    'main': self._get_weather_main_from_sensors(data),
                    'wind_speed': data.get('wind_speed', 5.0),
                    'visibility': data.get('visibility', 10.0),
                    'uv_index': data.get('uv_index', 5),
                    'light_intensity': data.get('light_intensity', 50000),  # Lux
                    'timestamp': data.get('timestamp', datetime.now()).isoformat() if hasattr(data.get('timestamp'), 'isoformat') else datetime.now().isoformat(),
                    'source': 'outdoor_sensors'
                }
                
                print(f"🌿 Using outdoor sensor data: {outdoor_weather['temperature']}°C, {outdoor_weather['humidity']}% humidity")
                return outdoor_weather
            
        except Exception as e:
            print(f"❌ Error fetching outdoor sensor data: {e}")
            
        return None
    
    def get_soil_environmental_data(self):
        """Get environmental context from soil sensors"""
        if not self.db:
            return None
            
        try:
            # Get latest soil data for environmental context
            soil_ref = self.db.collection('soil_data')
            docs = soil_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(1).get()
            
            if docs:
                doc = docs[0]
                soil_data = doc.to_dict()
                
                # Extract environmental indicators from soil data
                soil_temp = soil_data.get('temperature', 20)
                soil_moisture = soil_data.get('moisture', 50)
                
                # Estimate surface conditions from soil conditions
                estimated_air_temp = soil_temp + 2  # Air usually warmer than soil
                
                return {
                    'soil_temperature': soil_temp,
                    'soil_moisture': soil_moisture,
                    'estimated_air_temperature': estimated_air_temp,
                    'source': 'soil_sensors',
                    'timestamp': soil_data.get('timestamp', datetime.now()).isoformat() if hasattr(soil_data.get('timestamp'), 'isoformat') else datetime.now().isoformat()
                }
        except Exception as e:
            print(f"❌ Error fetching soil environmental data: {e}")
            
        return None
    
    def _get_weather_description_from_sensors(self, sensor_data):
        """Generate weather description from sensor readings"""
        temp = sensor_data.get('temperature', 22)
        humidity = sensor_data.get('humidity', 60)
        light = sensor_data.get('light_intensity', 50000)
        
        if light > 80000:  # Very bright
            if temp > 30:
                return "hot and sunny with intense sunlight"
            elif temp > 20:
                return "warm and sunny"
            else:
                return "cool but bright"
        elif light > 40000:  # Moderate light
            if humidity > 70:
                return "partly cloudy and humid"
            else:
                return "partly cloudy"
        else:  # Low light
            if humidity > 80:
                return "overcast and humid"
            else:
                return "overcast"
    
    def _get_weather_main_from_sensors(self, sensor_data):
        """Get main weather condition from sensor data"""
        temp = sensor_data.get('temperature', 22)
        light = sensor_data.get('light_intensity', 50000)
        
        if light > 80000:
            return "Clear"
        elif light > 40000:
            return "Clouds" 
        else:
            return "Overcast"
            
    def get_current_weather(self, city=None, country=None):
        """Get current weather data - prioritize outdoor sensors, then real API, then mock"""
        city = city or self.default_city
        country = country or self.default_country
        
        # First priority: Real outdoor sensors
        outdoor_data = self.get_outdoor_sensor_data()
        if outdoor_data:
            return outdoor_data
        
        # Second priority: Estimate from soil sensors
        soil_env = self.get_soil_environmental_data()
        if soil_env:
            print(f"🌱 Using soil sensor environmental data: {soil_env['estimated_air_temperature']}°C estimated from soil")
            return {
                'temperature': soil_env['estimated_air_temperature'],
                'humidity': 60,  # Default estimate
                'description': f"estimated from soil temperature {soil_env['soil_temperature']}°C",
                'main': 'Clear' if soil_env['estimated_air_temperature'] > 25 else 'Clouds',
                'wind_speed': 10,  # Default estimate
                'visibility': 10,
                'uv_index': 6 if soil_env['estimated_air_temperature'] > 25 else 3,
                'timestamp': soil_env['timestamp'],
                'source': 'soil_sensors_estimated',
                'soil_context': {
                    'soil_temperature': soil_env['soil_temperature'],
                    'soil_moisture': soil_env['soil_moisture']
                }
            }
        
        # Third priority: Free Open-Meteo Weather API (same as useOutdoorMode)
        try:
            # Get coordinates for Vancouver, CA (or use default coordinates)
            lat, lon = 49.2827, -123.1207  # Vancouver coordinates
            
            # Use Open-Meteo API (completely free, no API key required)
            weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto"
            
            response = requests.get(weather_url)
            response.raise_for_status()
            
            data = response.json()
            
            # Helper function to convert weather code to description
            def get_weather_condition(code):
                weather_codes = {
                    0: 'clear sky',
                    1: 'mainly clear',
                    2: 'partly cloudy',
                    3: 'overcast',
                    45: 'fog',
                    48: 'depositing rime fog',
                    51: 'light drizzle',
                    53: 'moderate drizzle',
                    55: 'dense drizzle',
                    61: 'slight rain',
                    63: 'moderate rain',
                    65: 'heavy rain',
                    71: 'slight snow',
                    73: 'moderate snow',
                    75: 'heavy snow',
                    80: 'slight rain showers',
                    81: 'moderate rain showers',
                    82: 'violent rain showers',
                    95: 'thunderstorm',
                    96: 'thunderstorm with slight hail',
                    99: 'thunderstorm with heavy hail'
                }
                return weather_codes.get(code, f'weather condition {code}')
            
            def get_weather_main(code):
                if code == 0 or code == 1:
                    return 'Clear'
                elif code in [2, 3]:
                    return 'Clouds'
                elif code in [61, 63, 65, 80, 81, 82]:
                    return 'Rain'
                elif code in [95, 96, 99]:
                    return 'Thunderstorm'
                elif code in [71, 73, 75]:
                    return 'Snow'
                else:
                    return 'Clouds'
            
            current = data.get('current', {})
            weather_code = current.get('weather_code', 0)
            
            weather_info = {
                'temperature': round(current.get('temperature_2m', 20), 1),
                'humidity': round(current.get('relative_humidity_2m', 60)),
                'description': get_weather_condition(weather_code),
                'main': get_weather_main(weather_code),
                'wind_speed': round(current.get('wind_speed_10m', 10), 1),
                'visibility': 10,  # Not provided by Open-Meteo
                'uv_index': 5,  # Would need separate UV API call
                'timestamp': datetime.now().isoformat(),
                'source': 'open_meteo_api'
            }
            
            print(f"🌐 Using Open-Meteo weather API: {weather_info['temperature']}°C, {weather_info['description']}")
            return weather_info
                
        except Exception as e:
            print(f"❌ Error fetching weather data from Open-Meteo: {e}")
            
            # Final fallback: Smart mock data with realistic variations
            return self._get_realistic_mock_weather_data()
    
    def get_weather_forecast(self, city=None, country=None):
        """Get 5-day weather forecast using Open-Meteo API"""
        city = city or self.default_city
        country = country or self.default_country
        
        try:
            # Use Open-Meteo forecast API (free, no API key required)
            lat, lon = 49.2827, -123.1207  # Vancouver coordinates
            
            forecast_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&temperature_unit=celsius&timezone=auto&forecast_days=5"
            
            response = requests.get(forecast_url)
            response.raise_for_status()
            
            data = response.json()
            
            def get_weather_condition(code):
                weather_codes = {
                    0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
                    45: 'fog', 48: 'depositing rime fog', 51: 'light drizzle', 53: 'moderate drizzle',
                    55: 'dense drizzle', 61: 'slight rain', 63: 'moderate rain', 65: 'heavy rain',
                    71: 'slight snow', 73: 'moderate snow', 75: 'heavy snow',
                    80: 'slight rain showers', 81: 'moderate rain showers', 82: 'violent rain showers',
                    95: 'thunderstorm', 96: 'thunderstorm with slight hail', 99: 'thunderstorm with heavy hail'
                }
                return weather_codes.get(code, f'weather condition {code}')
            
            def get_weather_main(code):
                if code == 0 or code == 1:
                    return 'Clear'
                elif code in [2, 3]:
                    return 'Clouds'
                elif code in [61, 63, 65, 80, 81, 82]:
                    return 'Rain'
                elif code in [95, 96, 99]:
                    return 'Thunderstorm'
                elif code in [71, 73, 75]:
                    return 'Snow'
                else:
                    return 'Clouds'
            
            daily = data.get('daily', {})
            forecast = []
            
            times = daily.get('time', [])
            temp_max = daily.get('temperature_2m_max', [])
            temp_min = daily.get('temperature_2m_min', [])
            precip_prob = daily.get('precipitation_probability_max', [])
            weather_codes = daily.get('weather_code', [])
            
            for i in range(min(5, len(times))):
                forecast.append({
                    'datetime': times[i],
                    'temperature': round((temp_max[i] + temp_min[i]) / 2, 1) if i < len(temp_max) and i < len(temp_min) else 20,
                    'humidity': 60,  # Open-Meteo doesn't provide daily humidity in free tier
                    'description': get_weather_condition(weather_codes[i] if i < len(weather_codes) else 0),
                    'main': get_weather_main(weather_codes[i] if i < len(weather_codes) else 0),
                    'precipitation': precip_prob[i] if i < len(precip_prob) else 0
                })
            
            print(f"🌐 Retrieved {len(forecast)} day forecast from Open-Meteo")
            return forecast
            
        except Exception as e:
            print(f"❌ Error fetching forecast data from Open-Meteo: {e}")
            return self._get_mock_forecast_data()
    
    def _get_realistic_mock_weather_data(self):
        """Enhanced mock weather data with realistic seasonal and time-based variations"""
        import random
        from datetime import datetime
        
        # Get current time and season for realistic conditions
        now = datetime.now()
        hour = now.hour
        month = now.month
        
        # Seasonal temperature ranges (Vancouver-like climate)
        if month in [12, 1, 2]:  # Winter
            base_temp = random.randint(2, 8)
            conditions = ['overcast', 'light rain', 'partly cloudy', 'fog']
        elif month in [3, 4, 5]:  # Spring
            base_temp = random.randint(12, 18)
            conditions = ['partly cloudy', 'light rain', 'overcast', 'mainly clear']
        elif month in [6, 7, 8]:  # Summer
            base_temp = random.randint(20, 28)
            conditions = ['clear sky', 'mainly clear', 'partly cloudy']
        else:  # Fall
            base_temp = random.randint(8, 16)
            conditions = ['overcast', 'light rain', 'partly cloudy', 'fog']
        
        # Daily temperature variation (cooler at night)
        if 6 <= hour <= 18:  # Daytime
            temp_adjustment = random.randint(0, 4)
        else:  # Nighttime
            temp_adjustment = random.randint(-4, 0)
        
        final_temp = base_temp + temp_adjustment
        condition = random.choice(conditions)
        
        # Humidity based on season and weather
        if 'rain' in condition or 'fog' in condition:
            humidity = random.randint(80, 95)
        elif 'clear' in condition:
            humidity = random.randint(40, 70)
        else:
            humidity = random.randint(60, 80)
        
        # Main weather type based on condition
        if 'clear' in condition:
            main = 'Clear'
        elif 'rain' in condition:
            main = 'Rain'
        elif 'fog' in condition:
            main = 'Fog'
        else:
            main = 'Clouds'
        
        return {
            'temperature': final_temp,
            'humidity': humidity,
            'description': condition,
            'main': main,
            'wind_speed': random.randint(5, 25),
            'visibility': random.randint(5, 15),
            'uv_index': random.randint(1, 8) if 6 <= hour <= 18 and 'clear' in condition else random.randint(1, 4),
            'timestamp': now.isoformat(),
            'source': 'realistic_mock'
        }
    
    def _get_mock_forecast_data(self):
        """Mock forecast data for demo purposes"""
        import random
        from datetime import datetime, timedelta
        
        forecast = []
        base_time = datetime.now()
        
        for i in range(8):
            time = base_time + timedelta(hours=i*3)
            condition = random.choice(['Clear', 'Rain', 'Clouds', 'Sun'])
            
            forecast.append({
                'datetime': time.strftime('%Y-%m-%d %H:%M:%S'),
                'temperature': random.randint(15, 35),
                'humidity': random.randint(30, 90),
                'description': f"{condition.lower()} conditions",
                'main': condition,
                'precipitation': random.randint(0, 10) if condition == 'Rain' else 0
            })
        
        return forecast
    
    def check_weather_alerts(self, user_email, weather_data=None):
        """Check if weather conditions require alerts and include soil context"""
        alerts = []
        
        if not weather_data:
            weather_data = self.get_current_weather()
        
        # Get soil context for enhanced recommendations
        soil_context = self.get_soil_environmental_data()
        
        # Check for extreme heat/sun
        if weather_data['temperature'] > 30 and weather_data['main'] in ['Clear', 'Sun']:
            recommendations = [
                "Provide shade for sensitive plants",
                "Increase watering frequency", 
                "Water early morning or late evening",
                "Mulch around plants to retain moisture"
            ]
            
            # Add soil-specific recommendations
            if soil_context and soil_context['soil_moisture'] < 40:
                recommendations.extend([
                    f"⚠️ Soil moisture is low ({soil_context['soil_moisture']}%) - increase irrigation immediately",
                    "Consider drip irrigation for consistent moisture"
                ])
            
            alerts.append({
                'type': 'extreme_heat',
                'severity': 'high' if weather_data['temperature'] > 35 else 'medium',
                'message': f"⚠️ Extreme heat warning! Temperature: {weather_data['temperature']}°C. Protect your plants from intense sunlight.",
                'recommendations': recommendations
            })
        
        # Check for rain/storms
        if weather_data['main'] in ['Rain', 'Thunderstorm'] or 'rain' in weather_data['description'].lower():
            forecast = self.get_weather_forecast()
            heavy_rain_hours = sum(1 for f in forecast if f['precipitation'] > 5)
            
            recommendations = [
                "Move potted plants under cover",
                "Ensure proper drainage in garden beds",
                "Reduce watering schedule",
                "Secure plant supports and stakes"
            ]
            
            # Add soil-specific recommendations
            if soil_context and soil_context['soil_moisture'] > 70:
                recommendations.extend([
                    f"⚠️ Soil is already saturated ({soil_context['soil_moisture']}%) - improve drainage urgently",
                    "Consider raised beds or adding sand to heavy soils"
                ])
            
            alerts.append({
                'type': 'rain_warning',
                'severity': 'high' if heavy_rain_hours > 3 else 'medium',
                'message': f"🌧️ Rain expected! Current conditions: {weather_data['description']}. Heavy rain forecasted for {heavy_rain_hours} periods.",
                'recommendations': recommendations
            })
        
        # Check for high UV/intense sun
        if weather_data.get('uv_index') and weather_data['uv_index'] > 8:
            alerts.append({
                'type': 'high_uv',
                'severity': 'medium',
                'message': f"☀️ High UV index ({weather_data['uv_index']})! Plants may need protection from intense sunlight.",
                'recommendations': [
                    "Use shade cloth for delicate plants",
                    "Water more frequently",
                    "Consider afternoon shade"
                ]
            })
        
        # Check for low humidity + high temp
        if weather_data['humidity'] < 30 and weather_data['temperature'] > 25:
            recommendations = [
                "Increase humidity around plants",
                "Water more frequently",
                "Group plants together",
                "Use humidity trays"
            ]
            
            # Add soil moisture context
            if soil_context:
                if soil_context['soil_moisture'] < 30:
                    recommendations.insert(0, f"🚨 Critical: Both air and soil are very dry! Soil moisture: {soil_context['soil_moisture']}%")
                elif soil_context['soil_moisture'] < 50:
                    recommendations.insert(0, f"⚠️ Soil moisture is getting low: {soil_context['soil_moisture']}%")
            
            alerts.append({
                'type': 'dry_conditions',
                'severity': 'high' if (soil_context and soil_context['soil_moisture'] < 30) else 'medium',
                'message': f"🌵 Very dry conditions! Humidity: {weather_data['humidity']}%, Temperature: {weather_data['temperature']}°C",
                'recommendations': recommendations
            })
        
        # New alert: Soil-based weather warnings
        if soil_context:
            soil_temp = soil_context['soil_temperature']
            soil_moisture = soil_context['soil_moisture']
            
            # Soil temperature too high
            if soil_temp > 28:
                alerts.append({
                    'type': 'soil_overheating',
                    'severity': 'high',
                    'message': f"🌡️ Soil overheating! Soil temperature: {soil_temp}°C. Root damage possible.",
                    'recommendations': [
                        "Apply thick mulch immediately",
                        "Increase watering to cool soil",
                        "Provide shade over soil area",
                        "Water in early morning to pre-cool soil"
                    ]
                })
            
            # Soil moisture critical
            if soil_moisture < 20:
                alerts.append({
                    'type': 'soil_drought',
                    'severity': 'high',
                    'message': f"🚨 Soil drought emergency! Moisture: {soil_moisture}%. Plants in distress.",
                    'recommendations': [
                        "Water immediately and deeply",
                        "Check irrigation system",
                        "Add water-retaining mulch",
                        "Consider emergency watering schedule"
                    ]
                })
            elif soil_moisture > 85:
                alerts.append({
                    'type': 'soil_waterlogged',
                    'severity': 'high', 
                    'message': f"💧 Soil waterlogged! Moisture: {soil_moisture}%. Root rot risk.",
                    'recommendations': [
                        "Stop watering immediately",
                        "Improve drainage",
                        "Check for blocked drains",
                        "Consider temporary raised planting"
                    ]
                })
        
        return alerts
    
    def get_weather_summary(self):
        """Get a comprehensive summary of weather, soil, and alerts"""
        current = self.get_current_weather()
        forecast = self.get_weather_forecast()
        alerts = self.check_weather_alerts(None, current)
        soil_context = self.get_soil_environmental_data()
        
        # Create comprehensive summary
        summary_parts = [f"Weather: {current['temperature']}°C, {current['description']}"]
        
        if soil_context:
            summary_parts.append(f"Soil: {soil_context['soil_temperature']}°C, {soil_context['soil_moisture']}% moisture")
        
        if alerts:
            summary_parts.append(f"{len(alerts)} alerts active")
        else:
            summary_parts.append("No alerts")
            
        data_source = current.get('source', 'unknown')
        if data_source == 'outdoor_sensors':
            summary_parts.append("(Real outdoor sensors)")
        elif data_source == 'soil_sensors_estimated':
            summary_parts.append("(Estimated from soil sensors)")
        elif data_source == 'openweather_api':
            summary_parts.append("(Weather API)")
        else:
            summary_parts.append("(Mock data)")
        
        return {
            'current': current,
            'forecast': forecast,
            'alerts': alerts,
            'soil_context': soil_context,
            'summary': ". ".join(summary_parts),
            'data_sources': {
                'weather': data_source,
                'soil_available': soil_context is not None
            }
        }

# Global weather monitor instance
weather_monitor = WeatherMonitor()