import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plant } from '@/hooks/usePlants';

// Interface for soil data from Firebase
export interface SoilData {
  conductivity: number;
  moisture: number;
  nitrogen: number;
  ph: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  timestamp: Timestamp;
}

// Interface for comprehensive user context
export interface UserDataContext {
  plants: Plant[];
  soilData: SoilData | null;
  soilHistory: SoilData[];
  summary: {
    totalPlants: number;
    plantTypes: string[];
    currentSoilConditions: string;
    recentSoilTrends: string;
    criticalIssues: string[];
  };
}

export class DataContextService {
  private static instance: DataContextService;
  
  private constructor() {}
  
  static getInstance(): DataContextService {
    if (!DataContextService.instance) {
      DataContextService.instance = new DataContextService();
    }
    return DataContextService.instance;
  }

  /**
   * Fetch current soil data from Firebase
   */
  async getCurrentSoilData(): Promise<SoilData | null> {
    try {
      const soilDataRef = collection(db, 'soil_data');
      const q = query(soilDataRef, orderBy('timestamp', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return doc.data() as SoilData;
    } catch (error) {
      console.error('Error fetching current soil data:', error);
      return null;
    }
  }

  /**
   * Fetch recent soil data history (last 10 readings)
   */
  async getSoilDataHistory(): Promise<SoilData[]> {
    try {
      const soilDataRef = collection(db, 'soil_data');
      const q = query(soilDataRef, orderBy('timestamp', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => doc.data() as SoilData);
    } catch (error) {
      console.error('Error fetching soil data history:', error);
      return [];
    }
  }

  /**
   * Fetch user's plants data
   */
  async getUserPlantsData(userId: string): Promise<Plant[]> {
    try {
      const plantsRef = collection(db, 'users', userId, 'plants');
      const q = query(plantsRef, orderBy('dateAdded', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        userId,
        ...doc.data(),
        dateAdded: doc.data().dateAdded instanceof Timestamp ? 
          doc.data().dateAdded.toDate() : 
          new Date(doc.data().dateAdded)
      })) as Plant[];
    } catch (error) {
      console.error('Error fetching user plants:', error);
      return [];
    }
  }

  /**
   * Analyze soil conditions and generate insights
   */
  private analyzeSoilConditions(soilData: SoilData | null): {
    currentConditions: string;
    criticalIssues: string[];
  } {
    if (!soilData) {
      return {
        currentConditions: "No soil data available",
        criticalIssues: ["Soil sensors may be offline or not configured"]
      };
    }

    const conditions = [];
    const issues = [];

    // pH Analysis
    if (soilData.ph < 5.5) {
      conditions.push(`acidic soil (pH ${soilData.ph.toFixed(1)})`);
      issues.push(`Soil is too acidic (pH ${soilData.ph.toFixed(1)}) - may need lime treatment`);
    } else if (soilData.ph > 7.5) {
      conditions.push(`alkaline soil (pH ${soilData.ph.toFixed(1)})`);
      issues.push(`Soil is too alkaline (pH ${soilData.ph.toFixed(1)}) - may need sulfur treatment`);
    } else {
      conditions.push(`balanced pH (${soilData.ph.toFixed(1)})`);
    }

    // Moisture Analysis
    if (soilData.moisture < 30) {
      conditions.push(`low moisture (${soilData.moisture}%)`);
      issues.push(`Soil moisture is critically low (${soilData.moisture}%) - immediate watering needed`);
    } else if (soilData.moisture > 80) {
      conditions.push(`high moisture (${soilData.moisture}%)`);
      issues.push(`Soil moisture is too high (${soilData.moisture}%) - drainage issues possible`);
    } else {
      conditions.push(`adequate moisture (${soilData.moisture}%)`);
    }

    // Temperature Analysis
    if (soilData.temperature < 10) {
      conditions.push(`cold soil (${soilData.temperature}°C)`);
      issues.push(`Soil temperature is too cold (${soilData.temperature}°C) - may affect root growth`);
    } else if (soilData.temperature > 30) {
      conditions.push(`warm soil (${soilData.temperature}°C)`);
      issues.push(`Soil temperature is high (${soilData.temperature}°C) - may need mulching or shading`);
    } else {
      conditions.push(`optimal temperature (${soilData.temperature}°C)`);
    }

    // Nutrient Analysis
    const lowNutrients = [];
    if (soilData.nitrogen < 40) lowNutrients.push('nitrogen');
    if (soilData.phosphorus < 30) lowNutrients.push('phosphorus');
    if (soilData.potassium < 35) lowNutrients.push('potassium');

    if (lowNutrients.length > 0) {
      conditions.push(`low ${lowNutrients.join(', ')} levels`);
      issues.push(`Nutrient deficiency detected: ${lowNutrients.join(', ')} levels are below optimal`);
    } else {
      conditions.push('adequate nutrient levels');
    }

    return {
      currentConditions: conditions.join(', '),
      criticalIssues: issues
    };
  }

  /**
   * Analyze soil trends from historical data
   */
  private analyzeSoilTrends(soilHistory: SoilData[]): string {
    if (soilHistory.length < 2) {
      return "Not enough historical data for trend analysis";
    }

    const latest = soilHistory[0];
    const previous = soilHistory[1];
    const trends = [];

    // Moisture trend
    const moistureDiff = latest.moisture - previous.moisture;
    if (Math.abs(moistureDiff) > 5) {
      trends.push(`moisture ${moistureDiff > 0 ? 'increasing' : 'decreasing'} (${moistureDiff > 0 ? '+' : ''}${moistureDiff.toFixed(1)}%)`);
    }

    // Temperature trend
    const tempDiff = latest.temperature - previous.temperature;
    if (Math.abs(tempDiff) > 2) {
      trends.push(`temperature ${tempDiff > 0 ? 'rising' : 'falling'} (${tempDiff > 0 ? '+' : ''}${tempDiff.toFixed(1)}°C)`);
    }

    // pH trend
    const phDiff = latest.ph - previous.ph;
    if (Math.abs(phDiff) > 0.3) {
      trends.push(`pH ${phDiff > 0 ? 'increasing' : 'decreasing'} (${phDiff > 0 ? '+' : ''}${phDiff.toFixed(1)})`);
    }

    return trends.length > 0 ? trends.join(', ') : 'soil conditions are stable';
  }

  /**
   * Get comprehensive user data context for Claude
   */
  async getUserDataContext(userId: string): Promise<UserDataContext> {
    try {
      // Fetch all data in parallel
      const [plants, currentSoilData, soilHistory] = await Promise.all([
        this.getUserPlantsData(userId),
        this.getCurrentSoilData(),
        this.getSoilDataHistory()
      ]);

      // Analyze soil conditions
      const soilAnalysis = this.analyzeSoilConditions(currentSoilData);
      const soilTrends = this.analyzeSoilTrends(soilHistory);

      // Generate plant summary
      const plantTypes = [...new Set(plants.map(p => p.commonName))];

      return {
        plants,
        soilData: currentSoilData,
        soilHistory,
        summary: {
          totalPlants: plants.length,
          plantTypes,
          currentSoilConditions: soilAnalysis.currentConditions,
          recentSoilTrends: soilTrends,
          criticalIssues: soilAnalysis.criticalIssues
        }
      };
    } catch (error) {
      console.error('Error getting user data context:', error);
      // Return minimal context on error
      return {
        plants: [],
        soilData: null,
        soilHistory: [],
        summary: {
          totalPlants: 0,
          plantTypes: [],
          currentSoilConditions: "Error loading soil data",
          recentSoilTrends: "Unable to analyze trends",
          criticalIssues: ["Data loading error - please check system status"]
        }
      };
    }
  }

  /**
   * Format data context for Claude's system prompt
   */
  formatDataContextForClaude(context: UserDataContext): string {
    const { plants, soilData, summary } = context;
    
    let contextString = `=== USER'S GARDEN DATA ===\n\n`;
    
    // Plants summary
    contextString += `🌱 PLANTS IN GARDEN (${summary.totalPlants} total):\n`;
    if (plants.length > 0) {
      plants.forEach(plant => {
        contextString += `- ${plant.commonName} (${plant.scientificName})\n`;
        contextString += `  • Added: ${plant.dateAdded.toDateString()}\n`;
        contextString += `  • Cycle: ${plant.cycle}\n`;
        if (plant.wateringSchedule) contextString += `  • Watering: ${plant.wateringSchedule}\n`;
        if (plant.notes) contextString += `  • Notes: ${plant.notes}\n`;
        contextString += '\n';
      });
    } else {
      contextString += 'No plants currently registered in the system.\n\n';
    }
    
    // Current soil conditions
    contextString += `🌍 CURRENT SOIL CONDITIONS:\n`;
    if (soilData) {
      contextString += `- pH: ${soilData.ph.toFixed(1)} ${soilData.ph < 5.5 ? '(acidic)' : soilData.ph > 7.5 ? '(alkaline)' : '(balanced)'}\n`;
      contextString += `- Moisture: ${soilData.moisture}% ${soilData.moisture < 40 ? '(low)' : soilData.moisture > 70 ? '(high)' : '(optimal)'}\n`;
      contextString += `- Temperature: ${soilData.temperature}°C ${soilData.temperature < 15 ? '(cold)' : soilData.temperature > 25 ? '(warm)' : '(ideal)'}\n`;
      contextString += `- Nitrogen: ${soilData.nitrogen} ppm ${soilData.nitrogen < 40 ? '(low)' : '(adequate)'}\n`;
      contextString += `- Phosphorus: ${soilData.phosphorus} ppm ${soilData.phosphorus < 30 ? '(low)' : '(adequate)'}\n`;
      contextString += `- Potassium: ${soilData.potassium} ppm ${soilData.potassium < 35 ? '(low)' : '(adequate)'}\n`;
      contextString += `- Conductivity: ${soilData.conductivity} mS/cm\n`;
      contextString += `- Last updated: ${soilData.timestamp.toDate().toLocaleString()}\n\n`;
    } else {
      contextString += 'No soil data available from sensors.\n\n';
    }
    
    // Issues and trends
    if (summary.criticalIssues.length > 0) {
      contextString += `⚠️ CRITICAL ISSUES TO ADDRESS:\n`;
      summary.criticalIssues.forEach(issue => {
        contextString += `- ${issue}\n`;
      });
      contextString += '\n';
    }
    
    contextString += `📈 RECENT TRENDS: ${summary.recentSoilTrends}\n\n`;
    
    contextString += `=== END GARDEN DATA ===\n\n`;
    contextString += `Use this real-time data to provide specific, personalized advice for the user's plants and soil conditions. Reference specific readings and plant names when giving recommendations.`;
    
    return contextString;
  }
}

export const dataContextService = DataContextService.getInstance();