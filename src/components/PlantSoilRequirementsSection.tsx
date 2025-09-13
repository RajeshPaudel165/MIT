import React, { useState, useEffect, useCallback } from 'react';
import { Plant } from '@/hooks/usePlants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Droplets, Leaf } from 'lucide-react';
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
}

interface PlantSoilRequirementsSectionProps {
  plant: Plant;
}

const PlantSoilRequirementsSection: React.FC<PlantSoilRequirementsSectionProps> = ({ plant }) => {
  const [soilRequirements, setSoilRequirements] = useState<SoilRequirements | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper function to get nutrient level description
  const getNutrientLevel = (value: number): string => {
    if (value >= 70) return 'High';
    if (value >= 40) return 'Medium';
    return 'Low';
  };

  // Helper function to get moisture level description
  const getMoistureLevel = (value: number): string => {
    if (value >= 70) return 'High';
    if (value >= 40) return 'Medium';
    return 'Low';
  };

  // Generate soil requirements data from plant's properties
  const generateSoilRequirementsFromPlantData = useCallback((plant: Plant) => {
    // This is a simplified approach - in a real app, you'd fetch actual data
    const wateringScheduleMap: Record<string, number> = {
      'daily': 70,
      'weekly': 50,
      'monthly': 30
    };
    
    const moistureValue = wateringScheduleMap[plant.wateringSchedule || 'weekly'] || 50;
    
    const sunlightMap: Record<string, { n: number, p: number, k: number }> = {
      'full_sun': { n: 60, p: 50, k: 70 },
      'part_sun': { n: 50, p: 45, k: 55 },
      'part_shade': { n: 40, p: 40, k: 45 },
      'full_shade': { n: 30, p: 30, k: 40 }
    };
    
    const nutrients = sunlightMap[plant.sunlightPreference || 'full_sun'] || { n: 50, p: 50, k: 50 };
    
    // Adjust based on the plant family or genus, inferred from scientific name
    let phMin = 5.5;
    let phMax = 7.5;
    let phOptimal = 6.5;
    
    // Try to extract genus from scientific name
    const genus = plant.scientificName?.split(' ')[0]?.toLowerCase() || '';
    
    // Adjust pH based on genus
    if (['rhododendron', 'camellia', 'azalea'].includes(genus)) {
      phMin = 4.5;
      phMax = 6.0;
      phOptimal = 5.5;
    } else if (['lavandula', 'thymus', 'rosmarinus'].includes(genus)) {
      phMin = 6.5;
      phMax = 8.0;
      phOptimal = 7.0;
    }
    
    const requirements: SoilRequirements = {
      ph: {
        min: phMin,
        max: phMax,
        optimal: phOptimal
      },
      nitrogen: {
        level: getNutrientLevel(nutrients.n),
        value: nutrients.n
      },
      phosphorus: {
        level: getNutrientLevel(nutrients.p),
        value: nutrients.p
      },
      potassium: {
        level: getNutrientLevel(nutrients.k),
        value: nutrients.k
      },
      moisture: {
        level: getMoistureLevel(moistureValue),
        value: moistureValue
      },
      temperature: {
        min: 15,
        max: 28,
        optimal: 22
      }
    };
    
    setSoilRequirements(requirements);
  }, []);

  useEffect(() => {
    generateSoilRequirementsFromPlantData(plant);
  }, [plant, generateSoilRequirementsFromPlantData]);

  if (!soilRequirements) return null;

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
                     style={{ width: `${soilRequirements.moisture.value}%` }}></div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Level: <span className="font-medium">{soilRequirements.moisture.level}</span>
                </p>
                <p className="text-xs font-medium">{soilRequirements.moisture.value}%</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg bg-primary/5 p-3">
            <h4 className="text-xs font-medium mb-2">Quick Tips</h4>
            <ul className="space-y-1.5 text-xs">
              {soilRequirements.ph.optimal < 6.0 && (
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-blue-100 p-1 mt-0.5 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700">
                      <path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path>
                    </svg>
                  </div>
                  <span className="text-muted-foreground">Use acidic amendments like peat moss or sulfur</span>
                </li>
              )}
              {soilRequirements.ph.optimal > 7.0 && (
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-purple-100 p-1 mt-0.5 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
                      <path d="M19 12H5"></path><path d="M5 12h14"></path>
                    </svg>
                  </div>
                  <span className="text-muted-foreground">Add lime or wood ash to increase soil pH</span>
                </li>
              )}
              {soilRequirements.nitrogen.level === 'High' && (
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-blue-100 p-1 mt-0.5 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700">
                      <path d="M12 5v14"></path><path d="M19 12H5"></path>
                    </svg>
                  </div>
                  <span className="text-muted-foreground">Use nitrogen-rich fertilizers like blood meal</span>
                </li>
              )}
              {soilRequirements.potassium.level === 'High' && (
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-purple-100 p-1 mt-0.5 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
                      <path d="M12 5v14"></path><path d="M19 12H5"></path>
                    </svg>
                  </div>
                  <span className="text-muted-foreground">Add potassium-rich fertilizers like wood ash</span>
                </li>
              )}
              {soilRequirements.moisture.level === 'High' && (
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-cyan-100 p-1 mt-0.5 flex-shrink-0">
                    <Droplets className="h-2 w-2 text-cyan-700" />
                  </div>
                  <span className="text-muted-foreground">Keep soil consistently moist with regular watering</span>
                </li>
              )}
            </ul>
          </div>
          
          <div className="text-xs text-muted-foreground italic">
            Note: These are estimated requirements based on plant type. Actual needs may vary.
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
              Moisture: {soilRequirements.moisture.level}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground italic">Click to expand for details</p>
        </div>
      )}
    </div>
  );
};

export default PlantSoilRequirementsSection;
