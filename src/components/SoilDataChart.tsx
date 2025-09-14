import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Timestamp } from 'firebase/firestore';
import { LineChart } from 'lucide-react';



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

interface SoilDataChartProps {
  historicalData: SoilData[];
  selectedMetric: string;
}

// Map of each metric to its optimal range and units for display
const metricConfig = {
  ph: { 
    min: 3, 
    max: 10, 
    optimalMin: 5.5, 
    optimalMax: 7.5, 
    unit: '', 
    label: 'pH',
    color: '#8884d8'
  },
  moisture: { 
    min: 0, 
    max: 10, 
    optimalMin: 4, 
    optimalMax: 7, 
    unit: '%', 
    label: 'Moisture',
    color: '#82ca9d'
  },
  temperature: { 
    min: 0, 
    max: 40, 
    optimalMin: 15, 
    optimalMax: 25, 
    unit: '°C', 
    label: 'Temperature',
    color: '#ff7300'
  },
  nitrogen: { 
    min: 0, 
    max: 10, 
    optimalMin: 4, 
    optimalMax: 8, 
    unit: ' ppm', 
    label: 'Nitrogen',
    color: '#0088FE'
  },
  phosphorus: { 
    min: 0, 
    max: 10, 
    optimalMin: 3, 
    optimalMax: 7, 
    unit: ' ppm', 
    label: 'Phosphorus',
    color: '#00C49F'
  },
  potassium: { 
    min: 0, 
    max: 10, 
    optimalMin: 3.5, 
    optimalMax: 7.5, 
    unit: ' ppm', 
    label: 'Potassium',
    color: '#FFBB28'
  },
  conductivity: { 
    min: 0, 
    max: 2000, 
    optimalMin: 500, 
    optimalMax: 1500, 
    unit: ' μS/cm', 
    label: 'Conductivity',
    color: '#FF8042'
  }
};

export function SoilDataChart({ historicalData, selectedMetric }: SoilDataChartProps) {
  const [showDataPoints, setShowDataPoints] = React.useState(true);
  
  // Sort data by timestamp to ensure chronological order
  const sortedData = [...historicalData].sort((a, b) => 
    a.timestamp.seconds - b.timestamp.seconds
  );

  // Format data for charting
  const chartData = sortedData.map(data => {
    const date = data.timestamp.toDate();
    // Create a more readable date/time format
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return {
      timestamp: date.getTime(), // Store timestamp for sorting
      date: formattedDate,
      time: formattedTime,
      [selectedMetric]: data[selectedMetric as keyof SoilData] as number,
      label: `${formattedDate} ${formattedTime}`
    };
  });
  
  const config = metricConfig[selectedMetric as keyof typeof metricConfig];

  // Format y-axis values with appropriate units
  const formatYAxis = (value: number) => `${value}${config.unit}`;
  
  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const value = payload[0].value as number;
      const isOptimal = value >= config.optimalMin && value <= config.optimalMax;
      
      // Determine status text and color
      let statusText = "Optimal";
      let statusColor = "bg-green-100 text-green-700";
      let statusIcon = "✓";
      
      if (value < config.optimalMin) {
        statusText = "Low";
        statusColor = "bg-amber-100 text-amber-700";
        statusIcon = "⚠";
      } else if (value > config.optimalMax) {
        statusText = "High";
        statusColor = "bg-red-100 text-red-700";
        statusIcon = "⚠";
      }
      
      return (
        <div className="custom-tooltip bg-white p-3 border rounded-md shadow-md">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-medium">{label}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
              {statusIcon} {statusText}
            </span>
          </div>
          
          <div className="flex items-center justify-between border-t pt-1 mt-1">
            <span className="text-sm font-medium">{config.label}:</span>
            <span className="text-sm text-primary font-bold">{value.toFixed(1)}{config.unit}</span>
          </div>
          
          <div className="text-xs mt-1 pt-1 border-t text-muted-foreground">
            <div>Optimal range: {config.optimalMin} - {config.optimalMax}{config.unit}</div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{config.label} Trend</CardTitle>
            <CardDescription>
              Historical readings for {config.label.toLowerCase()} (optimal range: {config.optimalMin}-{config.optimalMax}{config.unit})
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm cursor-pointer flex items-center space-x-1">
              <input
                type="checkbox"
                checked={showDataPoints}
                onChange={() => setShowDataPoints(!showDataPoints)}
                className="rounded border-gray-300"
              />
              <span>Show points</span>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis
                dataKey="label"
                angle={-45}
                textAnchor="end"
                height={7}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => value.split(' ')[0]} // Show only date part by default
                interval={Math.ceil(chartData.length / 10)} // Show fewer ticks for readability
              />
              <YAxis 
                domain={[config.min, config.max]} 
                tickFormatter={formatYAxis}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey={selectedMetric}
                stroke="#22c55e"
                strokeWidth={2}
                activeDot={{ r: 6, fill: "#22c55e" }}
                name={config.label}
                dot={showDataPoints ? { 
                  stroke: "#439862ff",  
                  fill: "white",
                  strokeWidth: 2, 
                  r: 3
                } : false}
              />
              {/* Render reference lines for optimal range */}
              <ReferenceLine
                y={config.optimalMin}
                stroke="#00ff5eff"
                strokeDasharray="3 3"
                label={{ value: `Min: ${config.optimalMin}${config.unit}`, position: 'insideBottomLeft', style: { fill: '#22c55e', fontSize: 12 } }}
              />
              <ReferenceLine
                y={config.optimalMax}
                stroke="#00ff5eff" 
                strokeDasharray="3 3"
                label={{ value: `Max: ${config.optimalMax}${config.unit}`, position: 'insideTopLeft', style: { fill: '#22c55e', fontSize: 12 } }}
              />
              {/* Add a reference area for the optimal range */}
              <defs>
                <linearGradient id="optimalRange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34, 197, 94, 0.1)" />
                  <stop offset="100%" stopColor="rgba(34, 197, 94, 0.1)" />
                </linearGradient>
              </defs>
              {config.optimalMin !== undefined && config.optimalMax !== undefined && (
                <rect
                  x="0%"
                  y={config.optimalMax}
                  width="100%"
                  height={config.optimalMin - config.optimalMax}
                  fill="url(#optimalRange)"
                />
              )}
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// If there's no historical data yet, we'll show this placeholder
export function SoilDataChartPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Soil Parameter Trend</CardTitle>
        <CardDescription>
          Historical readings for soil parameters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full flex flex-col items-center justify-center text-muted-foreground">
          <div className="bg-muted/20 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <LineChart className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium mb-2">No trend data available</p>
          <p className="text-sm text-center max-w-md">
            Not enough historical data has been collected yet to display trends.
            Readings will appear here automatically as more data is collected.
          </p>
          <p className="text-sm mt-4">
            Try refreshing the data or check back later.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
