import React from 'react';
import { SimulationStep, TraceSummary } from '../../types';
import { BarChart3, TrendingUp, CheckCircle, AlertCircle, RefreshCw, PieChart } from 'lucide-react';

interface MetricsPanelProps {
  summary: TraceSummary;
  currentStep: SimulationStep | undefined;
  steps: SimulationStep[];
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  summary,
  currentStep,
  steps,
}) => {
  const currentHits = currentStep ? currentStep.cumulativeHits : summary.hits;
  const currentFaults = currentStep ? currentStep.cumulativeFaults : summary.faults;
  const currentReplacements = currentStep
    ? currentStep.cumulativeReplacements
    : summary.replacements;
  const totalSoFar = currentStep ? currentStep.index + 1 : summary.totalRequests;
  const hitRatio = totalSoFar > 0 ? (currentHits / totalSoFar) * 100 : 0;
  const faultRatio = totalSoFar > 0 ? (currentFaults / totalSoFar) * 100 : 0;

  // Mini sparkline data of cumulative hits/faults
  const sparklinePoints = steps.map((s, idx) => ({
    x: (idx / Math.max(1, steps.length - 1)) * 100,
    hitRatio: ((s.cumulativeHits / (idx + 1)) * 100),
  }));

  const pathD = sparklinePoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${100 - pt.hitRatio}`)
    .join(' ');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Real-Time Simulation Metrics
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Processed: {totalSoFar} / {summary.totalRequests}
        </span>
      </div>

      {/* Grid of Key Performance Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Hits */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Hits</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">{currentHits}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {hitRatio.toFixed(1)}% hit rate
          </div>
        </div>

        {/* Faults */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Page Faults</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">{currentFaults}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {faultRatio.toFixed(1)}% fault rate
          </div>
        </div>

        {/* Hit Ratio Bar */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Hit Ratio</span>
            <TrendingUp className="w-3.5 h-3.5 text-brand-400" />
          </div>
          <div className="text-xl font-bold font-mono text-brand-400">
            {hitRatio.toFixed(1)}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-brand-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${hitRatio}%` }}
            />
          </div>
        </div>

        {/* Replacements */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Replacements</span>
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {currentReplacements}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Victims evicted
          </div>
        </div>

        {/* Memory Utilization */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>RAM Util</span>
            <PieChart className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {summary.memoryUtilization}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {summary.peakFramesUsed} frames active
          </div>
        </div>

        {/* Hit Rate Trend Sparkline */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="text-slate-400 text-[11px] mb-1">Hit Rate Curve</div>
          <div className="h-8 w-full">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <path
                d={pathD}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
