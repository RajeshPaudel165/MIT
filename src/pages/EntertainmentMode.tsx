// src/pages/EntertainmentMode.tsx - Rock Paper Scissors Game Launcher
import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Gamepad2,
  Brain,
  Loader2,
  RotateCcw,
  Hand,
  Sparkles,
  Camera,
  Trophy
} from 'lucide-react';

interface GameState {
  loading: boolean;
  status: string;
}

const EntertainmentMode: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    loading: false,
    status: 'Idle'
  });

  const backendUrl = (window as Window & { BACKEND_URL?: string }).BACKEND_URL || 'http://localhost:5001';

  // Check game status
  const checkStatus = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${backendUrl}/health`);
      const data = await response.json();
      setGameState(prev => ({
        ...prev,
        status: data.status === 'ok' ? 'Ready to play' : 'Backend issues'
      }));
    } catch (error) {
      setGameState(prev => ({
        ...prev,
        status: 'Backend not reachable'
      }));
    }
  }, [backendUrl]);

  // Check status on component mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Launch game/assistant
  const launchGame = async (): Promise<void> => {
    setGameState(prev => ({ ...prev, loading: true, status: 'Starting game...' }));
    
    try {
      const response = await fetch(`${backendUrl}/modes/entertainment`, { method: 'POST' });
      const data = await response.json();
      
      if (data.status === 'launched') {
        setGameState(prev => ({ 
          ...prev, 
          status: 'Game launched! Check your desktop.' 
        }));
      } else if (data.status === 'already_running') {
        setGameState(prev => ({ 
          ...prev, 
          status: 'Game already running.' 
        }));
      } else {
        setGameState(prev => ({ 
          ...prev, 
          status: `Error: ${data.message || data.status}` 
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGameState(prev => ({ 
        ...prev, 
        status: `Connection error: ${errorMessage}` 
      }));
    } finally {
      setGameState(prev => ({ ...prev, loading: false }));
    }
  };

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
              🎮 Entertainment Mode
            </h1>
            <p className="text-muted-foreground">
              Fun games and activities to enjoy while caring for your plants
            </p>
          </div>
          
          <Badge variant="outline" className="hidden sm:flex">
            <Sparkles className="h-4 w-4 mr-1" />
            AI Powered
          </Badge>
        </div>

        {/* Main Game Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Hand className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">
                    Rock Paper Scissors AI
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Challenge the AI with hand gestures
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Game Launch Section */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <Button 
                  onClick={launchGame} 
                  disabled={gameState.loading}
                  className="w-full h-12 text-lg font-semibold"
                  size="lg"
                >
                  {gameState.loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Starting Game...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Launch Game
                    </>
                  )}
                </Button>
              </div>

              {/* Status Display */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full ${gameState.status.includes('running') ? 'bg-green-500' : gameState.status.includes('error') || gameState.status.includes('not reachable') ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  {gameState.status}
                </span>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={checkStatus}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Check Status
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Game Info Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Brain className="h-5 w-5 text-blue-600" />
                How to Play
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Game Features */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Camera className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Webcam Recognition</h4>
                    <p className="text-sm text-muted-foreground">
                      Uses your camera to detect hand gestures in real-time
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Brain className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Smart AI Opponent</h4>
                    <p className="text-sm text-muted-foreground">
                      Play against AI with different difficulty modes
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Trophy className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Score Tracking</h4>
                    <p className="text-sm text-muted-foreground">
                      Keep track of your wins, losses, and ties
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-gray-900 mb-2">Quick Start:</h4>
                <ol className="text-sm text-gray-700 space-y-1">
                  <li>1. Click "Launch Game" above</li>
                  <li>2. Allow camera access when prompted</li>
                  <li>3. Show your hand to calibrate</li>
                  <li>4. Make rock, paper, or scissors gestures</li>
                  <li>5. Press space to start each round</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Entertainment Options */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Gamepad2 className="h-5 w-5 text-green-600" />
              More Entertainment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                <Sparkles className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <h4 className="font-medium text-gray-900">Plant Trivia</h4>
                <p className="text-sm text-muted-foreground">Coming soon</p>
              </div>
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                <Brain className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <h4 className="font-medium text-gray-900">AI Storytelling</h4>
                <p className="text-sm text-muted-foreground">Coming soon</p>
              </div>
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <h4 className="font-medium text-gray-900">Achievements</h4>
                <p className="text-sm text-muted-foreground">Coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EntertainmentMode;
