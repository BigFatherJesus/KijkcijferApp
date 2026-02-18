import { ProgramData, ScheduleData } from '../types';

/**
 * Parses TV program schedule from CSV data
 */
export async function parseScheduleCSV(file: File): Promise<ScheduleData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target || !e.target.result) {
          throw new Error("Failed to read CSV file");
        }
        
        const csvContent = e.target.result.toString();
        const lines = csvContent.split('\n');
        
        // Initialize results
        const result: ScheduleData = {
          weekNumber: 0,
          year: new Date().getFullYear(),
          days: new Map<string, ProgramData[]>()
        };
        
        // For multi-week schedules
        result.weeks = [];
        
        // Extract week number and year from the first few rows
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const line = lines[i];
          
          // Look for week number (typically in 3rd row)
          const weekMatch = line.match(/^(\d{1,2}),/);
          if (weekMatch && weekMatch[1]) {
            const weekNum = parseInt(weekMatch[1], 10);
            result.weekNumber = weekNum;
            
            // Add to weeks list if not already there
            if (!result.weeks.includes(weekNum)) {
              result.weeks.push(weekNum);
            }
          }
          
          // Look for year in date formats (e.g., 25-Dec-2024)
          const yearMatch = line.match(/\b(20\d{2})\b/);
          if (yearMatch && yearMatch[1]) {
            result.year = parseInt(yearMatch[1], 10);
          }
        }
        
        // Check for other week numbers in the document (for multi-week schedules)
        for (let i = 5; i < lines.length; i++) {
          const line = lines[i];
          if (!line || line.length < 2) continue;
          
          // Look for standalone week numbers at the start of lines
          const weekMatch = line.match(/^([1-9][0-9]?),/);
          if (weekMatch && weekMatch[1]) {
            const weekNum = parseInt(weekMatch[1], 10);
            
            // Add to weeks list if not already there
            if (!result.weeks.includes(weekNum)) {
              result.weeks.push(weekNum);
            }
          }
        }
        
        // Find the days row (usually the 2nd row)
        const dayNames = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
        let dayRowIndex = -1;
        
        for (let i = 0; i < 5; i++) {
          const rowLower = lines[i].toLowerCase();
          if (dayNames.some(day => rowLower.includes(day))) {
            dayRowIndex = i;
            break;
          }
        }
        
        if (dayRowIndex === -1) {
          throw new Error("Could not find day headers in CSV");
        }
        
        // The dates row is right after the days row
        const datesRowIndex = dayRowIndex + 1;
        
        // Parse the day columns
        const daysCols: {
          name: string;
          index: number;
          date: string;
        }[] = [];
        
        const daysRow = parseCsvRow(lines[dayRowIndex]);
        const datesRow = parseCsvRow(lines[datesRowIndex]);
        
        // Find which columns contain days of the week
        for (let i = 0; i < daysRow.length; i++) {
          const cell = daysRow[i].toLowerCase();
          for (const day of dayNames) {
            if (cell.includes(day)) {
              daysCols.push({
                name: day,
                index: i,
                date: formatDateString(datesRow[i], result.year)
              });
              break;
            }
          }
        }
        
        if (daysCols.length === 0) {
          throw new Error("Could not identify day columns");
        }
        
        // Initialize program arrays for each day
        daysCols.forEach(({ date }) => {
          if (date) {
            result.days.set(date, []);
          }
        });
        
        // Find where the time rows start (typically after a few empty rows)
        let timeStartRow = datesRowIndex + 1;
        while (timeStartRow < lines.length) {
          const row = parseCsvRow(lines[timeStartRow]);
          // Look for time format in first column (e.g., "0,00")
          if (row[0] && /^\d{1,2}(,\d{2}|\.\d{2}|\:\d{2})$/.test(row[0])) {
            break;
          }
          timeStartRow++;
        }
        
        // Process each time row
        for (let rowIndex = timeStartRow; rowIndex < lines.length; rowIndex++) {
          const rowData = parseCsvRow(lines[rowIndex]);
          if (rowData.length < 3) continue;
          
          // Get the time from the first column
          const timeCell = rowData[0];
          if (!timeCell) continue;
          
          // Skip if it's not a time row
          if (!/^\d{1,2}(,\d{2}|\.\d{2}|\:\d{2})$/.test(timeCell)) {
            continue;
          }
          
          // Normalize time format
          const normalizedTime = normalizeTimeFormat(timeCell);
          
          // Process each day's program at this time
          for (const { index, date } of daysCols) {
            if (!date || !result.days.has(date)) continue;
            
            const programTitle = rowData[index];
            if (!programTitle || programTitle === 'x' || /^\d+([,.]\d+)?$/.test(programTitle)) {
              continue;
            }
            
            // Skip if it's likely a date rather than a program title
            if (isLikelyDate(programTitle)) {
              continue;
            }
            
            // Determine the current week number
            let currentWeek = result.weekNumber;
            
            // For multi-week schedules, try to determine the week from context
            if (result.weeks.length > 1) {
              // Find the closest week number declaration before this row
              for (let w = rowIndex; w >= 0; w--) {
                const weekLine = lines[w];
                if (!weekLine) continue;
                
                const weekMatch = weekLine.match(/^([1-9][0-9]?),/);
                if (weekMatch && weekMatch[1]) {
                  currentWeek = parseInt(weekMatch[1], 10);
                  break;
                }
              }
            }
            
            // Create a program entry with unique ID
            const program: ProgramData = {
              id: `${date}-${normalizedTime}-${Math.random().toString(36).substring(2, 9)}`,
              title: cleanProgramTitle(programTitle),
              startTime: normalizedTime,
              day: date,
              dayOfWeek: getDayOfWeek(date),
              originalTime: timeCell, // Store original time for debugging
              week: currentWeek // Add week number
            };
            
            // Parse duration from different formats
            // Format 1: Number in parentheses, e.g. "Title (25)"
            const durationMatch1 = programTitle.match(/\((\d+)\)/);
            if (durationMatch1) {
              program.duration = parseInt(durationMatch1[1], 10);
            }
            
            // Format 2: Duration at the end, e.g. "Title 50 min"
            const durationMatch2 = programTitle.match(/(\d+)\s*(?:min|minutes|minuten)$/i);
            if (!program.duration && durationMatch2) {
              program.duration = parseInt(durationMatch2[1], 10);
            }
            
            // Format 3: Specific time mentioned, e.g. "0.36" or "1.4" or "2.13"
            const timePointMatch = programTitle.match(/\b(\d+)[,.](\d{1,2})\b/);
            if (!program.duration && timePointMatch) {
              // This might be a time point rather than a duration; store it for reference
              program.timePoint = `${timePointMatch[1].padStart(2, '0')}:${timePointMatch[2].padStart(2, '0')}`;
            }
            
            // Check if it's a repeat
            if (programTitle.toLowerCase().includes('herhaling') || 
                programTitle.toLowerCase().includes('herh')) {
              program.isRepeat = true;
            }
            
            // Add notes for special cases
            if (programTitle.includes('FILM:') || programTitle.includes('film:')) {
              program.category = 'Film';
            } else if (programTitle.includes('SERIE:') || programTitle.includes('serie:')) {
              program.category = 'Series';
            }
            
            // Handle potential overrides by time slot (grouping by time slot and week)
            const existingPrograms = result.days.get(date)!.filter(p => 
              p.startTime === normalizedTime && p.week === currentWeek
            );
            
            if (existingPrograms.length > 0) {
              // If we already have a program at this time in the same week, add a sequence indicator
              program.sequence = existingPrograms.length + 1;
              program.notes = program.notes || '';
              if (program.notes) program.notes += ', ';
              program.notes += `Multiple programs at ${normalizedTime} (Week ${currentWeek})`;
            }
            
            // Add to the schedule
            result.days.get(date)!.push(program);
          }
        }
        
        // Calculate end times based on the next program's start time
        calculateEndTimes(result);
        
        resolve(result);
      } catch (error) {
        console.error("Error parsing schedule CSV:", error);
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
 * Parse a CSV row considering commas within quotes
 */
function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let cell = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  
  // Add the last cell
  result.push(cell.trim());
  
  return result;
}

/**
 * Clean a program title by removing duration and other metadata
 */
function cleanProgramTitle(title: string): string {
  // Remove duration in parentheses
  return title.replace(/\s*\(\d+\)\s*$/, '').trim();
}

/**
 * Convert time formats to standardized HH:MM
 * Handles various formats and normalizes hours > 24 to standard 24-hour format
 */
function normalizeTimeFormat(timeStr: string): string {
  if (!timeStr) return '';
  
  // Handle comma-based format (e.g. "2,00" -> "02:00")
  if (timeStr.includes(',')) {
    const [hours, minutes] = timeStr.split(',');
    // Handle hours > 24 (convert to standard 24-hour format)
    let hoursNum = parseInt(hours, 10);
    if (hoursNum >= 24) {
      hoursNum = hoursNum % 24;
    }
    return `${hoursNum.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
  
  // Handle dot-based format (e.g. "2.00" -> "02:00")
  if (timeStr.includes('.')) {
    const [hours, minutes] = timeStr.split('.');
    // Handle hours > 24 (convert to standard 24-hour format)
    let hoursNum = parseInt(hours, 10);
    if (hoursNum >= 24) {
      hoursNum = hoursNum % 24;
    }
    return `${hoursNum.toString().padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`;
  }
  
  // Handle standard format (e.g. "2:00" -> "02:00")
  if (timeStr.includes(':')) {
    const [hours, minutes] = timeStr.split(':');
    // Handle hours > 24 (convert to standard 24-hour format)
    let hoursNum = parseInt(hours, 10);
    if (hoursNum >= 24) {
      hoursNum = hoursNum % 24;
    }
    return `${hoursNum.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
  
  // If it's just a number, add ":00"
  if (!isNaN(Number(timeStr))) {
    let hoursNum = parseInt(timeStr, 10);
    if (hoursNum >= 24) {
      hoursNum = hoursNum % 24;
    }
    return `${hoursNum.toString().padStart(2, '0')}:00`;
  }
  
  return timeStr;
}

/**
 * Format a date string to DD-MM-YYYY format
 */
function formatDateString(dateStr: string, year: number): string {
  if (!dateStr) return '';
  
  dateStr = dateStr.trim();
  
  // If it's already in DD-MM-YYYY format
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
    // Ensure day and month are padded with zeros
    const [day, month, yearPart] = dateStr.split('-');
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${yearPart}`;
  }
  
  // If it's in DD-MM format
  if (/^\d{1,2}-\d{1,2}$/.test(dateStr)) {
    const [day, month] = dateStr.split('-');
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }
  
  // If it's in DD-Month format (e.g., "25-Dec")
  const monthMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3,})$/);
  if (monthMatch) {
    const day = monthMatch[1].padStart(2, '0');
    const monthName = monthMatch[2].toLowerCase();
    
    // Convert month name to number
    const monthMap: Record<string, string> = {
      'jan': '01', 'feb': '02', 'mrt': '03', 'mar': '03',
      'apr': '04', 'mei': '05', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'okt': '10',
      'oct': '10', 'nov': '11', 'dec': '12'
    };
    
    const monthNumber = monthMap[monthName.substring(0, 3)] || '01';
    return `${day}-${monthNumber}-${year}`;
  }
  
  // If it's just the day
  const dayMatch = dateStr.match(/^(\d{1,2})$/);
  if (dayMatch) {
    return `${dayMatch[1].padStart(2, '0')}-01-${year}`;
  }
  
  return `01-01-${year}`;
}

/**
 * Get the day of week from a date string
 */
function getDayOfWeek(dateStr: string): string {
  const [day, month, year] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Checks if a string is likely a date rather than a program title
 */
function isLikelyDate(str: string): boolean {
  if (!str) return false;
  
  str = String(str).trim();
  
  // Match common date formats
  const datePatterns = [
    /^\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}$/, // DD-MM-YYYY, MM/DD/YYYY, etc.
    /^\d{1,2}[-\s][A-Za-z]{3,}[-\s]\d{2,4}$/, // 25 Dec 2023, 25-Dec-2023
    /^[A-Za-z]{3,}[-\s]\d{1,2}[-\s]\d{2,4}$/, // Dec 25 2023, Dec-25-2023
    /^\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}$/, // YYYY-MM-DD, YYYY/MM/DD
    /^\d{1,2}$/ // Single number (like day of month)
  ];
  
  // Check if the string matches any date pattern
  for (const pattern of datePatterns) {
    if (pattern.test(str)) {
      return true;
    }
  }
  
  // Check for Dutch month names
  const dutchMonths = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni', 
    'juli', 'augustus', 'september', 'oktober', 'november', 'december',
    'jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
  ];
  
  // Check if string contains a month name (case insensitive)
  const lowerStr = str.toLowerCase();
  if (dutchMonths.some(month => lowerStr.includes(month)) && 
      /\d+/.test(lowerStr)) { // Must have at least one digit to be a date
    return true;
  }
  
  // Check for days of the week
  const days = [
    'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ];
  
  // If it's just a day of the week, consider it a date
  if (days.some(day => lowerStr === day.toLowerCase())) {
    return true;
  }
  
  return false;
}

/**
 * Calculate end times for all programs
 */
function calculateEndTimes(data: ScheduleData): void {
  data.days.forEach((programs, date) => {
    // First, handle multiple programs at same time slot by adding sequence numbers
    // Group by week and time
    const weekTimeSlotMap = new Map<string, ProgramData[]>();
    
    programs.forEach(program => {
      const week = program.week || 0;
      const time = program.startTime;
      const key = `${week}-${time}`;
      
      if (!weekTimeSlotMap.has(key)) {
        weekTimeSlotMap.set(key, []);
      }
      weekTimeSlotMap.get(key)!.push(program);
    });
    
    // Assign sequence numbers to programs with the same start time in the same week
    weekTimeSlotMap.forEach((timePrograms, key) => {
      if (timePrograms.length > 1) {
        timePrograms.forEach((program, index) => {
          program.sequence = index + 1;
          if (!program.notes) program.notes = '';
          if (program.notes) program.notes += ', ';
          program.notes += `Multiple programs (${index + 1}/${timePrograms.length})`;
        });
      }
    });
    
    // Sort programs by week, start time, and then by sequence
    programs.sort((a, b) => {
      // First sort by week
      const weekA = a.week || 0;
      const weekB = b.week || 0;
      if (weekA !== weekB) return weekA - weekB;
      
      // Then by time
      const timeComparison = a.startTime.localeCompare(b.startTime);
      if (timeComparison !== 0) return timeComparison;
      
      // Then by sequence
      return ((a.sequence || 0) - (b.sequence || 0));
    });
    
    // Set end times based on the next program's start time or sequence
    for (let i = 0; i < programs.length - 1; i++) {
      const currentProgram = programs[i];
      const nextProgram = programs[i + 1];
      
      // If this is part of a multi-program time slot in the same week
      if (currentProgram.sequence && 
          currentProgram.startTime === nextProgram.startTime && 
          (currentProgram.sequence + 1) === nextProgram.sequence &&
          currentProgram.week === nextProgram.week) {
        // For multiple programs at same time, set a default duration if not specified
        if (!currentProgram.duration) {
          currentProgram.duration = 15; // Default duration for multi-program slots (minutes)
          
          // Calculate end time based on this duration
          const [startHour, startMinute] = currentProgram.startTime.split(':').map(Number);
          let endMinute = startMinute + currentProgram.duration;
          let endHour = startHour;
          
          if (endMinute >= 60) {
            endHour = (endHour + Math.floor(endMinute / 60)) % 24;
            endMinute = endMinute % 60;
          }
          
          currentProgram.endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        }
      } else {
        // Normal case - this program ends when the next one starts
        currentProgram.endTime = nextProgram.startTime;
        
        // Calculate duration if not already set
        if (!currentProgram.duration && currentProgram.startTime && currentProgram.endTime) {
          const [startHour, startMinute] = currentProgram.startTime.split(':').map(Number);
          const [endHour, endMinute] = currentProgram.endTime.split(':').map(Number);
          
          let durationMinutes = (endHour - startHour) * 60 + (endMinute - startMinute);
          
          // Handle crossing midnight
          if (durationMinutes < 0) {
            durationMinutes += 24 * 60;
          }
          
          currentProgram.duration = durationMinutes;
        }
      }
    }
    
    // For the last program, if we have duration, calculate end time
    const lastProgram = programs[programs.length - 1];
    if (lastProgram) {
      if (lastProgram.duration && !lastProgram.endTime) {
        const [startHour, startMinute] = lastProgram.startTime.split(':').map(Number);
        
        let endMinute = startMinute + lastProgram.duration;
        let endHour = startHour + Math.floor(endMinute / 60);
        endMinute %= 60;
        endHour %= 24;
        
        lastProgram.endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      } else if (!lastProgram.duration && !lastProgram.endTime) {
        // Default duration of 60 minutes if not specified
        lastProgram.duration = 60;
        
        const [startHour, startMinute] = lastProgram.startTime.split(':').map(Number);
        let endHour = (startHour + 1) % 24; // Default 1 hour duration
        
        lastProgram.endTime = `${endHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      }
    }
  });
}