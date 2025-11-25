import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  FaCoins,
  FaTimes
} from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiPhoneCall } from 'react-icons/fi';
import { analyticsAPI, wsAPI, campaignAPI, creditsAPI } from '../services/api';
import { useDashboardWebSocket } from '../hooks/useDashboardWebSocket';

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [wsStats, setWsStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsTotal, setCampaignsTotal] = useState(0);
  const [creditBalance, setCreditBalance] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [downloadingContacts, setDownloadingContacts] = useState(false);

  // Get user ID for WebSocket connection
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user._id || user.id;

  // Handle dashboard data updates from WebSocket
  const handleDashboardUpdate = (data) => {
    console.log('📊 Updating dashboard with WebSocket data');
    setDashboardData(data);
    setLoading(false);
  };

  // Initialize WebSocket connection for real-time updates
  const { isConnected, error: wsError, refreshDashboard } = useDashboardWebSocket(userId, handleDashboardUpdate);

  // Initial data fetch - WebSocket will handle updates after this
  useEffect(() => {
    fetchAdditionalData();
  }, []);

  const handleDownloadContacts = async () => {
    if (!campaignDetails) return;
    try {
      setDownloadingContacts(true);

      // Fetch all contacts for the campaign with pagination
      let allContacts = [];
      let page = 1;
      let hasMore = true;
      const limit = 10000;

      while (hasMore) {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/campaigns/${campaignDetails._id}/contacts?page=${page}&limit=${limit}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch campaign contacts');
        }

        const data = await response.json();
        const contacts = data?.data?.contacts || [];
        allContacts = [...allContacts, ...contacts];

        const totalPages = data?.data?.pages || 1;
        hasMore = page < totalPages;
        page++;
      }

      if (allContacts.length === 0) {
        alert('No contacts available to download for this campaign.');
        return;
      }

      // Create CSV
      const csvRows = ['Phone Number,Name,Status'];
      allContacts.forEach((contact) => {
        const phoneNumber = contact.phoneNumber || '';
        const name = contact.name || '';
        const status = contact.status || '';
        csvRows.push(`${phoneNumber},"${name}",${status}`);
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campaign-${campaignDetails.name || campaignDetails._id}-contacts.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading contacts:', error);
      alert('Failed to download contact details. Please try again.');
    } finally {
      setDownloadingContacts(false);
    }
  };

  // Fetch additional data (campaigns, credits, ws stats) that aren't part of WebSocket
  const fetchAdditionalData = async () => {
    try {
      setError(null);

      // Fetch campaigns, credits, and WebSocket stats (not part of dashboard WebSocket)
      const results = await Promise.allSettled([
        // Fetch WebSocket stats for real-time metrics
        wsAPI.getStats().catch(err => {
          console.warn('WebSocket stats not available:', err);
          return null;
        }),
        // Fetch all campaigns
        campaignAPI.list().then(res => {
          const campaignsData = res.data;
          if (Array.isArray(campaignsData)) {
            return { campaigns: campaignsData, total: campaignsData.length };
          } else if (campaignsData && Array.isArray(campaignsData.campaigns)) {
            return { campaigns: campaignsData.campaigns, total: campaignsData.total || campaignsData.campaigns.length };
          } else {
            console.warn('Campaigns response is not an array:', campaignsData);
            return { campaigns: [], total: 0 };
          }
        }).catch(err => {
          console.warn('Campaigns data not available:', err);
          return { campaigns: [], total: 0 };
        }),
        // Fetch credit balance
        creditsAPI.getBalance().then(res => res.data?.credits || 0).catch(err => {
          console.warn('Credit balance not available:', err);
          return 0;
        }),
      ]);

      // Set data from results
      if (results[0].status === 'fulfilled' && results[0].value) {
        setWsStats(results[0].value);
      }
      if (results[1].status === 'fulfilled') {
        const campaignsResult = results[1].value || { campaigns: [], total: 0 };
        setCampaigns(campaignsResult.campaigns || []);
        if (campaignsResult.total !== undefined) {
          setCampaignsTotal(campaignsResult.total);
        }
      }
      if (results[2].status === 'fulfilled') {
        setCreditBalance(results[2].value);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || err.message?.includes('timeout')) {
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
      // Always set loading to false, even if there are errors
      setLoading(false);
    }
  };

  // Calculate KPIs from analytics data
  const calculateKPIs = () => {
    const campaignsArray = Array.isArray(campaigns) ? campaigns : [];
    // Use total from backend if available, otherwise fall back to array length
    const totalCampaigns = campaignsTotal > 0 ? campaignsTotal : campaignsArray.length || 0;
    const activeCampaigns = campaignsArray.filter(c => c.status === 'active' || c.status === 'running').length || 0;

    // Get data from unified dashboard analytics
    // Backend returns { overview: { totalCalls, ... }, ... }
    const totalCalls = dashboardData?.overview?.totalCalls || dashboardData?.totalCalls || 0;
    const completedCalls = dashboardData?.overview?.successfulCalls || dashboardData?.completedCalls || 0;
    
    // Debug logging
    if (dashboardData) {
      console.log('📊 Dashboard data in calculateKPIs:', dashboardData);
      console.log('📊 Total calls:', totalCalls);
      console.log('📊 Overview object:', dashboardData.overview);
    }

    // Use actual credit balance from API
    const credits = creditBalance !== null ? creditBalance : 0;
    const isLowCredits = credits < 100 && credits > 0;
    const isNoCredits = credits <= 0;

    // Calculate percentage changes
    // Get previous day's data from localStorage (stored on previous load)
    const previousDataKey = 'dashboard_previous_data';
    const previousData = JSON.parse(localStorage.getItem(previousDataKey) || '{}');
    const today = new Date().toDateString();
    const storedDate = previousData.date || '';

    // Calculate percentage change helper
    const calculateChange = (current, previous) => {
      if (previous === undefined || previous === null || previous === '') {
        return 'N/A';
      }
      if (previous === 0) {
        return current > 0 ? '+100%' : '0%';
      }
      const change = ((current - previous) / previous) * 100;
      const sign = change >= 0 ? '+' : '';
      return `${sign}${change.toFixed(1)}%`;
    };

    const calculateTrend = (current, previous) => {
      if (previous === undefined || previous === null || previous === '') return 'neutral';
      if (previous === 0) return current > 0 ? 'up' : 'neutral';
      return current >= previous ? 'up' : 'down';
    };

    // Get previous values for comparison (only if stored date is different from today)
    const prevTotalCampaigns = storedDate && storedDate !== today ? (previousData.totalCampaigns || 0) : 0;
    const prevActiveCampaigns = storedDate && storedDate !== today ? (previousData.activeCampaigns || 0) : 0;
    const prevTotalCalls = storedDate && storedDate !== today ? (previousData.totalCalls || 0) : 0;

    // Calculate changes
    const campaignsChange = calculateChange(totalCampaigns, prevTotalCampaigns);
    const activeCampaignsChange = calculateChange(activeCampaigns, prevActiveCampaigns);
    const callsChange = calculateChange(totalCalls, prevTotalCalls);

    // Store current data for next comparison
    localStorage.setItem(previousDataKey, JSON.stringify({
      date: today,
      totalCampaigns,
      activeCampaigns,
      totalCalls,
    }));

    return [
      {
        title: 'Total Campaigns',
        value: totalCampaigns.toLocaleString(),
        change: campaignsChange,
        trend: calculateTrend(totalCampaigns, prevTotalCampaigns),
        icon: FaBullseye,
        color: 'bg-blue-500',
      },
      {
        title: 'Active Campaigns',
        value: activeCampaigns.toLocaleString(),
        change: activeCampaignsChange,
        trend: calculateTrend(activeCampaigns, prevActiveCampaigns),
        icon: FaPlay,
        color: 'bg-green-500',
      },
      {
        title: 'Total Calls',
        value: totalCalls.toLocaleString(),
        change: callsChange,
        trend: calculateTrend(totalCalls, prevTotalCalls),
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
    if (!dashboardData) {
      console.log('No dashboard data available');
      return { callOutcomeData: [], callsOverTimeData: [] };
    }

    console.log('Preparing chart data from:', dashboardData);

    // Extract from overview object (new optimized format)
    const totalCalls = dashboardData?.overview?.totalCalls || dashboardData?.totalCalls || 0;
    const completedCalls = dashboardData?.overview?.successfulCalls || dashboardData?.completedCalls || 0;
    const failedCalls = dashboardData?.overview?.failedCalls || dashboardData?.failedCalls || 0;
    const inProgressCalls = dashboardData?.overview?.inProgressCalls || dashboardData?.inProgressCalls || 0;

    const callOutcomeData = [
      { name: 'Total Calls', value: totalCalls, color: '#2196F3' },
      { name: 'Completed', value: completedCalls, color: '#4CAF50' },
      { name: 'In Progress', value: inProgressCalls, color: '#FF9800' },
      { name: 'Failed', value: failedCalls, color: '#F44336' },
    ];

    // Always show last 7 days data
    // Generate last 7 days labels and dates
    const getLast7Days = () => {
      const days = [];
      const dates = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        date.setHours(0, 0, 0, 0); // Normalize to start of day
        dates.push(date);

        // Format date to match backend format (MMM D)
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        const label = `${month} ${day}`;
        days.push(label);
      }
      return { labels: days, dates };
    };

    const { labels: last7DaysLabels, dates: last7DaysDates } = getLast7Days();
    let callsOverTimeData = [];

    // Process API data if available
    if (dashboardData?.trends?.callsOverTime) {
      const { labels, data } = dashboardData.trends.callsOverTime;

      console.log('📊 Backend labels:', labels);
      console.log('📊 Backend data:', data);
      console.log('📊 Frontend last7DaysLabels:', last7DaysLabels);

      // Create a map of formatted labels to call counts from API data
      // Backend sends labels like "Nov 19", "Nov 20", etc.
      const apiDataMap = new Map();
      labels.forEach((label, index) => {
        console.log(`  API Map adding: "${label}" → ${data[index]} calls`);
        apiDataMap.set(label, data[index] || 0);
      });

      console.log('📊 apiDataMap size:', apiDataMap.size);
      console.log('📊 apiDataMap keys:', Array.from(apiDataMap.keys()));

      // Map last 7 days to API data by matching labels
      callsOverTimeData = last7DaysLabels.map((label, index) => {
        // Try to find matching data by label
        let calls = apiDataMap.get(label) || 0;
        console.log(`  Matching "${label}" (length: ${label.length}): ${calls} calls (found: ${apiDataMap.has(label)})`);

        return {
          time: label,
          calls: calls
        };
      });
    } else if (dashboardData?.callTrends && Array.isArray(dashboardData.callTrends)) {
      // Process old format - aggregate to last 7 days
      const apiDataMap = new Map();
      dashboardData.callTrends.forEach((item) => {
        const date = new Date(item.time || item.date || item.label);
        if (!isNaN(date.getTime())) {
          date.setHours(0, 0, 0, 0);
          const dateKey = date.toISOString().split('T')[0];
          apiDataMap.set(dateKey, (apiDataMap.get(dateKey) || 0) + (item.calls || item.value || 0));
        }
      });

      callsOverTimeData = last7DaysDates.map((date, index) => {
        const dateKey = date.toISOString().split('T')[0];
        return {
          time: last7DaysLabels[index],
          calls: apiDataMap.get(dateKey) || 0
        };
      });
    } else {
      // Show last 7 days with mock data distribution
      const dailyDistribution = [0.08, 0.12, 0.15, 0.18, 0.14, 0.16, 0.17]; // Distribution across 7 days
      callsOverTimeData = last7DaysLabels.map((day, index) => ({
        time: day,
        calls: Math.floor(totalCalls * dailyDistribution[index])
      }));
    }

    console.log('Chart data prepared:', { callOutcomeData, callsOverTimeData });

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
            onClick={() => {
              refreshDashboard();
              fetchAdditionalData();
            }}
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

  // Get recent campaigns (limit to 4 most recent, regardless of status)
  const recentCampaigns = campaigns
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.startDate || a.updatedAt || 0);
      const dateB = new Date(b.createdAt || b.startDate || b.updatedAt || 0);
      return dateB - dateA; // Most recent first
    })
    .slice(0, 4)
    .map((campaign) => ({
      id: campaign._id || campaign.id,
      name: campaign.name,
      completed: campaign.completedCalls || 0,
      total: campaign.totalContacts || campaign.phoneNumbers?.length || 0,
      status: campaign.status || 'pending',
      createdAt: campaign.createdAt || campaign.startDate,
      userName: campaign.userId?.name || campaign.userName || 'Demo user',
    }));

  const credits = creditBalance !== null ? creditBalance : 0;
  const isLowCredits = credits < 100 && credits > 0;
  const isNoCredits = credits <= 0;

  const handleCampaignClick = async (campaignId) => {
    try {
      setLoadingDetails(true);
      setSelectedCampaign(campaignId);
      setShowCampaignModal(true);
      
      // Fetch campaign details
      const response = await campaignAPI.get(campaignId);
      const campaignData = response.data || response;
      setCampaignDetails(campaignData);
    } catch (err) {
      console.error('Error fetching campaign details:', err);
      // Still show modal with basic info from the campaign list
      const campaign = campaigns.find(c => (c._id || c.id) === campaignId);
      if (campaign) {
        setCampaignDetails(campaign);
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Live Voice AI Operations</span>
          </div>
          {/* WebSocket connection status */}
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${
            isConnected
              ? 'bg-blue-500/10 text-blue-700 border-blue-100'
              : 'bg-gray-500/10 text-gray-700 border-gray-100'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'}`} />
            <span>{isConnected ? 'Live Updates' : 'Connecting...'}</span>
          </div>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
            Realtime Overview
          </h1>
          <p className="mt-2 text-sm text-zinc-500 max-w-xl">
            Real-time insights into your voice AI operations.
          </p>
        </div>
      </div>

      {/* Credit Warning Banner */}
      {isNoCredits && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80">
          <div className="flex items-center">
            <FaCoins className="text-red-500 mr-3" size={24} />
            <div>
              <h3 className="text-red-800 font-semibold">No Credits Available</h3>
              <p className="text-red-600 text-sm mt-1">
                Your account has run out of credits. You cannot make or receive calls until credits are added.
                Please contact your administrator to add credits to your account.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLowCredits && (
        <div className="glass-card border-l-4 border-amber-400/80 bg-amber-50/80">
          <div className="flex items-center">
            <FaCoins className="text-yellow-500 mr-3" size={24} />
            <div>
              <h3 className="text-yellow-800 font-semibold">Low Credit Balance</h3>
              <p className="text-yellow-600 text-sm mt-1">
                You have {credits} credits remaining. Consider adding more credits to avoid service interruption.
                (1 credit = 1 second of call time)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          const isCredit = kpi.title === 'Credit Balance';
          const changeColor = kpi.trend === 'up' ? 'text-emerald-500' : 'text-red-500';
          const isEmerald = kpi.title === 'Active Campaigns' || kpi.title === 'Credit Balance';
          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient"
            >
              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                      {kpi.title}
                    </p>
                    <div className={`text-xl font-semibold tabular-nums ${
                      kpi.warning ? "text-red-500" : "text-zinc-900"
                    }`}>
                      {kpi.value}
                    </div>
                  </div>
                  <div
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white ${
                      isEmerald && "border-emerald-200 bg-gradient-to-br from-emerald-100 to-teal-100"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isEmerald ? "text-emerald-500" : "text-zinc-500"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Campaigns as live wave cards + FAQ/Terms */}
      {recentCampaigns.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-200/70 px-6 py-4 md:px-6 md:py-5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-sm">
                  ●
                </div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  Recent Campaigns
                </h2>
              </div>
              <p className="text-xs md:text-sm text-zinc-500">
                Latest campaigns sorted by creation date
              </p>
            </div>
            <div className="px-4 pb-4 pt-3 md:px-6 md:pt-4 md:pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {recentCampaigns.slice(0, 4).map((campaign, index) => (
                  <LiveCampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    index={index}
                    onClick={() => handleCampaignClick(campaign.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* FAQ Card */}
            <div className="glass-card p-4 flex flex-col min-h-[180px]">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <FaFileAlt className="text-emerald-500" size={18} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  FAQ
                </h3>
              </div>
              <p className="text-sm text-zinc-500 mb-3">
                Common questions about AI Calling Agent
              </p>
              <button
                className="mt-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 text-sm font-medium text-zinc-950 hover:brightness-105 transition-all"
              >
                <FaDownload size={14} />
                <span>Download FAQ PDF</span>
              </button>
            </div>

            {/* Terms & Conditions Card */}
            <div className="glass-card p-4 flex flex-col min-h-[180px]">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <FaFileAlt className="text-emerald-500" size={18} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  Terms & Conditions
                </h3>
              </div>
              <p className="text-sm text-zinc-500 mb-3">
                Latest policy and compliance guidelines
              </p>
              <button
                className="mt-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 text-sm font-medium text-zinc-950 hover:brightness-105 transition-all"
              >
                <FaDownload size={14} />
                <span>Download Terms PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Call Outcome Funnel */}
        <div className="glass-panel p-4 md:p-5">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4">
            Call Outcome Breakdown
          </h3>
          {callOutcomeData && callOutcomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={callOutcomeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#71717a" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#71717a" 
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-zinc-500 text-xs">
              No data available
            </div>
          )}
        </div>

        {/* Calls Over Time - Last 7 Days */}
        <div className="glass-panel p-4 md:p-5">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4">
            Calls - Last 7 Days
          </h3>
          {callsOverTimeData && callsOverTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={callsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="time" 
                  stroke="#71717a" 
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickMargin={8}
                />
                <YAxis 
                  stroke="#71717a" 
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 3.5 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-zinc-500 text-xs">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Campaign Details Modal */}
      {showCampaignModal && createPortal(
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            zIndex: 1000
          }}
          onClick={() => {
            setShowCampaignModal(false);
            setSelectedCampaign(null);
            setCampaignDetails(null);
          }}
        >
          <div 
            className="glass-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white border border-zinc-200" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'relative', 
              zIndex: 1001,
              margin: 'auto'
            }}
          >
            <div className="p-6 border-b border-zinc-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Campaign Details
                </h2>
                <button
                  onClick={() => {
                    setShowCampaignModal(false);
                    setSelectedCampaign(null);
                    setCampaignDetails(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  <FaTimes size={16} />
                </button>
              </div>
            </div>

            {loadingDetails ? (
              <div className="p-6 flex items-center justify-center">
                <FaSpinner className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : campaignDetails ? (
              <div className="p-6 space-y-6">
                {/* Campaign Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Campaign ID</p>
                      <p className="text-sm font-semibold text-zinc-900">{campaignDetails._id || campaignDetails.id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Campaign Name</p>
                      <p className="text-sm font-semibold text-zinc-900">{campaignDetails.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Created At</p>
                      <p className="text-sm text-zinc-700">
                        {campaignDetails.createdAt 
                          ? new Date(campaignDetails.createdAt).toLocaleString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric', 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Start Time</p>
                      <p className="text-sm text-zinc-700">
                        {campaignDetails.startedAt || campaignDetails.startTime || campaignDetails.startDate
                          ? new Date(campaignDetails.startedAt || campaignDetails.startTime || campaignDetails.startDate).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">End Time</p>
                      <p className="text-sm text-zinc-700">
                        {campaignDetails.completedAt || campaignDetails.endTime || campaignDetails.endDate
                          ? new Date(campaignDetails.completedAt || campaignDetails.endTime || campaignDetails.endDate).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Status</p>
                      <div>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          campaignDetails.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : campaignDetails.status === 'paused'
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : campaignDetails.status === 'completed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-zinc-50 text-zinc-700 border border-zinc-200'
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {campaignDetails.status ? campaignDetails.status.charAt(0).toUpperCase() + campaignDetails.status.slice(1) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Total Numbers</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {campaignDetails.totalContacts || campaignDetails.phoneNumbers?.length || campaignDetails.liveStats?.totalNumbers || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Completed Calls</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {campaignDetails.completedCalls || campaignDetails.liveStats?.completed || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Failed Calls</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {campaignDetails.failedCalls || campaignDetails.liveStats?.failed || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Download Contact Details Button */}
                <button
                  onClick={handleDownloadContacts}
                  disabled={downloadingContacts}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {downloadingContacts ? (
                    <>
                      <FaSpinner className="animate-spin" size={16} />
                      <span>Preparing...</span>
                    </>
                  ) : (
                    <>
                      <FaDownload size={16} />
                      <span>Download Contact Details</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-6 text-center text-zinc-500">
                No campaign details available
              </div>
            )}

            <div className="p-6 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => {
                  setShowCampaignModal(false);
                  setSelectedCampaign(null);
                  setCampaignDetails(null);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        ,
        document.body
      )}
    </div>
  );
};

function LiveCampaignCard({ campaign, index, onClick }) {
  const totalCalls = campaign.total || 0;
  const startTime = campaign.createdAt 
    ? new Date(campaign.createdAt).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : 'N/A';

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm shadow-slate-200/80 transition-all duration-200 hover:border-emerald-300 hover:shadow-emerald-100 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600">
            {campaign.name?.charAt(0) ?? "C"}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-900">
              {campaign.name}
            </p>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div className="mt-3">
        <Waveform />
      </div>

      {/* Bottom row */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <FiPhoneCall className="h-3 w-3 text-emerald-500" />
          <span>{totalCalls}</span>
        </div>
        <span className="text-slate-500 font-medium">
          {startTime}
        </span>
      </div>
    </div>
  );
}

function Waveform() {
  return (
    <div className="flex items-end gap-0.5 h-10 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => {
        // Create varying base heights for each bar (20% to 60%)
        const baseHeight = 20 + (i % 8) * 5;
        return (
          <div
            key={i}
            className="wave-bar"
            style={{
              height: `${baseHeight}%`,
              animationDelay: `${i * 0.03}s`,
              animationDuration: `${1.5 + (i % 3) * 0.3}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default DashboardOverview;
