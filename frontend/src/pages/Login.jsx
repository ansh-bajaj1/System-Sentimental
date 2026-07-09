import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiRequest } from '../services/api';
import { ShieldAlert, Lock, User, AlertTriangle } from 'lucide-react';

export default function Login() {
  const { loginUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (res.success) {
        loginUser(res.token, res.user.username);
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06080c] relative overflow-hidden bg-gradient-sre px-4">
      {/* Visual cyber glow background shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-rose-900/10 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative z-10">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30 mb-4 border border-indigo-500/20">
            <ShieldAlert className="text-white" size={30} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Sentinel</h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1.5">SRE Access Portal</p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-sm flex gap-3 items-center">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all text-sm mt-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In To Cockpit'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/50 pt-4">
          <p className="text-xs text-slate-500">
            For evaluation, use seeded credentials:<br />
            <span className="font-semibold text-indigo-400/80">admin</span> / <span className="font-semibold text-indigo-400/80">adminpassword123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
