import React, { useState } from 'react';
import { PageTableEntry } from '../../types';
import { translateAddress } from '../../engine/addressTranslator';
import { Binary, ArrowRight, CheckCircle2, AlertOctagon } from 'lucide-react';

interface AddressTranslationViewProps {
  pageSize: number;
  pageTable: PageTableEntry[];
  currentVirtualAddress: number;
}

export const AddressTranslationView: React.FC<AddressTranslationViewProps> = ({
  pageSize,
  pageTable,
  currentVirtualAddress,
}) => {
  const [customVA, setCustomVA] = useState<number | null>(null);

  const activeVA = customVA !== null ? customVA : currentVirtualAddress;
  const translation = translateAddress(activeVA, pageSize, pageTable);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Address Translation Pipeline (MMU)
          </h3>
        </div>

        {/* Custom VA Input */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Test VA:</span>
          <input
            type="number"
            min="0"
            max="65535"
            value={activeVA}
            onChange={(e) => setCustomVA(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 w-24 text-center focus:outline-none focus:border-brand-500"
          />
          {customVA !== null && (
            <button
              onClick={() => setCustomVA(null)}
              className="text-[10px] text-brand-400 hover:underline"
            >
              Reset to Current
            </button>
          )}
        </div>
      </div>

      {/* Interactive Visual Bit Decomposition */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Virtual Address Card */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] uppercase font-mono text-slate-500 mb-1">
            1. Virtual Address (VA)
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-mono font-bold text-brand-300">
              {translation.virtualAddressHex}
            </span>
            <span className="text-xs font-mono text-slate-400">
              ({translation.virtualAddress} decimal)
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1 text-[11px] font-mono">
            <div className="bg-blue-950/40 p-1.5 rounded border border-blue-800/40">
              <span className="text-blue-400 block text-[9px]">VPN (Page #)</span>
              <span className="font-bold text-white">Page {translation.vpn}</span>
            </div>
            <div className="bg-purple-950/40 p-1.5 rounded border border-purple-800/40">
              <span className="text-purple-400 block text-[9px]">Offset (d)</span>
              <span className="font-bold text-white">{translation.offset} B</span>
            </div>
          </div>
        </div>

        {/* Translation Arrow */}
        <div className="flex flex-col items-center justify-center text-center p-2">
          <div className="flex items-center gap-1 text-xs font-mono text-slate-400 mb-1">
            <span>Page Table Lookup</span>
          </div>
          <ArrowRight className="w-5 h-5 text-brand-400 animate-pulse my-1 hidden md:block" />
          <div className="text-[11px] font-mono">
            {translation.isHit ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Hit in Frame {translation.frameNumber}
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1 font-semibold">
                <AlertOctagon className="w-3.5 h-3.5" /> Page Fault Trap!
              </span>
            )}
          </div>
        </div>

        {/* Physical Address Card */}
        <div
          className={`p-3 rounded-lg border ${
            translation.isHit
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : 'bg-rose-950/20 border-rose-500/40'
          }`}
        >
          <div className="text-[10px] uppercase font-mono text-slate-500 mb-1">
            2. Physical Address (PA)
          </div>
          {translation.isHit ? (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-mono font-bold text-emerald-300">
                  {translation.physicalAddressHex}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ({translation.physicalAddress} decimal)
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1 text-[11px] font-mono">
                <div className="bg-cyan-950/40 p-1.5 rounded border border-cyan-800/40">
                  <span className="text-cyan-400 block text-[9px]">PPN (Frame #)</span>
                  <span className="font-bold text-white">Frame {translation.frameNumber}</span>
                </div>
                <div className="bg-purple-950/40 p-1.5 rounded border border-purple-800/40">
                  <span className="text-purple-400 block text-[9px]">Offset (d)</span>
                  <span className="font-bold text-white">{translation.offset} B</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2 text-rose-300 text-xs font-mono">
              <span className="font-bold block">Page Fault:</span>
              <span className="text-[11px] text-rose-400/90">
                Page {translation.vpn} is not resident in RAM. CPU interrupted; invoking OS kernel
                page-in handler.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Step Explanation Pipeline */}
      <div className="mt-3 bg-slate-950 rounded-lg p-3 border border-slate-800 text-xs font-mono space-y-1.5">
        {translation.steps.map((st) => (
          <div key={st.step} className="flex items-start gap-2 text-slate-300">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-brand-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
              {st.step}
            </span>
            <div>
              <span className="font-semibold text-slate-200">{st.title}: </span>
              <span className="text-slate-400">{st.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
