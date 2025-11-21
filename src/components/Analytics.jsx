import React, { useState, useEffect } from 'react';
import { FaPhone, FaCheckCircle, FaTimesCircle, FaClock, FaSpinner } from 'react-icons/fa';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { callAPI } from '../services/api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [directionTimeData, setDirectionTimeData] = useState([]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id || user.id;

      // Fetch analytics using the analytics API instead of outbound-only stats
      const analyticsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/analytics/dashboard?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!analyticsResponse.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const analyticsData = await analyticsResponse.json();
      setStats(analyticsData.data);

      // Fetch calls to compute direction breakdown over time
      try {
        const params = { limit: 10000 };
        if (userId) {
          params.userId = userId;
        }
        const callsResponse = await callAPI.getAllCalls(params);
        const calls = callsResponse.data?.calls || [];
        
        // Group calls by hour of the day
        const hourGroups = {};
        for (let i = 9; i <= 16; i++) {
          hourGroups[i] = { incoming: 0, outgoing: 0 };
        }
        
        calls.forEach((call) => {
          if (call.startTime) {
            const callDate = new Date(call.startTime);
            const hour = callDate.getHours();
            if (hour >= 9 && hour <= 16) {
              if (call.direction === 'inbound') {
                hourGroups[hour].incoming += 1;
              } else {
                hourGroups[hour].outgoing += 1;
              }
            }
          }
        });
        
        // Convert to array format for chart
        const timeData = [];
        for (let i = 9; i <= 16; i++) {
          const hour = i;
          const period = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
          timeData.push({
            time: period,
            hour: hour,
            incoming: hourGroups[hour].incoming,
            outgoing: hourGroups[hour].outgoing,
          });
        }
        
        setDirectionTimeData(timeData);
      } catch (dirErr) {
        console.warn('Error fetching call directions:', dirErr);
        setDirectionTimeData([]);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs from real data
  const calculateKPIs = () => {
    if (!stats || !stats.overview) return [];

    const overview = stats.overview;
    const totalCalls = overview.totalCalls || 0;
    const successfulCalls = overview.successfulCalls || 0;
    const failedCalls = overview.failedCalls || 0;
    const avgDuration = overview.averageDuration || 0;

    const formatDuration = (seconds) => {
      if (!seconds) return '0s';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}m ${secs}s`;
    };

    return [
      { title: 'Total Calls', value: totalCalls.toLocaleString(), icon: FaPhone, color: 'bg-blue-500' },
      { title: 'Campaign Completed', value: successfulCalls.toLocaleString(), icon: FaCheckCircle, color: 'bg-green-500' },
      { title: 'Failed', value: failedCalls.toLocaleString(), icon: FaTimesCircle, color: 'bg-red-500' },
      { title: 'Avg Duration', value: formatDuration(avgDuration), icon: FaClock, color: 'bg-purple-500' },
    ];
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (!stats || !stats.overview) return [];

    const overview = stats.overview;
    const byStatus = overview.byStatus || {};

    return [
      { name: 'Campaign Completed', value: (byStatus['completed'] || 0) + (byStatus['user-ended'] || 0) + (byStatus['agent-ended'] || 0), color: '#4CAF50' },
      { name: 'Failed', value: (byStatus['failed'] || 0) + (byStatus['no-answer'] || 0) + (byStatus['busy'] || 0), color: '#F44336' },
      { name: 'In Progress', value: byStatus['in-progress'] || 0, color: '#FF9800' },
      { name: 'Initiated', value: byStatus['initiated'] || 0, color: '#9E9E9E' },
    ];
  };

  if (loading && !stats) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const kpiData = calculateKPIs();
  const statusDistributionData = prepareChartData();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Analytics & Reports
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Detailed insights into your calling campaigns
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    {kpi.title}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {kpi.value}
                  </p>
                </div>
                <div className={`${kpi.color} p-3 sm:p-4 rounded-lg`}>
                  <Icon className="text-white" size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Incoming vs Outgoing Calls Over Time */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">
            Incoming vs Outgoing Calls
          </h3>
          {directionTimeData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-gray-500 dark:text-gray-400 text-sm">
              No call direction data available.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={directionTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#6b7280" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
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
                    dataKey="outgoing"
                    stroke="#1E88E5"
                    strokeWidth={3}
                    dot={{ fill: '#1E88E5', r: 5 }}
                    name="Outgoing"
                  />
                  <Line
                    type="monotone"
                    dataKey="incoming"
                    stroke="#43A047"
                    strokeWidth={3}
                    dot={{ fill: '#43A047', r: 5 }}
                    name="Incoming"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 flex justify-center gap-6 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1E88E5' }}></span>
                  <span className="text-gray-700 dark:text-gray-300">Outgoing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#43A047' }}></span>
                  <span className="text-gray-700 dark:text-gray-300">Incoming</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">
            Call Status Distribution
          </h3>
          <div className="w-full">
            {/* Mobile: Legend on left, chart on right */}
            <div className="block sm:hidden">
              <div className="flex items-center gap-4">
                {/* Legend on left */}
                <div className="flex-1">
                  <div className="flex flex-col gap-3">
                    {statusDistributionData.map((entry, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {entry.name}: {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Chart on right */}
                <div className="flex-shrink-0" style={{ width: '150px', height: '150px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            {/* Desktop: Chart on top, legend below */}
            <div className="hidden sm:block">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Desktop: Show legend below chart */}
              <div className="flex justify-center mt-4">
                <div className="flex flex-wrap justify-center gap-4">
                  {statusDistributionData.map((entry, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Analytics;
