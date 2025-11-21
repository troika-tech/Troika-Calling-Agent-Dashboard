import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaFilter, FaPhone, FaCheckCircle, FaTimesCircle, FaClock, FaSpinner, FaChevronDown, FaEye, FaDownload } from 'react-icons/fa';
import { callAPI } from '../services/api';

const CallLogs = () => {
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState([]);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    status: '',
    callType: '',
    phoneNumbers: [],
    startDate: '',
    endDate: '',
  });
  const [phoneFilterOpen, setPhoneFilterOpen] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [allPhoneNumbers, setAllPhoneNumbers] = useState([]);
  const [tempSelectedPhones, setTempSelectedPhones] = useState([]);
  const phoneFilterRef = useRef(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);

  useEffect(() => {
    fetchCallLogs();
  }, [filters, pagination.page]);

  // Fetch all unique phone numbers
  useEffect(() => {
    fetchAllPhoneNumbers();
  }, []);

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

  const fetchAllPhoneNumbers = async () => {
    try {
      // Get user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id || user.id;

      const params = { limit: 10000 };

      // Add userId to filter calls by current user
      if (userId) {
        params.userId = userId;
      }

      const response = await callAPI.getAllCalls(params);
      const allCalls = response.data?.calls || [];
      // Extract phone numbers based on direction (toPhone for outbound, fromPhone for inbound)
      const uniquePhones = [...new Set(allCalls.map(call =>
        call.direction === 'outbound' ? call.toPhone : call.fromPhone
      ).filter(Boolean))].sort();
      setAllPhoneNumbers(uniquePhones);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
    }
  };

  const fetchCallLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id || user.id;

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      // Add userId to filter calls by current user
      if (userId) {
        params.userId = userId;
      }

      if (filters.status) params.status = filters.status;
      if (filters.callType) {
        // Map frontend values to backend: outgoing -> outbound, incoming -> inbound
        params.direction = filters.callType === 'outgoing' ? 'outbound' : 'inbound';
      }
      if (filters.phoneNumbers && filters.phoneNumbers.length > 0) {
        // Send array directly - axios will handle serialization
        params.phoneNumbers = filters.phoneNumbers;
        console.log('Sending phone numbers filter:', filters.phoneNumbers);
      }
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      console.log('API params:', params);
      const callsResponse = await callAPI.getAllCalls(params);
      setCalls(callsResponse.data?.calls || []);
      setPagination(callsResponse.data?.pagination || pagination);
    } catch (err) {
      console.error('Error fetching call logs:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load call logs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'initiated': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'no-answer': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'busy': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return (
      <span
        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status] || styles.initiated}`}
      >
        {status ? status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ') : 'Unknown'}
      </span>
    );
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getFilteredPhoneNumbers = () => {
    if (!phoneSearch) return allPhoneNumbers;
    return allPhoneNumbers.filter((phone) =>
      phone.toLowerCase().includes(phoneSearch.toLowerCase())
    );
  };

  const filteredPhones = getFilteredPhoneNumbers();
  const allFilteredSelected = filteredPhones.length > 0 && filteredPhones.every(phone => tempSelectedPhones.includes(phone));

  if (loading && calls.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">Loading call logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 sm:px-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Call Logs
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            View and manage all your call records
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow-sm border-0 sm:border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mx-4 sm:mx-0">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="in-progress">In Progress</option>
              <option value="initiated">Initiated</option>
              <option value="no-answer">No Answer</option>
              <option value="busy">Busy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Call Type
            </label>
            <select
              value={filters.callType}
              onChange={(e) => setFilters({ ...filters, callType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="outgoing">Outgoing</option>
              <option value="incoming">Incoming</option>
            </select>
          </div>
          <div className="relative" ref={phoneFilterRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <button
              type="button"
              onClick={() => {
                setPhoneFilterOpen(!phoneFilterOpen);
                if (!phoneFilterOpen) {
                  setTempSelectedPhones([...filters.phoneNumbers]);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent flex items-center justify-between"
            >
              <span className="text-left">
                {filters.phoneNumbers.length === 0
                  ? 'All Phone Numbers'
                  : filters.phoneNumbers.length === 1
                  ? filters.phoneNumbers[0]
                  : `${filters.phoneNumbers.length} selected`}
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
                      setTempSelectedPhones([...filters.phoneNumbers]);
                      setPhoneSearch('');
                    }}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ ...filters, phoneNumbers: tempSelectedPhones });
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mx-4 sm:mx-0">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Call Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow-sm border-0 sm:border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto mobile-scrollbar">
          <table className="w-full min-w-[800px]">
            <thead className="text-white uppercase text-xs tracking-wider shadow-lg" style={{ background: 'linear-gradient(to right, #1e4fd9, #2c60eb)' }}>
              <tr>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold rounded-tl-xl">
                  Call SID
                </th>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold">
                  Phone Number
                </th>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold">
                  Duration
                </th>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold">
                  Credits
                </th>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold">
                  Start Time
                </th>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold">
                  End Time
                </th>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold">
                  Status
                </th>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold rounded-tr-xl">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {calls.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 sm:px-4 md:px-6 py-6 sm:py-8 text-center text-gray-500 dark:text-gray-400">
                    {loading ? 'Loading...' : 'No calls found'}
                  </td>
                </tr>
              ) : (
                calls.map((call) => {
                  // Check if call failed due to insufficient credits
                  const isInsufficientCredits = call.status === 'failed' &&
                    (call.errorMessage?.includes('insufficient credits') ||
                     call.errorMessage?.includes('Insufficient credits') ||
                     call.metadata?.errorReason === 'insufficient_credits');

                  return (
                    <tr
                      key={call._id || call.sessionId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        <span className="font-mono">{(call.sessionId || call.exotelCallSid || 'N/A').substring(0, 20)}...</span>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        {call.direction === 'outbound' ? call.toPhone : call.fromPhone}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        {formatDuration(call.durationSec)}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {call.creditsConsumed || call.durationSec || 0}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        {call.startedAt ? new Date(call.startedAt).toLocaleString() : new Date(call.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        {call.endedAt ? new Date(call.endedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(call.status)}
                          {isInsufficientCredits && (
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                              ⚠ No credits
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedCall(call);
                            setShowDetailsModal(true);
                          }}
                          className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <FaEye size={12} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 border-t-2 border-indigo-300 dark:border-indigo-700 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm font-semibold text-indigo-700 dark:text-indigo-300 text-center sm:text-left">
              Showing <span className="text-blue-600 dark:text-blue-400">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="text-blue-600 dark:text-blue-400">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-purple-600 dark:text-purple-400">{pagination.total}</span> calls
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
              <button
                onClick={() => setPagination({ ...pagination, page: 1 })}
                disabled={pagination.page === 1}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-indigo-400 dark:border-indigo-600 rounded-lg bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
              >
                ««
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-indigo-400 dark:border-indigo-600 rounded-lg bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
              >
                «
              </button>
              <span className="px-2 sm:px-4 py-1 text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 whitespace-nowrap bg-white dark:bg-gray-700 rounded-lg border-2 border-indigo-300 dark:border-indigo-600">
                Page <span className="text-blue-600 dark:text-blue-400">{pagination.page}</span> of <span className="text-purple-600 dark:text-purple-400">{pagination.pages}</span>
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                disabled={pagination.page >= pagination.pages}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-indigo-400 dark:border-indigo-600 rounded-lg bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
              >
                »
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.pages })}
                disabled={pagination.page >= pagination.pages}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-indigo-400 dark:border-indigo-600 rounded-lg bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Call Details Modal */}
      {showDetailsModal && selectedCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Call Details
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Phone: {selectedCall.direction === 'outbound' ? selectedCall.toPhone : selectedCall.fromPhone} | Start: {selectedCall.startedAt ? new Date(selectedCall.startedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCall(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Recording Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Recording
                </h3>
                {selectedCall.recordingUrl ? (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <audio controls className="w-full">
                      <source src={selectedCall.recordingUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    <div className="mt-3">
                      <a
                        href={selectedCall.recordingUrl}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <FaDownload size={14} />
                        <span>Download Recording</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No recording available</p>
                  </div>
                )}
              </div>

              {/* Transcript Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Transcript
                </h3>
                {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCall.transcript.map((entry, index) => {
                      // Map speaker field to role (speaker can be 'user', 'assistant', 'agent')
                      const speaker = entry.speaker || entry.role || 'assistant';
                      const isUser = speaker === 'user';
                      const displayName = isUser ? 'User' : 'Assistant';

                      return (
                        <div
                          key={index}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-4 rounded-lg ${
                              isUser
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            <p className="font-semibold mb-1">{displayName}:</p>
                            <p className="text-sm whitespace-pre-wrap">{entry.text || entry.content}</p>
                            {entry.timestamp && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No transcript available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCall(null);
                }}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
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

export default CallLogs;

