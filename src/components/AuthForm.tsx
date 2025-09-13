import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Leaf, 
  Mail, 
  Lock, 
  User, 
  Phone,
  AlertCircle,
  Loader2 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Import directly from the context to avoid circular dependencies
import { useContext } from "react";
import { AuthContext } from "@/hooks/auth-context-type";

interface AuthFormProps {
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
}

export function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  
  // Use context directly
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("AuthForm must be used within an AuthProvider");
  }
  
  // Debug output
  console.log("Auth context object:", auth);
  const { signIn, signUp, signInWithGoogle, resetPassword } = auth;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (mode === "signin") {
        await signIn(formData.email, formData.password);
        window.location.href = "/dashboard";
      } else {
        await signUp(formData.name, formData.email, formData.password, formData.phoneNumber || "");
        setVerificationSent(true);
        // Don't redirect, show verification message
      }
    } catch (error) {
      // Error is handled in the useAuth hook
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      window.location.href = "/dashboard";
    } catch (error) {
      // Error is handled in the useAuth hook
      console.error(error);
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  const handleForgotPassword = async () => {
    if (!resetEmail) return;
    
    setIsLoading(true);
    try {
      console.log("Attempting to reset password for:", resetEmail);
      // Check that resetPassword is a function
      if (typeof resetPassword !== 'function') {
        console.error("resetPassword is not a function:", resetPassword);
        throw new Error("Reset password functionality is not available");
      }
      
      // Add validation for email format
      if (!/\S+@\S+\.\S+/.test(resetEmail)) {
        throw new Error("Please enter a valid email address");
      }
      
      console.log("Calling resetPassword function with email:", resetEmail);
      await resetPassword(resetEmail);
      console.log("Password reset email sent successfully");
      setResetEmailSent(true);
    } catch (error) {
      // Log the error for debugging
      console.error("Error resetting password:", error);
      
      // Display error to user
      alert(`Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-gradient-card border-0 shadow-float">
      <CardHeader className="space-y-4 text-center">
        <div>
          <CardTitle className="text-2xl font-semibold">
            {mode === "signin" ? "Welcome back" : "Join FloraFriend"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {mode === "signin" 
              ? "Sign in to monitor your plants" 
              : "Start monitoring your plant's health today"
            }
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {verificationSent && (
          <Alert className="bg-orange-50 border-orange-200 text-orange-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A verification email has been sent to your inbox. Please verify your email before signing in.
            </AlertDescription>
          </Alert>
        )}
        
        {!verificationSent && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-10 bg-background border-border/50 focus:border-primary"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-sm font-medium">
                    Phone Number (Optional)
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="+1234567890 (optional)"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="pl-10 bg-background border-border/50 focus:border-primary"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send email alerts for soil and weather conditions
                  </p>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10 bg-background border-border/50 focus:border-primary"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10 bg-background border-border/50 focus:border-primary"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-button transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>
        )}
        
        {mode === "signin" && !verificationSent && (
          <div className="text-center">
            <Button 
              variant="link" 
              className="text-sm text-muted-foreground hover:text-primary"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot your password?
            </Button>
          </div>
        )}
        
        {!verificationSent && (
          <>
            <Separator>
              <span className="px-2 text-xs text-muted-foreground">OR</span>
            </Separator>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
              )}
              Continue with Google
            </Button>
          </>
        )}
        
        {!verificationSent && (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {mode === "signin" 
                ? "Don't have an account?" 
                : "Already have an account?"
              }
            </p>
            <Button 
              variant="link" 
              onClick={() => onModeChange(mode === "signin" ? "signup" : "signin")}
              className="text-primary hover:text-primary/80 font-medium"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </Button>
          </div>
        )}
        
        {/* Forgot Password Dialog */}
        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Enter your email address and we'll send you a link to reset your password.
              </DialogDescription>
            </DialogHeader>
            
            {resetEmailSent ? (
              <div className="space-y-4 py-4">
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <AlertDescription>
                    Password reset email sent! Check your inbox for instructions.
                  </AlertDescription>
                </Alert>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email address"
                  />
                </div>
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleForgotPassword}
                    disabled={!resetEmail || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}