import { claudeService, PlantIdentificationResult } from './claudeService';

// Interface matching your existing PlantData structure
export interface PlantData {
  id: string | number;
  scientificName: string;
  commonName: string;
  familyName: string;
  genus: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  description?: string;
  observationCount?: number;
  wikipediaUrl?: string;
  cycle?: string;
  watering?: string;
  sunlight?: string[];
  dataSource: 'iNaturalist' | 'Mock' | 'Custom' | 'PlantNet' | 'Perenual' | 'Gemini' | 'Claude-Vision';
  originalImageUrl?: string;
  careInstructions?: string;
  nativeRegion?: string;
  plantingTips?: string;
  confidence?: number; // Added for Claude Vision results
  characteristics?: {
    leafShape?: string;
    leafColor?: string;
    flowerColor?: string;
    plantType?: string;
    size?: string;
  };
}

export class PlantIdentificationService {
  private static instance: PlantIdentificationService;
  
  private constructor() {}
  
  static getInstance(): PlantIdentificationService {
    if (!PlantIdentificationService.instance) {
      PlantIdentificationService.instance = new PlantIdentificationService();
    }
    return PlantIdentificationService.instance;
  }

  /**
   * Convert Claude Vision result to PlantData format
   */
  private convertToPlantData(
    claudeResult: PlantIdentificationResult, 
    imageUrl?: string
  ): PlantData {
    return {
      id: `claude-vision-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      scientificName: claudeResult.scientificName,
      commonName: claudeResult.commonName,
      familyName: claudeResult.family,
      genus: claudeResult.genus,
      imageUrl: imageUrl,
      thumbnailUrl: imageUrl,
      description: claudeResult.description,
      observationCount: Math.round(claudeResult.confidence * 1000), // Use confidence as pseudo observation count
      cycle: this.inferPlantCycle(claudeResult.growthHabit, claudeResult.characteristics.plantType),
      watering: this.mapWateringRequirement(claudeResult.careInstructions.watering),
      sunlight: this.mapSunlightRequirement(claudeResult.careInstructions.sunlight),
      dataSource: 'Claude-Vision',
      careInstructions: this.formatCareInstructions(claudeResult.careInstructions),
      nativeRegion: claudeResult.nativeRegion,
      plantingTips: this.generatePlantingTips(claudeResult),
      confidence: claudeResult.confidence,
      characteristics: claudeResult.characteristics
    };
  }

  /**
   * Infer plant cycle from growth habit and type
   */
  private inferPlantCycle(growthHabit?: string, plantType?: string): string {
    if (!growthHabit && !plantType) return 'Perennial';
    
    const combined = `${growthHabit || ''} ${plantType || ''}`.toLowerCase();
    
    if (combined.includes('annual') || combined.includes('herb')) return 'Annual';
    if (combined.includes('biennial')) return 'Biennial';
    if (combined.includes('tree') || combined.includes('shrub') || combined.includes('perennial')) return 'Perennial';
    
    return 'Perennial'; // Default
  }

  /**
   * Map Claude's watering instructions to your system's format
   */
  private mapWateringRequirement(watering: string): string {
    const lower = watering.toLowerCase();
    
    if (lower.includes('frequent') || lower.includes('daily') || lower.includes('moist')) return 'Frequent';
    if (lower.includes('moderate') || lower.includes('weekly') || lower.includes('regular')) return 'Average';
    if (lower.includes('minimal') || lower.includes('drought') || lower.includes('dry')) return 'Minimum';
    if (lower.includes('occasional') || lower.includes('bi-weekly')) return 'Average';
    
    return 'Average'; // Default
  }

  /**
   * Map Claude's sunlight requirements to your system's format
   */
  private mapSunlightRequirement(sunlight: string): string[] {
    const lower = sunlight.toLowerCase();
    const requirements: string[] = [];
    
    if (lower.includes('full sun') || lower.includes('direct sun')) requirements.push('full_sun');
    if (lower.includes('partial sun') || lower.includes('part sun')) requirements.push('part_sun');
    if (lower.includes('partial shade') || lower.includes('part shade')) requirements.push('part_shade');
    if (lower.includes('full shade') || lower.includes('shade')) requirements.push('full_shade');
    
    // If no specific requirements found, infer from description
    if (requirements.length === 0) {
      if (lower.includes('bright')) requirements.push('full_sun', 'part_sun');
      else if (lower.includes('indirect')) requirements.push('part_shade');
      else requirements.push('part_sun'); // Default
    }
    
    return requirements;
  }

  /**
   * Format care instructions as a readable string
   */
  private formatCareInstructions(care: PlantIdentificationResult['careInstructions']): string {
    return `Watering: ${care.watering}. Sunlight: ${care.sunlight}. Soil: ${care.soilType}. Temperature: ${care.temperature}.`;
  }

  /**
   * Generate planting tips based on identification result
   */
  private generatePlantingTips(result: PlantIdentificationResult): string {
    const tips = [];
    
    if (result.characteristics.size) {
      tips.push(`Plant size: ${result.characteristics.size}`);
    }
    
    if (result.nativeRegion) {
      tips.push(`Native to ${result.nativeRegion}, so consider similar climate conditions`);
    }
    
    if (result.growthHabit) {
      tips.push(`Growth habit: ${result.growthHabit}`);
    }
    
    // Add soil-specific tips based on care instructions
    if (result.careInstructions.soilType.toLowerCase().includes('drain')) {
      tips.push('Ensure good drainage to prevent root rot');
    }
    
    if (result.careInstructions.watering.toLowerCase().includes('minimal')) {
      tips.push('Allow soil to dry between waterings');
    }
    
    return tips.join('. ');
  }

  /**
   * Identify plant from image and return in PlantData format
   */
  async identifyPlantFromImage(imageFile: File, imageUrl?: string): Promise<PlantData> {
    try {
      const claudeResult = await claudeService.identifyPlantFromImage(imageFile);
      return this.convertToPlantData(claudeResult, imageUrl);
    } catch (error) {
      console.error('Error in plant identification service:', error);
      throw error;
    }
  }

  /**
   * Get confidence level interpretation
   */
  getConfidenceLevel(confidence: number): {
    level: 'high' | 'medium' | 'low';
    description: string;
    color: string;
  } {
    if (confidence >= 0.8) {
      return {
        level: 'high',
        description: 'Very confident identification',
        color: 'text-green-600'
      };
    } else if (confidence >= 0.6) {
      return {
        level: 'medium', 
        description: 'Moderately confident identification',
        color: 'text-yellow-600'
      };
    } else {
      return {
        level: 'low',
        description: 'Low confidence - please verify',
        color: 'text-red-600'
      };
    }
  }

  /**
   * Validate image file for plant identification
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Please upload a JPEG, PNG, WebP, or GIF image' 
      };
    }
    
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: 'Image size must be less than 10MB' 
      };
    }
    
    return { valid: true };
  }
}

export const plantIdentificationService = PlantIdentificationService.getInstance();