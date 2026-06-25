/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, Award, CheckCircle, Code, ChevronRight, Eye, EyeOff, Clipboard, RefreshCw } from 'lucide-react';
import { ConceptExercise } from '../types';

interface ConceptViewerProps {
  title: string;
  explanation: string;
  examples: string[];
  exercises: ConceptExercise[];
}

export default function ConceptViewer({
  title,
  explanation,
  examples,
  exercises
}: ConceptViewerProps) {
  const [activeExerciseIdx, setActiveExerciseIdx] = useState<number>(0);
  const [revealedSolutions, setRevealedSolutions] = useState<Record<number, boolean>>({});

  const toggleSolution = (idx: number) => {
    setRevealedSolutions((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className="flex flex-col space-y-6 font-sans">
      
      {/* Concept Header & Tutorial Block */}
      <div className="p-5 bg-[#1E293B] border border-slate-700/80 rounded-xl">
        <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3 flex items-center space-x-1.5">
          <BookOpen size={14} />
          <span>Core Concept Summary</span>
        </h3>
        
        <h2 className="text-lg font-bold text-slate-100 tracking-tight mb-2.5">
          {title || "Computer Science Concept"}
        </h2>
        
        <div className="text-sm text-slate-300 leading-relaxed space-y-3.5 whitespace-pre-wrap font-sans">
          {explanation}
        </div>
      </div>

      {/* Code Examples Section */}
      {examples && examples.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
            Standard Code Examples
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {examples.map((ex, i) => (
              <div key={i} className="bg-[#0F172A] border border-slate-700/80 rounded-xl overflow-hidden shadow-lg">
                <div className="px-4 py-2 bg-[#1E293B]/60 border-b border-slate-700/70 text-[11px] font-mono font-semibold text-slate-400">
                  Example #{i + 1}
                </div>
                <pre className="p-4 font-mono text-[11px] text-indigo-200/90 overflow-x-auto leading-relaxed max-h-56 bg-[#0F172A]">
                  <code>{ex}</code>
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Exercises Portion */}
      {exercises && exercises.length > 0 && (
        <div className="p-5 bg-[#1E293B] border border-slate-700/80 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Award size={14} />
              <span>Interactive Coding Challenges / Exercises</span>
            </h3>
            
            {/* Exercise Tabs Selector */}
            <div className="flex space-x-1">
              {exercises.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveExerciseIdx(idx)}
                  className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition ${
                    activeExerciseIdx === idx
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Exercise #{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Active Challenger */}
          {exercises[activeExerciseIdx] && (
            <div className="space-y-4 transition-all duration-300">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-1.5 flex items-center">
                  <ChevronRight size={15} className="text-indigo-400 mr-1" />
                  {exercises[activeExerciseIdx].title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-[#0F172A] border border-slate-700/50 p-3 rounded-lg">
                  {exercises[activeExerciseIdx].question}
                </p>
              </div>

              {/* Starter and Solution Codes Panel */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                
                {/* Starter Code Column */}
                <div className="border border-slate-700/60 rounded-lg overflow-hidden bg-[#0F172A]">
                  <div className="px-3.5 py-1.5 bg-[#1E293B]/70 border-b border-slate-700/60 flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase">
                    <span className="flex items-center font-sans font-bold text-indigo-300">
                      <Code size={11} className="mr-1.5" /> Template Starter
                    </span>
                  </div>
                  <pre className="p-3.5 font-mono text-xs text-indigo-200/90 overflow-x-auto bg-[#0F172A] leading-relaxed max-h-60 select-text">
                    <code>{exercises[activeExerciseIdx].starterCode}</code>
                  </pre>
                </div>

                {/* Solution Column */}
                <div className="border border-slate-700/60 rounded-lg overflow-hidden bg-[#0F172A]">
                  <div className="px-3.5 py-1.5 bg-[#1E293B]/70 border-b border-slate-700/60 flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase">
                    <span className="flex items-center font-sans font-bold text-emerald-400">
                      <CheckCircle size={11} className="mr-1.5" /> Solution Code
                    </span>
                    <button
                      onClick={() => toggleSolution(activeExerciseIdx)}
                      className="text-[10px] text-slate-400 hover:text-white transition duration-150 flex items-center space-x-1 font-sans cursor-pointer font-semibold"
                    >
                      {revealedSolutions[activeExerciseIdx] ? (
                        <>
                          <EyeOff size={11} /> <span>Hide Solution</span>
                        </>
                      ) : (
                        <>
                          <Eye size={11} /> <span>Reveal Solution</span>
                        </>
                      )}
                    </button>
                  </div>

                  {revealedSolutions[activeExerciseIdx] ? (
                    <pre className="p-3.5 font-mono text-xs text-emerald-350 overflow-x-auto bg-[#0F172A] leading-relaxed max-h-60 select-text border-t border-slate-700/60">
                      <code>{exercises[activeExerciseIdx].solution}</code>
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 bg-[#0F172A]/80 text-center select-none max-h-60 h-44">
                      <Eye size={20} className="text-slate-600 mb-2" />
                      <p className="text-xs font-semibold text-slate-500">Solution Code Obscured</p>
                      <button
                        onClick={() => toggleSolution(activeExerciseIdx)}
                        className="mt-3 text-xs bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400 px-3.5 py-1.5 rounded font-bold cursor-pointer transition"
                      >
                        Click to Reveal Solution
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
