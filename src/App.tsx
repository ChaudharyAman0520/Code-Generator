/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  FileText, 
  AlertTriangle, 
  Cpu, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Terminal, 
  History, 
  BookOpen, 
  HelpCircle, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Download, 
  ArrowRight,
  Info,
  LogOut
} from 'lucide-react';

import { AssistantMode, HistoryItem, ActionResponse, ChatMessage } from './types';
import CodeDisplay from './components/CodeDisplay';
import HistorySidebar from './components/HistorySidebar';
import ReviewStats from './components/ReviewStats';
import ConceptViewer from './components/ConceptViewer';
import AuthGate from './components/AuthGate';

// Preset lists to satisfy user requirements instantly
const PRESET_IDE_EXAMPLES = [
  {
    id: 'factorials',
    title: 'Python Recursive Factorial',
    prompt: 'Write a Python function to find the factorial of a number.',
    language: 'Python',
    mode: 'generate' as AssistantMode,
    code: ''
  },
  {
    id: 'sql-highest',
    title: 'SQL 2nd Highest Salary',
    prompt: 'Write a SQL query to find the second highest salary.',
    language: 'SQL',
    mode: 'generate' as AssistantMode,
    code: 'SELECT name, salary FROM Employee;'
  },
  {
    id: 'java-debug',
    title: 'Debug Broken Java Array',
    prompt: 'Please check this array accessing error. Identify error, suggested correction, explanation & root causes.',
    language: 'Java',
    mode: 'debug' as AssistantMode,
    code: `public class Program {
    public static void main(String[] args) {
        int[] num = {1, 2, 3};
        System.out.println(num[3]);
    }
}`
  },
  {
    id: 'prime-optimize',
    title: 'Optimize Prime Search (JS)',
    prompt: 'Optimize this slow O(N) checking system into a fast standard square root O(sqrt(N)) algorithm.',
    language: 'JavaScript',
    mode: 'optimize' as AssistantMode,
    code: `function isPrime(n) {
  if (n <= 1) return false;
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}`
  },
  {
    id: 'recursion-concept',
    title: 'Concept: Recursion Theory',
    prompt: 'Explain Recursion vs Iteration. Detail background, memory frames, examples, and interactive exercises to master recursion.',
    language: 'TypeScript',
    mode: 'concept' as AssistantMode,
    code: ''
  }
];

// Simple, React 19-safe styled markdown formatter helper
function RenderMarkdown({ text }: { text: string }) {
  if (!text) return null;
  
  const lines = text.split('\n');
  return (
    <div className="space-y-3 text-neutral-300 leading-relaxed font-sans text-xs sm:text-sm">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h4 key={idx} className="text-sm font-bold text-teal-300 pt-3 flex items-center border-b border-neutral-800 pb-1">{line.replace('### ', '')}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={idx} className="text-base font-extrabold text-teal-400 pt-4 pb-1.5 flex items-center">{line.replace('## ', '')}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={idx} className="text-lg font-black text-white pt-5 pb-2 border-b border-neutral-800">{line.replace('# ', '')}</h2>;
        }
        
        // Bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          const itemText = line.trim().replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start ml-4 space-x-2">
              <span className="text-teal-400 select-none mt-1 text-[10px]">•</span>
              <span className="flex-1">{itemText}</span>
            </div>
          );
        }
        
        // Numbered lists
        if (/^\d+\.\s+/.test(line.trim())) {
          return (
            <div key={idx} className="flex items-start ml-4 space-x-2">
              <span className="text-yellow-400 font-bold select-none text-[11px] font-mono">{line.trim().match(/^\d+\./)?.[0]}</span>
              <span className="flex-1">{line.trim().replace(/^\d+\.\s+/, '')}</span>
            </div>
          );
        }

        // Table helper detection
        if (line.startsWith('|')) {
          const cells = line.split('|').map(c => c.trim()).filter(c => c);
          if (line.includes('---')) return null; // delimiter
          return (
            <div key={idx} className="grid grid-cols-4 gap-2 bg-neutral-950 p-2 text-xs border-b border-neutral-900 font-mono">
              {cells.map((cell, cidx) => (
                <span key={cidx} className={cidx === 0 ? "font-bold text-teal-450" : "text-neutral-300"}>{cell}</span>
              ))}
            </div>
          );
        }

        // Blank lines
        if (line.trim() === '') {
          return <div key={idx} className="h-2"></div>;
        }

        // Default paragraph
        return <p key={idx} className="text-neutral-300 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

export default function App() {
  // Primary state management
  const [prompt, setPrompt] = useState('');
  const [codeContext, setCodeContext] = useState('');
  const [language, setLanguage] = useState('Python');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<AssistantMode>('generate');
  
  // History list
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Status & loaders
  const [isLoading, setIsLoading] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  // Interactive Live Chat Follow-up Thread State
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedHistoryId) return;
    
    // Find matching HistoryItem to retrieve thread
    const itemIndex = history.findIndex(item => item.id === selectedHistoryId);
    if (itemIndex === -1) return;
    
    const activeItem = history[itemIndex];
    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Optimistically update list
    const updatedMessages = [...(activeItem.chatHistory || []), userMessage];
    const updatedItem = {
      ...activeItem,
      chatHistory: updatedMessages
    };
    
    const updatedHistoryList = [...history];
    updatedHistoryList[itemIndex] = updatedItem;
    setHistory(updatedHistoryList);

    // Sync optimistic user message to server
    try {
      await fetch(`/api/history/${activeItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ chatHistory: updatedMessages })
      });
    } catch (err) {
      console.error('Failed to sync chat history to server:', err);
    }
    
    const originalInput = chatInput;
    setChatInput('');
    setIsSendingChat(true);
    setErrorLog(null);
    
    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ sender: m.sender, text: m.text })),
          codeContext: codeContext,
          language: language
        })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status code: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: `msg_assistant_${Date.now()}`,
        sender: 'assistant',
        text: responseData.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        code: responseData.code
      };
      
      const finalItem = {
        ...updatedItem,
        chatHistory: [...updatedMessages, assistantMessage]
      };
      
      const finalHistoryList = [...history];
      finalHistoryList[itemIndex] = finalItem;
      setHistory(finalHistoryList);

      // Sync assistant reply to server
      try {
        await fetch(`/api/history/${activeItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ chatHistory: [...updatedMessages, assistantMessage] })
        });
      } catch (err) {
        console.error('Failed to sync assistant reply to server:', err);
      }
      
      // If code was updated in the response, let's load it into the active codeContext too!
      if (responseData.code) {
        setCodeContext(responseData.code);
      }
      
    } catch (err: any) {
      console.error(err);
      setErrorLog(err.message || 'Error occurred while sending follow-up chat message.');
      // Restore input text for convenience
      setChatInput(originalInput);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Active workspace panels tabs
  // 'editor' displays actual code + explanation summary
  // 'explain' loads lineByLine detailed annotations
  // 'review' renders scores, nomenclature metrics and optimize results
  // 'concept' displays CS concept summaries + interactive exercises
  // 'readme' displays developer documentation
  const [activeTab, setActiveTab] = useState<'editor' | 'explain' | 'review' | 'concept' | 'readme'>('editor');

  // Active responses
  const [currentResponse, setCurrentResponse] = useState<ActionResponse | null>(null);

  // --- SECURE AUTHENTICATION STATE ---
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nexus_ai_auth_token');
    } catch (e) {
      return null;
    }
  });

  const [loggedInUser, setLoggedInUser] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nexus_ai_auth_username');
    } catch (e) {
      return null;
    }
  });

  // Fetch histories from server when auth token is available
  useEffect(() => {
    if (authToken) {
      const fetchHistory = async () => {
        try {
          const response = await fetch('/api/history', {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setHistory(data);
          } else if (response.status === 401) {
            handleLogout();
          }
        } catch (err) {
          console.error('Failed to fetch history:', err);
        }
      };
      fetchHistory();
    } else {
      setHistory([]);
      setSelectedHistoryId(null);
      setCurrentResponse(null);
    }
  }, [authToken]);

  const handleLoginSuccess = (token: string, username: string) => {
    setAuthToken(token);
    setLoggedInUser(username);
    try {
      localStorage.setItem('nexus_ai_auth_token', token);
      localStorage.setItem('nexus_ai_auth_username', username);
    } catch (e) {
      console.warn('Failed to write to localStorage:', e);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setLoggedInUser(null);
    try {
      localStorage.removeItem('nexus_ai_auth_token');
      localStorage.removeItem('nexus_ai_auth_username');
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
  };

  // Preset Selection Loader
  const handleLoadPreset = (id: string) => {
    const preset = PRESET_IDE_EXAMPLES.find(p => p.id === id);
    if (preset) {
      setSelectedPreset(id);
      setPrompt(preset.prompt);
      setLanguage(preset.language);
      setCodeContext(preset.code);
      setErrorLog(null);
    }
  };

  // Select History Node
  const handleSelectHistory = (item: HistoryItem) => {
    setSelectedHistoryId(item.id);
    setLanguage(item.language);
    setPrompt(item.prompt);
    setCodeContext(item.codeContext || '');
    setCurrentResponse(item.response);
    setErrorLog(null);
    
    // Auto redirect tab context to match selected mode
    if (item.mode === 'generate' || item.mode === 'debug') {
      setActiveTab('editor');
    } else if (item.mode === 'explain') {
      setActiveTab('explain');
    } else if (item.mode === 'optimize' || item.mode === 'review') {
      setActiveTab('review');
    } else if (item.mode === 'concept') {
      setActiveTab('concept');
    } else if (item.mode === 'document') {
      setActiveTab('readme');
    }
  };

  // Remove individual history log
  const handleRemoveHistoryItem = async (id: string) => {
    const filtered = history.filter(item => item.id !== id);
    setHistory(filtered);
    if (selectedHistoryId === id) {
      setSelectedHistoryId(null);
      setCurrentResponse(null);
    }
    try {
      await fetch(`/api/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    } catch (err) {
      console.error('Failed to delete history item from server:', err);
    }
  };

  // Clear all workspace histories
  const handleClearHistory = async () => {
    setHistory([]);
    setSelectedHistoryId(null);
    setCurrentResponse(null);
    try {
      await fetch('/api/history/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    } catch (err) {
      console.error('Failed to clear history from server:', err);
    }
  };

  // Submit Prompt task orchestration
  const executeAssistantTask = async (taskMode: AssistantMode) => {
    setIsLoading(true);
    setErrorLog(null);

    // Context validation
    if (taskMode !== 'concept' && !prompt.trim() && !codeContext.trim()) {
      setErrorLog('Please enter details inside the Prompt Requirement input or code block above before triggering actions.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          mode: taskMode,
          code: codeContext.trim(),
          language
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error status: ${response.status}`);
      }

      const responseData: ActionResponse = await response.json();
      setCurrentResponse(responseData);

      // Playful overview or summary text back from model
      const initialAssistantText = responseData.explanation || 
                                   responseData.debugExplanation || 
                                   responseData.conceptExplanation || 
                                   (taskMode === 'document' ? 'Generated complete structural code comments and system documentation.' : 'Completed analytical orchestration cycle successfully.');

      // Construct history item
      const newHistoryItem: HistoryItem = {
        id: `log_${Date.now()}`,
        title: prompt.trim().substring(0, 40) || `${taskMode.toUpperCase()} - ${language}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language,
        mode: taskMode,
        prompt: prompt.trim() || `Analyze supplied ${language} code`,
        codeContext: codeContext.trim(),
        response: responseData,
        chatHistory: [
          {
            id: `msg_init_user_${Date.now()}`,
            sender: 'user',
            text: prompt.trim() || `Orchestrate ${language} code context analysis under ${taskMode} mode.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          {
            id: `msg_init_assistant_${Date.now()}`,
            sender: 'assistant',
            text: initialAssistantText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            code: responseData.code || responseData.fixedCode || responseData.optimizedCode || responseData.commentedCode
          }
        ]
      };

      // Add to front of history list state
      setHistory(prev => [newHistoryItem, ...prev]);
      setSelectedHistoryId(newHistoryItem.id);

      // Save item securely on server
      try {
        await fetch('/api/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ item: newHistoryItem })
        });
      } catch (err) {
        console.error('Failed to sync history item to backend:', err);
      }

      // Auto route tabs for seamless workflows
      if (taskMode === 'generate') {
        if (responseData.code) setCodeContext(responseData.code);
        setActiveTab('editor');
      } else if (taskMode === 'debug') {
        if (responseData.fixedCode) setCodeContext(responseData.fixedCode);
        setActiveTab('editor');
      } else if (taskMode === 'explain') {
        setActiveTab('explain');
      } else if (taskMode === 'optimize') {
        if (responseData.optimizedCode) setCodeContext(responseData.optimizedCode);
        setActiveTab('review');
      } else if (taskMode === 'review') {
        setActiveTab('review');
      } else if (taskMode === 'concept') {
        setActiveTab('concept');
      } else if (taskMode === 'document') {
        if (responseData.commentedCode) setCodeContext(responseData.commentedCode);
        setActiveTab('readme');
      }

    } catch (err: any) {
      console.error(err);
      setErrorLog(err.message || 'Server communication failure during GenAI compile. Please double check backend logs.');
    } finally {
      setIsLoading(false);
    }
  };

  // DragnDrop file loader handler
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setCodeContext(event.target.result);
          // Auto tag language extension
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'py') setLanguage('Python');
          else if (ext === 'js') setLanguage('JavaScript');
          else if (ext === 'ts' || ext === 'tsx') setLanguage('TypeScript');
          else if (ext === 'sql') setLanguage('SQL');
          else if (ext === 'java') setLanguage('Java');
          else if (ext === 'cpp' || ext === 'h') setLanguage('C++');
          else if (ext === 'go') setLanguage('Go');
          else if (ext === 'html') setLanguage('HTML');
          else if (ext === 'css') setLanguage('CSS');
        }
      };
      reader.readAsText(file);
    }
  };

  // Reset current inputs
  const handleResetInputs = () => {
    setPrompt('');
    setCodeContext('');
    setSelectedPreset(null);
    setCurrentResponse(null);
    setSelectedHistoryId(null);
    setErrorLog(null);
    setActiveTab('editor');
  };

  if (!authToken) {
    return <AuthGate onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* GLOWING AMBIENT BACKGROUND */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-505/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* COMPANION MAIN NAVBAR */}
      <header className="border-b border-slate-755 bg-[#1E293B]/90 backdrop-blur-md sticky top-0 z-50 px-4 py-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Glowing Badged Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Code2 className="text-white" size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-black text-white tracking-tight">Nexus<span className="text-indigo-400 font-bold">AI</span></h1>
                <span className="text-[10px] bg-slate-900 border border-slate-700 text-indigo-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-widest font-mono">v2.5</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Professional Language, Testing, and Optimization Platform</p>
            </div>
          </div>

          {/* Quick Engine Status Indicator */}
          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-400 font-medium flex items-center space-x-1.5 bg-[#0F172A] px-3 py-1.5 rounded-lg border border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-slate-300">gemini-3.5-flash / Py3</span>
            </span>
            <button
              onClick={handleResetInputs}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold cursor-pointer transition text-xs shadow-lg shadow-indigo-600/10"
            >
              Clear Workspace
            </button>
          </div>

        </div>
      </header>

      {/* MAIN APPRENTICE DASHBOARD */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">

        {/* INPUT PANEL & WORKSPACE DIRECTORY (L-COLUMN: 5 COLS) */}
        <section className="lg:col-span-5 flex flex-col space-y-5 font-sans">
          
          {/* Core Command Center Container */}
          <div className="bg-[#1E293B] border border-slate-700/80 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/60 pb-3 gap-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Terminal size={14} className="text-indigo-400" />
                <span>Prompt Inputs</span>
              </h3>
              
              <div className="flex items-center space-x-2">
                {/* Language Tag Dropdown */}
                <div className="flex items-center space-x-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Lang:</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-[#0F172A] text-slate-200 text-[11px] font-semibold px-1.5 py-1 rounded border border-slate-700/60 focus:outline-none focus:border-indigo-500 font-sans"
                  >
                    {['Python', 'JavaScript', 'TypeScript', 'SQL', 'Java', 'C++', 'Go', 'HTML', 'CSS', 'Markdown'].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* Templates Dropdown */}
                <div className="flex items-center space-x-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Example:</label>
                  <select
                    value={selectedPreset || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleLoadPreset(e.target.value);
                      } else {
                        setSelectedPreset(null);
                      }
                    }}
                    className="bg-[#0F172A] text-slate-200 text-[11px] font-semibold px-1.5 py-1 rounded border border-slate-700/60 focus:outline-none focus:border-indigo-500 font-sans max-w-[110px]"
                  >
                    <option value="">-- None --</option>
                    {PRESET_IDE_EXAMPLES.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Prompt Requirement Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Natural Language Instructions
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Write, debug, explain, optimize, or review logic..."
                className="w-full text-xs sm:text-sm bg-[#0F172A] border border-slate-700/80 rounded-lg p-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 min-h-[90px] leading-relaxed resize-none"
              />
            </div>

            {/* Existing File Context Editor Box */}
            <div className="space-y-1.5 relative">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Input Source / Existing Code (Optional)
              </label>
              
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="relative group rounded-lg overflow-hidden border border-slate-700/80 focus-within:border-indigo-500"
              >
                <textarea
                  value={codeContext}
                  onChange={(e) => setCodeContext(e.target.value)}
                  placeholder="Paste script code, drop coding source files, or edit directly in workspace..."
                  className="w-full bg-[#0F172A] p-3.5 text-xs font-mono text-neutral-300 placeholder-neutral-700 focus:outline-none min-h-[140px] leading-relaxed resize-none"
                  spellCheck={false}
                />
                
                {/* Visual Drag Handlers */}
                {codeContext.length === 0 && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-4">
                    <span className="text-[10px] text-slate-400 bg-[#1E293B] border border-slate-700/80 px-3 py-1.5 rounded-md uppercase font-bold tracking-wider opacity-60 group-hover:opacity-100 transition duration-150">
                      Drag & Drop files here to load
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ERROR SUMMARY */}
            {errorLog && (
              <div className="p-3 bg-rose-950/20 border border-rose-800/30 rounded-lg flex items-start space-x-2.5 text-xs text-rose-450">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{errorLog}</span>
              </div>
            )}

            {/* COMPACT DYNAMIC TASK SELECT & EXECUTE ACTION */}
            <div className="pt-4 border-t border-slate-700/60 space-y-3 font-sans">
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Select Assistant Task Mode
                </label>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value as AssistantMode)}
                  className="w-full bg-[#0F172A] text-slate-200 text-xs font-semibold px-3 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 font-sans cursor-pointer transition"
                >
                  <option value="generate">✍️ Generate Code (NL generation)</option>
                  <option value="explain">📖 Explain Logic (Line annotations)</option>
                  <option value="debug">🐛 Debug Code (Fix errors & compile)</option>
                  <option value="optimize">⚡ Optimize Code (Speed & memory tune)</option>
                  <option value="document">📝 Document Creator (README & docstrings)</option>
                  <option value="review">🔍 Review Quality (Audit nomenclature)</option>
                  <option value="concept">🎓 Explore Programming Concept (Tutorials & exercises)</option>
                </select>
              </div>

              <button
                disabled={isLoading}
                onClick={() => executeAssistantTask(selectedMode)}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs rounded-lg cursor-pointer transition shadow-lg shadow-indigo-600/10 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                    <span>Processing task...</span>
                  </span>
                ) : (
                  <>
                    <Sparkles size={14} className="text-white animate-pulse" />
                    <span>Run Workspace Task</span>
                  </>
                )}
              </button>
            </div>
            </div>

          {/* HISTORIES BAR MODULE */}
          <HistorySidebar
            items={history}
            selectedId={selectedHistoryId}
            onSelect={handleSelectHistory}
            onClear={handleClearHistory}
            onRemoveItem={handleRemoveHistoryItem}
            currentUser={loggedInUser || ''}
            onLogout={handleLogout}
          />

        </section>

        {/* OUTPUT INTERACTIVE WORKSPACE (R-COLUMN: 7 COLS) */}
        <section className="lg:col-span-12 xl:col-span-7 flex flex-col space-y-4 font-sans">
          
          {/* Output Selector Workspace Tabs */}
          <div className="flex border-b border-slate-700/60 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold tracking-tight outline-none border-b-2 transition duration-200 cursor-pointer ${
                activeTab === 'editor'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              📄 Code Editor
            </button>
            <button
              onClick={() => setActiveTab('explain')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold tracking-tight outline-none border-b-2 transition duration-200 cursor-pointer ${
                activeTab === 'explain'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              📖 Step Explanation
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold tracking-tight outline-none border-b-2 transition duration-200 cursor-pointer ${
                activeTab === 'review'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              🛠️ Audit & Stats
            </button>
            <button
              onClick={() => setActiveTab('concept')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold tracking-tight outline-none border-b-2 transition duration-200 cursor-pointer ${
                activeTab === 'concept'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              📚 Exercises & Concept
            </button>
            <button
              id="tab-documentation"
              onClick={() => setActiveTab('readme')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold tracking-tight outline-none border-b-2 transition duration-200 cursor-pointer ${
                activeTab === 'readme'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              📝 Documentation
            </button>
          </div>

          {/* LOADING SHELL INDICATOR */}
          {isLoading && (
            <div className="p-16 bg-[#1E293B] border border-slate-700/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-2xl">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <span className="absolute inset-0 border-4 border-indigo-500/10 rounded-full"></span>
                <span className="absolute inset-0 border-4 border-transparent border-t-indigo-500 border-l-indigo-500 rounded-full animate-spin"></span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200 font-sans">Processing with Google Gemini AI...</p>
                <p className="text-[11px] text-slate-405 max-w-[280px] mt-1.5 leading-normal font-sans">
                  Analyzing code syntax patterns, checking algorithmic complexity bounds, and formatting responses securely.
                </p>
              </div>
            </div>
          )}

          {/* ACTIVE CONTENT VIEW - ONLY RENDER IF NOT LOADING */}
          {!isLoading && (
            <div className="flex-1 min-h-[460px]">
              
              {/* IF NO RESPONSED DATA DISPLAY COCKPIT PRE-CHECK */}
              {!currentResponse ? (
                <div className="p-12 bg-[#1E293B]/70 border border-dashed border-slate-700/60 rounded-2xl flex flex-col items-center justify-center text-center h-full">
                  <div className="w-12 h-12 rounded-2xl bg-[#0F172A] border border-slate-700 flex items-center justify-center mb-4">
                    <Terminal size={20} className="text-indigo-400" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">Workspace Ready</h4>
                  <p className="text-xs text-slate-400 max-w-[320px] mt-2 leading-relaxed font-sans">
                    Type your instructions, choose a task mode, and click run to analyze, write, or refactor code.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* TAB 1: CODE EDITOR (DISPLAY CODE + EXTRA DETAILS) */}
                  {activeTab === 'editor' && (
                    <div className="space-y-4 font-sans">
                      <CodeDisplay
                        code={codeContext || currentResponse.code || currentResponse.fixedCode || currentResponse.commentedCode || currentResponse.optimizedCode || ''}
                        language={language}
                        onCodeChange={(newCode) => setCodeContext(newCode)}
                      />
                      
                      {/* Sub-explanation text box showing model reasoning */}
                      {(currentResponse.explanation || currentResponse.debugExplanation) && (
                        <div className="p-5 bg-[#1E293B] border border-slate-700/80 rounded-xl space-y-2 shadow-lg">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-400 flex items-center">
                            <Info size={12} className="mr-1.5" />
                            <span>Executive Summary & Algorithmic Bounds</span>
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                            {currentResponse.explanation || currentResponse.debugExplanation}
                          </p>
                          
                          {/* Render complexity details if returned */}
                          {currentResponse.complexity && (
                            <div className="flex space-x-4 pt-3.5 border-t border-slate-700/60">
                              <div className="bg-[#0F172A] rounded-lg px-3.5 py-1.5 border border-slate-700/80">
                                <span className="text-[9px] text-slate-500 font-bold uppercase block">Time Bound</span>
                                <span className="text-xs font-mono font-bold text-indigo-400">{currentResponse.complexity.time}</span>
                              </div>
                              <div className="bg-[#0F172A] rounded-lg px-3.5 py-1.5 border border-slate-700/80">
                                <span className="text-[9px] text-slate-500 font-bold uppercase block">Space Bound</span>
                                <span className="text-xs font-mono font-bold text-amber-500">{currentResponse.complexity.space}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* INTERACTIVE CHAT FEATURE SECTION */}
                      {selectedHistoryId && (
                        <div id="ai-interactive-chat" className="p-5 bg-[#1E293B] border border-slate-700/80 rounded-xl space-y-4 shadow-lg flex flex-col font-sans mt-4">
                          <div className="border-b border-slate-700/60 pb-3 flex items-center justify-between">
                            <div>
                              <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-400 flex items-center">
                                <Sparkles size={12} className="mr-1.5 animate-pulse" />
                                <span>Interactive Conversation & Follow-up Assistant</span>
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                                Continue the dialogue, ask follow-up questions, or request refinements to this code in real time.
                              </p>
                            </div>
                            <span className="text-[9px] bg-slate-900 border border-slate-700 text-indigo-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Active Thread
                            </span>
                          </div>

                          {/* Message feed stream */}
                          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                            {(history.find(h => h.id === selectedHistoryId)?.chatHistory || []).map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex flex-col max-w-[85%] ${
                                  msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                                }`}
                              >
                                <span className="text-[9px] text-[#818CF8] font-bold mb-1 font-mono uppercase px-1">
                                  {msg.sender === 'user' ? 'User Developer' : 'NexusAI Assistant'} • {msg.timestamp}
                                </span>
                                <div
                                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                    msg.sender === 'user'
                                      ? 'bg-indigo-600 text-white rounded-tr-none'
                                      : 'bg-[#0F172A] border border-slate-700/80 text-slate-200 rounded-tl-none'
                                  }`}
                                >
                                  {/* Format follow-up message rendering */}
                                  <p className="whitespace-pre-wrap">{msg.text}</p>
                                  
                                  {/* Code modification prompt */}
                                  {msg.code && (
                                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between gap-4">
                                      <span className="text-[9.5px] font-mono text-indigo-300 font-semibold">⚙️ Assistant updated code available</span>
                                      <button
                                        onClick={() => {
                                          if (msg.code) {
                                            setCodeContext(msg.code);
                                          }
                                        }}
                                        className="px-2 py-0.5 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white rounded text-[10px] border border-indigo-500/30 transition shadow-inner font-semibold cursor-pointer"
                                      >
                                        Apply Code Update
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {isSendingChat && (
                              <div className="mr-auto items-start max-w-[80%] flex flex-col">
                                <span className="text-[9px] text-slate-500 font-bold mb-1 font-mono uppercase">
                                  Assistant is generating...
                                </span>
                                <div className="p-3 bg-[#0F172A] border border-slate-700/80 text-slate-400 rounded-2xl rounded-tl-none text-xs flex items-center space-x-2">
                                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                                  <span className="italic">Formulating response...</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Suggested follow-ups quick chips */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {[
                              "Suggest 3 unit tests for this",
                              "Optimize the time complexity",
                              "Add comments explaining this logic",
                              "Refactor to support edge cases"
                            ].map((suggestion, sidx) => (
                              <button
                                key={sidx}
                                onClick={() => setChatInput(suggestion)}
                                className="text-[10px] px-2.5 py-1 bg-[#0F172A] hover:bg-indigo-950 hover:text-indigo-300 border border-slate-700/60 rounded-full text-slate-400 cursor-pointer transition font-medium"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>

                          {/* Send input text box */}
                          <div className="flex items-center space-x-2 pt-1 border-t border-slate-700/50">
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  sendChatMessage();
                                }
                              }}
                              placeholder="Type interactive follow-up question..."
                              className="flex-1 bg-[#0F172A] border border-slate-700/60 text-xs text-slate-200 placeholder:text-slate-500 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                            />
                            <button
                              onClick={sendChatMessage}
                              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-550 text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow hover:shadow-indigo-600/20"
                            >
                              Send Message
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: STEP BY STEP DEPRECIATIONS */}
                  {activeTab === 'explain' && (
                    <div className="p-5 bg-[#1E293B] border border-slate-700/80 rounded-xl space-y-5 shadow-2xl">
                      <div className="border-b border-slate-700/60 pb-3">
                        <h3 className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider">
                          Line-By-Line Logic Workflow Breakdown
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-sans">
                          A detailed mechanical view showing exactly how each segment or logical condition behaves during active program cycles.
                        </p>
                      </div>

                      {currentResponse.lineByLine && currentResponse.lineByLine.length > 0 ? (
                        <div className="space-y-3.5">
                          {currentResponse.lineByLine.map((lbl, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 pb-3.5 border-b border-slate-700/40 last:border-0 font-sans">
                              {/* Left: Code Line Display */}
                              <div className="md:col-span-5 bg-[#0F172A] rounded p-2.5 font-mono text-[11px] text-indigo-200 overflow-x-auto border-l-2 border-indigo-500 select-text">
                                {lbl.line}
                              </div>
                              {/* Right: Line explanation text */}
                              <div className="md:col-span-7 flex items-center">
                                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                                  {lbl.desc}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-550 text-xs italic">
                          Line explanation data not generated inside this mode. Go click the "Explain Logic" module action!
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: AUDITS & STATS ROW */}
                  {activeTab === 'review' && (
                    <ReviewStats
                      score={currentResponse.reviewScore || 90}
                      smells={currentResponse.smells || currentResponse.errors || []}
                      recommendations={currentResponse.recommendations || currentResponse.debugSuggestions || []}
                      nomenclature={currentResponse.nomenclature}
                      speedup={currentResponse.speedup}
                      changes={currentResponse.changes}
                      complexityBefore={currentResponse.complexityBefore}
                      complexityAfter={currentResponse.complexityAfter}
                    />
                  )}

                  {/* TAB 4: CONCEPT TUTORIAL & CHALLENGES */}
                  {activeTab === 'concept' && (
                    <ConceptViewer
                      title={currentResponse.conceptTitle || ''}
                      explanation={currentResponse.conceptExplanation || ''}
                      examples={currentResponse.conceptExamples || []}
                      exercises={currentResponse.exercises || []}
                    />
                  )}

                  {/* TAB 5: DOCUMENTATION SECTION */}
                  {activeTab === 'readme' && (
                    <div className="p-6 bg-[#1E293B] border border-slate-700/80 rounded-xl shadow-2xl font-sans">
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-4">
                        <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest block bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/30">
                          System Documentation
                        </span>
                        <button
                          id="btn-copy-doc"
                          onClick={() => {
                            navigator.clipboard.writeText(currentResponse.readme || '');
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 hover:text-white border border-slate-700/50 transition flex items-center space-x-1.5 cursor-pointer font-semibold"
                        >
                          <Copy size={12} />
                          <span>Copy Document</span>
                        </button>
                      </div>
                      <div className="prose prose-invert max-w-none text-slate-300">
                        <RenderMarkdown text={currentResponse.readme || ''} />
                      </div>
                    </div>
                  )}

                </div>
              )}
              
            </div>
          )}

        </section>

      </main>

      {/* COMPACT CLEAN FOOTER */}
      <footer className="border-t border-slate-800/80 bg-[#1E293B]/70 py-4 mt-8 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-550">
          <div className="font-medium">
            NexusAI workspace | Secure cloud synchronized history
          </div>
          <div className="flex space-x-4">
            <span className="hover:text-slate-400 transition cursor-default">© 2026 NexusAI</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
