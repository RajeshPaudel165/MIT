import { Button } from "@/components/ui/button";
import HeroBackground from "@/components/HeroBackground";
import { Plus, Leaf, BarChart3, Sprout, Loader2, Trash2 } from "lucide-react";
import { FlowerIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { usePlants, Plant } from "@/hooks/usePlants";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useState } from "react";
import { isBase64Image } from "@/lib/utils";
import EntertainmentMode from "./EntertainmentMode";

export default function Dashboard() {
  const { user } = useAuth();
  const { plants, loading, deleting, deletePlant } = usePlants();
  const navigate = useNavigate();

  const handlePlantClick = (plant: Plant) => {
    navigate(`/plant/${plant.id}`, { state: { plant } });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <HeroBackground />
      {/* Header */}
      <Navbar showBackButton={false} />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-semibold text-foreground">
              Welcome to Your Garden, {user?.displayName || "Plant Lover"}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Monitor your plants' health and track essential nutrients to keep them thriving
            </p>
          </div>

          {/* Add Plant Button */}
          <div className="flex justify-center gap-4">
            <Link to="/addplant">
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-button px-8 py-3 rounded-lg transition-all duration-200 hover:shadow-float"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Plant
              </Button>
            </Link>
          
            <Link to="/soil-analytics">
              <Button 
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-button px-8 py-3 rounded-lg transition-all duration-200 hover:shadow-float"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Soil Analytics
              </Button>
            </Link>
            
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-button px-8 py-3 rounded-lg transition-all duration-200 hover:shadow-float"
                  >
                    Modes ↓{" "}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Modes</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link to="/mode/casual">
                    <Leaf className="mr-2 h-4 w-4" />
                    <span>Casual Mode</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to="/mode/outdoor">
                    <Sprout className="mr-2 h-4 w-4" />
                    <span>Outdoor Mode</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to="/mode/entertainment">
                    <FlowerIcon className="mr-2 h-4 w-4" />
                    <span>Entertainment Mode</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
              <p className="mt-4 text-muted-foreground">Loading your plants...</p>
            </div>
          ) : plants.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 space-y-6">
              <div className="p-6 bg-muted/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                <Leaf className="w-12 h-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-foreground">No plants yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Start monitoring your plants' health by adding your first plant to your garden
                </p>
              </div>
            </div>
          ) : (
            /* Plants Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {plants.map(plant => (
                <Card 
                  key={plant.id} 
                  className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-primary/10 cursor-pointer"
                  onClick={() => handlePlantClick(plant)}
                >
                  <div className="h-48 overflow-hidden bg-muted relative">
                    {plant.imageUrl ? (
                      <img 
                        src={plant.imageUrl} 
                        alt={plant.commonName}
                        className="w-full h-full object-cover"
                        onLoad={() => {
                          // Log successful loading of image (base64 or URL)
                          if (isBase64Image(plant.imageUrl || '')) {
                            console.log("Loaded base64 image for plant in dashboard:", plant.commonName);
                          } else {
                            console.log("Loaded URL image for plant in dashboard:", plant.commonName);
                          }
                        }}
                        onError={(e) => {
                          // Fallback for failed images
                          console.error("Failed to load image for plant in dashboard:", plant.commonName);
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                          const icon = document.createElement('div');
                          icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>';
                          (e.target as HTMLImageElement).parentElement!.appendChild(icon);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Leaf className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Overlay buttons */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end">
                      <div className="p-4 w-full flex justify-end">
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePlant(plant.id);
                          }}
                          disabled={deleting === plant.id}
                        >
                          {deleting === plant.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-medium truncate">{plant.commonName}</h3>
                    <p className="text-sm text-muted-foreground italic truncate">
                      {plant.scientificName || "Unknown species"}
                    </p>
                  </CardContent>
                  
                  <CardFooter className="px-4 py-3 bg-muted/30 flex justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{plant.cycle}</span>
                      {plant.wateringSchedule && (
                        <span>• {plant.wateringSchedule} watering</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(plant.dateAdded).toLocaleDateString()}
                    </span>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}