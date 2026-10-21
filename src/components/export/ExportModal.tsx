import React, { useState } from 'react';
import { SimulationTrace } from '../../types';
import { X, Download, Copy, Check, FileText, Code2, Link } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: SimulationTrace;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, trace }) => {
  const [copiedType, setCopiedType] = useState<'json' | 'csv' | 'link' | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'json' | 'csv' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const getJSONString = () => {
    return JSON.stringify(trace, null, 2);
  };

  const getCSVString = () => {
    const headers = [
      'Step',
      'RequestedPage',
      'Outcome',
      'AllocatedFrame',
      'VictimPage',
      'FramesAfter',
      'CumulativeHits',
      'CumulativeFaults',
    ];
    const rows = trace.steps.map((st) => [
      st.index + 1,
      st.requestedPage,
      st.outcome,
      st.allocatedFrame,
      st.victimPage ?? 'None',
      `"${st.framesAfter.filter((f) => f !== null).join(',')}"`,
      st.cumulativeHits,
      st.cumulativeFaults,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  const getShareableURL = () => {
    const params = new URLSearchParams({
      algo: trace.config.algorithm,
      frames: trace.config.frameCount.toString(),
      seq: trace.config.referenceString.join(','),
    });
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Export & Share Scenario</h3>
            <p className="text-xs text-slate-400">
              Download complete trace data or share live configuration links.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* JSON Export */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code2 className="w-5 h-5 text-brand-400" />
              <div>
                <span className="font-bold text-sm text-white block">Full JSON Trace</span>
                <span className="text-xs text-slate-400">
                  Complete trace snapshots, decision tables, and rule explanations.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(getJSONString(), 'json')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Copy JSON"
              >
                {copiedType === 'json' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() =>
                  downloadFile(
                    getJSONString(),
                    `memoryscope_${trace.config.algorithm.toLowerCase()}_trace.json`,
                    'application/json'
                  )
                }
                className="py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* CSV Export */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="font-bold text-sm text-white block">CSV Spreadsheet</span>
                <span className="text-xs text-slate-400">
                  Tabular step-by-step log compatible with Excel, Google Sheets, or R.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(getCSVString(), 'csv')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Copy CSV"
              >
                {copiedType === 'csv' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() =>
                  downloadFile(
                    getCSVString(),
                    `memoryscope_${trace.config.algorithm.toLowerCase()}_table.csv`,
                    'text/csv'
                  )
                }
                className="py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Shareable Link */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link className="w-5 h-5 text-amber-400" />
              <div>
                <span className="font-bold text-sm text-white block">Shareable Direct URL</span>
                <span className="text-xs text-slate-400 font-mono truncate max-w-xs block">
                  {getShareableURL()}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleCopy(getShareableURL(), 'link')}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              {copiedType === 'link' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
