import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Logs from './pages/Logs';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'logs' && <Logs />}
      {activeTab === 'alerts' && <Alerts />}
      {activeTab === 'analytics' && <Analytics />}
      {activeTab === 'settings' && <Settings />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
