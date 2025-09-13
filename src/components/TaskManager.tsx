import React, { useState } from 'react';
import { useOutdoorMode } from '../hooks/useOutdoorMode';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, CheckCircle, Clock, Plus, Trash2, Copy } from 'lucide-react';

export function TaskManager() {
  const {
    tasks,
    addCustomTask,
    removeTask,
    editTask,
    duplicateTask,
    toggleTaskCompletion,
    getTasksByCategory,
    getTasksByPriority,
    getPendingTasks,
    getCompletedTasks,
    clearCompletedTasks
  } = useOutdoorMode();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState<{
    name: string;
    description: string;
    category: 'watering' | 'planting' | 'maintenance' | 'harvesting' | 'pruning';
    priority: 'low' | 'medium' | 'high';
    dueDate: string;
    weatherDependent: boolean;
  }>({
    name: '',
    description: '',
    category: 'maintenance',
    priority: 'medium',
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
      setShowAddForm(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'watering': return '💧';
      case 'planting': return '🌱';
      case 'maintenance': return '🔧';
      case 'harvesting': return '🌾';
      case 'pruning': return '✂️';
      default: return '📋';
    }
  };

  const pendingTasks = getPendingTasks();
  const completedTasks = getCompletedTasks();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Garden Task Manager</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pending Tasks</p>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{completedTasks.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Tasks</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Task</CardTitle>
            <CardDescription>Create a custom garden task</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="taskName">Task Name</Label>
              <Input
                id="taskName"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                placeholder="Enter task name"
              />
            </div>
            <div>
              <Label htmlFor="taskDescription">Description</Label>
              <Textarea
                id="taskDescription"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Enter task description"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
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
              <div>
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
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddTask}>Add Task</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Tasks ({pendingTasks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getCategoryIcon(task.category)}</span>
                    <h4 className="font-medium">{task.name}</h4>
                    <Badge className={`text-white ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-1">{task.description}</p>
                  )}
                  <p className="text-xs text-gray-500">Due: {task.dueDate}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => toggleTaskCompletion(task.id)}>
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicateTask(task.id)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => removeTask(task.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <p className="text-center text-gray-500 py-8">No pending tasks</p>
            )}
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Completed Tasks ({completedTasks.length})</CardTitle>
            {completedTasks.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearCompletedTasks}>
                Clear All
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {completedTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getCategoryIcon(task.category)}</span>
                    <h4 className="font-medium line-through text-gray-600">{task.name}</h4>
                    <Badge variant="secondary">completed</Badge>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500 mb-1 line-through">{task.description}</p>
                  )}
                  <p className="text-xs text-gray-400">Completed</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => toggleTaskCompletion(task.id)}>
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => removeTask(task.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {completedTasks.length === 0 && (
              <p className="text-center text-gray-500 py-8">No completed tasks</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
