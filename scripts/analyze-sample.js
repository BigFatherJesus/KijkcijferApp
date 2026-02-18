const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * This script analyzes Excel files to understand their structure
 * and outputs the structure to help with data processing.
 */

// Root directory path
const rootDir = path.join(__dirname, '..');

// Get all Excel files in the root directory
const excelFiles = fs.readdirSync(rootDir)
  .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
  .map(file => path.join(rootDir, file));

function analyzeExcelFile(filePath) {
  console.log(`\nAnalyzing Excel file: ${path.basename(filePath)}`);
  
  try {
    // Read the file
    const workbook = XLSX.readFile(filePath);
    
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Analyze the structure
    console.log(`Sheet name: ${firstSheetName}`);
    console.log(`Total rows: ${jsonData.length}`);
    
    if (jsonData.length > 0) {
      console.log(`First row length: ${jsonData[0]?.length || 0}`);
      
      // Show first few rows to understand structure
      console.log('\nFirst few rows:');
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        if (jsonData[i] && jsonData[i].length > 0) {
          console.log(`Row ${i}: [${jsonData[i].slice(0, Math.min(5, jsonData[i].length)).join(', ')}${jsonData[i].length > 5 ? '...' : ''}]`);
        }
      }
      
      // Check for hourly data (assuming hour columns start at index 2)
      const headerRow = jsonData.find(row => row && row.length >= 26);
      if (headerRow) {
        console.log('\nPossible hourly column headers:');
        for (let h = 2; h < Math.min(26, headerRow.length); h++) {
          console.log(`Column ${h}: ${headerRow[h]}`);
        }
      }
      
      // Find row with actual date data
      const dateRow = jsonData.findIndex(row => 
        row && 
        row.length > 2 && 
        (row[0] instanceof Date || 
         (typeof row[0] === 'string' && /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(row[0])) ||
         (typeof row[0] === 'number' && row[0] > 40000)) // Excel date serial number
      );
      
      if (dateRow >= 0) {
        console.log(`\nFirst row with date data appears to be row ${dateRow}`);
        console.log(`Data at this row: [${jsonData[dateRow].slice(0, Math.min(5, jsonData[dateRow].length)).join(', ')}${jsonData[dateRow].length > 5 ? '...' : ''}]`);
      }
    }
    
    return {
      success: true,
      filename: path.basename(filePath),
      sheetName: firstSheetName,
      rowCount: jsonData.length,
      sampleData: jsonData.slice(0, 10)
    };
  } catch (error) {
    console.error('Error analyzing Excel file:', error);
    return {
      success: false,
      filename: path.basename(filePath),
      error: error.message
    };
  }
}

// Check if we have any Excel files
if (excelFiles.length === 0) {
  console.error('No Excel files found in the root directory');
} else {
  console.log(`Found ${excelFiles.length} Excel files:`);
  excelFiles.forEach(file => console.log(`- ${path.basename(file)}`));
  
  // Analyze the first file to understand structure
  const firstFileResult = analyzeExcelFile(excelFiles[0]);
  
  if (firstFileResult.success) {
    // Write the sample data to a JSON file
    fs.writeFileSync(
      path.join(__dirname, 'sample-data.json'),
      JSON.stringify(firstFileResult.sampleData, null, 2)
    );
    console.log(`\nSample data from ${firstFileResult.filename} saved to sample-data.json`);
  }
} 