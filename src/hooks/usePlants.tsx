import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  doc, 
  getDocs,
  getDoc,
  updateDoc,
  query, 
  where,
  orderBy,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { isBase64Image } from '@/lib/utils';

// Updated Plant interface to match what we're storing in Firestore
export interface Plant {
  id: string;
  userId: string;
  commonName: string;
  scientificName: string;
  imageUrl?: string; // Can be a base64 encoded image string or an external URL
  cycle: string;
  wateringSchedule?: string;
  soilMoisturePreference?: string;
  sunlightPreference?: string;
  notes?: string;
  dateAdded: Date;
  plantId?: number; // The ID from the plant API
}

export function usePlants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchPlants();
    } else {
      setPlants([]);
      setLoading(false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  // We're intentionally only running this effect when the user changes

  const fetchPlants = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Use nested collection path: users/{userId}/plants
      const plantsQuery = query(
        collection(db, 'users', user.uid, 'plants'),
        orderBy('dateAdded', 'desc')
      );
      
      const querySnapshot = await getDocs(plantsQuery);
      const plantsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: user.uid, // Ensure userId is always set
          ...data,
          dateAdded: data.dateAdded instanceof Timestamp ? 
            data.dateAdded.toDate() : 
            new Date(data.dateAdded)
        } as Plant;
      });
      
      setPlants(plantsData);
    } catch (error) {
      console.error('Error fetching plants:', error);
      toast({
        title: "Error loading plants",
        description: "Could not fetch your plants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const getPlantById = async (plantId: string): Promise<Plant | null> => {
    if (!user) return null;

    try {
      // Use nested collection path: users/{userId}/plants/{plantId}
      const plantDocRef = doc(db, 'users', user.uid, 'plants', plantId);
      const plantDoc = await getDoc(plantDocRef);
      
      if (!plantDoc.exists()) {
        return null;
      }
      
      const data = plantDoc.data();
      return {
        id: plantDoc.id,
        userId: user.uid,
        ...data,
        dateAdded: data.dateAdded instanceof Timestamp ? 
          data.dateAdded.toDate() : 
          new Date(data.dateAdded)
      } as Plant;
    } catch (error) {
      console.error('Error fetching plant by ID:', error);
      toast({
        title: "Error loading plant",
        description: "Could not fetch the plant details",
        variant: "destructive",
      });
      return null;
    }
  };
  
  const updatePlant = async (plantId: string, plantData: Partial<Omit<Plant, 'id' | 'dateAdded' | 'userId'>>) => {
    if (!user) return;

    try {
      // Check if the image is a base64 string and warn if it's large
      if (plantData.imageUrl && isBase64Image(plantData.imageUrl)) {
        const base64Size = Math.round((plantData.imageUrl.length * 3) / 4);
        const imageSizeInMB = base64Size / (1024 * 1024);
        
        if (imageSizeInMB > 0.9) {
          console.warn(`Warning: Image is too large for Firestore (${imageSizeInMB.toFixed(2)}MB). Firestore has a 1MB limit per document.`);
          toast({
            title: "Image too large",
            description: "Your image is too large to be stored. Please try again with a smaller image.",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Use nested collection path: users/{userId}/plants/{plantId}
      const plantDocRef = doc(db, 'users', user.uid, 'plants', plantId);
      
      await updateDoc(plantDocRef, {
        ...plantData,
        // Add an updated timestamp if needed
        lastUpdated: new Date()
      });
      
      // Update the plants array with the updated plant
      setPlants(prev => 
        prev.map(plant => 
          plant.id === plantId 
            ? { ...plant, ...plantData, lastUpdated: new Date() } 
            : plant
        )
      );
      
      toast({
        title: "Plant updated",
        description: "The plant has been updated successfully",
      });
      
      return true;
    } catch (error) {
      console.error('Error updating plant:', error);
      
      // Check for Firestore document size limit error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('longer than 1048487 bytes')) {
        toast({
          title: "Image too large",
          description: "Your image is too large to be stored. Please try again with a smaller image.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error updating plant",
          description: "Could not update your plant",
          variant: "destructive",
        });
      }
      
      return false;
    }
  };

  const addPlant = async (plantData: Omit<Plant, 'id' | 'dateAdded' | 'userId'>) => {
    if (!user) return;

    try {
      // Check if the image is a base64 string and warn if it's large
      if (plantData.imageUrl && isBase64Image(plantData.imageUrl)) {
        const base64Size = Math.round((plantData.imageUrl.length * 3) / 4);
        const imageSizeInMB = base64Size / (1024 * 1024);
        
        if (imageSizeInMB > 0.9) {
          console.warn(`Warning: Image is too large for Firestore (${imageSizeInMB.toFixed(2)}MB). Firestore has a 1MB limit per document.`);
          toast({
            title: "Image too large",
            description: "Your image is too large to be stored. Please try again with a smaller image.",
            variant: "destructive",
          });
          return;
        }
        
        if (imageSizeInMB > 0.5) {
          console.warn(`Large base64 image being stored in Firestore: ~${imageSizeInMB.toFixed(2)}MB`);
        }
      }
      
      // Use nested collection path: users/{userId}/plants
      const plantsCollectionRef = collection(db, 'users', user.uid, 'plants');
      
      const docRef = await addDoc(plantsCollectionRef, {
        ...plantData,
        // No need to store userId in document since it's implicit in the path
        dateAdded: new Date()
      });

      const newPlant = {
        id: docRef.id,
        userId: user.uid,
        ...plantData,
        dateAdded: new Date()
      };

      setPlants(prev => [newPlant, ...prev]);
      
      toast({
        title: "Plant added successfully!",
        description: `${plantData.commonName} has been added to your garden`,
      });

      return newPlant;
    } catch (error) {
      console.error('Error adding plant:', error);
      
      // Check for Firestore document size limit error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('longer than 1048487 bytes')) {
        toast({
          title: "Image too large",
          description: "Your image is too large to be stored. Please try again with a smaller image.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error adding plant",
          description: "Could not add your plant",
          variant: "destructive",
        });
      }
    }
  };

  const deletePlant = async (plantId: string) => {
    if (!user) return;

    try {
      setDeleting(plantId);
      // Use nested collection path: users/{userId}/plants/{plantId}
      await deleteDoc(doc(db, 'users', user.uid, 'plants', plantId));
      
      // Update state by removing the deleted plant
      setPlants(prev => prev.filter(plant => plant.id !== plantId));
      
      toast({
        title: "Plant removed",
        description: "The plant has been removed from your garden",
      });
    } catch (error) {
      console.error('Error deleting plant:', error);
      toast({
        title: "Error removing plant",
        description: "Could not remove the plant from your garden",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  return {
    plants,
    loading,
    deleting,
    addPlant,
    deletePlant,
    getPlantById,
    updatePlant,
    refetch: fetchPlants
  };
}