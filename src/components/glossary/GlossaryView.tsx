import React, { useState } from 'react';
import { GLOSSARY_TERMS } from '../../data/glossary';
import { BookOpen, Search, BookmarkCheck } from 'lucide-react';

export const GlossaryView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = [
    'All',
    'Core Concepts',
    'Hardware & Translation',
    'Algorithms & Phenomena',
    'Performance',
  ];

  const filteredTerms = GLOSSARY_TERMS.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.shortDef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.detailedExplanation.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/10 rounded-xl border border-brand-500/30">
              <BookOpen className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Operating Systems Virtual Memory Encyclopedia
              </h2>
              <p className="text-xs text-slate-400">
                Core terminology, theoretical foundations, and system engineering rules.
              </p>
            </div>
          </div>

          {/* Search Field */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Terms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTerms.map((term) => (
          <div
            key={term.term}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="font-bold text-base text-white">{term.term}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                  {term.category}
                </span>
              </div>
              <p className="text-xs font-semibold text-brand-300 mb-2">{term.shortDef}</p>
              <p className="text-xs text-slate-300 leading-relaxed">{term.detailedExplanation}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-start gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/50">
              <BookmarkCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-400">Core Principle: </span>
                <span className="text-slate-300">{term.keyRule}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
