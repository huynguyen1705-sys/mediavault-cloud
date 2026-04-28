"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

interface ChartData {
  date: string;
  value: number;
}

interface FileTypeData {
  type: string;
  count: number;
}

interface AnalyticsData {
  storageUsage: ChartData[];
  filesUploaded: ChartData[];
  bandwidthUsage: ChartData[];
  fileTypeBreakdown: FileTypeData[];
  summary: {
    totalStorage: number;
    totalBandwidth: number;
    totalFiles: number;
    storageLimit: number;
    bandwidthLimit: number;
  };
}

// Simple SVG line chart
function LineChart({ data, color = "#a855f7", label = "Value" }: { data: ChartData[]; color?: string; label?: string }) {
  if (data.length === 0) return <div className="text-gray-500 text-sm text-center py-8">No data available</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 800, h = 200;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * w;
    const y = h - (d.value / max) * (h - 20);
    return `${x},${y}`;
  });

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <line
            key={r}
            x1="0" y1={h - r * (h - 20)}
            x2={w} y2={h - r * (h - 20)}
            stroke="#1f2937" strokeWidth="1"
          />
        ))}
        {/* Area fill */}
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${h} ${pts.join(" ")} ${w},${h}`}
          fill={`url(#grad-${color.replace("#", "")})`}
        />
        {/* Line */}
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Dots */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * w;
          const y = h - (d.value / max) * (h - 20);
          return <circle key={i} cx={x} cy={y} r="4" fill={color} />;
        })}
      </svg>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{data[0]?.date}</span>
        <span>{label}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// Simple SVG pie chart
function PieChart({ data }: { data: FileTypeData[] }) {
  const colors = ["#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <div className="text-gray-500 text-sm text-center py-8">No data</div>;

  let startAngle = 0;
  const slices = data.map((d, i) => {
    const angle = (d.count / total) * 360;
    const start = startAngle;
    startAngle += angle;
    return { ...d, angle, start, color: colors[i % colors.length] };
  });

  const cx = 120, cy = 120, r = 100;
  const polarToXY = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <svg viewBox="0 0 240 240" className="w-full" style={{ maxWidth: 280 }}>
        {slices.map((s, i) => {
          const start = polarToXY(s.start);
          const end = polarToXY(s.start + s.angle);
          const large = s.angle > 180 ? 1 : 0;
          const path = [
            `M ${cx} ${cy}`,
            `L ${start.x} ${start.y}`,
            `A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`,
            "Z",
          ].join(" ");
          return <path key={i} d={path} fill={s.color} stroke="#0a0a0f" strokeWidth="2" />;
        })}
        <circle cx={cx} cy={cy} r={60} fill="#1a1a2e" />
      </svg>
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-gray-400">{s.type}: {s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, isLoaded } = useUser();
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/analytics?range=${range}&userId=${user.id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [range, user]);

  if (!isLoaded || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sum = data?.summary;
  const storagePct = sum ? Math.round((sum.totalStorage / sum.storageLimit) * 100) : 0;
  const bandwidthPct = sum ? Math.round((sum.totalBandwidth / sum.bandwidthLimit) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 Usage Analytics</h1>
          <p className="text-gray-400 mt-1">Track your storage, bandwidth, and file activity</p>
        </div>
        <div className="flex gap-2 bg-gray-900 p-1 rounded-xl border border-gray-800">
          {(["7", "30", "90"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                range === r
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <p className="text-sm text-gray-400 mb-2">Storage Used</p>
              <p className="text-2xl font-bold text-white">{formatBytes(sum?.totalStorage || 0)}</p>
              <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${Math.min(storagePct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{storagePct}% of {formatBytes(sum?.storageLimit || 0)}</p>
            </div>

            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <p className="text-sm text-gray-400 mb-2">Bandwidth Used</p>
              <p className="text-2xl font-bold text-white">{formatBytes(sum?.totalBandwidth || 0)}</p>
              <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(bandwidthPct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{bandwidthPct}% of {formatBytes(sum?.bandwidthLimit || 0)}</p>
            </div>

            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <p className="text-sm text-gray-400 mb-2">Total Files</p>
              <p className="text-2xl font-bold text-white">{(sum?.totalFiles || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-3">Across all folders</p>
            </div>

            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <p className="text-sm text-gray-400 mb-2">File Types</p>
              <p className="text-2xl font-bold text-white">{data?.fileTypeBreakdown.length || 0}</p>
              <p className="text-xs text-gray-500 mt-3">Different categories</p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">📦 Storage Usage (bytes)</h3>
              <LineChart data={data?.storageUsage || []} color="#a855f7" label="Storage bytes" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">📤 Files Uploaded</h3>
              <LineChart data={data?.filesUploaded || []} color="#3b82f6" label="Files count" />
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">🌐 Bandwidth Usage (bytes)</h3>
              <LineChart data={data?.bandwidthUsage || []} color="#10b981" label="Bandwidth bytes" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">📁 File Type Breakdown</h3>
              <PieChart data={data?.fileTypeBreakdown || []} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}