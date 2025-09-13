import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, Smartphone, TestTube, RefreshCw } from 'lucide-react';
import { notificationService, NotificationSettings, SoilData, WeatherData } from '@/lib/notificationService';
import { sendSms, SMS_TEMPLATES } from '@/lib/sinchSms';
import { useToast } from '@/hooks/use-toast';
import { usePlants } from '@/hooks/usePlants';
import { useAuth } from '@/hooks/useAuth';
import { getUserPhoneNumber } from '@/lib/userData';

export function NotificationSettingsCard() {
  const { toast } = useToast();
  const { plants } = usePlants();
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    enableSoilAlerts: false,
    enableWeatherAlerts: false,
    soilCheckInterval: 60, // 1 hour
    weatherCheckInterval: 360, // 6 hours
  });
  const [isActive, setIsActive] = useState(false);
  const [testing, setTesting] = useState(false);
  const [userPhoneNumber, setUserPhoneNumber] = useState<string>('');
  const [refreshingPhone, setRefreshingPhone] = useState(false);

  // Manual refresh function for phone number
  const handleRefreshPhone = async () => {
    if (!user) return;
    setRefreshingPhone(true);
    try {
      const phoneNumber = await getUserPhoneNumber(user);
      setUserPhoneNumber(phoneNumber || '');
      toast({
        title: "Phone Number Refreshed",
        description: phoneNumber ? `Updated to: ${phoneNumber}` : "No phone number found",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh phone number",
        variant: "destructive",
      });
    } finally {
      setRefreshingPhone(false);
    }
  };

  useEffect(() => {
    // Load existing settings
    const saved = localStorage.getItem('notification-settings');
    if (saved) {
      setSettings(JSON.parse(saved));
      setIsActive(true);
    }

    // Load user's phone number
    const loadUserPhone = async () => {
      if (user) {
        const phoneNumber = await getUserPhoneNumber(user);
        setUserPhoneNumber(phoneNumber || '');
      }
    };
    loadUserPhone();
    
    // Set up an interval to periodically refresh phone number
    const interval = setInterval(loadUserPhone, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  const handleSaveSettings = () => {
    if (!userPhoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please update your profile with a phone number to receive SMS alerts.",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(userPhoneNumber.replace(/\s/g, ''))) {
      toast({
        title: "Invalid Phone Number",
        description: "Please update your profile with a valid phone number (e.g., +1234567890).",
        variant: "destructive",
      });
      return;
    }

    notificationService.updateSettings(settings);
    notificationService.start();
    setIsActive(true);

    toast({
      title: "Settings Saved! 📱",
      description: "SMS notifications are now active. You'll receive alerts for soil and weather conditions.",
    });
  };

  const handleStopNotifications = () => {
    notificationService.stop();
    setIsActive(false);
    toast({
      title: "Notifications Stopped",
      description: "SMS alerts have been disabled.",
    });
  };

  const handleTestSms = async () => {
    if (!userPhoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please update your profile with a phone number first.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      const success = await sendSms(
        userPhoneNumber,
        "🌱 Test SMS from Soil Savvy Suite! Your notification system is working correctly."
      );

      if (success) {
        toast({
          title: "Test SMS Sent! 📱",
          description: "Check your phone for the test message.",
        });
      } else {
        toast({
          title: "SMS Failed",
          description: "Could not send test SMS. Please check your phone number and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test SMS. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTestSoilAlert = async () => {
    if (!plants.length) {
      toast({
        title: "No Plants Found",
        description: "Add some plants first to test soil alerts.",
        variant: "destructive",
      });
      return;
    }

    const testPlant = plants[0];
    const testSoilData: SoilData = {
      ph: 4.8, // Too low - will trigger alert
      moisture: 15, // Too low - will trigger alert
      temperature: 22,
      nitrogen: 25, // Low - will trigger alert
      phosphorus: 40,
      potassium: 35,
    };

    try {
      await notificationService.testSoilAlert(testPlant, testSoilData);
      toast({
        title: "Soil Alert Test Sent! 🌱",
        description: `Test soil alerts sent for ${testPlant.commonName}.`,
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Could not send soil alert test.",
        variant: "destructive",
      });
    }
  };

  const handleTestWeatherAlert = async () => {
    if (!plants.length) {
      toast({
        title: "No Plants Found",
        description: "Add some plants first to test weather alerts.",
        variant: "destructive",
      });
      return;
    }

    const testPlant = plants[0];
    const testWeatherData: WeatherData = {
      temperature: 25,
      humidity: 70,
      precipitation: 5,
      uvIndex: 6,
      windSpeed: 10,
      forecast: {
        rain: true,
        rainAmount: 25, // Heavy rain - will trigger alert
        lowTemp: 1, // Frost warning - will trigger alert
        highTemp: 36, // Heat warning - will trigger alert
      }
    };

    try {
      await notificationService.testWeatherAlert(testPlant, testWeatherData);
      toast({
        title: "Weather Alert Test Sent! 🌧️",
        description: `Test weather alerts sent for ${testPlant.commonName}.`,
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Could not send weather alert test.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          SMS Notifications
          {isActive && <Badge variant="outline" className="text-green-600">Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phone Number Display */}
        <div className="space-y-2">
          <Label>Phone Number for SMS Alerts</Label>
          <div className="flex gap-2">
            <div className="flex-1 p-3 bg-muted rounded border text-sm">
              {userPhoneNumber || 'No phone number on file'}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshPhone}
              disabled={refreshingPhone}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshingPhone ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTestSms}
              disabled={testing || !userPhoneNumber}
            >
              <Smartphone className="h-4 w-4 mr-1" />
              {testing ? 'Sending...' : 'Test'}
            </Button>
          </div>
          {!userPhoneNumber && (
            <p className="text-xs text-amber-600">
              Please add a phone number in your profile settings to receive SMS alerts
            </p>
          )}
        </div>

        <Separator />

        {/* Soil Alerts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Soil Condition Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when pH, moisture, or nutrient levels are poor
              </p>
            </div>
            <Switch
              checked={settings.enableSoilAlerts}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableSoilAlerts: checked }))}
            />
          </div>

          {settings.enableSoilAlerts && (
            <div className="space-y-3 pl-4 border-l-2 border-green-200">
              <div className="space-y-2">
                <Label>Check Interval (minutes)</Label>
                <Input
                  type="number"
                  min="15"
                  max="1440"
                  value={settings.soilCheckInterval}
                  onChange={(e) => setSettings(prev => ({ ...prev, soilCheckInterval: parseInt(e.target.value) || 60 }))}
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTestSoilAlert}
                className="w-full"
              >
                <TestTube className="h-4 w-4 mr-1" />
                Test Soil Alerts
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Weather Alerts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Weather Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about rain, frost, heat waves, and other weather conditions
              </p>
            </div>
            <Switch
              checked={settings.enableWeatherAlerts}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableWeatherAlerts: checked }))}
            />
          </div>

          {settings.enableWeatherAlerts && (
            <div className="space-y-3 pl-4 border-l-2 border-blue-200">
              <div className="space-y-2">
                <Label>Check Interval (minutes)</Label>
                <Input
                  type="number"
                  min="60"
                  max="1440"
                  value={settings.weatherCheckInterval}
                  onChange={(e) => setSettings(prev => ({ ...prev, weatherCheckInterval: parseInt(e.target.value) || 360 }))}
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTestWeatherAlert}
                className="w-full"
              >
                <TestTube className="h-4 w-4 mr-1" />
                Test Weather Alerts
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isActive ? (
            <Button onClick={handleSaveSettings} className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              Start SMS Notifications
            </Button>
          ) : (
            <>
              <Button onClick={handleSaveSettings} variant="outline" className="flex-1">
                Update Settings
              </Button>
              <Button onClick={handleStopNotifications} variant="destructive" className="flex-1">
                Stop Notifications
              </Button>
            </>
          )}
        </div>

        {/* Alert Types Info */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium">You'll receive alerts for:</p>
          <ul className="space-y-1 pl-4">
            <li>• Soil pH too high or low</li>
            <li>• Soil moisture too dry or wet</li>
            <li>• Low nutrient levels (N, P, K)</li>
            <li>• Heavy rain warnings</li>
            <li>• Frost warnings</li>
            <li>• Heat wave alerts</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}