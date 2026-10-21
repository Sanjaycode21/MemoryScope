import React, { useState } from 'react';
import { SimulationConfig, SimulationTrace } from '../../types';
import {
  analyzeWorkload,
  testRecommendationImprovement,
} from '../../engine/workloadAnalyzer';
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

interface WorkloadDiagnosisViewProps {
  config: SimulationConfig;
  currentTrace: SimulationTrace;
  onApplyConfig: (patch: Partial<SimulationConfig>) => void;
}

export const WorkloadDiagnosisView: React.FC<WorkloadDiagnosisViewProps> = ({
  config,
  currentTrace,
  onApplyConfig,
}) => {
  const diagnosis = analyzeWorkload(config.referenceString, config, currentTrace);
  const [testResult, setTestResult] = useState<ReturnType<
    typeof testRecommendationImprovement
  > | null>(null);

  const handleTestFix = (patch: Partial<SimulationConfig>) => {
    const res = testRecommendationImprovement(config, patch);
    setTestResult(res);
  };

  const getThrashingBadge = () => {
    switch (diagnosis.thrashingRisk) {
      case 'critical':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/50 flex items-center gap-1.5 animate-pulse">
            <AlertOctagon className="w-3.5 h-3.5" /> CRITICAL THRASHING
          </span>
        );
      case 'moderate':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/50 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> MODERATE PRESSURE
          </span>
        );
      case 'low':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> HEALTHY WORKLOAD
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 rounded-lg border border-brand-500/30">
              <Activity className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Workload Intelligence & Diagnosis</h2>
              <p className="text-xs text-slate-400">
                Pattern recognition, working-set modeling, and automated remediation engine.
              </p>
            </div>
          </div>
          <div>{getThrashingBadge()}</div>
        </div>

        {/* Diagnosis Summary Banner */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="text-xs uppercase font-mono font-semibold text-brand-400">
            Diagnosis Report
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">
            {diagnosis.diagnosisSummary}
          </p>

          <div className="pt-2 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">AVG WORKING SET (W(t, Δ))</span>
              <span className="text-base font-bold text-white">
                {diagnosis.avgWorkingSetSize} Pages
              </span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">PEAK WORKING SET</span>
              <span className="text-base font-bold text-white">
                {diagnosis.maxWorkingSetSize} Pages
              </span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">ALLOCATED RAM</span>
              <span className="text-base font-bold text-cyan-400">
                {config.frameCount} Frames
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detected Access Patterns */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-400" />
          <span>Detected Access Patterns ({diagnosis.patterns.length})</span>
        </h3>

        {diagnosis.patterns.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">
            No distinct macro-patterns detected (uniform or pseudo-random access distribution).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {diagnosis.patterns.map((pat) => (
              <div
                key={pat.id}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-100">{pat.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-brand-500/20 text-brand-300 border border-brand-500/40">
                    {(pat.confidence * 100).toFixed(0)}% Match
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-snug">{pat.description}</p>
                <div className="pt-2 border-t border-slate-900 space-y-1">
                  {pat.evidence.map((ev, i) => (
                    <div key={i} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-cyan-400" />
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actionable Recommendations & "Test This Fix" Button */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Recommended Optimizations ({diagnosis.recommendations.length})
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Click "Test Fix" to benchmark live improvements
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {diagnosis.recommendations.map((rec, i) => (
            <div
              key={i}
              className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div>
                <h4 className="font-bold text-sm text-slate-100 mb-1">{rec.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{rec.description}</p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => handleTestFix(rec.suggestedConfig)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Test Fix</span>
                </button>
                <button
                  onClick={() => onApplyConfig(rec.suggestedConfig)}
                  className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Live Re-Simulation Test Result Card */}
        {testResult && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-950 border border-emerald-500/50 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm text-white">
                  Fix Benchmark: {testResult.percentageGain}% Fault Reduction!
                </h4>
              </div>
              <button
                onClick={() => onApplyConfig(testResult.improvedConfig)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow"
              >
                Apply This Optimization
              </button>
            </div>

            <p className="text-xs text-emerald-200/90 leading-relaxed font-mono">
              {testResult.explanation}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block">ORIGINAL FAULTS</span>
                <span className="text-rose-400 font-bold text-sm">
                  {testResult.originalTrace.summary.faults} faults
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block">NEW FAULTS</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {testResult.improvedTrace.summary.faults} faults
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block">ORIGINAL HIT RATIO</span>
                <span className="text-slate-300 font-bold text-sm">
                  {(testResult.originalTrace.summary.hitRatio * 100).toFixed(0)}%
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block">IMPROVED HIT RATIO</span>
                <span className="text-emerald-300 font-bold text-sm">
                  {(testResult.improvedTrace.summary.hitRatio * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
