import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { apiRequest } from '../services/api';
import { 
  Search, 
  Download, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Terminal,
  RefreshCw
} from 'lucide-react';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [service, setService] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isStreaming, setIsStreaming] = useState(true);
  const [servicesList, setServicesList] = useState([]);

  // Fetch logs with query options
  const fetchLogs = async (pageNum = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 50,
        ...(search ? { search } : {}),
        ...(level ? { level } : {}),
        ...(service ? { service } : {})
      });

      const res = await apiRequest(`/api/system/logs?${queryParams.toString()}`);
      if (res.success) {
        setLogs(res.data);
        setTotalPages(res.pagination.pages);
        setPage(res.pagination.page);

        // Dynamically build a list of unique services for the filter dropdown
        if (servicesList.length === 0) {
          const allServices = res.data.map(l => l.service);
          const uniqueServices = ['syslog', 'auth', 'sshd', 'nginx', 'payment-gateway', 'auth-service', 'user-profile', 'database-pool', ...new Set(allServices)];
          setServicesList([...new Set(uniqueServices.filter(Boolean))]);
        }
      }
    } catch (err) {
      console.error('Failed to retrieve logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [level, service, search]);

  // Sockets live streaming binding
  useEffect(() => {
    if (!isStreaming) return;

    const socket = io('/', {
      path: '/socket.io'
    });

    socket.on('new-log', (log) => {
      // Check filters before appending
      const matchesLevel = !level || log.level === level;
      const matchesService = !service || log.service === service;
      const matchesSearch = !search || 
        log.message.toLowerCase().includes(search.toLowerCase()) || 
        log.rawContent.toLowerCase().includes(search.toLowerCase());

      if (matchesLevel && matchesService && matchesSearch) {
        setLogs((prev) => [log, ...prev.slice(0, 49)]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isStreaming, level, service, search]);

  // Export logs to CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'LogLevel', 'Service', 'Message', 'ErrorType', 'RawContent'];
    const rows = logs.map(l => [
      new Date(l.timestamp).toISOString(),
      l.level,
      l.service,
      `"${l.message.replace(/"/g, '""')}"`,
      l.errorType || 'NULL',
      `"${l.rawContent.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `system_sentinel_logs_page_${page}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Filtering Header Toolbar */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800/30 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-indigo-400">
              <Terminal size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-200 font-sans">SRE Console Log Inspector</h3>
              <p className="text-xs text-slate-400 mt-0.5">Filter, search, audit, and stream Linux application log files</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Play/Pause Live Streaming */}
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all cursor-pointer ${
                isStreaming 
                  ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-600/20' 
                  : 'bg-slate-900/40 text-slate-400 border-slate-850 hover:bg-slate-800/40'
              }`}
            >
              {isStreaming ? <Play size={12} className="fill-emerald-400" /> : <Pause size={12} />}
              <span>{isStreaming ? 'Live Stream: On' : 'Live Stream: Paused'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => fetchLogs(page)}
              className="p-2 rounded-xl border border-slate-800/60 bg-slate-900/40 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              title="Reload logs data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* CSV Export */}
            <button
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-xl shadow-md shadow-indigo-600/10 cursor-pointer transition-all"
            >
              <Download size={12} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-800/40 pt-4">
          
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search logs (e.g. error, Exception, sshd)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs"
            />
          </div>

          {/* Level Filter */}
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
          >
            <option value="">Filter Log Level (ALL)</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="DEBUG">DEBUG</option>
          </select>

          {/* Service Filter */}
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl glass-input text-xs capitalize"
          >
            <option value="">Filter System Service (ALL)</option>
            {servicesList.map((svc) => (
              <option key={svc} value={svc}>{svc}</option>
            ))}
          </select>

        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/30 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Terminal size={32} className="text-slate-600 mb-3" />
              <span className="text-sm text-slate-500">No logs found matching specified criteria.</span>
            </div>
          ) : (
            <table className="w-full border-collapse text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-900/30 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6 w-44 select-none">Timestamp</th>
                  <th className="py-4 px-6 w-24 select-none">Level</th>
                  <th className="py-4 px-6 w-32 select-none">Service</th>
                  <th className="py-4 px-6">Message</th>
                  <th className="py-4 px-6 w-40 select-none">Error Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 font-mono text-[11px] leading-relaxed">
                {logs.map((log) => (
                  <tr key={log._id || Math.random()} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3 px-6 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-6">
                      <span className={`inline-block font-semibold w-16 text-center py-0.5 rounded uppercase tracking-wider text-[10px] ${
                        log.level === 'ERROR' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : log.level === 'WARN' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10'
                      }`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-indigo-400 font-semibold truncate max-w-[128px]">
                      {log.service}
                    </td>
                    <td className="py-3 px-6 text-slate-300 break-all select-all font-sans">
                      {log.message}
                    </td>
                    <td className="py-3 px-6 text-rose-400/80 font-semibold truncate max-w-[150px]">
                      {log.errorType || <span className="text-slate-600 font-normal select-none">NONE</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-850 bg-slate-900/10 flex justify-between items-center text-xs">
            <span className="text-slate-400">
              Page <span className="text-slate-200 font-semibold">{page}</span> of <span className="text-slate-200 font-semibold">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchLogs(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-800/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 bg-slate-900/30"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>
              <button
                onClick={() => fetchLogs(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-800/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 bg-slate-900/30"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
