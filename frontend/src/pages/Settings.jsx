import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { Settings as SettingsIcon, Save, Info, AlertCircle } from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Settings state values
  const [cpuThreshold, setCpuThreshold] = useState(80);
  const [memoryThreshold, setMemoryThreshold] = useState(85);
  const [diskThreshold, setDiskThreshold] = useState(90);
  const [monitoringInterval, setMonitoringInterval] = useState(10);
  const [logFilePath, setLogFilePath] = useState('logs/application.log');
  const [alertCooldown, setAlertCooldown] = useState(300);

  // Slack state
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState('');

  // Email state
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailSmtpHost, setEmailSmtpHost] = useState('smtp.ethereal.email');
  const [emailSmtpPort, setEmailSmtpPort] = useState(587);
  const [emailSmtpUser, setEmailSmtpUser] = useState('');
  const [emailSmtpPass, setEmailSmtpPass] = useState('');
  const [emailSmtpFrom, setEmailSmtpFrom] = useState('sentinel@system.monitor');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiRequest('/api/settings');
        if (res.success && res.data) {
          const s = res.data;
          setCpuThreshold(s.cpuThreshold);
          setMemoryThreshold(s.memoryThreshold);
          setDiskThreshold(s.diskThreshold);
          setMonitoringInterval(s.monitoringInterval);
          setLogFilePath(s.logFilePath);
          setAlertCooldown(s.alertCooldown);
          setSlackEnabled(s.slackEnabled);
          setSlackWebhook(s.slackWebhook || '');
          setEmailEnabled(s.emailEnabled);
          setEmailSmtpHost(s.emailSmtpHost || '');
          setEmailSmtpPort(s.emailSmtpPort || 587);
          setEmailSmtpUser(s.emailSmtpUser || '');
          setEmailSmtpPass(s.emailSmtpPass || '');
          setEmailSmtpFrom(s.emailSmtpFrom || 'sentinel@system.monitor');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setErrorMsg('Failed to load system settings from database.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    const payload = {
      cpuThreshold: Number(cpuThreshold),
      memoryThreshold: Number(memoryThreshold),
      diskThreshold: Number(diskThreshold),
      monitoringInterval: Number(monitoringInterval),
      logFilePath,
      alertCooldown: Number(alertCooldown),
      slackEnabled,
      slackWebhook,
      emailEnabled,
      emailSmtpHost,
      emailSmtpPort: Number(emailSmtpPort),
      emailSmtpUser,
      emailSmtpPass,
      emailSmtpFrom
    };

    try {
      const res = await apiRequest('/api/settings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.success) {
        setSuccessMsg('Sentinel configurations updated successfully and applied dynamically!');
        // Scroll to top to see message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update system settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      
      {/* Top Banner Message notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-sm flex gap-3 items-center">
          <Info size={18} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-sm flex gap-3 items-center">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Resource Thresholds */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800/30 space-y-4">
          <span className="text-sm font-bold text-slate-200 block border-b border-slate-800/40 pb-3 uppercase tracking-wider">
            1. Resource Alarm Thresholds (%)
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">CPU Threshold (%)</label>
              <input
                type="number"
                min="10"
                max="100"
                required
                value={cpuThreshold}
                onChange={(e) => setCpuThreshold(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Triggers high severity alarm</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">RAM Threshold (%)</label>
              <input
                type="number"
                min="10"
                max="100"
                required
                value={memoryThreshold}
                onChange={(e) => setMemoryThreshold(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Triggers RAM warning alarm</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Disk Threshold (%)</label>
              <input
                type="number"
                min="10"
                max="100"
                required
                value={diskThreshold}
                onChange={(e) => setDiskThreshold(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Triggers disk space full alarm</span>
            </div>
          </div>
        </div>

        {/* Section 2: Monitoring Rules */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800/30 space-y-4">
          <span className="text-sm font-bold text-slate-200 block border-b border-slate-800/40 pb-3 uppercase tracking-wider">
            2. Log Watcher & Interval Configurations
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Log File Path</label>
              <input
                type="text"
                required
                value={logFilePath}
                onChange={(e) => setLogFilePath(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                placeholder="/var/log/syslog"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Absolute or relative file path watched continuously</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Metric Interval (sec)</label>
              <input
                type="number"
                min="5"
                max="300"
                required
                value={monitoringInterval}
                onChange={(e) => setMonitoringInterval(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">SRE metrics collection tick rate</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Alert Cooldown (sec)</label>
              <input
                type="number"
                min="10"
                max="3600"
                required
                value={alertCooldown}
                onChange={(e) => setAlertCooldown(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Mutes identical alert spam</span>
            </div>
          </div>
        </div>

        {/* Section 3: Slack Alerting Integration */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800/30 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/40 pb-3">
            <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              3. Slack Alerting Integration
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={slackEnabled}
                onChange={(e) => setSlackEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
              <span className="ml-2 text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
                {slackEnabled ? 'Active' : 'Disabled'}
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Incoming Webhook URL</label>
              <input
                type="url"
                disabled={!slackEnabled}
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs disabled:opacity-30 disabled:pointer-events-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">JSON format payloads are posted to this webhook channel</span>
            </div>
          </div>
        </div>

        {/* Section 4: Email SMTP Alerting */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800/30 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/40 pb-3">
            <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              4. Email Alerting Setup (Nodemailer)
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
              <span className="ml-2 text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
                {emailEnabled ? 'Active' : 'Disabled'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">SMTP Server Hostname</label>
              <input
                type="text"
                disabled={!emailEnabled}
                value={emailSmtpHost}
                onChange={(e) => setEmailSmtpHost(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs disabled:opacity-30 disabled:pointer-events-none"
                placeholder="smtp.ethereal.email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">SMTP Server Port</label>
              <input
                type="number"
                disabled={!emailEnabled}
                value={emailSmtpPort}
                onChange={(e) => setEmailSmtpPort(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs disabled:opacity-30 disabled:pointer-events-none"
                placeholder="587"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">SMTP Auth Username</label>
              <input
                type="text"
                disabled={!emailEnabled}
                value={emailSmtpUser}
                onChange={(e) => setEmailSmtpUser(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs disabled:opacity-30 disabled:pointer-events-none"
                placeholder="user123@ethereal.email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">SMTP Auth Password</label>
              <input
                type="password"
                disabled={!emailEnabled}
                value={emailSmtpPass}
                onChange={(e) => setEmailSmtpPass(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs disabled:opacity-30 disabled:pointer-events-none"
                placeholder="••••••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Email Dispatched From</label>
              <input
                type="email"
                disabled={!emailEnabled}
                value={emailSmtpFrom}
                onChange={(e) => setEmailSmtpFrom(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs disabled:opacity-30 disabled:pointer-events-none"
                placeholder="sentinel@system.monitor"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            <Save size={14} />
            <span>{saving ? 'Saving Configs...' : 'Save System Settings'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
