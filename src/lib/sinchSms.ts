const servicePlanId = import.meta.env.VITE_SINCH_SERVICE_PLAN_ID;
const apiToken = import.meta.env.VITE_SINCH_API_TOKEN;
const fromNumber = import.meta.env.VITE_SINCH_PHONE_NUMBER;

export interface SmsMessage {
  to: string;
  message: string;
}

export async function sendSms(to: string, message: string): Promise<boolean> {
  try {
    // Use the backend endpoint instead of direct API call
    const response = await fetch('http://localhost:5001/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: to,
        message: message,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('SMS sent successfully:', result);
      return true;
    } else {
      const error = await response.json();
      console.error('Failed to send SMS:', error);
      return false;
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

// SMS templates for different alerts
export const SMS_TEMPLATES = {
  SOIL_PH_LOW: (plantName: string, ph: number) => 
    `🌱 SOIL ALERT: Your ${plantName}'s soil pH is too low (${ph.toFixed(1)}). Add lime to increase pH for better plant health.`,
  
  SOIL_PH_HIGH: (plantName: string, ph: number) => 
    `🌱 SOIL ALERT: Your ${plantName}'s soil pH is too high (${ph.toFixed(1)}). Add sulfur to decrease pH for optimal growth.`,
  
  SOIL_MOISTURE_LOW: (plantName: string, moisture: number) => 
    `💧 WATERING ALERT: Your ${plantName} needs water! Soil moisture is low (${moisture}%). Water immediately.`,
  
  SOIL_MOISTURE_HIGH: (plantName: string, moisture: number) => 
    `⚠️ DRAINAGE ALERT: Your ${plantName}'s soil is too wet (${moisture}%). Improve drainage to prevent root rot.`,
  
  SOIL_NITROGEN_LOW: (plantName: string, nitrogen: number) => 
    `🌿 NUTRIENT ALERT: Your ${plantName} needs nitrogen fertilizer. Current level: ${nitrogen}%. Apply nitrogen-rich fertilizer.`,
  
  SOIL_PHOSPHORUS_LOW: (plantName: string, phosphorus: number) => 
    `🌿 NUTRIENT ALERT: Your ${plantName} needs phosphorus fertilizer. Current level: ${phosphorus}%. Apply phosphorus-rich fertilizer.`,
  
  SOIL_POTASSIUM_LOW: (plantName: string, potassium: number) => 
    `🌿 NUTRIENT ALERT: Your ${plantName} needs potassium fertilizer. Current level: ${potassium}%. Apply potassium-rich fertilizer.`,
  
  WEATHER_RAIN: (plantName: string, rainAmount: number) => 
    `🌧️ WEATHER ALERT: Heavy rain expected (${rainAmount}mm). Cover your ${plantName} or ensure proper drainage.`,
  
  WEATHER_FROST: (plantName: string, lowTemp: number) => 
    `❄️ FROST WARNING: Temperature dropping to ${lowTemp}°C tonight. Protect your ${plantName} from frost damage.`,
  
  WEATHER_HEAT: (plantName: string, highTemp: number) => 
    `☀️ HEAT ALERT: Extreme heat expected (${highTemp}°C). Provide shade and extra water for your ${plantName}.`,
};