import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, X } from 'lucide-react';
import PlantReport from './PlantReport';
import { Plant } from '@/hooks/usePlants';

interface PlantReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  plant: Plant;
  aiResult?: string | null;
}

export default function PlantReportModal({ isOpen, onClose, plant, aiResult }: PlantReportModalProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const reportElement = document.getElementById('plant-report');
      if (reportElement) {
        const reportHTML = reportElement.outerHTML;
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Plant Report - ${plant.commonName}</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 210mm;
                  margin: 0 auto;
                  padding: 20mm;
                }
                
                .print\\:p-6 {
                  padding: 1.5rem;
                }
                
                @media print {
                  body {
                    padding: 10mm;
                  }
                  
                  .no-print {
                    display: none !important;
                  }
                  
                  * {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                  }
                }
                
                h1, h2, h3 {
                  color: #1f2937;
                }
                
                .text-3xl {
                  font-size: 1.875rem;
                  line-height: 2.25rem;
                }
                
                .text-xl {
                  font-size: 1.25rem;
                  line-height: 1.75rem;
                }
                
                .text-lg {
                  font-size: 1.125rem;
                  line-height: 1.75rem;
                }
                
                .font-bold {
                  font-weight: 700;
                }
                
                .font-semibold {
                  font-weight: 600;
                }
                
                .font-medium {
                  font-weight: 500;
                }
                
                .text-gray-900 {
                  color: #111827;
                }
                
                .text-gray-600 {
                  color: #4b5563;
                }
                
                .text-gray-500 {
                  color: #6b7280;
                }
                
                .text-gray-400 {
                  color: #9ca3af;
                }
                
                .text-green-600 {
                  color: #059669;
                }
                
                .text-blue-600 {
                  color: #2563eb;
                }
                
                .text-yellow-600 {
                  color: #d97706;
                }
                
                .text-red-600 {
                  color: #dc2626;
                }
                
                .bg-gray-50 {
                  background-color: #f9fafb;
                }
                
                .bg-blue-50 {
                  background-color: #eff6ff;
                }
                
                .bg-yellow-50 {
                  background-color: #fffbeb;
                }
                
                .bg-teal-50 {
                  background-color: #f0fdfa;
                }
                
                .bg-green-50 {
                  background-color: #ecfdf5;
                }
                
                .rounded-lg {
                  border-radius: 0.5rem;
                }
                
                .p-4 {
                  padding: 1rem;
                }
                
                .p-3 {
                  padding: 0.75rem;
                }
                
                .mb-2 {
                  margin-bottom: 0.5rem;
                }
                
                .mb-4 {
                  margin-bottom: 1rem;
                }
                
                .mb-8 {
                  margin-bottom: 2rem;
                }
                
                .grid {
                  display: grid;
                }
                
                .grid-cols-1 {
                  grid-template-columns: repeat(1, minmax(0, 1fr));
                }
                
                .grid-cols-2 {
                  grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                
                .grid-cols-3 {
                  grid-template-columns: repeat(3, minmax(0, 1fr));
                }
                
                .gap-3 {
                  gap: 0.75rem;
                }
                
                .gap-4 {
                  gap: 1rem;
                }
                
                .gap-6 {
                  gap: 1.5rem;
                }
                
                .flex {
                  display: flex;
                }
                
                .items-center {
                  align-items: center;
                }
                
                .items-start {
                  align-items: flex-start;
                }
                
                .justify-center {
                  justify-content: center;
                }
                
                .text-center {
                  text-align: center;
                }
                
                .space-y-3 > * + * {
                  margin-top: 0.75rem;
                }
                
                .space-y-4 > * + * {
                  margin-top: 1rem;
                }
                
                .border-b {
                  border-bottom-width: 1px;
                }
                
                .border-t {
                  border-top-width: 1px;
                }
                
                .pb-6 {
                  padding-bottom: 1.5rem;
                }
                
                .pt-8 {
                  padding-top: 2rem;
                }
                
                .my-8 {
                  margin-top: 2rem;
                  margin-bottom: 2rem;
                }
                
                .italic {
                  font-style: italic;
                }
                
                .whitespace-pre-line {
                  white-space: pre-line;
                }
                
                @media (min-width: 768px) {
                  .md\\:grid-cols-2 {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                  }
                  
                  .md\\:grid-cols-3 {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                  }
                  
                  .md\\:grid-cols-4 {
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                  }
                }
              </style>
            </head>
            <body>
              ${reportHTML}
            </body>
          </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // Small delay to ensure content is loaded before printing
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  const handleDownload = async () => {
    try {
      // For now, we'll use the print function as download
      // In a real implementation, you might want to use a library like jsPDF or Puppeteer
      handlePrint();
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold">
            Plant Health Report - {plant.commonName}
          </DialogTitle>
          <div className="flex gap-2 no-print">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="mt-4">
          <PlantReport plant={plant} aiResult={aiResult} />
        </div>
      </DialogContent>
    </Dialog>
  );
}