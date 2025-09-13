
import React, { useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Calendar, Droplets, Leaf, Sun, BookOpen, Info, ArrowLeft, Edit, Trash2, BarChart4 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plant, usePlants } from '@/hooks/usePlants';
import PlantSoilRequirementsSection from '@/components/PlantSoilRequirementsSection';
import SoilComparisonOnly from '@/components/SoilComparisonOnly';
import { useToast } from '@/hooks/use-toast';
import { isBase64Image, formatDate } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlantReportModal from '@/components/PlantReportModal';


export default function PlantDetails() {
 // Gemini Vision AI Disease Detection States
 const [selectedImage, setSelectedImage] = useState<File | null>(null);
 const [aiResult, setAiResult] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);
 const [showDisclaimer, setShowDisclaimer] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 // Report Modal State
 const [showReportModal, setShowReportModal] = useState(false);

 // Gemini Vision API Key
 const GEMINI_API_KEY = "AIzaSyDpQtm7WnWXNc1v_Rydlf24vJ9TMtDPdTk";

 // Handle image selection
 const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
   if (e.target.files && e.target.files[0]) {
     setSelectedImage(e.target.files[0]);
     setAiResult(null);
     setShowDisclaimer(true);
   }
 };

 // Handle camera capture
 const handleCameraCapture = async () => {
   if (fileInputRef.current) {
     fileInputRef.current.click();
   }
 };

 // Gemini Vision API call
 const analyzeImageWithGemini = async () => {
   if (!selectedImage) return;
   setLoading(true);
   setAiResult(null);
   try {
     // Convert image to base64
     const reader = new FileReader();
     reader.onloadend = async () => {
       const base64Image = reader.result?.toString().split(',')[1];
       // Gemini Vision API endpoint
 const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
       const payload = {
         contents: [
           {
             parts: [
               {
                 text:
                 "You are a plant pathology and crop health expert. Analyze the uploaded plant image thoroughly, examining leaves, stems, fruits, flowers, and overall growth for signs of disease (fungal, bacterial, viral, or physiological), pest infestations (insects, mites, nematodes), nutrient deficiencies or toxicities, and abiotic stresses (drought, overwatering, sunburn, frost, chemical damage, poor soil). Clearly describe the visible symptoms (e.g., spots, lesions, discoloration, curling, wilting, mold, chewing damage, chlorosis), provide the most likely diagnosis with reasoning and note alternative possibilities if relevant, then recommend concise and actionable next steps including immediate treatments, preventive practices, nutrient management, or monitoring/testing. If the plant appears healthy, explicitly state that and give routine care suggestions to maintain its health."
               },
               {
                 inline_data: {
                   mime_type: selectedImage.type,
                   data: base64Image
                 }
               }
             ]
           }
         ]
       };
       let resultText = "No result returned.";
       let errorDetails = "";
       try {
         const response = await fetch(url, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json'
           },
           body: JSON.stringify(payload)
         });
         const data = await response.json();
         // Log full response for debugging
         console.log("Gemini Vision API response:", data);
         if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
           resultText = data.candidates[0].content.parts[0].text;
         } else if (data?.error) {
           errorDetails = `Error: ${data.error.message || JSON.stringify(data.error)}`;
           resultText = errorDetails;
         } else {
           errorDetails = JSON.stringify(data);
         }
       } catch (apiError) {
         resultText = `API Error: ${apiError}`;
       }
       setAiResult(resultText + (errorDetails ? `\n\nDebug Info: ${errorDetails}` : ""));
     };
     reader.readAsDataURL(selectedImage);
   } catch (error) {
     setAiResult("Error analyzing image. Please try again.");
   } finally {
     setLoading(false);
   }
 };
 const { plantId } = useParams<{ plantId: string }>();
 const location = useLocation();
 const navigate = useNavigate();
 const { toast } = useToast();
 const { plants, deletePlant } = usePlants();
  // Try to get plant from location state, if not found, find it in the plants from hook
 const plantFromState = location.state?.plant as Plant | undefined;
 const plantFromHook = plants.find(p => p.id === plantId);
 const plant = plantFromState || plantFromHook;
  if (!plant) {
   return (
     <div className="min-h-screen bg-background">
       <Navbar showBackButton={true} />
       <div className="container py-16 px-4 text-center">
         <Leaf className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
         <h1 className="text-2xl font-semibold mb-2">Plant Not Found</h1>
         <p className="text-muted-foreground mb-8">The plant you're looking for doesn't exist or has been removed.</p>
         <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
       </div>
     </div>
   );
 }
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
 const formatDetailedDate = (date: Date) => {
   return new Intl.DateTimeFormat('en-US', {
     weekday: 'long',
     year: 'numeric',
     month: 'long',
     day: 'numeric',
     hour: '2-digit',
     minute: '2-digit'
   }).format(date);
 };
  const handleDelete = async () => {
   try {
     await deletePlant(plant.id);
     toast({
       title: "Plant deleted",
       description: `${plant.commonName} has been removed from your garden.`,
     });
     navigate('/');
   } catch (error) {
     console.error('Error deleting plant:', error);
     toast({
       title: "Error",
       description: "Failed to delete plant. Please try again.",
       variant: "destructive"
     });
   }
 };

 return (
   <div className="min-h-screen bg-background">
     <Navbar showBackButton={false} />
    
     <div className="container py-8 px-4 max-w-5xl mx-auto">
         {/* Gemini Vision AI Disease Detection Section */}
   <div className="bg-card rounded-lg border shadow-sm mb-8 p-6">
           <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
             <BarChart4 className="h-5 w-5 text-green-600" />
             Plant Disease Detection (AI)
           </h2>
           <p className="text-muted-foreground mb-2 text-sm">Upload or capture a plant image to analyze for visible diseases using Google Gemini Vision AI.</p>
           <div className="flex gap-4 mb-4 flex-wrap">
             <input
               type="file"
               accept="image/*"
               capture="environment"
               style={{ display: 'none' }}
               ref={fileInputRef}
               onChange={handleImageChange}
             />
             <Button variant="outline" onClick={handleCameraCapture}>
               Take Photo
             </Button>
             <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
               Upload Image
             </Button>
             {selectedImage && (
               <Button variant="default" onClick={analyzeImageWithGemini} disabled={loading}>
                 {loading ? "Analyzing..." : "Analyze Disease"}
               </Button>
             )}
           </div>
           {selectedImage && (
             <div className="mb-4">
               <img
                 src={URL.createObjectURL(selectedImage)}
                 alt="Selected plant"
                 className="max-w-xs rounded-lg border"
               />
             </div>
           )}
           {showDisclaimer && (
             <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 rounded mb-4 text-xs">
               <strong>Medical Disclaimer:</strong> This AI analysis is for informational purposes only and may not be accurate. Always consult a qualified professional for plant health concerns. The Gemini Vision API may not detect all diseases or provide medical advice.
             </div>
           )}
           {aiResult && (
             <div className="bg-muted/20 p-4 rounded-lg mt-2">
               <strong>AI Result:</strong>
               <div className="mt-2 whitespace-pre-line text-sm">{aiResult}</div>
             </div>
           )}
         </div>
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
         <div className="flex items-center gap-2">
           <Button
             variant="ghost"
             size="icon"
             onClick={() => navigate('/dashboard')}
             className="h-9 w-9"
           >
             <ArrowLeft className="h-5 w-5" />
           </Button>
           <div>
             <h1 className="text-2xl font-semibold">{plant.commonName}</h1>
             <p className="text-muted-foreground italic">{plant.scientificName}</p>
           </div>
         </div>
        
         <div className="flex gap-2">
           <Button onClick={() => setShowReportModal(true)}>
             Generate full report
           </Button>
           <Button
             variant="outline"
             onClick={() => navigate(`/edit-plant/${plant.id}`, { state: { plant } })}
           >
             <Edit className="h-4 w-4 mr-2" />
             Edit
           </Button>
          
           <AlertDialog>
             <AlertDialogTrigger asChild>
               <Button variant="destructive">
                 <Trash2 className="h-4 w-4 mr-2" />
                 Delete
               </Button>
             </AlertDialogTrigger>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                 <AlertDialogDescription>
                   This will permanently delete {plant.commonName} from your garden.
                   This action cannot be undone.
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                 <AlertDialogAction onClick={handleDelete}>
                   Delete
                 </AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>
         </div>
       </div>
      
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-1">
           <div className="sticky top-24">
             <div className="w-full aspect-square bg-muted rounded-xl overflow-hidden relative">
               {plant.imageUrl ? (
                 <img
                   src={plant.imageUrl}
                   alt={plant.commonName}
                   className="w-full h-full object-cover"
                   onLoad={() => {
                     // Log successful loading of image (base64 or URL)
                     if (isBase64Image(plant.imageUrl || '')) {
                       console.log("Loaded base64 image for plant:", plant.commonName);
                     } else {
                       console.log("Loaded URL image for plant:", plant.commonName);
                     }
                   }}
                   onError={(e) => {
                     // Fallback for failed images
                     console.error("Failed to load image for plant:", plant.commonName);
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
               ) : (
                 <div className="absolute inset-0 flex items-center justify-center">
                   <Leaf className="h-20 w-20 text-muted-foreground" />
                 </div>
               )}
             </div>
            
             <div className="mt-4 space-y-4">
               <Badge className="w-full justify-center py-1.5 text-sm">
                 {plant.cycle || "Unknown cycle"}
               </Badge>
              
               <div className="space-y-4 bg-muted/20 p-4 rounded-lg">
                 <div>
                   <h3 className="text-sm font-medium flex items-center gap-2">
                     <Calendar className="h-4 w-4 text-muted-foreground" />
                     Date Added
                   </h3>
                   <p className="text-sm text-muted-foreground">
                     {formatDetailedDate(plant.dateAdded)}
                   </p>
                 </div>
                
                 <div>
                   <h3 className="text-sm font-medium flex items-center gap-2">
                     <BookOpen className="h-4 w-4 text-purple-500" />
                     Plant Information
                   </h3>
                   <p className="text-sm text-muted-foreground">
                     {plant.plantId ? `Plant ID: ${plant.plantId}` : 'Manually added plant'}
                   </p>
                 </div>
               </div>
             </div>
           </div>
         </div>
        
         <div className="lg:col-span-2 space-y-6">
           <div className="bg-card rounded-lg border shadow-sm">
             <div className="p-6">
               <h2 className="text-xl font-semibold mb-4">Growing Conditions</h2>
              
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                   <div>
                     <h3 className="text-sm font-medium flex items-center gap-2">
                       <Droplets className="h-4 w-4 text-blue-500" />
                       Watering Schedule
                     </h3>
                     <p className="text-sm text-muted-foreground capitalize">
                       {plant.wateringSchedule || 'Not specified'}
                     </p>
                   </div>
                  
                   <div>
                     <h3 className="text-sm font-medium flex items-center gap-2">
                       <Sun className="h-4 w-4 text-yellow-500" />
                       Sunlight Preference
                     </h3>
                     <p className="text-sm text-muted-foreground">
                       {formatSunlight(plant.sunlightPreference)}
                     </p>
                   </div>
                 </div>
                
                 <div className="space-y-4">
                   <div>
                     <h3 className="text-sm font-medium flex items-center gap-2">
                       <Droplets className="h-4 w-4 text-teal-500" />
                       Soil Moisture Preference
                     </h3>
                     <p className="text-sm text-muted-foreground capitalize">
                       {plant.soilMoisturePreference || 'Not specified'}
                     </p>
                   </div>
                 </div>
               </div>
             </div>
           </div>
          
           <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
             <div className="p-6">
               <h2 className="text-xl font-semibold mb-4">Soil Analysis</h2>
               <SoilComparisonOnly plant={plant} />
             </div>
           </div>
          
           {plant.notes && (
             <div className="bg-card rounded-lg border shadow-sm">
               <div className="p-6">
                 <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                   <Info className="h-5 w-5 text-primary" />
                   Notes
                 </h2>
                 <div className="bg-muted/20 p-4 rounded-lg whitespace-pre-line">
                   {plant.notes}
                 </div>
               </div>
             </div>
           )}
         </div>
       </div>
     </div>
     
     {/* Plant Report Modal */}
     <PlantReportModal 
       isOpen={showReportModal} 
       onClose={() => setShowReportModal(false)}
       plant={plant}
       aiResult={aiResult}
     />
   </div>
 );
}


