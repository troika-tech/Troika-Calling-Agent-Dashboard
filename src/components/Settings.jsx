import React, { useState, useEffect } from 'react';
import { FaCreditCard, FaCoins, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { creditsAPI } from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState({
    billing: {
      plan: 'Professional',
      billingCycle: 'monthly',
      planPrice: '$99',
      nextBillingDate: '2024-02-15',
    },
    credits: {
      currentBalance: 0,
      totalUsed: 0,
      totalAdded: 0,
    },
  });
  const [loadingCredits, setLoadingCredits] = useState(true);

  useEffect(() => {
    fetchCreditData();
  }, []);

  const fetchCreditData = async () => {
    try {
      setLoadingCredits(true);

      // Fetch current balance and transaction history (no userId needed - gets current user's data)
      const [balanceResponse, transactionsResponse] = await Promise.all([
        creditsAPI.getBalance(),
        creditsAPI.getTransactions({ limit: 1000 })
      ]);

      const currentBalance = balanceResponse.data.credits || 0;
      const transactions = transactionsResponse.data.transactions || [];

      // Calculate total used and total added from transactions
      const totalUsed = transactions
        .filter(txn => txn.type === 'deduction')
        .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

      const totalAdded = transactions
        .filter(txn => txn.type === 'addition')
        .reduce((sum, txn) => sum + txn.amount, 0);

      setSettings(prev => ({
        ...prev,
        credits: {
          currentBalance,
          totalUsed,
          totalAdded,
        }
      }));
    } catch (err) {
      console.error('Error fetching credit data:', err);
    } finally {
      setLoadingCredits(false);
    }
  };

  const planFeatures = [
    'Unlimited Calls',
    'AI Voice Agent',
    'Advanced Analytics',
    'Priority Support',
    'Custom Integrations',
  ];

  // Calculate usage percentage based on total added credits
  const creditUsagePercentage = settings.credits.totalAdded > 0
    ? (settings.credits.totalUsed / settings.credits.totalAdded) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
          <FaCreditCard className="h-3 w-3" />
          <span>Account settings</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage your account and application settings
        </p>
      </div>

      {/* Billing & Subscription */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FaCreditCard className="text-emerald-500" size={20} />
          <h2 className="text-lg font-semibold text-zinc-900">
            Billing & Subscription
          </h2>
        </div>

        <div className="space-y-6">
          {/* Credits Section */}
          <div className="glass-card bg-zinc-50/60 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FaCoins className="text-yellow-500" size={20} />
              <h3 className="text-base font-semibold text-zinc-900">
                Credits Usage
              </h3>
            </div>

            {/* Credits Stats */}
            {loadingCredits ? (
              <div className="flex justify-center items-center py-8">
                <FaSpinner className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${settings.credits.currentBalance <= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {settings.credits.currentBalance.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Current Balance</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {Math.floor(settings.credits.currentBalance / 60)} minutes
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">
                    {settings.credits.totalUsed.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Credits Used</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {Math.floor(settings.credits.totalUsed / 60)} minutes
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-500">
                    {settings.credits.totalAdded.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Credits Added</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {Math.floor(settings.credits.totalAdded / 60)} minutes
                  </p>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-600">Usage</span>
                <span className="text-zinc-600 font-medium">
                  {creditUsagePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-zinc-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${creditUsagePercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
