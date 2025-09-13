import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Thermometer, 
  Droplets, 
  Wind,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const BACKEND_URL = 'http://localhost:5001';

interface WeatherData {
  temperature: number;
  humidity: number;
  description: string;
  main: string;
  wind_speed: number;
  visibility: number;
  uv_index?: number;
  timestamp: string;
  source?: string;
  soil_context?: {
    soil_temperature: number;
    soil_moisture: number;
  };
}

interface WeatherAlert {
  type: string;
  severity: string;
  message: string;
  recommendations: string[];
}

export function WeatherMonitorCard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/weather/current`);
      const data = await response.json();
      
      if (response.ok) {
        setWeather(data);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch weather');
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
      toast({
        title: "Weather Error",
        description: "Failed to fetch weather data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkWeatherAlerts = async () => {
    if (!user?.email) {
      toast({
        title: "Email Required",
        description: "Please sign in to receive weather alerts",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/weather/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setWeather(data.weather);
        setAlerts(data.alerts);
        setLastUpdated(new Date());
        
        if (data.alerts.length > 0) {
          toast({
            title: "Weather Alerts Generated",
            description: `${data.alerts.length} weather alert(s) sent to your email`,
          });
        } else {
          toast({
            title: "No Weather Alerts",
            description: "Current weather conditions are safe for your plants",
          });
        }
      } else {
        throw new Error(data.error || 'Failed to check weather alerts');
      }
    } catch (error) {
      console.error('Error checking weather alerts:', error);
      toast({
        title: "Alert Error",
        description: "Failed to check weather alerts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (main: string) => {
    switch (main.toLowerCase()) {
      case 'clear':
      case 'sun':
        return <Sun className="w-6 h-6 text-yellow-500" />;
      case 'rain':
      case 'drizzle':
      case 'thunderstorm':
        return <CloudRain className="w-6 h-6 text-blue-500" />;
      case 'clouds':
        return <Cloud className="w-6 h-6 text-gray-500" />;
      default:
        return <Sun className="w-6 h-6 text-yellow-500" />;
    }
  };

  const getDataSourceIcon = (source?: string) => {
    switch (source) {
      case 'outdoor_sensors':
        return '🌿 Outdoor Sensors';
      case 'soil_sensors_estimated':
        return '🌱 Soil Sensors';
      case 'openweather_api':
        return '🌐 Weather API';
      case 'mock':
      default:
        return '🔄 Demo Data';
    }
  };

  const getDataSourceColor = (source?: string) => {
    switch (source) {
      case 'outdoor_sensors':
        return 'text-green-600';
      case 'soil_sensors_estimated':
        return 'text-blue-600';
      case 'openweather_api':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  useEffect(() => {
    const loadWeather = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/weather/current`);
        const data = await response.json();
        
        if (response.ok) {
          setWeather(data);
          setLastUpdated(new Date());
        } else {
          throw new Error(data.error || 'Failed to fetch weather');
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
        toast({
          title: "Weather Error",
          description: "Failed to fetch weather data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadWeather();
    
    // Auto-refresh every 30 minutes
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [toast]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Weather Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Weather */}
        {weather && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getWeatherIcon(weather.main)}
                <div>
                  <h3 className="font-semibold text-lg">{weather.temperature}°C</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {weather.description}
                  </p>
                  <p className={`text-xs ${getDataSourceColor(weather.source)}`}>
                    {getDataSourceIcon(weather.source)}
                  </p>
                </div>
              </div>
              <Button
                onClick={fetchWeather}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Soil Context */}
            {weather.soil_context && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                  🌱 Soil Context
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-green-600">Soil Temp:</span>{' '}
                    <span className="font-medium">{weather.soil_context.soil_temperature}°C</span>
                  </div>
                  <div>
                    <span className="text-green-600">Soil Moisture:</span>{' '}
                    <span className="font-medium">{weather.soil_context.soil_moisture}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Weather Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Humidity: {weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Wind: {weather.wind_speed} km/h</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Visibility: {weather.visibility} km</span>
              </div>
              {weather.uv_index && (
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">UV Index: {weather.uv_index}</span>
                </div>
              )}
            </div>

            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Weather Alerts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Weather Alerts</h3>
            <Button
              onClick={checkWeatherAlerts}
              disabled={loading || !user?.email}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              Check Alerts
            </Button>
          </div>

          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <Alert key={index} className="border-l-4 border-l-orange-500">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity} severity
                        </Badge>
                        <span className="font-medium">{alert.type.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      <div className="bg-muted/50 p-2 rounded text-xs">
                        <strong>Recommendations:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {alert.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">No weather alerts - conditions are good for your plants!</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Alert Settings */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <h4 className="font-medium text-sm">🌦️ Automatic Weather Monitoring</h4>
          <p className="text-xs text-muted-foreground">
            The system monitors for:
          </p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            <li>☀️ Extreme heat and intense sunlight (30°C+)</li>
            <li>🌧️ Heavy rain and storms</li>
            <li>🌵 Very dry conditions (low humidity + high temp)</li>
            <li>☀️ High UV index conditions</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Email alerts are sent automatically when dangerous conditions are detected.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}