'use client';

import { useState, useEffect } from 'react';
import DataUploader from './components/DataUploader';
import ViewerChart from './components/ViewerChart';
import MonthComparison from './components/MonthComparison';
import ProgramSchedule from './components/ProgramSchedule';
import { ProcessedMonthData } from './types';
import { aggregateMonthsData } from './util/dataAggregator';
import { saveProcessedData, loadProcessedData, clearProcessedData } from './util/storage';

// Helper function to sort months chronologically
const sortMonthsChronologically = (months: ProcessedMonthData[]): ProcessedMonthData[] => {
  const monthOrder: Record<string, number> = {
    'Januari': 1, 'Februari': 2, 'Maart': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
    'Juli': 7, 'Augustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'December': 12
  };

  return [...months].sort((a, b) => {
    // Extract month and year
    const getMonthYear = (text: string) => {
      // Match month name and year (e.g., "November 2023")
      const match = text.match(/([A-Za-z]+)\s+(\d{4})/);
      if (!match) return { month: 0, year: 0 };
      
      const monthName = match[1];
      const year = parseInt(match[2], 10);
      
      // Find month number, default to 0 if not found
      const monthNum = monthOrder[monthName] || 0;
      
      return { month: monthNum, year };
    };
    
    const aInfo = getMonthYear(a.monthYear);
    const bInfo = getMonthYear(b.monthYear);
    
    // Sort by year first, then by month
    if (aInfo.year !== bInfo.year) {
      return aInfo.year - bInfo.year;
    }
    
    return aInfo.month - bInfo.month;
  });
};

export default function Home() {
  const [monthsData, setMonthsData] = useState<ProcessedMonthData[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [showAggregate, setShowAggregate] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [activeTab, setActiveTab] = useState<'viewers' | 'programs'>('viewers');
  const [loading, setLoading] = useState(true);
  const [logo, setLogo] = useState<string | null>(null);

  // Load saved data on component mount
  useEffect(() => {
    try {
      // Load viewer data
      let savedData = loadProcessedData();
      
      if (savedData && savedData.length > 0) {
        // Sort the data chronologically when loading
        const sortedData = sortMonthsChronologically(savedData);
        setMonthsData(sortedData);
        // Select the first month by default (the earliest month)
        if (sortedData.length > 0) {
          setSelectedMonths([sortedData[0].monthYear]);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update storage when data changes
  useEffect(() => {
    if (!loading && monthsData.length > 0) {
      saveProcessedData(monthsData);
    }
  }, [monthsData, loading]);

  // Handle data updates and save to storage
  const handleDataProcessed = (setter: (prevData: ProcessedMonthData[]) => ProcessedMonthData[]) => {
    setMonthsData(prev => {
      const newData = setter(prev);
      // Sort the data chronologically after updating
      return sortMonthsChronologically(newData);
    });
  };

  // Clear all data from storage
  const handleClearAllData = () => {
    if (confirm('Weet u zeker dat u alle gegevens wilt wissen? Dit kan niet ongedaan worden gemaakt.')) {
      clearProcessedData();
      setMonthsData([]);
      setSelectedMonths([]);
    }
  };

  // Select or deselect a month
  const toggleMonthSelection = (monthYear: string) => {
    setSelectedMonths(prev => {
      // If this month is already the only selected month, do nothing
      if (prev.length === 1 && prev[0] === monthYear) {
        return prev;
      }
      
      // Otherwise, select only this month
      return [monthYear];
    });
  };

  // Get the selected months' data
  const getSelectedData = (): ProcessedMonthData | null => {
    if (monthsData.length === 0) return null;
    
    // If showing aggregate, we always aggregate all months, regardless of selection
    if (showAggregate) {
      console.log("AGGREGATING ALL MONTHS DATA:", monthsData.length, "months");
      return aggregateMonthsData(monthsData);
    }
    
    // If not showing aggregate but we have selected months, show the selected month
    if (selectedMonths.length > 0) {
      const selectedData = monthsData.find(data => data.monthYear === selectedMonths[0]);
      console.log("SHOWING SINGLE MONTH:", selectedMonths[0]);
      return selectedData || null;
    }
    
    // Default: show the first month
    console.log("DEFAULT: SHOWING FIRST MONTH:", monthsData[0]?.monthYear);
    return monthsData[0] || null;
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    // Check if file is an Excel file by extension
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    
    if (!isExcel) {
      alert('Alleen Excel-bestanden (.xlsx, .xls) zijn toegestaan.');
      return;
    }
  };
  
  // The currently active data
  const activeData = getSelectedData();

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col-reverse md:flex-row justify-between items-center">
          <div className="mt-4 md:mt-0">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Kijkcijfers Visualisatie</h1>
            <p className="text-gray-600 text-sm">Analyse van televisiekijkcijfers</p>
          </div>
          
          {/* Logo area */}
          <div className="relative h-36 md:h-44 w-full md:w-auto mb-4 md:mb-0">
            <img 
              src="/images/logo.png" 
              alt="Kompas Logo" 
              className="h-full max-w-sm mx-auto md:mx-0" 
            />
          </div>
        </header>
        
        <div className="mb-6">
          {/* Tab navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('viewers')}
                className={`pb-2 pt-1 px-1 ${
                  activeTab === 'viewers'
                    ? 'border-b-2 border-[#F47B25] text-[#F47B25] font-medium'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Kijkcijfers</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('programs')}
                className={`pb-2 pt-1 px-1 ${
                  activeTab === 'programs'
                    ? 'border-b-2 border-[#F47B25] text-[#F47B25] font-medium'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Programmering</span>
                </div>
              </button>
            </nav>
          </div>
          
          {activeTab === 'viewers' && (
            <div className="bg-white p-5 rounded-lg shadow-sm mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-800">Selecteer periode</h2>
                </div>
                
                <div className="flex-1 flex flex-wrap gap-2">
                  {monthsData.map((data) => (
                    <button
                      key={data.monthYear}
                      className={`px-3 py-1 text-sm rounded-md ${
                        selectedMonths.includes(data.monthYear)
                          ? 'bg-[#F47B25] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => toggleMonthSelection(data.monthYear)}
                    >
                      {data.monthYear}
                    </button>
                  ))}
                </div>
                
                <div className="flex space-x-4">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="show-aggregate"
                      checked={showAggregate}
                      onChange={() => {
                        setShowAggregate(!showAggregate);
                        if (!showAggregate) {
                          setShowComparison(false);
                        }
                      }}
                      className="form-checkbox h-4 w-4 text-[#F47B25] rounded focus:ring-0"
                    />
                    <span className="ml-2 text-sm">Combineer alle data</span>
                  </label>
                  
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="show-comparison"
                      checked={showComparison}
                      onChange={() => {
                        setShowComparison(!showComparison);
                        if (!showComparison) {
                          setShowAggregate(false);
                        }
                      }}
                      className="form-checkbox h-4 w-4 text-[#F47B25] rounded focus:ring-0"
                    />
                    <span className="ml-2 text-sm">Vergelijk maanden</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* File uploader section */}
            <div className="md:col-span-1">
              <DataUploader 
                onDataProcessed={handleDataProcessed}
                onClearAll={handleClearAllData}
              />
            </div>
            
            {/* Visualization section */}
            <div className="md:col-span-3">
              {loading ? (
                <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center h-96">
                  <div className="text-center">
                    <svg className="animate-spin h-8 w-8 text-[#F47B25] mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">Gegevens laden...</p>
                  </div>
                </div>
              ) : monthsData.length > 0 ? (
                activeTab === 'viewers' ? (
                  showComparison ? (
                    <MonthComparison months={monthsData} />
                  ) : activeData ? (
                    <ViewerChart data={activeData} />
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center h-96 flex flex-col justify-center">
                      <p className="text-gray-500">
                        Selecteer een maand om de gegevens te bekijken.
                      </p>
                    </div>
                  )
                ) : (
                  activeData ? (
                    <ProgramSchedule data={activeData} />
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center h-96 flex flex-col justify-center">
                      <p className="text-gray-500">
                        Selecteer een maand om de programmering te bekijken.
                      </p>
                    </div>
                  )
                )
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center h-96 flex flex-col justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Geen gegevens beschikbaar</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {activeTab === 'viewers' 
                      ? 'Upload Excel-bestanden met kijkcijfergegevens via het uploadformulier om te beginnen.'
                      : 'Upload CSV-bestanden met programmeringsgegevens via het uploadformulier om te beginnen.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Kijkcijfer App</p>
        </footer>
      </div>
    </main>
  );
} 