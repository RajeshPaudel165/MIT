import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Leaf, Loader2, AlertTriangle, Droplets, FileImage, UploadCloud, Camera } from 'lucide-react';
import { usePlants, Plant } from '@/hooks/usePlants';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// The Plant.id API key
const PLANT_ID_API_KEY = '2scIUR4L0WSZ1yx3y80INUoQ17znDr4KfCVrfyCQtKviOQC7Fd';

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

interface PlantIdentificationResult {
  id: string;
  name: string;
  commonNames: string[];
  scientificName: string;
  probability: number;
  family: string;
  genus: string;
}

export function PlantSoilRequirements() {
  // Plant database from your trained data
  const plantDatabase: Record<string, {
    type: string;
    npk: { n: number; p: number; k: number };
    moisture: number;
    temperature: number;
    nRange?: string;
    pRange?: string;
    kRange?: string;
    moistureRange?: string;
    tempRange?: string;
  }> = {
    // Fruits
    'apple': { type: 'Fruit', npk: { n: 1, p: 1, k: 1 }, moisture: 59.5, temperature: 18.0, nRange: '0-3', pRange: '0-2', kRange: '0-2', moistureRange: '55.70% - 63.30%', tempRange: '13.20°C - 22.80°C' },
    'orange': { type: 'Fruit', npk: { n: 3, p: 1, k: 2 }, moisture: 60.0, temperature: 22.0, nRange: '2-4', pRange: '0-2', kRange: '1-3', moistureRange: '56.64% - 63.36%', tempRange: '18.78°C - 25.22°C' },
    'lemon': { type: 'Fruit', npk: { n: 6, p: 6, k: 6 }, moisture: 57.5, temperature: 21.0, nRange: '5-7', pRange: '4-8', kRange: '5-7', moistureRange: '53.60% - 61.40%', tempRange: '16.29°C - 25.71°C' },
    'banana': { type: 'Fruit', npk: { n: 3, p: 1, k: 2 }, moisture: 80.0, temperature: 27.0, nRange: '2-4', pRange: '0-2', kRange: '1-3', moistureRange: '75.83% - 84.17%', tempRange: '23.95°C - 29.05°C' },
    'mango': { type: 'Fruit', npk: { n: 10, p: 10, k: 10 }, moisture: 60.0, temperature: 27.0, nRange: '8-12', pRange: '8-12', kRange: '9-11', moistureRange: '55.67% - 64.33%', tempRange: '23.75°C - 30.25°C' },
    'strawberry': { type: 'Fruit', npk: { n: 2, p: 3, k: 6 }, moisture: 64.5, temperature: 20.0, nRange: '0-4', pRange: '1-5', kRange: '4-8', moistureRange: '60.81% - 68.19%', tempRange: '15.87°C - 24.13°C' },
    'cherry': { type: 'Fruit', npk: { n: 10, p: 10, k: 10 }, moisture: 50.0, temperature: 22.0, nRange: '9-11', pRange: '9-11', kRange: '8-12', moistureRange: '45.47% - 54.53%', tempRange: '17.51°C - 26.49°C' },
    'peach': { type: 'Fruit', npk: { n: 1, p: 1, k: 1 }, moisture: 60.0, temperature: 22.0, nRange: '0-2', pRange: '0-2', kRange: '0-2', moistureRange: '56.55% - 63.45%', tempRange: '18.25°C - 25.75°C' },
    'avocado': { type: 'Fruit', npk: { n: 2, p: 1, k: 2 }, moisture: 65.0, temperature: 22.0, nRange: '0-4', pRange: '0-2', kRange: '0-4', moistureRange: '60.36% - 69.64%', tempRange: '17.15°C - 26.85°C' },
    'grape': { type: 'Fruit', npk: { n: 1, p: 2, k: 3 }, moisture: 52.5, temperature: 18.0, nRange: '0-2', pRange: '1-3', kRange: '2-4', moistureRange: '49.00% - 56.00%', tempRange: '13.90°C - 22.10°C' },
    // ...existing database...
  };

  // Plant type defaults based on your training data
  const plantTypeDefaults: Record<string, {
    nRange: [number, number];
    pRange: [number, number];
    kRange: [number, number];
    moistureBase: number;
    tempRange: [number, number];
  }> = {
    'Vegetable': { nRange: [5, 15], pRange: [2, 8], kRange: [3, 10], moistureBase: 70, tempRange: [15, 28] },
    'Fruit': { nRange: [3, 8], pRange: [2, 6], kRange: [3, 8], moistureBase: 60, tempRange: [18, 26] },
    'Herb': { nRange: [3, 12], pRange: [2, 8], kRange: [2, 6], moistureBase: 55, tempRange: [16, 25] },
    'Flower': { nRange: [1, 3], pRange: [1, 3], kRange: [1, 4], moistureBase: 55, tempRange: [17, 26] },
    'Grain': { nRange: [10, 10], pRange: [10, 10], kRange: [10, 10], moistureBase: 60, tempRange: [10, 10] }
  };
  const { plants, loading: plantsLoading } = usePlants();
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [soilRequirements, setSoilRequirements] = useState<SoilRequirements | null>(null);
  const [identificationResults, setIdentificationResults] = useState<PlantIdentificationResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const { toast } = useToast();

  // Refs for file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Function to handle plant selection
  const handlePlantSelect = (value: string) => {
    const plant = plants.find(p => p.id === value);
    if (plant) {
      setSelectedPlant(plant);
      fetchPlantSoilRequirements(plant);
    }
  };

  // Function to handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        
        // Create an image preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        
        // Reset previous results
        setIdentificationResults([]);
        setSoilRequirements(null);
        setError(null);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (jpg, png, etc.)",
          variant: "destructive"
        });
      }
    }
  };

  // Handle camera capture
  const handleCameraCapture = async () => {
    try {
      // Request camera access (works on desktop/Mac)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Try rear camera first, fallback to any available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      // Create video element to display camera feed
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      
      // Create modal to show camera interface
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `;
      
      video.style.cssText = `
        max-width: 90%;
        max-height: 70%;
        border-radius: 10px;
      `;
      
      const buttonsDiv = document.createElement('div');
      buttonsDiv.style.cssText = `
        margin-top: 20px;
        display: flex;
        gap: 10px;
      `;
      
      const captureBtn = document.createElement('button');
      captureBtn.textContent = 'Capture Photo';
      captureBtn.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
      `;
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        background: #f44336;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
      `;
      
      // Handle capture
      captureBtn.onclick = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            
            // Handle the captured image (same as handleFileChange logic)
            if (file.type.startsWith('image/')) {
              setSelectedFile(file);
              
              // Create an image preview
              const reader = new FileReader();
              reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
              };
              reader.readAsDataURL(file);
              
              // Reset previous results
              setIdentificationResults([]);
              setSoilRequirements(null);
              setError(null);
              
              toast({
                title: "Photo captured",
                description: "Camera photo has been captured successfully.",
              });
            }
          }
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          document.body.removeChild(modal);
        }, 'image/jpeg', 0.8);
      };
      
      // Handle cancel
      cancelBtn.onclick = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
      };
      
      buttonsDiv.appendChild(captureBtn);
      buttonsDiv.appendChild(cancelBtn);
      modal.appendChild(video);
      modal.appendChild(buttonsDiv);
      document.body.appendChild(modal);
      
    } catch (error) {
      console.error('Camera access failed:', error);
      toast({
        title: "Camera Access Failed",
        description: "Could not access camera. Please check permissions or use the upload option.",
        variant: "destructive"
      });
      
      // Fallback to file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  // Function to identify plant from image using Plant.id API
  const identifyPlant = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      // Convert image file to base64
      const base64Image = await fileToBase64(selectedFile);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      // Plant.id API endpoint
      const apiUrl = 'https://api.plant.id/v2/identify';
      
      // Request body
      const requestData = {
        images: [base64Image.split(',')[1]],
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
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        // Process identification results
        const results = data.suggestions.map((suggestion: {
          id: string;
          plant_name: string;
          plant_details?: {
            common_names?: string[];
            scientific_name?: string;
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
          genus: suggestion.plant_details?.taxonomy?.genus || 'Unknown'
        }));
        
        setIdentificationResults(results);
        
        // Get soil requirements for the top result
        if (results.length > 0) {
          generateSoilRequirements(results[0]);
        }
      } else {
        setError("No plants identified in the image. Try a clearer picture.");
      }
    } catch (err) {
      console.error('Error identifying plant:', err);
      setError("Failed to identify plant. Please try again.");
      toast({
        title: "Error",
        description: "Failed to identify plant. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    }
  };

  // Function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Function to fetch soil requirements for a plant
  const fetchPlantSoilRequirements = (plant: Plant) => {
    setLoading(true);
    setError(null);
    
    // In a real app, you would fetch this data from an API
    // For now, we'll generate mock data based on the plant's properties
    setTimeout(() => {
      try {
        generateSoilRequirementsFromPlantData(plant);
        setLoading(false);
      } catch (err) {
        console.error('Error generating soil requirements:', err);
        setError("Failed to get soil requirements. Please try again.");
        setLoading(false);
      }
    }, 1000);
  };

  // Generate soil requirements data from plant's properties
  const generateSoilRequirementsFromPlantData = (plant: Plant) => {
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
    
    const requirements: SoilRequirements = {
      ph: {
        min: 5.5,
        max: 7.5,
        optimal: 6.5
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
  };

  // Generate more realistic soil requirements from Plant.id results
  const generateSoilRequirements = (plantInfo: PlantIdentificationResult) => {
    // Try to find exact match in database first
    const plantName = plantInfo.name.toLowerCase();
    const commonName = plantInfo.commonNames[0]?.toLowerCase() || '';
    let plantData = plantDatabase[plantName] || plantDatabase[commonName];

    // If no exact match, try partial matching
    if (!plantData) {
      for (const [key, data] of Object.entries(plantDatabase)) {
        if (plantName.includes(key) || key.includes(plantName) || 
            commonName.includes(key) || key.includes(commonName)) {
          plantData = data;
          break;
        }
      }
    }

    let requirements: SoilRequirements;
    if (plantData) {
      // Use specific plant data
      requirements = {
        ph: {
          min: plantData.type === 'Fruit' && ['blueberry', 'cranberry'].some(name => 
            plantName.includes(name) || commonName.includes(name)) ? 4.5 : 6.0,
          max: plantData.type === 'Herb' && ['lavender', 'rosemary'].some(name => 
            plantName.includes(name) || commonName.includes(name)) ? 8.0 : 7.5,
          optimal: plantData.type === 'Fruit' && ['blueberry', 'cranberry'].some(name => 
            plantName.includes(name) || commonName.includes(name)) ? 5.5 : 6.5
        },
        nitrogen: {
          level: getNutrientLevel(plantData.npk.n * 5), // Scale for display
          value: plantData.npk.n * 5
        },
        phosphorus: {
          level: getNutrientLevel(plantData.npk.p * 5),
          value: plantData.npk.p * 5
        },
        potassium: {
          level: getNutrientLevel(plantData.npk.k * 5),
          value: plantData.npk.k * 5
        },
        moisture: {
          level: getMoistureLevel(plantData.moisture),
          value: plantData.moisture
        },
        temperature: {
          min: Math.max(plantData.temperature - 5, 10),
          max: plantData.temperature + 5,
          optimal: plantData.temperature
        }
      };
    } else {
      // Use plant type defaults based on family/genus classification
      let plantType = 'Herb'; // default
      const family = plantInfo.family.toLowerCase();
      const genus = plantInfo.genus.toLowerCase();
      // Classify plant type based on taxonomic information
      if (family.includes('rosaceae') && (genus.includes('malus') || genus.includes('prunus'))) {
        plantType = 'Fruit';
      } else if (family.includes('solanaceae') || family.includes('brassicaceae') || 
                 family.includes('cucurbitaceae') || family.includes('apiaceae')) {
        plantType = 'Vegetable';
      } else if (family.includes('asteraceae') || family.includes('lamiaceae')) {
        plantType = 'Herb';
      } else if (family.includes('amaryllidaceae') || genus.includes('allium')) {
        plantType = 'Vegetable';
      } else if (plantInfo.name.toLowerCase().includes('flower') || 
                 family.includes('asteraceae') && genus.includes('helianthus')) {
        plantType = 'Flower';
      }
      const defaults = plantTypeDefaults[plantType];
      requirements = {
        ph: {
          min: family.includes('ericaceae') ? 4.5 : 6.0,
          max: plantType === 'Herb' ? 7.8 : 7.5,
          optimal: family.includes('ericaceae') ? 5.5 : 6.5
        },
        nitrogen: {
          level: getNutrientLevel((defaults.nRange[0] + defaults.nRange[1]) / 2 * 5),
          value: (defaults.nRange[0] + defaults.nRange[1]) / 2 * 5
        },
        phosphorus: {
          level: getNutrientLevel((defaults.pRange[0] + defaults.pRange[1]) / 2 * 5),
          value: (defaults.pRange[0] + defaults.pRange[1]) / 2 * 5
        },
        potassium: {
          level: getNutrientLevel((defaults.kRange[0] + defaults.kRange[1]) / 2 * 5),
          value: (defaults.kRange[0] + defaults.kRange[1]) / 2 * 5
        },
        moisture: {
          level: getMoistureLevel(defaults.moistureBase),
          value: defaults.moistureBase
        },
        temperature: {
          min: defaults.tempRange[0],
          max: defaults.tempRange[1],
          optimal: (defaults.tempRange[0] + defaults.tempRange[1]) / 2
        }
      };
    }
    setSoilRequirements(requirements);
  };

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

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-lg">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary" />
          Plant Soil Requirements
        </h2>
        <p className="text-muted-foreground mt-1">
          View optimal soil conditions for your plants or identify new plants to get their requirements
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Plant selection section */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" />
              Select from Your Garden
            </CardTitle>
            <CardDescription>
              Choose a plant from your garden to view its soil requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {plantsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : plants.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <Leaf className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-medium">No plants in your garden</h3>
                  <p className="text-sm text-muted-foreground">
                    Add plants to your garden to view their soil requirements
                  </p>
                </div>
              </div>
            ) : (
              <Select onValueChange={handlePlantSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plant" />
                </SelectTrigger>
                <SelectContent>
                  {plants.map((plant) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.commonName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
        
        {/* Plant identification section */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5 text-primary" />
              Identify a Plant
            </CardTitle>
            <CardDescription>
              Upload a photo to identify a plant and get its soil requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <label htmlFor="plant-image-upload" className="cursor-pointer">
                  <div className={cn(
                    "border-2 border-dashed rounded-lg p-4 w-full transition-all",
                    "hover:border-primary/50 hover:bg-primary/5",
                    "flex flex-col items-center justify-center gap-2",
                    imagePreview ? "h-[200px]" : "h-[150px]"
                  )}>
                    {imagePreview ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={imagePreview} 
                          alt="Plant preview" 
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-white text-sm font-medium">Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload a plant image
                        </p>
                      </>
                    )}
                  </div>
                  {/* File input for regular upload */}
                  <input 
                    id="plant-image-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  
                  {/* File input for camera capture */}
                  <input 
                    id="plant-camera-capture" 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    className="hidden"
                    ref={cameraInputRef}
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              
              {uploadProgress > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              
              {/* Upload and Camera buttons */}
              <div className="flex gap-2 mb-4">
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center gap-2"
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload Image
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCameraCapture}
                  className="flex-1 flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
              </div>
              
              <Button 
                onClick={identifyPlant} 
                disabled={!selectedFile || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Leaf className="h-4 w-4 mr-2" />
                    Identify Plant
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Error display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-700">Error</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Identification results */}
      {identificationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Identification Results</CardTitle>
            <CardDescription>
              Plant identified with {Math.round(identificationResults[0].probability * 100)}% confidence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-medium">{identificationResults[0].commonNames[0] || identificationResults[0].name}</h3>
                  <p className="text-sm text-muted-foreground italic">{identificationResults[0].scientificName}</p>
                </div>
                <Badge className="self-start sm:self-auto bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1">
                  {identificationResults[0].family}
                </Badge>
              </div>
              
              {identificationResults[0].commonNames.length > 1 && (
                <div>
                  <h4 className="text-sm font-medium">Common Names</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {identificationResults[0].commonNames.map((name, index) => (
                      <Badge key={index} variant="outline" className="bg-secondary/10">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Soil requirements display */}
      {soilRequirements && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              Soil Requirements
            </CardTitle>
            <CardDescription>
              {selectedPlant ? `Optimal soil conditions for ${selectedPlant.commonName}` : 
               identificationResults.length > 0 ? `Estimated requirements for ${identificationResults[0].commonNames[0] || identificationResults[0].name}` : 
               'Optimal soil conditions'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* pH Level */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="h-6 px-2 font-semibold">pH</Badge>
                  Soil pH Level
                </h3>
                <div className="h-8 w-full bg-muted rounded-full relative">
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
              
              {/* Temperature */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="h-6 px-2 font-semibold">°C</Badge>
                  Soil Temperature
                </h3>
                <div className="h-8 w-full bg-muted rounded-full relative">
                  <div className="absolute inset-y-0 bg-gradient-to-r from-blue-100 via-green-100 to-red-100 rounded-full"></div>
                  <div className="absolute inset-y-0 bg-green-100/40 rounded-full"
                       style={{ 
                         left: `${(soilRequirements.temperature.min) * 2.5}%`, 
                         right: `${100 - (soilRequirements.temperature.max * 2.5)}%` 
                       }}></div>
                  <div className="absolute top-full mt-1 w-full flex justify-between text-xs text-muted-foreground">
                    <span>0°C</span>
                    <span>20°C</span>
                    <span>40°C</span>
                  </div>
                  <div className="absolute inset-y-0 w-2 bg-primary rounded-full"
                       style={{ left: `calc(${soilRequirements.temperature.optimal * 2.5}% - 4px)` }}></div>
                </div>
                <p className="text-xs text-muted-foreground pt-3">
                  Optimal temperature: <span className="font-medium">{soilRequirements.temperature.optimal}°C</span> 
                  (Range: {soilRequirements.temperature.min}°C - {soilRequirements.temperature.max}°C)
                </p>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {/* Nitrogen */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="h-6 px-2 font-semibold">N</Badge>
                  Nitrogen
                </h3>
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
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="h-6 px-2 font-semibold">P</Badge>
                  Phosphorus
                </h3>
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
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="h-6 px-2 font-semibold">K</Badge>
                  Potassium
                </h3>
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
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="h-6 px-2 font-semibold">H₂O</Badge>
                  Moisture
                </h3>
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
            
            <Separator className="my-6" />
            
            <div className="rounded-lg bg-primary/5 p-4">
              <h3 className="font-medium mb-2">Recommendations</h3>
              <ul className="space-y-2 text-sm">
                {soilRequirements.ph.optimal < 6.0 && (
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-blue-100 p-1 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700">
                        <path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path>
                      </svg>
                    </div>
                    <span>Use acidic soil amendments like peat moss or elemental sulfur</span>
                  </li>
                )}
                {soilRequirements.ph.optimal > 7.0 && (
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-purple-100 p-1 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
                        <path d="M19 12H5"></path><path d="M5 12h14"></path>
                      </svg>
                    </div>
                    <span>Add lime or wood ash to increase soil pH</span>
                  </li>
                )}
                {soilRequirements.nitrogen.level === 'High' && (
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-blue-100 p-1 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700">
                        <path d="M12 5v14"></path><path d="M19 12H5"></path>
                      </svg>
                    </div>
                    <span>Use high-nitrogen fertilizers like blood meal or composted manure</span>
                  </li>
                )}
                {soilRequirements.phosphorus.level === 'High' && (
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-orange-100 p-1 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-700">
                        <path d="M12 5v14"></path><path d="M19 12H5"></path>
                      </svg>
                    </div>
                    <span>Add bone meal or rock phosphate for higher phosphorus levels</span>
                  </li>
                )}
                {soilRequirements.potassium.level === 'High' && (
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-purple-100 p-1 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
                        <path d="M12 5v14"></path><path d="M19 12H5"></path>
                      </svg>
                    </div>
                    <span>Use wood ash or a potassium-rich fertilizer for higher potassium</span>
                  </li>
                )}
                {soilRequirements.moisture.level === 'High' && (
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-cyan-100 p-1 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-700">
                        <path d="M12 19V5"></path><path d="M5 12h14"></path>
                      </svg>
                    </div>
                    <span>Keep soil consistently moist and add organic mulch</span>
                  </li>
                )}
                {soilRequirements.moisture.level === 'Low' && (
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-amber-100 p-1 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700">
                        <path d="m19 12-7 7-7-7"></path><path d="M12 5v14"></path>
                      </svg>
                    </div>
                    <span>Allow soil to dry between waterings and consider adding sand for better drainage</span>
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs text-muted-foreground">
            <p>
              <span className="font-medium">Note:</span> These are estimated requirements based on plant taxonomy. 
              Individual plant needs may vary based on variety, growing conditions, and other factors.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
