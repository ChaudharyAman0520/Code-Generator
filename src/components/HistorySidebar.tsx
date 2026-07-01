/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { History, Trash2, Code2, AlertTriangle, Cpu, FileText, Search, ShieldCheck, User, LogOut } from 'lucide-react';
import { HistoryItem, AssistantMode } from '../types';

interface HistorySidebarProps {
  items: HistoryItem[];
  selectedId: string | null;
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  onRemoveItem?: (id: string) => void;
  currentUser: string;
  onLogout: () => void;
}

export default function HistorySidebar({
  items,
  selectedId,
  onSelect,
  onClear,
  onRemoveItem,
  currentUser,
  onLogout
}: HistorySidebarProps) {
  
  const getModeIcon = (mode: AssistantMode) => {
    switch (mode) {
      case 'generate':
        return <Code2 className="text-blue-400" size={14} />;
      case 'explain':
        return <FileText className="text-amber-400" size={14} />;
      case 'debug':
        return <AlertTriangle className="text-red-400" size={14} />;
      case 'optimize':
        return <Cpu className="text-purple-400" size={14} />;
      case 'document':
        return <FileText className="text-teal-400" size={14} />;
      case 'concept':
        return <Search className="text-pink-400" size={14} />;
      case 'review':
        return <ShieldCheck className="text-emerald-400" size={14} />;
    }
  };

  const getModeLabel = (mode: AssistantMode) => {
    switch (mode) {
      case 'generate': return 'Generate';
      case 'explain': return 'Explain';
      case 'debug': return 'Debug';
      case 'optimize': return 'Optimize';
      case 'document': return 'Docs';
      case 'concept': return 'Concept';
      case 'review': return 'Review';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1E293B] border border-slate-700/80 rounded-xl overflow-hidden font-sans">
      <div className="flex items-center justify-between p-4 border-b border-slate-700/80">
        <div className="flex items-center space-x-2">
          <History className="text-slate-400" size={18} />
          <h2 className="font-semibold text-sm text-slate-200 tracking-wide">Workspace History</h2>
          <span className="bg-[#0F172A] text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium border border-slate-700/50">
            {items.length}
          </span>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-rose-400 font-medium transition flex items-center space-x-1 cursor-pointer"
            title="Clear All History"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Logged in user details & Sign Out */}
      <div id="user-profile-card" className="px-4 py-3 bg-[#0F172A]/40 border-b border-slate-700/60 flex flex-col space-y-2 font-sans">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <User size={12} className="text-indigo-400" />
            <span>Logged In As</span>
          </span>
          <button
            onClick={onLogout}
            className="text-[10px] text-rose-450 hover:text-rose-400 font-bold flex items-center space-x-1 cursor-pointer bg-transparent border-none outline-none"
            title="Sign out of current account"
          >
            <LogOut size={11} />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="flex items-center justify-between bg-[#0F172A] border border-slate-750 p-2.5 rounded-lg">
          <span className="text-xs font-mono text-slate-200 truncate max-w-[150px]" title={currentUser}>
            {currentUser}
          </span>
          <span className="text-[9px] bg-indigo-950/60 border border-indigo-800/30 text-indigo-300 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Secure
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[500px]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-705 flex items-center justify-center mb-3">
              <History size={16} className="text-slate-400" />
            </div>
            <p className="text-xs text-slate-400 font-medium font-sans">No workspace history</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[160px] leading-relaxed font-sans">
              Complete generate, debug, explain, or doc requests to populate your timeline!
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                className={`group relative flex flex-col p-3 rounded-lg border text-left transition duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-indigo-500/80 shadow-lg shadow-indigo-500/5'
                    : 'bg-[#0F172A]/80 border-slate-700/50 hover:bg-slate-800/40 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 min-w-0">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="flex-shrink-0">
                      {getModeIcon(item.mode)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {getModeLabel(item.mode)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono flex-shrink-0 bg-slate-900/60 px-1.5 py-0.5 rounded">
                    {item.language}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-200 line-clamp-1 mb-1.5 pr-4">
                  {item.prompt || 'Untitled Prompt'}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{item.timestamp}</span>
                  {onRemoveItem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-700 hover:text-rose-400 rounded transition cursor-pointer"
                      title="Delete log"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
