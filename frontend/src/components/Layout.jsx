import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';
import { 
  LayoutDashboard, 
  Terminal, 
  BellRing, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut, 
  Radio, 
  X,
  ShieldAlert
} from 'lucide-react';

export const Layout = ({ activeTab, setActiveTab, children }) => {
  const { user, logoutUser } = useAuth();
  const [socketConnected, setSocketConnected] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Socket listener for global alerts
  useEffect(() => {
    // Connect to server (proxied or standard host)
    const socket = io('/', {
      path: '/socket.io'
    });

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('new-alert', (alert) => {
      // Create toast notification
      const newToast = {
        id: Date.now(),
        severity: alert.severity,
        service: alert.service,
        issue: alert.issue
      };
      
      setToasts((prev) => [...prev, newToast]);

      // Remove after 6 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter(t => t.id !== newToast.id));
      }, 6000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'logs', label: 'Logs Stream', icon: Terminal },
    { id: 'alerts', label: 'Alerts Hub', icon: BellRing },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Sentinel Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex min-h-screen bg-[#080b11] text-slate-100 bg-gradient-sre">
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`p-4 rounded-xl border glass-panel shadow-2xl animate-bounce-short flex gap-3 items-start transition-all duration-300 ${
              toast.severity === 'CRITICAL' 
                ? 'border-rose-500/50 bg-rose-950/20' 
                : toast.severity === 'HIGH' 
                  ? 'border-amber-500/50 bg-amber-950/20' 
                  : 'border-indigo-500/50 bg-indigo-950/20'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              toast.severity === 'CRITICAL' 
                ? 'bg-rose-500/20 text-rose-400' 
                : toast.severity === 'HIGH' 
                  ? 'bg-amber-500/20 text-amber-400' 
                  : 'bg-indigo-500/20 text-indigo-400'
            }`}>
              <ShieldAlert size={20} className="animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs tracking-wider uppercase opacity-80">
                  {toast.severity} - {toast.service}
                </span>
                <button 
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="opacity-50 hover:opacity-100 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-sm mt-1 text-slate-200">{toast.issue}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Layout */}
      <aside className="w-64 glass-panel border-r border-slate-800/40 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-slate-800/40 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <ShieldAlert className="text-white" size={22} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">Sentinel</h1>
              <span className="text-xs text-indigo-400 font-semibold uppercase tracking-widest">System Pro</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 flex flex-col gap-1.5 mt-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                      : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Admin User */}
        <div className="p-4 border-t border-slate-800/40 flex flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 live-indicator"></div>
              <span className="text-xs text-slate-400 font-medium">Console Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Radio size={12} className={socketConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-500'} />
              <span>{socketConnected ? 'Connected' : 'Offline'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/50">
            <div className="flex flex-col truncate">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Operator</span>
              <span className="text-sm font-semibold truncate text-slate-200">{user || 'Operator'}</span>
            </div>
            <button 
              onClick={logoutUser}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
              title="Logout session"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar Header */}
        <header className="h-16 border-b border-slate-800/40 flex items-center justify-between px-8 glass-panel shrink-0">
          <h2 className="text-lg font-bold tracking-tight text-slate-200">
            {menuItems.find(m => m.id === activeTab)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/30 flex items-center gap-2 text-xs text-slate-400">
              <span>SRE Mode</span>
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
