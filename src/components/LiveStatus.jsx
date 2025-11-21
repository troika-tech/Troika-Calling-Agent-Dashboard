import React, { useEffect, useState } from 'react';
import { FaSpinner, FaPlay, FaPause, FaCheckCircle, FaTimesCircle, FaPhone, FaClock, FaUsers, FaSyncAlt } from 'react-icons/fa';
import { campaignAPI, callAPI, wsAPI } from '../services/api';

const LiveStatus = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLiveStatus = async () => {
    try {
      setError(null);

      // Fetch system stats for real-time metrics
      try {
        const statsResponse = await wsAPI.getStats();
        setSystemStats(statsResponse.data);
      } catch (err) {
        console.warn('System stats not available:', err);
      }

      // Get all campaigns
      const campaignsResponse = await campaignAPI.list();
      // Ensure we always get an array
      const campaignsData = campaignsResponse.data;
      let allCampaigns = [];
      if (Array.isArray(campaignsData)) {
        allCampaigns = campaignsData;
      } else if (campaignsData && Array.isArray(campaignsData.campaigns)) {
        allCampaigns = campaignsData.campaigns;
      }

      // Filter only active/running campaigns
      const activeCampaigns = allCampaigns.filter(
        campaign => campaign.status === 'active' || campaign.status === 'running'
      );
      
      // Fetch detailed stats for each active campaign
      const campaignsWithStats = await Promise.all(
        activeCampaigns.map(async (campaign) => {
          try {
            // Get debug info for detailed stats
            const debugResponse = await fetch(
              `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/campaigns/${campaign._id}/debug`
            );
            
            if (debugResponse.ok) {
              const debugData = await debugResponse.json();
              return {
                ...campaign,
                liveStats: {
                  activeCalls: debugData.debugInfo?.stats?.activeCallsCount || 0,
                  queueLength: debugData.debugInfo?.stats?.queueLength || 0,
                  completed: debugData.debugInfo?.stats?.completedCalls || campaign.completedCalls || 0,
                  failed: debugData.debugInfo?.stats?.failedCalls || campaign.failedCalls || 0,
                  processed: debugData.debugInfo?.stats?.processedNumbers || 0,
                  remaining: debugData.debugInfo?.stats?.remainingNumbers || 0,
                  totalNumbers: debugData.debugInfo?.stats?.totalNumbers || campaign.phoneNumbers?.length || 0,
                }
              };
            }
          } catch (err) {
            console.warn(`Failed to fetch debug info for campaign ${campaign._id}:`, err);
          }
          
          // Fallback to basic campaign data
          return {
            ...campaign,
            liveStats: {
              activeCalls: 0,
              queueLength: 0,
              completed: campaign.completedCalls || 0,
              failed: campaign.failedCalls || 0,
              processed: (campaign.completedCalls || 0) + (campaign.failedCalls || 0),
              remaining: (campaign.phoneNumbers?.length || 0) - ((campaign.completedCalls || 0) + (campaign.failedCalls || 0)),
              totalNumbers: campaign.phoneNumbers?.length || 0,
            }
          };
        })
      );
      
      setCampaigns(campaignsWithStats);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching live status:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || !err.response) {
        setError('Backend server is not running. Please start the server (node server.js).');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load live status');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchLiveStatus, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const getProgressPercentage = (campaign) => {
    const { processed, totalNumbers } = campaign.liveStats || {};
    if (!totalNumbers || totalNumbers === 0) return 0;
    return Math.round((processed / totalNumbers) * 100);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'running': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'paused': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'stopped': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    
    return (
      <span
        className={`px-2 sm:px-3 py-0.5 sm:py-1 inline-flex text-xs leading-tight sm:leading-5 font-semibold rounded-full whitespace-nowrap w-fit self-start ${
          styles[status] || styles.stopped
        }`}
      >
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </span>
    );
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">Loading live status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 lg:pr-48">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Live Campaign Status
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Real-time monitoring of active campaigns and call progress
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:mt-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-lg border transition-colors text-sm sm:text-base ${
              autoRefresh
                ? 'bg-primary-500 hover:bg-primary-600 text-white border-primary-500'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <FaSyncAlt className={autoRefresh ? 'animate-spin' : ''} />
            <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
          </button>
          <button
            onClick={fetchLiveStatus}
            className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base"
          >
            <FaSyncAlt />
            <span>Refresh Now</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
          <p className="text-sm sm:text-base text-red-800 dark:text-red-200 font-medium">Error loading live status</p>
          <p className="text-xs sm:text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
          <button
            onClick={fetchLiveStatus}
            className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm sm:text-base"
          >
            Retry
          </button>
        </div>
      )}

      {/* System Stats Card */}
      {systemStats && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">System Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2 mb-2">
                <FaPhone className="text-blue-600 dark:text-blue-400" size={16} />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Active Calls</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {systemStats.activeCalls || 0}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2 mb-2">
                <FaClock className="text-green-600 dark:text-green-400" size={16} />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Uptime</span>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {systemStats.uptime ? Math.floor(systemStats.uptime / 3600) + 'h' : 'N/A'}
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center space-x-2 mb-2">
                <FaUsers className="text-purple-600 dark:text-purple-400" size={16} />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Memory</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {systemStats.memory?.used || 0}MB
              </p>
            </div>
            <div className={`rounded-lg p-4 border ${
              systemStats.deepgramPool?.status === 'healthy'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : systemStats.deepgramPool?.status === 'critical'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <FaSyncAlt className={
                  systemStats.deepgramPool?.status === 'healthy'
                    ? 'text-green-600 dark:text-green-400'
                    : systemStats.deepgramPool?.status === 'critical'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                } size={16} />
                <span className={`text-sm font-medium ${
                  systemStats.deepgramPool?.status === 'healthy'
                    ? 'text-green-700 dark:text-green-300'
                    : systemStats.deepgramPool?.status === 'critical'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-yellow-700 dark:text-yellow-300'
                }`}>Pool Status</span>
              </div>
              <p className={`text-2xl font-bold ${
                systemStats.deepgramPool?.status === 'healthy'
                  ? 'text-green-900 dark:text-green-100'
                  : systemStats.deepgramPool?.status === 'critical'
                  ? 'text-red-900 dark:text-red-100'
                  : 'text-yellow-900 dark:text-yellow-100'
              }`}>
                {systemStats.deepgramPool?.utilization
                  ? Math.round(systemStats.deepgramPool.utilization) + '%'
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-12 text-center">
          <FaPhone className="text-gray-400 dark:text-gray-500 mx-auto mb-4" size={48} />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Active Campaigns
          </h3>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            There are currently no campaigns running. Start a campaign to see live status here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {campaigns.map((campaign) => {
            const stats = campaign.liveStats || {};
            const progress = getProgressPercentage(campaign);
            
            return (
              <div
                key={campaign._id}
                className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Campaign Header */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-gray-700 dark:to-gray-800">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white break-words pr-2">
                          {campaign.name}
                        </h2>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-mono break-all">
                        ID: {campaign._id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="p-4 sm:p-6">
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        Campaign Progress
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-primary-600 dark:text-primary-400">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3">
                      <div
                        className="bg-primary-500 h-2 sm:h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Processed: {stats.processed || 0} / {stats.totalNumbers || 0}
                      </span>
                      <span>Remaining: {stats.remaining || 0}</span>
                    </div>
                  </div>

                  {/* Live Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
                    {/* Active Calls */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                        <FaPhone className="text-blue-600 dark:text-blue-400" size={16} />
                        <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                          Active Calls
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {stats.activeCalls || 0}
                      </p>
                    </div>

                    {/* Queue Length */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 sm:p-4 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                        <FaClock className="text-yellow-600 dark:text-yellow-400" size={16} />
                        <span className="text-xs sm:text-sm font-medium text-yellow-700 dark:text-yellow-300">
                          Queue
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                        {stats.queueLength || 0}
                      </p>
                    </div>

                    {/* Completed */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                        <FaCheckCircle className="text-green-600 dark:text-green-400" size={16} />
                        <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">
                          Completed
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">
                        {stats.completed || 0}
                      </p>
                    </div>

                    {/* Failed */}
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 sm:p-4 border border-red-200 dark:border-red-800">
                      <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                        <FaTimesCircle className="text-red-600 dark:text-red-400" size={16} />
                        <span className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300">
                          Failed
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-red-900 dark:text-red-100">
                        {stats.failed || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LiveStatus;

