import { ProcessedMonthData, DailyData } from '../types';

/**
 * Helper function for safely formatting numbers
 */
function safeFormat(num: number | undefined): string {
  return num !== undefined ? num.toLocaleString() : '0';
}

/**
 * Combines multiple months of data into a single aggregated dataset
 */
export function aggregateMonthsData(monthsData: ProcessedMonthData[]): ProcessedMonthData {
  if (!monthsData || monthsData.length === 0) {
    throw new Error("No data provided for aggregation");
  }

  // If only one month is provided, return it as is
  if (monthsData.length === 1) {
    return monthsData[0];
  }

  console.log(`Aggregating data from ${monthsData.length} months`);
  
  // Create a map to combine all days from all months
  const allDaysMap = new Map<string, DailyData>();
  
  // Combine all days from all months
  monthsData.forEach(monthData => {
    monthData.days.forEach(day => {
      // Store each day in the map, overwriting if there are duplicates
      // (unlikely unless same month appears twice)
      allDaysMap.set(day.date, { ...day });
    });
  });
  
  // Convert to array and sort by date
  const allDays = Array.from(allDaysMap.values())
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
  
  console.log(`Combined ${allDays.length} unique days from all months`);
  
  // Calculate aggregate hourly viewers
  const averageHourlyViewers = Array(24).fill(0);
  const maxViewersPerHour = Array(24).fill(0);
  const totalViewersPerHour = Array(24).fill(0); // Track cumulative totals
  
  allDays.forEach(day => {
    day.hourlyViewers.forEach((viewers, hour) => {
      totalViewersPerHour[hour] += viewers; // Add to cumulative total
      averageHourlyViewers[hour] += viewers;
      maxViewersPerHour[hour] = Math.max(maxViewersPerHour[hour], viewers);
    });
  });
  
  // Calculate the average
  if (allDays.length > 0) {
    for (let i = 0; i < 24; i++) {
      averageHourlyViewers[i] = Math.round(averageHourlyViewers[i] / allDays.length);
    }
  }
  
  // Find the peak day
  const peakDay = allDays.reduce(
    (max, day) => (day.totalViewers > max.totalViewers ? day : max),
    { totalViewers: 0, date: '' } as DailyData
  );
  
  // Find the peak hour with improved logic - using cumulative totals
  const maxTotalViewers = Math.max(...totalViewersPerHour);
  
  console.log("\n\n*** AGGREGATED PEAK HOUR DEBUGGING ***");
  console.log("Hourly TOTAL viewers array:", totalViewersPerHour);
  console.log("Maximum TOTAL viewers value:", maxTotalViewers);
  
  // Find all hours with the maximum value
  const peakHoursIndices = totalViewersPerHour
    .map((viewers, index) => viewers === maxTotalViewers ? index : -1)
    .filter(index => index !== -1);
  
  // Log all peak hours found
  console.log("All peak hours found (by total viewers):", peakHoursIndices.map(idx => `${idx}:00 (${safeFormat(totalViewersPerHour[idx])} cumulative viewers)`));
  
  // If we found no peak hours (should be impossible if we have data), default to 0
  if (peakHoursIndices.length === 0) {
    console.error("No peak hours found in aggregated data! This should not happen if the data contains viewers.");
    console.log("Total viewers per hour:", totalViewersPerHour);
  }
  
  // For consistency, use the last peak hour for ties (typically evening hours)
  // We want to prioritize evening hours (18-23) in case of ties
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
  
  const validPeakHour = (peakHourIndex >= 0 && peakHourIndex < 24) ? peakHourIndex : 0;
  
  console.log("Hourly totals by hour:", totalViewersPerHour.map((v, i) => `${i}:00 - ${safeFormat(v)}`));
  console.log(`Peak hour calculation: Max total value ${safeFormat(maxTotalViewers)} found at indices ${peakHoursIndices.join(', ')}`);
  console.log(`Selected peak hour index: ${peakHourIndex}`);
  
  // Calculate total viewers across all days
  const totalViewers = allDays.reduce((sum, day) => sum + day.totalViewers, 0);
  
  // No need for 20:00 override since we're using raw data now
  
  console.log(`Final aggregated peak hour: ${validPeakHour}:00 with ${safeFormat(totalViewersPerHour[validPeakHour])} total viewers`);
  console.log("*** END AGGREGATED PEAK HOUR DEBUGGING ***\n\n");
  
  // Generate timespan string for the aggregated data
  const firstMonthYear = monthsData[0]?.monthYear || '';
  const lastMonthYear = monthsData[monthsData.length - 1]?.monthYear || '';
  const timespan = monthsData.length > 1 
    ? `${firstMonthYear} - ${lastMonthYear}`
    : firstMonthYear;
  
  console.log(`Aggregated data for ${timespan}:`);
  console.log(`- Total days: ${allDays.length}`);
  console.log(`- Total viewers: ${safeFormat(totalViewers)}`);
  console.log(`- Peak day: ${peakDay.date} with ${safeFormat(peakDay.totalViewers)} viewers`);
  console.log(`- Peak hour: ${validPeakHour}:00 with ${safeFormat(totalViewersPerHour[validPeakHour])} total viewers`);
  
  // Aggregate age group data if available
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
  
  // Combine age group data from all months
  let hasAgeData = false;
  
  monthsData.forEach(monthData => {
    if (monthData.totalAgeGroups) {
      hasAgeData = true;
      monthData.totalAgeGroups.forEach((hourData, hour) => {
        if (hourData) {
          totalAgeGroups[hour].viewers13Plus += hourData.viewers13Plus;
          totalAgeGroups[hour].viewers50Plus += hourData.viewers50Plus;
          totalAgeGroups[hour].viewers65Plus += hourData.viewers65Plus;
        }
      });
    }
    
    if (monthData.averageAgeGroups) {
      hasAgeData = true;
      // For average, we weight by the number of days in each month
      const weight = monthData.days.length;
      monthData.averageAgeGroups.forEach((hourData, hour) => {
        if (hourData) {
          averageAgeGroups[hour].viewers13Plus += hourData.viewers13Plus * weight;
          averageAgeGroups[hour].viewers50Plus += hourData.viewers50Plus * weight;
          averageAgeGroups[hour].viewers65Plus += hourData.viewers65Plus * weight;
        }
      });
    }
  });
  
  // Calculate the final averages if we have age data
  if (hasAgeData && allDays.length > 0) {
    for (let hour = 0; hour < 24; hour++) {
      averageAgeGroups[hour].viewers13Plus = Math.round(averageAgeGroups[hour].viewers13Plus / allDays.length);
      averageAgeGroups[hour].viewers50Plus = Math.round(averageAgeGroups[hour].viewers50Plus / allDays.length);
      averageAgeGroups[hour].viewers65Plus = Math.round(averageAgeGroups[hour].viewers65Plus / allDays.length);
    }
  }
  
  // Return the aggregated data
  return {
    monthYear: `Samenvatting (${timespan})`,
    days: allDays,
    averageHourlyViewers,
    maxViewersPerHour,
    totalViewersPerHour,
    averageAgeGroups: hasAgeData ? averageAgeGroups : undefined,
    totalAgeGroups: hasAgeData ? totalAgeGroups : undefined,
    peakDay: peakDay.date,
    peakHour: validPeakHour,
    totalViewers
  };
} 