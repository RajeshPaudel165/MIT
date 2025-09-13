import { identifyPlantWithGemini } from './gemini';
import { inferPlantCycle, inferWateringNeeds, inferSunlightNeeds } from './plantUtils';

// Plant.id API key (used as fallback when Gemini is unavailable)
const PLANT_ID_API_KEY = '2scIUR4L0WSZ1yx3y80INUoQ17znDr4KfCVrfyCQtKviOQC7Fd';

// Interface for plant identification results
export interface PlantIdentificationResult {
  id: string;
  name: string;
  commonNames: string[];
  scientificName: string;
  probability: number;
  family: string;
  genus: string;
  description?: string;
  edibleParts?: string[];
  watering?: string;
  cycle?: string;
  sunlight?: string[];
}

/**
 * Identifies a plant from an image, using Gemini API with fallback to Plant.id
 * @param imageBase64 - Base64 encoded image
 * @param useFallback - Whether to use fallback mode (Plant.id) directly
 * @returns Plant identification results
 */
export async function identifyPlant(
  imageBase64: string,
  useFallback: boolean = false
): Promise<{ results: PlantIdentificationResult[], source: 'Gemini' | 'Plant.id' }> {
  // First try Gemini unless fallback is requested
  if (!useFallback) {
    try {
      console.log("Attempting to identify plant with Gemini...");
      const results = await identifyPlantWithGemini(imageBase64);
      return { results, source: 'Gemini' };
    } catch (error) {
      console.warn("Gemini identification failed, falling back to Plant.id:", error);
      // If Gemini fails, fall back to Plant.id
      return identifyPlantWithPlantId(imageBase64);
    }
  } else {
    // Use Plant.id directly if fallback is requested
    return identifyPlantWithPlantId(imageBase64);
  }
}

/**
 * Identifies a plant using Plant.id API
 * @param imageBase64 - Base64 encoded image
 * @returns Plant identification results and source
 */
async function identifyPlantWithPlantId(
  imageBase64: string
): Promise<{ results: PlantIdentificationResult[], source: 'Plant.id' }> {
  console.log("Identifying plant with Plant.id API...");
  
  // For Plant.id API, we need only the base64 data without the prefix
  const base64WithoutPrefix = imageBase64.split(',')[1];
  
  // Plant.id API endpoint
  const apiUrl = 'https://api.plant.id/v2/identify';
  
  // Request body
  const requestData = {
    images: [base64WithoutPrefix],
    plant_details: ["common_names", "taxonomy", "url", "wiki_description", "edible_parts", "watering", "propagation_methods"],
  };
  
  // Make API request
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': PLANT_ID_API_KEY
    },
    body: JSON.stringify(requestData)
  });
  
  if (!response.ok) {
    throw new Error(`Error: ${response.status} - ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.suggestions || data.suggestions.length === 0) {
    throw new Error("No plants identified in the image");
  }
  
  // Process identification results
  const results: PlantIdentificationResult[] = data.suggestions.map((suggestion: {
    id: string;
    plant_name: string;
    plant_details?: {
      common_names?: string[];
      scientific_name?: string;
      wiki_description?: {
        value?: string;
      };
      edible_parts?: string[];
      watering?: string;
      taxonomy?: {
        family?: string;
        genus?: string;
      };
    };
    probability: number;
  }) => ({
    id: suggestion.id,
    name: suggestion.plant_name,
    commonNames: suggestion.plant_details?.common_names || [],
    scientificName: suggestion.plant_details?.scientific_name || suggestion.plant_name,
    probability: suggestion.probability,
    family: suggestion.plant_details?.taxonomy?.family || 'Unknown',
    genus: suggestion.plant_details?.taxonomy?.genus || 'Unknown',
    description: suggestion.plant_details?.wiki_description?.value || '',
    edibleParts: suggestion.plant_details?.edible_parts || [],
    watering: suggestion.plant_details?.watering || '',
    cycle: inferPlantCycle(
      suggestion.plant_details?.taxonomy?.genus || '', 
      suggestion.plant_details?.taxonomy?.family || ''
    ),
    sunlight: inferSunlightNeeds(
      suggestion.plant_details?.taxonomy?.genus || '', 
      suggestion.plant_name || ''
    )
  }));
  
  return { results, source: 'Plant.id' };
}
