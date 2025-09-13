import { Leaf, LogOut, User, ChevronDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavbarProps {
  onModeChange?: (mode: "signin" | "signup") => void;
  currentMode?: "signin" | "signup";
  showBackButton?: boolean;
  backTo?: string;
  onLogoClick?: () => void;
}

export function Navbar({ onModeChange, currentMode, showBackButton = false, backTo, onLogoClick }: NavbarProps) {
  const { user, logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm w-full">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            onClick={(e) => {
              if (onLogoClick) {
                e.preventDefault();
                onLogoClick();
              }
            }}
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Leaf className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">FloraFriend</h1>
              <p className="text-sm text-muted-foreground">Plant Health Monitor</p>
            </div>
          </Link>
          
          {onModeChange && currentMode && (
            <div className="flex gap-2">
              <Button 
                variant={currentMode === "signin" ? "default" : "outline"}
                onClick={() => onModeChange("signin")}
                className={currentMode === "signin" 
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-button" 
                  : "border-border/50 hover:bg-muted/50"
                }
              >
                Sign In
              </Button>
              <Button 
                variant={currentMode === "signup" ? "default" : "outline"}
                onClick={() => onModeChange("signup")}
                className={currentMode === "signup" 
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-button"
                  : "border-border/50 hover:bg-muted/50"
                }
              >
                Sign Up
              </Button>
            </div>
          )}
          
          {showBackButton && (
            <Button 
              variant="outline" 
              onClick={() => {
                if (backTo) {
                  window.location.href = backTo;
                } else {
                  window.history.back();
                }
              }}
              className="border-border/50 hover:bg-muted/50"
            >
              Back
            </Button>
          )}
          
          {user && !onModeChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                    <AvatarFallback>
                      {user.displayName 
                        ? user.displayName.substring(0, 2).toUpperCase() 
                        : user.email 
                          ? user.email.substring(0, 2).toUpperCase()
                          : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {user.displayName && (
                      <p className="font-medium">{user.displayName}</p>
                    )}
                    {user.email && (
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <Link to="/profile">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                </Link>
                <Link to="/soil-analytics">
                  <DropdownMenuItem className="cursor-pointer">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>Soil Analytics</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
