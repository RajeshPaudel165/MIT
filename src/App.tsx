import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ProfileSettings from "./pages/ProfileSettings";
import SoilAnalytics from "./pages/SoilAnalytics";
import Addplant from "./pages/Addplant";
import NotFound from "./pages/NotFound";
import PlantDetails from "./pages/PlantDetails";
import EditPlant from "./pages/EditPlant";
import EntertainmentMode from "./pages/EntertainmentMode";
import Casualmode from "./pages/Casualmode";
import PlantAnalysis from "./pages/PlantAnalysis";
import ErrorBoundary from "./components/ErrorBoundary";
import OutdoorMode from "./pages/OutdoorMode";
import { Chatbot } from "./components/Chatbot";
import { ChatbotButton } from "./components/ChatbotButton";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">Loading...</div>
    </div>;
  }
  
  return user ? children : <Navigate to="/" replace />;
}

function AppContent() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const { user } = useAuth();

  const toggleChatbot = () => {
    setIsChatbotOpen(!isChatbotOpen);
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfileSettings />
          </ProtectedRoute>
        } />
        <Route path="/soil-analytics" element={
          <ProtectedRoute>
            <SoilAnalytics />
          </ProtectedRoute>
        } />
        <Route path="/addplant" element={
          <ProtectedRoute>
            <Addplant />
          </ProtectedRoute>
        } />
        <Route path="/plant/:plantId" element={
          <ProtectedRoute>
            <PlantDetails />
          </ProtectedRoute>
        } />
         <Route path="/edit-plant/:plantId" element={
          <ProtectedRoute>
            <EditPlant />
          </ProtectedRoute>
        } />
         <Route path="/mode/entertainment" element={
          <ProtectedRoute>
            <EntertainmentMode />
          </ProtectedRoute>
        } />
         <Route path="/mode/casual" element={
          <ProtectedRoute>
            <ErrorBoundary>
              <Casualmode />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
         <Route path="/casual/:plantId" element={
          <ProtectedRoute>
            <ErrorBoundary>
              <PlantAnalysis />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
         <Route path="/mode/outdoor" element={
          <ProtectedRoute>
            <OutdoorMode />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Show chatbot on all pages except the landing page when user is not authenticated */}
      {user && (
        <>
          <ChatbotButton 
            isOpen={isChatbotOpen} 
            onClick={toggleChatbot} 
          />
          <Chatbot 
            isOpen={isChatbotOpen} 
            onClose={() => setIsChatbotOpen(false)} 
          />
        </>
      )}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
