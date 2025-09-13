import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Droplets, Thermometer, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { Plant } from '@/hooks/usePlants';

// Interface for soil data
interface SoilData {
  conductivity: number;
  moisture: number;
  nitrogen: number;
  ph: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  timestamp: Timestamp;
}

// Interface for environment data item
interface EnvironmentDataItem {
  name: string;
  current: number;
  optimal?: number;
  min?: number;
  max?: number;
  currentScaled?: number;
  optimalScaled?: number;
  required?: number;
  difference?: number;
}

// Interface for nutrient data item
interface NutrientDataItem {
  name: string;
  current: number;
  required: number;
  difference: number;
}

// Interface for soil requirements
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

interface PlantSoilComparisonChartProps {
  plant: Plant;
}

const PlantSoilComparisonChart: React.FC<PlantSoilComparisonChartProps> = ({ plant }) => {
  const [loading, setLoading] = useState(true);
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [soilRequirements, setSoilRequirements] = useState<SoilRequirements | null>(null);
  const [activeTab, setActiveTab] = useState('nutrients');
  
  // Generate soil requirements data from plant's properties
  const generateSoilRequirementsFromPlantData = useCallback((plantData: Plant) => {
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
    
    // This is a simplified approach - similar to what's in PlantSoilRequirementsSection
    const wateringScheduleMap: Record<string, number> = {
      'daily': 70,
      'weekly': 50,
      'monthly': 30
    };
    
    const moistureValue = wateringScheduleMap[plantData.wateringSchedule || 'weekly'] || 50;
    
    const sunlightMap: Record<string, { n: number, p: number, k: number }> = {
      'full_sun': { n: 60, p: 50, k: 70 },
      'part_sun': { n: 50, p: 45, k: 55 },
      'part_shade': { n: 40, p: 40, k: 45 },
      'full_shade': { n: 30, p: 30, k: 40 }
    };
    
    const nutrients = sunlightMap[plantData.sunlightPreference || 'full_sun'] || { n: 50, p: 50, k: 50 };
    
    // Adjust based on the plant family or genus, inferred from scientific name
    let phMin = 5.5;
    let phMax = 7.5;
    let phOptimal = 6.5;
    
    // Try to extract genus from scientific name
    const genus = plantData.scientificName?.split(' ')[0]?.toLowerCase() || '';
    
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

  // Fetch the most recent soil data
  const fetchSoilData = async () => {
    setLoading(true);
    try {
      const soilDataQuery = query(
        collection(db, 'soil_data'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(soilDataQuery);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        setSoilData(doc.data() as SoilData);
      } else {
        // If no data is found, use mock data for demo purposes
        setSoilData({
          ph: 6.2,
          moisture: 45,
          nitrogen: 42,
          phosphorus: 38,
          potassium: 55,
          temperature: 22,
          conductivity: 1.2,
          timestamp: Timestamp.now()
        });
      }
    } catch (error) {
      console.error("Error fetching soil data:", error);
      // Use mock data as fallback
      setSoilData({
        ph: 6.2,
        moisture: 45,
        nitrogen: 42,
        phosphorus: 38,
        potassium: 55,
        temperature: 22,
        conductivity: 1.2,
        timestamp: Timestamp.now()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoilData();
    generateSoilRequirementsFromPlantData(plant);
  }, [plant, generateSoilRequirementsFromPlantData]);

  // Generate comparison data for nutrients chart
  const generateNutrientComparisonData = () => {
    if (!soilData || !soilRequirements) return [];
    
    return [
      {
        name: 'Nitrogen',
        current: soilData.nitrogen,
        required: soilRequirements.nitrogen.value,
        difference: soilData.nitrogen - soilRequirements.nitrogen.value
      },
      {
        name: 'Phosphorus',
        current: soilData.phosphorus,
        required: soilRequirements.phosphorus.value,
        difference: soilData.phosphorus - soilRequirements.phosphorus.value
      },
      {
        name: 'Potassium',
        current: soilData.potassium,
        required: soilRequirements.potassium.value,
        difference: soilData.potassium - soilRequirements.potassium.value
      }
    ];
  };
  
  // Generate comparison data for pH and moisture
  const generateEnvironmentComparisonData = () => {
    if (!soilData || !soilRequirements) return [];
    
    return [
      {
        name: 'pH',
        current: soilData.ph,
        optimal: soilRequirements.ph.optimal,
        min: soilRequirements.ph.min,
        max: soilRequirements.ph.max,
        // Scale to match the 0-100 range of other metrics
        currentScaled: ((soilData.ph - 3) / 7) * 100,
        optimalScaled: ((soilRequirements.ph.optimal - 3) / 7) * 100
      },
      {
        name: 'Moisture',
        current: soilData.moisture,
        required: soilRequirements.moisture.value,
        difference: soilData.moisture - soilRequirements.moisture.value
      },
      {
        name: 'Temperature',
        current: soilData.temperature,
        optimal: soilRequirements.temperature.optimal,
        min: soilRequirements.temperature.min,
        max: soilRequirements.temperature.max
      }
    ];
  };
  
  // Generate analysis messages based on the comparison
  const generateAnalysis = () => {
    if (!soilData || !soilRequirements) return [];
    
    const analysis = [];
    
    // pH analysis
    const phDiff = Math.abs(soilData.ph - soilRequirements.ph.optimal);
    if (phDiff > 1.0) {
      if (soilData.ph < soilRequirements.ph.optimal) {
        analysis.push({
          metric: 'pH',
          message: `Your soil pH (${soilData.ph.toFixed(1)}) is too acidic for this plant. Consider adding lime to raise pH.`,
          severity: 'warning'
        });
      } else {
        analysis.push({
          metric: 'pH',
          message: `Your soil pH (${soilData.ph.toFixed(1)}) is too alkaline for this plant. Consider adding sulfur to lower pH.`,
          severity: 'warning'
        });
      }
    } else if (phDiff > 0.5) {
      analysis.push({
        metric: 'pH',
        message: `Your soil pH (${soilData.ph.toFixed(1)}) is slightly outside the optimal range for this plant.`,
        severity: 'info'
      });
    } else {
      analysis.push({
        metric: 'pH',
        message: `Your soil pH (${soilData.ph.toFixed(1)}) is in the optimal range for this plant.`,
        severity: 'success'
      });
    }
    
    // Nutrient analysis
    const nutrients = [
      { name: 'Nitrogen', current: soilData.nitrogen, required: soilRequirements.nitrogen.value },
      { name: 'Phosphorus', current: soilData.phosphorus, required: soilRequirements.phosphorus.value },
      { name: 'Potassium', current: soilData.potassium, required: soilRequirements.potassium.value }
    ];
    
    nutrients.forEach(nutrient => {
      const diff = nutrient.current - nutrient.required;
      if (Math.abs(diff) > 20) {
        analysis.push({
          metric: nutrient.name,
          message: diff < 0 
            ? `Your soil ${nutrient.name} is significantly lower than recommended for this plant.` 
            : `Your soil ${nutrient.name} is significantly higher than recommended for this plant.`,
          severity: 'warning'
        });
      } else if (Math.abs(diff) > 10) {
        analysis.push({
          metric: nutrient.name,
          message: diff < 0 
            ? `Your soil ${nutrient.name} is slightly lower than recommended for this plant.` 
            : `Your soil ${nutrient.name} is slightly higher than recommended for this plant.`,
          severity: 'info'
        });
      }
    });
    
    // Moisture analysis
    const moistureDiff = soilData.moisture - soilRequirements.moisture.value;
    if (Math.abs(moistureDiff) > 20) {
      analysis.push({
        metric: 'Moisture',
        message: moistureDiff < 0 
          ? `Your soil is too dry for this plant. Increase watering frequency.` 
          : `Your soil is too wet for this plant. Reduce watering or improve drainage.`,
        severity: 'warning'
      });
    } else if (Math.abs(moistureDiff) > 10) {
      analysis.push({
        metric: 'Moisture',
        message: moistureDiff < 0 
          ? `Your soil moisture is slightly lower than ideal for this plant.` 
          : `Your soil moisture is slightly higher than ideal for this plant.`,
        severity: 'info'
      });
    } else {
      analysis.push({
        metric: 'Moisture',
        message: `Your soil moisture is in the optimal range for this plant.`,
        severity: 'success'
      });
    }
    
    return analysis;
  };

  if (loading) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            Soil Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[300px] rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (!soilData || !soilRequirements) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            Soil Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Could not load soil data or calculate requirements.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const nutrientData = generateNutrientComparisonData();
  const environmentData = generateEnvironmentComparisonData();
  const analysis = generateAnalysis();

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-3 border rounded-md shadow-md">
          <p className="font-medium">{label}</p>
          <p className="text-sm">Current: <span className="font-medium">{payload[0].value}</span></p>
          <p className="text-sm">Recommended: <span className="font-medium">{payload[1].value}</span></p>
          <p className="text-sm text-muted-foreground">
            Difference: <span className={payload[2].value as number > 0 ? "text-green-600" : (payload[2].value as number) < 0 ? "text-red-600" : "text-green-600"}>
              {(payload[2].value as number) > 0 ? "+" : ""}{payload[2].value}
            </span>
          </p>
        </div>
      );
    }
  
    return null;
  };

  // Custom tooltip for pH
  const PH_Tooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as EnvironmentDataItem;
      return (
        <div className="bg-background p-3 border rounded-md shadow-md">
          <p className="font-medium">pH Level</p>
          <p className="text-sm">Current: <span className="font-medium">{data.current.toFixed(1)}</span></p>
          <p className="text-sm">Optimal: <span className="font-medium">{data.optimal?.toFixed(1)}</span></p>
          <p className="text-sm">Range: <span className="font-medium">{data.min?.toFixed(1)} - {data.max?.toFixed(1)}</span></p>
        </div>
      );
    }
  
    return null;
  };
  
  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            Soil Analysis & Comparison
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchSoilData} className="h-8">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="nutrients" className="flex-1">Nutrients (NPK)</TabsTrigger>
            <TabsTrigger value="environment" className="flex-1">pH & Moisture</TabsTrigger>
            <TabsTrigger value="analysis" className="flex-1">Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="nutrients" className="pt-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={nutrientData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="current" name="Current Level" fill="#3b82f6" />
                  <Bar dataKey="required" name="Recommended" fill="#10b981" />
                  <Bar dataKey="difference" name="Difference" fill="#d1d5db" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              This chart compares your current soil nutrient levels with the recommended levels for {plant.commonName}. 
              Significant differences may require soil amendments.
            </p>
          </TabsContent>
          
          <TabsContent value="environment" className="pt-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[environmentData[0]]}  // Only show pH in this chart
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 14]} />
                  <Tooltip content={<PH_Tooltip />} />
                  <Legend />
                  <Bar dataKey="current" name="Current pH" fill="#3b82f6">
                    {[environmentData[0]].map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.current < entry.min ? '#ef4444' : 
                          entry.current > entry.max ? '#ef4444' : 
                          '#10b981'
                        } 
                      />
                    ))}
                  </Bar>
                  <ReferenceLine y={environmentData[0].optimal} stroke="#10b981" strokeWidth={2} label="Optimal" />
                  <ReferenceLine y={environmentData[0].min} stroke="#d1d5db" strokeDasharray="3 3" />
                  <ReferenceLine y={environmentData[0].max} stroke="#d1d5db" strokeDasharray="3 3" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="h-[300px] w-full mt-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[environmentData[1]]}  // Only show moisture in this chart
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="current" name="Current Moisture" fill="#0ea5e9">
                    {[environmentData[1]].map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          Math.abs(entry.current - entry.required) > 20 ? '#ef4444' : 
                          Math.abs(entry.current - entry.required) > 10 ? '#f59e0b' : 
                          '#10b981'
                        } 
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="required" name="Recommended" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              These charts show how your current soil pH and moisture levels compare to the optimal ranges for {plant.commonName}.
            </p>
          </TabsContent>
          
          <TabsContent value="analysis" className="pt-4">
            <div className="space-y-4">
              {analysis.map((item, index) => (
                <Alert 
                  key={index} 
                  className={
                    item.severity === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                    item.severity === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                    'bg-blue-50 border-blue-200 text-blue-800'
                  }
                >
                  {item.severity === 'warning' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : item.severity === 'success' ? (
                    <Droplets className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                  <AlertDescription className="text-sm flex justify-between items-center">
                    <span>{item.message}</span>
                    <Badge
                      variant="outline"
                      className={
                        item.metric === 'pH' ? 'bg-purple-100 text-purple-800' :
                        item.metric === 'Nitrogen' ? 'bg-blue-100 text-blue-800' :
                        item.metric === 'Phosphorus' ? 'bg-orange-100 text-orange-800' :
                        item.metric === 'Potassium' ? 'bg-amber-100 text-amber-800' :
                        'bg-cyan-100 text-cyan-800'
                      }
                    >
                      {item.metric}
                    </Badge>
                  </AlertDescription>
                </Alert>
              ))}
              
              <p className="text-sm text-muted-foreground mt-4">
                This analysis compares your actual soil conditions with the optimal requirements for {plant.commonName}. 
                Use these insights to make targeted improvements to your soil.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p className="flex items-center gap-1">
            <Thermometer className="h-3 w-3" />
            Last reading: {soilData.timestamp ? new Date(soilData.timestamp.toDate()).toLocaleString() : 'Unknown'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlantSoilComparisonChart;
