'use client';

import { useState, useEffect } from 'react';
import { ProgramData, ScheduleData } from '../types';

interface ScheduleViewerProps {
  scheduleData: ScheduleData | null;
}

export default function ScheduleViewer({ scheduleData }: ScheduleViewerProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [daysForSelectedWeek, setDaysForSelectedWeek] = useState<string[]>([]);
  const [programsForSelectedDay, setProgramsForSelectedDay] = useState<ProgramData[]>([]);
  
  // Initialize weeks and days when scheduleData changes
  useEffect(() => {
    if (!scheduleData) return;
    
    // Default to the first day available
    const days = Array.from(scheduleData.days.keys()).sort();
    if (days.length > 0) {
      setSelectedDay(days[0]);
      updateProgramsForDay(days[0], selectedWeek);
    }
    
    updateDaysForWeek(selectedWeek);
  }, [scheduleData]);
  
  // Update days when week changes
  useEffect(() => {
    if (scheduleData) {
      updateDaysForWeek(selectedWeek);
    }
  }, [selectedWeek, scheduleData]);
  
  // Update programs when day changes
  useEffect(() => {
    if (scheduleData && selectedDay) {
      updateProgramsForDay(selectedDay, selectedWeek);
    }
  }, [selectedDay, selectedWeek, scheduleData]);
  
  // Filter days based on selected week
  const updateDaysForWeek = (weekFilter: string) => {
    if (!scheduleData) return;
    
    let days = Array.from(scheduleData.days.keys()).sort();
    
    if (weekFilter !== 'all') {
      const weekNumber = parseInt(weekFilter, 10);
      days = days.filter(day => {
        const programs = scheduleData.days.get(day) || [];
        return programs.some(program => program.week === weekNumber);
      });
    }
    
    setDaysForSelectedWeek(days);
    
    // If current selected day is not in the filtered list, select the first available day
    if (days.length > 0 && !days.includes(selectedDay)) {
      setSelectedDay(days[0]);
    }
  };
  
  // Update programs for selected day and week
  const updateProgramsForDay = (day: string, weekFilter: string) => {
    if (!scheduleData || !scheduleData.days.has(day)) {
      setProgramsForSelectedDay([]);
      return;
    }
    
    let programs = scheduleData.days.get(day) || [];
    
    // Filter by week if needed
    if (weekFilter !== 'all') {
      const weekNumber = parseInt(weekFilter, 10);
      programs = programs.filter(program => program.week === weekNumber);
    }
    
    // Sort by time and sequence
    programs.sort((a, b) => {
      // First by week if not filtered
      if (weekFilter === 'all') {
        const weekA = a.week || 0;
        const weekB = b.week || 0;
        if (weekA !== weekB) return weekA - weekB;
      }
      
      // Then by time
      const timeComp = a.startTime.localeCompare(b.startTime);
      if (timeComp !== 0) return timeComp;
      
      // Then by sequence
      return (a.sequence || 0) - (b.sequence || 0);
    });
    
    setProgramsForSelectedDay(programs);
  };
  
  if (!scheduleData) {
    return <div className="p-6 bg-white rounded-lg shadow-md">Upload a schedule file to view program data</div>;
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-blue-800">Program Schedule</h2>
      
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
          {/* Week selector */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Weeks</option>
              {scheduleData.weeks?.map(week => (
                <option key={week} value={week.toString()}>Week {week}</option>
              ))}
            </select>
          </div>
          
          {/* Day selector */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {daysForSelectedWeek.map(day => {
                const dayOfWeek = new Date(
                  parseInt(day.split('-')[2]),
                  parseInt(day.split('-')[1]) - 1,
                  parseInt(day.split('-')[0])
                ).toLocaleDateString('en-US', { weekday: 'long' });
                
                return (
                  <option key={day} value={day}>
                    {day} ({dayOfWeek})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>
      
      {/* Program listing */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectedWeek === 'all' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {programsForSelectedDay.length === 0 ? (
              <tr>
                <td colSpan={selectedWeek === 'all' ? 6 : 5} className="px-6 py-4 text-center text-gray-500">
                  No programs found for this day
                </td>
              </tr>
            ) : (
              programsForSelectedDay.map((program, index) => {
                // Use alternating row colors for different time slots
                const isNewTimeSlot = index === 0 || program.startTime !== programsForSelectedDay[index - 1].startTime;
                const rowClass = isNewTimeSlot 
                  ? (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')
                  : '';
                
                // Add a special class for programs with sequences
                const sequenceClass = program.sequence 
                  ? (program.sequence % 2 === 0 ? 'bg-blue-50' : 'bg-yellow-50')
                  : '';
                
                return (
                  <tr key={program.id || index} className={sequenceClass || rowClass}>
                    {selectedWeek === 'all' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {program.week || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {program.sequence ? `${program.startTime} (${program.sequence})` : program.startTime}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {program.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {program.duration ? `${program.duration} min` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {program.endTime || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {program.isRepeat && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Repeat
                          </span>
                        )}
                        {program.category && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {program.category}
                          </span>
                        )}
                        {program.notes && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {program.notes}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}