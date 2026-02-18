import { ProcessedMonthData, ScheduleData, ProgramData } from '../types';

// Storage keys
const VIEWER_DATA_KEY = 'kijkcijfers_data';
const PROGRAM_DATA_KEY = 'programmering_data';

/**
 * Save processed data to local storage
 */
export function saveProcessedData(data: ProcessedMonthData[]): void {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(VIEWER_DATA_KEY, serializedData);
    console.log(`Saved ${data.length} months of data to local storage`);
  } catch (error) {
    console.error('Error saving data to local storage:', error);
  }
}

/**
 * Load processed data from local storage
 */
export function loadProcessedData(): ProcessedMonthData[] {
  try {
    const serializedData = localStorage.getItem(VIEWER_DATA_KEY);
    if (!serializedData) {
      return [];
    }
    
    const data = JSON.parse(serializedData) as ProcessedMonthData[];
    console.log(`Loaded ${data.length} months of data from local storage`);
    return data;
  } catch (error) {
    console.error('Error loading data from local storage:', error);
    return [];
  }
}

/**
 * Clear all saved data from local storage
 */
export function clearProcessedData(): void {
  try {
    localStorage.removeItem(VIEWER_DATA_KEY);
    localStorage.removeItem(PROGRAM_DATA_KEY);
    console.log('All data cleared from local storage');
  } catch (error) {
    console.error('Error clearing data from local storage:', error);
  }
}

/**
 * Save program schedule data to local storage
 */
export function saveProgramData(data: ScheduleData): void {
  try {
    // Convert Map to object for JSON serialization
    const serializable = {
      weekNumber: data.weekNumber,
      year: data.year,
      days: Array.from(data.days.entries()).reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {} as Record<string, ProgramData[]>)
    };
    
    const serializedData = JSON.stringify(serializable);
    localStorage.setItem(PROGRAM_DATA_KEY, serializedData);
    console.log(`Saved program data for week ${data.weekNumber}/${data.year} to local storage`);
  } catch (error) {
    console.error('Error saving program data to local storage:', error);
  }
}

/**
 * Load program schedule data from local storage
 */
export function loadProgramData(): ScheduleData | null {
  try {
    const serializedData = localStorage.getItem(PROGRAM_DATA_KEY);
    if (!serializedData) {
      return null;
    }
    
    const parsed = JSON.parse(serializedData);
    
    // Convert object back to Map
    const days = new Map<string, ProgramData[]>();
    Object.entries(parsed.days).forEach(([date, programs]) => {
      days.set(date, programs as ProgramData[]);
    });
    
    const data = {
      weekNumber: parsed.weekNumber,
      year: parsed.year,
      days
    };
    
    console.log(`Loaded program data for week ${data.weekNumber}/${data.year} from local storage`);
    return data;
  } catch (error) {
    console.error('Error loading program data from local storage:', error);
    return null;
  }
}

/**
 * Merge program data into viewer data
 */
export function mergeViewerAndProgramData(
  viewerData: ProcessedMonthData[], 
  programData: ScheduleData
): ProcessedMonthData[] {
  if (!programData) return viewerData;
  
  try {
    // Create a deep copy of the viewer data
    const mergedData = JSON.parse(JSON.stringify(viewerData)) as ProcessedMonthData[];
    
    // Iterate through each month's data
    for (const monthData of mergedData) {
      // Iterate through each day in the month
      for (const day of monthData.days) {
        // Check if we have program data for this day
        if (programData.days.has(day.date)) {
          // Add program data to the day
          day.programs = programData.days.get(day.date) || [];
        }
      }
    }
    
    console.log(`Merged program data with ${mergedData.length} months of viewer data`);
    return mergedData;
  } catch (error) {
    console.error('Error merging viewer and program data:', error);
    return viewerData;
  }
} 