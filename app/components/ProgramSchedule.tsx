'use client';

import { useState, useEffect } from 'react';
import { ProcessedMonthData, ProgramData } from '../types';

interface ProgramScheduleProps {
  data: ProcessedMonthData;
}

export default function ProgramSchedule({ data }: ProgramScheduleProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<ProgramData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRepeat, setFilterRepeat] = useState(false);
  
  // Find dates with programming data
  useEffect(() => {
    // Set the first date with programs as selected by default
    if (data && data.days && data.days.length > 0) {
      const daysWithPrograms = data.days.filter(day => day.programs && day.programs.length > 0);
      
      if (daysWithPrograms.length > 0) {
        setSelectedDate(daysWithPrograms[0].date);
        setPrograms(daysWithPrograms[0].programs || []);
      } else {
        setSelectedDate(data.days[0].date);
        setPrograms([]);
      }
    }
  }, [data]);

  // Filter programs based on search term and filters
  useEffect(() => {
    if (!programs) {
      setFilteredPrograms([]);
      return;
    }
    
    let filtered = [...programs];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(program => 
        program.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply repeat filter
    if (filterRepeat) {
      filtered = filtered.filter(program => !program.isRepeat);
    }
    
    // Sort by start time
    filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    setFilteredPrograms(filtered);
  }, [programs, searchTerm, filterRepeat]);

  // Handle date selection change
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    const selectedDay = data.days.find(day => day.date === date);
    setPrograms(selectedDay?.programs || []);
  };

  // Group programs by hour for visual display
  const getProgramsByHour = () => {
    const hourGroups: Record<string, ProgramData[]> = {};
    
    filteredPrograms.forEach(program => {
      const hour = program.startTime.split(':')[0];
      if (!hourGroups[hour]) {
        hourGroups[hour] = [];
      }
      hourGroups[hour].push(program);
    });
    
    // Convert to array of [hour, programs] pairs
    return Object.entries(hourGroups)
      .sort(([hourA], [hourB]) => parseInt(hourA) - parseInt(hourB));
  };

  const programsByHour = getProgramsByHour();
  const daysWithPrograms = data.days.filter(day => day.programs && day.programs.length > 0);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-6 text-[#00001F]">TV Programmering</h2>
      
      {/* Date selector */}
      <div className="mb-6">
        <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-2">
          Selecteer datum:
        </label>
        <div className="relative w-full md:w-64">
          <select
            id="date-select"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#F47B25] focus:border-[#F47B25]"
          >
            {data.days.map(day => (
              <option 
                key={day.date} 
                value={day.date}
                disabled={!day.programs || day.programs.length === 0}
              >
                {day.date} ({day.dayOfWeek || ''}) 
                {!day.programs || day.programs.length === 0 ? ' - Geen programmering' : 
                 ` - ${day.programs.length} programma's`}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
            </svg>
          </div>
        </div>
      </div>
      
      {/* Search and filters */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <label htmlFor="search-program" className="block text-sm font-medium text-gray-700 mb-1">
            Zoeken:
          </label>
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              id="search-program"
              placeholder="Zoek op programmanaam..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="focus:ring-[#F47B25] focus:border-[#F47B25] block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        <div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="hide-repeats"
              checked={filterRepeat}
              onChange={() => setFilterRepeat(!filterRepeat)}
              className="form-checkbox h-4 w-4 text-[#F47B25] rounded focus:ring-0"
            />
            <span className="ml-2 text-sm">Verberg herhalingen</span>
          </label>
        </div>
      </div>

      {/* Programs list */}
      {filteredPrograms.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500">Geen programma's gevonden voor deze dag.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b flex items-center font-medium text-sm text-gray-700">
            <div className="w-20">Tijd</div>
            <div className="flex-1">Programma</div>
            <div className="w-28 text-right">Duur</div>
          </div>
          
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {programsByHour.map(([hour, hourPrograms]) => (
              <div key={hour} className="bg-gray-50 bg-opacity-30">
                <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase bg-gray-100">
                  {hour}:00 - {hour}:59
                </div>
                <div className="divide-y divide-gray-100">
                  {hourPrograms.map((program, index) => (
                    <div 
                      key={`${program.title}-${index}`} 
                      className="flex items-start hover:bg-gray-50 px-4 py-3"
                    >
                      <div className="w-20 font-medium text-gray-600">{program.startTime}</div>
                      <div className="flex-1">
                        <div className="font-medium text-[#00001F]">
                          {program.title}
                          {program.isRepeat && (
                            <span className="ml-2 text-xs font-normal bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5">Herhaling</span>
                          )}
                          {program.category && (
                            <span className="ml-2 text-xs font-normal bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">{program.category}</span>
                          )}
                        </div>
                        {program.endTime && (
                          <div className="text-sm text-gray-500">
                            Tot: {program.endTime}
                          </div>
                        )}
                      </div>
                      <div className="w-28 text-right text-gray-600">
                        {program.duration ? `${program.duration} min` : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Program statistics */}
      {selectedDate && programs.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Statistieken</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-sm text-gray-500">Aantal programma's</div>
              <div className="text-2xl font-bold text-[#00001F]">{programs.length}</div>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-sm text-gray-500">Primetime (18:00-23:00)</div>
              <div className="text-2xl font-bold text-[#00001F]">
                {programs.filter(p => {
                  const hour = parseInt(p.startTime.split(':')[0]);
                  return hour >= 18 && hour < 23;
                }).length}
              </div>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-sm text-gray-500">Gemiddelde programmaduur</div>
              <div className="text-2xl font-bold text-[#00001F]">
                {Math.round(
                  programs
                    .filter(p => p.duration)
                    .reduce((sum, p) => sum + (p.duration || 0), 0) / 
                  programs.filter(p => p.duration).length || 0
                )} min
              </div>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="text-sm text-gray-500">Herhalingen</div>
              <div className="text-2xl font-bold text-[#00001F]">
                {programs.filter(p => p.isRepeat).length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}