import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { apiRequest } from '../services/api';
import { 
  Cpu, 
  Layers, 
  HardDrive, 
  Bell, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity,
  Server,
  Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial history
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [metricsRes, logsRes, alertsRes] = await Promise.all([
          apiRequest('/api/system/metrics'),
          apiRequest('/api/system/logs?limit=15'),
          apiRequest('/api/system/alerts?acknowledged=false')
        ]);
        
        if (metricsRes.success && metricsRes.data.current) {
          setMetrics(metricsRes.data.current);
          setMetricsHistory(metricsRes.data.history || []);
        }
        if (logsRes.success) {
          setLogs(logsRes.data);
        }
        if (alertsRes.success) {
          setAlerts(alertsRes.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // WebSockets live binding
  useEffect(() => {
    const socket = io('/', {
      path: '/socket.io'
    });

    socket.on('metrics', (data) => {
      setMetrics(data);
      // Append new metric to history and limit to last 30 readings
      setMetricsHistory((prev) => {
        const next = [...prev, data];
        if (next.length > 30) next.shift();
        return next;
      });
    });

    socket.on('new-log', (log) => {
      setLogs((prev) => [log, ...prev.slice(0, 14)]);
    });

    socket.on('new-alert', (alert) => {
      setAlerts((prev) => [alert, ...prev.filter(a => a._id !== alert._id)]);
    });

    socket.on('alert-acknowledged', (ackAlert) => {
      // Remove acknowledged alert from live listing
      setAlerts((prev) => prev.filter(a => a._id !== ackAlert._id));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Acknowledge alert helper
  const handleAcknowledge = async (id) => {
    try {
      await apiRequest(`/api/system/alerts/acknowledge/${id}`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <span className="text-sm text-slate-400">Loading SRE Cockpit telemetry...</span>
        </div>
      </div>
    );
  }

  // Format charts timestamps
  const chartData = metricsHistory.map((m) => ({
    time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    cpu: m.cpuUsage,
    memory: m.memoryUsage,
    disk: m.diskUsage
  }));

  // Card items configurations
  const activeAlertsCount = alerts.length;
  const currentCpu = metrics?.cpuUsage ?? 0;
  const currentMem = metrics?.memoryUsage ?? 0;
  const currentDisk = metrics?.diskUsage ?? 0;
  const currentNetRx = metrics?.networkSpeed?.rx ?? 0;
  const currentNetTx = metrics?.networkSpeed?.tx ?? 0;

  const resourceCards = [
    {
      title: 'CPU Usage',
      value: `${currentCpu}%`,
      sub: `Load avg: ${metrics?.loadAverage?.[0]?.toFixed(2) || '0.00'}`,
      icon: Cpu,
      colorClass: currentCpu >= 80 ? 'text-rose-400' : 'text-indigo-400',
      glowClass: currentCpu >= 80 ? 'cyber-glow-rose border-rose-500/20' : 'cyber-glow-indigo border-indigo-500/10',
      progress: currentCpu
    },
    {
      title: 'Memory Allocation',
      value: `${currentMem}%`,
      sub: `${Math.round(((metrics?.totalMem - metrics?.freeMem) || 0) / (1024 * 1024 * 1024))}GB / ${Math.round((metrics?.totalMem || 0) / (1024 * 1024 * 1024))}GB`,
      icon: Layers,
      colorClass: currentMem >= 85 ? 'text-rose-400' : 'text-emerald-400',
      glowClass: currentMem >= 85 ? 'cyber-glow-rose border-rose-500/20' : 'cyber-glow-emerald border-emerald-500/10',
      progress: currentMem
    },
    {
      title: 'Disk Storage',
      value: `${currentDisk}%`,
      sub: 'Device root (/) partition',
      icon: HardDrive,
      colorClass: currentDisk >= 90 ? 'text-rose-400' : 'text-amber-400',
      glowClass: currentDisk >= 90 ? 'cyber-glow-rose border-rose-500/20' : 'cyber-glow-amber border-amber-500/10',
      progress: currentDisk
    },
    {
      title: 'Active Incidents',
      value: activeAlertsCount,
      sub: activeAlertsCount > 0 ? 'Action required immediately' : 'System healthy',
      icon: Bell,
      colorClass: activeAlertsCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-400',
      glowClass: activeAlertsCount > 0 ? 'cyber-glow-rose border-rose-500/20 animate-pulse' : 'border-slate-800/40',
      progress: activeAlertsCount > 0 ? 100 : 0
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Platform Info Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-indigo-400">
            <Server size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-200">Host Engine Profile</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hostname: <span className="text-slate-300 font-medium">{metrics?.hostname || 'unknown'}</span> | OS: <span className="text-slate-300 font-medium">{metrics?.platform || 'unknown'}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-amber-400" />
            <span className="text-xs text-slate-400">Network IO:</span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
              <ArrowDownRight size={12} /> {currentNetRx} KB/s
            </span>
            <span className="text-xs font-semibold text-indigo-400 flex items-center gap-0.5 ml-1">
              <ArrowUpRight size={12} /> {currentNetTx} KB/s
            </span>
          </div>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="text-xs text-slate-400">
            System Uptime: <span className="text-indigo-400 font-semibold">{metrics ? Math.floor(metrics.uptime / 3600) : 0}h {metrics ? Math.floor((metrics.uptime % 3600) / 60) : 0}m</span>
          </div>
        </div>
      </div>

      {/* Grid of Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {resourceCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={`glass-panel p-6 rounded-2xl border transition-all duration-300 ${card.glowClass}`}>
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">{card.title}</span>
                <span className={card.colorClass}>
                  <Icon size={18} />
                </span>
              </div>
              <div className="mt-4">
                <span className={`text-3xl font-extrabold tracking-tight ${card.colorClass}`}>{card.value}</span>
                <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
              </div>
              
              {/* Progress Slider bar */}
              <div className="w-full bg-slate-850 h-1.5 rounded-full mt-4 overflow-hidden border border-slate-900/20">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    card.title === 'Active Incidents' && card.value > 0 
                      ? 'bg-rose-500' 
                      : card.progress >= 90 
                        ? 'bg-rose-500' 
                        : card.progress >= 75 
                          ? 'bg-amber-500' 
                          : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, card.progress)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/30">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-indigo-400" />
              <span className="text-sm font-bold text-slate-200">CPU Metrics History (Real-time)</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0d121e', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="cpu" name="CPU Usage %" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#cpuGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/30">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" />
              <span className="text-sm font-bold text-slate-200">Memory Load History (Real-time)</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="memGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0d121e', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="memory" name="RAM Usage %" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#memGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dynamic Feeds */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Sockets Live Logs list */}
        <div className="xl:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800/30 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-bold text-slate-200">Live Console Streaming Feed</span>
            <div className="flex items-center gap-1.5 text-xs text-indigo-400">
              <span className="h-2 w-2 rounded-full bg-indigo-500 live-indicator"></span>
              <span>listening</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[350px] border border-slate-800/60 rounded-xl bg-slate-950/40 p-4">
            {logs.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-10 font-mono">
                [SYSTEM]: Waiting for incoming log stream telemetry...
              </div>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px] leading-relaxed">
                {logs.map((log) => (
                  <div key={log._id || Math.random()} className="flex items-start hover:bg-slate-850/50 py-0.5 px-1 rounded transition-colors">
                    <span className="text-slate-500 select-none shrink-0 w-36">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`font-semibold shrink-0 w-16 uppercase text-center rounded mr-3 px-1 ${
                      log.level === 'ERROR' 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                        : log.level === 'WARN' 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-indigo-300 font-semibold shrink-0 w-24 truncate mr-2 select-all">
                      [{log.service}]
                    </span>
                    <span className="text-slate-300 break-all select-all">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Active alerts hub */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/30 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-bold text-slate-200">Active Incidents Feed</span>
            <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 border border-rose-500/20 rounded font-semibold uppercase tracking-wider">
              Unresolved
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[350px] space-y-4 pr-1">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                <Bell size={28} className="text-slate-600 mb-2" />
                <span className="text-xs text-slate-500">All alerts acknowledged!</span>
              </div>
            ) : (
              alerts.map((alert) => (
                <div 
                  key={alert._id} 
                  className={`p-4 rounded-xl border flex flex-col gap-2 relative overflow-hidden transition-all duration-300 ${
                    alert.severity === 'CRITICAL' 
                      ? 'border-rose-500/30 bg-rose-950/10' 
                      : alert.severity === 'HIGH' 
                        ? 'border-amber-500/30 bg-amber-950/10' 
                        : 'border-indigo-500/30 bg-indigo-950/10'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase ${
                      alert.severity === 'CRITICAL' 
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/20' 
                        : alert.severity === 'HIGH' 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' 
                          : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{alert.service}</h4>
                    <p className="text-xs text-slate-200 mt-1 leading-normal">{alert.issue}</p>
                  </div>

                  <button 
                    onClick={() => handleAcknowledge(alert._id)}
                    className="mt-2 w-full py-1.5 rounded-lg border border-slate-800 text-[10px] uppercase font-semibold tracking-wider bg-slate-900/60 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-all cursor-pointer"
                  >
                    Acknowledge Alert
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
