import { useState, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { usePlants } from './usePlants';
import type { Plant } from './usePlants';

// Google Maps API configuration

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GOOGLE_MAPS_API_KEY =  import.meta.env.VITE_GOOGLE_MAP_API_KEY;

// Google Maps Geocoding API types
interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleGeocodeResult {
  address_components: GoogleAddressComponent[];
  formatted_address: string;
}

interface GoogleGeocodeResponse {
  results: GoogleGeocodeResult[];
  status: string;
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Weather data types
interface WeatherData {
  current: {
    temp: number;
    tempF: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    feelsLike: number;
  };
  forecast: Array<{
    day: string;
    date: string;
    tempMaxF: number;
    tempMinF: number;
    condition: string;
    rainChance: number;
    humidity: number;
    uvIndex: number;
  }>;
  lastUpdated: string;
  location: {
    city: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
  };
}

// Garden advice types
interface GardenAdvice {
  id: string;
  type: 'watering' | 'planting' | 'protection' | 'maintenance' | 'pest' | 'fertilizer';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  action: string;
  dueDate: string;
}

interface GeminiAdviceItem {
  type: string;
  title: string;
  description: string;
  priority: string;
  action: string;
  dueDate: string;
}

// Garden task types
interface GardenTask {
  id: string;
  name: string;
  description: string;
  category: 'watering' | 'planting' | 'maintenance' | 'harvesting' | 'pruning';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  completed: boolean;
  plantId?: string;
  weatherDependent: boolean;
}

// Outdoor plant types
interface OutdoorPlant {
  id: string;
  commonName: string;
  scientificName: string;
  imageUrl?: string;
  sunlightPreference: string;
  wateringSchedule: string;
  cycle: string;
  compatibility: {
    status: 'excellent' | 'good' | 'moderate' | 'poor';
    score: number;
    factors: {
      sunlight: 'good' | 'moderate' | 'poor';
      temperature: 'good' | 'moderate' | 'poor';
      humidity: 'good' | 'moderate' | 'poor';
      season: 'good' | 'moderate' | 'poor';
    };
    recommendations: string[];
  };
}

export function useOutdoorMode() {
  const { plants } = usePlants();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [advice, setAdvice] = useState<GardenAdvice[]>([]);
  const [tasks, setTasks] = useState<GardenTask[]>([]);
  const [outdoorPlants, setOutdoorPlants] = useState<OutdoorPlant[]>([]);
  const [plantsLoading, setPlantsLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  const [plantingZone, setPlantingZone] = useState<string | null>(null);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Location access denied, using default location');
          // Default to a central location if permission denied
          setUserLocation({ lat: 40.7128, lon: -74.0060 }); // New York
        }
      );
    }
  }, []);

  // Fetch weather and location data using Google Maps API and Open-Meteo weather API
  useEffect(() => {
    const fetchWeatherAndLocation = async () => {
      if (!userLocation) return;
      
      try {
        setWeatherLoading(true);
        
        // Get detailed location information using Google Maps Geocoding API
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLocation.lat},${userLocation.lon}&key=${GOOGLE_MAPS_API_KEY}`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        let locationInfo = {
          city: 'Unknown',
          region: 'Unknown',
          country: 'Unknown'
        };
        
        if (geocodeData.results && geocodeData.results.length > 0) {
          const result = geocodeData.results[0];
          const addressComponents = result.address_components;
          
          locationInfo = {
            city: addressComponents.find((c: GoogleAddressComponent) => c.types.includes('locality'))?.long_name || 
                   addressComponents.find((c: GoogleAddressComponent) => c.types.includes('sublocality'))?.long_name || 'Unknown',
            region: addressComponents.find((c: GoogleAddressComponent) => c.types.includes('administrative_area_level_1'))?.short_name || 'Unknown',
            country: addressComponents.find((c: GoogleAddressComponent) => c.types.includes('country'))?.short_name || 'Unknown'
          };
        }

        // Get real weather data from Open-Meteo (completely free, no API key required)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.lat}&longitude=${userLocation.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=5`;
        
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) {
          console.error('Weather API response:', await weatherResponse.text());
          throw new Error(`Weather API request failed with status: ${weatherResponse.status}`);
        }
        
        const weatherData = await weatherResponse.json();
        console.log('Weather API response:', weatherData);
        
        // Helper function to convert weather code to description
        const getWeatherCondition = (code: number): string => {
          const weatherCodes: { [key: number]: string } = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            71: 'Slight snow',
            73: 'Moderate snow',
            75: 'Heavy snow',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail'
          };
          return weatherCodes[code] || `Weather condition ${code}`;
        };
        
        // Validate data structure
        if (!weatherData.current || !weatherData.daily) {
          console.error('Invalid weather data structure:', weatherData);
          throw new Error('Invalid weather data structure received');
        }
        
        // Process daily forecast data (ensure we have valid arrays)
        const dailyTimes = weatherData.daily.time || [];
        const dailyTempMax = weatherData.daily.temperature_2m_max || [];
        const dailyTempMin = weatherData.daily.temperature_2m_min || [];
        const dailyPrecipProb = weatherData.daily.precipitation_probability_max || [];
        const dailyUvIndex = weatherData.daily.uv_index_max || [];
        
        const dailyForecasts = dailyTimes.slice(0, 5).map((date: string, index: number) => ({
          day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          date: date,
          tempMaxF: Math.round(dailyTempMax[index] || 70),
          tempMinF: Math.round(dailyTempMin[index] || 50),
          condition: getWeatherCondition(weatherData.current.weather_code || 0),
          rainChance: Math.round(dailyPrecipProb[index] || 0),
          humidity: Math.round(weatherData.current.relative_humidity_2m || 50),
          uvIndex: Math.round(dailyUvIndex[index] || 5)
        }));
        
        // Build weather data with proper fallbacks
        const currentTemp = weatherData.current.temperature_2m || 70;
        const currentHumidity = weatherData.current.relative_humidity_2m || 50;
        const currentWindSpeed = weatherData.current.wind_speed_10m || 0;
        const currentWeatherCode = weatherData.current.weather_code || 0;
        
        const processedWeatherData: WeatherData = {
          current: {
            temp: Math.round((currentTemp - 32) * 5/9), // Convert to Celsius
            tempF: Math.round(currentTemp),
            condition: getWeatherCondition(currentWeatherCode),
            humidity: Math.round(currentHumidity),
            windSpeed: Math.round(currentWindSpeed),
            uvIndex: Math.round(dailyUvIndex[0] || 5),
            feelsLike: Math.round(currentTemp) // Open-Meteo doesn't provide feels-like, use actual temp
          },
          forecast: dailyForecasts,
          lastUpdated: new Date().toISOString(),
          location: {
            city: locationInfo.city,
            region: locationInfo.region,
            country: locationInfo.country,
            lat: userLocation.lat,
            lon: userLocation.lon
          }
        };
        
        setWeather(processedWeatherData);
        setWeatherLoading(false);
      } catch (error) {
        console.error('Error fetching weather data:', error);
        
        // Try to get location data even if weather fails
        let fallbackLocationInfo = {
          city: 'Unknown',
          region: 'Unknown',
          country: 'Unknown'
        };
        
        try {
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLocation.lat},${userLocation.lon}&key=${GOOGLE_MAPS_API_KEY}`;
          const geocodeResponse = await fetch(geocodeUrl);
          const geocodeData = await geocodeResponse.json();
          
          if (geocodeData.results && geocodeData.results.length > 0) {
            const result = geocodeData.results[0];
            const addressComponents = result.address_components;
            
            fallbackLocationInfo = {
              city: addressComponents.find((c: GoogleAddressComponent) => c.types.includes('locality'))?.long_name || 
                     addressComponents.find((c: GoogleAddressComponent) => c.types.includes('sublocality'))?.long_name || 'Unknown',
              region: addressComponents.find((c: GoogleAddressComponent) => c.types.includes('administrative_area_level_1'))?.short_name || 'Unknown',
              country: addressComponents.find((c: GoogleAddressComponent) => c.types.includes('country'))?.short_name || 'Unknown'
            };
          }
        } catch (locationError) {
          console.error('Error fetching location data:', locationError);
        }
        
        // Fallback data with real location if available
        const fallbackData: WeatherData = {
          current: {
            temp: 20, // 68°F in Celsius
            tempF: 68,
            condition: "Weather data temporarily unavailable",
            humidity: 50,
            windSpeed: 5,
            uvIndex: 5,
            feelsLike: 68
          },
          forecast: [],
          lastUpdated: new Date().toISOString(),
          location: {
            city: fallbackLocationInfo.city,
            region: fallbackLocationInfo.region,
            country: fallbackLocationInfo.country,
            lat: userLocation?.lat || 0,
            lon: userLocation?.lon || 0
          }
        };
        setWeather(fallbackData);
        setWeatherLoading(false);
      }
    };

    fetchWeatherAndLocation();
    // Refresh weather every 30 minutes
    const interval = setInterval(fetchWeatherAndLocation, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [userLocation]);

  // Generate AI-powered garden advice using Gemini with real weather data
  const generateGardenAdvice = useCallback(async (weatherData: WeatherData, plants: Plant[]) => {
    try {
      setAdviceLoading(true);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        As an expert gardener and horticulturist, analyze the current weather conditions and forecast to provide specific gardening advice.
        
        Current Weather:
        - Temperature: ${weatherData.current.tempF}°F (${weatherData.current.temp}°C)
        - Condition: ${weatherData.current.condition}
        - Humidity: ${weatherData.current.humidity}%
        - Wind Speed: ${weatherData.current.windSpeed} mph
        - UV Index: ${weatherData.current.uvIndex}
        
        5-Day Forecast:
        ${weatherData.forecast.map(day => 
          `${day.day}: ${day.tempMaxF}°F/${day.tempMinF}°F, ${day.condition}, ${day.rainChance}% rain chance`
        ).join('\n')}
        
        Location: ${weatherData.location.city}, ${weatherData.location.region}
        
        Plants in Garden:
        ${plants.map(plant => `- ${plant.commonName} (${plant.scientificName || 'Unknown species'})`).join('\n')}
        
        Please provide 3-5 specific, actionable gardening recommendations in JSON format:
        [
          {
            "type": "watering",
            "title": "Brief title",
            "description": "Detailed description with specific actions",
            "priority": "medium",
            "action": "Specific action to take",
            "dueDate": "Today"
          }
        ]
        
        Focus on:
        1. Watering adjustments based on rain forecast and temperature
        2. Plant protection from extreme weather
        3. Optimal timing for outdoor activities
        4. UV protection recommendations
        5. Wind and humidity considerations
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        const cleanedText = text.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
        const geminiAdvice: GeminiAdviceItem[] = JSON.parse(cleanedText);
        
        const formattedAdvice: GardenAdvice[] = geminiAdvice.map((advice: GeminiAdviceItem, index: number) => ({
          id: `advice-${index}`,
          type: (advice.type as GardenAdvice['type']) || 'maintenance',
          title: advice.title,
          description: advice.description,
          priority: (advice.priority as GardenAdvice['priority']) || 'medium',
          action: advice.action,
          dueDate: advice.dueDate
        }));
        
        setAdvice(formattedAdvice);
      } catch (parseError) {
        console.error('Error parsing Gemini advice:', parseError);
        // Fallback advice based on weather conditions
        const weatherBasedAdvice: GardenAdvice[] = [];
        
        if (weatherData.forecast.some(day => day.rainChance > 60)) {
          weatherBasedAdvice.push({
            id: 'advice-rain',
            type: 'watering',
            title: 'Rain Expected - Adjust Watering',
            description: `Heavy rain is forecasted (${Math.max(...weatherData.forecast.map(d => d.rainChance))}% chance). Skip or reduce watering to prevent overwatering.`,
            priority: 'high',
            action: 'Skip scheduled watering',
            dueDate: 'Today'
          });
        }
        
        if (weatherData.current.tempF > 85) {
          weatherBasedAdvice.push({
            id: 'advice-heat',
            type: 'protection',
            title: 'Heat Protection Needed',
            description: `High temperatures (${weatherData.current.tempF}°F) may stress plants. Provide shade and extra water.`,
            priority: 'high',
            action: 'Set up shade cloth or move containers to cooler spots',
            dueDate: 'Today'
          });
        }
        
        if (weatherData.current.tempF < 40) {
          weatherBasedAdvice.push({
            id: 'advice-frost',
            type: 'protection',
            title: 'Cold Weather Protection',
            description: `Cold temperatures (${weatherData.current.tempF}°F) may damage sensitive plants. Cover or bring indoors.`,
            priority: 'high',
            action: 'Cover plants with frost cloth or bring containers indoors',
            dueDate: 'Today'
          });
        }
        
        if (weatherData.current.uvIndex > 8) {
          weatherBasedAdvice.push({
            id: 'advice-uv',
            type: 'protection',
            title: 'High UV Protection',
            description: `Very high UV index (${weatherData.current.uvIndex}). Protect sensitive plants and yourself.`,
            priority: 'medium',
            action: 'Consider shade cloth for sensitive plants',
            dueDate: 'Today'
          });
        }
        
        setAdvice(weatherBasedAdvice);
      }
    } catch (error) {
      console.error('Error generating garden advice:', error);
      
      // Basic seasonal advice as final fallback
      const currentMonth = new Date().getMonth();
      const fallbackAdvice: GardenAdvice[] = [];
      
      if (currentMonth >= 2 && currentMonth <= 4) { // Spring
        fallbackAdvice.push({
          id: 'spring-basic',
          type: 'planting',
          title: 'Spring Garden Care',
          description: 'Focus on new plantings and soil preparation during spring.',
          priority: 'medium',
          action: 'Plan and prepare for spring planting',
          dueDate: 'This Week'
        });
      } else if (currentMonth >= 5 && currentMonth <= 7) { // Summer
        fallbackAdvice.push({
          id: 'summer-basic',
          type: 'watering',
          title: 'Summer Plant Care',
          description: 'Regular watering and maintenance are crucial during summer.',
          priority: 'medium',
          action: 'Maintain regular watering schedule',
          dueDate: 'Today'
        });
      } else if (currentMonth >= 8 && currentMonth <= 10) { // Fall
        fallbackAdvice.push({
          id: 'fall-basic',
          type: 'maintenance',
          title: 'Fall Preparation',
          description: 'Prepare plants and garden for the coming winter season.',
          priority: 'medium',
          action: 'Begin fall garden cleanup',
          dueDate: 'This Week'
        });
      } else { // Winter
        fallbackAdvice.push({
          id: 'winter-basic',
          type: 'protection',
          title: 'Winter Care',
          description: 'Focus on protecting plants during winter months.',
          priority: 'medium',
          action: 'Monitor and protect plants from cold',
          dueDate: 'Today'
        });
      }
      
      setAdvice(fallbackAdvice);
    } finally {
      setAdviceLoading(false);
    }
  }, []);

  // Helper functions for compatibility analysis
  const analyzeSunlightCompatibility = useCallback((sunlight: string | undefined) => {
    if (!sunlight) return { score: 50, rating: 'moderate' as const };
    
    const requirements = Array.isArray(sunlight) ? sunlight : [sunlight];
    const hasFullSun = requirements.some(req => req.includes('full_sun') || req.includes('full sun'));
    const hasPartSun = requirements.some(req => req.includes('part_sun') || req.includes('partial'));
    
    if (hasFullSun && hasPartSun) return { score: 90, rating: 'good' as const };
    if (hasFullSun) return { score: 85, rating: 'good' as const };
    if (hasPartSun) return { score: 75, rating: 'good' as const };
    return { score: 60, rating: 'moderate' as const };
  }, []);

  const analyzeTemperatureCompatibility = useCallback((cycle: string, weatherData: WeatherData | null) => {
    if (!weatherData || weatherData.current.tempF === 0) {
      // Fallback to seasonal compatibility if no weather data
      const currentMonth = new Date().getMonth();
      const isGrowingSeason = currentMonth >= 3 && currentMonth <= 9; // April to October
      
      if (cycle === 'Annual') {
        if (isGrowingSeason) return { score: 85, rating: 'good' as const };
        return { score: 50, rating: 'moderate' as const };
      } else if (cycle === 'Perennial') {
        return { score: 75, rating: 'good' as const };
      }
      return { score: 65, rating: 'moderate' as const };
    }
    
    const temp = weatherData.current.tempF;
    if (cycle === 'Annual') {
      if (temp >= 60 && temp <= 80) return { score: 90, rating: 'good' as const };
      if (temp >= 45 && temp <= 90) return { score: 70, rating: 'moderate' as const };
      return { score: 40, rating: 'poor' as const };
    } else if (cycle === 'Perennial') {
      if (temp >= 50 && temp <= 85) return { score: 85, rating: 'good' as const };
      if (temp >= 35 && temp <= 95) return { score: 65, rating: 'moderate' as const };
      return { score: 45, rating: 'poor' as const };
    }
    return { score: 60, rating: 'moderate' as const };
  }, []);

  const analyzeHumidityCompatibility = useCallback((watering: string | undefined, weatherData: WeatherData | null) => {
    if (!weatherData || weatherData.current.humidity === 0) {
      // General compatibility based on watering needs
      if (watering === 'Frequent') {
        return { score: 70, rating: 'good' as const };
      } else if (watering === 'Minimum') {
        return { score: 75, rating: 'good' as const };
      }
      return { score: 70, rating: 'good' as const };
    }
    
    const humidity = weatherData.current.humidity;
    if (watering === 'Frequent') {
      if (humidity >= 60) return { score: 90, rating: 'good' as const };
      if (humidity >= 40) return { score: 70, rating: 'moderate' as const };
      return { score: 50, rating: 'poor' as const };
    } else if (watering === 'Minimum') {
      if (humidity <= 50) return { score: 90, rating: 'good' as const };
      if (humidity <= 70) return { score: 75, rating: 'good' as const };
      return { score: 60, rating: 'moderate' as const };
    }
    return { score: 75, rating: 'good' as const };
  }, []);

  const analyzeSeasonalCompatibility = useCallback((cycle: string) => {
    const currentMonth = new Date().getMonth();
    const isGrowingSeason = currentMonth >= 3 && currentMonth <= 9; // April to October
    
    if (cycle === 'Annual' && isGrowingSeason) return { score: 90, rating: 'good' as const };
    if (cycle === 'Perennial') return { score: 80, rating: 'good' as const };
    if (isGrowingSeason) return { score: 70, rating: 'moderate' as const };
    return { score: 50, rating: 'moderate' as const };
  }, []);

  const generatePlantRecommendations = useCallback((plant: Plant, weatherData: WeatherData | null): string[] => {
    const recommendations: string[] = [];
    
    if (!weatherData || weatherData.current.tempF === 0) {
      // General seasonal recommendations when no weather data
      const currentMonth = new Date().getMonth();
      
      if (currentMonth >= 2 && currentMonth <= 4) { // Spring
        recommendations.push('Spring is ideal for new plantings and growth');
        recommendations.push('Check for signs of new growth and adjust care accordingly');
      } else if (currentMonth >= 5 && currentMonth <= 7) { // Summer
        recommendations.push('Monitor for heat stress during hot periods');
        recommendations.push('Maintain consistent watering schedule');
      } else if (currentMonth >= 8 && currentMonth <= 10) { // Fall
        recommendations.push('Prepare plant for winter dormancy');
        recommendations.push('Reduce watering frequency as growth slows');
      } else { // Winter
        recommendations.push('Protect from freezing temperatures if needed');
        recommendations.push('Reduce watering during dormant period');
      }
      
      return recommendations;
    }
    
    // Weather-specific recommendations
    if (weatherData.current.tempF > 85) {
      recommendations.push(`Provide afternoon shade during heat (${weatherData.current.tempF}°F)`);
      recommendations.push('Increase watering frequency to combat heat stress');
    }
    
    if (weatherData.current.tempF < 40) {
      recommendations.push(`Consider frost protection (${weatherData.current.tempF}°F)`);
      recommendations.push('Reduce watering in cold weather');
    }
    
    if (weatherData.forecast.some(day => day.rainChance > 70)) {
      const maxRain = Math.max(...weatherData.forecast.map(d => d.rainChance));
      recommendations.push(`Skip watering before expected rainfall (${maxRain}% chance)`);
    }
    
    if (weatherData.current.humidity > 80) {
      recommendations.push(`Ensure good air circulation (${weatherData.current.humidity}% humidity)`);
      recommendations.push('Monitor for fungal issues in high humidity');
    } else if (weatherData.current.humidity < 40) {
      recommendations.push(`Increase watering frequency (${weatherData.current.humidity}% humidity)`);
      recommendations.push('Consider misting for humidity-loving plants');
    }
    
    if (weatherData.current.uvIndex > 8) {
      recommendations.push(`Provide UV protection (UV index: ${weatherData.current.uvIndex})`);
    }
    
    if (weatherData.current.windSpeed > 15) {
      recommendations.push(`Secure plant against strong winds (${weatherData.current.windSpeed} mph)`);
    }
    
    // Watering-based recommendations
    if (plant.wateringSchedule === 'Frequent') {
      recommendations.push('Ensure consistent soil moisture');
    } else if (plant.wateringSchedule === 'Minimum') {
      recommendations.push('Allow soil to dry between waterings');
    }
    
    return recommendations;
  }, []);

  const generateOutdoorPlants = useCallback(async () => {
    if (!plants || plants.length === 0) {
      setPlantsLoading(false);
      return;
    }

    try {
      const outdoorCompatiblePlants: OutdoorPlant[] = plants.map(plant => {
        // Calculate compatibility score based on plant characteristics
        let compatibilityScore = 50; // Base score
        let status: 'excellent' | 'good' | 'moderate' | 'poor' = 'moderate';
        
        // Analyze sunlight requirements (fix property names)
        const sunlightFactor = analyzeSunlightCompatibility(plant.sunlightPreference);
        const temperatureFactor = analyzeTemperatureCompatibility(plant.cycle, weather);
        const humidityFactor = analyzeHumidityCompatibility(plant.wateringSchedule, weather);
        const seasonFactor = analyzeSeasonalCompatibility(plant.cycle);
        
        compatibilityScore = Math.round(
          (sunlightFactor.score + temperatureFactor.score + humidityFactor.score + seasonFactor.score) / 4
        );
        
        if (compatibilityScore >= 80) status = 'excellent';
        else if (compatibilityScore >= 60) status = 'good';
        else if (compatibilityScore >= 40) status = 'moderate';
        else status = 'poor';
        
        return {
          id: plant.id.toString(),
          commonName: plant.commonName,
          scientificName: plant.scientificName,
          imageUrl: plant.imageUrl,
          sunlightPreference: plant.sunlightPreference || 'Unknown',
          wateringSchedule: plant.wateringSchedule || 'Unknown',
          cycle: plant.cycle || 'Unknown',
          compatibility: {
            status,
            score: compatibilityScore,
            factors: {
              sunlight: sunlightFactor.rating,
              temperature: temperatureFactor.rating,
              humidity: humidityFactor.rating,
              season: seasonFactor.rating
            },
            recommendations: generatePlantRecommendations(plant, weather)
          }
        };
      });
      
      setOutdoorPlants(outdoorCompatiblePlants);
    } catch (error) {
      console.error('Error generating outdoor plants:', error);
    } finally {
      setPlantsLoading(false);
    }
  }, [plants, weather, analyzeSunlightCompatibility, analyzeTemperatureCompatibility, analyzeHumidityCompatibility, analyzeSeasonalCompatibility, generatePlantRecommendations]);

  const generateTasks = useCallback(() => {
    const newTasks: GardenTask[] = [];
    
    // Add watering tasks based on temperature and weather conditions
    outdoorPlants.forEach(plant => {
      const needsWatering = plant.wateringSchedule === 'Frequent' || plant.wateringSchedule === 'Average';
      
      if (needsWatering && weather) {
        let wateringPriority: 'low' | 'medium' | 'high' = 'medium';
        let wateringDescription = 'Check soil moisture and water if needed';
        
        // Adjust watering based on temperature
        if (weather.current.tempF > 85) {
          wateringPriority = 'high';
          wateringDescription = `High temperature detected (${weather.current.tempF}°F)! Check soil frequently and provide extra water if dry. Consider watering in early morning or evening.`;
        } else if (weather.current.tempF > 75) {
          wateringPriority = 'medium';
          wateringDescription = `Warm weather (${weather.current.tempF}°F) - check soil moisture and water if dry. Avoid watering during midday heat.`;
        } else if (weather.current.tempF < 50) {
          wateringPriority = 'low';
          wateringDescription = `Cool weather (${weather.current.tempF}°F) - reduce watering frequency. Check soil is not waterlogged.`;
        }
        
        // Adjust for rain forecast
        const upcomingRain = weather.forecast.some(day => day.rainChance > 60);
        if (upcomingRain) {
          wateringPriority = 'low';
          const maxRainChance = Math.max(...weather.forecast.map(d => d.rainChance));
          wateringDescription += ` Rain expected (${maxRainChance}% chance) - skip watering if soil is already moist.`;
        }
        
        // Adjust for humidity
        if (weather.current.humidity > 80) {
          wateringDescription += ` High humidity (${weather.current.humidity}%) - ensure good drainage to prevent root rot.`;
        } else if (weather.current.humidity < 40) {
          wateringDescription += ` Low humidity (${weather.current.humidity}%) - plants may need more frequent watering.`;
        }
        
        newTasks.push({
          id: `water-${plant.id}`,
          name: `Water ${plant.commonName}`,
          description: wateringDescription,
          category: 'watering',
          priority: wateringPriority,
          dueDate: 'Today',
          completed: false,
          plantId: plant.id,
          weatherDependent: true
        });
      }
    });
    
    // Add temperature-based protection tasks
    if (weather) {
      if (weather.current.tempF > 90) {
        newTasks.push({
          id: 'heat-protection',
          name: 'Heat Protection for Plants',
          description: `Extreme heat warning (${weather.current.tempF}°F)! Provide shade cloth, increase watering, and move containers to cooler spots. Current condition: ${weather.current.condition}.`,
          category: 'maintenance',
          priority: 'high',
          dueDate: 'Today',
          completed: false,
          weatherDependent: true
        });
      } else if (weather.current.tempF < 35) {
        newTasks.push({
          id: 'frost-protection',
          name: 'Frost Protection',
          description: `Cold weather alert (${weather.current.tempF}°F)! Cover sensitive plants or bring containers indoors. Current condition: ${weather.current.condition}.`,
          category: 'maintenance',
          priority: 'high',
          dueDate: 'Today',
          completed: false,
          weatherDependent: true
        });
      }
      
      // Add UV protection task
      if (weather.current.uvIndex > 8) {
        newTasks.push({
          id: 'uv-protection',
          name: 'UV Protection',
          description: `High UV index (${weather.current.uvIndex})! Consider shade cloth for sensitive plants and avoid working in direct sun during midday.`,
          category: 'maintenance',
          priority: 'medium',
          dueDate: 'Today',
          completed: false,
          weatherDependent: true
        });
      }
      
      // Add wind protection task
      if (weather.current.windSpeed > 15) {
        newTasks.push({
          id: 'wind-protection',
          name: 'Wind Protection',
          description: `Strong winds detected (${weather.current.windSpeed} mph)! Secure tall plants, move containers to sheltered areas, and check for damage.`,
          category: 'maintenance',
          priority: 'medium',
          dueDate: 'Today',
          completed: false,
          weatherDependent: true
        });
      }
    }
    
    // Add seasonal tasks based on current month
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 2 && currentMonth <= 4) { // Spring
      newTasks.push({
        id: 'spring-prep',
        name: 'Spring Garden Preparation',
        description: 'Prepare garden beds, start spring planting, and check for winter damage',
        category: 'planting',
        priority: 'high',
        dueDate: 'This Week',
        completed: false,
        weatherDependent: false
      });
    } else if (currentMonth >= 5 && currentMonth <= 7) { // Summer
      newTasks.push({
        id: 'summer-care',
        name: 'Summer Plant Maintenance',
        description: 'Monitor plants for heat stress, ensure adequate watering, and deadhead flowers',
        category: 'maintenance',
        priority: 'medium',
        dueDate: 'This Week',
        completed: false,
        weatherDependent: false
      });
    } else if (currentMonth >= 8 && currentMonth <= 10) { // Fall
      newTasks.push({
        id: 'fall-prep',
        name: 'Fall Garden Cleanup',
        description: 'Remove dead plants, prepare soil for winter, and plant fall crops',
        category: 'maintenance',
        priority: 'medium',
        dueDate: 'This Week',
        completed: false,
        weatherDependent: false
      });
    } else { // Winter
      newTasks.push({
        id: 'winter-care',
        name: 'Winter Plant Protection',
        description: 'Protect sensitive plants from cold, reduce watering, and plan for next season',
        category: 'maintenance',
        priority: 'high',
        dueDate: 'This Week',
        completed: false,
        weatherDependent: false
      });
    }
    
    setTasks(newTasks);
  }, [outdoorPlants, weather]);

  // Generate tasks and advice based on weather and plant needs
  useEffect(() => {
    if (weather && outdoorPlants.length > 0) {
      generateGardenAdvice(weather, plants);
      generateTasks();
    }
  }, [weather, outdoorPlants, generateGardenAdvice, generateTasks, plants]);

  // Process plants for outdoor compatibility
  useEffect(() => {
    generateOutdoorPlants();
  }, [plants, weather, generateOutdoorPlants]);

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const addCustomTask = useCallback((taskData: {
    name: string;
    description: string;
    category: 'watering' | 'planting' | 'maintenance' | 'harvesting' | 'pruning';
    priority: 'low' | 'medium' | 'high';
    dueDate: string;
    plantId?: string;
    weatherDependent?: boolean;
  }) => {
    const newTask: GardenTask = {
      id: `custom-${Date.now()}`,
      name: taskData.name,
      description: taskData.description,
      category: taskData.category,
      priority: taskData.priority,
      dueDate: taskData.dueDate,
      completed: false,
      plantId: taskData.plantId,
      weatherDependent: taskData.weatherDependent || false
    };
    
    setTasks(prev => [...prev, newTask]);
    return newTask.id;
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);

  const editTask = useCallback((taskId: string, updates: Partial<GardenTask>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  const duplicateTask = useCallback((taskId: string) => {
    const taskToDuplicate = tasks.find(task => task.id === taskId);
    if (!taskToDuplicate) return;

    const duplicatedTask: GardenTask = {
      ...taskToDuplicate,
      id: `duplicate-${Date.now()}`,
      name: `${taskToDuplicate.name} (Copy)`,
      completed: false
    };
    
    setTasks(prev => [...prev, duplicatedTask]);
    return duplicatedTask.id;
  }, [tasks]);

  const getTasksByCategory = useCallback((category?: 'watering' | 'planting' | 'maintenance' | 'harvesting' | 'pruning') => {
    if (!category) return tasks;
    return tasks.filter(task => task.category === category);
  }, [tasks]);

  const getTasksByPriority = useCallback((priority?: 'low' | 'medium' | 'high') => {
    if (!priority) return tasks;
    return tasks.filter(task => task.priority === priority);
  }, [tasks]);

  const getCompletedTasks = useCallback(() => {
    return tasks.filter(task => task.completed);
  }, [tasks]);

  const getPendingTasks = useCallback(() => {
    return tasks.filter(task => !task.completed);
  }, [tasks]);

  const getOverdueTasks = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tasks.filter(task => {
      if (task.completed) return false;
      
      const dueDate = new Date(task.dueDate);
      return dueDate < today;
    });
  }, [tasks]);

  const markAllTasksComplete = useCallback(() => {
    setTasks(prev => prev.map(task => ({ ...task, completed: true })));
  }, []);

  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => prev.filter(task => !task.completed));
  }, []);

  const getWateringSchedule = useCallback(() => {
    const wateringTasks = tasks.filter(task => task.category === 'watering');
    const schedule = wateringTasks.map(task => {
      const plant = outdoorPlants.find(p => p.id === task.plantId);
      return {
        ...task,
        plantName: plant?.commonName || 'Unknown Plant',
        plantImage: plant?.imageUrl,
        wateringFrequency: plant?.wateringSchedule || 'Unknown',
        recommendedTime: weather && weather.current && weather.current.tempF > 0 ? 
          (weather.current.tempF > 80 ? 'Early morning or evening' : 'Morning preferred') : 'Morning preferred',
        nextWatering: task.dueDate,
        priority: task.priority,
        weatherNote: weather && weather.current && weather.current.tempF > 0 ? 
          (weather.current.tempF > 85 ? `Extra water needed due to heat (${weather.current.tempF}°F)` :
           weather.forecast.some(day => day.rainChance > 60) ? `Rain expected (${Math.max(...weather.forecast.map(d => d.rainChance))}% chance) - check soil first` :
           `Normal watering schedule (${weather.current.tempF}°F, ${weather.current.humidity}% humidity)`) : 'Check soil moisture before watering'
      };
    });
    
    return schedule.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [tasks, outdoorPlants, weather]);

  const generateSoilRecommendationsForPlant = async (plantId: string) => {
    const plant = outdoorPlants.find(p => p.id === plantId);
    if (!plant || !weather) return;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const weatherInfo = weather.current.tempF > 0 ? `
        Current Weather Conditions:
        - Temperature: ${weather.current.tempF}°F (${weather.current.temp}°C)
        - Humidity: ${weather.current.humidity}%
        - Condition: ${weather.current.condition}
        - UV Index: ${weather.current.uvIndex}
        
        Upcoming Weather:
        ${weather.forecast.slice(0, 3).map(day => 
          `${day.day}: ${day.tempMaxF}°F/${day.tempMinF}°F, ${day.rainChance}% rain`
        ).join('\n')}
      ` : `
        Season: ${(() => {
          const month = new Date().getMonth();
          if (month >= 2 && month <= 4) return 'Spring';
          if (month >= 5 && month <= 7) return 'Summer';
          if (month >= 8 && month <= 10) return 'Fall';
          return 'Winter';
        })()}
      `;
      
      const prompt = `
        As a soil and plant expert, provide specific soil recommendations for growing ${plant.commonName} (${plant.scientificName}) outdoors.
        
        Location: ${weather.location.city}, ${weather.location.region}
        ${weatherInfo}
        
        Plant Details:
        - Sunlight preference: ${plant.sunlightPreference}
        - Watering schedule: ${plant.wateringSchedule}
        - Growth cycle: ${plant.cycle}
        
        Please provide soil recommendations including:
        1. Optimal soil type and pH range
        2. Drainage requirements considering current weather
        3. Organic matter suggestions
        4. Weather-appropriate fertilization schedule
        5. Mulching recommendations for current conditions
        
        Format as a clear, practical guide considering the current weather conditions.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const recommendations = response.text();
      
      console.log(`Soil recommendations for ${plant.commonName}:`, recommendations);
      // You could store these recommendations in state or display them to the user
      
    } catch (error) {
      console.error('Error generating soil recommendations:', error);
    }
  };

  return {
    weather,
    advice,
    tasks,
    outdoorPlants,
    plantsLoading,
    weatherLoading,
    adviceLoading,
    userLocation,
    plantingZone,
    // Task management functions
    toggleTaskCompletion,
    addCustomTask,
    removeTask,
    editTask,
    duplicateTask,
    getTasksByCategory,
    getTasksByPriority,
    getCompletedTasks,
    getPendingTasks,
    getOverdueTasks,
    markAllTasksComplete,
    clearCompletedTasks,
    getWateringSchedule,
    // Other functions
    generateSoilRecommendationsForPlant
  };
}