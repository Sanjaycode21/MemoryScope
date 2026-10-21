import React, { useState } from 'react';
import { AlgorithmType, SimulationConfig } from '../../types';
import {
  runMultiAlgorithmComparison,
  findDivergencePoints,
  runFrameSweep,
} from '../../engine/counterfactual';
import { FrameSweepChart } from './FrameSweepChart';
import {
  GitCompare,
  Sparkles,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';

interface CounterfactualViewProps {
  config: SimulationConfig;
  onApplyConfig: (patch: Partial<SimulationConfig>) => void;
}

export const CounterfactualView: React.FC<CounterfactualViewProps> = ({
  config,
  onApplyConfig,
}) => {
  const [selectedDivergence, setSelectedDivergence] = useState<number | null>(null);

  // Run multi-algo comparison on current config
  const traces = runMultiAlgorithmComparison({
    frameCount: config.frameCount,
    pageSize: config.pageSize,
    addressSpaceSize: config.addressSpaceSize,
    referenceString: config.referenceString,
  });

  const divergences = findDivergencePoints(traces);
  const sweepReport = runFrameSweep({
    algorithm: config.algorithm,
    pageSize: config.pageSize,
    addressSpaceSize: config.addressSpaceSize,
    referenceString: config.referenceString,
  });

  const algos: AlgorithmType[] = ['FIFO', 'LRU', 'OPT', 'CLOCK'];

  return (
    <div className="space-y-6">
      {/* Top Banner: One-Click "What If" Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Counterfactual "What If" Studio
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare algorithmic divergence on identical reference inputs and test hypothetical
            configuration variations.
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {config.frameCount < 16 && (
            <button
              onClick={() => onApplyConfig({ frameCount: config.frameCount + 1 })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>What if +1 Frame ({config.frameCount + 1}F)</span>
            </button>
          )}

          {config.frameCount > 1 && (
            <button
              onClick={() => onApplyConfig({ frameCount: config.frameCount - 1 })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <MinusCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>What if -1 Frame ({config.frameCount - 1}F)</span>
            </button>
          )}

          {config.algorithm !== 'OPT' && (
            <button
              onClick={() => onApplyConfig({ algorithm: 'OPT' })}
              className="px-3 py-1.5 rounded-lg bg-brand-600/30 hover:bg-brand-600/50 text-xs font-mono font-medium text-brand-300 border border-brand-500/40 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Switch to Optimal Lower Bound</span>
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side Algorithm Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {algos.map((algo) => {
          const tr = traces[algo];
          const isCurrent = config.algorithm === algo;
          const hitRate = (tr.summary.hitRatio * 100).toFixed(1);

          return (
            <div
              key={algo}
              className={`rounded-xl border p-4 transition-all ${
                isCurrent
                  ? 'bg-slate-900 border-brand-500 ring-2 ring-brand-500/20'
                  : 'bg-slate-900/70 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono text-base text-white">{algo}</span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand-500/20 text-brand-300 border border-brand-500/40">
                      Active
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onApplyConfig({ algorithm: algo })}
                  disabled={isCurrent}
                  className={`text-[11px] font-mono hover:underline ${
                    isCurrent ? 'text-slate-500 cursor-default' : 'text-brand-400'
                  }`}
                >
                  {isCurrent ? 'Selected' : 'Use Policy'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">PAGE FAULTS</span>
                  <span className="text-lg font-bold text-rose-400">
                    {tr.summary.faults}
                  </span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">HIT RATIO</span>
                  <span className="text-lg font-bold text-emerald-400">{hitRate}%</span>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-400 leading-snug">
                {algo === 'FIFO' && 'Simple queue order. Blind to temporal access patterns.'}
                {algo === 'LRU' && 'Approximates future probability via recent usage history.'}
                {algo === 'OPT' && 'Theoretical minimum fault benchmark via future clairvoyance.'}
                {algo === 'CLOCK' && 'Hardware-friendly LRU approximation with 1-bit flags.'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Frame-Sweep Curve & Belady's Anomaly Visualizer */}
      <FrameSweepChart report={sweepReport} activeFrameCount={config.frameCount} />

      {/* Divergence Inspector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Divergence Points ({divergences.length} Divergent Steps Detected)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Highlights requests where algorithms made contrasting choices
          </span>
        </div>

        {divergences.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No divergence occurred! All algorithms produced identical hit/fault behavior for this
            sequence.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {divergences.map((divPoint, idx) => {
              const isSelected = selectedDivergence === idx;

              return (
                <div
                  key={divPoint.stepIndex}
                  onClick={() => setSelectedDivergence(isSelected ? null : idx)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-950 border-brand-500/70 ring-1 ring-brand-500/40'
                      : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-brand-300 font-mono text-xs font-bold flex items-center justify-center">
                        #{divPoint.stepIndex + 1}
                      </span>
                      <div>
                        <span className="text-sm font-bold font-mono text-white">
                          Request Page {divPoint.requestedPage}
                        </span>
                        <p className="text-xs text-slate-400">{divPoint.divergenceReason}</p>
                      </div>
                    </div>

                    {/* Per-algorithm outcome badges */}
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      {algos.map((a) => (
                        <span
                          key={a}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            divPoint.outcomes[a] === 'hit'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {a}: {divPoint.outcomes[a].toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expanded Takeaway & Eviction details */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs">
                      <div className="bg-brand-950/30 border border-brand-800/40 rounded p-2 text-brand-200">
                        <strong className="text-brand-300">Why did this diverge? </strong>
                        {divPoint.keyTakeaway}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                        {algos.map((a) => (
                          <div key={a} className="bg-slate-900 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[9px] uppercase">{a}</span>
                            <span className="text-slate-200 font-bold">
                              {divPoint.victims[a] !== null
                                ? `Evicted P${divPoint.victims[a]}`
                                : 'No Eviction'}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1">
                              Frames: [{divPoint.frames[a].filter((f) => f !== null).join(', ')}]
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
