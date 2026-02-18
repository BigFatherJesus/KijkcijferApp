'use client';

import { useState } from 'react';
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
  ChartOptions
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { ProcessedMonthData } from '../types';

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

interface MonthComparisonProps {
  months: ProcessedMonthData[];
}

type ComparisonType = 'peakHour' | 'totalViewers' | 'averageDailyViewers';

export default function MonthComparison({ months }: MonthComparisonProps) {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [comparisonType, setComparisonType] = useState<ComparisonType>('totalViewers');
  
  // Sort months chronologically
  const sortedMonths = [...months].sort((a, b) => {
    const monthOrder: Record<string, number> = {
      'Januari': 1, 'Februari': 2, 'Maart': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
      'Juli': 7, 'Augustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'December': 12
    };

    // Extract month and year
    const getMonthYear = (text: string) => {
      // Match month name and year (e.g., "November 2023")
      const match = text.match(/([A-Za-z]+)\s+(\d{4})/);
      if (!match) return { month: 0, year: 0 };
      
      const monthName = match[1];
      const year = parseInt(match[2], 10);
      
      // Find month number, default to 0 if not found
      const monthNum = monthOrder[monthName] || 0;
      
      return { month: monthNum, year };
    };
    
    const aInfo = getMonthYear(a.monthYear);
    const bInfo = getMonthYear(b.monthYear);
    
    // Sort by year first, then by month
    if (aInfo.year !== bInfo.year) {
      return aInfo.year - bInfo.year;
    }
    
    return aInfo.month - bInfo.month;
  });

  // Filter out combined data summary if it exists
  const filteredMonths = sortedMonths.filter(month => 
    !month.monthYear.includes('Samenvatting') && !month.monthYear.includes('-')
  );

  // Generate labels for the chart (month names)
  const labels = filteredMonths.map(month => month.monthYear);

  // Build dataset based on the selected comparison type
  const getChartData = () => {
    let data, label, colors;

    // Create gradient background colors
    const createGradient = (ctx: CanvasRenderingContext2D | null, colorStart: string, colorEnd: string) => {
      if (!ctx) return colorStart;
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, colorStart);
      gradient.addColorStop(1, colorEnd);
      return gradient;
    };

    switch(comparisonType) {
      case 'peakHour':
        data = filteredMonths.map(month => {
          // Format peak hour for display (e.g., "20:00")
          return month.peakHour !== undefined ? month.peakHour : 0;
        });
        label = 'Piekuur (uur van de dag)';
        colors = {
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const {ctx} = chart;
            return createGradient(ctx, 'rgba(45, 48, 109, 0.8)', 'rgba(77, 84, 164, 0.4)');
          },
          borderColor: '#2D306D'
        };
        break;
      case 'totalViewers':
        data = filteredMonths.map(month => month.totalViewers || 0);
        label = 'Totaal aantal kijkers';
        colors = {
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const {ctx} = chart;
            return createGradient(ctx, 'rgba(244, 123, 37, 0.8)', 'rgba(249, 166, 94, 0.4)');
          },
          borderColor: '#F47B25'
        };
        break;
      case 'averageDailyViewers':
        data = filteredMonths.map(month => {
          const days = month.days.length;
          return days > 0 ? Math.round((month.totalViewers || 0) / days) : 0;
        });
        label = 'Gemiddeld aantal kijkers per dag';
        colors = {
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const {ctx} = chart;
            return createGradient(ctx, 'rgba(249, 166, 94, 0.8)', 'rgba(217, 115, 120, 0.4)');
          },
          borderColor: '#F9A65E'
        };
        break;
    }

    return {
      labels,
      datasets: [
        {
          label,
          data,
          ...colors,
          borderWidth: 1,
        }
      ]
    };
  };

  // Chart options
  const chartOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Vergelijking tussen maanden',
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            if (comparisonType === 'peakHour') {
              return `Piekuur: ${value}:00`;
            }
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
          text: comparisonType === 'peakHour' ? 'Uur van de dag' : 'Aantal kijkers',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function(value) {
            if (comparisonType === 'peakHour') {
              return `${value}:00`;
            }
            return value.toLocaleString();
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Maand',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Vergelijking tussen maanden</h2>
      
      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
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
        
        {/* Comparison Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vergelijk:
          </label>
          <div className="inline-flex rounded-md shadow-sm">
            <button
              className={`px-3 py-2 text-sm font-medium border ${
                comparisonType === 'totalViewers'
                  ? 'bg-[#F47B25] text-white border-[#F47B25]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-l-md`}
              onClick={() => setComparisonType('totalViewers')}
            >
              Totaal kijkers
            </button>
            <button
              className={`px-3 py-2 text-sm font-medium border-t border-b ${
                comparisonType === 'averageDailyViewers'
                  ? 'bg-[#F47B25] text-white border-[#F47B25]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setComparisonType('averageDailyViewers')}
            >
              Gemiddeld per dag
            </button>
            <button
              className={`px-3 py-2 text-sm font-medium border ${
                comparisonType === 'peakHour'
                  ? 'bg-[#F47B25] text-white border-[#F47B25]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-r-md`}
              onClick={() => setComparisonType('peakHour')}
            >
              Piekuur
            </button>
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="relative h-96 mb-6">
        {filteredMonths.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Geen maandgegevens beschikbaar voor vergelijking</p>
          </div>
        ) : chartType === 'bar' ? (
          <Bar data={getChartData()} options={chartOptions} />
        ) : (
          <Line data={getChartData()} options={chartOptions} />
        )}
      </div>
      
      {/* Summary */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-white to-orange-50">
        <h3 className="text-lg font-medium text-[#00001F] mb-4 border-b border-[#F47B25] pb-2">
          Highlights uit de vergelijking
        </h3>
        
        {filteredMonths.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-[#F47B25]">
              <h4 className="text-sm font-medium text-[#2D306D] mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-[#F47B25]" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Hoogste totaal kijkers
              </h4>
              {(() => {
                const maxMonth = [...filteredMonths].sort((a, b) => (b.totalViewers || 0) - (a.totalViewers || 0))[0];
                return (
                  <div>
                    <p className="text-xl font-bold text-[#00001F]">
                      {(maxMonth.totalViewers || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {maxMonth.monthYear}
                    </p>
                  </div>
                );
              })()}
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-[#F9A65E]">
              <h4 className="text-sm font-medium text-[#2D306D] mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-[#F9A65E]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Hoogste daggemiddelde
              </h4>
              {(() => {
                const maxAvgMonth = [...filteredMonths].sort((a, b) => {
                  const avgA = a.days.length > 0 ? (a.totalViewers || 0) / a.days.length : 0;
                  const avgB = b.days.length > 0 ? (b.totalViewers || 0) / b.days.length : 0;
                  return avgB - avgA;
                })[0];
                
                const avgViewers = maxAvgMonth.days.length > 0 
                  ? Math.round((maxAvgMonth.totalViewers || 0) / maxAvgMonth.days.length) 
                  : 0;
                
                return (
                  <div>
                    <p className="text-xl font-bold text-[#00001F]">
                      {avgViewers.toLocaleString()} <span className="text-sm font-normal">per dag</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      {maxAvgMonth.monthYear}
                    </p>
                  </div>
                );
              })()}
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-[#2D306D]">
              <h4 className="text-sm font-medium text-[#2D306D] mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-[#2D306D]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Meest voorkomende piekuur
              </h4>
              {(() => {
                // Count frequency of each peak hour
                const peakHours: Record<number, number> = {};
                filteredMonths.forEach(month => {
                  if (month.peakHour !== undefined) {
                    peakHours[month.peakHour] = (peakHours[month.peakHour] || 0) + 1;
                  }
                });
                
                // Find most common peak hour
                let mostCommonHour = 0;
                let maxCount = 0;
                
                Object.entries(peakHours).forEach(([hour, count]) => {
                  if (count > maxCount) {
                    mostCommonHour = parseInt(hour);
                    maxCount = count;
                  }
                });
                
                return (
                  <div>
                    <p className="text-xl font-bold text-[#00001F]">
                      {mostCommonHour}:00
                    </p>
                    <p className="text-sm text-gray-600">
                      In {maxCount} van {filteredMonths.length} maanden
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Geen data beschikbaar voor vergelijking</p>
        )}
      </div>
    </div>
  );
}