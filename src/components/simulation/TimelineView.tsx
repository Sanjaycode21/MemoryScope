import React from 'react';
import { SimulationStep } from '../../types';
import { CalendarRange } from 'lucide-react';

interface TimelineViewProps {
  steps: SimulationStep[];
  currentStepIndex: number;
  frameCount: number;
  onSelectStep: (index: number) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  steps,
  currentStepIndex,
  frameCount,
  onSelectStep,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Timeline Matrix (Execution Trace Over Time)
          </h3>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Click any column to jump to that step
        </div>
      </div>

      <div className="mt-3 overflow-x-auto pb-2">
        <table className="w-full text-center text-xs font-mono border-collapse">
          <thead>
            {/* Row 1: Step # */}
            <tr className="border-b border-slate-800">
              <th className="py-1.5 px-3 text-left text-slate-500 font-semibold sticky left-0 bg-slate-900 z-10">
                Step #
              </th>
              {steps.map((_, idx) => (
                <th
                  key={idx}
                  onClick={() => onSelectStep(idx)}
                  className={`py-1.5 px-2.5 cursor-pointer transition-colors ${
                    idx === currentStepIndex
                      ? 'bg-brand-600/30 text-brand-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {idx + 1}
                </th>
              ))}
            </tr>

            {/* Row 2: Requested Page */}
            <tr className="border-b border-slate-800 bg-slate-950/60">
              <th className="py-2 px-3 text-left text-slate-300 font-semibold sticky left-0 bg-slate-950 z-10">
                Request
              </th>
              {steps.map((st, idx) => (
                <th
                  key={idx}
                  onClick={() => onSelectStep(idx)}
                  className={`py-2 px-2.5 cursor-pointer font-bold ${
                    idx === currentStepIndex
                      ? 'bg-brand-600/40 text-white'
                      : 'text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  P{st.requestedPage}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            {/* Frame Rows: 0 to frameCount - 1 */}
            {Array.from({ length: frameCount }).map((_, fIdx) => (
              <tr key={fIdx} className="hover:bg-slate-800/20">
                <td className="py-1.5 px-3 text-left font-semibold text-slate-400 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                  Frame {fIdx}
                </td>
                {steps.map((st, sIdx) => {
                  const page = st.framesAfter[fIdx];
                  const wasAllocatedHere = st.allocatedFrame === fIdx;
                  const isCurrent = sIdx === currentStepIndex;

                  let cellStyle = 'text-slate-400';
                  if (wasAllocatedHere) {
                    if (st.outcome === 'hit') {
                      cellStyle = 'bg-emerald-950/40 text-emerald-300 font-bold';
                    } else if (st.victimPage !== null) {
                      cellStyle = 'bg-amber-950/40 text-amber-300 font-bold';
                    } else {
                      cellStyle = 'bg-rose-950/40 text-rose-300 font-bold';
                    }
                  }

                  return (
                    <td
                      key={sIdx}
                      onClick={() => onSelectStep(sIdx)}
                      className={`py-1.5 px-2.5 cursor-pointer transition-colors ${cellStyle} ${
                        isCurrent ? 'ring-1 ring-inset ring-brand-400' : ''
                      }`}
                    >
                      {page !== null ? `P${page}` : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Outcome Row */}
            <tr className="border-t-2 border-slate-700 bg-slate-950/80 font-bold">
              <td className="py-2 px-3 text-left text-slate-300 sticky left-0 bg-slate-950 z-10">
                Outcome
              </td>
              {steps.map((st, idx) => (
                <td
                  key={idx}
                  onClick={() => onSelectStep(idx)}
                  className={`py-2 px-2.5 cursor-pointer ${
                    st.outcome === 'hit'
                      ? 'text-emerald-400 bg-emerald-950/20'
                      : st.victimPage !== null
                      ? 'text-amber-400 bg-amber-950/20'
                      : 'text-rose-400 bg-rose-950/20'
                  } ${idx === currentStepIndex ? 'ring-2 ring-brand-400' : ''}`}
                >
                  {st.outcome === 'hit' ? 'HIT' : st.victimPage !== null ? 'REPL' : 'FAULT'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
