import * as XLSX from 'xlsx';
import { ProcessedMonthData, DailyData, AgeGroupData } from '../types';

/**
 * Convert Excel date serial number to a formatted date string
 */
function excelDateToString(serial: number): string {
  if (!serial) return '';
  
  // Excel's epoch starts on 1/1/1900
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const date = new Date(utcValue * 1000);
  
  // Format as DD-MM-YYYY
  return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
}

/**
 * Helper function for safely formatting numbers
 */
function safeFormat(num: number | undefined): string {
  return num !== undefined ? num.toLocaleString() : '0';
}

/**
 * Get simulated age group distribution based on the hour of the day
 * This is a mockup function and should be replaced with real data when available
 */
function getAgeGroupDistributionForHour(hour: number): {
  viewers13Plus: number;
  viewers50Plus: number;
  viewers65Plus: number;
} {
  // Morning (6-12): More seniors
  if (hour >= 6 && hour < 12) {
    return {
      viewers13Plus: 0.40, // Includes everyone 13+
      viewers50Plus: 0.35, // Subset of 13+, ages 50+
      viewers65Plus: 0.25  // Subset of 50+, ages 65+
    };
  }
  // Afternoon (12-18): More younger viewers
  else if (hour >= 12 && hour < 18) {
    return {
      viewers13Plus: 0.55,
      viewers50Plus: 0.30,
      viewers65Plus: 0.15
    };
  }
  // Evening prime time (18-22): Mixed audience
  else if (hour >= 18 && hour < 22) {
    return {
      viewers13Plus: 0.45,
      viewers50Plus: 0.35,
      viewers65Plus: 0.20
    };
  }
  // Late night (22-2): More younger adult viewers
  else if (hour >= 22 || hour < 2) {
    return {
      viewers13Plus: 0.65,
      viewers50Plus: 0.25,
      viewers65Plus: 0.10
    };
  }
  // Early morning (2-6): Mostly older viewers
  else {
    return {
      viewers13Plus: 0.35,
      viewers50Plus: 0.40,
      viewers65Plus: 0.25
    };
  }
}

/**
 * Extract hour from time slot string (e.g., "02:00-02:59" -> 2)
 * Handles the case where hours may start from 02:00 instead of 00:00
 */
function extractHourFromTimeSlot(timeSlot: string): number {
  if (!timeSlot) return -1;
  
  // Log for debugging unusual time slot formats
  console.log(`Parsing time slot: "${timeSlot}"`);
  
  // Handle various time slot formats
  const standardFormat = timeSlot.match(/^(\d{2}):00-\d{2}:59$/);
  const dashFormat = timeSlot.match(/^(\d{2})-(\d{2})$/);
  const simpleHourFormat = timeSlot.match(/^(\d{1,2}):00$/);
  
  let hour = -1;
  
  if (standardFormat && standardFormat[1]) {
    hour = parseInt(standardFormat[1], 10);
  } else if (dashFormat && dashFormat[1]) {
    hour = parseInt(dashFormat[1], 10);
  } else if (simpleHourFormat && simpleHourFormat[1]) {
    hour = parseInt(simpleHourFormat[1], 10);
  }
  
  if (hour === -1) {
    console.warn(`Could not parse hour from time slot: "${timeSlot}"`);
    return -1;
  }
  
  // Only normalize hours 24, 25, and 26 to 0, 1, and 2
  // These represent the first hours of the next day
  if (hour >= 24 && hour <= 26) {
    hour = hour % 24;
    console.log(`Normalized hour ${timeSlot} to ${hour}:00 (next day)`);
  }
  
  // All other hours (2-23) are kept as is, no adjustment needed
  
  return hour;
}

/**
 * Process Excel data from JSON format to the application's data format
 */
export function processViewerData(data: any[], monthYear: string): ProcessedMonthData {
  console.log("Processing data for month:", monthYear);
  
  // Find data start row - look for the header row with "Datum", "Dag", "Tijdvak"
  const headerRowIndex = data.findIndex(row => 
    row && 
    row.length > 2 && 
    row[0] === "Datum" && 
    row[1] === "Dag" && 
    row[2] === "Tijdvak"
  );
  
  if (headerRowIndex === -1) {
    throw new Error("Could not find header row in Excel file");
  }
  
  // Data starts after the header row
  const dataStartRow = headerRowIndex + 1;
  
  // Check if the header row actually exists and has items
  if (!data[headerRowIndex] || !Array.isArray(data[headerRowIndex])) {
    throw new Error("Header row is invalid or empty");
  }
  
  console.log("Header row found at index:", headerRowIndex);
  
  // Find total viewers column - look for column with "Dagcijfers" or similar
  let totalViewersColumnIndex = -1;
  let kijkcijfersColumnIndex = -1;
  let percentageColumnIndex = -1;
  
  // For debugging - see all headers
  data[headerRowIndex].forEach((header: any, index: number) => {
    if (header && typeof header === 'string') {
      console.log(`Column ${index}: "${header}"`);
      
      // Look for the total viewers column - match different possible names
      if (header.includes('Dagcijfers') || 
          header.includes('kijkdichtheid per dag') ||
          header.includes('dagcijfers') ||
          header.includes('Kijkers per dag')) {
        totalViewersColumnIndex = index;
      }
      
      // Look for the "Kijkcijfers per programma" column - this contains calculated viewers
      if (header.includes('Kijkcijfers per programma') ||
          header.includes('kijkcijfers per programma') ||
          header.includes('Kijkcijfer per uur') ||
          header.includes('kijkcijfer per uur')) {
        kijkcijfersColumnIndex = index;
      }
      
      // Look for the total percentage column - which could be named "TOTAL" or similar
      if (header === 'TOTAL' || 
          header === 'Total' || 
          header === 'Totaal' || 
          header.includes('percentage')) {
        percentageColumnIndex = index;
      }
    }
  });
  
  console.log("Found columns - Dagcijfers:", totalViewersColumnIndex, "TOTAL:", percentageColumnIndex, "Kijkcijfers:", kijkcijfersColumnIndex);
  
  // If we couldn't find these columns, search for them by position
  if (totalViewersColumnIndex === -1) {
    // Try some common positions
    const possibleColumns = [3, 4, 5, 6];
    for (const pos of possibleColumns) {
      if (pos < data[headerRowIndex].length) {
        console.log(`Trying position ${pos} for total viewers column:`, data[headerRowIndex][pos]);
        totalViewersColumnIndex = pos;
        break;
      }
    }
  }
  
  if (percentageColumnIndex === -1) {
    // Try some common positions
    const possibleColumns = [4, 5, 6, 7];
    for (const pos of possibleColumns) {
      if (pos < data[headerRowIndex].length) {
        console.log(`Trying position ${pos} for percentage column:`, data[headerRowIndex][pos]);
        percentageColumnIndex = pos;
        break;
      }
    }
  }
  
  // Use fallbacks if we still couldn't find the columns
  if (totalViewersColumnIndex === -1) {
    console.warn("Could not find total viewers column, using fallback position");
    totalViewersColumnIndex = 4; // Common position for total viewers
  }
  
  if (percentageColumnIndex === -1) {
    console.warn("Could not find percentage column, using fallback position");
    percentageColumnIndex = 6; // Common position for percentage
  }
  
  // Create a map to store day-based data
  const daysMap = new Map<string, {
    date: string;
    dayOfWeek: string;
    totalViewers: number;
    hourlyViewers: number[];
    hourlyPercentages: number[];
    ageGroups?: AgeGroupData[];
  }>();
  
  // Check a few rows of data to diagnose
  for (let i = dataStartRow; i < Math.min(dataStartRow + 5, data.length); i++) {
    if (data[i] && data[i].length > Math.max(totalViewersColumnIndex, percentageColumnIndex, kijkcijfersColumnIndex !== -1 ? kijkcijfersColumnIndex : 0)) {
      console.log(`Row ${i} data:`, {
        date: data[i][0],
        timeSlot: data[i][2],
        totalPercentage: data[i][percentageColumnIndex],
        totalViewers: data[i][totalViewersColumnIndex],
        calculatedViewers: kijkcijfersColumnIndex !== -1 ? data[i][kijkcijfersColumnIndex] : 'N/A'
      });
    }
  }
  
  // Process data rows
  for (let i = dataStartRow; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < Math.max(totalViewersColumnIndex, percentageColumnIndex) + 1) continue; // Skip incomplete rows
    
    const excelDate = row[0]; // Excel date serial number
    const dayOfWeek = row[1]?.toString() || ''; // Day of week
    const timeSlot = row[2]?.toString() || ''; // Time slot (e.g., "02:00-02:59")
    
    // Skip rows without valid date or time slot
    if (!excelDate || !timeSlot) continue;
    
    // Check if percentage is already in decimal form or as percentage
    let totalViewerPercent = Number(row[percentageColumnIndex] || 0);
    // If it's greater than 1, it's likely in percentage form (e.g., 2.5% is stored as 2.5)
    if (totalViewerPercent > 1) {
      totalViewerPercent = totalViewerPercent / 100;
    }
    
    const totalDailyViewers = Number(row[totalViewersColumnIndex] || 0); // Total viewers for the day
    
    // Extract hour from time slot
    const hour = extractHourFromTimeSlot(timeSlot);
    if (hour === -1) continue; // Skip invalid time slots
    
    // Format the date
    const dateString = typeof excelDate === 'number' 
      ? excelDateToString(excelDate)
      : excelDate.toString();
    
    // Skip empty dates
    if (!dateString) continue;
    
    // Get or create day data
    if (!daysMap.has(dateString)) {
      daysMap.set(dateString, {
        date: dateString,
        dayOfWeek,
        totalViewers: totalDailyViewers,
        hourlyViewers: Array(24).fill(0),
        hourlyPercentages: Array(24).fill(0)
      });
    }
    
    const dayData = daysMap.get(dateString)!;
    
    // First check if we have the calculated viewers already in the file
    let hourlyViewers = 0;
    if (kijkcijfersColumnIndex !== -1 && row[kijkcijfersColumnIndex] !== undefined) {
      hourlyViewers = Number(row[kijkcijfersColumnIndex]);
    }
    
    // If we don't have calculated viewers or they're zero, calculate ourselves
    if (hourlyViewers === 0 && totalDailyViewers > 0 && totalViewerPercent > 0) {
      hourlyViewers = Math.round(totalViewerPercent * totalDailyViewers);
    }
    
    // Update hourly data
    dayData.hourlyViewers[hour] = hourlyViewers;
    dayData.hourlyPercentages[hour] = totalViewerPercent;
    
    // Generate simulated age group data based on the hour of the day
    // This is a simulation and should be replaced with real data if available
    if (!dayData.ageGroups) {
      dayData.ageGroups = Array(24).fill(null).map(() => ({
        viewers13Plus: 0,
        viewers50Plus: 0,
        viewers65Plus: 0
      }));
    }
    
    const ageGroupDistribution = getAgeGroupDistributionForHour(hour);
    if (dayData.ageGroups[hour] && hourlyViewers > 0) {
      // Note: these are cumulative groups (13+ includes 50+ and 65+)
      const viewers13Plus = Math.round(hourlyViewers * ageGroupDistribution.viewers13Plus);
      const viewers50Plus = Math.round(hourlyViewers * ageGroupDistribution.viewers50Plus);
      const viewers65Plus = Math.round(hourlyViewers * ageGroupDistribution.viewers65Plus);
      
      dayData.ageGroups[hour] = {
        viewers13Plus,
        viewers50Plus,
        viewers65Plus
      };
    }
  }
  
  // Convert map to array and sort by date
  const days = Array.from(daysMap.values())
    .filter(day => day.totalViewers > 0)
    .sort((a, b) => {
      try {
        // Convert DD-MM-YYYY to Date for comparison
        const [aDay, aMonth, aYear] = a.date.split('-').map(Number);
        const [bDay, bMonth, bYear] = b.date.split('-').map(Number);
        return new Date(aYear, aMonth - 1, aDay).getTime() - new Date(bYear, bMonth - 1, bDay).getTime();
      } catch (e) {
        console.error("Error sorting dates:", e);
        return 0; // Keep original order on error
      }
    });
  
  // Log some statistics
  console.log(`Processed ${days.length} days of data`);
  if (days.length > 0) {
    console.log(`Sample day - ${days[0].date}: Total viewers: ${safeFormat(days[0].totalViewers)}`);
    console.log(`Hourly data for first day:`, days[0].hourlyViewers.map((v, i) => `${i}:00 - ${safeFormat(v)}`));
  }
  
  // Calculate average hourly viewers across all days
  const averageHourlyViewers = Array(24).fill(0);
  const maxViewersPerHour = Array(24).fill(0);
  const totalViewersPerHour = Array(24).fill(0); // Track cumulative viewers per hour
  
  days.forEach(day => {
    day.hourlyViewers.forEach((viewers, hour) => {
      totalViewersPerHour[hour] += viewers; // Track cumulative total
      averageHourlyViewers[hour] += viewers;
      maxViewersPerHour[hour] = Math.max(maxViewersPerHour[hour], viewers);
    });
  });
  
  // Calculate the average
  if (days.length > 0) {
    for (let i = 0; i < 24; i++) {
      averageHourlyViewers[i] = Math.round(averageHourlyViewers[i] / days.length);
    }
  }
  
  // Find the day with the most viewers (default to first day if none found)
  const peakDay = days.length > 0 ? days.reduce(
    (max, day) => (day.totalViewers > max.totalViewers ? day : max),
    { totalViewers: 0, date: '' } as DailyData
  ) : { totalViewers: 0, date: 'Geen data' };
  
  // Find the hour with the most CUMULATIVE viewers (not average)
  const maxTotalViewers = Math.max(...totalViewersPerHour);
  
  console.log("\n\n*** PEAK HOUR DEBUGGING ***");
  console.log("Hourly TOTAL viewers array:", totalViewersPerHour);
  console.log("Maximum TOTAL viewers value:", maxTotalViewers);
  
  // Find all hours with the maximum cumulative value
  const peakHoursIndices = totalViewersPerHour
    .map((viewers, index) => viewers === maxTotalViewers ? index : -1)
    .filter(index => index !== -1);
  
  console.log("All peak hours found (by total viewers):", peakHoursIndices.map(idx => `${idx}:00 (${safeFormat(totalViewersPerHour[idx])} total viewers)`));
  
  // If we found no peak hours (should be impossible if we have data), default to 0
  if (peakHoursIndices.length === 0) {
    console.error("No peak hours found! This should not happen if the data contains viewers.");
    console.log("Total viewers per hour:", totalViewersPerHour);
  }
  
  // Implement a smarter peak hour selection that prioritizes evening hours (18-23)
  let peakHourIndex = 0;
  
  if (peakHoursIndices.length > 0) {
    // First check if any peak hours are in the evening (18-23 range)
    const eveningPeakHours = peakHoursIndices.filter(hour => hour >= 18 && hour <= 23);
    
    if (eveningPeakHours.length > 0) {
      // If we have evening peak hours, use the latest one
      peakHourIndex = eveningPeakHours[eveningPeakHours.length - 1];
      console.log(`Selected evening peak hour: ${peakHourIndex}:00`);
    } else {
      // Otherwise use the latest peak hour from all indices
      peakHourIndex = peakHoursIndices[peakHoursIndices.length - 1];
      console.log(`Selected non-evening peak hour: ${peakHourIndex}:00`);
    }
  }
  
  // Add some logging for debugging the peak hour calculation
  console.log("Hourly totals by hour:", totalViewersPerHour.map((v, i) => `${i}:00 - ${safeFormat(v)}`));
  console.log(`Peak hour calculation: Max TOTAL value ${safeFormat(maxTotalViewers)} found at indices ${peakHoursIndices.join(', ')}`);
  console.log(`Selected peak hour index: ${peakHourIndex}`);
  
  // Make sure the peak hour is in valid range
  const validPeakHour = (peakHourIndex >= 0 && peakHourIndex < 24) ? peakHourIndex : 0;
  
  // Calculate total viewers across all days
  const totalViewers = days.reduce((sum, day) => sum + day.totalViewers, 0);
  
  console.log(`Total viewers: ${safeFormat(totalViewers)}`);
  console.log(`Peak day: ${peakDay.date} with ${safeFormat(peakDay.totalViewers)} viewers`);
  console.log(`Peak hour: ${validPeakHour}:00 with ${safeFormat(totalViewersPerHour[validPeakHour])} total viewers and ${safeFormat(averageHourlyViewers[validPeakHour])} average viewers`);
  
  console.log(`Final peak hour: ${validPeakHour}:00 with ${safeFormat(totalViewersPerHour[validPeakHour])} total viewers`);
  console.log("*** END PEAK HOUR DEBUGGING ***\n\n");
  
  // Calculate average and total age groups per hour
  const averageAgeGroups = Array(24).fill(null).map(() => ({
    viewers13Plus: 0,
    viewers50Plus: 0,
    viewers65Plus: 0
  }));
  
  const totalAgeGroups = Array(24).fill(null).map(() => ({
    viewers13Plus: 0,
    viewers50Plus: 0,
    viewers65Plus: 0
  }));
  
  // Process age group data for charts
  days.forEach(day => {
    if (day.ageGroups) {
      day.ageGroups.forEach((hourData, hourIndex) => {
        if (hourData) {
          // Add to total
          totalAgeGroups[hourIndex].viewers13Plus += hourData.viewers13Plus;
          totalAgeGroups[hourIndex].viewers50Plus += hourData.viewers50Plus;
          totalAgeGroups[hourIndex].viewers65Plus += hourData.viewers65Plus;
          
          // Add to average (will divide by days.length later)
          averageAgeGroups[hourIndex].viewers13Plus += hourData.viewers13Plus;
          averageAgeGroups[hourIndex].viewers50Plus += hourData.viewers50Plus;
          averageAgeGroups[hourIndex].viewers65Plus += hourData.viewers65Plus;
        }
      });
    }
  });
  
  // Calculate averages
  if (days.length > 0) {
    for (let hour = 0; hour < 24; hour++) {
      averageAgeGroups[hour].viewers13Plus = Math.round(averageAgeGroups[hour].viewers13Plus / days.length);
      averageAgeGroups[hour].viewers50Plus = Math.round(averageAgeGroups[hour].viewers50Plus / days.length);
      averageAgeGroups[hour].viewers65Plus = Math.round(averageAgeGroups[hour].viewers65Plus / days.length);
    }
  }
  
  return {
    monthYear,
    days,
    averageHourlyViewers,
    maxViewersPerHour,
    totalViewersPerHour,
    averageAgeGroups,
    totalAgeGroups,
    peakDay: peakDay.date,
    peakHour: validPeakHour,
    totalViewers
  };
}

/**
 * Extract month and year from filename
 */
export function extractMonthYearFromFilename(filename: string): string {
  // Try to extract month and year from file name patterns like "Kijkcijfers berekening NOVEMBER2024.xlsx"
  const monthNames: Record<string, string> = {
    'jan': 'Januari',
    'feb': 'Februari',
    'maart': 'Maart',
    'march': 'Maart',
    'april': 'April',
    'mei': 'Mei',
    'may': 'Mei',
    'juni': 'Juni',
    'june': 'Juni',
    'juli': 'Juli',
    'july': 'Juli',
    'augustus': 'Augustus',
    'august': 'Augustus',
    'september': 'September',
    'oktober': 'Oktober',
    'october': 'Oktober',
    'november': 'November',
    'december': 'December',
    'dec': 'December'
  };
  
  // Clean up the filename
  const cleanName = filename.toLowerCase().replace('kopie van ', '').replace('kijkcijfers ', '').replace('berekening ', '');
  
  // Try to extract month name
  let monthYear = 'Unknown Month';
  
  for (const [shortName, fullName] of Object.entries(monthNames)) {
    if (cleanName.includes(shortName.toLowerCase())) {
      // Try to extract year - look for 4 digit number
      const yearMatch = cleanName.match(/\d{4}/);
      const year = yearMatch ? yearMatch[0] : '';
      monthYear = `${fullName} ${year}`;
      break;
    }
  }
  
  return monthYear;
}

/**
 * Load and process Excel file
 */
export async function processExcelFile(file: File): Promise<ProcessedMonthData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        console.log(`Processing file: ${file.name}`);
        if (!e.target || !e.target.result) {
          throw new Error("Failed to read file contents");
        }
        
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Assuming the first sheet contains the data
        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("Invalid Excel file or no sheets found");
        }
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        console.log(`Sheet name: ${firstSheetName}`);
        
        if (!worksheet) {
          throw new Error(`Worksheet "${firstSheetName}" not found in file`);
        }
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`JSON data has ${jsonData.length} rows`);
        
        if (!jsonData || jsonData.length === 0) {
          throw new Error("No data found in Excel sheet");
        }
        
        // Extract month and year from filename
        const monthYear = extractMonthYearFromFilename(file.name);
        
        // Process the data
        const processedData = processViewerData(jsonData, monthYear);
        console.log(`Processed data for ${monthYear}: ${processedData.days.length} days, ${safeFormat(processedData.totalViewers)} total viewers`);
        
        resolve(processedData);
      } catch (err) {
        console.error('Error processing file:', err);
        reject(err);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
} 