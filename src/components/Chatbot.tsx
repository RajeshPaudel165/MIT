import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, X, Loader2, Bot, User } from 'lucide-react';
import { claudeService, ChatMessage } from '@/lib/claudeService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { usePlants } from '@/hooks/usePlants';

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { plants } = usePlants();
  
  // Generate personalized initial message based on user's plants
  const getInitialMessage = useCallback(() => {
    if (plants.length === 0) {
      return 'Hello! I am your AI assistant for Soil Savvy Suite. I have access to your real-time soil data and can help with plant care advice. Start by adding some plants to get personalized recommendations! 🌱';
    } else if (plants.length === 1) {
      return `Hello! I am your AI assistant for Soil Savvy Suite. I can see you have a ${plants[0].commonName} in your garden! I have access to your real-time soil data and can provide personalized advice for your plants. What would you like to know? 🌱`;
    } else {
      const plantNames = plants.slice(0, 3).map(p => p.commonName).join(', ');
      const remaining = plants.length > 3 ? ` and ${plants.length - 3} others` : '';
      return `Hello! I am your AI assistant for Soil Savvy Suite. I can see you have ${plantNames}${remaining} in your garden! I have access to your real-time soil data and can provide personalized advice for all your plants. What would you like to know? 🌱`;
    }
  }, [plants]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Update initial message when plants change
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: getInitialMessage(),
        timestamp: new Date()
      }]);
    }
  }, [plants, messages.length, getInitialMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chatbot opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Pass user ID to Claude service for personalized context
      const response = await claudeService.sendMessage(
        [...messages, userMessage],
        user?.uid // Pass user ID for context loading
      );
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment. The issue might be with accessing your soil data or my connection to the AI service.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 w-96 h-[500px] shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
      <Card className="h-full flex flex-col border-2 border-green-200 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-green-800">Soil Savvy Assistant</CardTitle>
                <p className="text-xs text-green-600">Always here to help! 🌱</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-red-100"
            >
              <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-green-200 scrollbar-track-gray-100">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm">
                  <AvatarFallback className={message.role === 'user' ? 'bg-blue-100' : 'bg-green-100'}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Bot className="h-4 w-4 text-green-600" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm">
                  <AvatarFallback className="bg-green-100">
                    <Bot className="h-4 w-4 text-green-600" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 border border-gray-200 rounded-2xl p-3 flex items-center gap-2 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                  <span className="text-sm">
                    {plants.length > 0 
                      ? `Checking your ${plants.length === 1 ? plants[0].commonName : `${plants.length} plants`} and soil data...`
                      : 'Analyzing your soil data...'
                    }
                  </span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t bg-gray-50/50">
            {/* Quick action suggestions */}
            {messages.length === 1 && (
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-2">💡 Try asking:</p>
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const baseSuggestions = ["How is my soil today?", "Any watering needed?"];
                    
                    if (plants.length === 0) {
                      return [...baseSuggestions, "What plants grow well in my area?", "How do I add my first plant?"];
                    } else if (plants.length === 1) {
                      return [...baseSuggestions, `How is my ${plants[0].commonName}?`, "What nutrients does it need?"];
                    } else {
                      const randomPlant = plants[Math.floor(Math.random() * plants.length)];
                      return [...baseSuggestions, `Check my ${randomPlant.commonName}`, "Which plant needs attention?"];
                    }
                  })().map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInputValue(suggestion)}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full hover:bg-green-200 transition-colors"
                      disabled={isLoading}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  ref={inputRef}
                  placeholder="Ask me about your plants and soil conditions..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="border-2 border-green-200 focus:border-green-400 focus:ring-green-200 rounded-xl bg-white"
                />
              </div>
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading || !inputValue.trim()}
                className="h-10 w-10 p-0 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Press Enter to send • Powered by Claude AI with your real soil data 🌱
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};