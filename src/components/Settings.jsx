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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your account and application settings
        </p>
      </div>

      {/* Billing & Subscription */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FaCreditCard className="text-primary-500" size={20} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Billing & Subscription
          </h2>
        </div>

        <div className="space-y-6">
          {/* Credits Section */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <FaCoins className="text-yellow-500" size={20} />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Credits Usage
              </h3>
            </div>

            {/* Credits Stats */}
            {loadingCredits ? (
              <div className="flex justify-center items-center py-8">
                <FaSpinner className="animate-spin text-primary-500" size={24} />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${settings.credits.currentBalance <= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {settings.credits.currentBalance.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Current Balance</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {Math.floor(settings.credits.currentBalance / 60)} minutes
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">
                    {settings.credits.totalUsed.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Credits Used</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {Math.floor(settings.credits.totalUsed / 60)} minutes
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-500">
                    {settings.credits.totalAdded.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Credits Added</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {Math.floor(settings.credits.totalAdded / 60)} minutes
                  </p>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Usage</span>
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  {creditUsagePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300"
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
