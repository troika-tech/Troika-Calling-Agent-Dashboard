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
      return <FaArrowUp className="text-emerald-500" />;
    } else {
      return <FaArrowDown className="text-red-500" />;
    }
  };

  const getTypeColor = (type) => {
    if (type === 'addition') {
      return 'text-emerald-600';
    } else {
      return 'text-red-600';
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <FaCoins className="h-3 w-3" />
            <span>Credit management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">Credit History</h1>
          <p className="text-sm text-zinc-500 mt-1">
            View all credit transactions including calls and admin additions.
          </p>
          {lastUpdated && (
            <p className="text-xs text-zinc-400 mt-1">
              Last updated {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3 mt-6 sm:mt-4">
          <button
            onClick={fetchTransactions}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors text-xs font-medium"
          >
            <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={downloadAllReports}
            disabled={filteredTransactions.length === 0}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
          >
            <FaDownload />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Current Balance</p>
                <div className={`text-xl font-semibold tabular-nums ${currentBalance <= 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                  {currentBalance.toLocaleString()}
                </div>
                <p className="text-[11px] text-zinc-500">
                  {currentBalance <= 0 ? 'Out of credits' : `${Math.floor(currentBalance / 60)} minutes available`}
                </p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-teal-100">
                <FaCoins className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Credits Used</p>
                <div className="text-xl font-semibold tabular-nums text-zinc-900">
                  {getTotalCreditsUsed().toLocaleString()}
                </div>
                <p className="text-[11px] text-zinc-500">
                  {Math.floor(getTotalCreditsUsed() / 60)} minutes of calls
                </p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                <FaArrowDown className="h-4 w-4 text-red-500" />
              </div>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient">
          <div className="relative p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Credits Added</p>
                <div className="text-xl font-semibold tabular-nums text-zinc-900">
                  {getTotalCreditsAdded().toLocaleString()}
                </div>
                <p className="text-[11px] text-zinc-500">
                  {Math.floor(getTotalCreditsAdded() / 60)} minutes added
                </p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                <FaArrowUp className="h-4 w-4 text-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by reason or transaction ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-600 whitespace-nowrap">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
              >
                <option value="">All</option>
                <option value="addition">Additions</option>
                <option value="deduction">Deductions</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-600 whitespace-nowrap">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-600 whitespace-nowrap">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Transactions Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Date & Time</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Balance</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Reason</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">Duration</th>
              </tr>
            </thead>
            <tbody>
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-zinc-500 text-sm">
                    Loading credit history...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-zinc-500 text-sm">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((txn) => (
                  <tr key={txn._id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-zinc-700">
                      {new Date(txn.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(txn.type)}
                        <span className={`text-xs font-medium ${getTypeColor(txn.type)}`}>
                          {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${getTypeColor(txn.type)}`}>
                        {txn.amount > 0 ? '+' : ''}{txn.amount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${txn.balance <= 0 ? 'text-red-600' : 'text-zinc-700'}`}>
                        {txn.balance}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-600">
                        {txn.reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {txn.metadata?.durationSec ? (
                        <span className="text-xs text-zinc-600">
                          {Math.floor(txn.metadata.durationSec / 60)}m {txn.metadata.durationSec % 60}s
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">-</span>
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
          <div className="px-4 py-3 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="text-xs font-medium text-zinc-600 text-center sm:text-left">
              Showing <span className="text-emerald-600">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="text-emerald-600">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-zinc-900">{pagination.total}</span> transactions
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
              <button
                onClick={() => setPagination({ ...pagination, page: 1 })}
                disabled={pagination.page === 1}
                className="px-2 sm:px-3 py-1 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                ««
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="px-2 sm:px-3 py-1 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                «
              </button>
              <span className="px-2 sm:px-4 py-1 text-xs font-medium text-zinc-700 whitespace-nowrap bg-white rounded-lg border border-zinc-300">
                Page <span className="text-emerald-600">{pagination.page}</span> of <span className="text-zinc-900">{pagination.pages}</span>
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                disabled={pagination.page >= pagination.pages}
                className="px-2 sm:px-3 py-1 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                »
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.pages })}
                disabled={pagination.page >= pagination.pages}
                className="px-2 sm:px-3 py-1 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
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
