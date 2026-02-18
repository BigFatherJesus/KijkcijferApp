const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Debug function to extract hour from time slot
function extractHourFromTimeSlot(timeSlot) {
  if (!timeSlot) return -1;
  
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

// Format number for display
function safeFormat(num) {
  return num !== undefined ? num.toLocaleString() : '0';
}

function findPeakHour(hourlyViewers) {
  const maxViewers = Math.max(...hourlyViewers);
  console.log("Maximum viewer count:", maxViewers);
  
  // Find all hours with maximum viewers
  const peakHoursIndices = hourlyViewers
    .map((viewers, index) => viewers === maxViewers ? index : -1)
    .filter(index => index !== -1);
  
  console.log("All peak hours found:", peakHoursIndices.map(idx => `${idx}:00 (${safeFormat(hourlyViewers[idx])} viewers)`));
  
  // Use the latest peak hour
  const peakHourIndex = peakHoursIndices.length > 0 ? 
    peakHoursIndices[peakHoursIndices.length - 1] : 0;
  
  console.log("Selected peak hour:", `${peakHourIndex}:00`);
  return peakHourIndex;
}

// Process a specific Excel file for debugging
function processExcelFile(filePath) {
  try {
    console.log(`Processing file for peak hour debug: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header:1 for array format
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`File has ${jsonData.length} rows`);
    
    // Find header row
    const headerRowIndex = jsonData.findIndex(row => 
      row && 
      row.length > 2 && 
      row[0] === "Datum" && 
      row[1] === "Dag" && 
      row[2] === "Tijdvak"
    );
    
    if (headerRowIndex === -1) {
      console.error("Could not find header row");
      return;
    }
    
    console.log("Header row found at index:", headerRowIndex);
    console.log("Headers:", jsonData[headerRowIndex]);
    
    // Find total viewers and percentage columns
    let totalViewersColumnIndex = -1;
    let percentageColumnIndex = -1;
    
    jsonData[headerRowIndex].forEach((header, index) => {
      if (header && typeof header === 'string') {
        console.log(`Column ${index}: "${header}"`);
        
        if (header.includes('Dagcijfers') || 
            header.includes('kijkdichtheid per dag') ||
            header.includes('dagcijfers') ||
            header.includes('Kijkers per dag')) {
          totalViewersColumnIndex = index;
        }
        
        if (header === 'TOTAL' || 
            header === 'Total' || 
            header === 'Totaal' || 
            header.includes('percentage')) {
          percentageColumnIndex = index;
        }
      }
    });
    
    console.log("Column indices - Total viewers:", totalViewersColumnIndex, "Percentage:", percentageColumnIndex);
    
    // Process the data to extract hourly viewers
    const dataStartRow = headerRowIndex + 1;
    const daysMap = new Map();
    
    // Sample a few rows
    for (let i = dataStartRow; i < Math.min(dataStartRow + 5, jsonData.length); i++) {
      console.log(`Sample row ${i}:`, jsonData[i]);
    }
    
    // Process data rows to extract hourly viewer counts
    for (let i = dataStartRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length < Math.max(totalViewersColumnIndex, percentageColumnIndex) + 1) continue;
      
      const excelDate = row[0];
      const timeSlot = row[2]?.toString() || '';
      
      if (!excelDate || !timeSlot) continue;
      
      // Extract hour from time slot
      const hour = extractHourFromTimeSlot(timeSlot);
      if (hour === -1) continue;
      
      // Calculate viewers for this hour
      let totalViewerPercent = Number(row[percentageColumnIndex] || 0);
      if (totalViewerPercent > 1) {
        totalViewerPercent = totalViewerPercent / 100;
      }
      
      const totalDailyViewers = Number(row[totalViewersColumnIndex] || 0);
      let hourlyViewers = Math.round(totalViewerPercent * totalDailyViewers);
      
      console.log(`Row ${i}: Hour ${hour}, Percentage ${totalViewerPercent}, Daily Viewers ${totalDailyViewers}, Hourly Viewers ${hourlyViewers}`);
      
      // Use a consistent key for the date
      const dateKey = typeof excelDate === 'number' 
        ? new Date((excelDate - 25569) * 86400 * 1000).toISOString().split('T')[0]
        : excelDate.toString();
      
      if (!daysMap.has(dateKey)) {
        daysMap.set(dateKey, {
          date: dateKey,
          totalViewers: totalDailyViewers,
          hourlyViewers: Array(24).fill(0)
        });
      }
      
      const dayData = daysMap.get(dateKey);
      dayData.hourlyViewers[hour] = hourlyViewers;
    }
    
    // Calculate average hourly viewers
    const days = Array.from(daysMap.values());
    console.log(`Processed ${days.length} unique days`);
    
    if (days.length === 0) {
      console.error("No valid days found in the data");
      return;
    }
    
    // Calculate average hourly viewers
    const averageHourlyViewers = Array(24).fill(0);
    days.forEach(day => {
      day.hourlyViewers.forEach((viewers, hour) => {
        averageHourlyViewers[hour] += viewers;
      });
    });
    
    // Calculate the average
    for (let i = 0; i < 24; i++) {
      averageHourlyViewers[i] = Math.round(averageHourlyViewers[i] / days.length);
    }
    
    console.log("\n=== HOURLY AVERAGE VIEWERS ===");
    averageHourlyViewers.forEach((viewers, hour) => {
      console.log(`${hour.toString().padStart(2, '0')}:00 - ${safeFormat(viewers)}`);
    });
    
    // Find peak hour
    console.log("\n=== PEAK HOUR ANALYSIS ===");
    const peakHour = findPeakHour(averageHourlyViewers);
    console.log(`Final peak hour: ${peakHour}:00 with ${safeFormat(averageHourlyViewers[peakHour])} viewers`);
    
  } catch (err) {
    console.error("Error processing file:", err);
  }
}

// Process each Excel file in the workspace
const workspacePath = process.cwd();
const excelFiles = fs.readdirSync(workspacePath)
  .filter(file => file.toLowerCase().endsWith('.xlsx') && file.toLowerCase().includes('kijkcijfers'));

console.log(`Found ${excelFiles.length} Excel files to process`);

if (excelFiles.length === 0) {
  console.log("No Excel files found in the workspace");
} else {
  // Process the first file
  const firstFile = path.join(workspacePath, excelFiles[0]);
  console.log(`Processing file: ${firstFile}`);
  processExcelFile(firstFile);
} 