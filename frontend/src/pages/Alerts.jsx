import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { apiRequest } from '../services/api';
import { 
  BellRing, 
  Check, 
  Send, 
  Download, 
  Trash2,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' vs 'all'
  const [severityFilter, setSeverityFilter] = useState('');

  // Test alert form state
  const [testSeverity, setTestSeverity] = useState('HIGH');
  const [testService, setTestService] = useState('payment-gateway');
  const [testIssue, setTestIssue] = useState('Database pool exhausted. Active connections 100/100.');
  const [testSending, setTestSending] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const isAck = activeTab === 'active' ? 'false' : '';
      const queryParams = new URLSearchParams({
        ...(isAck ? { acknowledged: isAck } : {}),
        ...(severityFilter ? { severity: severityFilter } : {})
      });
      const res = await apiRequest(`/api/system/alerts?${queryParams.toString()}`);
      if (res.success) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [activeTab, severityFilter]);

  // Sockets live alerts binding
  useEffect(() => {
    const socket = io('/', {
      path: '/socket.io'
    });

    socket.on('new-alert', (alert) => {
      // If we are looking for active alerts and new one matches severity
      const matchesSeverity = !severityFilter || alert.severity === severityFilter;
      const isUnresolved = activeTab === 'active' && !alert.acknowledged;

      if (matchesSeverity && (activeTab === 'all' || isUnresolved)) {
        setAlerts((prev) => [alert, ...prev.filter(a => a._id !== alert._id)]);
      }
    });

    socket.on('alert-acknowledged', (ackAlert) => {
      if (activeTab === 'active') {
        setAlerts((prev) => prev.filter(a => a._id !== ackAlert._id));
      } else {
        setAlerts((prev) => prev.map(a => a._id === ackAlert._id ? ackAlert : a));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeTab, severityFilter]);

  // Acknowledge single alert
  const handleAcknowledge = async (id) => {
    try {
      await apiRequest(`/api/system/alerts/acknowledge/${id}`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Dispatch manual test alert
  const handleSendTestAlert = async (e) => {
    e.preventDefault();
    setTestSending(true);
    try {
      await apiRequest('/api/alerts/test', {
        method: 'POST',
        body: JSON.stringify({
          severity: testSeverity,
          service: testService,
          issue: testIssue
        })
      });
      alert('Test alert dispatched! Verify Slack webhook and Email inbox.');
    } catch (err) {
      alert(`Failed to send test alert: ${err.message}`);
    } finally {
      setTestSending(false);
    }
  };

  // Export alerts as JSON
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(alerts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(jsonStr);
    const exportFileDefaultName = `system_sentinel_alerts_report_${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Page header and dispatcher layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Alerts Header Statistics */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-indigo-400">
                <BellRing size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-200">Alert Notification Hub</h3>
                <p className="text-xs text-slate-400 mt-0.5">Audit log of system anomalies, error thresholds, and resolution states</p>
              </div>
            </div>
            <button
              onClick={fetchAlerts}
              className="p-2 rounded-xl border border-slate-800/60 bg-slate-900/40 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              title="Reload alerts"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 border-t border-slate-800/40 pt-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-slate-900/45 text-slate-400 hover:text-slate-200'
                }`}
              >
                Active Alerts ({alerts.filter(a => !a.acknowledged).length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-slate-900/45 text-slate-400 hover:text-slate-200'
                }`}
              >
                Alert History (All)
              </button>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-4 py-2 rounded-xl glass-input text-xs"
              >
                <option value="">All Severities</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>

              <button
                onClick={handleExportJSON}
                disabled={alerts.length === 0}
                className="flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/20 hover:bg-indigo-600/30 text-indigo-400 disabled:opacity-50 disabled:pointer-events-none text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-xl cursor-pointer"
              >
                <Download size={12} />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Test Alert Dispatcher form */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800/30">
          <span className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4">
            <AlertOctagon size={16} className="text-indigo-400" />
            <span>Manual Integration Dispatcher</span>
          </span>

          <form onSubmit={handleSendTestAlert} className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Severity</label>
              <select
                value={testSeverity}
                onChange={(e) => setTestSeverity(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg glass-input text-xs"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Service / Process</label>
              <input
                type="text"
                value={testService}
                onChange={(e) => setTestService(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg glass-input text-xs"
                placeholder="database-pool"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Issue Details</label>
              <textarea
                value={testIssue}
                onChange={(e) => setTestIssue(e.target.value)}
                rows="2"
                className="w-full px-3 py-1.5 rounded-lg glass-input text-xs"
                placeholder="Details of the issue..."
              />
            </div>

            <button
              type="submit"
              disabled={testSending}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-3 rounded-lg text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Send size={12} />
              <span>{testSending ? 'Dispatching...' : 'Dispatch Alert'}</span>
            </button>
          </form>
        </div>

      </div>

      {/* Alerts listings */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass-panel p-16 rounded-2xl border border-slate-800/30 text-center flex flex-col items-center">
            <BellRing size={36} className="text-slate-600 mb-3" />
            <span className="text-sm font-semibold text-slate-400">No matching alerts found</span>
            <p className="text-xs text-slate-500 mt-1">If all alerts are resolved, you can trigger a manual test alert using the panel above.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert._id}
              className={`p-6 rounded-2xl glass-panel border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 ${
                alert.acknowledged
                  ? 'border-slate-850 opacity-60 bg-slate-950/20'
                  : alert.severity === 'CRITICAL' 
                    ? 'border-rose-500/30 bg-rose-950/5 cyber-glow-rose' 
                    : alert.severity === 'HIGH' 
                      ? 'border-amber-500/30 bg-amber-950/5 cyber-glow-amber' 
                      : 'border-indigo-500/20 bg-indigo-950/5'
              }`}
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase ${
                    alert.severity === 'CRITICAL' 
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/20' 
                      : alert.severity === 'HIGH' 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' 
                        : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-slate-500 text-xs font-mono">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                  <div className="h-3 w-px bg-slate-800"></div>
                  <span className="text-xs text-slate-400">
                    Host: <span className="font-semibold text-slate-300">{alert.host}</span>
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-200 uppercase tracking-wide">
                    Service: {alert.service}
                  </h4>
                  <p className="text-sm text-slate-300 mt-1 font-sans">{alert.issue}</p>
                </div>

                <div className="p-3 rounded-lg bg-indigo-950/10 border border-indigo-500/10 text-xs text-slate-300 font-sans leading-relaxed">
                  <strong className="text-indigo-400 font-semibold block mb-0.5">SRE Action Plan:</strong>
                  {alert.recommendation}
                </div>

                {alert.acknowledged && (
                  <div className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1.5">
                    <Check size={12} />
                    <span>Acknowledged by {alert.acknowledgedBy} at {new Date(alert.acknowledgedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {!alert.acknowledged && (
                <button
                  onClick={() => handleAcknowledge(alert._id)}
                  className="px-4 py-2.5 rounded-xl border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 bg-indigo-650/5 hover:bg-indigo-650/15 text-xs uppercase tracking-wider font-semibold cursor-pointer transition-all flex items-center gap-2 justify-center"
                >
                  <Check size={14} />
                  <span>Acknowledge</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
