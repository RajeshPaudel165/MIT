import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Check if a string is a base64 encoded image
export function isBase64Image(str: string): boolean {
  return typeof str === 'string' && str.startsWith('data:image/');
}

// Format a date in a human-readable format
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// Convert an image file to base64 with optional compression
export async function imageToBase64(file: File, maxSizeKB: number = 900): Promise<string> {
  // For small files, just use the standard FileReader approach
  if (file.size <= maxSizeKB * 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
  
  // For larger files, use canvas to compress the image
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const reader = new FileReader();
    
    reader.onload = function(e) {
      img.src = e.target?.result as string;
      
      img.onload = function() {
        // Calculate scale factor to reduce image size
        let quality = 0.7; // Start with 70% quality
        let width = img.width;
        let height = img.height;
        
        // If image is very large, scale down dimensions
        const MAX_DIMENSION = 1200;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scaleFactor = MAX_DIMENSION / Math.max(width, height);
          width = width * scaleFactor;
          height = height * scaleFactor;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Try to compress to target size
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // If still too large, reduce quality further
        let attempts = 0;
        while (dataUrl.length > maxSizeKB * 1024 * 1.37 && attempts < 5) { // 1.37 factor for base64 overhead
          attempts++;
          quality = quality * 0.8; // Reduce quality by 20% each time
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        
        console.log(`Compressed image from ${Math.round(file.size/1024)}KB to ~${Math.round(dataUrl.length/1024)}KB (quality: ${Math.round(quality*100)}%)`);
        resolve(dataUrl);
      };
      
      img.onerror = function() {
        reject(new Error('Failed to load image for compression'));
      };
    };
    
    reader.onerror = function() {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}
