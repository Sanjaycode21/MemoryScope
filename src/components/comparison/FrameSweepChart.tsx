import React, { useState } from 'react';
import { FrameSweepReport } from '../../engine/counterfactual';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface FrameSweepChartProps {
  report: FrameSweepReport;
  activeFrameCount: number;
}

export const FrameSweepChart: React.FC<FrameSweepChartProps> = ({
  report,
  activeFrameCount,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const { dataPoints, anomalies } = report;
  if (dataPoints.length === 0) return null;

  // Find max faults for chart scaling
  const maxFaults = Math.max(
    ...dataPoints.flatMap((p) => [p.FIFO, p.LRU, p.OPT, p.CLOCK]),
    1
  );

  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Scales
  const getX = (frames: number) => {
    const minF = dataPoints[0].frames;
    const maxF = dataPoints[dataPoints.length - 1].frames;
    if (maxF === minF) return padding.left;
    return padding.left + ((frames - minF) / (maxF - minF)) * chartW;
  };

  const getY = (val: number) => {
    return padding.top + chartH - (val / maxFaults) * chartH;
  };

  const algos = [
    { key: 'FIFO', label: 'FIFO', color: '#f59e0b', stroke: '#f59e0b' },
    { key: 'LRU', label: 'LRU', color: '#3b82f6', stroke: '#3b82f6' },
    { key: 'OPT', label: 'Optimal (MIN)', color: '#10b981', stroke: '#10b981' },
    { key: 'CLOCK', label: 'Clock', color: '#a855f7', stroke: '#a855f7' },
  ] as const;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Frame-Count Sweep & Bélády's Anomaly Detection
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates page faults as physical RAM scales from {dataPoints[0].frames} to{' '}
              {dataPoints[dataPoints.length - 1].frames} frames.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {algos.map((a) => (
            <div key={a.key} className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded" style={{ backgroundColor: a.color }} />
              <span className="text-slate-300">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Belady's Anomaly Banner if detected */}
      {anomalies.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/60 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Bélády's Anomaly Detected!
            </h4>
            {anomalies.map((anom, i) => (
              <p key={i} className="text-xs text-amber-200/90 leading-relaxed font-mono">
                {anom.explanation}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* SVG Responsive Chart */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 font-mono select-none">
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const val = Math.round(maxFaults * pct);
            const y = getY(val);
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Current Frame indicator vertical line */}
          <line
            x1={getX(activeFrameCount)}
            y1={padding.top}
            x2={getX(activeFrameCount)}
            y2={height - padding.bottom}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          <text
            x={getX(activeFrameCount)}
            y={padding.top - 6}
            fill="#38bdf8"
            fontSize="9"
            textAnchor="middle"
          >
            Current ({activeFrameCount}F)
          </text>

          {/* Lines for each algorithm */}
          {algos.map((algo) => {
            const pathD = dataPoints
              .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.frames)} ${getY(pt[algo.key])}`)
              .join(' ');

            return (
              <g key={algo.key}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={algo.stroke}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Data point dots */}
                {dataPoints.map((pt) => {
                  const x = getX(pt.frames);
                  const y = getY(pt[algo.key]);
                  const isHovered = hoveredPoint === pt.frames;

                  return (
                    <circle
                      key={pt.frames}
                      cx={x}
                      cy={y}
                      r={isHovered ? 5 : 3.5}
                      fill="#020617"
                      stroke={algo.color}
                      strokeWidth="2"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(pt.frames)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* X Axis labels */}
          {dataPoints.map((pt) => {
            const x = getX(pt.frames);
            return (
              <text
                key={pt.frames}
                x={x}
                y={height - padding.bottom + 18}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
              >
                {pt.frames}F
              </text>
            );
          })}
          <text
            x={width / 2}
            y={height - 6}
            fill="#64748b"
            fontSize="10"
            textAnchor="middle"
          >
            Number of Physical Frames
          </text>
        </svg>
      </div>

      {/* Hovered point details if any */}
      {hoveredPoint !== null && (
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono flex items-center justify-between">
          <span className="font-bold text-slate-300">
            Faults with {hoveredPoint} Frames:
          </span>
          <div className="flex items-center gap-4">
            {algos.map((a) => {
              const pt = dataPoints.find((p) => p.frames === hoveredPoint);
              return (
                <span key={a.key} style={{ color: a.color }}>
                  {a.label}: <strong>{pt ? pt[a.key] : 0}</strong> faults
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
