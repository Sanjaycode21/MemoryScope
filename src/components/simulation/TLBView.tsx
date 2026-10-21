import React from 'react';
import { TLBState } from '../../types';
import { Zap, CheckCircle2, XCircle } from 'lucide-react';

interface TLBViewProps {
  tlbState: TLBState | undefined;
}

export const TLBView: React.FC<TLBViewProps> = ({ tlbState }) => {
  if (!tlbState || !tlbState.enabled) return null;

  return (
    <div className="bg-slate-900 border border-cyan-900/40 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Translation Lookaside Buffer (TLB Cache)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {tlbState.hit ? (
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> TLB HIT (~0.5 ns)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> TLB MISS (Page Table Walk)
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tlbState.entries.map((entry, idx) => {
          const isHitSlot = tlbState.hit && entry.vpn === tlbState.hitVPN;

          return (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-xs font-mono transition-all ${
                isHitSlot
                  ? 'bg-emerald-950/40 border-emerald-500/70 ring-1 ring-emerald-500'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>Slot {idx}</span>
                {isHitSlot && <span className="text-emerald-400 font-bold">MATCH</span>}
              </div>
              <div className="flex items-baseline justify-between text-slate-200">
                <span>VPN: <strong className="text-white">P{entry.vpn}</strong></span>
                <span className="text-slate-400">→</span>
                <span>PPN: <strong className="text-cyan-400">F{entry.ppn}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
