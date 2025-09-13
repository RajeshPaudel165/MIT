import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  ThermometerSnowflake,
  ThermometerSun, 
  Droplets, 
  Droplet,
  Thermometer,
  FlaskConical,
  Leaf,
  Sprout,
  Flower
} from 'lucide-react';

interface SoilGaugeProps {
  title: string;
  value: number;
  minValue: number;
  maxValue: number;
  optimalMin: number;
  optimalMax: number;
  unit: string;
  description?: string;
  colorScheme?: 'default' | 'ph' | 'temperature';
}

export function SoilGauge({
  title,
  value,
  minValue,
  maxValue,
  optimalMin,
  optimalMax,
  unit,
  description,
  colorScheme = 'default'
}: SoilGaugeProps) {
  // Calculate percentage for the gauge
  const percentage = Math.max(0, Math.min(100, ((value - minValue) / (maxValue - minValue)) * 100));
  
  // Determine color based on value being in optimal range
  const getColor = () => {
    if (colorScheme === 'ph') {
      if (value < 5.5) return 'bg-orange-500 border-orange-500'; // Acidic
      if (value > 7.5) return 'bg-purple-500 border-purple-500'; // Alkaline
      return 'bg-green-500 border-green-500'; // Neutral
    }
    
    if (colorScheme === 'temperature') {
      if (value < optimalMin) return 'bg-blue-500 border-blue-500'; // Cold
      if (value > optimalMax) return 'bg-red-500 border-red-500'; // Hot
      return 'bg-green-500 border-green-500'; // Good
    }
    
    // Default color scheme
    if (value < optimalMin) return 'bg-amber-500 border-amber-500';
    if (value > optimalMax) return 'bg-amber-500 border-amber-500';
    return 'bg-green-500 border-green-500';
  };
  
  const getLevelText = () => {
    if (value < optimalMin) return 'Low';
    if (value > optimalMax) return 'High';
    return 'Optimal';
  };
  
  const getStatusColor = () => {
    if (value < optimalMin) {
      return {
        bg: 'bg-amber-500',
        bgLight: 'bg-amber-100',
        text: 'text-amber-700',
        gradient: 'from-amber-50 to-amber-100',
        border: 'border-amber-400'
      };
    }
    if (value > optimalMax) {
      return {
        bg: 'bg-red-500',
        bgLight: 'bg-red-100',
        text: 'text-red-700',
        gradient: 'from-red-50 to-red-100',
        border: 'border-red-400'
      };
    }
    return {
      bg: 'bg-green-500',
      bgLight: 'bg-green-100',
      text: 'text-green-700',
      gradient: 'from-green-50 to-green-100',
      border: 'border-green-400'
    };
  };
  
  const getIcon = () => {
    // Return the appropriate icon based on the parameter and its value
    if (title.includes('Temperature')) {
      return value < optimalMin 
        ? <ThermometerSnowflake className="h-5 w-5" /> 
        : value > optimalMax 
          ? <ThermometerSun className="h-5 w-5" /> 
          : <ThermometerSun className="h-5 w-5" />;
    }
    
    if (title.includes('Moisture')) {
      return value < optimalMin 
        ? <Droplet className="h-5 w-5" /> 
        : value > optimalMax 
          ? <Droplets className="h-5 w-5" /> 
          : <Droplet className="h-5 w-5" />;
    }
    
    if (title.includes('pH')) {
      return <FlaskConical className="h-5 w-5" />;
    }
    
    if (title.includes('Nitrogen')) {
      return <Leaf className="h-5 w-5" />;
    }
    
    if (title.includes('Phosphorus')) {
      return <Sprout className="h-5 w-5" />;
    }
    
    if (title.includes('Potassium')) {
      return <Flower className="h-5 w-5" />;
    }
    
    // Default icon
    return <Leaf className="h-5 w-5" />;
  };
  
  const levelText = getLevelText();
  const statusColor = getStatusColor();
  const gaugeColor = getColor();
  const icon = getIcon();
  
  return (
    <Card className="overflow-hidden border-2 hover:shadow-lg transition-all duration-300 hover:border-primary/40 bg-card/90">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <span className={cn(
              "p-1.5 rounded-full shadow-sm", 
              `bg-gradient-to-br ${statusColor.gradient} ${statusColor.text}`
            )}>
              {icon}
            </span>
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </div>
        
        <div className={cn(
          "text-sm font-medium rounded-full w-16 h-16 flex items-center justify-center border-[3px] transition-all duration-300 shadow-sm",
          `${statusColor.border} ${statusColor.text} bg-gradient-to-br ${statusColor.gradient}`
        )}>
          <div className="flex flex-col items-center">
            <span className="font-bold text-base">{value}</span>
            <span className="text-xs -mt-1 opacity-80">{unit}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="relative pt-2">
          {/* Track with background */}
          <div className="h-3 w-full bg-gray-100 rounded-full shadow-inner overflow-hidden relative">
            {/* Progress bar */}
            <div 
              className={cn(
                "h-full transition-all duration-300",
                value < optimalMin ? "bg-amber-500" : // Low
                value > optimalMax ? "bg-red-500" : // High
                "bg-green-500" // Optimal
              )}
              style={{ width: `${percentage}%` }}
            ></div>
            
            {/* Optimal range indicator */}
            <div 
              className="absolute h-3 border-l-2 border-r-2 border-white/70 top-0 pointer-events-none" 
              style={{ 
                left: `${((optimalMin - minValue) / (maxValue - minValue)) * 100}%`,
                width: `${((optimalMax - optimalMin) / (maxValue - minValue)) * 100}%`
              }}
            />
            
            {/* Pointer indicator */}
            <div 
              className="absolute rounded-full bg-white shadow-md border-2 flex items-center justify-center transition-all duration-300"
              style={{ 
                left: `${percentage}%`, 
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '18px',
                height: '18px',
                borderColor: value < optimalMin ? '#f59e0b' : value > optimalMax ? '#ef4444' : '#22c55e'
              }}
            >
              <div className={cn(
                "rounded-full",
                statusColor.bg
              )}
              style={{ width: '8px', height: '8px' }}
              ></div>
            </div>
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span className="font-medium">{minValue}{unit}</span>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full shadow-sm",
              value < optimalMin ? "bg-amber-100 text-amber-700" : // Low
              value > optimalMax ? "bg-red-100 text-red-700" : // High
              "bg-green-100 text-green-700" // Optimal
            )}>
              {levelText}
            </span>
            <span className="font-medium">{maxValue}{unit}</span>
          </div>
          
          <div className="mt-3 flex justify-between items-center">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                <span className="font-medium">Optimal:</span>
              </div>
              <span>{optimalMin} - {optimalMax}{unit}</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 pb-2 px-6">
        <div className={cn(
          "w-full h-1 rounded-full",
          value < optimalMin ? "bg-amber-200" : // Low
          value > optimalMax ? "bg-red-200" : // High
          "bg-green-200" // Optimal
        )}></div>
      </CardFooter>
    </Card>
  );
}
