/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, Download, Edit2, Play, CheckCircle } from 'lucide-react';

interface CodeDisplayProps {
  code: string;
  language: string;
  onCodeChange?: (newCode: string) => void;
}

export default function CodeDisplay({ code, language, onCodeChange }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);

  React.useEffect(() => {
    setEditedCode(code);
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extMap: Record<string, string> = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      sql: 'sql',
      java: 'java',
      cpp: 'cpp',
      go: 'go',
      html: 'html',
      css: 'css',
      markdown: 'md'
    };
    const ext = extMap[language.toLowerCase()] || 'txt';
    const blob = new Blob([editedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code_assistant_solution.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const applyChanges = () => {
    if (onCodeChange) {
      onCodeChange(editedCode);
    }
    setIsEditing(false);
  };

  const lineCount = editedCode.split('\n').length;

  return (
    <div id="code-display-editor" className="flex flex-col h-full bg-[#0F172A] rounded-xl border border-slate-700/80 overflow-hidden font-mono text-sm shadow-2xl">
      {/* Editor Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1E293B] border-b border-slate-700/80">
        <div className="flex items-center space-x-2">
          {/* Mock circular window controls */}
          <span className="w-3 h-3 bg-rose-500/80 rounded-full"></span>
          <span className="w-3 h-3 bg-amber-500/80 rounded-full"></span>
          <span className="w-3 h-3 bg-emerald-500/80 rounded-full"></span>
          <span className="ml-3 text-xs font-semibold text-slate-300 capitalize tracking-wider">
            WORKSPACE ({language || 'plaintext'})
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-xs">
          {isEditing ? (
            <button
              onClick={applyChanges}
              className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded transition mr-1 cursor-pointer font-sans font-medium"
            >
              <CheckCircle size={13} />
              <span>Apply Changes</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded transition cursor-pointer font-sans font-medium"
            >
              <Edit2 size={13} />
              <span>Edit Code</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 bg-slate-800 hover:bg-slate-705 text-slate-300 hover:text-white rounded border border-slate-700 transition cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 bg-slate-800 hover:bg-slate-705 text-slate-300 hover:text-white rounded border border-slate-700 transition cursor-pointer"
            title="Download Asset File"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex flex-1 overflow-auto min-h-[350px]">
        {/* Line Numbers */}
        <div className="py-4 px-3 text-right bg-[#1E293B]/40 border-r border-slate-700/60 text-slate-500 select-none text-xs min-w-[3rem]">
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
            <div key={i + 1} className="h-5">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area or Code Box */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <textarea
              value={editedCode}
              onChange={(e) => setEditedCode(e.target.value)}
              className="w-full h-full p-4 bg-[#0F172A] text-slate-100 outline-none resize-none font-mono text-sm leading-5 tab-size-4 focus:ring-0"
              style={{ minHeight: '350px', tabSize: 4 }}
              spellCheck={false}
            />
          ) : (
            <pre className="p-4 overflow-x-auto text-indigo-200/90 leading-5 whitespace-pre select-text h-full font-mono">
              <code>{editedCode}</code>
            </pre>
          )}
        </div>
      </div>
      
      {/* Editor Footer / Info Bar */}
      <div className="px-4 py-1.5 bg-[#1E293B]/60 border-t border-slate-700/60 text-[11px] text-slate-400 font-sans flex items-center justify-between">
        <div>Lines: {lineCount} | Size: {Math.round(editedCode.length)} bytes</div>
        <div className="flex items-center space-x-1.5 text-indigo-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] tracking-wider uppercase font-semibold">IDE Workspace Connected</span>
        </div>
      </div>
    </div>
  );
}
