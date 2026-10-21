import React, { useState } from 'react';
import { PageTableEntry } from '../../types';
import { Table, Search } from 'lucide-react';

interface PageTableViewProps {
  pageTable: PageTableEntry[];
  currentlyRequestedPage: number;
}

export const PageTableView: React.FC<PageTableViewProps> = ({
  pageTable,
  currentlyRequestedPage,
}) => {
  const [filterValidOnly, setFilterValidOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = pageTable.filter((entry) => {
    if (filterValidOnly && !entry.valid) return false;
    if (searchTerm) {
      return entry.pageNumber.toString().includes(searchTerm);
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-slate-200">Process Page Table</h3>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter page #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 w-32 focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            onClick={() => setFilterValidOnly(!filterValidOnly)}
            className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
              filterValidOnly
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Valid Only
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="mt-3 overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950/80 text-slate-400 sticky top-0 border-b border-slate-800">
            <tr>
              <th className="py-2 px-3 font-semibold">VPN (Page #)</th>
              <th className="py-2 px-3 font-semibold">Valid / Present</th>
              <th className="py-2 px-3 font-semibold">PPN (Frame #)</th>
              <th className="py-2 px-3 font-semibold">Loaded Step</th>
              <th className="py-2 px-3 font-semibold">Last Used</th>
              <th className="py-2 px-3 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredEntries.map((entry) => {
              const isCurrent = entry.pageNumber === currentlyRequestedPage;

              return (
                <tr
                  key={entry.pageNumber}
                  className={`transition-colors ${
                    isCurrent
                      ? 'bg-brand-950/50 text-white font-bold ring-1 ring-inset ring-brand-500/50'
                      : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <td className="py-2 px-3 flex items-center gap-1.5">
                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                    <span>Page {entry.pageNumber}</span>
                  </td>
                  <td className="py-2 px-3">
                    {entry.valid ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        1 (Present)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-500">
                        0 (Disk)
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {entry.frameNumber !== null ? (
                      <span className="text-cyan-400 font-semibold">
                        Frame {entry.frameNumber}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    {entry.loadTime !== null ? `Step ${entry.loadTime}` : '—'}
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    {entry.lastUsedTime !== null ? `Step ${entry.lastUsedTime}` : '—'}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {entry.valid ? (
                      <span className="text-emerald-400 text-[11px]">In Memory</span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">On Backing Store</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
