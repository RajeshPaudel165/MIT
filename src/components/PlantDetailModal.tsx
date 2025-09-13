import React from 'react';
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Droplets, Leaf, Sun, BookOpen, Info, X, ExternalLink } from 'lucide-react';
import { Plant } from '@/hooks/usePlants';
import { Separator } from '@/components/ui/separator';
import PlantSoilRequirementsSection from './PlantSoilRequirementsSection';
import { useNavigate } from 'react-router-dom';
import { isBase64Image } from '@/lib/utils';

interface PlantDetailModalProps {
  plant: Plant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PlantDetailModal: React.FC<PlantDetailModalProps> = ({ plant, open, onOpenChange }) => {
  const navigate = useNavigate();
  
  if (!plant) return null;

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
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-xl">{plant.commonName}</DialogTitle>
              <DialogDescription className="text-sm italic">
                {plant.scientificName}
              </DialogDescription>
            </div>
            <Badge className="bg-primary text-primary-foreground">
              {plant.cycle}
            </Badge>
          </div>
        </DialogHeader>
        
        {/* Plant Image */}
        <div className="w-full h-72 bg-muted rounded-md overflow-hidden relative">
          {plant.imageUrl ? (
            <img
              src={plant.imageUrl}
              alt={plant.commonName}
              className="w-full h-full object-cover"
              onLoad={() => {
                // Log successful loading of image (base64 or URL)
                if (isBase64Image(plant.imageUrl || '')) {
                  console.log("Loaded base64 image for plant in modal:", plant.commonName);
                } else {
                  console.log("Loaded URL image for plant in modal:", plant.commonName);
                }
              }}
              onError={(e) => {
                // Fallback for failed images
                console.error("Failed to load image for plant in modal:", plant.commonName);
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
              <Leaf className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>
        
        {/* Plant Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date Added
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatDate(plant.dateAdded)}
              </p>
            </div>
            
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
        
        {/* Plant Soil Requirements Section */}
        <PlantSoilRequirementsSection plant={plant} />
        
        {/* Notes Section */}
        {plant.notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Notes
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {plant.notes || 'No notes added yet'}
              </p>
            </div>
          </>
        )}
        
        <DialogFooter className="flex gap-2 flex-col sm:flex-row">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button 
            onClick={() => {
              onOpenChange(false);
              navigate(`/plant/${plant.id}`, { state: { plant } });
            }}
            className="w-full sm:w-auto"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlantDetailModal;
