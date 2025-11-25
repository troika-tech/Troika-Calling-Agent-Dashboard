import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    // Reset to page 1 when filters change
    if (pagination.page !== 1) {
      setPagination({ ...pagination, page: 1 });
    } else {
      fetchCallLogs();
    }
  }, [filters]);

  useEffect(() => {
    fetchCallLogs();
  }, [pagination.page]);

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
      'completed': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'in-progress': 'bg-blue-50 text-blue-700 border border-blue-200',
      'failed': 'bg-red-50 text-red-700 border border-red-200',
      'initiated': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      'no-answer': 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      'busy': 'bg-orange-50 text-orange-700 border border-orange-200',
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${styles[status] || styles.initiated}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
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
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading call logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <FaPhone className="h-3 w-3" />
            <span>Call management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Call Logs
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            View and manage all your call records
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
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
            <label className="block text-xs font-medium text-zinc-600 mb-2">
              Call Type
            </label>
            <select
              value={filters.callType}
              onChange={(e) => setFilters({ ...filters, callType: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            >
              <option value="">All Types</option>
              <option value="outgoing">Outgoing</option>
              <option value="incoming">Incoming</option>
            </select>
          </div>
          <div className="relative" ref={phoneFilterRef} style={{ zIndex: 1000 }}>
            <label className="block text-xs font-medium text-zinc-600 mb-2">
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
              className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 flex items-center justify-between text-xs"
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
              <div className="absolute w-full mt-1 glass-card border border-zinc-200 rounded-lg shadow-xl max-h-96 overflow-hidden flex flex-col" style={{ zIndex: 1001 }}>
                {/* Search Bar */}
                <div className="p-3 border-b border-zinc-200">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search"
                      value={phoneSearch}
                      onChange={(e) => setPhoneSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded bg-white text-zinc-900 text-xs focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Select All Checkbox */}
                <div className="p-2 border-b border-zinc-200">
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
                      className="mr-2 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-zinc-700">(Select All)</span>
                  </label>
                </div>

                {/* Phone Numbers List */}
                <div className="overflow-y-auto flex-1">
                  {filteredPhones.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-500">
                      No phone numbers found
                    </div>
                  ) : (
                    filteredPhones.map((phone) => (
                      <label
                        key={phone}
                        className="flex items-center px-3 py-2 hover:bg-zinc-50 cursor-pointer"
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
                          className="mr-3 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-zinc-900">{phone}</span>
                      </label>
                    ))
                  )}
                </div>

                {/* OK and Cancel Buttons */}
                <div className="p-3 border-t border-zinc-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneFilterOpen(false);
                      setTempSelectedPhones([...filters.phoneNumbers]);
                      setPhoneSearch('');
                    }}
                    className="px-4 py-2 text-xs border border-zinc-300 text-zinc-700 rounded-full hover:bg-zinc-50 transition-colors font-medium"
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
                    className="px-4 py-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Call Logs Table */}
      <div className="glass-panel overflow-hidden relative" style={{ zIndex: 1 }}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Call SID
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Phone Number
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Credits
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Start Time
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  End Time
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {calls.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-zinc-500 text-sm">
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
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-zinc-900">
                        <span className="font-mono">{(call.sessionId || call.exotelCallSid || 'N/A').substring(0, 20)}...</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-600">
                        {call.direction === 'outbound' ? call.toPhone : call.fromPhone}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-600">
                        {formatDuration(call.durationSec)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-emerald-600">
                        {call.creditsConsumed || call.durationSec || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-600">
                        {call.startedAt ? new Date(call.startedAt).toLocaleString() : new Date(call.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-600">
                        {call.endedAt ? new Date(call.endedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          {getStatusBadge(call.status)}
                          {isInsufficientCredits && (
                            <span className="text-xs text-red-600 font-medium">
                              ⚠ No credits
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('View clicked for call:', call);
                            setSelectedCall(call);
                            setShowDetailsModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[10px] font-medium transition-colors shrink-0 max-w-fit"
                          style={{ borderRadius: '9999px' }}
                        >
                          <FaEye size={10} />
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
          <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50/60 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm font-medium text-zinc-600 text-center sm:text-left">
              Showing <span className="text-emerald-600">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="text-emerald-600">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-zinc-900">{pagination.total}</span> calls
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
              <button
                onClick={() => setPagination({ ...pagination, page: 1 })}
                disabled={pagination.page === 1}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                ««
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                «
              </button>
              <span className="px-2 sm:px-4 py-1 text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap bg-white rounded-lg border border-zinc-300">
                Page <span className="text-emerald-600">{pagination.page}</span> of <span className="text-zinc-900">{pagination.pages}</span>
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                disabled={pagination.page >= pagination.pages}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                »
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.pages })}
                disabled={pagination.page >= pagination.pages}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Call Details Modal */}
      {showDetailsModal && selectedCall && createPortal(
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
            setShowDetailsModal(false);
            setSelectedCall(null);
          }}
        >
          <div 
            className="glass-card rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white border border-zinc-200" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'relative', 
              zIndex: 1001,
              margin: 'auto'
            }}
          >
            <div className="p-6 border-b border-zinc-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900">
                    Call Details
                  </h2>
                  <p className="text-xs text-zinc-600 mt-1">
                    Phone: {selectedCall.direction === 'outbound' ? selectedCall.toPhone : selectedCall.fromPhone} | Start: {selectedCall.startedAt ? new Date(selectedCall.startedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCall(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Recording Section */}
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-4">
                  Recording
                </h3>
                {selectedCall.recordingUrl ? (
                  <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
                    <audio controls className="w-full">
                      <source src={selectedCall.recordingUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    <div className="mt-3">
                      <a
                        href={selectedCall.recordingUrl}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors"
                      >
                        <FaDownload size={14} />
                        <span>Download Recording</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-50 rounded-lg p-4 text-center border border-zinc-200">
                    <p className="text-zinc-500">No recording available</p>
                  </div>
                )}
              </div>

              {/* Transcript Section */}
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-4">
                  Transcript
                </h3>
                {selectedCall.transcript && Array.isArray(selectedCall.transcript) && selectedCall.transcript.length > 0 ? (
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
                            className={`max-w-[80%] p-4 rounded-lg border ${
                              isUser
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                            }`}
                          >
                            <p className="font-semibold mb-1 text-sm">{displayName}:</p>
                            <p className="text-sm whitespace-pre-wrap">{entry.text || entry.content}</p>
                            {entry.timestamp && (
                              <p className="text-xs text-zinc-500 mt-2 text-right">
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-zinc-50 rounded-lg p-4 text-center border border-zinc-200">
                    <p className="text-zinc-500">No transcript available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCall(null);
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

export default CallLogs;

