import React, { useState, useEffect, useCallback } from 'react';
import { Plant } from '@/hooks/usePlants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Droplets, Leaf, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Interface for soil requirements data
interface SoilRequirements {
  ph: {
    min: number;
    max: number;
    optimal: number;
  };
  nitrogen: {
    level: string;
    value: number;
  };
  phosphorus: {
    level: string;
    value: number;
  };
  potassium: {
    level: string;
    value: number;
  };
  moisture: {
    level: string;
    value: number;
  };
  temperature: {
    min: number;
    max: number;
    optimal: number;
  };
  organicMatter: {
    level: string;
    value: number;
  };
  drainage: string;
  soilType: string[];
  tips: string[];
}

interface PlantSoilRequirementsSectionProps {
  plant: Plant;
}

const PlantSoilRequirementsSection: React.FC<PlantSoilRequirementsSectionProps> = ({ plant }) => {
  const [soilRequirements, setSoilRequirements] = useState<SoilRequirements | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to parse pH range from text
  const parsePHRange = (text: string): { min: number; max: number; optimal: number } => {
    const phPattern = /(\d\.?\d?)\s*[-–—to]\s*(\d\.?\d?)/i;
    const singlePhPattern = /(\d\.?\d?)/;
    
    const rangeMatch = text.match(phPattern);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return { min, max, optimal: (min + max) / 2 };
    }
    
    const singleMatch = text.match(singlePhPattern);
    if (singleMatch) {
      const ph = parseFloat(singleMatch[1]);
      return { min: ph - 0.5, max: ph + 0.5, optimal: ph };
    }
    
    return { min: 6.0, max: 7.0, optimal: 6.5 }; // default
  };

  // Helper function to parse nutrient levels
  const parseNutrientLevel = (text: string, nutrient: string): { level: string; value: number } => {
    const lowerText = text.toLowerCase();
    const nutrientLower = nutrient.toLowerCase();
    
    if (lowerText.includes('high ' + nutrientLower) || lowerText.includes(nutrientLower + ' rich')) {
      return { level: 'High', value: 75 };
    }
    if (lowerText.includes('moderate ' + nutrientLower) || lowerText.includes('medium ' + nutrientLower)) {
      return { level: 'Medium', value: 50 };
    }
    if (lowerText.includes('low ' + nutrientLower) || lowerText.includes('poor ' + nutrientLower)) {
      return { level: 'Low', value: 25 };
    }
    
    return { level: 'Medium', value: 50 }; // default
  };

  // Helper function to parse moisture requirements
  const parseMoistureLevel = (text: string): { level: string; value: number } => {
    const lowerText = text.toLowerCase();
    // Map moisture to 0–10 scale
    if (lowerText.includes('moist') || lowerText.includes('wet') || lowerText.includes('high moisture')) {
      return { level: 'High', value: 9 };
    }
    if (lowerText.includes('dry') || lowerText.includes('drought') || lowerText.includes('low moisture')) {
      return { level: 'Low', value: 3 };
    }
    if (lowerText.includes('moderate') || lowerText.includes('average')) {
      return { level: 'Medium', value: 7 };
    }
    return { level: 'Medium', value: 7 }; // default
  };

  // Helper function to extract temperature range
  const parseTemperatureRange = (text: string): { min: number; max: number; optimal: number } => {
    const tempPattern = /(\d+)\s*[-–—to]\s*(\d+)\s*[°]?[cf]/i;
    const match = text.match(tempPattern);
    
    if (match) {
      let min = parseInt(match[1]);
      let max = parseInt(match[2]);
      
      // Convert Fahrenheit to Celsius if needed
      if (text.toLowerCase().includes('°f') || text.toLowerCase().includes('fahrenheit')) {
        min = Math.round((min - 32) * 5 / 9);
        max = Math.round((max - 32) * 5 / 9);
      }
      
      return { min, max, optimal: Math.round((min + max) / 2) };
    }
    
    return { min: 15, max: 25, optimal: 20 }; // default
  };

  // Function to fetch real soil requirements from Claude
  const fetchSoilRequirementsFromClaude = useCallback(async (plant: Plant) => {
    setIsLoading(true);
    setError(null);
    
    // Simulate Claude API response (replace this with actual API call)
    const simulateClaudeResponse = async (plant: Plant): Promise<SoilRequirements> => {
      // This is where you would make the actual API call to Claude
      // For demonstration, I'm showing how to structure the response
      return new Promise((resolve) => {
        setTimeout(() => {
          // This would be replaced with actual Claude API response parsing
          const mockResponse = `Soil Requirements for ${plant.commonName} (${plant.scientificName}): ...`;
          // ...existing code...
          resolve({
            ph: { min: 6.0, max: 7.0, optimal: 6.5 },
            nitrogen: { level: 'Medium', value: 5 },
            phosphorus: { level: 'Medium', value: 5 },
            potassium: { level: 'Medium', value: 5 },
            moisture: { level: 'Medium', value: 5 },
            temperature: { min: 15, max: 25, optimal: 20 },
            organicMatter: { level: 'Medium', value: 50 },
            drainage: 'Well-drained',
            soilType: ['Loam'],
            tips: [
              'Add organic compost to improve soil fertility.',
              'Maintain consistent moisture, but avoid waterlogging.',
              'Test soil pH annually and adjust as needed.'
            ]
          });
        }, 1000);
      });
    };

    try {
      const prompt = `Please provide detailed soil requirements for ${plant.commonName} (${plant.scientificName || 'scientific name not available'}). 

Include the following information:
1. Soil pH range (minimum, maximum, and optimal)
2. Nitrogen requirements (high/medium/low)
3. Phosphorus requirements (high/medium/low) 
4. Potassium requirements (high/medium/low)
5. Moisture requirements (high/medium/low)
6. Temperature range preferences in Celsius
7. Organic matter requirements (high/medium/low)
8. Drainage preferences (well-drained/poor drainage/moderate)
9. Preferred soil types (clay, sand, loam, etc.)
10. 3-5 specific care tips for soil management

Format the response as a structured text that I can parse programmatically.`;

      // In a real implementation, you would call Claude's API here
      // For now, I'll simulate this with a placeholder that you can replace
      const response = await simulateClaudeResponse(plant);
      setSoilRequirements(response);
    } catch (err) {
      setError('Failed to fetch soil requirements');
      console.error('Error fetching soil requirements:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Simulate Claude API response (replace this with actual API call)
  const simulateClaudeResponse = async (plant: Plant): Promise<SoilRequirements> => {
    // This is where you would make the actual API call to Claude
    // For demonstration, I'm showing how to structure the response
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // This would be replaced with actual Claude API response parsing
        const mockResponse = `
Soil Requirements for ${plant}:

pH: 6.2-7.0 (optimal 6.6)
Nitrogen: Medium requirements
Phosphorus: Low to medium requirements  
Potassium: High requirements
Moisture: Medium, well-drained soil
Temperature: 18-24°C optimal
Organic matter: High requirements
Drainage: Well-drained
Soil types: Loamy, sandy loam
Tips: 
- Add compost annually for organic matter
- Ensure good drainage to prevent root rot
- Mulch around base to retain moisture
- Test soil pH annually and adjust as needed
- Avoid heavy clay soils
`;

        const soilData: SoilRequirements = {
          ph: parsePHRange(mockResponse),
          nitrogen: parseNutrientLevel(mockResponse, 'nitrogen'),
          phosphorus: parseNutrientLevel(mockResponse, 'phosphorus'),
          potassium: parseNutrientLevel(mockResponse, 'potassium'),
          moisture: parseMoistureLevel(mockResponse),
          temperature: parseTemperatureRange(mockResponse),
          organicMatter: parseNutrientLevel(mockResponse, 'organic matter'),
          drainage: mockResponse.toLowerCase().includes('well-drained') ? 'Well-drained' : 'Moderate',
          soilType: ['Loamy', 'Sandy loam'],
          tips: [
            'Add compost annually for organic matter',
            'Ensure good drainage to prevent root rot',
            'Mulch around base to retain moisture',
            'Test soil pH annually and adjust as needed',
            'Avoid heavy clay soils'
          ]
        };
        
        resolve(soilData);
      }, 1000); // Simulate API delay
    });
  };

  useEffect(() => {
    fetchSoilRequirementsFromClaude(plant);
  }, [plant, fetchSoilRequirementsFromClaude]);

  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        <Separator />
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Leaf className="h-4 w-4 text-primary" />
            Soil Requirements
          </h3>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
        <div className="text-sm text-muted-foreground">Loading soil requirements...</div>
      </div>
    );
  }

  if (error || !soilRequirements) {
    return (
      <div className="space-y-4 mt-4">
        <Separator />
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Leaf className="h-4 w-4 text-primary" />
            Soil Requirements
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => fetchSoilRequirementsFromClaude(plant)}
            className="h-8 px-2 text-xs"
          >
            Retry
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {error || 'Unable to load soil requirements'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <Separator />
      
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Leaf className="h-4 w-4 text-primary" />
          Soil Requirements
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 p-0"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {isExpanded ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* pH Level */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Badge variant="outline" className="h-6 px-2 font-semibold">pH</Badge>
              Soil pH Level
            </h4>
            <div className="h-6 w-full bg-muted rounded-full relative">
              <div className="absolute inset-0 flex items-center justify-between px-3">
                <span className="text-xs font-medium">Acidic</span>
                <span className="text-xs font-medium">Neutral</span>
                <span className="text-xs font-medium">Alkaline</span>
              </div>
              <div className="absolute inset-y-0 bg-green-100/40 rounded-full"
                   style={{ 
                     left: `${(soilRequirements.ph.min - 3) / 0.07}%`, 
                     right: `${100 - ((soilRequirements.ph.max - 3) / 0.07)}%` 
                   }}></div>
              <div className="absolute top-full mt-1 w-full flex justify-between text-xs text-muted-foreground">
                <span>3</span>
                <span>7</span>
                <span>10</span>
              </div>
              <div className="absolute inset-y-0 w-2 bg-primary rounded-full"
                   style={{ left: `calc(${(soilRequirements.ph.optimal - 3) / 0.07}% - 4px)` }}></div>
            </div>
            <p className="text-xs text-muted-foreground pt-3">
              Optimal pH: <span className="font-medium">{soilRequirements.ph.optimal}</span> 
              (Range: {soilRequirements.ph.min} - {soilRequirements.ph.max})
            </p>
          </div>
          
          <div className="grid gap-4 grid-cols-2">
            {/* Nitrogen */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium flex items-center gap-2">
                <Badge variant="outline" className="h-5 px-1.5 font-semibold">N</Badge>
                Nitrogen
              </h4>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" 
                     style={{ width: `${soilRequirements.nitrogen.value}%` }}></div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Level: <span className="font-medium">{soilRequirements.nitrogen.level}</span>
                </p>
                <p className="text-xs font-medium">{soilRequirements.nitrogen.value}%</p>
              </div>
            </div>
            
            {/* Phosphorus */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium flex items-center gap-2">
                <Badge variant="outline" className="h-5 px-1.5 font-semibold">P</Badge>
                Phosphorus
              </h4>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" 
                     style={{ width: `${soilRequirements.phosphorus.value}%` }}></div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Level: <span className="font-medium">{soilRequirements.phosphorus.level}</span>
                </p>
                <p className="text-xs font-medium">{soilRequirements.phosphorus.value}%</p>
              </div>
            </div>
            
            {/* Potassium */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium flex items-center gap-2">
                <Badge variant="outline" className="h-5 px-1.5 font-semibold">K</Badge>
                Potassium
              </h4>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" 
                     style={{ width: `${soilRequirements.potassium.value}%` }}></div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Level: <span className="font-medium">{soilRequirements.potassium.level}</span>
                </p>
                <p className="text-xs font-medium">{soilRequirements.potassium.value}%</p>
              </div>
            </div>
            
            {/* Moisture */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium flex items-center gap-2">
                <Badge variant="outline" className="h-5 px-1.5 font-semibold">H₂O</Badge>
                Moisture
              </h4>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" 
                       style={{ width: `${(soilRequirements.moisture.value / 10) * 100}%` }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Level: <span className="font-medium">{soilRequirements.moisture.level}</span>
                  </p>
                  <p className="text-xs font-medium">{soilRequirements.moisture.value} / 10</p>
                </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-medium mb-2">Soil Type</h4>
                <div className="flex flex-wrap gap-1">
                  {soilRequirements.soilType.map((type, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-medium mb-2">Drainage</h4>
                <Badge variant="outline" className="text-xs">
                  {soilRequirements.drainage}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium mb-2">Temperature Range</h4>
              <p className="text-xs text-muted-foreground">
                {soilRequirements.temperature.min}°C - {soilRequirements.temperature.max}°C 
                (Optimal: {soilRequirements.temperature.optimal}°C)
              </p>
            </div>
          </div>
          
          {/* Care Tips from Claude */}
          <div className="rounded-lg bg-primary/5 p-3">
            <h4 className="text-xs font-medium mb-2">Expert Care Tips</h4>
            <ul className="space-y-1.5 text-xs">
              {soilRequirements.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="rounded-full bg-green-100 p-1 mt-0.5 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-700">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                  </div>
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="text-xs text-muted-foreground italic">
            Data sourced from Claude AI botanical knowledge base
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn(
              "bg-opacity-20",
              soilRequirements.ph.optimal < 6.0 ? "bg-blue-100 text-blue-700" : 
              soilRequirements.ph.optimal > 7.0 ? "bg-purple-100 text-purple-700" : 
              "bg-green-100 text-green-700"
            )}>
              pH {soilRequirements.ph.optimal}
            </Badge>
            
            <Badge variant="outline" className="bg-blue-100 bg-opacity-20 text-blue-700">
              N: {soilRequirements.nitrogen.level}
            </Badge>
            
            <Badge variant="outline" className="bg-orange-100 bg-opacity-20 text-orange-700">
              P: {soilRequirements.phosphorus.level}
            </Badge>
            
            <Badge variant="outline" className="bg-purple-100 bg-opacity-20 text-purple-700">
              K: {soilRequirements.potassium.level}
            </Badge>
            
            <Badge variant="outline" className="bg-cyan-100 bg-opacity-20 text-cyan-700">
              Moisture: {soilRequirements.moisture.level} ({soilRequirements.moisture.value} / 10)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground italic">Click to expand for detailed requirements</p>
        </div>
      )}
    </div>
  );
};

export default PlantSoilRequirementsSection;