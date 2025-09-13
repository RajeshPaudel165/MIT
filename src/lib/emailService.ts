// Email notification service - DISABLED
const BACKEND_URL = 'http://localhost:5001';

export interface SoilData {
  ph?: number;
  moisture?: number;
  temperature?: number;
  nutrients?: string;
}

export interface WeatherData {
  condition?: string;
  temperature?: number;
  humidity?: number;
  precipitation?: string;
}

export interface EmailData {
  to: string;
  subject?: string;
  message: string;
}

export const sendEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    console.log('EMAIL DISABLED - Would send email:', emailData);
    
    // EMAIL SENDING DISABLED - just return success without actually sending
    console.log('Email sending is disabled for development');
    return true;
  } catch (error) {
    console.error('Failed to process email request:', error);
    throw error;
  }
};

// Send soil condition alert email - DISABLED
export const sendSoilAlert = async (userEmail: string, alertType: string, soilData: SoilData) => {
  console.log(`📧 Would send soil alert to ${userEmail}: ${alertType} (EMAIL DISABLED)`);
  console.log('Soil data:', soilData);
  return true; // Return success without sending
};

// Send weather alert email - DISABLED
export const sendWeatherAlert = async (userEmail: string, weatherType: string, weatherData: WeatherData) => {
  console.log(`📧 Would send weather alert to ${userEmail}: ${weatherType} (EMAIL DISABLED)`);
  console.log('Weather data:', weatherData);
  return true; // Return success without sending
};

// Send welcome email - DISABLED
export const sendWelcomeEmail = async (userEmail: string, userName: string) => {
  console.log(`📧 Would send welcome email to ${userEmail} for ${userName} (EMAIL DISABLED)`);
  return true; // Return success without sending
};