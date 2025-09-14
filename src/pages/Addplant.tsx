import React, { useState, useRef, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Leaf, Plus, Loader2, ExternalLink, Info, TrendingUp, Upload, Camera, Image, XCircle, Sparkles, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlants } from '@/hooks/usePlants';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { isBase64Image, imageToBase64 } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { inferPlantCycle, inferWateringNeeds, inferSunlightNeeds, getWateringSchedule } from '@/lib/plantFunctions';
import { plantIdentificationService } from '@/lib/plantIdentificationService';

// Define interfaces for plant data
interface PlantData {
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
  dataSource: 'iNaturalist' | 'Mock' | 'Custom' | 'Perenual' | 'Gemini' | 'Claude-Vision';
  originalImageUrl?: string; // For storing the original image URL when a custom image is uploaded
  careInstructions?: string; // Additional care instructions from Gemini
  nativeRegion?: string; // Native region information from Gemini
  plantingTips?: string; // Planting tips from Gemini
  confidence?: number; // Confidence score from AI identification (0-1)
  characteristics?: Record<string, string | number | boolean | string[]>; // Additional plant characteristics
}

// Custom Plant Form interface
interface CustomPlantForm {
  commonName: string;
  scientificName: string;
  cycle: string;
  watering: string;
  notes: string;
}

// Interface for plant identification results
interface PlantIdentificationResult {
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

// Interface for Gemini plant response
interface GeminiPlantData {
  id: string;
  commonName: string;
  scientificName: string;
  familyName: string;
  genus: string;
  description: string;
  cycle: string;
  watering: string;
  sunlight: string[];
  careInstructions: string;
  nativeRegion?: string;
  plantingTips?: string;
}

export default function Addplant() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PlantData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPlant, setSelectedPlant] = useState<PlantData | null>(null);
  const [addingPlant, setAddingPlant] = useState<boolean>(false);
  const [trendingPlants, setTrendingPlants] = useState<PlantData[]>([]);
  const [loadingTrending, setLoadingTrending] = useState<boolean>(false);
  const [customImage, setCustomImage] = useState<File | null>(null);
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null);
  const [showCustomPlantModal, setShowCustomPlantModal] = useState<boolean>(false);
  const [customPlantForm, setCustomPlantForm] = useState<CustomPlantForm>({
    commonName: '',
    scientificName: '',
    cycle: 'Perennial',
    watering: 'Average',
    notes: ''
  });
  const [identifyingPlant, setIdentifyingPlant] = useState<boolean>(false);
  const [identificationResults, setIdentificationResults] = useState<PlantIdentificationResult[]>([]);
  const [identificationError, setIdentificationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Function to handle camera capture
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
            
            // Handle the captured image
            setCustomImage(file);
            
            // Create image preview
            const reader = new FileReader();
            reader.onload = (e) => {
              setCustomImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
            
            toast({
              title: "Photo captured",
              description: "Camera photo has been captured successfully.",
            });
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
  const { user } = useAuth();
  const { addPlant } = usePlants();
  const navigate = useNavigate();

  // Fetch trending plants on component mount
  useEffect(() => {
    fetchTrendingPlants();
    // We intentionally only want to run this once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to fetch trending plants from iNaturalist
  const fetchTrendingPlants = async () => {
    setLoadingTrending(true);
    try {
      // Use iNaturalist API to get plants with high observation counts
      // We're searching for common garden plants and sorting by observation count
      const queries = ['garden', 'popular', 'common', 'flower', 'vegetable'];
      const randomQuery = queries[Math.floor(Math.random() * queries.length)];
      
      const apiUrl = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(randomQuery)}&is_active=true&taxon_rank=species&iconic_taxa=Plantae&order_by=observations_count&order=desc&limit=8`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trending plants: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error("Invalid response format from iNaturalist");
      }
      
      // Process results into PlantData format
      const plantResults = data.results
        .filter(result => result.iconic_taxon_name === 'Plantae')
        .map(result => {
          // Try to get default photo if available
          let imageUrl = '';
          let thumbnailUrl = '';
          if (result.default_photo) {
            imageUrl = result.default_photo.medium_url || result.default_photo.url;
            thumbnailUrl = result.default_photo.square_url || imageUrl;
          } else {
            // Fallback to Unsplash for image
            imageUrl = `https://source.unsplash.com/featured/?${result.name},plant,nature`;
            thumbnailUrl = imageUrl;
          }
          
          // Extract genus from scientific name
          const nameParts = result.name.split(' ');
          const genus = nameParts.length > 0 ? nameParts[0] : 'Unknown';
          
          // Get family name if available
          let familyName = 'Unknown';
          if (result.ancestors && Array.isArray(result.ancestors)) {
            const familyAncestor = result.ancestors.find(a => a.rank === 'family');
            if (familyAncestor) {
              familyName = familyAncestor.name;
            }
          }
          
          // Infer plant characteristics based on taxonomy
          const cycle = inferPlantCycle(genus, familyName);
          const watering = inferWateringNeeds(genus, result.name);
          const sunlight = inferSunlightNeeds(genus, result.name);
          
          return {
            id: result.id,
            scientificName: result.name,
            commonName: result.preferred_common_name || result.matched_term || result.name,
            familyName: familyName,
            genus: genus,
            imageUrl: imageUrl,
            thumbnailUrl: thumbnailUrl,
            description: result.wikipedia_summary || '',
            observationCount: result.observations_count || 0,
            wikipediaUrl: result.wikipedia_url,
            cycle,
            watering,
            sunlight,
            dataSource: 'iNaturalist' as const
          };
        });
      
      setTrendingPlants(plantResults);
    } catch (error) {
      console.error("Error fetching trending plants:", error);
      // Fallback to mock data if API fails
      setTrendingPlants(getMockPlantData("trending").slice(0, 4));
    } finally {
      setLoadingTrending(false);
    }
  };

  // Function to search plants using iNaturalist API
  const searchPlants = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setSearchResults([]);
    
    try {
      // iNaturalist API endpoint
      const apiUrl = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(searchQuery)}&is_active=true&taxon_rank=species&iconic_taxa=Plantae&limit=20`;
      
      console.log("Fetching from iNaturalist:", apiUrl);
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from iNaturalist: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error("Invalid response format from iNaturalist");
      }
      
      // Process iNaturalist results
      const plantResults: PlantData[] = [];
      
      for (const result of data.results) {
        if (!result.iconic_taxon_name || result.iconic_taxon_name !== 'Plantae') continue;
        
        // Try to get default photo if available
        let imageUrl = '';
        let thumbnailUrl = '';
        if (result.default_photo) {
          imageUrl = result.default_photo.medium_url || result.default_photo.url;
          thumbnailUrl = result.default_photo.square_url || imageUrl;
        } else {
          // Fallback to Unsplash for image
          imageUrl = `https://source.unsplash.com/featured/?${result.name},plant,nature`;
          thumbnailUrl = imageUrl;
        }
        
        // Extract genus from scientific name
        const nameParts = result.name.split(' ');
        const genus = nameParts.length > 0 ? nameParts[0] : 'Unknown';
        
        // Get family name if available
        let familyName = 'Unknown';
        if (result.ancestors && Array.isArray(result.ancestors)) {
          const familyAncestor = result.ancestors.find(a => a.rank === 'family');
          if (familyAncestor) {
            familyName = familyAncestor.name;
          }
        }
        
        // Infer plant characteristics based on taxonomy
        const cycle = inferPlantCycle(genus, familyName);
        const watering = inferWateringNeeds(genus, result.name);
        const sunlight = inferSunlightNeeds(genus, result.name);
        
        plantResults.push({
          id: result.id,
          scientificName: result.name,
          commonName: result.preferred_common_name || result.matched_term || result.name,
          familyName: familyName,
          genus: genus,
          imageUrl: imageUrl,
          thumbnailUrl: thumbnailUrl,
          description: result.wikipedia_summary || '',
          observationCount: result.observations_count || 0,
          wikipediaUrl: result.wikipedia_url,
          cycle,
          watering,
          sunlight,
          dataSource: 'iNaturalist'
        });
      }
      
      // Sort results by relevance
      const sortedResults = sortByRelevance(plantResults, searchQuery);
      setSearchResults(sortedResults);
      
      if (sortedResults.length === 0) {
        toast({
          title: "No plants found",
          description: "Try a different search term or check the spelling",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error searching iNaturalist:", error);
      toast({
        title: "Error",
        description: "Failed to search plants. Please try again.",
        variant: "destructive"
      });
      
      // For demo/fallback purposes - provide some basic results
      const mockResults = getMockPlantData(searchQuery);
      setSearchResults(mockResults);
    } finally {
      setLoading(false);
    }
  };
  
  // Sort results by relevance
  const sortByRelevance = (results: PlantData[], query: string): PlantData[] => {
    const normalizedQuery = query.toLowerCase();
    
    return results.sort((a, b) => {
      // Exact scientific name match gets highest priority
      if (a.scientificName.toLowerCase() === normalizedQuery && b.scientificName.toLowerCase() !== normalizedQuery) {
        return -1;
      }
      if (b.scientificName.toLowerCase() === normalizedQuery && a.scientificName.toLowerCase() !== normalizedQuery) {
        return 1;
      }
      
      // Exact common name match gets second highest priority
      if (a.commonName.toLowerCase() === normalizedQuery && b.commonName.toLowerCase() !== normalizedQuery) {
        return -1;
      }
      if (b.commonName.toLowerCase() === normalizedQuery && a.commonName.toLowerCase() !== normalizedQuery) {
        return 1;
      }
      
      // Contains scientific name gets third priority
      const aContainsScientific = a.scientificName.toLowerCase().includes(normalizedQuery);
      const bContainsScientific = b.scientificName.toLowerCase().includes(normalizedQuery);
      if (aContainsScientific && !bContainsScientific) return -1;
      if (bContainsScientific && !aContainsScientific) return 1;
      
      // Contains common name gets fourth priority
      const aContainsCommon = a.commonName.toLowerCase().includes(normalizedQuery);
      const bContainsCommon = b.commonName.toLowerCase().includes(normalizedQuery);
      if (aContainsCommon && !bContainsCommon) return -1;
      if (bContainsCommon && !aContainsCommon) return 1;
      
      // Sort by observation count (higher first) if matches are equal
      return (b.observationCount || 0) - (a.observationCount || 0);
    });
  };
  
  // Provide mock data for demo purposes when API fails
  const getMockPlantData = (query: string): PlantData[] => {
    const normalizedQuery = query.toLowerCase();
    const mockPlants: PlantData[] = [
      {
        id: 1,
        scientificName: "Rosa gallica",
        commonName: "French Rose",
        familyName: "Rosaceae",
        genus: "Rosa",
        imageUrl: "https://source.unsplash.com/featured/?rose,flower",
        thumbnailUrl: "https://source.unsplash.com/featured/?rose,flower",
        cycle: "Perennial",
        watering: "Average",
        sunlight: ["full_sun"],
        dataSource: 'Mock',
        observationCount: 12453
      },
      {
        id: 2,
        scientificName: "Solanum lycopersicum",
        commonName: "Tomato",
        familyName: "Solanaceae",
        genus: "Solanum",
        imageUrl: "https://source.unsplash.com/featured/?tomato,plant",
        thumbnailUrl: "https://source.unsplash.com/featured/?tomato,plant",
        cycle: "Annual",
        watering: "Average",
        sunlight: ["full_sun"],
        dataSource: 'Mock',
        observationCount: 8765
      },
      {
        id: 3,
        scientificName: "Helianthus annuus",
        commonName: "Sunflower",
        familyName: "Asteraceae",
        genus: "Helianthus",
        imageUrl: "https://source.unsplash.com/featured/?sunflower",
        thumbnailUrl: "https://source.unsplash.com/featured/?sunflower",
        cycle: "Annual",
        watering: "Average",
        sunlight: ["full_sun"],
        dataSource: 'Mock',
        observationCount: 9876
      },
      {
        id: 4,
        scientificName: "Ocimum basilicum",
        commonName: "Basil",
        familyName: "Lamiaceae",
        genus: "Ocimum",
        imageUrl: "https://source.unsplash.com/featured/?basil,herb",
        thumbnailUrl: "https://source.unsplash.com/featured/?basil,herb",
        cycle: "Annual",
        watering: "Average",
        sunlight: ["full_sun", "part_sun"],
        dataSource: 'Mock',
        observationCount: 6543
      },
      {
        id: 5,
        scientificName: "Lavandula angustifolia",
        commonName: "Lavender",
        familyName: "Lamiaceae",
        genus: "Lavandula",
        imageUrl: "https://source.unsplash.com/featured/?lavender",
        thumbnailUrl: "https://source.unsplash.com/featured/?lavender",
        cycle: "Perennial",
        watering: "Minimum",
        sunlight: ["full_sun"],
        dataSource: 'Mock',
        observationCount: 10234
      },
      {
        id: 6,
        scientificName: "Mentha spicata",
        commonName: "Spearmint",
        familyName: "Lamiaceae",
        genus: "Mentha",
        imageUrl: "https://source.unsplash.com/featured/?mint,herb",
        thumbnailUrl: "https://source.unsplash.com/featured/?mint,herb",
        cycle: "Perennial",
        watering: "Frequent",
        sunlight: ["part_sun", "part_shade"],
        dataSource: 'Mock',
        observationCount: 7654
      },
      {
        id: 7,
        scientificName: "Aloe vera",
        commonName: "Aloe Vera",
        familyName: "Asphodelaceae",
        genus: "Aloe",
        imageUrl: "https://source.unsplash.com/featured/?aloe,succulent",
        thumbnailUrl: "https://source.unsplash.com/featured/?aloe,succulent",
        cycle: "Perennial",
        watering: "Minimum",
        sunlight: ["full_sun", "part_sun"],
        dataSource: 'Mock',
        observationCount: 12789
      },
      {
        id: 8,
        scientificName: "Ficus lyrata",
        commonName: "Fiddle Leaf Fig",
        familyName: "Moraceae",
        genus: "Ficus",
        imageUrl: "https://source.unsplash.com/featured/?fiddle,fig",
        thumbnailUrl: "https://source.unsplash.com/featured/?fiddle,fig",
        cycle: "Perennial",
        watering: "Average",
        sunlight: ["part_sun", "part_shade"],
        dataSource: 'Mock',
        observationCount: 5432
      }
    ];
    
    // If we're looking for trending, return all mock plants
    if (normalizedQuery === "trending") {
      return mockPlants;
    }
    
    // Otherwise, filter the mock plants based on the search query
    return mockPlants.filter(plant => 
      plant.scientificName.toLowerCase().includes(normalizedQuery) || 
      plant.commonName.toLowerCase().includes(normalizedQuery) ||
      plant.genus.toLowerCase().includes(normalizedQuery) ||
      plant.familyName.toLowerCase().includes(normalizedQuery)
    );
  };
  
  // Handle file selection for custom image upload
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (jpg, png, etc.)",
          variant: "destructive"
        });
        return;
      }
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      
      setCustomImage(file);
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCustomImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // If we're in the plant modal, update the selected plant with this image
      if (selectedPlant) {
        const updatedPlant = { 
          ...selectedPlant, 
          originalImageUrl: selectedPlant.imageUrl, // Store original for restoration if needed
          imageUrl: URL.createObjectURL(file)
        };
        setSelectedPlant(updatedPlant);
      }
      
      toast({
        title: "Image uploaded",
        description: "Custom image has been added and will be used for this plant.",
      });
    }
  };

  // Upload image to Firebase Storage
  const uploadImageToStorage = async (file: File): Promise<string> => {
    if (!user) {
      throw new Error("User must be logged in to upload images");
    }
    
    try {
      console.log("Converting image to base64 for Firestore storage");
      
      // Check file size before converting to base64
      if (file.size > 1024 * 1024) { // 1MB
        console.log("Large image detected:", Math.round(file.size / 1024), "KB - applying compression");
      }
      
      // Convert to base64 with automatic compression for large images
      // This will keep the image under Firestore's 1MB limit
      const base64Image = await imageToBase64(file, 900); // 900KB max size (allows room for other fields)
      return base64Image;
    } catch (error) {
      console.error("Error converting image to base64:", error);
      throw new Error("Could not process image. Please try again.");
    }
  };

  // Function to identify plant using Claude Vision API
  const identifyPlantWithClaude = async () => {
    if (!customImage) {
      toast({
        title: "No image selected",
        description: "Please upload an image first.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate image file
    const validation = plantIdentificationService.validateImageFile(customImage);
    if (!validation.valid) {
      toast({
        title: "Invalid image",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }
    
    setIdentifyingPlant(true);
    setIdentificationError(null);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 15;
        });
      }, 300);
      
      // Use Claude Vision for plant identification
      const plantData = await plantIdentificationService.identifyPlantFromImage(customImage, customImagePreview || undefined);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Convert to the format expected by the UI
      const claudeResult = {
        id: String(plantData.id),
        name: plantData.commonName,
        commonNames: [plantData.commonName],
        scientificName: plantData.scientificName,
        family: plantData.familyName,
        genus: plantData.genus,
        probability: plantData.confidence || 0.8,
        description: plantData.description,
        cycle: plantData.cycle,
        watering: plantData.watering,
        sunlight: plantData.sunlight,
        careInstructions: plantData.careInstructions,
        nativeRegion: plantData.nativeRegion,
        plantingTips: plantData.plantingTips,
        characteristics: plantData.characteristics
      };
      
      setIdentificationResults([claudeResult]);
      
      // Create plant data for selection
      const selectedPlantData: PlantData = {
        ...plantData,
        imageUrl: customImagePreview || plantData.imageUrl,
        dataSource: 'Claude-Vision'
      };
      
      setSelectedPlant(selectedPlantData);
      
      const confidenceInfo = plantIdentificationService.getConfidenceLevel(plantData.confidence || 0);
      
      toast({
        title: `Plant identified with Claude AI! ${confidenceInfo.level === 'high' ? '🎯' : confidenceInfo.level === 'medium' ? '👍' : '⚠️'}`,
        description: `Identified as ${plantData.commonName} (${Math.round((plantData.confidence || 0) * 100)}% confidence) - ${confidenceInfo.description}`,
        variant: confidenceInfo.level === 'low' ? 'destructive' : 'default'
      });
      
    } catch (error) {
      console.error('Error identifying plant with Claude:', error);
      setIdentificationError("Claude Vision identification failed. Please try again or add manually.");
      toast({
        title: "Claude identification failed", 
        description: "Please try again with a different image or add the plant manually.",
        variant: "destructive"
      });
      
      // Create a fallback plant entry
      await createFallbackPlantEntry();
    } finally {
      setIdentifyingPlant(false);
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    }
  };



  // Helper function to create a fallback plant entry when identification fails
  const createFallbackPlantEntry = async () => {
    if (!customImage || !customImagePreview) {
      return; // Can't create fallback without an image
    }
    
    try {
      // Process the image for storage
      let imageUrl = customImagePreview;
      if (customImage && user) {
        try {
          // Convert to base64 for storing in Firestore
          imageUrl = await uploadImageToStorage(customImage);
        } catch (error) {
          console.error("Error processing plant image:", error);
          // If conversion fails, use the preview URL
        }
      }
      
      // Create a generic unknown plant entry
      const plantData: PlantData = {
        id: `unidentified-${Date.now()}`,
        scientificName: "Unknown",
        commonName: "Unidentified Plant",
        familyName: "Unknown",
        genus: "Unknown",
        imageUrl: imageUrl,
        description: "This plant was not identified automatically. You can edit its details to add more information.",
        cycle: "Unknown",
        watering: "Average",
        sunlight: ["part_sun"],
        dataSource: 'Custom'
      };
      
      // Set up the custom plant form with generic data
      setCustomPlantForm({
        commonName: "Unidentified Plant",
        scientificName: "",
        cycle: "Unknown",
        watering: "Average",
        notes: "Add your notes about this plant here."
      });
      
      // Set the plant as selected to allow user to edit details
      setSelectedPlant(plantData);
      
      // Open the custom plant modal for editing
      setShowCustomPlantModal(true);
    } catch (error) {
      console.error("Error creating fallback plant entry:", error);
    }
  };

  // Handle adding a plant to the user's garden
  const addPlantToGarden = async (plant: PlantData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add plants.",
        variant: "destructive"
      });
      return;
    }
    
    setAddingPlant(true);
    
    try {
      // Determine which image to use
      let finalImageUrl = plant.imageUrl || "";
      
      // If a custom image was uploaded, upload it to Firebase Storage
      if (customImage && plant.dataSource !== "Custom") {
        try {
          setUploadProgress(10);
          // Upload image to Firebase Storage instead of converting to base64
          finalImageUrl = await uploadImageToStorage(customImage);
          setUploadProgress(100);
          
          // Set a timeout to reset the progress bar
          setTimeout(() => {
            setUploadProgress(0);
          }, 1000);
        } catch (error) {
          console.error("Error uploading image to Firebase Storage:", error);
          // If there's an error, fall back to the original URL
          toast({
            title: "Warning",
            description: "Couldn't upload image to storage. Using fallback image.",
            variant: "destructive"
          });
        }
      } else if (customImage && plant.dataSource === "Custom") {
        // For custom plants, we also need to upload the image
        try {
          setUploadProgress(10);
          finalImageUrl = await uploadImageToStorage(customImage);
          setUploadProgress(100);
          
          setTimeout(() => {
            setUploadProgress(0);
          }, 1000);
        } catch (error) {
          console.error("Error uploading custom plant image:", error);
          // For custom plants, we need an image, so convert to base64 as fallback
          try {
            const base64Image = await imageToBase64(customImage);
            finalImageUrl = base64Image;
          } catch (fallbackError) {
            console.error("Error with fallback to base64:", fallbackError);
            toast({
              title: "Error",
              description: "Failed to process image. Please try again.",
              variant: "destructive"
            });
            setAddingPlant(false);
            return;
          }
        }
      }
      
      // Check if the plant was identified by PlantNet
      const isIdentifiedPlant = identificationResults.length > 0;
      
      const plantData = {
        plantId: typeof plant.id === 'number' ? plant.id : 0,
        commonName: plant.commonName || "Unknown",
        scientificName: plant.scientificName,
        imageUrl: finalImageUrl,
        cycle: plant.cycle || "Unknown",
        notes: plant.description || "",
        soilMoisturePreference: plant.watering?.toLowerCase() || "average",
        sunlightPreference: Array.isArray(plant.sunlight) && plant.sunlight.length > 0 
          ? plant.sunlight[0] 
          : "full_sun",
        wateringSchedule: getWateringSchedule(plant.watering || ""),
        dataSource: isIdentifiedPlant ? "PlantNet" : (plant.dataSource === "Custom" ? "Custom" : "iNaturalist")
      };
      
      await addPlant(plantData);
      
      toast({
        title: "Success",
        description: `${plant.commonName} has been added to your garden.`,
      });
      
      // Reset form and states
      setSelectedPlant(null);
      setCustomImage(null);
      setCustomImagePreview(null);
      setIdentificationResults([]);
      setIdentificationError(null);
      setCustomPlantForm({
        commonName: '',
        scientificName: '',
        cycle: 'Perennial',
        watering: 'Average',
        notes: ''
      });
      
      // Navigate back to dashboard after adding
      navigate('/');
    } catch (error) {
      console.error('Error adding plant:', error);
      toast({
        title: "Error",
        description: "Failed to add plant to your garden. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAddingPlant(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar showBackButton={true} />
      
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-semibold text-foreground flex items-center justify-center gap-2">
            <Leaf className="h-8 w-8 text-primary" />
            Add Plants to Your Garden
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Search for plants using iNaturalist to add to your garden
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="max-w-md mx-auto">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Search for plants (e.g., 'Rose', 'Tomato')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchPlants()}
              className="flex-1"
            />
            <Button onClick={searchPlants} disabled={loading || !searchQuery.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Search</span>
            </Button>
          </div>
        </div>
        
        {/* Info Message */}
        <div className="mx-auto max-w-2xl">
          <div className="bg-muted/30 p-3 rounded-lg flex items-start gap-3">
            <Info className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p>
                Searching plants from iNaturalist, a community science platform where people share observations of biodiversity.
                {searchResults.length > 0 && ` Found ${searchResults.length} results.`}
              </p>
            </div>
          </div>
        </div>
        
        {/* Drag & Drop Image Upload Area */}
        <div className="mx-auto max-w-2xl mt-6">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              customImagePreview 
                ? 'bg-green-50 border-green-300' 
                : 'border-muted-foreground/25 hover:border-primary/50 bg-muted/10 hover:bg-muted/20'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.add('border-primary', 'bg-primary/5');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
              
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                  // Handle the file directly instead of through synthetic event
                  setCustomImage(file);
                  
                  // Create image preview
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    setCustomImagePreview(e.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                  
                  // If we're in the plant modal, update the selected plant with this image
                  if (selectedPlant) {
                    const updatedPlant = { 
                      ...selectedPlant, 
                      originalImageUrl: selectedPlant.imageUrl, // Store original for restoration if needed
                      imageUrl: URL.createObjectURL(file)
                    };
                    setSelectedPlant(updatedPlant);
                  }
                  
                  toast({
                    title: "Image uploaded",
                    description: "Custom image has been added and will be used for this plant.",
                  });
                } else {
                  toast({
                    title: "Invalid file type",
                    description: "Please select an image file (jpg, png, etc.)",
                    variant: "destructive"
                  });
                }
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {customImagePreview ? (
              <div className="space-y-4">
                <div className="relative w-40 h-40 mx-auto overflow-hidden rounded-lg shadow-md">
                  <img 
                    src={customImagePreview} 
                    alt="Plant preview" 
                    className="w-full h-full object-cover"
                  />
                  <button 
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomImage(null);
                      setCustomImagePreview(null);
                      setIdentificationResults([]);
                      setIdentificationError(null);
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <Badge variant="outline" className="bg-green-100 text-green-700">
                    Image ready to upload
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click to select a different image, or drop a new one here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-medium">Upload a plant image</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop an image here, or click to select a file
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports JPG, PNG, GIF up to 10MB
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {uploadProgress > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Identifying plant...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
          
          {customImagePreview && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
              <Button 
                onClick={identifyPlantWithClaude} 
                disabled={identifyingPlant || !customImage}
                className="sm:flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                variant="default"
              >
                {identifyingPlant ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <div className="h-4 w-4 mr-2 bg-white/20 rounded-sm flex items-center justify-center">
                      <span className="text-white text-xs font-bold">AI</span>
                    </div>
                    Identify with Claude Vision
                  </>
                )}
              </Button>
              
              <Button 
                onClick={() => setShowCustomPlantModal(true)}
                variant="outline"
                className="sm:flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Plant
              </Button>
            </div>
          )}
          
          {identificationError && (
            <Alert className="mt-4 bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <div className="flex flex-col space-y-2 w-full">
                <AlertDescription className="text-sm">
                  {identificationError}
                </AlertDescription>
                {!identificationResults.length && customImage && (
                  <div className="flex justify-end mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs bg-white hover:bg-green-50"
                      onClick={() => setShowCustomPlantModal(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Manually
                    </Button>
                  </div>
                )}
              </div>
            </Alert>
          )}
          
          {identificationResults.length > 0 && (
            <div className="mt-6">
              <Card className="overflow-hidden">
                <CardHeader className="bg-green-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-green-600" />
                        Plant Identified!
                      </CardTitle>
                      <CardDescription>
                        {Math.round(identificationResults[0].probability * 100)}% confidence
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      via PlantNet
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">
                        {identificationResults[0].commonNames[0] || identificationResults[0].name}
                      </h3>
                      <p className="text-sm text-muted-foreground italic">
                        {identificationResults[0].scientificName}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium">Family</h4>
                        <p className="text-sm text-muted-foreground">
                          {identificationResults[0].family}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Genus</h4>
                        <p className="text-sm text-muted-foreground">
                          {identificationResults[0].genus}
                        </p>
                      </div>
                    </div>
                    
                    {identificationResults[0].description && (
                      <div>
                        <h4 className="text-sm font-medium">Description</h4>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {identificationResults[0].description}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/10 flex justify-end gap-2">
                  <Button 
                    onClick={() => {
                      // Create a plant data object from the identification result
                      if (identificationResults.length > 0 && selectedPlant) {
                        // Use the plant data that was prepared during identification
                        // This already has the Firebase Storage URL if the upload succeeded
                        addPlantToGarden(selectedPlant);
                      }
                    }}
                    variant="default"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Garden
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
        
        {/* Hidden file input for regular image upload */}
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleImageChange}
        />
        
        {/* Hidden file input for camera capture */}
        <input 
          type="file" 
          ref={cameraInputRef}
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={handleImageChange}
        />
        
        <div className="flex gap-2 mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Image
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCameraCapture}
          >
            Take Photo
          </Button>
        </div>        {/* Custom Plant Modal */}
        {showCustomPlantModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full overflow-hidden animate-in fade-in zoom-in">
              <CardHeader className="bg-primary/5">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Add Custom Plant</CardTitle>
                    <CardDescription>
                      {identificationResults.length > 0 
                        ? "We've pre-filled details from the identified plant"
                        : customImage 
                          ? "We couldn't identify your plant, but you can still add it manually"
                          : "Add details about your custom plant"}
                    </CardDescription>
                  </div>
                  {identificationResults.length > 0 && (
                    <Badge className="bg-green-100 text-green-800">
                      PlantNet
                    </Badge>
                  )}
                  {!identificationResults.length && customImage && (
                    <Badge className="bg-amber-100 text-amber-800">
                      Manual Entry
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="w-full flex justify-center mb-4">
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden shadow-md">
                    {customImagePreview ? (
                      <img 
                        src={customImagePreview} 
                        alt="Plant preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Leaf className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {(!identificationResults.length && customImage) && (
                    <Alert className="bg-blue-50 text-blue-800 border border-blue-200">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Even though we couldn't identify your plant, you can still add it to your garden with basic information and edit it later.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <label htmlFor="commonName" className="block text-sm font-medium">
                      Common Name*
                    </label>
                    <Input
                      id="commonName"
                      placeholder="e.g., Snake Plant"
                      value={customPlantForm.commonName}
                      onChange={(e) => setCustomPlantForm({
                        ...customPlantForm,
                        commonName: e.target.value
                      })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="scientificName" className="block text-sm font-medium">
                      Scientific Name
                    </label>
                    <Input
                      id="scientificName"
                      placeholder="e.g., Dracaena trifasciata"
                      value={customPlantForm.scientificName}
                      onChange={(e) => setCustomPlantForm({
                        ...customPlantForm,
                        scientificName: e.target.value
                      })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="cycle" className="block text-sm font-medium">
                        Life Cycle
                      </label>
                      <select
                        id="cycle"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        value={customPlantForm.cycle}
                        onChange={(e) => setCustomPlantForm({
                          ...customPlantForm,
                          cycle: e.target.value
                        })}
                      >
                        <option value="Annual">Annual</option>
                        <option value="Biennial">Biennial</option>
                        <option value="Perennial">Perennial</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="watering" className="block text-sm font-medium">
                        Watering Needs
                      </label>
                      <select
                        id="watering"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        value={customPlantForm.watering}
                        onChange={(e) => setCustomPlantForm({
                          ...customPlantForm,
                          watering: e.target.value
                        })}
                      >
                        <option value="Minimum">Minimum</option>
                        <option value="Average">Average</option>
                        <option value="Frequent">Frequent</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="notes" className="block text-sm font-medium">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      placeholder="Add any notes about your plant..."
                      value={customPlantForm.notes}
                      onChange={(e) => setCustomPlantForm({
                        ...customPlantForm,
                        notes: e.target.value
                      })}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 bg-muted/20">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCustomPlantModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    if (!customPlantForm.commonName.trim()) {
                      toast({
                        title: "Error",
                        description: "Please provide at least a common name for your plant",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    if (!customImagePreview) {
                      toast({
                        title: "Error",
                        description: "Please upload an image for your plant",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    // Create a custom plant with the form data
                    const customPlant: PlantData = {
                      id: `custom-${Date.now()}`,
                      scientificName: customPlantForm.scientificName || "Unknown",
                      commonName: customPlantForm.commonName,
                      familyName: identificationResults.length > 0 ? identificationResults[0].family : "Custom",
                      genus: customPlantForm.scientificName 
                        ? customPlantForm.scientificName.split(' ')[0]
                        : identificationResults.length > 0 ? identificationResults[0].genus : "Unknown",
                      imageUrl: customImagePreview,
                      description: customPlantForm.notes || "",
                      cycle: customPlantForm.cycle,
                      watering: customPlantForm.watering,
                      sunlight: identificationResults.length > 0 && identificationResults[0].sunlight 
                        ? identificationResults[0].sunlight 
                        : ["part_sun"],
                      dataSource: "Custom"
                    };
                    
                    // Add the plant
                    setShowCustomPlantModal(false);
                    addPlantToGarden(customPlant);
                  }}
                  disabled={addingPlant || !customPlantForm.commonName.trim()}
                >
                  {addingPlant ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Garden
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
        
        {/* Trending Plants Section */}
        {trendingPlants.length > 0 && searchResults.length === 0 && !loading && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-medium flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Trending Plants
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchTrendingPlants} 
                disabled={loadingTrending}
                className="text-xs"
              >
                {loadingTrending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <span>Refresh</span>
                )}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {loadingTrending ? (
                Array(4).fill(0).map((_, i) => (
                  <Card key={`skeleton-${i}`} className="overflow-hidden opacity-70">
                    <div className="h-40 bg-muted animate-pulse"></div>
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted/50 rounded animate-pulse w-1/2"></div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                trendingPlants.map((plant) => (
                  <ResultCard key={`trending-${plant.id}`} plant={plant} onSelect={setSelectedPlant} />
                ))
              )}
            </div>
          </div>
        )}
        
        {/* Selected Plant Modal */}
        {selectedPlant && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl text-gray-800">{selectedPlant.commonName}</CardTitle>
                    <CardDescription className="italic text-gray-600 mt-1">
                      {selectedPlant.scientificName}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="bg-green-500 text-white border-green-600"
                    >
                      {selectedPlant.dataSource}
                    </Badge>
                    {selectedPlant.confidence && (
                      <Badge 
                        variant="secondary"
                        className="text-xs"
                      >
                        {Math.round(selectedPlant.confidence * 100)}% confidence
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPlant(null)}
                      className="h-8 w-8 p-0 hover:bg-red-100"
                    >
                      <XCircle className="h-4 w-4 text-gray-500 hover:text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="w-full h-72 bg-gradient-to-br from-green-50 to-emerald-100 relative">
                  {selectedPlant.imageUrl ? (
                    <>
                      <img 
                        src={selectedPlant.imageUrl} 
                        alt={selectedPlant.commonName}
                        className="w-full h-full object-cover rounded-t-none"
                        onError={(e) => {
                          // If image fails to load, show placeholder
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const leafIcon = document.createElement('div');
                            leafIcon.className = "absolute inset-0 flex items-center justify-center";
                            leafIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>';
                            parent.appendChild(leafIcon);
                          }
                        }}
                      />
                      
                      {/* Custom image overlay buttons */}
                      <div className="absolute bottom-0 right-0 p-2 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="h-8 w-8 p-0 bg-black/60 hover:bg-black/80"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="h-4 w-4 text-white" />
                        </Button>
                        
                        {customImagePreview && (
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="h-8 w-8 p-0 bg-black/60 hover:bg-red-600/80"
                            onClick={() => {
                              setCustomImage(null);
                              setCustomImagePreview(null);
                              // Reset to original image if we had previously set a custom one
                              if (selectedPlant.originalImageUrl) {
                                setSelectedPlant({
                                  ...selectedPlant,
                                  imageUrl: selectedPlant.originalImageUrl
                                });
                              }
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Leaf className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-6 space-y-6">
                  {/* Basic Care Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                        🔄 Cycle
                      </h3>
                      <p className="text-blue-700 capitalize mt-1 font-medium">
                        {selectedPlant.cycle || "Unknown"}
                      </p>
                    </div>
                    <div className="bg-sky-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-sky-800 flex items-center gap-2">
                        💧 Watering
                      </h3>
                      <p className="text-sky-700 capitalize mt-1 font-medium">
                        {selectedPlant.watering || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Classification */}
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                      🏷️ Classification
                    </h3>
                    <p className="text-emerald-700 mt-1">
                      <span className="font-medium">{selectedPlant.familyName}</span> › <span className="font-medium">{selectedPlant.genus}</span>
                    </p>
                  </div>

                  {/* Sunlight Requirements */}
                  {selectedPlant.sunlight && selectedPlant.sunlight.length > 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                        ☀️ Sunlight
                      </h3>
                      <p className="text-yellow-700 capitalize mt-1 font-medium">
                        {selectedPlant.sunlight.join(", ").replace(/_/g, " ")}
                      </p>
                    </div>
                  )}
                  
                  {/* Description */}
                  {selectedPlant.description && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-purple-800 flex items-center gap-2 mb-2">
                        📝 Description
                      </h3>
                      <p className="text-purple-700 text-sm leading-relaxed max-h-24 overflow-y-auto">
                        {selectedPlant.description}
                      </p>
                    </div>
                  )}

                  {/* Care Instructions */}
                  {selectedPlant.careInstructions && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-800 flex items-center gap-2 mb-2">
                        🌿 Care Instructions
                      </h3>
                      <p className="text-green-700 text-sm leading-relaxed">
                        {selectedPlant.careInstructions}
                      </p>
                    </div>
                  )}

                  {/* Additional Information */}
                  <div className="grid gap-4">
                    {selectedPlant.observationCount !== undefined && selectedPlant.observationCount > 0 && (
                      <div className="bg-indigo-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-indigo-800 flex items-center gap-2">
                          📊 iNaturalist Observations
                        </h3>
                        <p className="text-indigo-700 text-sm mt-1">
                          {selectedPlant.observationCount.toLocaleString()} observations recorded
                        </p>
                      </div>
                    )}
                    
                    {selectedPlant.nativeRegion && (
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                          🌍 Native Region
                        </h3>
                        <p className="text-amber-700 text-sm mt-1">
                          {selectedPlant.nativeRegion}
                        </p>
                      </div>
                    )}

                    {selectedPlant.plantingTips && (
                      <div className="bg-teal-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-teal-800 flex items-center gap-2">
                          🌱 Planting Tips
                        </h3>
                        <p className="text-teal-700 text-sm mt-1 leading-relaxed">
                          {selectedPlant.plantingTips}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {selectedPlant.wikipediaUrl && (
                    <div className="border-t pt-4">
                      <a 
                        href={selectedPlant.wikipediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary flex items-center gap-2 text-sm hover:underline font-medium"
                      >
                        📖 Read more on Wikipedia <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                  
                  {/* Image upload section */}
                  <div className="border-t pt-6 mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Image className="h-5 w-5 text-primary" />
                        Plant Image
                      </h3>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs hover:bg-primary/10"
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        {customImagePreview ? "Change Image" : "Upload Custom"}
                      </Button>
                    </div>
                    
                    {customImagePreview && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          ✅ Custom image uploaded
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 bg-gradient-to-r from-gray-50 to-slate-50 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedPlant(null)}
                  className="hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => addPlantToGarden(selectedPlant)}
                  disabled={addingPlant}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {addingPlant ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Adding to Garden...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add to My Garden
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
        
        {/* Search Results */}
        <div className="mt-8">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-2 text-muted-foreground">Searching plants on iNaturalist...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <h3 className="text-xl font-medium mb-4">Search Results</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {searchResults.map((plant) => (
                  <ResultCard key={`inat-${plant.id}`} plant={plant} onSelect={setSelectedPlant} />
                ))}
              </div>
            </>
          ) : searchQuery.trim() !== '' && !loading ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg">
              <Leaf className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No plants found</h3>
              <p className="text-muted-foreground">
                Try a different search term or check the spelling
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Result card component to display each plant search result
function ResultCard({ plant, onSelect }: { plant: PlantData; onSelect: (plant: PlantData) => void }) {
  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
      onClick={() => onSelect(plant)}
    >
      <div className="relative h-48 overflow-hidden">
        <div className="w-full h-full bg-muted">
          {plant.imageUrl ? (
            <img 
              src={plant.imageUrl} 
              alt={plant.commonName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Fallback to a placeholder if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const leafIcon = document.createElement('div');
                  leafIcon.className = "flex items-center justify-center h-full";
                  leafIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>';
                  parent.appendChild(leafIcon);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Leaf className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
          <div className="p-3 w-full">
            <Button size="sm" variant="secondary" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Select Plant
            </Button>
          </div>
        </div>
        {plant.observationCount !== undefined && plant.observationCount > 0 && (
          <Badge 
            variant="outline" 
            className="absolute top-2 right-2 bg-green-500 text-white text-xs"
          >
            {plant.observationCount > 1000 
              ? `${(plant.observationCount / 1000).toFixed(1)}k obs` 
              : `${plant.observationCount} obs`}
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-medium truncate">
          {plant.commonName || "Unknown"}
        </h3>
        <p className="text-sm text-muted-foreground italic truncate">
          {plant.scientificName}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground capitalize">
            {plant.familyName}
          </p>
          {plant.watering && (
            <p className="text-xs text-muted-foreground capitalize">
              {plant.watering} watering
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}