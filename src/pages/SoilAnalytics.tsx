import { Navbar } from "@/components/Navbar";
import { SoilDataDashboard } from "@/components/SoilDataDashboard";
import PlantSoilRequirementsSection from "@/components/PlantSoilRequirementsSection";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2, Leaf, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlants } from "@/hooks/usePlants";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SoilAnalytics() {
  const { user, loading } = useAuth();
  const { plants, loading: plantsLoading } = usePlants();
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  const selectedPlant = selectedPlantId ? plants.find(p => p.id === selectedPlantId) : null;
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar showBackButton={true}/>
      
      <main className="container py-8 px-4 md:px-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="w-full max-w-md mx-auto mb-8">
            <TabsTrigger value="dashboard" className="flex-1 py-3 data-[state=active]:bg-primary/20">
              <BarChart3 className="h-4 w-4 mr-2" />
              Soil Dashboard
            </TabsTrigger>
            <TabsTrigger value="plants" className="flex-1 py-3 data-[state=active]:bg-primary/20">
              <Leaf className="h-4 w-4 mr-2" />
              Plant Requirements
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-0">
            <SoilDataDashboard />
          </TabsContent>
          
          <TabsContent value="plants" className="mt-0">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Plant Soil Requirements</CardTitle>
                  <CardDescription>
                    Select a plant from your garden to view its soil requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {plantsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : plants.length === 0 ? (
                    <p className="text-muted-foreground">No plants in your garden yet</p>
                  ) : (
                    <Select onValueChange={setSelectedPlantId}>
                      <SelectTrigger className="w-full md:w-[250px]">
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
              
              {selectedPlant && <PlantSoilRequirementsSection plant={selectedPlant} />}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
