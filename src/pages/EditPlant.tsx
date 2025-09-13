import React, { useState, useRef, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Plus, Loader2, Camera, Image, XCircle, ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlants } from '@/hooks/usePlants';
import { toast } from '@/components/ui/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { isBase64Image, imageToBase64 } from '@/lib/utils';
import { inferPlantCycle, inferWateringNeeds, inferSunlightNeeds, getWateringSchedule } from '@/lib/plantFunctions';

interface PlantFormData {
  commonName: string;
  scientificName: string;
  cycle: string;
  watering: string;
  notes: string;
  sunlightPreference: string;
}

export default function EditPlant() {
  const { plantId } = useParams<{ plantId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [customImage, setCustomImage] = useState<File | null>(null);
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [plantData, setPlantData] = useState<PlantFormData>({
    commonName: '',
    scientificName: '',
    cycle: 'Perennial',
    watering: 'Average',
    notes: '',
    sunlightPreference: 'full_sun'
  });
  const [originalImage, setOriginalImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { getPlantById, updatePlant, deletePlant } = usePlants();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlantData = async () => {
      if (!plantId || !user) {
        navigate('/');
        return;
      }

      try {
        const plant = await getPlantById(plantId);
        if (!plant) {
          toast({
            title: "Plant not found",
            description: "The requested plant could not be found.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Convert watering schedule to watering preference
        let wateringPreference = 'Average';
        if (plant.wateringSchedule === 'daily') wateringPreference = 'Frequent';
        if (plant.wateringSchedule === 'monthly') wateringPreference = 'Minimum';

        setPlantData({
          commonName: plant.commonName || '',
          scientificName: plant.scientificName || '',
          cycle: plant.cycle || 'Perennial',
          watering: wateringPreference,
          notes: plant.notes || '',
          sunlightPreference: plant.sunlightPreference || 'full_sun'
        });

        if (plant.imageUrl) {
          setOriginalImage(plant.imageUrl);
          if (isBase64Image(plant.imageUrl)) {
            setCustomImagePreview(plant.imageUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching plant data:", error);
        toast({
          title: "Error",
          description: "Failed to load plant data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPlantData();
  }, [plantId, user, navigate, getPlantById]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !plantId) {
      toast({
        title: "Error",
        description: "You must be logged in to update plants.",
        variant: "destructive"
      });
      return;
    }

    if (!plantData.commonName.trim()) {
      toast({
        title: "Error",
        description: "Plant name is required.",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    setUploadProgress(10);
    
    try {
      // Determine which image to use
      let imageUrl = originalImage;
      
      // If a custom image was uploaded, process it
      if (customImage) {
        try {
          setUploadProgress(30);
          imageUrl = await uploadImageToStorage(customImage);
          setUploadProgress(80);
        } catch (error) {
          console.error("Error uploading image:", error);
          toast({
            title: "Warning",
            description: "Could not process new image. Using existing image instead.",
            variant: "default"
          });
        }
      }
      
      setUploadProgress(90);
      
      // Prepare the plant data
      const updatedPlant = {
        commonName: plantData.commonName,
        scientificName: plantData.scientificName,
        imageUrl: imageUrl,
        cycle: plantData.cycle,
        notes: plantData.notes,
        soilMoisturePreference: plantData.watering.toLowerCase(),
        sunlightPreference: plantData.sunlightPreference,
        wateringSchedule: getWateringSchedule(plantData.watering)
      };
      
      await updatePlant(plantId, updatedPlant);
      setUploadProgress(100);
      
      toast({
        title: "Success",
        description: "Plant updated successfully!",
      });
      
      // Navigate back to the plant details page
      setTimeout(() => {
        navigate(`/plant/${plantId}`);
      }, 1000);
    } catch (error) {
      console.error("Error updating plant:", error);
      toast({
        title: "Error",
        description: "Failed to update plant. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this plant? This action cannot be undone.")) {
      return;
    }
    
    if (!user || !plantId) {
      toast({
        title: "Error",
        description: "You must be logged in to delete plants.",
        variant: "destructive"
      });
      return;
    }
    
    setDeleting(true);
    
    try {
      await deletePlant(plantId);
      
      toast({
        title: "Success",
        description: "Plant deleted successfully.",
      });
      
      // Navigate back to the dashboard
      navigate('/');
    } catch (error) {
      console.error("Error deleting plant:", error);
      toast({
        title: "Error",
        description: "Failed to delete plant. Please try again.",
        variant: "destructive"
      });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar showBackButton={true} backTo={`/plant/${plantId}`} />
        <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading plant data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar showBackButton={true} backTo={`/plant/${plantId}`} />
      
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-semibold text-foreground flex items-center gap-2">
            <Leaf className="h-8 w-8 text-primary" />
            Edit Plant
          </h2>
          <Button 
            variant="outline" 
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plant Details</CardTitle>
              <CardDescription>Update information about your plant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plant Image */}
              <div className="w-full">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" />
                  Plant Image
                </h3>
                <div className="flex flex-col items-center space-y-4">
                  <div 
                    className="relative w-40 h-40 bg-muted rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {customImagePreview || originalImage ? (
                      <img 
                        src={customImagePreview || originalImage} 
                        alt="Plant" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Leaf className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Change Image
                    </Button>
                    
                    {customImagePreview && (
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setCustomImage(null);
                          setCustomImagePreview(null);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                    )}
                  </div>
                  
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>
              </div>
              
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="commonName" className="block text-sm font-medium">
                    Plant Name*
                  </label>
                  <Input
                    id="commonName"
                    value={plantData.commonName}
                    onChange={(e) => setPlantData({...plantData, commonName: e.target.value})}
                    placeholder="e.g., Snake Plant"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="scientificName" className="block text-sm font-medium">
                    Scientific Name
                  </label>
                  <Input
                    id="scientificName"
                    value={plantData.scientificName}
                    onChange={(e) => setPlantData({...plantData, scientificName: e.target.value})}
                    placeholder="e.g., Dracaena trifasciata"
                  />
                </div>
              </div>
              
              {/* Growing Details */}
              <div className="space-y-4">
                <h3 className="font-medium">Growing Details</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="cycle" className="block text-sm font-medium">
                      Life Cycle
                    </label>
                    <select
                      id="cycle"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={plantData.cycle}
                      onChange={(e) => setPlantData({...plantData, cycle: e.target.value})}
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
                      value={plantData.watering}
                      onChange={(e) => setPlantData({...plantData, watering: e.target.value})}
                    >
                      <option value="Minimum">Minimum</option>
                      <option value="Average">Average</option>
                      <option value="Frequent">Frequent</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="sunlight" className="block text-sm font-medium">
                    Sunlight Preference
                  </label>
                  <select
                    id="sunlight"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={plantData.sunlightPreference}
                    onChange={(e) => setPlantData({...plantData, sunlightPreference: e.target.value})}
                  >
                    <option value="full_sun">Full Sun</option>
                    <option value="part_sun">Partial Sun</option>
                    <option value="part_shade">Partial Shade</option>
                    <option value="full_shade">Full Shade</option>
                  </select>
                </div>
              </div>
              
              {/* Notes */}
              <div className="space-y-2">
                <label htmlFor="notes" className="block text-sm font-medium">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  placeholder="Add any notes about your plant..."
                  value={plantData.notes}
                  onChange={(e) => setPlantData({...plantData, notes: e.target.value})}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(`/plant/${plantId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saving || !plantData.commonName.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
