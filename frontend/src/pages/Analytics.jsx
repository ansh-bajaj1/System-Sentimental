import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { BarChart3, PieChart as PieIcon, TrendingUp, RefreshCw } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';

export default function Analytics() {
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [logsRes, alertsRes] = await Promise.all([
        apiRequest('/api/system/logs?limit=500'), // Grab a large sample for history statistics
        apiRequest('/api/system/alerts')
      ]);

      if (logsRes.success) {
        setLogs(logsRes.data);
      }
      if (alertsRes.success) {
        setAlerts(alertsRes.data);
      }
    } catch (err) {
      console.error('Failed to gather analytics logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // 1. Process Log Level Distribution (Pie Chart)
  const logCounts = { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 };
  logs.forEach(l => {
    if (logCounts[l.level] !== undefined) logCounts[l.level]++;
  });

  const pieData = [
    { name: 'INFO', value: logCounts.INFO, color: '#6366f1' },
    { name: 'WARN', value: logCounts.WARN, color: '#f59e0b' },
    { name: 'ERROR', value: logCounts.ERROR, color: '#f43f5e' },
    { name: 'DEBUG', value: logCounts.DEBUG, color: '#3b82f6' }
  ].filter(item => item.value > 0);

  // 2. Process Error Counts by Service (Bar Chart)
  const serviceErrors = {};
  logs.forEach(l => {
    if (l.level === 'ERROR') {
      serviceErrors[l.service] = (serviceErrors[l.service] || 0) + 1;
    }
  });

  const barData = Object.keys(serviceErrors).map(service => ({
    name: service,
    errors: serviceErrors[service]
  })).sort((a, b) => b.errors - a.errors).slice(0, 8); // Top 8 service failures

  // 3. Process Alerts Severity Distribution
  const alertCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  alerts.forEach(a => {
    if (alertCounts[a.severity] !== undefined) alertCounts[a.severity]++;
  });

  const alertReportData = [
    { severity: 'CRITICAL', count: alertCounts.CRITICAL, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { severity: 'HIGH', count: alertCounts.HIGH, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { severity: 'MEDIUM', count: alertCounts.MEDIUM, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { severity: 'LOW', count: alertCounts.LOW, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Platform Info Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-indigo-400">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-200">Historical System Analytics</h3>
            <p className="text-xs text-slate-400 mt-0.5">Aggregated report of log level ratios, service failures, and alert incident statistics</p>
          </div>
        </div>
        
        <button
          onClick={fetchAnalyticsData}
          className="flex items-center gap-2 bg-slate-900/40 hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-slate-850 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Recalculate Stats</span>
        </button>
      </div>

      {/* Row of quick incident metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {alertReportData.map((item, idx) => (
          <div key={idx} className={`p-6 rounded-2xl glass-panel border flex flex-col justify-between ${item.color}`}>
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">{item.severity} Incidents</span>
            <span className="text-3xl font-extrabold tracking-tight mt-2">{item.count}</span>
            <p className="text-[10px] opacity-60 mt-1">Total recorded incidents</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart of Log Level Split */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/30 flex flex-col h-[400px]">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon size={16} className="text-indigo-400" />
            <span className="text-sm font-bold text-slate-200">Log Level Distribution (500 Line Sample)</span>
          </div>

          <div className="flex-1 w-full relative">
            {pieData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono">
                No logs recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d121e', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: 12 }}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    iconSize={10}
                    formatter={(value) => <span className="text-xs text-slate-400 font-semibold">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart of top service failures */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/30 flex flex-col h-[400px]">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={16} className="text-rose-400" />
            <span className="text-sm font-bold text-slate-200">Error Frequencies by Service</span>
          </div>

          <div className="flex-1 w-full relative">
            {barData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono">
                No service errors detected yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0d121e', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: 12 }}
                  />
                  <Bar dataKey="errors" name="Error Count" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#f43f5e" fillOpacity={1 - index * 0.08} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
