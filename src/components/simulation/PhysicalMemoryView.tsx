import React from 'react';
import { SimulationStep, AlgorithmType } from '../../types';
import { HardDrive, CheckCircle2, AlertTriangle, ArrowDownRight } from 'lucide-react';

interface PhysicalMemoryViewProps {
  currentStep: SimulationStep | undefined;
  frameCount: number;
  algorithm: AlgorithmType;
}

export const PhysicalMemoryView: React.FC<PhysicalMemoryViewProps> = ({
  currentStep,
  frameCount,
  algorithm,
}) => {
  if (!currentStep) return null;

  const { framesAfter, outcome, allocatedFrame, victimPage, pageTableSnapshot } =
    currentStep;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-slate-200">Physical Memory (RAM Frames)</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Hit
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Fault
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Evicted
          </span>
        </div>
      </div>

      {/* Frame Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
        {Array.from({ length: frameCount }).map((_, frameIdx) => {
          const page = framesAfter[frameIdx];
          const isTargetFrame = allocatedFrame === frameIdx;
          const isHit = isTargetFrame && outcome === 'hit';
          const isFaultFill = isTargetFrame && outcome === 'fault';
          const isEvictionFrame = isFaultFill && victimPage !== null;

          // Find page table entry for resident page
          const ptEntry = page !== null ? pageTableSnapshot.find((e) => e.pageNumber === page) : null;

          return (
            <div
              key={frameIdx}
              className={`relative rounded-xl border p-3.5 transition-all duration-300 ${
                isHit
                  ? 'bg-emerald-950/40 border-emerald-500/70 ring-2 ring-emerald-500/30'
                  : isEvictionFrame
                  ? 'bg-amber-950/30 border-amber-500/70 ring-2 ring-amber-500/30'
                  : isFaultFill
                  ? 'bg-rose-950/30 border-rose-500/70 ring-2 ring-rose-500/30'
                  : page !== null
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-slate-950/50 border-slate-800/60 border-dashed'
              }`}
            >
              {/* Header: Frame # and state badge */}
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-mono text-slate-400 font-semibold">Frame {frameIdx}</span>
                {isHit && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> HIT
                  </span>
                )}
                {isEvictionFrame && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> REPLACED
                  </span>
                )}
                {isFaultFill && !isEvictionFrame && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-0.5">
                    <ArrowDownRight className="w-3 h-3" /> LOADED
                  </span>
                )}
              </div>

              {/* Main Content: Resident Page */}
              <div className="py-2 text-center">
                {page !== null ? (
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">
                      Resident Page
                    </span>
                    <span
                      className={`text-2xl font-mono font-extrabold ${
                        isTargetFrame ? 'text-white scale-110 inline-block transition-transform' : 'text-slate-200'
                      }`}
                    >
                      Page {page}
                    </span>
                  </div>
                ) : (
                  <div className="py-2">
                    <span className="text-xs font-mono text-slate-600 italic">EMPTY FRAME</span>
                  </div>
                )}
              </div>

              {/* Metadata tags */}
              {page !== null && ptEntry && (
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-400">
                  <div title="Step when this page was brought into RAM">
                    <span className="text-slate-600 block text-[9px]">LOADED</span>
                    <span>Step {ptEntry.loadTime}</span>
                  </div>
                  <div title="Step of most recent hit/access">
                    <span className="text-slate-600 block text-[9px]">LAST USED</span>
                    <span>Step {ptEntry.lastUsedTime}</span>
                  </div>
                  {algorithm === 'CLOCK' && (
                    <div className="col-span-2 pt-1 flex items-center justify-between text-cyan-400">
                      <span>Ref Bit (R):</span>
                      <span className="font-bold px-1 rounded bg-cyan-950 border border-cyan-800">
                        {ptEntry.referenceBit}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Eviction callout if this frame had a victim */}
              {isEvictionFrame && (
                <div className="mt-2 text-[10px] font-mono text-amber-300/90 bg-amber-950/60 p-1 rounded border border-amber-800/50">
                  Evicted: <span className="font-bold">Page {victimPage}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
