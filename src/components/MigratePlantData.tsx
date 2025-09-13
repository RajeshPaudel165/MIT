import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc,
  query,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// This utility will migrate plant data from the old flat structure
// to the new nested structure under user documents

export function MigratePlantData() {
  const [loading, setLoading] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [count, setCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const migrateData = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to migrate data",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Get all plants from the old structure
      const oldPlantsQuery = query(
        collection(db, 'user_plants'),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(oldPlantsQuery);
      
      if (querySnapshot.empty) {
        toast({
          title: "No data to migrate",
          description: "No plants found in the old data structure",
        });
        setLoading(false);
        return;
      }
      
      let migratedCount = 0;
      
      // For each old plant, add to the new structure
      for (const docSnapshot of querySnapshot.docs) {
        const plantData = docSnapshot.data();
        
        // Add to new structure
        await addDoc(collection(db, 'users', user.uid, 'plants'), {
          ...plantData,
          // Ensure dates are properly handled
          dateAdded: plantData.dateAdded instanceof Timestamp ? 
            plantData.dateAdded : 
            new Date(plantData.dateAdded)
        });
        
        // Optionally delete from old structure
        // Uncomment if you want to delete after migration
        // await deleteDoc(doc(db, 'user_plants', docSnapshot.id));
        
        migratedCount++;
      }
      
      setCount(migratedCount);
      setMigrated(true);
      
      toast({
        title: "Migration successful",
        description: `${migratedCount} plants migrated to the new data structure`,
      });
    } catch (error) {
      console.error('Error migrating data:', error);
      toast({
        title: "Migration failed",
        description: "An error occurred while migrating data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Data Migration Tool</h3>
      <p className="text-sm text-muted-foreground">
        Migrate your plant data to the new storage structure for improved performance.
      </p>
      
      {migrated ? (
        <div className="bg-green-50 p-3 rounded text-green-800 text-sm">
          Successfully migrated {count} plants to the new structure.
        </div>
      ) : (
        <Button 
          onClick={migrateData} 
          disabled={loading || !user}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Migrating...
            </>
          ) : (
            "Migrate Plant Data"
          )}
        </Button>
      )}
    </div>
  );
}
