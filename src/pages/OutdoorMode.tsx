import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { usePlants } from '@/hooks/usePlants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cloud, Sun, Droplets, Thermometer, Wind, Calendar, CloudRain, AlertTriangle, CloudLightning, CloudSnow, Flower, Leaf, X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOutdoorMode } from '@/hooks/useOutdoorMode';

// Motion detection integration
function useMotionDetection() {
  const [motionActive, setMotionActive] = useState(false);
  const [motionDetected, setMotionDetected] = useState(false);
  const [polling, setPolling] = useState(false);

  const startMotionDetection = async () => {
    await fetch('http://localhost:5001/motion-detect', { method: 'POST' });
    setMotionActive(true);
    setPolling(true);
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (polling) {
      interval = setInterval(async () => {
        const res = await fetch('http://localhost:5001/motion-status');
        const data = await res.json();
        setMotionDetected(data.motion_detected);
      }, 2000);
    }
    return () => interval && clearInterval(interval);
  }, [polling]);

  return { motionActive, motionDetected, startMotionDetection };
}

export default function OutdoorMode() {
  const { motionActive, motionDetected, startMotionDetection } = useMotionDetection();
  const { plants } = usePlants();
  // Handler to launch outdoor_mode.py
  const handleOutdoorMode = async () => {
    try {
      await fetch('http://localhost:5001/modes/outdoor', { method: 'POST' });
    } catch (err) {
      // Optionally show error toast
    }
  };
  const { 
    weather,
    advice,
    tasks,
    outdoorPlants,
    plantsLoading,
    weatherLoading,
    adviceLoading,
    toggleTaskCompletion,
    addCustomTask,
    removeTask,
    getWateringSchedule,
    generateSoilRecommendationsForPlant
  } = useOutdoorMode();
  
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showWateringSchedule, setShowWateringSchedule] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    category: 'maintenance' as 'watering' | 'planting' | 'maintenance' | 'harvesting' | 'pruning',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: new Date().toISOString().split('T')[0],
    weatherDependent: false
  });

  const handleAddTask = () => {
    if (newTask.name.trim()) {
      addCustomTask(newTask);
      setNewTask({
        name: '',
        description: '',
        category: 'maintenance',
        priority: 'medium',
        dueDate: new Date().toISOString().split('T')[0],
        weatherDependent: false
      });
      setShowAddTaskDialog(false);
    }
  };

  return (
  <div className="min-h-screen bg-background">
      <Navbar />
      
  <main className="max-w-6xl mx-auto px-4 py-6">
  <div className="flex items-center gap-2 mb-6">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Outdoor Mode</h1>
          <Button size="sm" className="ml-4" onClick={handleOutdoorMode}>
            Launch Outdoor Mode
          </Button>
            {motionActive && (
              <Badge variant="outline" className={motionDetected ? 'bg-red-100 text-red-800 ml-2' : 'bg-green-100 text-green-800 ml-2'}>
                {motionDetected ? 'Motion Detected!' : 'No Motion'}
              </Badge>
            )}
          <Badge variant="outline" className="ml-auto bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            Garden Management
          </Badge>
        </div>
        
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="dashboard">Garden Dashboard</TabsTrigger>
            <TabsTrigger value="plants">Outdoor Plants</TabsTrigger>
            <TabsTrigger value="tasks">Garden Tasks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            {/* Weather Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-blue-500" />
                  Local Weather
                </CardTitle>
                <CardDescription>
                  Current conditions and 5-day forecast for your garden
                </CardDescription>
              </CardHeader>
              <CardContent>
                {weatherLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Current Weather */}
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
                        {weather && weather.current && (
                          <Cloud className="h-8 w-8 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">
                          {weather && weather.current ? `${weather.current.tempF}°F` : "Loading..."}
                        </h3>
                        <p className="text-muted-foreground">
                          {weather && weather.current ? weather.current.condition : ""}
                        </p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Droplets className="h-4 w-4 text-blue-500" />
                            <span>{weather && weather.current ? `${weather.current.humidity}%` : ""}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Wind className="h-4 w-4 text-blue-500" />
                            <span>{weather && weather.current ? `${weather.current.windSpeed} mph` : ""}</span>
                          </div>
                        </div>
                        {weather && weather.location && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📍 {weather.location.city !== 'Unknown' ? weather.location.city : 'Loading location...'}, {weather.location.region !== 'Unknown' ? weather.location.region : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Forecast */}
                    <div className="grid grid-cols-5 gap-2">
                      {weather && weather.forecast && weather.forecast.map((day, index) => (
                        <div key={index} className="text-center p-2">
                          <div className="text-sm font-medium">{day.day}</div>
                          <div className="my-2">
                            {day.condition.includes("cloud") ? (
                              <Cloud className="h-5 w-5 text-blue-500 mx-auto" />
                            ) : day.condition.includes("rain") ? (
                              <CloudRain className="h-5 w-5 text-blue-500 mx-auto" />
                            ) : (
                              <Sun className="h-5 w-5 text-amber-500 mx-auto" />
                            )}
                          </div>
                          <div className="text-sm font-medium">{day.tempMaxF}°</div>
                          <div className="text-xs text-muted-foreground">{day.tempMinF}°</div>
                          <div className="mt-1 text-xs text-blue-500">
                            {day.rainChance > 0 ? `${Math.round(day.rainChance)}%` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                Last updated: {weather ? new Date(weather.lastUpdated).toLocaleTimeString() : ""}
              </CardFooter>
            </Card>
            
            {/* Weather Advice */}
            <Card>
              <CardHeader>
                <CardTitle>Garden Weather Advice</CardTitle>
                <CardDescription>
                  AI-powered recommendations based on weather forecast
                </CardDescription>
              </CardHeader>
              <CardContent>
                {adviceLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2 text-muted-foreground">Generating AI recommendations...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {advice && advice.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {item.type === 'watering' ? (
                              <Droplets className="h-5 w-5 text-blue-500" />
                            ) : item.type === 'planting' ? (
                              <Leaf className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            )}
                            <h3 className="font-medium">{item.title}</h3>
                          </div>
                          <Badge variant="outline" className={
                            item.priority === 'high' 
                              ? 'bg-red-100 text-red-800' 
                              : item.priority === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                          }>
                            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    ))}
                    {!adviceLoading && (!advice || advice.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        No weather advice available yet. Advice will appear when weather data is loaded.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    Watering Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tasks ? tasks.filter(t => t.category === 'watering' && !t.completed).length : 0} Plants
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {weather && weather.current ? (
                      weather.current.tempF > 85 ? 'High temp - water frequently' :
                      weather.current.tempF > 75 ? 'Warm - check soil daily' :
                      weather.current.tempF < 50 ? 'Cool - water less frequently' :
                      'Check soil moisture before watering'
                    ) : 'Loading watering recommendations...'}
                  </p>
                  {weather && weather.current && (
                    <div className="mt-2 text-xs">
                      <div className="flex justify-between">
                        <span>Current: {weather.current.tempF}°F</span>
                        <span>Humidity: {weather.current.humidity}%</span>
                      </div>
                      {weather.forecast.some(day => day.rainChance > 60) && (
                        <p className="text-blue-600 mt-1">⛈️ Rain expected - reduce watering</p>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Dialog open={showWateringSchedule} onOpenChange={setShowWateringSchedule}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">View Watering Schedule</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Watering Schedule</DialogTitle>
                        <DialogDescription>
                          Current watering tasks for your plants
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-[400px] overflow-y-auto">
                        {getWateringSchedule().length === 0 ? (
                          <div className="text-center py-8">
                            <Droplets className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No watering tasks scheduled</p>
                            <p className="text-sm text-muted-foreground">Add plants and watering tasks to see your schedule</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {getWateringSchedule().map((item, index) => (
                              <div key={index} className="border rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                  {item.plantImage ? (
                                    <img src={item.plantImage} alt={item.plantName} className="w-12 h-12 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                      <Droplets className="h-6 w-6 text-green-600" />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium">{item.plantName}</h4>
                                      <Badge className={
                                        item.priority === 'high' 
                                          ? 'bg-red-100 text-red-800' 
                                          : item.priority === 'medium'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-green-100 text-green-800'
                                      }>
                                        {item.priority} priority
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                      <div><strong>Frequency:</strong> {item.wateringFrequency}</div>
                                      <div><strong>Best Time:</strong> {item.recommendedTime}</div>
                                      <div><strong>Next Due:</strong> {item.nextWatering}</div>
                                      <div><strong>Weather Note:</strong> {item.weatherNote}</div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => toggleTaskCompletion(item.id)}
                                    >
                                      {item.completed ? 'Undo' : 'Done'}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowWateringSchedule(false)}>
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-red-500" />
                    Temperature Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {weather && weather.current ? (
                      weather.current.tempF > 90 ? '🔥 Extreme Heat' :
                      weather.current.tempF > 85 ? '☀️ Hot' :
                      weather.current.tempF < 35 ? '🧊 Frost Risk' :
                      weather.current.tempF < 50 ? '❄️ Cool' :
                      '✅ Optimal'
                    ) : 'Loading...'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {weather && weather.current ? (
                      weather.current.tempF > 90 ? 'Provide shade and extra water immediately' :
                      weather.current.tempF > 85 ? 'Monitor plants closely for heat stress' :
                      weather.current.tempF < 35 ? 'Protect tender plants from frost' :
                      weather.current.tempF < 50 ? 'Slow growth expected, reduce watering' :
                      'Temperature is ideal for most plants'
                    ) : ''}
                  </p>
                  {weather && weather.current && (
                    <div className="mt-2 text-xs">
                      <div className="flex justify-between">
                        <span>Current: {weather.current.tempF}°F</span>
                        <span>Feels like: {weather.current.feelsLike}°F</span>
                      </div>
                      {weather.current.uvIndex > 8 && (
                        <p className="text-orange-600 mt-1">☀️ High UV - provide shade</p>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">Set Temperature Alerts</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-500" />
                    Today's Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tasks ? tasks.filter(t => t.dueDate === 'Today' && !t.completed).length : 0} Tasks
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tasks ? tasks.filter(t => t.dueDate === 'Today' && !t.completed && t.priority === 'high').length : 0} high priority items
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">View Tasks</Button>
                </CardFooter>
              </Card>
          </TabsContent>
          
          <TabsContent value="plants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Outdoor Compatibility</CardTitle>
                <CardDescription>
                  See which of your plants are best suited for outdoor growing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {plantsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : outdoorPlants && outdoorPlants.length === 0 ? (
                  <div className="text-center py-8">
                    <p>No plants added yet. Add plants to see their outdoor compatibility.</p>
                    <Link to="/addplant" className="mt-4 inline-block">
                      <Button>Add Plants</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {outdoorPlants && outdoorPlants.map(plant => (
                      <div key={plant.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {plant.imageUrl ? (
                              <img 
                                src={plant.imageUrl} 
                                alt={plant.commonName}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                <Sun className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium">{plant.commonName}</h3>
                              <p className="text-xs text-muted-foreground italic">
                                {plant.scientificName || "Unknown species"}
                              </p>
                            </div>
                          </div>
                          <Badge className={
                            plant.compatibility.status === 'excellent' ? "bg-green-100 text-green-800" :
                            plant.compatibility.status === 'good' ? "bg-blue-100 text-blue-800" :
                            plant.compatibility.status === 'moderate' ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }>
                            {plant.compatibility.status.charAt(0).toUpperCase() + plant.compatibility.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Outdoor Compatibility</span>
                            <span>{plant.compatibility.score}%</span>
                          </div>
                          <Progress value={plant.compatibility.score} className="h-2" />
                        </div>
                        
                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Sun className="h-3 w-3 text-amber-500" />
                            <span>{plant.sunlightPreference || "Unknown"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Droplets className="h-3 w-3 text-blue-500" />
                            <span>{plant.wateringSchedule || "Unknown"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-green-500" />
                            <span>{plant.cycle || "Unknown"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="tasks" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Garden Tasks</CardTitle>
                    <CardDescription>
                      Keep track of your outdoor gardening tasks
                    </CardDescription>
                  </div>
                  <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add New Garden Task</DialogTitle>
                        <DialogDescription>
                          Create a new task for your garden maintenance.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="task-name">Task Name</Label>
                          <Input
                            id="task-name"
                            value={newTask.name}
                            onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                            placeholder="Enter task name"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="task-description">Description</Label>
                          <Textarea
                            id="task-description"
                            value={newTask.description}
                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                            placeholder="Enter task description"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Category</Label>
                            <Select value={newTask.category} onValueChange={(value: 'watering' | 'planting' | 'maintenance' | 'harvesting' | 'pruning') => setNewTask({ ...newTask, category: value })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="watering">💧 Watering</SelectItem>
                                <SelectItem value="planting">🌱 Planting</SelectItem>
                                <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
                                <SelectItem value="harvesting">🌾 Harvesting</SelectItem>
                                <SelectItem value="pruning">✂️ Pruning</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label>Priority</Label>
                            <Select value={newTask.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewTask({ ...newTask, priority: value })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="due-date">Due Date</Label>
                          <Input
                            id="due-date"
                            type="date"
                            value={newTask.dueDate}
                            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="weather-dependent"
                            checked={newTask.weatherDependent}
                            onChange={(e) => setNewTask({ ...newTask, weatherDependent: e.target.checked })}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="weather-dependent">Weather Dependent</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddTask}>Add Task</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks && tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <input 
                        type="checkbox" 
                        checked={task.completed} 
                        onChange={() => toggleTaskCompletion(task.id)}
                        className="h-5 w-5 rounded-md border-gray-300" 
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.name}
                          </p>
                          <Badge variant="outline" className={
                            task.priority === 'high' 
                              ? 'bg-red-100 text-red-800' 
                              : task.priority === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                          }>
                            {task.priority}
                          </Badge>
                          <Badge variant="secondary">
                            {task.category}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'} mb-1`}>
                            {task.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Due: {task.dueDate}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeTask(task.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(!tasks || tasks.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No tasks yet. Add your first garden task!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
