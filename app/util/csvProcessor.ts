import { ProgramData, ScheduleData } from '../types';

/**
 * Converts HH:MM or H,MM format to a standardized HH:MM format
 */
function normalizeTimeFormat(timeStr: string): string {
  if (!timeStr) return '';
  
  // Handle comma-based format (e.g. "2,30" -> "02:30")
  if (timeStr.includes(',')) {
    const [hours, minutes] = timeStr.split(',');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
  
  // Handle standard format but ensure it's consistently formatted
  if (timeStr.includes(':')) {
    const [hours, minutes] = timeStr.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
  
  // If it's just a number (representing hours), add ":00"
  if (!isNaN(Number(timeStr))) {
    return `${timeStr.padStart(2, '0')}:00`;
  }
  
  return timeStr;
}

/**
 * Converts Dutch day names to English
 */
function translateDayOfWeek(dutchDay: string): string {
  const translations: Record<string, string> = {
    'maandag': 'Monday',
    'dinsdag': 'Tuesday',
    'woensdag': 'Wednesday',
    'donderdag': 'Thursday',
    'vrijdag': 'Friday',
    'zaterdag': 'Saturday',
    'zondag': 'Sunday'
  };
  
  return translations[dutchDay.toLowerCase()] || dutchDay;
}

/**
 * Converts date string in "DD-MM" or "DD-Month" format to "DD-MM-YYYY"
 */
function formatDateString(dateStr: string, year: number): string {
  if (!dateStr) return '';
  
  // If it's already in DD-MM-YYYY format, return as is
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Handle DD-MM format
  if (/^\d{1,2}-\d{1,2}$/.test(dateStr)) {
    const [day, month] = dateStr.split('-').map(part => part.padStart(2, '0'));
    return `${day}-${month}-${year}`;
  }
  
  // Handle DD-Month format
  const monthNames: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mrt': '03', 'mar': '03',
    'apr': '04', 'mei': '05', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'okt': '10',
    'oct': '10', 'nov': '11', 'dec': '12'
  };
  
  const matches = dateStr.match(/^(\d{1,2})-([a-z]{3})$/i);
  if (matches && matches.length === 3) {
    const day = matches[1].padStart(2, '0');
    const monthStr = matches[2].toLowerCase();
    const month = monthNames[monthStr] || '01';
    return `${day}-${month}-${year}`;
  }
  
  return dateStr;
}

/**
 * Process a CSV file containing program schedules
 */
export async function processScheduleCSV(file: File): Promise<ScheduleData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target || !e.target.result) {
          throw new Error("Failed to read CSV file");
        }
        
        const csvContent = e.target.result.toString();
        const lines = csvContent.split('\n');
        
        // Find the week number and year
        let weekNumber = 0;
        let year = new Date().getFullYear();
        
        // Check the first few lines for week/year information
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          // Look for week number
          const weekMatch = lines[i].match(/(\d{1,2})\s*,/);
          if (weekMatch && weekMatch[1]) {
            weekNumber = parseInt(weekMatch[1], 10);
          }
          
          // Look for year in various formats
          const yearMatch = lines[i].match(/(\d{4})/);
          if (yearMatch && yearMatch[1]) {
            year = parseInt(yearMatch[1], 10);
          }
        }
        
        // Find the column headers (days of the week)
        const dayColumns: { dayName: string, columnIndex: number }[] = [];
        const daysHeaderRow = lines.findIndex(line => 
          line.toLowerCase().includes('maandag') && 
          line.toLowerCase().includes('dinsdag')
        );
        
        if (daysHeaderRow === -1) {
          throw new Error("Could not find day headers in CSV file");
        }
        
        // The dates row is typically after the days header row
        const datesRow = daysHeaderRow + 1;
        
        // Parse the columns to find where each day's data starts
        const headerParts = lines[daysHeaderRow].split(',');
        const dateParts = lines[datesRow].split(',');
        
        // Find which columns contain days of the week
        for (let i = 0; i < headerParts.length; i++) {
          const part = headerParts[i].trim().toLowerCase();
          if (['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'].includes(part)) {
            const date = dateParts[i]?.trim() || '';
            dayColumns.push({
              dayName: part,
              columnIndex: i
            });
          }
        }
        
        if (dayColumns.length === 0) {
          throw new Error("Could not identify day columns in the CSV");
        }
        
        // Skip to the time rows, typically starting a few rows after the dates
        const dataStartRow = datesRow + 2;
        
        // Initialize the result structure
        const programsByDay = new Map<string, ProgramData[]>();
        
        // Initialize with empty arrays for each day
        dayColumns.forEach(({ dayName, columnIndex }) => {
          const dateStr = dateParts[columnIndex]?.trim() || '';
          const formattedDate = formatDateString(dateStr, year);
          if (formattedDate) {
            programsByDay.set(formattedDate, []);
          }
        });
        
        // Process each row in the CSV that contains time slots
        for (let rowIndex = dataStartRow; rowIndex < lines.length; rowIndex++) {
          const line = lines[rowIndex].trim();
          if (!line) continue;
          
          const cells = line.split(',');
          
          // The first column may contain the time slot (e.g. "8,00")
          const timeCell = cells[0]?.trim() || '';
          
          // Skip if it's not a time row
          if (!timeCell.match(/^\d{1,2}(,\d{2}|\.\d{2})?$/)) {
            continue;
          }
          
          // Convert time to standard format (HH:MM)
          const timeSlot = normalizeTimeFormat(timeCell);
          
          // Process each day column
          dayColumns.forEach(({ dayName, columnIndex }) => {
            if (columnIndex >= cells.length) return;
            
            const programTitle = cells[columnIndex]?.trim() || '';
            if (!programTitle) return;
            
            // Skip rows with non-program data
            if (programTitle.match(/^\d+(,\d+)?$/) || 
                programTitle === 'x' || 
                programTitle.length < 2) {
              return;
            }
            
            const dateStr = dateParts[columnIndex]?.trim() || '';
            const formattedDate = formatDateString(dateStr, year);
            
            if (!formattedDate) return;
            
            // Skip if we don't have an entry for this date
            if (!programsByDay.has(formattedDate)) return;
            
            // Create a program entry
            const program: ProgramData = {
              title: programTitle,
              startTime: timeSlot,
              dayOfWeek: translateDayOfWeek(dayName)
            };
            
            // Parse duration or end time if available in parentheses
            const durationMatch = programTitle.match(/\((\d+)\)/);
            if (durationMatch) {
              program.duration = parseInt(durationMatch[1], 10);
            }
            
            // Check if it's a repeat
            if (programTitle.includes('herhaling') || programTitle.includes('HERH')) {
              program.isRepeat = true;
            }
            
            // Add to the correct day
            programsByDay.get(formattedDate)?.push(program);
          });
        }
        
        // Calculate end times based on the next program's start time
        programsByDay.forEach((programs, date) => {
          // Sort programs by start time
          programs.sort((a, b) => {
            const timeA = a.startTime || '';
            const timeB = b.startTime || '';
            return timeA.localeCompare(timeB);
          });
          
          // Set end times
          for (let i = 0; i < programs.length - 1; i++) {
            programs[i].endTime = programs[i + 1].startTime;
          }
          
          // For the last program, estimate end time based on duration if available
          const lastProgram = programs[programs.length - 1];
          if (lastProgram && lastProgram.duration) {
            const startParts = lastProgram.startTime.split(':').map(Number);
            const startHour = startParts[0] || 0;
            const startMinute = startParts[1] || 0;
            
            let endHour = startHour;
            let endMinute = startMinute + (lastProgram.duration || 0);
            
            endHour += Math.floor(endMinute / 60);
            endMinute = endMinute % 60;
            
            lastProgram.endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
          }
        });
        
        resolve({
          weekNumber,
          year,
          days: programsByDay
        });
        
      } catch (error) {
        console.error("Error processing CSV:", error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Merge program schedule data with viewer data 
 */
export function mergeScheduleWithViewerData(
  viewerData: Map<string, any>, 
  scheduleData: ScheduleData
): Map<string, any> {
  // Create a copy of the viewer data
  const mergedData = new Map(viewerData);
  
  // Iterate through the schedule days and add program data to corresponding viewer days
  scheduleData.days.forEach((programs, dateStr) => {
    if (mergedData.has(dateStr)) {
      const dayData = mergedData.get(dateStr);
      dayData.programs = programs;
      mergedData.set(dateStr, dayData);
    }
  });
  
  return mergedData;
}