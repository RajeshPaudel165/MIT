import React, { useState, useEffect } from 'react';
import { Plant } from '@/hooks/usePlants';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Droplets, Leaf, Sun, BookOpen, Info, BarChart3, AlertTriangle, CheckCircle, Clock, Thermometer } from 'lucide-react';
import { formatDate, isBase64Image } from '@/lib/utils';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Real soil data interface from your system
interface SoilData {
  ph: number;
  moisture: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  conductivity: number;
  timestamp: Timestamp;
}

interface PlantReportProps {
  plant: Plant;
  aiResult?: string | null;
}

export default function PlantReport({ plant, aiResult }: PlantReportProps) {
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [soilDataLoading, setSoilDataLoading] = useState(true);

  // Fetch real soil data from Firebase
  useEffect(() => {
    const fetchSoilData = async () => {
      try {
        setSoilDataLoading(true);
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
          // No real soil data available
          setSoilData(null);
        }
      } catch (error) {
        console.error("Error fetching soil data for report:", error);
        setSoilData(null);
      } finally {
        setSoilDataLoading(false);
      }
    };

    fetchSoilData();
  }, []);
  // Convert sunlight preference to a readable format
  const formatSunlight = (sunlight: string | undefined) => {
    if (!sunlight) return 'Unknown';
    
    return sunlight
      .replace('_', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Function to format date in a more human-readable format
 const formatTimestamp = (timestamp: Date | Timestamp | number | string | null | undefined): string => {
  if (!timestamp) return 'Unknown';
  if (timestamp instanceof Date) return timestamp.toLocaleString();
  if (typeof timestamp === 'number') return new Date(timestamp).toLocaleString();
  if (typeof timestamp === 'string') return new Date(timestamp).toLocaleString();
  
  // Handle Firestore Timestamp objects
  if (timestamp && typeof timestamp === 'object') {
    // Check if it's a Firestore Timestamp with seconds property
    if ('seconds' in timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    // Check if it has a toDate method (Firestore Timestamp)
    if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
      try {
        return timestamp.toDate().toLocaleString();
      } catch (error) {
        console.error('Error calling toDate():', error);
      }
    }
  }
  
  return 'Invalid Date';
};

  // Calculate days since added
  const daysSinceAdded = Math.floor((new Date().getTime() - plant.dateAdded.getTime()) / (1000 * 60 * 60 * 24));

  // Generate health score based on real plant data and soil conditions
  const calculateHealthScore = () => {
    let score = 0;
    let maxScore = 0;

    // Basic plant care setup (40 points)
    if (plant.wateringSchedule) { score += 10; }
    if (plant.sunlightPreference) { score += 10; }
    if (plant.soilMoisturePreference) { score += 10; }
    if (plant.notes) { score += 10; }
    maxScore += 40;

    // Soil conditions alignment (40 points)
    if (soilData) {
      // pH assessment
      const idealPh = 6.5; // General ideal pH
      const phScore = Math.max(0, 10 - Math.abs(soilData.ph - idealPh) * 2);
      score += phScore;
      maxScore += 10;

      // Moisture assessment based on plant's preference
      let moistureScore = 0;
      if (plant.wateringSchedule === 'daily' && soilData.moisture >= 60) moistureScore = 10;
      else if (plant.wateringSchedule === 'weekly' && soilData.moisture >= 40 && soilData.moisture <= 70) moistureScore = 10;
      else if (plant.wateringSchedule === 'monthly' && soilData.moisture >= 20 && soilData.moisture <= 50) moistureScore = 10;
      else moistureScore = Math.max(0, 10 - Math.abs(50 - soilData.moisture) / 5);
      score += moistureScore;
      maxScore += 10;

      // Temperature assessment
      const tempScore = soilData.temperature >= 15 && soilData.temperature <= 25 ? 10 : Math.max(0, 10 - Math.abs(20 - soilData.temperature) / 2);
      score += tempScore;
      maxScore += 10;

      // Nutrient levels
      const avgNutrients = (soilData.nitrogen + soilData.phosphorus + soilData.potassium) / 3;
      const nutrientScore = avgNutrients >= 40 ? 10 : (avgNutrients / 40) * 10;
      score += nutrientScore;
      maxScore += 10;
    } else {
      maxScore += 40; // Still count max score even without soil data
    }
    
    // AI analysis factor (20 points)
    if (aiResult) {
      const aiText = aiResult.toLowerCase();
      if (aiText.includes('healthy') && !aiText.includes('disease') && !aiText.includes('pest')) {
        score += 20;
      } else if (aiText.includes('disease') || aiText.includes('pest') || aiText.includes('problem')) {
        score += 5;
      } else {
        score += 10; // Neutral analysis
      }
    } else {
      score += 10; // No analysis available, assume average
    }
    maxScore += 20;

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
  };

  const healthScore = calculateHealthScore();

  const getHealthStatus = () => {
    if (healthScore >= 80) return { status: 'Excellent', color: 'text-green-600', icon: CheckCircle };
    if (healthScore >= 60) return { status: 'Good', color: 'text-blue-600', icon: CheckCircle };
    if (healthScore >= 40) return { status: 'Fair', color: 'text-yellow-600', icon: AlertTriangle };
    return { status: 'Needs Attention', color: 'text-red-600', icon: AlertTriangle };
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  // Generate recommendations based on real plant data and soil conditions
  const generateRecommendations = () => {
    const recommendations = [];

    // Basic care setup recommendations
    if (!plant.wateringSchedule) {
      recommendations.push("Set up a regular watering schedule based on your plant's specific needs.");
    }

    if (!plant.sunlightPreference) {
      recommendations.push("Research and document your plant's sunlight requirements for optimal growth.");
    }

    if (!plant.soilMoisturePreference) {
      recommendations.push("Determine and set the ideal soil moisture level for your plant species.");
    }

    // Soil-based recommendations
    if (soilData) {
      // pH recommendations
      if (soilData.ph < 6.0) {
        recommendations.push(`Soil pH is acidic (${soilData.ph.toFixed(1)}). Consider adding lime to raise pH for better nutrient absorption.`);
      } else if (soilData.ph > 7.5) {
        recommendations.push(`Soil pH is alkaline (${soilData.ph.toFixed(1)}). Consider adding sulfur or organic matter to lower pH.`);
      }

      // Moisture recommendations based on plant preference and current levels
      if (plant.wateringSchedule === 'daily' && soilData.moisture < 50) {
        recommendations.push(`Soil moisture is low (${soilData.moisture}%) for a daily-watered plant. Increase watering frequency or amount.`);
      } else if (plant.wateringSchedule === 'weekly' && soilData.moisture < 30) {
        recommendations.push(`Soil moisture is low (${soilData.moisture}%) for your watering schedule. Consider more frequent watering.`);
      } else if (soilData.moisture > 80) {
        recommendations.push(`Soil moisture is very high (${soilData.moisture}%). Reduce watering and check drainage to prevent root rot.`);
      }

      // Temperature recommendations
      if (soilData.temperature < 10) {
        recommendations.push(`Soil temperature is cold (${soilData.temperature}°C). Consider using mulch for insulation or moving potted plants to warmer areas.`);
      } else if (soilData.temperature > 30) {
        recommendations.push(`Soil temperature is high (${soilData.temperature}°C). Apply mulch and increase watering to cool the soil.`);
      }

      // Nutrient recommendations
      if (soilData.nitrogen < 30) {
        recommendations.push(`Nitrogen levels are low (${soilData.nitrogen}). Consider adding nitrogen-rich fertilizer or compost.`);
      }
      if (soilData.phosphorus < 25) {
        recommendations.push(`Phosphorus levels are low (${soilData.phosphorus}). Add bone meal or phosphorus fertilizer for root development.`);
      }
      if (soilData.potassium < 35) {
        recommendations.push(`Potassium levels are low (${soilData.potassium}). Add potassium fertilizer or wood ash for plant health.`);
      }
    } else {
      recommendations.push("Install soil sensors to get real-time monitoring of soil conditions for better plant care.");
    }

    // AI analysis recommendations
    if (aiResult && aiResult.toLowerCase().includes('disease')) {
      recommendations.push("AI detected potential disease signs. Consider consulting a plant specialist for treatment options.");
    }

    if (daysSinceAdded > 30 && !plant.notes) {
      recommendations.push("Add growth observations and notes to track your plant's progress over time.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Your plant appears to be well-maintained! Continue current care routine.");
      recommendations.push("Consider adding detailed growth notes for future reference.");
      recommendations.push("Monitor for seasonal care adjustments as needed.");
    }

    return recommendations;
  };

  const recommendations = generateRecommendations();

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white text-black print:p-6" id="plant-report">
      {/* Report Header */}
      <div className="text-center mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Plant Health Report</h1>
        <p className="text-lg text-gray-600">{plant.commonName}</p>
        <p className="text-sm text-gray-500 italic">{plant.scientificName}</p>
        <p className="text-xs text-gray-400 mt-2">Generated on {formatTimestamp(new Date())}</p>
      </div>

      {/* Plant Overview Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Leaf className="h-5 w-5 text-green-600" />
          Plant Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-center md:justify-start">
              {plant.imageUrl ? (
                <div className="w-48 h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={plant.imageUrl}
                    alt={plant.commonName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Leaf className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-gray-900">Common Name</h3>
              <p className="text-gray-600">{plant.commonName}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Scientific Name</h3>
              <p className="text-gray-600 italic">{plant.scientificName}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Plant Cycle</h3>
              <p className="text-gray-600">{plant.cycle || 'Unknown'}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Date Added</h3>
              <p className="text-gray-600">{formatDate(plant.dateAdded)}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Days in Garden</h3>
              <p className="text-gray-600">{daysSinceAdded} days</p>
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Health Assessment Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Health Assessment
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Overall Health Score</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl font-bold text-gray-900">{healthScore}%</div>
              <div className={`flex items-center gap-2 ${healthStatus.color}`}>
                <HealthIcon className="h-5 w-5" />
                <span className="font-medium">{healthStatus.status}</span>
              </div>
            </div>
            
            {/* Health Score Breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Care Setup:</span>
                <span className="font-medium">
                  {[plant.wateringSchedule, plant.sunlightPreference, plant.soilMoisturePreference, plant.notes].filter(Boolean).length}/4
                </span>
              </div>
              {soilData && (
                <>
                  <div className="flex justify-between">
                    <span>Soil pH:</span>
                    <span className={`font-medium ${soilData.ph >= 6.0 && soilData.ph <= 7.5 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {soilData.ph >= 6.0 && soilData.ph <= 7.5 ? 'Good' : 'Needs Adjustment'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Soil Moisture:</span>
                    <span className={`font-medium ${soilData.moisture >= 30 && soilData.moisture <= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {soilData.moisture >= 30 && soilData.moisture <= 70 ? 'Optimal' : 'Adjust Watering'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Soil Temperature:</span>
                    <span className={`font-medium ${soilData.temperature >= 15 && soilData.temperature <= 25 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {soilData.temperature >= 15 && soilData.temperature <= 25 ? 'Ideal' : 'Monitor'}
                    </span>
                  </div>
                </>
              )}
              {aiResult && (
                <div className="flex justify-between">
                  <span>AI Analysis:</span>
                  <span className={`font-medium ${aiResult.toLowerCase().includes('healthy') ? 'text-green-600' : aiResult.toLowerCase().includes('disease') ? 'text-red-600' : 'text-yellow-600'}`}>
                    {aiResult.toLowerCase().includes('healthy') ? 'Healthy' : aiResult.toLowerCase().includes('disease') ? 'Issues Detected' : 'Analyzed'}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {aiResult && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">AI Disease Detection</h3>
              <div className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                {aiResult.length > 200 ? `${aiResult.substring(0, 200)}...` : aiResult}
              </div>
              {aiResult.length > 200 && (
                <div className="mt-2 text-xs text-gray-500">
                  Full analysis available in the detailed view
                </div>
              )}
            </div>
          )}
          
          {!aiResult && soilData && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Soil Quality Summary</h3>
              <div className="space-y-2 text-sm">
                {soilData.ph >= 6.0 && soilData.ph <= 7.5 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>pH level is optimal for most plants</span>
                  </div>
                )}
                {soilData.moisture >= 40 && soilData.moisture <= 60 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Soil moisture is well-balanced</span>
                  </div>
                )}
                {soilData.nitrogen >= 40 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Good nitrogen levels for growth</span>
                  </div>
                )}
                {(soilData.ph < 6.0 || soilData.ph > 7.5) && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>pH adjustment recommended</span>
                  </div>
                )}
                {soilData.moisture < 30 && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Soil moisture is low</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Real Soil Analysis Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Thermometer className="h-5 w-5 text-orange-600" />
          Current Soil Analysis
        </h2>
        
        {soilDataLoading ? (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">Loading soil data...</p>
          </div>
        ) : soilData ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <h3 className="font-medium text-gray-900 mb-1">pH Level</h3>
              <div className="text-2xl font-bold text-blue-600">{soilData.ph.toFixed(1)}</div>
              <div className="text-xs text-gray-500">
                {soilData.ph < 6 ? 'Acidic' : soilData.ph > 7.5 ? 'Alkaline' : 'Optimal'}
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <h3 className="font-medium text-gray-900 mb-1">Moisture</h3>
              <div className="text-2xl font-bold text-green-600">{soilData.moisture}%</div>
              <div className="text-xs text-gray-500">
                {soilData.moisture < 30 ? 'Low' : soilData.moisture > 70 ? 'High' : 'Good'}
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <h3 className="font-medium text-gray-900 mb-1">Temperature</h3>
              <div className="text-2xl font-bold text-yellow-600">{soilData.temperature}°C</div>
              <div className="text-xs text-gray-500">
                {soilData.temperature < 15 ? 'Cold' : soilData.temperature > 25 ? 'Warm' : 'Ideal'}
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <h3 className="font-medium text-gray-900 mb-1">Nitrogen (N)</h3>
              <div className="text-2xl font-bold text-purple-600">{soilData.nitrogen}</div>
              <div className="text-xs text-gray-500">ppm</div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <h3 className="font-medium text-gray-900 mb-1">Phosphorus (P)</h3>
              <div className="text-2xl font-bold text-red-600">{soilData.phosphorus}</div>
              <div className="text-xs text-gray-500">ppm</div>
            </div>
            
            <div className="bg-teal-50 p-4 rounded-lg text-center">
              <h3 className="font-medium text-gray-900 mb-1">Potassium (K)</h3>
              <div className="text-2xl font-bold text-teal-600">{soilData.potassium}</div>
              <div className="text-xs text-gray-500">ppm</div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800">No soil sensor data available. Consider installing soil monitoring sensors for detailed soil analysis.</p>
          </div>
        )}
        
        {soilData && (
          <div className="mt-4 bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600">
              Last soil reading: {formatTimestamp(soilData.timestamp)}
            </p>
          </div>
        )}
      </div>

      <Separator className="my-8" />

      {/* Growing Conditions Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Sun className="h-5 w-5 text-yellow-600" />
          Growing Conditions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              Watering Schedule
            </h3>
            <p className="text-gray-600 capitalize">{plant.wateringSchedule || 'Not specified'}</p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Sun className="h-4 w-4 text-yellow-500" />
              Sunlight Preference
            </h3>
            <p className="text-gray-600">{formatSunlight(plant.sunlightPreference)}</p>
          </div>
          
          <div className="bg-teal-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Droplets className="h-4 w-4 text-teal-500" />
              Soil Moisture
            </h3>
            <p className="text-gray-600 capitalize">{plant.soilMoisturePreference || 'Not specified'}</p>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Care Recommendations Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Care Recommendations
        </h2>
        
        <div className="space-y-3">
          {recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
              <p className="text-gray-700 text-sm">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Performance Metrics Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-600" />
          Performance Metrics
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{daysSinceAdded}</div>
            <div className="text-xs text-gray-500">Days Growing</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{healthScore}%</div>
            <div className="text-xs text-gray-500">Health Score</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {[plant.wateringSchedule, plant.sunlightPreference, plant.soilMoisturePreference].filter(Boolean).length}/3
            </div>
            <div className="text-xs text-gray-500">Care Setup</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {soilData ? 'Active' : 'None'}
            </div>
            <div className="text-xs text-gray-500">Soil Monitoring</div>
          </div>
        </div>

        {/* Additional Performance Details */}
        {soilData && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">Soil Health Index</h4>
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-blue-700">
                  {Math.round(((soilData.nitrogen + soilData.phosphorus + soilData.potassium) / 3) * 1.33)}%
                </div>
                <div className="text-xs text-blue-600">Based on NPK levels</div>
              </div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-medium text-green-900 mb-1">Moisture Status</h4>
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-green-700">
                  {soilData.moisture < 30 ? 'Low' : soilData.moisture > 70 ? 'High' : 'Optimal'}
                </div>
                <div className="text-xs text-green-600">{soilData.moisture}% current</div>
              </div>
            </div>
            
            <div className="bg-orange-50 p-3 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-1">pH Balance</h4>
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-orange-700">
                  {soilData.ph >= 6.0 && soilData.ph <= 7.5 ? 'Good' : 'Adjust'}
                </div>
                <div className="text-xs text-orange-600">{soilData.ph.toFixed(1)} pH</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes Section */}
      {plant.notes && (
        <>
          <Separator className="my-8" />
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Notes & Observations
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-line">{plant.notes}</p>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="text-center pt-8 border-t text-xs text-gray-400">
        <p>This report was generated by Soil Savvy Suite - Your Smart Gardening Companion</p>
        <p>Report ID: {plant.id} | Generated: {formatDate(new Date())}</p>
      </div>
    </div>
  );
}