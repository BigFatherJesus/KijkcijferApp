'use client';

import { useState } from 'react';
import { ProcessedMonthData, ScheduleData } from '../types';
import { processExcelFile } from '../util/excelProcessor';
import { parseScheduleCSV } from '../util/programScheduleParser';
import { saveProcessedData, loadProcessedData } from '../util/storage';

interface DataUploaderProps {
  onDataProcessed: (setter: (prevData: ProcessedMonthData[]) => ProcessedMonthData[]) => void;
  onClearAll?: () => void; // Optional callback for clearing all data
}

export default function DataUploader({ onDataProcessed, onClearAll }: DataUploaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  // Helper function for safely formatting numbers
  const safeFormat = (num: number | undefined): string => {
    return num !== undefined ? num.toLocaleString() : '0';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    setDebugInfo("Verwerking gestart...");
    
    const fileNames = Array.from(files).map(file => file.name);
    setUploadedFiles(prev => [...prev, ...fileNames]);
    
    // Process each file
    for (const file of Array.from(files)) {
      try {
        setDebugInfo(prev => `${prev}\n\nVerwerken van bestand: ${file.name}`);
        
        // Check if it's a CSV file
        const isCSV = 
          file.type === 'text/csv' ||
          file.name.toLowerCase().endsWith('.csv');
        
        // Check if it's an Excel file
        const isExcel = 
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.name.toLowerCase().endsWith('.xlsx') || 
          file.name.toLowerCase().endsWith('.xls');
        
        if (!isExcel && !isCSV) {
          setDebugInfo(prev => `${prev}\nBestand ${file.name} is geen ondersteund bestandstype (type: ${file.type})`);
          setError(`Bestand ${file.name} is geen ondersteund bestandstype. Type: ${file.type}`);
          continue;
        }
        
        if (isCSV) {
          // Process CSV file (program schedule)
          setDebugInfo(prev => `${prev}\nCSV-bestand gedetecteerd, bezig met verwerken als programmering...`);
          
          try {
            const scheduleData = await parseScheduleCSV(file);
            
            // Format dates for display
            const formattedDates = Array.from(scheduleData.days.keys()).sort();
            const totalPrograms = Array.from(scheduleData.days.values())
              .reduce((total, programs) => total + programs.length, 0);
            
            // Log information
            setDebugInfo(prev => `${prev}\n✅ Succesvol verwerkt: ${scheduleData.days.size} dagen programmering`);
            setDebugInfo(prev => `${prev}\n• Week: ${scheduleData.weekNumber}/${scheduleData.year}`);
            setDebugInfo(prev => `${prev}\n• Totaal aantal programma's: ${totalPrograms}`);
            
            if (formattedDates.length > 0) {
              const sampleDate = formattedDates[0];
              const programs = scheduleData.days.get(sampleDate) || [];
              setDebugInfo(prev => `${prev}\n• Voorbeeld dag (${sampleDate}): ${programs.length} programma's`);
              
              if (programs.length > 0) {
                setDebugInfo(prev => `${prev}\n• Voorbeeldprogramma: ${programs[0].title} om ${programs[0].startTime}`);
              }
            }
            
            // Get existing data
            const existingData = onDataProcessed((prevData: ProcessedMonthData[]) => {
              return prevData;
            });
            
            // Merge program data with viewer data
            const mergedData = existingData.map(monthData => {
              const updatedDays = monthData.days.map(day => {
                // If the schedule has programs for this day, add them
                if (scheduleData.days.has(day.date)) {
                  return {
                    ...day,
                    programs: scheduleData.days.get(day.date) || []
                  };
                }
                return day;
              });
              
              return {
                ...monthData,
                days: updatedDays
              };
            });
            
            // Update the state with merged data
            onDataProcessed(() => mergedData);
            
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setDebugInfo(prev => `${prev}\n❌ FOUT bij verwerken van programmering: ${errorMessage}`);
            setError(`Fout bij verwerken van programmering in ${file.name}: ${errorMessage}`);
          }
          
          continue; // Skip to next file
        }
        
        // Process Excel file (viewer data)
        setDebugInfo(prev => `${prev}\nExcel-bestand gedetecteerd, bezig met verwerken als kijkcijfers...`);
        
        const processedData = await processExcelFile(file);
        
        if (!processedData || !processedData.days || processedData.days.length === 0) {
          setDebugInfo(prev => `${prev}\nGeen geldige data gevonden in ${file.name}`);
          continue;
        }
        
        // Log detailed information for debugging
        setDebugInfo(prev => `${prev}\n✅ Succesvol verwerkt: ${processedData.days.length} dagen gevonden in ${processedData.monthYear}`);
        setDebugInfo(prev => `${prev}\n• Totaal aantal kijkers: ${safeFormat(processedData.totalViewers)}`);
        
        if (processedData.days.length > 0) {
          const sampleDay = processedData.days[0];
          setDebugInfo(prev => `${prev}\n• Voorbeeld dag (${sampleDay.date}): ${safeFormat(sampleDay.totalViewers)} kijkers`);
          
          // Make sure peakHour is valid
          if (processedData.peakHour !== undefined && 
              processedData.peakHour >= 0 && 
              processedData.peakHour < 24 && 
              processedData.averageHourlyViewers?.[processedData.peakHour] !== undefined) {
            setDebugInfo(prev => `${prev}\n• Piekuur: ${processedData.peakHour}:00 (${safeFormat(processedData.averageHourlyViewers[processedData.peakHour])} kijkers)`);
          } else {
            setDebugInfo(prev => `${prev}\n• Piekuur: Niet gevonden`);
          }
        }
        
        // Add to existing data or create new array
        onDataProcessed((prevData: ProcessedMonthData[]) => {
          // Check if month already exists, if so, replace it
          const monthExists = prevData.findIndex(m => m.monthYear === processedData.monthYear);
          if (monthExists >= 0) {
            const newData = [...prevData];
            newData[monthExists] = processedData;
            return newData;
          }
          // Otherwise, add the new month data
          return [...prevData, processedData];
        });
      } catch (err) {
        console.error('Error processing file:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Fout bij verwerken van bestand ${file.name}: ${errorMessage}`);
        setDebugInfo(prev => `${prev}\n❌ FOUT: ${errorMessage}`);
      }
    }
    
    setIsLoading(false);
  };

  const clearData = () => {
    if (confirm('Weet u zeker dat u alle geüploade bestanden wilt wissen?')) {
      if (onClearAll) {
        onClearAll(); // Call parent component's clear function if provided
      } else {
        onDataProcessed(() => []);
      }
      setUploadedFiles([]);
      setDebugInfo('Alle gegevens zijn gewist.');
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm h-full border border-gray-200">
      <h2 className="text-lg font-medium mb-4 text-[#00001F] flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#F47B25]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        Kijkcijfers uploaden
      </h2>
      
      <div className="mb-4">
        <label 
          htmlFor="file-upload" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Selecteer Excel of CSV bestanden:
        </label>
        <label htmlFor="file-upload" className="block">
          <div className="border border-dashed border-[#F47B25] rounded-md p-4 bg-gray-50 hover:bg-orange-50 transition-colors cursor-pointer">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              multiple
              className="hidden"
            />
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-[#F47B25]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-1 text-sm text-gray-800 font-medium">Klik om bestanden te kiezen</p>
              <p className="mt-1 text-xs text-gray-600">(.xlsx, .xls of .csv)</p>
            </div>
          </div>
        </label>
      </div>
      
      {isLoading && (
        <div className="text-sm mb-4 p-3 bg-orange-50 rounded flex items-center">
          <svg className="animate-spin mr-2 h-4 w-4 text-[#F47B25]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-[#F47B25]">Verwerken...</span>
        </div>
      )}
      
      {error && (
        <div className="text-sm mb-4 p-3 bg-red-50 rounded flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-red-700 text-xs">{error}</span>
        </div>
      )}
      
      {uploadedFiles.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Geüploade bestanden ({uploadedFiles.length})
          </h3>
          
          <div className="mb-3 max-h-32 overflow-y-auto">
            <ul className="text-xs text-gray-600 space-y-1">
              {uploadedFiles.map((file, index) => (
                <li key={index} className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {file}
                </li>
              ))}
            </ul>
          </div>
          
          <button
            onClick={clearData}
            className="mt-2 px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50"
            type="button"
          >
            Alle gegevens wissen
          </button>
        </div>
      )}
      
      {debugInfo && (
        <div className="mt-4">
          <details>
            <summary className="text-xs text-gray-700 cursor-pointer">Verwerkingsdetails</summary>
            <div className="mt-2 text-xs text-gray-600 p-2 bg-gray-50 rounded border border-gray-200 whitespace-pre-line max-h-32 overflow-y-auto font-mono">
              {debugInfo}
            </div>
          </details>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        De gegevens worden opgeslagen in de browser.
      </div>
    </div>
  );
}