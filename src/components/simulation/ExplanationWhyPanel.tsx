import React from 'react';
import { SimulationStep, AlgorithmType } from '../../types';
import { HelpCircle, Info, Scale } from 'lucide-react';

interface ExplanationWhyPanelProps {
  step: SimulationStep | undefined;
  algorithm: AlgorithmType;
}

export const ExplanationWhyPanel: React.FC<ExplanationWhyPanelProps> = ({ step, algorithm }) => {
  if (!step) return null;

  const { explanation, decisionData, outcome, victimPage } = step;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Explainable Decision Breakdown
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-brand-500/10 text-brand-300 border border-brand-500/30">
          Policy: {algorithm}
        </span>
      </div>

      {/* Natural Language Explanation Box */}
      <div
        className={`p-3.5 rounded-xl border ${
          outcome === 'hit'
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
            : victimPage !== null
            ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
            : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-white">{explanation.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{explanation.detail}</p>
            <div className="pt-2 text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <span className="font-semibold text-brand-400">Formal OS Rule:</span>
              <span>{explanation.ruleApplied}</span>
            </div>
          </div>
        </div>
      </div>

      {/* The "Why" Decision Matrix */}
      <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2.5">
          <Scale className="w-4 h-4 text-cyan-400" />
          <span>Internal Decision Structure ({algorithm} State)</span>
        </div>

        {/* FIFO Arrival Queue */}
        {algorithm === 'FIFO' && decisionData.fifoQueue && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400 font-mono">
              FIFO evaluates arrival timestamps. The head of the queue was loaded earliest and is selected for eviction first:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {decisionData.fifoQueue.map((item, idx) => {
                const isCandidate = idx === 0 && outcome === 'fault' && victimPage !== null;
                return (
                  <div
                    key={item.page}
                    className={`p-2 rounded-lg border text-xs font-mono ${
                      isCandidate
                        ? 'bg-amber-950/40 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-bold text-white">Page {item.page}</span>
                      {isCandidate && (
                        <span className="text-[10px] uppercase font-bold text-amber-400">
                          Victim
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Loaded at: Step {item.arrivalTime}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LRU Recency Rankings */}
        {algorithm === 'LRU' && decisionData.lruRankings && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400 font-mono">
              LRU tracks access recency. Head has been idle for the longest duration (oldest last-used step) and is evicted first:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {decisionData.lruRankings.map((item, idx) => {
                const isCandidate = idx === 0 && outcome === 'fault' && victimPage !== null;
                return (
                  <div
                    key={item.page}
                    className={`p-2 rounded-lg border text-xs font-mono ${
                      isCandidate
                        ? 'bg-amber-950/40 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-bold text-white">Page {item.page}</span>
                      {isCandidate && (
                        <span className="text-[10px] uppercase font-bold text-amber-400">
                          LRU Victim
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Last used: Step {item.lastUsedTime} ({item.age} steps ago)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Optimal Next-Use Distances */}
        {algorithm === 'OPT' && decisionData.optDistances && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400 font-mono">
              Optimal scans the future reference string. It evicts the page with the longest future reuse distance (or never reused):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {decisionData.optDistances.map((item, idx) => {
                const isCandidate = idx === 0 && outcome === 'fault' && victimPage !== null;
                return (
                  <div
                    key={item.page}
                    className={`p-2 rounded-lg border text-xs font-mono ${
                      isCandidate
                        ? 'bg-amber-950/40 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-bold text-white">Page {item.page}</span>
                      {isCandidate && (
                        <span className="text-[10px] uppercase font-bold text-amber-400">
                          Optimal Victim
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Next used:{' '}
                      <strong className={item.distance === 'infinity' ? 'text-rose-400' : 'text-slate-200'}>
                        {item.distance === 'infinity' ? 'NEVER AGAIN' : `in +${item.distance} steps`}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clock Second-Chance State */}
        {algorithm === 'CLOCK' && decisionData.clockState && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400 font-mono">
              Clock circular inspection pointer is currently at{' '}
              <strong className="text-cyan-400">Frame {decisionData.clockState.hand}</strong>.
              Frames with R=1 are given a second chance (R cleared to 0) before an R=0 frame is evicted.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {decisionData.clockState.frameBits.map((fb) => (
                <div
                  key={fb.frameIndex}
                  className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs font-mono"
                >
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Frame {fb.frameIndex}</span>
                    <span>P{fb.page}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-slate-400">Ref Bit:</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded ${
                        fb.refBit === 1
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      R = {fb.refBit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
