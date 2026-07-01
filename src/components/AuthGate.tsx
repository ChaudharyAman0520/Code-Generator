import React, { useState } from 'react';
import { Lock, User, KeyRound, Eye, EyeOff, Sparkles, Code2, ArrowRight } from 'lucide-react';

interface AuthGateProps {
  onLoginSuccess: (token: string, username: string) => void;
}

export default function AuthGate({ onLoginSuccess }: AuthGateProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanUsername = username.trim();
    if (!cleanUsername || !password.trim()) {
      setError('Both username and password are required.');
      return;
    }

    if (authMode === 'register' && password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `${authMode === 'login' ? 'Login' : 'Registration'} failed.`);
      }

      if (authMode === 'login') {
        onLoginSuccess(data.token, data.username);
      } else {
        setSuccess('Account created successfully! You can now sign in.');
        setAuthMode('login');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200 font-sans">
      
      {/* BACKGROUND GLOWS */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* LOGO AND HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 items-center justify-center shadow-xl shadow-indigo-500/20 mb-4 animate-pulse">
            <Code2 className="text-white" size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Nexus<span className="text-indigo-400 font-bold">AI</span> Workspace
          </h1>
        </div>

        {/* AUTH BOX */}
        <div className="bg-[#1E293B]/85 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/20">
          
          {/* TAB HEADERS */}
          <div className="flex border-b border-slate-700/60 mb-6 pb-0.5">
            <button
              onClick={() => {
                setAuthMode('login');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition duration-200 cursor-pointer ${
                authMode === 'login'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode('register');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition duration-200 cursor-pointer ${
                authMode === 'register'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* ALERT BANNERS */}
            {error && (
              <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded-lg text-xs text-rose-450 leading-relaxed font-sans">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-xs text-emerald-450 leading-relaxed font-sans">
                {success}
              </div>
            )}

            {/* USERNAME FIELD */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User size={14} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="enter username..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#0F172A] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* PASSWORD FIELD */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <KeyRound size={14} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs bg-[#0F172A] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white font-bold text-xs rounded-lg cursor-pointer transition shadow-lg shadow-indigo-600/10 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  <span>Authenticating...</span>
                </span>
              ) : (
                <>
                  <span>{authMode === 'login' ? 'Sign In' : 'Register Account'}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* SECURE CARD METADATA FOOTER */}
          <div className="mt-2 text-center">
          </div>

        </div>

      </div>
    </div>
  );
}
