import { sendSms, SMS_TEMPLATES } from './sinchSms';
import { Plant } from '../hooks/usePlants';
import { getUserPhoneNumber } from './userData';
import { auth } from './firebase';

export interface SoilData {
  ph: number;
  moisture: number;
  temperature: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  uvIndex: number;
  windSpeed: number;
  forecast: {
    rain: boolean;
    rainAmount: number;
    lowTemp: number;
    highTemp: number;
  };
}

export interface NotificationSettings {
  enableSoilAlerts: boolean;
  enableWeatherAlerts: boolean;
  soilCheckInterval: number; // minutes
  weatherCheckInterval: number; // minutes
}

class NotificationService {
  private settings: NotificationSettings | null = null;
  private soilCheckTimer: NodeJS.Timeout | null = null;
  private weatherCheckTimer: NodeJS.Timeout | null = null;
  private lastAlerts: Set<string> = new Set(); // Prevent duplicate alerts

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    const saved = localStorage.getItem('notification-settings');
    if (saved) {
      this.settings = JSON.parse(saved);
    }
  }

  public updateSettings(settings: NotificationSettings) {
    this.settings = settings;
    localStorage.setItem('notification-settings', JSON.stringify(settings));
    this.restart();
  }

  public start() {
    if (!this.settings) return;

    if (this.settings.enableSoilAlerts) {
      this.soilCheckTimer = setInterval(
        () => this.checkSoilConditions(),
        this.settings.soilCheckInterval * 60 * 1000
      );
    }

    if (this.settings.enableWeatherAlerts) {
      this.weatherCheckTimer = setInterval(
        () => this.checkWeatherConditions(),
        this.settings.weatherCheckInterval * 60 * 1000
      );
    }
  }

  public stop() {
    if (this.soilCheckTimer) {
      clearInterval(this.soilCheckTimer);
      this.soilCheckTimer = null;
    }
    if (this.weatherCheckTimer) {
      clearInterval(this.weatherCheckTimer);
      this.weatherCheckTimer = null;
    }
  }

  public restart() {
    this.stop();
    this.start();
  }

  private async checkSoilConditions() {
    try {
      // Get plants and their soil data
      const plants = this.getStoredPlants();
      
      for (const plant of plants) {
        const soilData = await this.getSoilDataForPlant(plant.id);
        if (soilData) {
          await this.checkSoilAlerts(plant, soilData);
        }
      }
    } catch (error) {
      console.error('Error checking soil conditions:', error);
    }
  }

  private async checkWeatherConditions() {
    try {
      const weatherData = await this.getWeatherData();
      if (weatherData) {
        const plants = this.getStoredPlants();
        for (const plant of plants) {
          await this.checkWeatherAlerts(plant, weatherData);
        }
      }
    } catch (error) {
      console.error('Error checking weather conditions:', error);
    }
  }

  private async checkSoilAlerts(plant: Plant, soilData: SoilData) {
    if (!this.settings || !auth.currentUser) return;

    // Get user's phone number from Firestore
    const phoneNumber = await getUserPhoneNumber(auth.currentUser);
    if (!phoneNumber) {
      console.warn('No phone number found for user');
      return;
    }

    const alertKey = `soil-${plant.id}`;
    
    // pH alerts
    if (soilData.ph < 5.5) {
      const alertId = `${alertKey}-ph-low-${Date.now()}`;
      if (!this.lastAlerts.has(alertId)) {
        await sendSms(
          phoneNumber,
          SMS_TEMPLATES.SOIL_PH_LOW(plant.commonName, soilData.ph)
        );
        this.lastAlerts.add(alertId);
        this.cleanupOldAlerts();
      }
    } else if (soilData.ph > 8.0) {
      const alertId = `${alertKey}-ph-high-${Date.now()}`;
      if (!this.lastAlerts.has(alertId)) {
        await sendSms(
          phoneNumber,
          SMS_TEMPLATES.SOIL_PH_HIGH(plant.commonName, soilData.ph)
        );
        this.lastAlerts.add(alertId);
        this.cleanupOldAlerts();
      }
    }

    // Moisture alerts
    if (soilData.moisture < 20) {
      const alertId = `${alertKey}-moisture-low-${Date.now()}`;
      if (!this.lastAlerts.has(alertId)) {
        await sendSms(
          phoneNumber,
          SMS_TEMPLATES.SOIL_MOISTURE_LOW(plant.commonName, soilData.moisture)
        );
        this.lastAlerts.add(alertId);
        this.cleanupOldAlerts();
      }
    } else if (soilData.moisture > 85) {
      const alertId = `${alertKey}-moisture-high-${Date.now()}`;
      if (!this.lastAlerts.has(alertId)) {
        await sendSms(
          phoneNumber,
          SMS_TEMPLATES.SOIL_MOISTURE_HIGH(plant.commonName, soilData.moisture)
        );
        this.lastAlerts.add(alertId);
        this.cleanupOldAlerts();
      }
    }

    // Nutrient alerts
    if (soilData.nitrogen < 30) {
      const alertId = `${alertKey}-nitrogen-low-${Date.now()}`;
      if (!this.lastAlerts.has(alertId)) {
        await sendSms(
          phoneNumber,
          SMS_TEMPLATES.SOIL_NITROGEN_LOW(plant.commonName, soilData.nitrogen)
        );
        this.lastAlerts.add(alertId);
        this.cleanupOldAlerts();
      }
    }

    if (soilData.phosphorus < 25) {
      const alertId = `${alertKey}-phosphorus-low-${Date.now()}`;
      if (!this.lastAlerts.has(alertId)) {
        await sendSms(
          phoneNumber,
          SMS_TEMPLATES.SOIL_PHOSPHORUS_LOW(plant.commonName, soilData.phosphorus)
        );
        this.lastAlerts.add(alertId);
        this.cleanupOldAlerts();
      }
    }

    if (soilData.potassium < 25) {
      const alertId = `${alertKey}-potassium-low-${Date.now()}`;
      if (!this.lastAlerts.has(alertId)) {
        await sendSms(
          phoneNumber,
          SMS_TEMPLATES.SOIL_POTASSIUM_LOW(plant.commonName, soilData.potassium)
        );
        this.lastAlerts.add(alertId);
        this.cleanupOldAlerts();
      }
    }
  }

  private async checkWeatherAlerts(plant: Plant, weatherData: WeatherData) {
    if (!this.settings || !auth.currentUser) return;

    // Get user's phone number from Firestore
    const phoneNumber = await getUserPhoneNumber(auth.currentUser);
    if (!phoneNumber) {
      console.warn('No phone number found for user');
      return;
    }

    const alertKey = `weather-${plant.id}`;

    // Heavy rain alert
    if (weatherData.forecast.rain && weatherData.forecast.rainAmount > 20) {
      const alertId = `${alertKey}-rain-${Date.now()}`;
      if (!this.lastAlerts.has(alertId)) {
        await sendSms(
          phoneNumber,
          SMS_TEMPLATES.WEATHER_RAIN(plant.commonName, weatherData.forecast.rainAmount)
        );
        this.lastAlerts.add(alertId);
        this.cleanupOldAlerts();
      }
    }

    // Frost warning
    if (weatherData.forecast.lowTemp <= 2) {
      const alertId = `${alertKey}-frost-${Date.now()}`;
      if (!this.lastAlerts.has(alertId)) {
        await sendSms(
          phoneNumber,
          SMS_TEMPLATES.WEATHER_FROST(plant.commonName, weatherData.forecast.lowTemp)
        );
        this.lastAlerts.add(alertId);
        this.cleanupOldAlerts();
      }
    }

    // Heat warning
    if (weatherData.forecast.highTemp >= 35) {
      const alertId = `${alertKey}-heat-${Date.now()}`;
      if (!this.lastAlerts.has(alertId)) {
        await sendSms(
          phoneNumber,
          SMS_TEMPLATES.WEATHER_HEAT(plant.commonName, weatherData.forecast.highTemp)
        );
        this.lastAlerts.add(alertId);
        this.cleanupOldAlerts();
      }
    }
  }

  private cleanupOldAlerts() {
    // Keep only last 100 alerts to prevent memory leaks
    if (this.lastAlerts.size > 100) {
      const alertsArray = Array.from(this.lastAlerts);
      this.lastAlerts = new Set(alertsArray.slice(-50));
    }
  }

  private getStoredPlants(): Plant[] {
    // This should integrate with your existing plant data source
    // For now, return from localStorage or your state management
    const stored = localStorage.getItem('plants');
    return stored ? JSON.parse(stored) : [];
  }

  private async getSoilDataForPlant(plantId: string): Promise<SoilData | null> {
    // This should integrate with your existing soil data source
    // For now, return mock data or from localStorage
    const stored = localStorage.getItem(`soil-data-${plantId}`);
    return stored ? JSON.parse(stored) : null;
  }

  private async getWeatherData(): Promise<WeatherData | null> {
    try {
      // Replace with your weather API
      const response = await fetch('https://api.openweathermap.org/data/2.5/forecast?q=your-location&appid=YOUR_API_KEY');
      const data = await response.json();
      
      // Transform the response to match WeatherData interface
      return {
        temperature: data.list[0].main.temp,
        humidity: data.list[0].main.humidity,
        precipitation: data.list[0].rain?.['3h'] || 0,
        uvIndex: 0, // OpenWeather doesn't provide UV in forecast
        windSpeed: data.list[0].wind.speed,
        forecast: {
          rain: !!data.list[0].rain,
          rainAmount: data.list[0].rain?.['3h'] || 0,
          lowTemp: data.list[0].main.temp_min,
          highTemp: data.list[0].main.temp_max,
        }
      };
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }

  // Manual triggers for testing
  public async testSoilAlert(plant: Plant, soilData: SoilData) {
    await this.checkSoilAlerts(plant, soilData);
  }

  public async testWeatherAlert(plant: Plant, weatherData: WeatherData) {
    await this.checkWeatherAlerts(plant, weatherData);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();