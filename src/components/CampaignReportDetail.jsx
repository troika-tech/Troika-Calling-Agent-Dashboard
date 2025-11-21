import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaPhone, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock, 
  FaDollarSign,
  FaPlay,
  FaCircle,
  FaRedo,
  FaDownload,
  FaFilter,
  FaCalendar,
  FaSpinner,
  FaChevronDown,
  FaSearch
} from 'react-icons/fa';
import { campaignAPI, callAPI } from '../services/api';

const CampaignReportDetail = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [callLogs, setCallLogs] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Filters for Analytics tab
  const [phoneFilter, setPhoneFilter] = useState([]); // Changed to array for multiple selection
  const [statusFilter, setStatusFilter] = useState('');
  const [interactionFilter, setInteractionFilter] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  const [phoneFilterOpen, setPhoneFilterOpen] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [allPhoneNumbers, setAllPhoneNumbers] = useState([]);
  const [tempSelectedPhones, setTempSelectedPhones] = useState([]);
  const phoneFilterRef = useRef(null);
  const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);
  const [transcriptCall, setTranscriptCall] = useState(null);

  useEffect(() => {
    fetchCampaignDetails();
  }, [campaignId]);

  // Fetch all unique phone numbers from call logs
  useEffect(() => {
    if (callLogs.length > 0) {
      const uniquePhones = [...new Set(callLogs.map(call => call.phoneNumber).filter(Boolean))].sort();
      setAllPhoneNumbers(uniquePhones);
    }
  }, [callLogs]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (phoneFilterRef.current && !phoneFilterRef.current.contains(event.target)) {
        setPhoneFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch campaign details
      const campaignResponse = await campaignAPI.get(campaignId);
      setCampaign(campaignResponse.data);

      // Fetch debug info for detailed stats and call logs
      const debugResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/campaigns/${campaignId}/debug`
      );

      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        setStats(debugData.debugInfo?.stats || {});
        
        // Fetch all call logs for this campaign
        try {
          // Get user from localStorage
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const userId = user._id || user.id;

          const params = { limit: 1000 };
          if (userId) {
            params.userId = userId;
          }

          const callsResponse = await callAPI.getAllCalls(params);
          const allCalls = callsResponse.data?.calls || [];
          const campaignCalls = allCalls.filter(
            call => {
              const callCampaignId = call.customParameters?.campaignId;
              return callCampaignId?.toString() === campaignId || callCampaignId === campaignId;
            }
          );
          setCallLogs(campaignCalls);
        } catch (callErr) {
          console.warn('Error fetching call logs:', callErr);
          // Use recent call logs from debug data as fallback
          const allCallLogs = debugData.debugInfo?.recentCallLogs || [];
          setCallLogs(allCallLogs);
        }
      } else {
        // Fallback: try to get calls by campaign ID from customParameters
        // Get user from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user._id || user.id;

        const params = { limit: 1000 };
        if (userId) {
          params.userId = userId;
        }

        const callsResponse = await callAPI.getAllCalls(params);
        const allCalls = callsResponse.data?.calls || [];
        const campaignCalls = allCalls.filter(
          call => call.customParameters?.campaignId === campaignId ||
                  call.customParameters?.campaignId?.toString() === campaignId
        );
        setCallLogs(campaignCalls);
      }
    } catch (err) {
      console.error('Error fetching campaign details:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const getCreditsUsed = () => {
    return campaign?.stats?.completed ?? campaign?.completedCalls ?? 0;
  };

  const calculateStats = () => {
    if (!campaign && !stats) return null;

    const totalCalls = campaign?.phoneNumbers?.length || stats?.totalNumbers || 0;
    const completed = campaign?.completedCalls || stats?.completedCalls || 0;
    const failed = campaign?.failedCalls || stats?.failedCalls || 0;
    const pickedUp = callLogs.filter(call => 
      call.status === 'completed' || call.status === 'in-progress'
    ).length;
    const pickupRate = totalCalls > 0 ? ((pickedUp / totalCalls) * 100).toFixed(0) : 0;
    
    // Calculate not reachable
    const notReachable = callLogs.filter(call => 
      call.status === 'no-answer' || call.status === 'busy' || call.status === 'failed'
    ).length;
    const noAnswer = callLogs.filter(call => call.status === 'no-answer').length;
    const busy = callLogs.filter(call => call.status === 'busy').length;
    const failedCount = callLogs.filter(call => call.status === 'failed').length;
    
    // Calculate interaction
    const noInteraction = callLogs.filter(call => 
      call.status === 'completed' && (!call.transcript || call.transcript.length === 0)
    ).length;
    
    const pending = totalCalls - completed - failed;

    return {
      totalCalls,
      completed,
      failed,
      pickedUp,
      pickupRate,
      notReachable,
      noAnswer,
      busy,
      failedCount,
      noInteraction,
      pending,
      pendingPercent: totalCalls > 0 ? ((pending / totalCalls) * 100).toFixed(0) : 0
    };
  };

  const filteredCallLogs = callLogs.filter(call => {
    if (phoneFilter && phoneFilter.length > 0 && !phoneFilter.includes(call.phoneNumber)) return false;
    if (statusFilter && call.status !== statusFilter) return false;
    if (interactionFilter) {
      const hasInteraction = call.transcript && call.transcript.length > 0;
      if (interactionFilter === 'interaction' && !hasInteraction) return false;
      if (interactionFilter === 'no-interaction' && hasInteraction) return false;
    }
    return true;
  });

  const getFilteredPhoneNumbers = () => {
    if (!phoneSearch) return allPhoneNumbers;
    return allPhoneNumbers.filter((phone) =>
      phone.toLowerCase().includes(phoneSearch.toLowerCase())
    );
  };

  const filteredPhones = getFilteredPhoneNumbers();
  const allFilteredSelected = filteredPhones.length > 0 && filteredPhones.every(phone => tempSelectedPhones.includes(phone));

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      'completed': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'no-answer': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'busy': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status || 'unknown'}
      </span>
    );
  };

  const getInteractionBadge = (call) => {
    const hasInteraction = call.transcript && call.transcript.length > 0;
    if (hasInteraction) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Interaction
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
        No Interaction
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-medium">Error loading campaign</p>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error || 'Campaign not found'}</p>
          <button
            onClick={() => navigate('/delivery-reports')}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  const calculatedStats = calculateStats();

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={() => navigate('/delivery-reports')}
          className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-indigo-300 dark:border-indigo-600 rounded-lg text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all font-semibold shadow-sm"
        >
          <FaArrowLeft />
          <span>Back to Reports</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="rounded-xl p-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-semibold rounded-lg transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-semibold rounded-lg transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {/* Campaign Summary */}
      <div className="bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Campaign: {campaign.name}
            </h1>
            <span className={`inline-block px-4 py-2 text-sm font-bold rounded-full ${
              campaign.status === 'completed' 
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                : campaign.status === 'active'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                : 'bg-gradient-to-r from-gray-400 to-gray-600 text-white'
            }`}>
              {campaign.status || 'unknown'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 border border-indigo-200 dark:border-indigo-700">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Number</span>
            <p className="font-bold text-gray-900 dark:text-white mt-1">{campaign.phoneId?.number || 'N/A'}</p>
          </div>
          <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 border border-indigo-200 dark:border-indigo-700">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Created By</span>
            <p className="font-bold text-gray-900 dark:text-white mt-1">{campaign.userId?.name || campaign.userId?.email || 'N/A'}</p>
          </div>
          <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 border border-indigo-200 dark:border-indigo-700">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Created On</span>
            <p className="font-bold text-gray-900 dark:text-white mt-1 text-xs">
              {campaign.createdAt ? new Date(campaign.createdAt).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }).replace(',', ' at') : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && calculatedStats && (
        <>
          {/* Campaign Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 flex-shrink-0">
                  <FaPhone className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {calculatedStats.totalCalls}
                  </p>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Campaign target</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 flex-shrink-0">
                  <FaPlay className="text-indigo-600 dark:text-indigo-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {calculatedStats.totalCalls}
                  </p>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Attempts made</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 flex-shrink-0">
                  <FaCheckCircle className="text-green-600 dark:text-green-400" size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {calculatedStats.pickedUp}
                    </p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">{calculatedStats.pickupRate}%</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Pickup rate</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 flex-shrink-0">
                  <FaDollarSign className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {calculatedStats.totalCalls * 10}
                  </p>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Campaign Credits</p>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Outcomes Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 flex-shrink-0">
                  <FaCheckCircle className="text-green-600 dark:text-green-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {calculatedStats.completed}
                  </p>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">High engagement</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 flex-shrink-0">
                  <FaCircle className="text-orange-600 dark:text-orange-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {calculatedStats.noInteraction}
                  </p>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">No or Minimal engagement</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-cyan-50 dark:bg-cyan-900/30 rounded-lg p-3 flex-shrink-0">
                  <FaRedo className="text-cyan-600 dark:text-cyan-400" size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {calculatedStats.pending}
                    </p>
                    <p className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{calculatedStats.pendingPercent}%</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Remaining</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 flex-shrink-0">
                  <FaTimesCircle className="text-red-600 dark:text-red-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {calculatedStats.notReachable}
                  </p>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Failed calls</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-md border-2 border-blue-200 dark:border-blue-800 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="relative" ref={phoneFilterRef}>
                <label className="block text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  Filter Phone Number
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneFilterOpen(!phoneFilterOpen);
                    if (!phoneFilterOpen) {
                      setTempSelectedPhones([...phoneFilter]);
                    }
                  }}
                  className="w-full px-4 py-2 border-2 border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all flex items-center justify-between"
                >
                  <span className="text-left">
                    {phoneFilter.length === 0
                      ? 'All Phone Numbers'
                      : phoneFilter.length === 1
                      ? phoneFilter[0]
                      : `${phoneFilter.length} selected`}
                  </span>
                  <FaChevronDown className={`ml-2 transition-transform ${phoneFilterOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {phoneFilterOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-96 overflow-hidden flex flex-col">
                    {/* Search Bar */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                        <input
                          type="text"
                          placeholder="Search"
                          value={phoneSearch}
                          onChange={(e) => setPhoneSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Select All Checkbox */}
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newSelected = [...new Set([...tempSelectedPhones, ...filteredPhones])];
                              setTempSelectedPhones(newSelected);
                            } else {
                              setTempSelectedPhones(tempSelectedPhones.filter(p => !filteredPhones.includes(p)));
                            }
                          }}
                          className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">(Select All)</span>
                      </label>
                    </div>

                    {/* Phone Numbers List */}
                    <div className="overflow-y-auto flex-1">
                      {filteredPhones.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No phone numbers found
                        </div>
                      ) : (
                        filteredPhones.map((phone) => (
                          <label
                            key={phone}
                            className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={tempSelectedPhones.includes(phone)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTempSelectedPhones([...tempSelectedPhones, phone]);
                                } else {
                                  setTempSelectedPhones(tempSelectedPhones.filter((p) => p !== phone));
                                }
                              }}
                              className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-900 dark:text-white">{phone}</span>
                          </label>
                        ))
                      )}
                    </div>

                    {/* OK and Cancel Buttons */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneFilterOpen(false);
                          setTempSelectedPhones([...phoneFilter]);
                          setPhoneSearch('');
                        }}
                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneFilter(tempSelectedPhones);
                          setPhoneFilterOpen(false);
                          setPhoneSearch('');
                        }}
                        className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors font-medium"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  Filter Call Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="no-answer">No Answer</option>
                  <option value="busy">Busy</option>
                  <option value="in-progress">In Progress</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  Filter Interaction
                </label>
                <select
                  value={interactionFilter}
                  onChange={(e) => setInteractionFilter(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">All</option>
                  <option value="interaction">Has Interaction</option>
                  <option value="no-interaction">No Interaction</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  Show List
                </label>
                <select
                  value={entriesPerPage}
                  onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  Total Calls
                </label>
                <span className="w-full block text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg border-2 border-indigo-300 dark:border-indigo-600 text-center">
                  {filteredCallLogs.length} calls
                </span>
              </div>
            </div>
          </div>

          {/* Call Lines Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-indigo-200 dark:border-indigo-800 overflow-hidden">
            <div className="overflow-x-auto mobile-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white uppercase text-xs tracking-wider shadow-lg">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">Call Date</th>
                    <th className="px-6 py-4 text-left font-bold">Phone Number</th>
                    <th className="px-6 py-4 text-left font-bold">Call Status</th>
                    <th className="px-6 py-4 text-left font-bold">Interaction</th>
                    <th className="px-6 py-4 text-left font-bold">Duration</th>
                    <th className="px-6 py-4 text-left font-bold">Recording</th>
                    <th className="px-6 py-4 text-left font-bold">Transcript</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCallLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                        No calls found
                      </td>
                    </tr>
                  ) : (
                    filteredCallLogs.slice(0, entriesPerPage).map((call) => (
                      <tr key={call._id || call.callSid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          {call.startTime ? (
                            <div className="flex items-center space-x-2">
                              <FaCalendar className="text-gray-400" size={14} />
                              <span className="text-gray-900 dark:text-white">
                                {new Date(call.startTime).toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Not called</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <FaPhone className="text-gray-400" size={14} />
                            <span className="text-gray-900 dark:text-white">{call.phoneNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(call.status)}</td>
                        <td className="px-6 py-4">{getInteractionBadge(call)}</td>
                        <td className="px-6 py-4">
                          {call.duration ? (
                            <div className="flex items-center space-x-2">
                              <FaClock className="text-gray-400" size={14} />
                              <span className="text-gray-900 dark:text-white">{formatDuration(call.duration)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {call.recordingUrl ? (
                            <div className="flex items-center space-x-2">
                              <FaPlay className="text-primary-500" size={14} />
                              <span className="text-gray-900 dark:text-white">0:00</span>
                              <FaDownload className="text-gray-400" size={14} />
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">No recording</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {call.transcript && call.transcript.length > 0 ? (
                            <button
                              onClick={() => {
                                setTranscriptCall(call);
                                setTranscriptModalOpen(true);
                              }}
                              className="px-4 py-1 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">No transcript</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {transcriptModalOpen && transcriptCall && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transcript</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {transcriptCall.phoneNumber} •{' '}
                  {transcriptCall.startTime
                    ? new Date(transcriptCall.startTime).toLocaleString()
                    : 'Not started'}
                </p>
              </div>
              <button
                onClick={() => {
                  setTranscriptModalOpen(false);
                  setTranscriptCall(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold"
                aria-label="Close transcript"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {transcriptCall.transcript && transcriptCall.transcript.length > 0 ? (
                transcriptCall.transcript.map((entry, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
                        {entry.role || 'Assistant'}
                      </span>
                      {entry.timestamp && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                      {entry.content || entry.text || '—'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                  No transcript available for this call.
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setTranscriptModalOpen(false);
                  setTranscriptCall(null);
                }}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignReportDetail;

