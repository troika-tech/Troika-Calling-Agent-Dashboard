import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaDownload, FaSearch, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { campaignAPI } from '../services/api';

const DeliveryReports = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entriesPerPage, setEntriesPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignAPI.list();
      // Ensure we always set an array
      const campaignsData = response.data;
      if (Array.isArray(campaignsData)) {
        setCampaigns(campaignsData);
      } else if (campaignsData && Array.isArray(campaignsData.campaigns)) {
        setCampaigns(campaignsData.campaigns);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || !err.response) {
        setError('Backend server is not running. Please start the server (node server.js).');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load campaigns');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const getCreditsUsed = (campaign) => {
    return campaign?.stats?.completed ?? campaign?.completedCalls ?? 0;
  };

  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter((campaign) => {
        const idMatch = campaign._id?.toLowerCase().includes(query);
        const nameMatch = campaign.name?.toLowerCase().includes(query);
        return idMatch || nameMatch;
      });
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal;
        let bVal;

        switch (sortColumn) {
          case 'uniqueId':
            aVal = a._id || '';
            bVal = b._id || '';
            break;
          case 'campaignName':
            aVal = a.name || '';
            bVal = b.name || '';
            break;
          case 'totalNos':
            aVal = a.totalCalls ?? 0;
            bVal = b.totalCalls ?? 0;
            break;
          case 'usedCredit':
            aVal = getCreditsUsed(a);
            bVal = getCreditsUsed(b);
            break;
          case 'status':
            aVal = a.status || '';
            bVal = b.status || '';
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string') {
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return filtered;
  }, [campaigns, search, sortColumn, sortDirection]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) {
      return (
        <span className="inline-flex flex-col ml-1">
          <FaChevronUp className="text-white/60 text-xs" />
          <FaChevronDown className="text-white/60 text-xs -mt-1" />
        </span>
      );
    }

    return sortDirection === 'asc' ? (
      <FaChevronUp className="ml-1 text-yellow-300" />
    ) : (
      <FaChevronDown className="ml-1 text-yellow-300" />
    );
  };

  const viewReport = (campaign) => {
    navigate(`/campaign-report/${campaign._id}`);
  };

  const totalPages = Math.ceil(filteredCampaigns.length / entriesPerPage) || 1;
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);
  const startEntry = filteredCampaigns.length > 0 ? startIndex + 1 : 0;
  const endEntryValue = Math.min(endIndex, filteredCampaigns.length);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Delivery Report List</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            View and download detailed reports for your campaigns
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-md border-2 border-blue-200 dark:border-blue-800 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <label className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">Show</label>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">entries</span>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <label className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">Search:</label>
            <div className="relative flex-1 sm:flex-initial">
              <FaSearch className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-blue-500 text-xs sm:text-sm" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-indigo-200 dark:border-indigo-800 overflow-hidden">
        <div className="overflow-x-auto mobile-scrollbar">
          <table className="w-full text-xs sm:text-sm min-w-[800px]">
            <thead className="text-white uppercase text-xs tracking-wider shadow-lg" style={{ background: 'linear-gradient(to right, #1e4fd9, #2c60eb)' }}>
              <tr>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold w-10 sm:w-auto sticky left-0 z-10 border-r-2 rounded-tl-xl" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>#</th>
                <th
                  className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold cursor-pointer"
                  onClick={() => handleSort('uniqueId')}
                >
                  <span className="flex items-center">
                    <span className="hidden sm:inline">Unique ID</span>
                    <span className="sm:hidden">ID</span>
                    <SortIcon column="uniqueId" />
                  </span>
                </th>
                <th
                  className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold cursor-pointer"
                  onClick={() => handleSort('campaignName')}
                >
                  <span className="flex items-center">
                    <span className="hidden md:inline">Campaign Name</span>
                    <span className="md:hidden">Campaign</span>
                    <SortIcon column="campaignName" />
                  </span>
                </th>
                <th
                  className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold cursor-pointer"
                  onClick={() => handleSort('totalNos')}
                >
                  <span className="flex items-center">
                    <span className="hidden sm:inline">Total No's</span>
                    <span className="sm:hidden">Total</span>
                    <SortIcon column="totalNos" />
                  </span>
                </th>
                <th
                  className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold cursor-pointer"
                  onClick={() => handleSort('usedCredit')}
                >
                  <span className="flex items-center">
                    <span className="hidden sm:inline">Used Credit</span>
                    <span className="sm:hidden">Credit</span>
                    <SortIcon column="usedCredit" />
                  </span>
                </th>
                <th
                  className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <span className="flex items-center">
                    Status
                    <SortIcon column="status" />
                  </span>
                </th>
                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left font-bold rounded-tr-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-100">
              {loading && campaigns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 sm:px-6 py-8 sm:py-10 text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                    Loading delivery reports...
                  </td>
                </tr>
              ) : paginatedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 sm:px-6 py-8 sm:py-10 text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                    No data available in table
                  </td>
                </tr>
              ) : (
                paginatedCampaigns.map((campaign, index) => (
                  <tr key={campaign._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                    <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm font-medium sticky left-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 z-10 border-r border-gray-200 dark:border-gray-700">{startIndex + index + 1}</td>
                    <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-mono text-xs break-all min-w-[120px] sm:min-w-[150px]">{campaign._id}</td>
                    <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-semibold text-xs sm:text-sm min-w-[100px] sm:min-w-[150px]">{campaign.name}</td>
                    <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm font-medium whitespace-nowrap">{campaign.totalCalls ?? 0}</td>
                    <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-semibold text-xs sm:text-sm whitespace-nowrap">{getCreditsUsed(campaign)}</td>
                    <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                      <span
                        className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold rounded-full capitalize whitespace-nowrap ${
                          campaign.status === 'active' || campaign.status === 'running'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : campaign.status === 'completed'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : campaign.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {campaign.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                      <button
                        onClick={() => viewReport(campaign)}
                        className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-xs sm:text-sm whitespace-nowrap"
                      >
                        <span className="hidden sm:inline">View Report</span>
                        <span className="sm:hidden">View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 border-t-2 border-indigo-300 dark:border-indigo-700 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm font-semibold text-indigo-700 dark:text-indigo-300 text-center sm:text-left">
            Showing <span className="text-blue-600 dark:text-blue-400">{startEntry}</span> to <span className="text-blue-600 dark:text-blue-400">{endEntryValue}</span> of <span className="text-purple-600 dark:text-purple-400">{filteredCampaigns.length}</span> entries
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-indigo-400 dark:border-indigo-600 rounded-lg bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
            >
              ««
            </button>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-indigo-400 dark:border-indigo-600 rounded-lg bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
            >
              «
            </button>
            <span className="px-2 sm:px-4 py-1 text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 whitespace-nowrap bg-white dark:bg-gray-700 rounded-lg border-2 border-indigo-300 dark:border-indigo-600">
              Page <span className="text-blue-600 dark:text-blue-400">{currentPage}</span> of <span className="text-purple-600 dark:text-purple-400">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-indigo-400 dark:border-indigo-600 rounded-lg bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
            >
              »
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-2 border-indigo-400 dark:border-indigo-600 rounded-lg bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
            >
              »»
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryReports;

