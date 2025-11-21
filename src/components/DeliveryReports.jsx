import React from 'react';

const mockReports = [
  { id: 'CMP-1001', name: 'Diwali Warm Leads', creditsUsed: 320 },
  { id: 'CMP-1002', name: 'Payment Reminder Batch', creditsUsed: 210 },
  { id: 'CMP-1003', name: 'Premium Upsell List', creditsUsed: 145 },
  { id: 'CMP-1004', name: 'WhatsApp Marketing', creditsUsed: 410 },
];

const DeliveryReports = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Delivery Reports
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Export campaign delivery stats and credit usage.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Campaign Reports</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Campaign ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Campaign Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Credits Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {mockReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{report.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{report.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{report.creditsUsed.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">
                    <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors">
                      Download Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeliveryReports;

