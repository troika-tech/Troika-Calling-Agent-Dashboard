import React, { useState, useEffect } from 'react';
import { 
  FaPhone, 
  FaCheckCircle, 
  FaUserPlus, 
  FaRupeeSign,
  FaArrowUp,
  FaArrowDown,
  FaPlay,
  FaPause,
  FaSpinner,
  FaDownload,
  FaFileAlt,
  FaBullseye,
  FaCoins
} from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsAPI, wsAPI, campaignAPI, creditsAPI } from '../services/api';

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [wsStats, setWsStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [creditBalance, setCreditBalance] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id || user.id;

      // Fetch unified dashboard analytics
      try {
        const analyticsResponse = await analyticsAPI.getDashboard(userId);
        setDashboardData(analyticsResponse.data);
      } catch (err) {
        console.warn('Dashboard analytics not available:', err);
      }

      // Fetch WebSocket stats for real-time metrics
      try {
        const wsResponse = await wsAPI.getStats();
        setWsStats(wsResponse);
      } catch (err) {
        console.warn('WebSocket stats not available:', err);
      }

      // Fetch campaigns
      try {
        const campaignsResponse = await campaignAPI.list();
        const campaignsData = campaignsResponse.data;
        if (Array.isArray(campaignsData)) {
          setCampaigns(campaignsData);
        } else if (campaignsData && Array.isArray(campaignsData.campaigns)) {
          setCampaigns(campaignsData.campaigns);
        } else {
          console.warn('Campaigns response is not an array:', campaignsData);
          setCampaigns([]);
        }
      } catch (err) {
        console.warn('Campaigns data not available:', err);
        setCampaigns([]);
      }

      // Fetch credit balance
      try {
        const creditResponse = await creditsAPI.getBalance();
        setCreditBalance(creditResponse.data.credits);
      } catch (err) {
        console.warn('Credit balance not available:', err);
        setCreditBalance(0);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        setError('Cannot connect to server. Please make sure the backend server is running.');
      } else if (err.response?.status === 404) {
        setError('API endpoint not found. Please check if the backend server is running.');
      } else if (err.response?.status === 500) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Internal server error';
        setError(`Server error: ${errorMsg}`);
      } else {
        const errorData = err.response?.data?.error;
        const errorMsg = typeof errorData === 'string' ? errorData : errorData?.message || err.message || 'Failed to load dashboard data';
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs from analytics data
  const calculateKPIs = () => {
    const campaignsArray = Array.isArray(campaigns) ? campaigns : [];
    const totalCampaigns = campaignsArray.length || 0;
    const activeCampaigns = campaignsArray.filter(c => c.status === 'active' || c.status === 'running').length || 0;

    // Get data from unified dashboard analytics
    const totalCalls = dashboardData?.totalCalls || 0;
    const completedCalls = dashboardData?.completedCalls || 0;

    // Use actual credit balance from API
    const credits = creditBalance !== null ? creditBalance : 0;
    const isLowCredits = credits < 100 && credits > 0;
    const isNoCredits = credits <= 0;

    return [
      {
        title: 'Total Campaigns',
        value: totalCampaigns.toLocaleString(),
        change: '+0%',
        trend: 'up',
        icon: FaBullseye,
        color: 'bg-blue-500',
      },
      {
        title: 'Active Campaigns',
        value: activeCampaigns.toLocaleString(),
        change: '+0%',
        trend: 'up',
        icon: FaPlay,
        color: 'bg-green-500',
      },
      {
        title: 'Total Calls',
        value: totalCalls.toLocaleString(),
        change: '+0%',
        trend: 'up',
        icon: FaPhone,
        color: 'bg-purple-500',
      },
      {
        title: 'Credit Balance',
        value: credits.toLocaleString(),
        change: isNoCredits ? 'Out of credits' : isLowCredits ? 'Low balance' : 'Active',
        trend: isNoCredits ? 'down' : isLowCredits ? 'down' : 'up',
        icon: FaCoins,
        color: isNoCredits ? 'bg-red-500' : isLowCredits ? 'bg-yellow-500' : 'bg-green-500',
        warning: isNoCredits || isLowCredits,
      },
    ];
  };

  // Prepare chart data from analytics
  const prepareChartData = () => {
    if (!dashboardData) return { callOutcomeData: [], callsOverTimeData: [] };

    const totalCalls = dashboardData.totalCalls || 0;
    const completedCalls = dashboardData.completedCalls || 0;
    const failedCalls = dashboardData.failedCalls || 0;
    const inProgressCalls = dashboardData.inProgressCalls || 0;

    const callOutcomeData = [
      { name: 'Total Calls', value: totalCalls, color: '#2196F3' },
      { name: 'Completed', value: completedCalls, color: '#4CAF50' },
      { name: 'In Progress', value: inProgressCalls, color: '#FF9800' },
      { name: 'Failed', value: failedCalls, color: '#F44336' },
    ];

    // Use trends data if available, otherwise use simplified mock data
    const callsOverTimeData = dashboardData.callTrends || [
      { time: '9 AM', calls: Math.floor(totalCalls * 0.1) },
      { time: '10 AM', calls: Math.floor(totalCalls * 0.15) },
      { time: '11 AM', calls: Math.floor(totalCalls * 0.2) },
      { time: '12 PM', calls: Math.floor(totalCalls * 0.18) },
      { time: '1 PM', calls: Math.floor(totalCalls * 0.12) },
      { time: '2 PM', calls: Math.floor(totalCalls * 0.15) },
      { time: '3 PM', calls: Math.floor(totalCalls * 0.18) },
      { time: '4 PM', calls: Math.floor(totalCalls * 0.2) },
    ];

    return { callOutcomeData, callsOverTimeData };
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-medium">Error loading dashboard</p>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpiData = calculateKPIs();
  const { callOutcomeData, callsOverTimeData } = prepareChartData();

  // Get recent campaigns (limit to 4 most recent)
  const recentCampaigns = campaigns
    .sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate))
    .slice(0, 4)
    .map((campaign) => ({
      id: campaign._id || campaign.id,
      name: campaign.name,
      completed: campaign.completedCalls || 0,
      total: campaign.totalCalls || campaign.phoneNumbers?.length || 0,
      status: campaign.status || 'pending',
    }));

  const credits = creditBalance !== null ? creditBalance : 0;
  const isLowCredits = credits < 100 && credits > 0;
  const isNoCredits = credits <= 0;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Monitor your AI calling campaigns in real-time
          </p>
        </div>
      </div>

      {/* Credit Warning Banner */}
      {isNoCredits && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <FaCoins className="text-red-500 mr-3" size={24} />
            <div>
              <h3 className="text-red-800 dark:text-red-200 font-semibold">No Credits Available</h3>
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                Your account has run out of credits. You cannot make or receive calls until credits are added.
                Please contact your administrator to add credits to your account.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLowCredits && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-lg">
          <div className="flex items-center">
            <FaCoins className="text-yellow-500 mr-3" size={24} />
            <div>
              <h3 className="text-yellow-800 dark:text-yellow-200 font-semibold">Low Credit Balance</h3>
              <p className="text-yellow-600 dark:text-yellow-300 text-sm mt-1">
                You have {credits} credits remaining. Consider adding more credits to avoid service interruption.
                (1 credit = 1 second of call time)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    {kpi.title}
                  </p>
                  <p className={`text-2xl sm:text-3xl font-bold mt-2 ${
                    kpi.warning ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {kpi.value}
                  </p>
                  {kpi.title === 'Credit Balance' ? (
                    <div className="flex items-center mt-2">
                      <span className={`text-xs sm:text-sm font-medium ${
                        kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {kpi.change}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center mt-2">
                      {kpi.trend === 'up' ? (
                        <FaArrowUp className="text-green-500 mr-1" size={12} />
                      ) : (
                        <FaArrowDown className="text-red-500 mr-1" size={12} />
                      )}
                      <span
                        className={`text-xs sm:text-sm font-medium ${
                          kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {kpi.change}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 ml-1">
                        vs yesterday
                      </span>
                    </div>
                  )}
                </div>
                <div className={`${kpi.color} p-3 sm:p-4 rounded-lg`}>
                  <Icon className="text-white" size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Campaigns Table + Resource Cards */}
      {recentCampaigns.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Recent Campaigns
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Campaign Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentCampaigns.map((campaign) => {
                    const progress = campaign.total > 0 ? (campaign.completed / campaign.total) * 100 : 0;
                    return (
                      <tr
                        key={campaign.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {campaign.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                              <div
                                className="bg-primary-500 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {campaign.completed}/{campaign.total}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              campaign.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : campaign.status === 'completed'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : campaign.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : campaign.status === 'pending'
                                ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}
                          >
                            {campaign.status === 'active' ? 'Active' : campaign.status === 'completed' ? 'Completed' : campaign.status === 'failed' ? 'Failed' : campaign.status === 'pending' ? 'Pending' : 'Paused'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            {/* FAQ Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col min-h-[180px]">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <FaFileAlt className="text-primary-600 dark:text-primary-400" size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  FAQ
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Common questions about AI Calling Agent
              </p>
              <button
                className="mt-auto inline-flex items-center justify-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <FaDownload size={14} />
                <span>Download FAQ PDF</span>
              </button>
            </div>

            {/* Terms & Conditions Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col min-h-[180px]">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <FaFileAlt className="text-primary-600 dark:text-primary-400" size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Terms & Conditions
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Latest policy and compliance guidelines
              </p>
              <button
                className="mt-auto inline-flex items-center justify-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <FaDownload size={14} />
                <span>Download Terms PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Call Outcome Funnel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">
            Call Outcome Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={callOutcomeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#6b7280" 
                tick={{ fontSize: 12 }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="value" fill="#2196F3" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Calls Over Time */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">
            Calls Over Time
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={callsOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#6b7280" 
                tick={{ fontSize: 12 }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="calls"
                stroke="#2196F3"
                strokeWidth={2}
                dot={{ fill: '#2196F3', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
