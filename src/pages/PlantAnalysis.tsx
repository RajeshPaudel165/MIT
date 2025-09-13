// src/pages/PlantAnalysis.tsx - Individual Plant AI Analysis Page
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { usePlants, Plant } from '@/hooks/usePlants';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, 
  Camera, 
  Upload,
  Activity,
  Lightbulb,
  TrendingUp,
  Target,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Sparkles,
  Calendar,
  Droplets,
  Sun
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doc, setDoc, getDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

// AI Types
interface AIInsight {
  title: string;
  description: string;
  category: 'Photo Analysis' | 'Soil Health' | 'Watering' | 'Environment' | 'Disease';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  confidence: number;
  actionItems: string[];
  icon: React.ComponentType<{ className?: string }>;
}

interface HealthScore {
  overall: number;
  care: number;
  environment: number;
  growth: number;
  prediction: string;
}

interface GrowthPrediction {
  plantId: string;
  expectedGrowth: string;
  timeframe: string;
  factors: string[];
  recommendations: string[];
  confidence: number;
}

interface CarePlan {
  weeklyTasks: Array<{
    day: string;
    task: string;
    importance: 'high' | 'medium' | 'low';
  }>;
  monthlyGoals: string[];
  seasonalAdjustments: string[];
  emergencyProtocols: string[];
}

interface StoredAnalysisData {
  plantId: string;
  imageUrl: string;
  analysis: string;
  healthScore: HealthScore;
  insights: Omit<AIInsight, 'icon'>[]; // Store insights without icon functions
  growthPrediction: GrowthPrediction;
  carePlan: CarePlan;
  timestamp: Timestamp;
}

export const PlantAnalysis: React.FC = () => {
  const { plantId } = useParams<{ plantId: string }>();
  const { plants, loading } = usePlants();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [plant, setPlant] = useState<Plant | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [photoAnalysis, setPhotoAnalysis] = useState<string>('');
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [growthPrediction, setGrowthPrediction] = useState<GrowthPrediction | null>(null);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('photo-analysis');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load stored analysis data from Firebase
  const loadStoredAnalysisData = useCallback(async (plantId: string) => {
    if (!user) return;
    
    try {
      toast({
        title: "Loading Previous Analysis... 🔍",
        description: "Checking for existing analysis data.",
      });
      
      const analysisDoc = await getDoc(doc(db, 'users', user.uid, 'plantAnalysis', plantId));
      if (analysisDoc.exists()) {
        const data = analysisDoc.data() as StoredAnalysisData;
        setPhotoAnalysis(data.analysis || '');
        setHealthScore(data.healthScore || null);
        
        // Restore insights with icons
        const restoredInsights: AIInsight[] = (data.insights || []).map(insight => ({
          ...insight,
          icon: getInsightIcon(insight.category)
        }));
        setAiInsights(restoredInsights);
        
        setGrowthPrediction(data.growthPrediction || null);
        setCarePlan(data.carePlan || null);
        // For stored images, we'll just show a placeholder since CORS might prevent loading
        // The actual image URL is still stored for API analysis
        if (data.imageUrl) {
          setImagePreview('/placeholder.svg'); // Use a placeholder instead of the actual URL
        }
        
        toast({
          title: "Analysis Loaded! ✅",
          description: "Previous analysis data has been restored.",
        });
      } else {
        toast({
          title: "No Previous Analysis",
          description: "Take a photo to start your first AI analysis for this plant.",
        });
      }
    } catch (error) {
      console.error('Error loading stored analysis:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load previous analysis data.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Clear analysis data from Firebase
  const clearAnalysisData = async (plantId: string) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please log in to clear analysis data.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await setDoc(doc(db, 'users', user.uid, 'plantAnalysis', plantId), {});
      
      // Clear local state
      setPhotoAnalysis('');
      setHealthScore(null);
      setAiInsights([]);
      setGrowthPrediction(null);
      setCarePlan(null);
      setImagePreview('');
      setSelectedImage(null);
      
      toast({
        title: "Analysis Cleared! 🗑️",
        description: "All analysis data has been removed from the database.",
      });
      
    } catch (error) {
      console.error('Error clearing analysis data:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear analysis data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Find the current plant
  useEffect(() => {
    if (plants && plantId) {
      const foundPlant = plants.find(p => p.id === plantId);
      setPlant(foundPlant || null);
      
      // Load any stored analysis data
      if (foundPlant && user) {
        loadStoredAnalysisData(foundPlant.id);
      }
    }
  }, [plants, plantId, user, loadStoredAnalysisData]);

  // Upload image to Firebase Storage
  const uploadImageToStorage = async (file: File, plantId: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    // Create a simpler filename to avoid CORS issues
    const timestamp = Date.now();
    const filename = `analysis_${timestamp}.jpg`;
    const storageRef = ref(storage, `plant-images/${user.uid}/${filename}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  };

  // Save analysis data to Firebase
  const saveAnalysisData = async (
    plantId: string, 
    imageUrl: string, 
    analysis: string, 
    healthScore: HealthScore, 
    insights: Omit<AIInsight, 'icon'>[], // Accept insights without icon functions
    growthPrediction: GrowthPrediction, 
    carePlan: CarePlan
  ) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please log in to save analysis data.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const analysisData: StoredAnalysisData = {
        plantId,
        imageUrl,
        analysis,
        healthScore,
        insights,
        growthPrediction,
        carePlan,
        timestamp: Timestamp.now()
      };
      
      await setDoc(doc(db, 'users', user.uid, 'plantAnalysis', plantId), analysisData);
      
      toast({
        title: "Analysis Saved! 🌱",
        description: "Your plant analysis has been successfully saved to the database.",
      });
      
    } catch (error) {
      console.error('Error saving analysis data:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save analysis data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // AI Analysis with Gemini Vision API
  const analyzePhotoWithAI = async () => {
    if (!selectedImage || !plant || !user) return;

    setAiLoading(true);
    try {
      // Convert image to base64 for API first
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
        };
        reader.readAsDataURL(selectedImage);
      });

      // For now, let's use a placeholder URL to avoid CORS issues in development
      const imageUrl = `analysis_${Date.now()}_${plant.id}`;

      const prompt = `
        Analyze this photo of a ${plant.commonName} (${plant.scientificName || 'Unknown species'}) plant.
        
        Plant details:
        - Common Name: ${plant.commonName}
        - Scientific Name: ${plant.scientificName || 'Unknown'}
        
        Please provide a comprehensive analysis in the following JSON format:
        {
          "analysis": "Detailed visual analysis of the plant's health, growth, and any visible issues",
          "healthScore": {
            "overall": 85,
            "care": 90,
            "environment": 80,
            "growth": 85,
            "prediction": "Brief prediction about plant's health trajectory"
          },
          "insights": [
            {
              "title": "Insight title",
              "description": "Detailed description",
              "category": "Photo Analysis",
              "priority": "high",
              "confidence": 85,
              "actionItems": ["Action 1", "Action 2"]
            }
          ],
          "growthPrediction": {
            "expectedGrowth": "Description of expected growth",
            "timeframe": "1-2 months",
            "factors": ["Factor 1", "Factor 2"],
            "recommendations": ["Recommendation 1", "Recommendation 2"],
            "confidence": 80
          },
          "carePlan": {
            "weeklyTasks": [
              {"day": "Monday", "task": "Task description", "importance": "high"}
            ],
            "monthlyGoals": ["Goal 1", "Goal 2"],
            "seasonalAdjustments": ["Adjustment 1", "Adjustment 2"],
            "emergencyProtocols": ["Protocol 1", "Protocol 2"]
          }
        }
        
        Focus on:
        - Visual health indicators (leaf color, shape, signs of disease/pests)
        - Growth patterns and plant structure
        - Environmental stress indicators
        - Correlation with soil data if available
        - Actionable recommendations for care improvement
        - Specific issues that need immediate attention
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: selectedImage.type, data: base64 } }
            ]
          }]
        })
      });

      const data = await response.json();
      const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';
      
      try {
        // Extract JSON from the response
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysisJson = JSON.parse(jsonMatch[0]);
          
          // Set the analysis data
          setPhotoAnalysis(analysisJson.analysis || 'No analysis available');
          
          const healthScoreData: HealthScore = analysisJson.healthScore || {
            overall: 0,
            care: 0,
            environment: 0,
            growth: 0,
            prediction: 'No prediction available'
          };
          setHealthScore(healthScoreData);
          
          const insightsData: AIInsight[] = (analysisJson.insights || []).map((insight: { 
            title: string; 
            description: string; 
            category: string; 
            priority: string; 
            confidence: number; 
            actionItems: string[] 
          }) => ({
            ...insight,
            icon: getInsightIcon(insight.category),
            plantId: plant.id
          }));
          setAiInsights(insightsData);
          
          // Create insights data without the icon function for Firestore
          const insightsForSave = insightsData.map(({ icon, ...insight }) => insight);
          
          const growthData: GrowthPrediction = {
            plantId: plant.id,
            expectedGrowth: analysisJson.growthPrediction?.expectedGrowth || 'No prediction available',
            timeframe: analysisJson.growthPrediction?.timeframe || 'Unknown',
            factors: analysisJson.growthPrediction?.factors || [],
            recommendations: analysisJson.growthPrediction?.recommendations || [],
            confidence: analysisJson.growthPrediction?.confidence || 0
          };
          setGrowthPrediction(growthData);
          
          const carePlanData: CarePlan = {
            weeklyTasks: analysisJson.carePlan?.weeklyTasks || [],
            monthlyGoals: analysisJson.carePlan?.monthlyGoals || [],
            seasonalAdjustments: analysisJson.carePlan?.seasonalAdjustments || [],
            emergencyProtocols: analysisJson.carePlan?.emergencyProtocols || []
          };
          setCarePlan(carePlanData);
          
          // Show saving progress
          toast({
            title: "Saving Analysis... 💾",
            description: "Storing your plant analysis results to the database.",
          });
          
          // Save to Firebase
          await saveAnalysisData(
            plant.id,
            imageUrl,
            analysisJson.analysis || 'No analysis available',
            healthScoreData,
            insightsForSave, // Use version without icon functions
            growthData,
            carePlanData
          );
          
        } else {
          setPhotoAnalysis(analysisText);
        }
      } catch (parseError) {
        console.warn('Could not parse JSON response, using raw text:', parseError);
        setPhotoAnalysis(analysisText);
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      setPhotoAnalysis('Error analyzing image. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // Helper functions
  const getInsightIcon = (category: string) => {
    switch (category) {
      case 'Photo Analysis': return Camera;
      case 'Soil Health': return Activity;
      case 'Watering': return Droplets;
      case 'Environment': return Sun;
      case 'Disease': return AlertTriangle;
      default: return Lightbulb;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!plant || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">
              {!plant ? 'Plant Not Found' : 'Authentication Required'}
            </h2>
            <Link to="/mode/casual">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Plant List
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/mode/casual">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              AI Analysis: {plant.commonName}
            </h1>
            {plant.scientificName && (
              <p className="text-muted-foreground italic">{plant.scientificName}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {(photoAnalysis || healthScore || (aiInsights && aiInsights.length > 0)) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => clearAnalysisData(plant.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear Analysis
              </Button>
            )}
            
            {healthScore && (
              <Badge variant="outline" className="text-lg px-4 py-2">
                {healthScore.overall}% Health
              </Badge>
            )}
          </div>
        </div>

        {/* Plant Info Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Plant Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Common Name:</span> {plant.commonName}
                  </div>
                  {plant.scientificName && (
                    <div>
                      <span className="font-medium">Scientific Name:</span> {plant.scientificName}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Added:</span> {new Date(plant.dateAdded).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Analysis Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-muted/20 p-3 rounded">
                    <span className="font-medium">Photo Analysis:</span> 
                    <span className={photoAnalysis ? 'text-green-600 ml-1' : 'text-amber-600 ml-1'}>
                      {photoAnalysis ? 'Complete' : 'Pending'}
                    </span>
                  </div>
                  <div className="bg-muted/20 p-3 rounded">
                    <span className="font-medium">Health Score:</span> 
                    <span className={healthScore ? 'text-green-600 ml-1' : 'text-amber-600 ml-1'}>
                      {healthScore ? `${healthScore.overall}%` : 'Pending'}
                    </span>
                  </div>
                  <div className="bg-muted/20 p-3 rounded">
                    <span className="font-medium">Insights:</span> {aiInsights?.length || 0} generated
                  </div>
                  <div className="bg-muted/20 p-3 rounded">
                    <span className="font-medium">Care Plan:</span> 
                    <span className={carePlan ? 'text-green-600 ml-1' : 'text-amber-600 ml-1'}>
                      {carePlan ? 'Available' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="photo-analysis" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photo Analysis
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Smart Insights
              {aiInsights && aiInsights.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                  {aiInsights.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Health Score
              {healthScore && (
                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">!</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="growth" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Growth Forecast
              {growthPrediction && (
                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">!</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="care" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Care Plan
              {carePlan && (
                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">!</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Photo Analysis Tab */}
          <TabsContent value="photo-analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Take Photo for AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Photo Upload */}
                  <div className="space-y-4">
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? (
                        <img 
                          src={imagePreview} 
                          alt="Plant preview" 
                          className="max-w-full h-48 object-cover mx-auto rounded"
                        />
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                          <p className="text-gray-600">Click to capture or upload a photo</p>
                          <p className="text-sm text-gray-500">
                            Best results with clear, well-lit photos
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    <Button
                      onClick={analyzePhotoWithAI}
                      disabled={!selectedImage || aiLoading}
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing with AI...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Analyze with AI
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Analysis Results */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Analysis Results</h3>
                    {photoAnalysis ? (
                      <div className="bg-muted/20 p-4 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{photoAnalysis}</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">
                          Upload a photo to get AI-powered plant analysis
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Smart Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            {aiInsights && aiInsights.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {aiInsights.map((insight, index) => (
                  <Card key={index} className={`border-l-4 ${
                    insight.priority === 'urgent' ? 'border-l-red-500 bg-red-50/50' :
                    insight.priority === 'high' ? 'border-l-orange-500 bg-orange-50/50' :
                    insight.priority === 'medium' ? 'border-l-blue-500 bg-blue-50/50' :
                    'border-l-gray-500 bg-gray-50/50'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <insight.icon className="h-5 w-5 text-blue-600" />
                          <Badge variant={getPriorityColor(insight.priority)}>
                            {insight.priority}
                          </Badge>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {insight.confidence}% confidence
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      <Badge variant="outline" className="w-fit text-xs">
                        {insight.category}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {insight.description}
                      </p>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Action Items:</p>
                        <ul className="text-sm space-y-1">
                          {insight.actionItems?.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                              {item}
                            </li>
                          )) || <li className="text-muted-foreground">No action items available</li>}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {aiLoading ? 'Generating AI insights...' : 'Take a photo to generate smart insights'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Health Score Tab */}
          <TabsContent value="health" className="space-y-4">
            {healthScore ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    Plant Health Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getHealthColor(healthScore.overall)} mb-2`}>
                      {healthScore.overall}%
                    </div>
                    <p className="text-muted-foreground">Overall Health Score</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Care Quality</span>
                        <span className={getHealthColor(healthScore.care)}>{healthScore.care}%</span>
                      </div>
                      <Progress value={healthScore.care} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Environment</span>
                        <span className={getHealthColor(healthScore.environment)}>{healthScore.environment}%</span>
                      </div>
                      <Progress value={healthScore.environment} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Growth Rate</span>
                        <span className={getHealthColor(healthScore.growth)}>{healthScore.growth}%</span>
                      </div>
                      <Progress value={healthScore.growth} className="h-2" />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Health Prediction</h4>
                    <p className="text-sm text-muted-foreground">
                      {healthScore.prediction}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {aiLoading ? 'Calculating health scores...' : 'Take a photo to get health analysis'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Growth Forecast Tab */}
          <TabsContent value="growth" className="space-y-4">
            {growthPrediction ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Growth Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium text-sm mb-1">Expected Growth</p>
                    <p className="text-sm text-muted-foreground">{growthPrediction.expectedGrowth}</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-sm mb-1">Timeframe</p>
                    <Badge variant="outline">{growthPrediction.timeframe}</Badge>
                  </div>
                  
                  <div>
                    <p className="font-medium text-sm mb-2">Key Factors</p>
                    <ul className="text-sm space-y-1">
                      {growthPrediction.factors?.map((factor, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                          {factor}
                        </li>
                      )) || <li className="text-muted-foreground">No factors available</li>}
                    </ul>
                  </div>
                  
                  <div>
                    <p className="font-medium text-sm mb-2">Recommendations</p>
                    <ul className="text-sm space-y-1">
                      {growthPrediction.recommendations?.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      )) || <li className="text-muted-foreground">No recommendations available</li>}
                    </ul>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Confidence</span>
                    <Badge variant="outline">{growthPrediction.confidence}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {aiLoading ? 'Generating growth predictions...' : 'Take a photo to see growth forecast'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Care Plan Tab */}
          <TabsContent value="care" className="space-y-4">
            {carePlan ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Personalized Care Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="weekly" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="weekly">Weekly</TabsTrigger>
                      <TabsTrigger value="monthly">Monthly</TabsTrigger>
                      <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
                      <TabsTrigger value="emergency">Emergency</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="weekly" className="mt-4">
                      <div className="space-y-2">
                        {carePlan.weeklyTasks?.map((task, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded border">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{task.task}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{task.day}</Badge>
                              <Badge variant={task.importance === 'high' ? 'default' : 'outline'}>
                                {task.importance}
                              </Badge>
                            </div>
                          </div>
                        )) || <div className="text-center py-4 text-muted-foreground">No weekly tasks available</div>}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="monthly" className="mt-4">
                      <ul className="space-y-2">
                        {carePlan.monthlyGoals?.map((goal, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Target className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{goal}</span>
                          </li>
                        )) || <li className="text-muted-foreground">No monthly goals available</li>}
                      </ul>
                    </TabsContent>
                    
                    <TabsContent value="seasonal" className="mt-4">
                      <ul className="space-y-2">
                        {carePlan.seasonalAdjustments?.map((adjustment, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Calendar className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{adjustment}</span>
                          </li>
                        )) || <li className="text-muted-foreground">No seasonal adjustments available</li>}
                      </ul>
                    </TabsContent>
                    
                    <TabsContent value="emergency" className="mt-4">
                      <ul className="space-y-2">
                        {carePlan.emergencyProtocols?.map((protocol, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{protocol}</span>
                          </li>
                        )) || <li className="text-muted-foreground">No emergency protocols available</li>}
                      </ul>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {aiLoading ? 'Creating personalized care plan...' : 'Take a photo to get a custom care plan'}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PlantAnalysis;
