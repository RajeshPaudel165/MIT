import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, TestTube, RefreshCw } from 'lucide-react';
import { sendEmail, sendSoilAlert, sendWeatherAlert, EmailData } from '@/lib/emailService';
import { useToast } from '@/hooks/use-toast';
import { usePlants } from '@/hooks/usePlants';
import { useAuth } from '@/hooks/useAuth';

interface EmailNotificationSettings {
  enableSoilAlerts: boolean;
  enableWeatherAlerts: boolean;
  soilCheckInterval: number; // in minutes
  weatherCheckInterval: number; // in minutes
}

export function EmailNotificationSettingsCard() {
  const { toast } = useToast();
  const { plants } = usePlants();
  const { user } = useAuth();
  const [settings, setSettings] = useState<EmailNotificationSettings>({
    enableSoilAlerts: false,
    enableWeatherAlerts: false,
    soilCheckInterval: 60, // 1 hour
    weatherCheckInterval: 360, // 6 hours
  });
  const [isActive, setIsActive] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('emailNotificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    const isNotificationActive = localStorage.getItem('emailNotificationActive') === 'true';
    setIsActive(isNotificationActive);
  }, []);

  const saveSettings = (newSettings: EmailNotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem('emailNotificationSettings', JSON.stringify(newSettings));
  };

  const toggleNotifications = (enabled: boolean) => {
    setIsActive(enabled);
    localStorage.setItem('emailNotificationActive', enabled.toString());
    
    if (enabled) {
      toast({
        title: "Email notifications enabled",
        description: "You'll receive alerts about soil and weather conditions.",
      });
    } else {
      toast({
        title: "Email notifications disabled",
        description: "You won't receive any email alerts.",
      });
    }
  };

  const testEmailNotification = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "No email address found. Please ensure you're logged in.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      await sendEmail({
        to: user.email,
        subject: "🌱 Test Email from Soil Savvy Suite",
        message: `
          This is a test email from Soil Savvy Suite!
          
          Your email notifications are working correctly. You'll receive alerts when:
          
          ✅ Soil conditions need attention
          ✅ Weather conditions may affect your plants
          ✅ Plants require care or watering
          
          Thank you for using Soil Savvy Suite! 🌿
        `
      });

      toast({
        title: "Test email sent!",
        description: `Check your inbox at ${user.email}`,
      });
    } catch (error) {
      console.error('Failed to send test email:', error);
      toast({
        title: "Failed to send test email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (!isActive) return;

    const handleSoilCheck = async () => {
      if (!user?.email || !isActive || !settings.enableSoilAlerts) return;

      // Simulate soil condition check
      const mockSoilData = {
        ph: 6.2,
        moisture: 25,
        temperature: 22,
        nutrients: "Low nitrogen"
      };

      try {
        await sendSoilAlert(user.email, "Low Moisture Detected", mockSoilData);
        console.log("Soil alert email sent");
      } catch (error) {
        console.error("Failed to send soil alert:", error);
      }
    };

    const handleWeatherCheck = async () => {
      if (!user?.email || !isActive || !settings.enableWeatherAlerts) return;

      // Simulate weather condition check
      const mockWeatherData = {
        condition: "Heavy Rain Expected",
        temperature: 18,
        humidity: 85,
        precipitation: "15mm expected"
      };

      try {
        await sendWeatherAlert(user.email, "Heavy Rain Alert", mockWeatherData);
        console.log("Weather alert email sent");
      } catch (error) {
        console.error("Failed to send weather alert:", error);
      }
    };

    // Set up intervals for checking conditions
    const soilInterval = setInterval(handleSoilCheck, settings.soilCheckInterval * 60 * 1000);
    const weatherInterval = setInterval(handleWeatherCheck, settings.weatherCheckInterval * 60 * 1000);

    return () => {
      clearInterval(soilInterval);
      clearInterval(weatherInterval);
    };
  }, [isActive, settings, user?.email]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Email Address</h3>
              <p className="text-sm text-muted-foreground">
                {user?.email || "No email address found"}
              </p>
            </div>
            <Badge variant={user?.email ? "default" : "secondary"}>
              {user?.email ? "Connected" : "Not Available"}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Master Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-medium">Enable Email Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Receive alerts about soil and weather conditions
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={toggleNotifications}
            disabled={!user?.email}
          />
        </div>

        {/* Alert Types */}
        {isActive && (
          <div className="space-y-4">
            <Separator />
            
            <div className="space-y-4">
              <h3 className="font-medium">Alert Types</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium">Soil Condition Alerts</h4>
                  <p className="text-xs text-muted-foreground">
                    Get notified when soil needs attention
                  </p>
                </div>
                <Switch
                  checked={settings.enableSoilAlerts}
                  onCheckedChange={(checked) => 
                    saveSettings({ ...settings, enableSoilAlerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium">Weather Alerts</h4>
                  <p className="text-xs text-muted-foreground">
                    Get notified about weather that affects plants
                  </p>
                </div>
                <Switch
                  checked={settings.enableWeatherAlerts}
                  onCheckedChange={(checked) => 
                    saveSettings({ ...settings, enableWeatherAlerts: checked })
                  }
                />
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Test Email */}
        <div className="space-y-3">
          <h3 className="font-medium">Test Email Notifications</h3>
          <Button
            onClick={testEmailNotification}
            disabled={testing || !user?.email}
            className="w-full"
            variant="outline"
          >
            {testing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending Test Email...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Test emails help verify your notification system is working
          </p>
        </div>

        {/* Status Info */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">Notification Status</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Email Alerts:</span>
              <Badge variant={isActive ? "default" : "secondary"} className="ml-2">
                {isActive ? "Active" : "Disabled"}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Plants Monitored:</span>
              <Badge variant="outline" className="ml-2">
                {plants?.length || 0}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}