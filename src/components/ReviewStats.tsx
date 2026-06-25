/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Sparkles, Smile, XCircle, CheckCircle2, ChevronRight, BarChart3, HelpCircle } from 'lucide-react';

interface Nomenclature {
  valid: string[];
  invalid: string[];
  suggestions: string[];
}

interface ReviewStatsProps {
  score: number;
  smells: string[];
  recommendations: string[];
  nomenclature?: Nomenclature;
  speedup?: string;
  changes?: string[];
  complexityBefore?: string;
  complexityAfter?: string;
}

export default function ReviewStats({
  score,
  smells,
  recommendations,
  nomenclature,
  speedup,
  changes,
  complexityBefore,
  complexityAfter
}: ReviewStatsProps) {
  
  // Calculate score circle progress properties
  const circleRadius = 40;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference;

  const getScoreColor = (val: number) => {
    if (val >= 90) return 'text-emerald-500';
    if (val >= 75) return 'text-blue-500';
    if (val >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreStroke = (val: number) => {
    if (val >= 95) return 'stroke-emerald-500';
    if (val >= 75) return 'stroke-blue-500';
    if (val >= 50) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
      
      {/* Code Health & Complexity score column */}
      <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-[#1E293B] border border-slate-700/80 rounded-xl text-center">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4 flex items-center space-x-1.5">
          <BarChart3 size={14} className="text-indigo-400" />
          <span>Code Quality Score</span>
        </h3>
        
        {/* Radial Progress Gauge */}
        <div className="relative w-28 h-28 flex items-center justify-center mb-4 select-none">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Ring */}
            <circle
              cx="56"
              cy="56"
              r={circleRadius}
              className="fill-none stroke-slate-700/40"
              strokeWidth="10"
            />
            {/* Colored Progress Ring */}
            <circle
              cx="56"
              cy="56"
              r={circleRadius}
              className={`fill-none transition-all duration-1000 ease-out ${getScoreStroke(score)}`}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center leading-none">
            <span className={`text-3xl font-extrabold tracking-tight ${getScoreColor(score)}`}>
              {score}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-405 tracking-wider mt-1">
              Rating
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-200 font-medium">
          {score >= 90
            ? 'Production Ready'
            : score >= 75
            ? 'Minor Changes Suggested'
            : score >= 50
            ? 'Refactoring Highly Recommended'
            : 'Immediate Debugging Required'}
        </p>

        {/* Complexity Metadata (if provided) */}
        {(complexityBefore || complexityAfter) && (
          <div className="w-full mt-5 pt-4 border-t border-slate-700/60 flex justify-around text-left">
            {complexityBefore && (
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Standard</span>
                <span className="text-xs font-mono font-semibold text-slate-300">{complexityBefore}</span>
              </div>
            )}
            {complexityAfter && (
              <div>
                <span className="text-[10px] text-indigo-400 block uppercase font-bold text-right">Optimized</span>
                <span className="text-xs font-mono font-semibold text-indigo-300 text-right block">{complexityAfter}</span>
              </div>
            )}
          </div>
        )}

        {speedup && (
          <div className="w-full mt-4 bg-indigo-505/10 border border-indigo-500/20 py-2 px-3 rounded-lg text-xs font-semibold text-indigo-300">
            🚀 {speedup}
          </div>
        )}
      </div>

      {/* Code Smells & Action Recommendations Columns */}
      <div className="lg:col-span-8 flex flex-col space-y-5">
        
        {/* Identified Code Smells List */}
        {smells && smells.length > 0 && (
          <div className="p-5 bg-[#1E293B] border border-slate-700/80 rounded-xl">
            <h3 className="text-xs font-bold text-rose-455 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <AlertTriangle size={14} className="text-rose-400" />
              <span>Identified Code Smells & Issues ({smells.length})</span>
            </h3>
            <ul className="space-y-2">
              {smells.map((smell, i) => (
                <li key={i} className="flex items-start text-xs text-slate-300 bg-rose-950/10 border border-rose-900/30 px-3 py-2 rounded-lg">
                  <XCircle size={13} className="text-rose-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">{smell}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optimizations & Changes List (if we are in optimize result mode) */}
        {changes && changes.length > 0 && (
          <div className="p-5 bg-[#1E293B] border border-slate-700/80 rounded-xl">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <Sparkles size={14} />
              <span>Optimization Changes ({changes.length})</span>
            </h3>
            <ul className="space-y-2">
              {changes.map((change, i) => (
                <li key={i} className="flex items-start text-xs text-slate-300 bg-indigo-950/20 border border-indigo-900/20 px-3 py-2 rounded-lg">
                  <ChevronRight size={13} className="text-indigo-400 mr-2 mt-1 flex-shrink-0" />
                  <span className="leading-relaxed">{change}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Recommendations to Apply */}
        {recommendations && recommendations.length > 0 && (
          <div className="p-5 bg-[#1E293B] border border-slate-700/80 rounded-xl flex-1">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <Sparkles size={14} />
              <span>Refactoring Recommendations</span>
            </h3>
            <ul className="space-y-2.5">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start text-xs text-slate-300 bg-[#0F172A] py-2.5 px-3.5 rounded-lg border border-slate-700/60">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-300 text-[10px] font-extrabold flex items-center justify-center mr-2.5 flex-shrink-0 border border-slate-700/60">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed font-semibold">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Nomenclature / Naming convention audit */}
      {nomenclature && (nomenclature.valid.length > 0 || nomenclature.invalid.length > 0) && (
        <div className="lg:col-span-12 p-5 bg-[#1E293B] border border-slate-700/80 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-5 mt-1">
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Smile size={14} className="text-amber-400" />
              <span>Nomenclature & Identifier Review</span>
            </h3>
            <p className="text-[10.5px] text-slate-400 mt-1 leading-normal font-sans">
              Auditing the naming standards of variables, functional structures, classes, and loops to align with language-specific guides (e.g. PEP 8, TS Style Guide).
            </p>
          </div>

          {/* Valid Nomenclature Name Matches */}
          <div className="p-3 bg-[#0F172A] rounded-lg border border-slate-700/50">
            <h4 className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center">
              <CheckCircle2 size={12} className="mr-1.5" />
              <span>Conformant Identifiers ({nomenclature.valid.length})</span>
            </h4>
            {nomenclature.valid.length === 0 ? (
              <span className="text-xs text-slate-500 block italic font-sans">None logged.</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {nomenclature.valid.map((item, idx) => (
                  <span key={idx} className="bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 font-mono text-[11px] px-2 py-0.5 rounded-md">
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Non-Conformant Nomenclature Names & Suggestions */}
          <div className="p-3 bg-[#0F172A] rounded-lg border border-slate-700/50">
            <h4 className="text-[11px] font-extrabold text-rose-400 uppercase tracking-wider mb-2.5 flex items-center">
              <XCircle size={12} className="mr-1.5" />
              <span>Off-Pattern Identifiers ({nomenclature.invalid.length})</span>
            </h4>
            {nomenclature.invalid.length === 0 ? (
              <span className="text-xs text-emerald-450 block italic font-sans">Excellent, 100% conformant naming pattern!</span>
            ) : (
              <div className="space-y-2">
                {nomenclature.invalid.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between font-mono text-[11px] bg-rose-955/10 border border-rose-900/30 rounded-md p-1.5 px-2.5">
                    <span className="text-rose-400 line-through">{item}</span>
                    <span className="text-slate-550 mx-2 select-none">→</span>
                    <span className="text-indigo-400 font-semibold bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/45">
                      {nomenclature.suggestions[idx] || 'Rename item'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
