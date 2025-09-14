import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, Timestamp, where, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SoilGauge } from '@/components/SoilGauge';
import { SoilDataChart, SoilDataChartPlaceholder } from '@/components/SoilDataChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  Droplets, 
  Thermometer, 
  Waves, 
  FlaskConical, 
  Leaf, 
  BarChart,
  Calendar,
  RefreshCw,
  LineChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navbar } from '@/components/Navbar';
import { notificationService } from '@/lib/notificationService';
import { usePlants } from '@/hooks/usePlants';



interface SoilData {
  conductivity: number;
  moisture: number;
  nitrogen: number;
  ph: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  timestamp: Timestamp;
}

export function SoilDataDashboard() {
  const { plants } = usePlants();
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [historicalData, setHistoricalData] = useState<SoilData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState('moisture');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Function to check soil conditions and trigger SMS alerts
  const checkSoilConditionsForAlerts = useCallback(async (soilData: SoilData) => {
    try {
      // Convert SoilData to the format expected by notification service
      const soilDataForNotification = {
        ph: soilData.ph,
        moisture: soilData.moisture,
        temperature: soilData.temperature,
        nitrogen: soilData.nitrogen,
        phosphorus: soilData.phosphorus,
        potassium: soilData.potassium,
      };

      // Check alerts for all plants
      for (const plant of plants) {
        await notificationService.testSoilAlert(plant, soilDataForNotification);
      }
    } catch (error) {
      console.error('Error checking soil conditions for alerts:', error);
    }
  }, [plants]);

  const fetchSoilData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      const soilDataRef = collection(db, 'soil_data');
      const q = query(soilDataRef, orderBy('timestamp', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('No soil data available. Please check your sensors.');
        setSoilData(null);
      } else {
        const doc = querySnapshot.docs[0];
        const newSoilData = doc.data() as SoilData;
        setSoilData(newSoilData);
        setError(null);
        setLastUpdated(new Date());
        
        // Check for soil alerts and trigger SMS notifications
        await checkSoilConditionsForAlerts(newSoilData);
      }
    } catch (err) {
      console.error('Error fetching soil data:', err);
      setError('Failed to load soil data. Please try again later.');
      setSoilData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [checkSoilConditionsForAlerts]);

  const fetchHistoricalData = useCallback(async () => {
    try {
      console.log("Fetching historical data...");
      setRefreshing(true);
      
      // Now using the soil_data_history collection instead
      const soilDataHistoryRef = collection(db, 'soil_data_history');
      
      // Get data from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const q = query(
        soilDataHistoryRef,
        where('timestamp', '>=', Timestamp.fromDate(sevenDaysAgo)),
        orderBy('timestamp', 'asc'),
        limit(25) 
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs.map(doc => doc.data() as SoilData);
        console.log(`Fetched ${data.length} historical data points from soil_data_history`, data);
        setHistoricalData(data);
      } else {
        console.log("No historical data found in soil_data_history");
        // Fallback to soil_data collection if no historical data found
        const soilDataRef = collection(db, 'soil_data');
        const fallbackQuery = query(
          soilDataRef,
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        
        const fallbackSnapshot = await getDocs(fallbackQuery);
        if (!fallbackSnapshot.empty) {
          const fallbackData = fallbackSnapshot.docs.map(doc => doc.data() as SoilData);
          console.log(`Fetched ${fallbackData.length} data points from soil_data as fallback`, fallbackData);
          setHistoricalData(fallbackData.reverse()); // Reverse to ensure chronological order
        } else {
          console.log("No data found in either collection");
        }
      }
    } catch (err) {
      console.error('Error fetching historical soil data:', err);
      // Don't set an error message here to avoid confusing the user
      // if current data is available but historical isn't
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Setup real-time data fetching with auto-refresh
  useEffect(() => {
    // Initial fetch
    fetchSoilData();
    fetchHistoricalData();
    
    // Setup interval for auto-refresh (every 5 seconds)
    intervalRef.current = window.setInterval(() => {
      fetchSoilData();
    }, 1); 
    
    // Cleanup function
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [plants, fetchSoilData, fetchHistoricalData]);

  const formatDate = (timestamp: Timestamp | Date | number | string | { seconds: number } | null | undefined) => {
    if (!timestamp) return 'Unknown';
    
    let date: Date;
    
    // Check if it's a Firestore Timestamp
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      date = (timestamp as Timestamp).toDate();
    } 
    // Check if it's already a Date object
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    // Check if it's a timestamp number
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    // Check if it's a string that can be parsed as a date
    else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    }
    // Check if it has seconds property (Firestore timestamp-like object)
    else if (timestamp && timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    }
    else {
      console.warn('Unknown timestamp format:', timestamp);
      return 'Invalid Date';
    }
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date created from timestamp:', timestamp);
      return 'Invalid Date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  if (loading) {
    return <SoilDataSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={fetchSoilData}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!soilData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p>There is no soil data available yet. Please check your sensors.</p>
        </CardContent>
      </Card>
    );
  }

  return (

      
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-center bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-lg">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Leaf className="h-8 w-8 text-primary" />
              Soil Health Dashboard
            </h2>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              Last updated: {soilData?.timestamp ? formatDate(soilData.timestamp) : 'Unknown'}
              {lastUpdated && <span className="ml-2 text-xs inline-flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Data refreshed: {lastUpdated.toLocaleTimeString()}
              </span>}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={fetchSoilData} 
              disabled={refreshing}
              className="bg-card/90 shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="gauges" className="bg-card/50 p-4 rounded-lg shadow-sm border border-primary/10">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="gauges" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
              <Waves className="h-4 w-4" />
              <span>Current Readings</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
              <LineChart className="h-4 w-4" />
              <span>Trends</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
              <BarChart className="h-4 w-4" />
              <span>Summary</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="gauges" className="mt-2">
            <Card className="p-6 border-primary/10 bg-gradient-to-br from-card/80 to-card/100 shadow-sm">
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Waves className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Current Soil Parameters</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1 ml-9">
                  Real-time readings from your soil sensors - monitor your soil health at a glance
                </p>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* pH */}
                <SoilGauge 
                  title="Soil pH"
                  value={soilData?.ph/10 || 0}
                  minValue={3}
                  maxValue={10}
                  optimalMin={5.5}
                  optimalMax={7.5}
                  unit=""
                  description="Acidity/alkalinity level of soil"
                  colorScheme="ph"
                />
              
              {/* Moisture */}
              <SoilGauge 
                title="Soil Moisture"
                value={soilData?.moisture || 0}
                minValue={0}
                maxValue={10}
                optimalMin={4}
                optimalMax={7}
                unit=""
                description="Water content in soil"
              />
              
              {/* Temperature */}
              <SoilGauge 
                title="Soil Temperature"
                value={soilData?.temperature || 0}
                minValue={0}
                maxValue={40}
                optimalMin={15}
                optimalMax={25}
                unit="°C"
                description="Temperature at root level"
                colorScheme="temperature"
              />
              
              {/* Nitrogen */}
              <SoilGauge 
                title="Nitrogen (N)"
                value={soilData?.nitrogen || 0}
                minValue={0}
                maxValue={10}
                optimalMin={4}
                optimalMax={8}
                unit=" ppm"
                description="Essential for leaf growth"
              />
              
              {/* Phosphorus */}
              <SoilGauge 
                title="Phosphorus (P)"
                value={soilData?.phosphorus || 0}
                minValue={0}
                maxValue={10}
                optimalMin={3}
                optimalMax={7}
                unit=" ppm"
                description="Promotes root and flower development"
              />
              
              {/* Potassium */}
              <SoilGauge 
                title="Potassium (K)"
                value={soilData?.potassium || 0}
                minValue={0}
                maxValue={10}
                optimalMin={3.5}
                optimalMax={7.5}
                unit=" ppm"
                description="Enhances overall plant strength"
              />
              
              {/* Conductivity */}
              <SoilGauge 
                title="Conductivity"
                value={soilData?.conductivity || 0}
                minValue={0}
                maxValue={200}
                optimalMin={50}
                optimalMax={150}
                unit=" μS/cm"
                description="Indicates dissolved salt content"
              />
            </div>
          </Card>
          </TabsContent>
          
          <TabsContent value="trends" className="mt-2">
            <Card className="p-6 border-primary/10 bg-gradient-to-br from-card/80 to-card/100 shadow-sm">
              <div className="mb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-2 rounded-full bg-primary/10">
                        <LineChart className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">Soil Parameter Trends</h3>
                    </div>
                    <p className="text-sm text-muted-foreground ml-9">
                      Track changes in soil conditions over time from historical data
                    </p>
                    <div className="text-xs text-muted-foreground mt-1 ml-9 flex items-center gap-1">
                      <BarChart className="h-3 w-3" />
                      <span>Data points: <span className="font-medium">{historicalData.length}</span></span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 bg-card/80 p-3 rounded-lg shadow-sm">
                    <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                      <SelectTrigger className="w-[180px] bg-white/50">
                        <SelectValue placeholder="Select parameter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ph">pH</SelectItem>
                        <SelectItem value="moisture">Moisture</SelectItem>
                        <SelectItem value="temperature">Temperature</SelectItem>
                        <SelectItem value="nitrogen">Nitrogen</SelectItem>
                        <SelectItem value="phosphorus">Phosphorus</SelectItem>
                        <SelectItem value="potassium">Potassium</SelectItem>
                        <SelectItem value="conductivity">Conductivity</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={fetchHistoricalData}
                      disabled={refreshing}
                      className="h-10 bg-white/50"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      Refresh Data
                    </Button>
                  </div>
                </div>
              </div>
            
            {historicalData.length > 0 ? (
              <>
                <SoilDataChart 
                  historicalData={historicalData} 
                  selectedMetric={selectedMetric} 
                />
              </>
            ) : (
              <SoilDataChartPlaceholder />
            )}
            </Card>
          </TabsContent>
          
          <TabsContent value="summary" className="mt-2">
            <Card className="border-primary/10 bg-gradient-to-br from-card/80 to-card/100 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-full bg-primary/10">
                    <BarChart className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Soil Health Summary</CardTitle>
                </div>
                <CardDescription className="ml-9">
                  Overall assessment of your soil condition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {soilData && <SoilHealthSummary soilData={soilData} />}
                  {soilData && <SoilRecommendations soilData={soilData} />}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}

function SoilHealthSummary({ soilData }: { soilData: SoilData }) {
  // Calculate overall health score (simplified example)
  const calculateHealthScore = () => {
    let score = 0;
    let maxScore = 0;
    
    // pH
    maxScore += 10;
    if (soilData.ph >= 5.5 && soilData.ph <= 7.5) {
      score += 10;
    } else if (soilData.ph >= 5 && soilData.ph <= 8) {
      score += 5;
    }
    
    // Moisture
    maxScore += 10;
    if (soilData.moisture >= 40 && soilData.moisture <= 70) {
      score += 10;
    } else if (soilData.moisture >= 30 && soilData.moisture <= 80) {
      score += 5;
    }
    
    // Temperature
    maxScore += 10;
    if (soilData.temperature >= 15 && soilData.temperature <= 25) {
      score += 10;
    } else if (soilData.temperature >= 10 && soilData.temperature <= 30) {
      score += 5;
    }
    
    // NPK - each worth 10 points
    maxScore += 30;
    
    // Nitrogen
    if (soilData.nitrogen >= 40 && soilData.nitrogen <= 80) {
      score += 10;
    } else if (soilData.nitrogen >= 20 && soilData.nitrogen <= 90) {
      score += 5;
    }
    
    // Phosphorus
    if (soilData.phosphorus >= 30 && soilData.phosphorus <= 70) {
      score += 10;
    } else if (soilData.phosphorus >= 15 && soilData.phosphorus <= 85) {
      score += 5;
    }
    
    // Potassium
    if (soilData.potassium >= 35 && soilData.potassium <= 75) {
      score += 10;
    } else if (soilData.potassium >= 20 && soilData.potassium <= 90) {
      score += 5;
    }
    
    return (score / maxScore) * 100;
  };
  
  const healthScore = calculateHealthScore();
  let healthStatus = 'Poor';
  let healthColor = 'text-red-500';
  
  if (healthScore >= 80) {
    healthStatus = 'Excellent';
    healthColor = 'text-green-500';
  } else if (healthScore >= 60) {
    healthStatus = 'Good';
    healthColor = 'text-blue-500';
  } else if (healthScore >= 40) {
    healthStatus = 'Fair';
    healthColor = 'text-amber-500';
  }
  
  return (
    <div className="space-y-4 bg-card/50 p-4 rounded-lg shadow-sm border border-primary/5">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            Overall Soil Health
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Based on combined analysis of all parameters
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "font-bold rounded-full w-20 h-20 flex items-center justify-center shadow-md border-4",
            healthScore >= 80 ? "border-green-500 text-green-700 bg-green-50" :
            healthScore >= 60 ? "border-blue-500 text-blue-700 bg-blue-50" :
            healthScore >= 40 ? "border-amber-500 text-amber-700 bg-amber-50" :
            "border-red-500 text-red-700 bg-red-50"
          )}>
            <div className="flex flex-col items-center">
              <span className="text-2xl">{Math.round(healthScore)}%</span>
              <span className="text-xs -mt-1">{healthStatus}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-3 w-full bg-muted rounded-full mt-2 mb-4 overflow-hidden shadow-inner">
        <div 
          className={cn(
            "h-3 rounded-full transition-all duration-300",
            healthScore >= 80 ? 'bg-green-500' : 
            healthScore >= 60 ? 'bg-blue-500' : 
            healthScore >= 40 ? 'bg-amber-500' : 
            'bg-red-500'
          )}
          style={{ width: `${healthScore}%` }}
        ></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="space-y-2 bg-card p-3 rounded-lg shadow-sm">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <div className="p-1 rounded-full bg-green-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-600">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            Strengths
          </h4>
          <ul className="text-sm space-y-1">
            {soilData.ph >= 5.5 && soilData.ph <= 7.5 && <li className="text-green-600 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span> Good pH balance</li>}
            {soilData.moisture >= 40 && soilData.moisture <= 70 && <li className="text-green-600 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span> Optimal moisture level</li>}
            {soilData.temperature >= 15 && soilData.temperature <= 25 && <li className="text-green-600 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span> Ideal soil temperature</li>}
            {soilData.nitrogen >= 40 && soilData.nitrogen <= 80 && <li className="text-green-600 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span> Sufficient nitrogen</li>}
            {soilData.phosphorus >= 30 && soilData.phosphorus <= 70 && <li className="text-green-600 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span> Good phosphorus level</li>}
            {soilData.potassium >= 35 && soilData.potassium <= 75 && <li className="text-green-600 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span> Adequate potassium</li>}
          </ul>
        </div>
        
        <div className="space-y-2 bg-card p-3 rounded-lg shadow-sm">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <div className="p-1 rounded-full bg-amber-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-600">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            Areas for Improvement
          </h4>
          <ul className="text-sm space-y-1">
            {(soilData.ph < 5.5 || soilData.ph > 7.5) && <li className="text-amber-600 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full"></span> pH needs adjustment</li>}
            {(soilData.moisture < 40 || soilData.moisture > 70) && <li className="text-amber-600 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Moisture needs adjustment</li>}
            {(soilData.temperature < 15 || soilData.temperature > 25) && <li className="text-amber-600 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Temperature not optimal</li>}
            {(soilData.nitrogen < 40 || soilData.nitrogen > 80) && <li className="text-amber-600 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Nitrogen needs adjustment</li>}
            {(soilData.phosphorus < 30 || soilData.phosphorus > 70) && <li className="text-amber-600 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Phosphorus needs adjustment</li>}
            {(soilData.potassium < 35 || soilData.potassium > 75) && <li className="text-amber-600 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Potassium needs adjustment</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SoilRecommendations({ soilData }: { soilData: SoilData }) {
  // Generate recommendations based on soil data
  const getRecommendations = () => {
    const recommendations = [];
    
    // pH recommendations
    if (soilData.ph < 5.5) {
      recommendations.push({
        issue: 'Low pH (acidic soil)',
        solution: 'Add garden lime or wood ash to raise pH. Incorporate well into the soil.',
        icon: <FlaskConical className="h-5 w-5 text-amber-500" />
      });
    } else if (soilData.ph > 7.5) {
      recommendations.push({
        issue: 'High pH (alkaline soil)',
        solution: 'Add sulfur, pine needles, or peat moss to lower pH. Work into the soil thoroughly.',
        icon: <FlaskConical className="h-5 w-5 text-amber-500" />
      });
    }
    
    // Moisture recommendations
    if (soilData.moisture < 40) {
      recommendations.push({
        issue: 'Low moisture',
        solution: 'Increase watering frequency and consider adding mulch to retain moisture.',
        icon: <Droplets className="h-5 w-5 text-amber-500" />
      });
    } else if (soilData.moisture > 70) {
      recommendations.push({
        issue: 'High moisture',
        solution: 'Reduce watering and improve drainage. Consider adding sand or perlite to heavy soils.',
        icon: <Droplets className="h-5 w-5 text-amber-500" />
      });
    }
    
    // NPK recommendations
    if (soilData.nitrogen < 40) {
      recommendations.push({
        issue: 'Low nitrogen',
        solution: 'Add nitrogen-rich fertilizers like blood meal, composted manure, or balanced NPK fertilizer.',
        icon: <Leaf className="h-5 w-5 text-amber-500" />
      });
    } else if (soilData.nitrogen > 80) {
      recommendations.push({
        issue: 'High nitrogen',
        solution: 'Avoid adding nitrogen fertilizers. Plant nitrogen-loving crops like leafy greens or corn.',
        icon: <Leaf className="h-5 w-5 text-amber-500" />
      });
    }
    
    if (soilData.phosphorus < 30) {
      recommendations.push({
        issue: 'Low phosphorus',
        solution: 'Add bone meal, rock phosphate, or phosphorus-rich fertilizer to improve levels.',
        icon: <Leaf className="h-5 w-5 text-amber-500" />
      });
    }
    
    if (soilData.potassium < 35) {
      recommendations.push({
        issue: 'Low potassium',
        solution: 'Add wood ash, kelp meal, or potassium-rich fertilizer to increase levels.',
        icon: <Leaf className="h-5 w-5 text-amber-500" />
      });
    }
    
    // Temperature recommendations
    if (soilData.temperature < 15) {
      recommendations.push({
        issue: 'Low soil temperature',
        solution: 'Use black plastic mulch to warm soil. Consider raised beds or cold frames.',
        icon: <Thermometer className="h-5 w-5 text-amber-500" />
      });
    } else if (soilData.temperature > 25) {
      recommendations.push({
        issue: 'High soil temperature',
        solution: 'Apply organic mulch to insulate soil. Water more frequently during hot periods.',
        icon: <Thermometer className="h-5 w-5 text-amber-500" />
      });
    }
    
    return recommendations;
  };
  
  const recommendations = getRecommendations();
  
  return (
    <div className="space-y-4 bg-card/50 p-4 rounded-lg shadow-sm border border-primary/5">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-full bg-primary/10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium">Recommendations</h3>
      </div>
      
      {recommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-green-500 mb-2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="m9 11 3 3L22 4" />
          </svg>
          <p className="text-green-700 font-medium">Your soil conditions look great!</p>
          <p className="text-sm text-green-600">Continue with your current practices.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendations.map((rec, index) => (
            <div key={index} className="bg-white p-3 rounded-lg border border-primary/5 shadow-sm hover:shadow-md transition-all duration-300 flex gap-3 items-start">
              <div className="p-2 rounded-full bg-primary/10 shrink-0">
                {rec.icon}
              </div>
              <div>
                <h4 className="font-medium text-primary">{rec.issue}</h4>
                <p className="text-sm text-muted-foreground">{rec.solution}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SoilDataSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-lg">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>
      
      <div className="bg-card/50 p-4 rounded-lg shadow-sm border border-primary/10">
        <Skeleton className="h-10 w-full mb-6" />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden border-2 hover:shadow-lg transition-all duration-300 hover:border-primary/40 bg-card/90">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-4 w-48 mt-1" />
                  </div>
                  <Skeleton className="h-16 w-16 rounded-full" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="pt-4">
                  <Skeleton className="h-3 w-full rounded-full mb-3" />
                  <div className="flex justify-between mb-1">
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <div className="mt-3">
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-2 px-6">
                <Skeleton className="h-1 w-full rounded-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
