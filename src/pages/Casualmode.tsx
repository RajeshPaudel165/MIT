// src/pages/Casualmode.tsx - Simplified Plant List for AI Analysis
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { usePlants } from '@/hooks/usePlants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Leaf, 
  Sprout,
  Clock,
  Camera
} from 'lucide-react';

const Casualmode: React.FC = () => {
  const { plants, loading } = usePlants();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              AI Plant Analysis
            </h1>
            <p className="text-muted-foreground">
              Select a plant to analyze with AI-powered photo recognition
            </p>
          </div>
          <Button size="sm" className="ml-4" onClick={async () => {
            try {
              await fetch('http://localhost:5001/modes/casual', { method: 'POST' });
            } catch (err) {
              // Optionally show error toast
            }
          }}>
            Launch Casual Mode
          </Button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your plants...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Plants Grid */}
            {plants.length === 0 ? (
              <div className="text-center py-12">
                <Leaf className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No plants added yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Add some plants to start analyzing them with AI
                </p>
                <Link to="/addplant">
                  <Button>
                    <Sprout className="h-4 w-4 mr-2" />
                    Add Your First Plant
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plants.map((plant) => (
                  <Card key={plant.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col space-y-4">
                        {/* Plant Image */}
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          {plant.imageUrl ? (
                            <img
                              src={plant.imageUrl}
                              alt={plant.commonName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Leaf className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Plant Info */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {plant.commonName}
                          </h3>
                          {plant.scientificName && (
                            <p className="text-sm text-muted-foreground italic mb-2">
                              {plant.scientificName}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                            <Clock className="h-4 w-4" />
                            Added {new Date(plant.dateAdded).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Analysis Button */}
                        <Link to={`/casual/${plant.id}`} className="w-full">
                          <Button className="w-full">
                            <Camera className="h-4 w-4 mr-2" />
                            Start AI Analysis
                          </Button>
                        </Link>
                        {/* ...existing code... */}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Casualmode;
