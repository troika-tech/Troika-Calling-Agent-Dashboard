import React, { useEffect, useMemo, useState } from 'react';
import { FaDownload, FaSearch, FaSyncAlt, FaArrowUp, FaArrowDown, FaCoins } from 'react-icons/fa';
import { creditsAPI } from '../services/api';

const CreditHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch credit transactions (no userId needed - gets current user's data)
      const options = {
        limit: 1000, // Fetch all for client-side filtering
        skip: 0,
      };

      if (dateFrom) {
        options.startDate = new Date(dateFrom).toISOString();
      }

      if (dateTo) {
        options.endDate = new Date(dateTo).toISOString();
      }

      const response = await creditsAPI.getTransactions(options);
      setTransactions(response.data.transactions || []);
      setCurrentBalance(response.data.currentBalance || 0);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching credit transactions:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || !err.response) {
        setError('Backend server is not running. Please start the server.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load credit transactions');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [dateFrom, dateTo]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply search filter
    const query = search.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((txn) => {
        const reasonMatch = txn.reason?.toLowerCase().includes(query);
        const idMatch = txn._id?.toLowerCase().includes(query);
        return reasonMatch || idMatch;
      });
    }

    // Apply type filter
    if (typeFilter) {
      filtered = filtered.filter((txn) => txn.type === typeFilter);
    }

    return filtered;
  }, [transactions, search, typeFilter]);

  // Update pagination when filtered data changes
  useEffect(() => {
    const total = filteredTransactions.length;
    const pages = Math.ceil(total / pagination.limit);
    setPagination(prev => ({
      ...prev,
      total,
      pages,
      page: prev.page > pages && pages > 0 ? 1 : prev.page
    }));
  }, [filteredTransactions.length, pagination.limit]);

  // Get paginated data
  const paginatedTransactions = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, pagination.page, pagination.limit]);

  const buildCsv = (rows) => {
    return rows
      .map((row) =>
        row
          .map((cell) => {
            if (cell === null || cell === undefined) return '""';
            const safe = String(cell).replace(/"/g, '""');
            return `"${safe}"`;
          })
          .join(',')
      )
      .join('\n');
  };

  const downloadAllReports = () => {
    if (filteredTransactions.length === 0) return;

    const rows = [
      ['Date & Time', 'Type', 'Amount', 'Balance', 'Reason', 'Call Duration (sec)'],
    ];

    filteredTransactions.forEach((txn) => {
      const callDuration = txn.metadata?.durationSec || '-';
      rows.push([
        new Date(txn.createdAt).toLocaleString(),
        txn.type.charAt(0).toUpperCase() + txn.type.slice(1),
        txn.amount,
        txn.balance,
        txn.reason,
        callDuration,
      ]);
    });

    const csvContent = buildCsv(rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `credit-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type) => {
    if (type === 'addition') {
      return <FaArrowUp className="text-green-500" />;
    } else {
      return <FaArrowDown className="text-red-500" />;
    }
  };

  const getTypeColor = (type) => {
    if (type === 'addition') {
      return 'text-green-600 dark:text-green-400';
    } else {
      return 'text-red-600 dark:text-red-400';
    }
  };

  const getTotalCreditsUsed = () => {
    return filteredTransactions
      .filter(txn => txn.type === 'deduction')
      .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
  };

  const getTotalCreditsAdded = () => {
    return filteredTransactions
      .filter(txn => txn.type === 'addition')
      .reduce((sum, txn) => sum + txn.amount, 0);
  };

  return (
    <div className="p-0 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 px-4 sm:px-0 pr-0 sm:pr-48">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Credit History</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            View all credit transactions including calls and admin additions.
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Last updated {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3 mt-6 sm:mt-4">
          <button
            onClick={fetchTransactions}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base"
          >
            <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={downloadAllReports}
            disabled={filteredTransactions.length === 0}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
          >
            <FaDownload />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mx-4 sm:mx-0">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-600 dark:text-green-400">Current Balance</h3>
            <FaCoins className="text-green-600 dark:text-green-400" size={20} />
          </div>
          <p className={`text-3xl font-bold ${currentBalance <= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-900 dark:text-green-100'}`}>
            {currentBalance.toLocaleString()}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            {currentBalance <= 0 ? 'Out of credits' : `${Math.floor(currentBalance / 60)} minutes available`}
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-6 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-red-600 dark:text-red-400">Credits Used</h3>
            <FaArrowDown className="text-red-600 dark:text-red-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-red-900 dark:text-red-100">
            {getTotalCreditsUsed().toLocaleString()}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {Math.floor(getTotalCreditsUsed() / 60)} minutes of calls
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">Credits Added</h3>
            <FaArrowUp className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {getTotalCreditsAdded().toLocaleString()}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {Math.floor(getTotalCreditsAdded() / 60)} minutes added
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow-sm border-0 sm:border border-gray-200 dark:border-gray-700 p-4 mx-4 sm:mx-0">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by reason or transaction ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                <option value="">All</option>
                <option value="addition">Additions</option>
                <option value="deduction">Deductions</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mx-4 sm:mx-0">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow-lg border-0 sm:border-2 border-indigo-200 dark:border-indigo-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white uppercase text-xs tracking-wider shadow-lg" style={{ background: 'linear-gradient(to right, #1e4fd9, #2c60eb)' }}>
              <tr>
                <th className="px-2 sm:px-4 lg:px-6 py-4 text-left font-bold whitespace-nowrap rounded-tl-xl">Date & Time</th>
                <th className="px-2 sm:px-4 lg:px-6 py-4 text-left font-bold whitespace-nowrap">Type</th>
                <th className="px-2 sm:px-4 lg:px-6 py-4 text-left font-bold whitespace-nowrap">Amount</th>
                <th className="px-2 sm:px-4 lg:px-6 py-4 text-left font-bold whitespace-nowrap">Balance</th>
                <th className="px-2 sm:px-4 lg:px-6 py-4 text-left font-bold whitespace-nowrap">Reason</th>
                <th className="px-2 sm:px-4 lg:px-6 py-4 text-left font-bold whitespace-nowrap rounded-tr-xl">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-100">
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-2 sm:px-4 lg:px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    Loading credit history...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-2 sm:px-4 lg:px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((txn) => (
                  <tr key={txn._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
                      <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                        {new Date(txn.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(txn.type)}
                        <span className={`text-xs sm:text-sm font-semibold ${getTypeColor(txn.type)}`}>
                          {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
                      <span className={`text-sm sm:text-lg font-bold ${getTypeColor(txn.type)}`}>
                        {txn.amount > 0 ? '+' : ''}{txn.amount}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
                      <span className={`text-sm font-semibold ${txn.balance <= 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {txn.balance}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {txn.reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
                      {txn.metadata?.durationSec ? (
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          {Math.floor(txn.metadata.durationSec / 60)}m {txn.metadata.durationSec % 60}s
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 border-t-2 border-indigo-300 dark:border-indigo-700 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm font-semibold text-indigo-700 dark:text-indigo-300 text-center sm:text-left">
              Showing <span className="text-blue-600 dark:text-blue-400">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="text-blue-600 dark:text-blue-400">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-purple-600 dark:text-purple-400">{pagination.total}</span> transactions
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
    </div>
  );
};

export default CreditHistory;
