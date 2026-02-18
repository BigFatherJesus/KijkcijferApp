export interface AgeGroupData {
  'viewers13Plus': number;  // 13+
  'viewers50Plus': number;  // 50+
  'viewers65Plus': number;  // 65+
}

export interface ProgramData {
  id?: string;         // Unique identifier
  title: string;       // Program title
  startTime: string;   // HH:MM format
  endTime?: string;    // HH:MM format if available
  duration?: number;   // Duration in minutes if known
  day?: string;        // Date string (DD-MM-YYYY)
  dayOfWeek?: string;  // Day of week
  category?: string;   // Program category
  isRepeat?: boolean;  // Whether it's a repeat/rerun
  notes?: string;      // Additional notes
  sequence?: number;   // For multiple programs at same time
  originalTime?: string; // Original time string from source
  timePoint?: string;  // Time reference for special cases
  week?: number;       // Week number for multi-week schedules
}

export interface DailyData {
  date: string;
  dayOfWeek?: string;
  totalViewers: number;
  hourlyViewers: number[];
  hourlyPercentages: number[];
  ageGroups?: AgeGroupData[]; // Age group data per hour if available
  programs?: ProgramData[]; // Programs for this day
}

export interface ProcessedMonthData {
  monthYear: string;
  days: DailyData[];
  averageHourlyViewers: number[];
  maxViewersPerHour: number[];
  totalViewersPerHour: number[]; // Total cumulative viewers per hour across all days
  averageAgeGroups?: AgeGroupData[]; // Average age group data per hour
  totalAgeGroups?: AgeGroupData[]; // Total age group data per hour
  peakDay: string;  // Date string of the day with the most viewers
  peakHour: number; // Hour (0-23) with the most viewers
  totalViewers: number; // Total viewers for the entire month
}

export interface ScheduleData {
  weekNumber: number;
  year: number;
  days: Map<string, ProgramData[]>; // Map of date strings to program arrays
  programs?: ProgramData[]; // Flat array of all programs for easier filtering/searching
  weeks?: number[]; // Array of week numbers for multi-week schedules
}