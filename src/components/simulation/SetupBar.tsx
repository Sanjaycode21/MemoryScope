import React, { useState } from 'react';
import { AlgorithmType, SimulationConfig } from '../../types';
import { Dices, RefreshCw, AlertCircle } from 'lucide-react';

interface SetupBarProps {
  config: SimulationConfig;
  onChangeConfig: (newConfig: Partial<SimulationConfig>) => void;
  onReset: () => void;
}

export const SetupBar: React.FC<SetupBarProps> = ({ config, onChangeConfig, onReset }) => {
  const [inputString, setInputString] = useState(config.referenceString.join(', '));
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleStringChange = (val: string) => {
    setInputString(val);
    const cleaned = val.trim();
    if (!cleaned) {
      setValidationError('Reference string cannot be empty.');
      return;
    }

    const tokens = cleaned.split(/[\s,]+/).filter(Boolean);
    const parsed: number[] = [];

    for (const t of tokens) {
      const num = Number(t);
      if (!Number.isInteger(num) || num < 0 || num > 63) {
        setValidationError(`Invalid page "${t}". Must be an integer between 0 and 63.`);
        return;
      }
      parsed.push(num);
    }

    if (parsed.length === 0) {
      setValidationError('Please enter at least one page number.');
      return;
    }

    if (parsed.length > 500) {
      setValidationError('Max 500 references supported in interactive editor.');
      return;
    }

    setValidationError(null);
    onChangeConfig({ referenceString: parsed });
  };

  const handleRandomize = () => {
    const length = 15;
    const maxPage = Math.min(7, config.frameCount + 3);
    const randomSeq = Array.from({ length }, () => Math.floor(Math.random() * maxPage));
    const formatted = randomSeq.join(', ');
    setInputString(formatted);
    setValidationError(null);
    onChangeConfig({ referenceString: randomSeq });
    onReset();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        {/* Reference String Input */}
        <div className="lg:col-span-6 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Reference String (Page Accesses)</span>
              <span className="text-slate-500 font-mono text-[10px]">
                ({config.referenceString.length} requests)
              </span>
            </label>
            <button
              onClick={handleRandomize}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Randomize</span>
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={inputString}
              onChange={(e) => handleStringChange(e.target.value)}
              placeholder="e.g. 7, 0, 1, 2, 0, 3, 0, 4, 2, 3"
              className={`w-full bg-slate-950 border ${
                validationError ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-700'
              } rounded-lg px-3 py-2 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500`}
            />
          </div>
          {validationError && (
            <div className="flex items-center gap-1 text-xs text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Algorithm Picker */}
        <div className="lg:col-span-3 space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Replacement Algorithm
          </label>
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            {(['FIFO', 'LRU', 'OPT', 'CLOCK'] as AlgorithmType[]).map((algo) => (
              <button
                key={algo}
                onClick={() => {
                  onChangeConfig({ algorithm: algo });
                  onReset();
                }}
                className={`py-1 text-xs font-mono font-medium rounded transition-all ${
                  config.algorithm === algo
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title={
                  algo === 'FIFO'
                    ? 'First-In, First-Out'
                    : algo === 'LRU'
                    ? 'Least Recently Used'
                    : algo === 'OPT'
                    ? "Bélády's Optimal (MIN)"
                    : 'Clock / Second-Chance'
                }
              >
                {algo}
              </button>
            ))}
          </div>
        </div>

        {/* Frame Count Slider */}
        <div className="lg:col-span-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              RAM Frames
            </label>
            <span className="text-xs font-mono font-bold text-brand-400 px-1.5 py-0.5 rounded bg-brand-500/10 border border-brand-500/30">
              {config.frameCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="8"
              value={config.frameCount}
              onChange={(e) => {
                onChangeConfig({ frameCount: Number(e.target.value) });
                onReset();
              }}
              className="w-full accent-brand-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
            />
          </div>
        </div>

        {/* Page Size & Reset */}
        <div className="lg:col-span-1 flex items-center gap-2">
          <button
            onClick={onReset}
            title="Reset Simulation"
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
