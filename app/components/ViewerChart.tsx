'use client';

import { useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { ProcessedMonthData, DailyData } from '../types';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ViewerChartProps {
  data: ProcessedMonthData;
}

type ViewMode = 'hourly' | 'daily';
type HourlyDataType = 'average' | 'max' | 'daily' | 'total';

export default function ViewerChart({ data }: ViewerChartProps) {
  // States for controlling chart display
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [viewMode, setViewMode] = useState<ViewMode>('hourly');
  const [dataType, setDataType] = useState<HourlyDataType>('total');
  const [selectedDay, setSelectedDay] = useState<string>(data.days[0]?.date || '');
  
  // Define Kompas brand colors
  const kompasColors = {
    orange: ['#F47B25', '#F9A65E'],
    darkBlue: ['#00001F', '#252549'],
    white: ['#FFFFFF', '#F2F2F3'],
    bluishPurple: ['#2D306D', '#4D54A4'],
    gradient: ['#F47B25', '#F9A65E', '#D97378', '#F3B8BA']
  };

  // Generate hourly labels (00:00 - 23:00)
  const hourlyLabels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  // Handle clicking on a day in the daily chart
  const handleDayClick = useCallback((dayIndex: number) => {
    if (dayIndex >= 0 && dayIndex < data.days.length) {
      setSelectedDay(data.days[dayIndex].date);
      setDataType('daily');
      setViewMode('hourly');
    }
  }, [data.days]);

  // Prepare data for hourly view
  const getHourlyChartData = () => {
    const baseData = {
      labels: hourlyLabels,
      datasets: [] as any[]
    };

    // Create gradient background colors
    const createGradient = (ctx: CanvasRenderingContext2D | null, colorStart: string, colorEnd: string) => {
      if (!ctx) return colorStart;
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, colorStart);
      gradient.addColorStop(1, colorEnd);
      return gradient;
    };

    if (dataType === 'daily') {
      const selectedDayData = data.days.find(day => day.date === selectedDay);
      
      if (!selectedDayData) {
        return baseData;
      }

      return {
        ...baseData,
        datasets: [
          {
            label: `Kijkers op ${selectedDay}`,
            data: selectedDayData.hourlyViewers,
            backgroundColor: (context: any) => {
              const chart = context.chart;
              const {ctx} = chart;
              return createGradient(ctx, 'rgba(244, 123, 37, 0.8)', 'rgba(249, 166, 94, 0.4)');
            },
            borderColor: '#F47B25',
            borderWidth: 1,
          },
        ],
      };
    }

    // Use totalViewersPerHour when dataType is 'total' and it exists
    if (dataType === 'total' && data.totalViewersPerHour && data.totalViewersPerHour.length === 24) {
      return {
        ...baseData,
        datasets: [
          {
            label: 'Totaal aantal kijkers per uur',
            data: data.totalViewersPerHour,
            backgroundColor: (context: any) => {
              const chart = context.chart;
              const {ctx} = chart;
              return createGradient(ctx, 'rgba(244, 123, 37, 0.8)', 'rgba(249, 166, 94, 0.4)');
            },
            borderColor: '#F47B25',
            borderWidth: 1,
          },
        ],
      };
    }

    if (dataType === 'average') {
      return {
        ...baseData,
        datasets: [
          {
            label: 'Gemiddeld aantal kijkers per uur',
            data: data.averageHourlyViewers,
            backgroundColor: (context: any) => {
              const chart = context.chart;
              const {ctx} = chart;
              return createGradient(ctx, 'rgba(45, 48, 109, 0.8)', 'rgba(77, 84, 164, 0.4)');
            },
            borderColor: '#2D306D',
            borderWidth: 1,
          },
        ],
      };
    }

    return {
      ...baseData,
      datasets: [
        {
          label: 'Maximum aantal kijkers per uur',
          data: data.maxViewersPerHour,
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const {ctx} = chart;
            return createGradient(ctx, 'rgba(249, 166, 94, 0.8)', 'rgba(243, 184, 186, 0.4)');
          },
          borderColor: '#F9A65E',
          borderWidth: 1,
        },
      ],
    };
  };

  // Prepare data for daily view
  const getDailyChartData = () => {
    // Create gradient background colors
    const createGradient = (ctx: CanvasRenderingContext2D | null, colorStart: string, colorEnd: string) => {
      if (!ctx) return colorStart;
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, colorStart);
      gradient.addColorStop(1, colorEnd);
      return gradient;
    };

    return {
      labels: data.days.map(day => day.date),
      datasets: [
        {
          label: 'Totaal aantal kijkers per dag',
          data: data.days.map(day => day.totalViewers),
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const {ctx} = chart;
            return createGradient(ctx, 'rgba(244, 123, 37, 0.8)', 'rgba(249, 166, 94, 0.4)');
          },
          borderColor: '#F47B25',
          borderWidth: 1,
        }
      ]
    };
  };

  // Chart options for hourly view
  const hourlyChartOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: dataType === 'daily' 
          ? `Kijkcijfers voor ${selectedDay}` 
          : `Kijkcijfers ${data.monthYear}`,
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            return `${value.toLocaleString()} kijkers`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Aantal kijkers',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Uur van de dag',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    }
  };

  // Chart options for daily view with click handler
  const dailyChartOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Dagelijkse kijkcijfers voor ${data.monthYear}`,
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            return `${value.toLocaleString()} kijkers`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Aantal kijkers',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Datum',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        handleDayClick(index);
      }
    }
  };

  // Calculate total and average viewers
  const totalMonthlyViewers = data.totalViewers || 0;
  const averageDailyViewers = data.days.length > 0 ? Math.round(totalMonthlyViewers / data.days.length) : 0;
  const totalHourlyViewers = data.averageHourlyViewers ? data.averageHourlyViewers.reduce((sum, viewers) => sum + viewers, 0) : 0;
  
  // Find peak hour from the actual data, not based on UI state
  let peakHour = '';
  let maxHourlyViewers = 0;
  
  if (data.peakHour !== undefined && data.peakHour >= 0 && data.peakHour < 24) {
    peakHour = hourlyLabels[data.peakHour];
    
    if (data.totalViewersPerHour && data.totalViewersPerHour.length > data.peakHour) {
      maxHourlyViewers = data.totalViewersPerHour[data.peakHour];
    } else if (data.averageHourlyViewers && data.averageHourlyViewers.length > data.peakHour) {
      maxHourlyViewers = data.averageHourlyViewers[data.peakHour];
    }
  }

  // For single day view, find peak hour for that specific day
  if (viewMode === 'hourly' && dataType === 'daily') {
    const selectedDayData = data.days.find(day => day.date === selectedDay);
    
    if (selectedDayData) {
      const maxDayViewers = Math.max(...selectedDayData.hourlyViewers);
      const dayPeakHourIndex = selectedDayData.hourlyViewers.indexOf(maxDayViewers);
      
      if (dayPeakHourIndex !== -1) {
        peakHour = hourlyLabels[dayPeakHourIndex];
        maxHourlyViewers = maxDayViewers;
      }
    }
  }

  // Determine if we're showing combined data
  const isAggregatedView = data.monthYear.includes('Samenvatting') || data.monthYear.includes('-');
  const viewersLabel = isAggregatedView ? "kijkers in de periode" : "kijkers in de maand";

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* View Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Weergave:
          </label>
          <div className="inline-flex rounded-md shadow-sm">
            <button
              className={`px-4 py-2 text-sm font-medium border ${
                viewMode === 'hourly'
                  ? 'bg-[#F47B25] text-white border-[#F47B25]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-l-md`}
              onClick={() => setViewMode('hourly')}
            >
              Per uur
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border ${
                viewMode === 'daily'
                  ? 'bg-[#F47B25] text-white border-[#F47B25]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-r-md`}
              onClick={() => setViewMode('daily')}
            >
              Per dag
            </button>
          </div>
        </div>
        
        {/* Chart Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grafiek:
          </label>
          <div className="inline-flex rounded-md shadow-sm">
            <button
              className={`px-4 py-2 text-sm font-medium border ${
                chartType === 'bar'
                  ? 'bg-[#F47B25] text-white border-[#F47B25]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-l-md`}
              onClick={() => setChartType('bar')}
            >
              Staafdiagram
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border ${
                chartType === 'line'
                  ? 'bg-[#F47B25] text-white border-[#F47B25]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-r-md`}
              onClick={() => setChartType('line')}
            >
              Lijndiagram
            </button>
          </div>
        </div>
        
        {/* Data Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data:
          </label>
            <div className="inline-flex rounded-md shadow-sm">
              <button
                className={`px-3 py-2 text-sm font-medium border ${
                  dataType === 'total'
                    ? 'bg-[#F47B25] text-white border-[#F47B25]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } rounded-l-md`}
                onClick={() => setDataType('total')}
              >
                Totaal
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium border-t border-b ${
                  dataType === 'average'
                    ? 'bg-[#F47B25] text-white border-[#F47B25]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setDataType('average')}
              >
                Gemiddeld
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium border-t border-b ${
                  dataType === 'max'
                    ? 'bg-[#F47B25] text-white border-[#F47B25]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setDataType('max')}
              >
                Maximum
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium border ${
                  dataType === 'daily'
                    ? 'bg-[#F47B25] text-white border-[#F47B25]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } rounded-r-md`}
                onClick={() => setDataType('daily')}
              >
                Per dag
              </button>
            </div>
          </div>
        
      </div>
      
      {/* Chart */}
      <div className="mb-6">
        {viewMode === 'daily' && (
          <div className="mb-2 text-sm text-gray-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[#F47B25]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Klik op een dag in de grafiek om details per uur te bekijken</span>
          </div>
        )}
        
        {/* Day Selection */}
        {viewMode === 'hourly' && dataType === 'daily' && data.days.length > 0 && (
          <div className="w-full md:w-auto mb-4">
            <label htmlFor="day-select" className="block text-sm font-medium text-gray-700 mb-2">
              Selecteer dag:
            </label>
            <div className="relative">
              <select
                id="day-select"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="appearance-none w-full md:w-64 px-3 py-2 text-sm border border-[#F47B25] rounded-md shadow-sm focus:outline-none focus:ring-[#F47B25] focus:border-[#F47B25] pr-10"
              >
                {data.days.map(day => (
                  <option key={day.date} value={day.date}>
                    {day.date} ({day.dayOfWeek})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#F47B25]">
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 italic">Je kunt ook op een dag klikken in de grafiek 'Per dag'</p>
          </div>
        )}
        
        <div className="h-[400px]">
          {viewMode === 'hourly' ? (
            chartType === 'bar' ? (
              <Bar data={getHourlyChartData()} options={hourlyChartOptions} />
            ) : (
              <Line data={getHourlyChartData()} options={hourlyChartOptions} />
            )
          ) : (
            chartType === 'bar' ? (
              <Bar data={getDailyChartData()} options={dailyChartOptions} />
            ) : (
              <Line data={getDailyChartData()} options={dailyChartOptions} />
            )
          )}
        </div>
      </div>
      
      {/* Summary statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Overzicht</h3>
          
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Periode:</dt>
              <dd className="text-sm font-medium">{data.monthYear}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Dagen:</dt>
              <dd className="text-sm font-medium">{data.days.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Totaal aantal {viewersLabel}:</dt>
              <dd className="text-sm font-medium">{totalMonthlyViewers.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Gemiddeld per dag:</dt>
              <dd className="text-sm font-medium">{averageDailyViewers.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Dag met meeste kijkers:</dt>
              <dd className="text-sm font-medium">{data.peakDay}</dd>
            </div>
          </dl>
        </div>
        
        {/* Right column */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Piekuur statistieken</h3>
          
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Piekuur:</dt>
              <dd className="text-sm font-medium">{peakHour}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Aantal kijkers op piekuur:</dt>
              <dd className="text-sm font-medium">{maxHourlyViewers.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Gemiddeld aantal kijkers per uur:</dt>
              <dd className="text-sm font-medium">{Math.round(totalHourlyViewers / 24).toLocaleString()}</dd>
            </div>
            {dataType === 'daily' && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Totaal kijkers op {selectedDay}:</dt>
                <dd className="text-sm font-medium">
                  {data.days.find(day => day.date === selectedDay)?.totalViewers.toLocaleString() || '0'}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}