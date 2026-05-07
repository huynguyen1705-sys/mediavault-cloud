"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight, Loader2, TrendingUp, HardDrive, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

interface DayData {
  date: string;
  count: number;
  totalSize: number;
}

function formatBytes(b: number): string {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getIntensityColor(count: number, maxCount: number, isDark: boolean): string {
  if (count === 0) return isDark ? "bg-gray-800" : "bg-gray-100";
  const intensity = count / maxCount;
  
  if (isDark) {
    if (intensity >= 0.8) return "bg-emerald-500";
    if (intensity >= 0.6) return "bg-emerald-600";
    if (intensity >= 0.4) return "bg-emerald-700";
    if (intensity >= 0.2) return "bg-emerald-800";
    return "bg-emerald-900";
  } else {
    if (intensity >= 0.8) return "bg-emerald-600";
    if (intensity >= 0.6) return "bg-emerald-500";
    if (intensity >= 0.4) return "bg-emerald-400";
    if (intensity >= 0.2) return "bg-emerald-300";
    return "bg-emerald-200";
  }
}

export default function HeatmapPage() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [heatmap, setHeatmap] = useState<DayData[]>([]);
  const [maxCount, setMaxCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Detect theme
  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const fetchHeatmap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/heatmap?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setHeatmap(data.heatmap || []);
        setMaxCount(data.maxCount || 1);
      }
    } catch { /* */ }
    setLoading(false);
  }, [year]);

  useEffect(() => { fetchHeatmap(); }, [fetchHeatmap]);

  // Build calendar grid (52 weeks x 7 days)
  const buildCalendar = () => {
    const weeks: (DayData | null)[][] = [];
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);
    
    // Start from first Sunday of year (or before)
    const firstDay = new Date(startDate);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());
    
    const dayMap = new Map(heatmap.map(d => [d.date, d]));
    
    let currentDate = new Date(firstDay);
    let week: (DayData | null)[] = [];
    
    while (currentDate <= endDate || week.length > 0) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayData = dayMap.get(dateStr);
      
      if (currentDate >= startDate && currentDate <= endDate) {
        week.push(dayData || { date: dateStr, count: 0, totalSize: 0 });
      } else {
        week.push(null); // Empty cell for padding
      }
      
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (week.length > 0) weeks.push(week);
    return weeks;
  };

  const calendar = buildCalendar();
  const totalFiles = heatmap.reduce((s, d) => s + d.count, 0);
  const totalSize = heatmap.reduce((s, d) => s + d.totalSize, 0);
  const activeDays = heatmap.filter(d => d.count > 0).length;

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Activity Heatmap</h1>
              <p className="text-xs text-gray-500 dark:text-white/40">Visual overview of your upload activity</p>
            </div>
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear(y => y - 1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-white/60" />
            </button>
            <span className="text-lg font-bold text-gray-900 dark:text-white min-w-[80px] text-center">{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              disabled={year >= new Date().getFullYear()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-white/60" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl p-4 shadow-md dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-white/40">Total Files</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{totalFiles.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl p-4 shadow-md dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-white/40">Total Size</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatBytes(totalSize)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl p-4 shadow-md dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-white/40">Active Days</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{activeDays} / 365</p>
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <div className="bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl p-6 shadow-md dark:shadow-none overflow-x-auto">
            {/* Month labels */}
            <div className="flex gap-[3px] mb-2 ml-8">
              {monthLabels.map((month, i) => (
                <div key={i} className="text-[10px] text-gray-500 dark:text-white/40 font-medium" style={{ width: `${(365 / 12) * 11}px` }}>
                  {month}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {/* Day labels */}
              <div className="flex flex-col gap-[3px] justify-around">
                {dayLabels.map((day, i) => (
                  <div key={i} className="text-[10px] text-gray-500 dark:text-white/40 font-medium h-[11px] flex items-center">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="flex gap-[3px]">
                {calendar.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className={`w-[11px] h-[11px] rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-emerald-500 ${
                          day ? getIntensityColor(day.count, maxCount, isDark) : "bg-transparent"
                        }`}
                        onMouseEnter={() => day && setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => day && day.count > 0 && router.push(`/files?date=${day.date}`)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 justify-end">
              <span className="text-[10px] text-gray-500 dark:text-white/40">Less</span>
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
                <div
                  key={i}
                  className={`w-[11px] h-[11px] rounded-sm ${getIntensityColor(intensity * maxCount, maxCount, isDark)}`}
                />
              ))}
              <span className="text-[10px] text-gray-500 dark:text-white/40">More</span>
            </div>
          </div>
        )}

        {/* Hover tooltip */}
        {hoveredDay && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg shadow-xl text-sm font-medium">
            {new Date(hoveredDay.date + "T00:00:00").toLocaleDateString("en-US", { 
              weekday: "short", 
              month: "short", 
              day: "numeric", 
              year: "numeric" 
            })}
            <span className="mx-2">·</span>
            {hoveredDay.count} files
            <span className="mx-2">·</span>
            {formatBytes(hoveredDay.totalSize)}
          </div>
        )}
      </div>
    </div>
  );
}
