import React, { useState, useEffect } from 'react';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { FaBars } from 'react-icons/fa';

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

  const [darkMode, setDarkMode] = useState(() => {

    const saved = localStorage.getItem('darkMode');

    return saved ? JSON.parse(saved) : true; // Default to dark mode

  });

  const [sidebarOpen, setSidebarOpen] = useState(false);



  useEffect(() => {

    if (darkMode) {

      document.documentElement.classList.add('dark');

    } else {

      document.documentElement.classList.remove('dark');

    }

    localStorage.setItem('darkMode', JSON.stringify(darkMode));

  }, [darkMode]);



  const toggleDarkMode = () => {

    setDarkMode(!darkMode);

  };



  return (

    <Router>

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
        {/* Mobile Header - Only visible on mobile */}
        <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FaBars size={20} />
          </button>
          <UserMenu darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        </header>

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

                <main className="flex-1 overflow-y-auto relative lg:pt-0 pt-16">
                  <div className="absolute top-10 right-12 z-20 hidden lg:block">
                    <UserMenu darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
                  </div>
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

            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>

  );

}

export default App;
