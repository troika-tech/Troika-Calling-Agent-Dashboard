import React, { useState, useEffect } from 'react';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { FaBars, FaPhone } from 'react-icons/fa';

import Sidebar from './components/Sidebar';

import UserMenu from './components/UserMenu';
import Login from './components/Login';
import DashboardOverview from './components/DashboardOverview';

import Campaigns from './components/Campaigns';

import Analytics from './components/Analytics';

import CallLogs from './components/CallLogs';
import LiveStatus from './components/LiveStatus';
import CreditHistory from './components/CreditHistory';
import DeliveryReports from './components/DeliveryReport';
import CampaignReportDetail from './components/CampaignReportDetail';
import Settings from './components/Settings';


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('authToken');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};


function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);



  return (

    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
      <div className="h-screen bg-gradient-to-b from-zinc-50 via-slate-50 to-slate-100 text-zinc-900 flex flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Mobile Header - Only visible on mobile */}
          <header className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 shadow-sm shadow-black/5 z-[60]">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm"
            >
              <FaBars size={20} className="text-zinc-700" />
            </button>
            <UserMenu />
          </header>

          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top bar */}
            <header className="hidden lg:flex h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-xl items-center justify-between px-4 md:px-6 shadow-sm shadow-black/5 relative z-40 flex-shrink-0">
              <div className="hidden md:flex items-center gap-3 text-xs text-zinc-500 uppercase tracking-[0.16em]">
                <span>Realtime Operations</span>
              </div>
              <div className="flex items-center gap-3 relative z-50">
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </div>
                <div className="hidden lg:block">
                  <UserMenu />
                </div>
              </div>
            </header>

            {/* Content */}
            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 md:px-6 pt-20 pb-4 md:pt-8 md:pb-6 lg:pt-6">
          <Routes>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<DashboardOverview />} />

            <Route path="/campaigns" element={<Campaigns />} />

            <Route path="/analytics" element={<Analytics />} />

                    <Route path="/call-logs" element={<CallLogs />} />
            <Route path="/live-status" element={<LiveStatus />} />
            <Route path="/credit-history" element={<CreditHistory />} />
            <Route path="/delivery-reports" element={<DeliveryReports />} />
            <Route path="/campaign-report/:campaignId" element={<CampaignReportDetail />} />
            <Route path="/settings" element={<Settings />} />

          </Routes>
            </main>
          </div>
        </div>
      </div>

            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>

  );

}

export default App;
