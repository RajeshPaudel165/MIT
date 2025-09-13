import { useState, useEffect } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Button } from "@/components/ui/button";
import { Leaf, BarChart3, Shield, Smartphone } from "lucide-react";
import heroImage from "@/assets/flora-hero.jpg";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";

const Index = () => {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [showAuth, setShowAuth] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !showAuth) {
      navigate("/dashboard");
    }
  }, [user, navigate, showAuth]);

  if (showAuth) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar 
          currentMode={authMode} 
          onModeChange={setAuthMode} 
          onLogoClick={() => setShowAuth(false)}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <AuthForm mode={authMode} onModeChange={setAuthMode} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Navbar 
        onModeChange={(mode) => {
          setAuthMode(mode);
          setShowAuth(true);
        }}
      />

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Beautiful houseplants in modern pots"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/80" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="animate-fade-in-up">
            <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Keep Your Plants
              <span className="text-primary block">Healthy & Thriving</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Monitor essential soil nutrients and track your plants' health with our minimalist, 
              intuitive plant care companion designed for home gardeners.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button 
              size="lg"
              onClick={() => {
                setAuthMode("signup");
                setShowAuth(true);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-button px-8 py-4 text-lg font-medium"
            >
              Start Monitoring Your Plants
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => {
                setAuthMode("signin");
                setShowAuth(true);
              }}
              className="border-border/50 hover:bg-muted/50 px-8 py-4 text-lg"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-semibold text-foreground mb-4">
              Everything You Need for Plant Care
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple, effective tools to monitor and maintain optimal plant health
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: BarChart3,
                title: "Nutrient Tracking",
                description: "Monitor K, Ca, N, and P levels with visual gauges and optimal ranges"
              },
              {
                icon: Leaf,
                title: "Plant Profiles",
                description: "Individual profiles for each plant with species-specific care guidelines"
              },
              {
                icon: Shield,
                title: "Health Monitoring",
                description: "Real-time status indicators to catch issues before they become problems"
              },
              {
                icon: Smartphone,
                title: "Mobile Friendly",
                description: "Access your plant data anywhere with our responsive design"
              }
            ].map((feature, index) => (
              <div key={index} className="text-center space-y-4 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="p-4 bg-primary/10 rounded-lg w-16 h-16 mx-auto flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground">{feature.title}</h4>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h3 className="text-3xl font-semibold text-foreground">
            Ready to Start Your Plant Journey?
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join FloraFriend today and give your plants the care they deserve with science-backed monitoring.
          </p>
          <Button 
            size="lg"
            onClick={() => {
              setAuthMode("signup");
              setShowAuth(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-button px-8 py-4 text-lg font-medium"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">FloraFriend</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your plants' health companion. Built with care for plant lovers.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
