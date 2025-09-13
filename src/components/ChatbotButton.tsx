import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ChatbotButtonProps {
  isOpen: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export const ChatbotButton: React.FC<ChatbotButtonProps> = ({ 
  isOpen, 
  onClick, 
  unreadCount = 0 
}) => {
  return (
    <div className="fixed bottom-4 left-4 z-50 group">
      <div className="relative">
        {/* Pulse animation ring when closed */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping"></div>
        )}
        
        <Button
          onClick={onClick}
          size="lg"
          className={`
            relative h-16 w-16 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95
            ${isOpen 
              ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rotate-90' 
              : 'bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
            }
          `}
        >
          {isOpen ? (
            <X className="h-6 w-6 transition-transform duration-200" />
          ) : (
            <MessageCircle className="h-6 w-6 transition-transform duration-200" />
          )}
        </Button>
        
        {unreadCount > 0 && !isOpen && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold animate-bounce shadow-md"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </div>
      
      {/* Improved tooltip */}
      {!isOpen && (
        <div className="absolute bottom-20 left-0 mb-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 pointer-events-none shadow-lg">
          Chat with AI Assistant
          <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
      
      {/* Floating help text */}
      {!isOpen && (
        <div className="absolute bottom-20 -right-2 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-300 transform translate-x-4 group-hover:translate-x-0 pointer-events-none">
          <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md shadow-md border border-green-200">
            🌱 Need help?
          </div>
        </div>
      )}
    </div>
  );
};