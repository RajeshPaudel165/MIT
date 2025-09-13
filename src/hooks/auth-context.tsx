import { useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, storage, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { AuthContext } from '@/hooks/auth-context-type';
import { sendWelcomeEmail } from '@/lib/emailService';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (name: string, email: string, password: string, phoneNumber: string) => {
    try {
      // Validate phone number format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
        throw new Error("Please enter a valid phone number with country code (e.g., +1234567890)");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update the user's display name
      if (userCredential.user) {
        await firebaseUpdateProfile(userCredential.user, {
          displayName: name
        });
        
        // Store user data including phone number in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: name,
          email: email,
          phoneNumber: phoneNumber,
          createdAt: new Date(),
          emailVerified: false
        });
        
        // Send email verification - DISABLED
        // await firebaseSendEmailVerification(userCredential.user);
        console.log('📧 Would send email verification (EMAIL DISABLED)');
        
        // Send welcome email - DISABLED
        try {
          // await sendWelcomeEmail(
          //   email,
          //   name
          // );
          console.log('📧 Would send welcome email (EMAIL DISABLED)');
        } catch (emailError) {
          console.error('Failed to process welcome email:', emailError);
          // Don't fail the signup if email fails
        }
        
        toast({
          title: "Account created successfully!",
          description: "A verification email has been sent to your inbox. Please verify your email to continue.",
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error creating account",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified
      console.log("User email verification status:", userCredential.user.emailVerified);
      
      if (!userCredential.user.emailVerified) {
        // Send a fresh verification email - DISABLED
        // await firebaseSendEmailVerification(userCredential.user);
        console.log('📧 Would send fresh verification email (EMAIL DISABLED)');
        
        // Sign out the user
        await signOut(auth);
        
        toast({
          title: "Email not verified",
          description: "Please verify your email before signing in. A new verification link has been sent to your inbox.",
          variant: "destructive",
        });
        
        throw new Error("Email not verified");
      }
      
      toast({
        title: "Welcome back!",
        description: "You've been signed in successfully",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check if it's an auth error
      if (errorMessage.includes("auth/")) {
        console.error("Firebase auth error:", errorMessage);
      }
      
      toast({
        title: "Error signing in",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      toast({
        title: "Signed in with Google",
        description: "Welcome to FloraFriend!",
      });
      
      return result.user;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error signing in with Google",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const resetPassword = async (email: string) => {
    console.log("resetPassword called with email:", email);
    try {
      // Make sure we're using the correct Firebase auth instance
      console.log("Firebase auth instance:", auth);
      
      // Add additional debugging information
      console.log("Auth configuration:", {
        currentUser: auth.currentUser,
        authDomain: auth.config.authDomain,
        apiHost: auth.config.apiHost
      });
      
      // Call Firebase's sendPasswordResetEmail function with actionCodeSettings - DISABLED
      // const actionCodeSettings = {
      //   // URL you want to redirect back to after password reset
      //   url: window.location.origin + '/signin',
      //   handleCodeInApp: false
      // };
      
      // await firebaseSendPasswordResetEmail(auth, email, actionCodeSettings);
      console.log('📧 Would send password reset email (EMAIL DISABLED)');
      
      console.log("Password reset email would be sent (EMAIL DISABLED)");
      toast({
        title: "Password reset email sent",
        description: "Check your inbox for instructions to reset your password.",
      });
    } catch (error: unknown) {
      console.error("Error in resetPassword:", error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error("Error code:", (error as { code?: string }).code || 'No error code');
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error sending reset email",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const sendEmailVerification = async () => {
    try {
      if (auth.currentUser) {
        // await firebaseSendEmailVerification(auth.currentUser);
        console.log('📧 Would send email verification (EMAIL DISABLED)');
        toast({
          title: "Email verification disabled",
          description: "Email verification is currently disabled in development mode.",
        });
      } else {
        throw new Error("No user is currently signed in");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error sending verification email",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out successfully",
        description: "See you next time!",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error signing out",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Update user profile (display name and/or photo URL)
  const updateProfile = async (data: { displayName?: string, photoURL?: string }) => {
    try {
      if (!auth.currentUser) {
        throw new Error("No user is currently signed in");
      }
      
      await firebaseUpdateProfile(auth.currentUser, data);
      
      toast({
        title: "Profile updated successfully",
        description: "Your profile information has been updated.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error updating profile",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Upload profile image to Firebase Storage
  const uploadProfileImage = async (file: File): Promise<string> => {
    try {
      if (!auth.currentUser) {
        throw new Error("No user is currently signed in");
      }
      
      const userId = auth.currentUser.uid;
      
      // Create a reference to the file location in Firebase Storage
      const storageRef = ref(storage, `profile-images/${userId}/${Date.now()}_${file.name}`);
      
      // Delete previous profile image if exists
      if (auth.currentUser.photoURL && auth.currentUser.photoURL.includes('profile-images')) {
        try {
          const oldImageRef = ref(storage, auth.currentUser.photoURL);
          await deleteObject(oldImageRef);
        } catch (error) {
          console.error("Error deleting old profile image:", error);
          // Continue even if deletion fails
        }
      }
      
      // Upload the file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update user profile with new photo URL
      await firebaseUpdateProfile(auth.currentUser, {
        photoURL: downloadURL
      });
      
      toast({
        title: "Profile image updated",
        description: "Your profile picture has been updated successfully.",
      });
      
      return downloadURL;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error uploading image",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update user password
  const updatePassword = async (newPassword: string) => {
    try {
      if (!auth.currentUser) {
        throw new Error("No user is currently signed in");
      }
      
      await firebaseUpdatePassword(auth.currentUser, newPassword);
      
      toast({
        title: "Password updated successfully",
        description: "Your password has been changed. Please use your new password next time you sign in.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check if we need to reauthenticate
      if (error instanceof Error && (error as { code?: string }).code === 'auth/requires-recent-login') {
        toast({
          title: "Session expired",
          description: "For security reasons, please sign in again before changing your password.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error updating password",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      throw error;
    }
  };

  // Delete user account
  const deleteAccount = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error("No user is currently signed in");
      }
      
      // Delete user profile image if exists
      if (auth.currentUser.photoURL && auth.currentUser.photoURL.includes('profile-images')) {
        try {
          const imageRef = ref(storage, auth.currentUser.photoURL);
          await deleteObject(imageRef);
        } catch (error) {
          console.error("Error deleting profile image:", error);
          // Continue with account deletion even if image deletion fails
        }
      }
      
      // Delete the user account
      await deleteUser(auth.currentUser);
      
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check if we need to reauthenticate
      if (error instanceof Error && (error as { code?: string }).code === 'auth/requires-recent-login') {
        toast({
          title: "Session expired",
          description: "For security reasons, please sign in again before deleting your account.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error deleting account",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    resetPassword,
    sendEmailVerification,
    updateProfile,
    updatePassword,
    uploadProfileImage,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
