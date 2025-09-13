/**
 * Helper function to infer plant cycle based on taxonomy
 * @param genus - The plant genus
 * @param family - The plant family
 * @returns Inferred plant cycle (Annual, Perennial, etc.)
 */
export function inferPlantCycle(genus: string, family: string): string {
  // This is a simplified approach - in a real app, you'd want to use actual data
  // Some families that tend to have annual plants
  const annualFamilies = ['poaceae', 'asteraceae', 'brassicaceae'];
  
  // Some genera that tend to have annual plants
  const annualGenera = ['helianthus', 'solanum', 'ocimum', 'cucumis', 'pisum'];
  
  // Some families that tend to have perennial plants
  const perennialFamilies = ['rosaceae', 'lamiaceae', 'fabaceae'];
  
  // Some genera that tend to have perennial plants
  const perennialGenera = ['rosa', 'lavandula', 'quercus', 'acer', 'pinus'];
  
  const lowerGenus = genus.toLowerCase();
  const lowerFamily = family.toLowerCase();
  
  if (annualGenera.includes(lowerGenus) || annualFamilies.some(f => lowerFamily.includes(f))) {
    return 'Annual';
  } else if (perennialGenera.includes(lowerGenus) || perennialFamilies.some(f => lowerFamily.includes(f))) {
    return 'Perennial';
  }
  
  // Default assumption
  return 'Perennial';
}

/**
 * Helper function to infer watering needs based on taxonomy
 * @param genus - The plant genus
 * @param scientificName - The scientific name of the plant
 * @returns Inferred watering needs (Minimum, Average, Frequent)
 */
export function inferWateringNeeds(genus: string, scientificName: string): string {
  const lowerGenus = genus.toLowerCase();
  const lowerName = scientificName.toLowerCase();
  
  // Desert plants
  if (lowerName.includes('cactus') || 
      lowerName.includes('succulen') || 
      lowerGenus === 'aloe' ||
      lowerGenus === 'agave' ||
      lowerGenus === 'euphorbia' ||
      lowerGenus === 'haworthia' ||
      lowerGenus === 'echeveria') {
    return 'Minimum';
  }
  
  // Water-loving plants
  if (lowerName.includes('hydrangea') || 
      lowerName.includes('fern') ||
      lowerGenus === 'salix' ||
      lowerGenus === 'iris' ||
      lowerGenus === 'juncus' ||
      lowerGenus === 'carex') {
    return 'Frequent';
  }
  
  // Default
  return 'Average';
}

/**
 * Helper function to infer sunlight needs based on taxonomy
 * @param genus - The plant genus
 * @param scientificName - The scientific name of the plant
 * @returns Inferred sunlight needs (full_sun, part_shade, etc.)
 */
export function inferSunlightNeeds(genus: string, scientificName: string): string[] {
  const lowerGenus = genus.toLowerCase();
  const lowerName = scientificName.toLowerCase();
  
  // Shade-loving plants
  if (lowerName.includes('hosta') || 
      lowerName.includes('fern') || 
      lowerGenus === 'acer' ||
      lowerGenus === 'heuchera' ||
      lowerGenus === 'hydrangea' ||
      lowerGenus === 'camellia') {
    return ['part_shade', 'full_shade'];
  }
  
  // Sun-loving plants
  if (lowerGenus === 'helianthus' || 
      lowerGenus === 'lavandula' ||
      lowerGenus === 'rosa' ||
      lowerGenus === 'echinacea' ||
      lowerGenus === 'pelargonium') {
    return ['full_sun'];
  }
  
  // Default
  return ['part_sun', 'full_sun'];
}

/**
 * Helper function to convert watering info to schedule
 * @param watering - The watering needs (Minimum, Average, Frequent)
 * @returns Watering schedule (daily, weekly, monthly)
 */
export function getWateringSchedule(watering: string): string {
  if (!watering) return "weekly";
  
  // Convert to lowercase for comparison
  const wateringLower = watering.toLowerCase();
  if (wateringLower.includes("frequent") || wateringLower === "frequent") return "daily";
  if (wateringLower.includes("minimum") || wateringLower === "minimum") return "monthly";
  return "weekly"; // default for "average" and others
}
