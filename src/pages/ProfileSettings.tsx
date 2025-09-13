import { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { MigratePlantData } from "@/components/MigratePlantData";
import { EmailNotificationSettingsCard } from "@/components/EmailNotificationSettingsCard";
import { getUserData } from "@/lib/userData";
import { 
  User, 
  Settings2, 
  Bell, 
  Shield, 
  UserCircle, 
  Moon, 
  Sun, 
  Upload, 
  X, 
  AlertTriangle,
  Database,
  Phone
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserPreferences {
  darkMode: boolean;
  emailNotifications: boolean;
  marketingEmails: boolean;
}

export default function ProfileSettings() {
  const { user, updateProfile, updatePassword, uploadProfileImage, deleteAccount } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    darkMode: false,
    emailNotifications: true,
    marketingEmails: false,
  });
  
  // Fetch user preferences from Firestore using useCallback
  const fetchUserPreferences = useCallback(async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, "userPreferences", user.uid));
      if (userDoc.exists()) {
        setPreferences(userDoc.data() as UserPreferences);
      }
    } catch (error) {
      console.error("Error fetching user preferences:", error);
    }
  }, [user]);
  
  // Get initial user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
      setPhotoURL(user.photoURL || "");
      fetchUserPreferences();
      
      // Load phone number from Firestore
      const loadUserData = async () => {
        try {
          const userData = await getUserData(user);
          if (userData) {
            setPhoneNumber(userData.phoneNumber || "");
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      };
      loadUserData();
    }
  }, [user, fetchUserPreferences]);
  
  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) {
      console.error("No user logged in or no file selected");
      return;
    }
    
    const file = event.target.files[0];
    console.log("File selected for upload:", file.name, "Size:", file.size, "Type:", file.type);
    
    // File validation
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      // Use our new uploadProfileImage function
      const downloadURL = await uploadProfileImage(file);
      setPhotoURL(downloadURL);
      setUploadProgress(100);
      
      toast({
        title: "Image uploaded successfully",
        description: "Your profile image has been updated"
      });
    } catch (error: unknown) {
      console.error("Error in image upload process:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error uploading image",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const removeProfileImage = async () => {
    if (!user || !photoURL) return;
    
    setLoading(true);
    
    try {
      // Update profile with empty photo URL
      await updateProfile({ photoURL: "" });
      
      setPhotoURL("");
      
      toast({
        title: "Profile image removed",
        description: "Your profile image has been removed successfully"
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error removing profile image",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Update profile information
  const handleUpdateProfile = async () => {
    if (!user) return;
    
    // Validate phone number if provided
    if (phoneNumber.trim()) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number with country code (e.g., +1234567890).",
          variant: "destructive",
        });
        return;
      }
    }
    
    setLoading(true);
    try {
      // Update Firebase Auth profile
      await updateProfile({
        displayName,
        photoURL
      });
      
      // Update user data in Firestore (including phone number)
      await setDoc(doc(db, 'users', user.uid), {
        name: displayName,
        email: user.email,
        phoneNumber: phoneNumber.trim(),
        updatedAt: new Date(),
      }, { merge: true });
      
      // Currently email update is not supported through our context
      // We'd need to add an updateEmail function to the context
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully."
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error updating profile",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Update password
  const handleUpdatePassword = async () => {
    if (!user || !user.email) return;
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation password must match.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password using our context function
      await updatePassword(newPassword);
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully."
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error updating password",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Save user preferences
  const handleSavePreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await setDoc(doc(db, "userPreferences", user.uid), preferences);
      
      // Toggle dark mode
      if (preferences.darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      
      toast({
        title: "Preferences saved",
        description: "Your preferences have been updated successfully."
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error saving preferences",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await deleteAccount();
      // Redirect to home page after account deletion
      window.location.href = "/";
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error deleting account",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar showBackButton={true} />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={photoURL} alt={displayName} />
                <AvatarFallback>
                  {displayName ? displayName.substring(0, 2).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 flex space-x-1">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={triggerFileInput}
                  disabled={isUploading || loading}
                >
                  <Upload className="h-3.5 w-3.5" />
                </Button>
                {photoURL && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    onClick={removeProfileImage}
                    disabled={isUploading || loading}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Profile Settings</h1>
              <p className="text-muted-foreground">
                Manage your account settings and preferences
              </p>
            </div>
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
              aria-label="Upload profile image"
              id="profile-image-upload"
            />
          </div>
          
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid grid-cols-4 md:w-[400px] w-full">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Preferences</span>
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Data</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal information and profile picture
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input 
                      id="displayName" 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)} 
                      placeholder="Your display name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="Your email address"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="phoneNumber" 
                        type="tel" 
                        value={phoneNumber} 
                        onChange={(e) => setPhoneNumber(e.target.value)} 
                        placeholder="+1234567890"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Used for SMS notifications about soil and weather conditions
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Profile Picture</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={photoURL} alt={displayName} />
                        <AvatarFallback>
                          {displayName ? displayName.substring(0, 2).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-2"
                          onClick={triggerFileInput}
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4" />
                          {isUploading ? `Uploading (${uploadProgress}%)` : "Upload new image"}
                        </Button>
                        
                        {photoURL && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2 text-destructive"
                            onClick={removeProfileImage}
                            disabled={isUploading}
                          >
                            <X className="h-4 w-4" />
                            Remove image
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleUpdateProfile} 
                    disabled={loading}
                    className="ml-auto"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    View information about your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label>Account Created</Label>
                    <p className="text-sm text-muted-foreground">
                      {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <Label>Last Sign In</Label>
                    <p className="text-sm text-muted-foreground">
                      {user?.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input 
                      id="currentPassword" 
                      type="password" 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)} 
                      placeholder="Your current password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="Your new password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="Confirm your new password"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleUpdatePassword} 
                    disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                    className="ml-auto"
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Delete Account</CardTitle>
                  <CardDescription>
                    Permanently delete your account and all associated data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone. All your data will be permanently deleted.
                  </p>
                </CardContent>
                <CardFooter>
                  <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        className="ml-auto"
                      >
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account
                          and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {loading ? "Deleting..." : "Delete Account"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              {/* SMS Notifications */}
              <EmailNotificationSettingsCard />
              
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize how FloraFriend looks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {preferences.darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      <Label htmlFor="darkMode">Dark Mode</Label>
                    </div>
                    <Switch 
                      id="darkMode" 
                      checked={preferences.darkMode} 
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, darkMode: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Manage your notification preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4" />
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                    </div>
                    <Switch 
                      id="emailNotifications" 
                      checked={preferences.emailNotifications} 
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Bell className="h-4 w-4" />
                        <Label htmlFor="marketingEmails">Marketing Emails</Label>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">
                        Receive emails about new features and promotions
                      </p>
                    </div>
                    <Switch 
                      id="marketingEmails" 
                      checked={preferences.marketingEmails} 
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, marketingEmails: checked }))}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleSavePreferences} 
                    disabled={loading}
                    className="ml-auto"
                  >
                    {loading ? "Saving..." : "Save Preferences"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Data Management Tab */}
            <TabsContent value="data" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>
                    Manage your data in Soil Savvy Suite
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <MigratePlantData />
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Data Storage Structure</h3>
                    <p className="text-sm text-muted-foreground">
                      Your plant data is stored in Firebase under:
                    </p>
                    <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-auto">
                      users/{user?.uid}/plants/[plant_documents]
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This structure provides better organization and performance for your garden data.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
