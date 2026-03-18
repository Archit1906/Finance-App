import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Budgets() {
  const queryClient = useQueryClient();
  const d = new Date();
  const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['budgets', 'alerts'],
    queryFn: async () => {
      const { data } = await api.get('/budgets/alerts');
      return data.data;
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Monthly Budgets</h1>
        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors">
          <Plus className="w-5 h-5 mr-2" />
          Set Budget
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-6">
          {loadingAlerts ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse h-40"></div>
          ) : alerts?.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
              <p className="text-gray-500">You haven't set up any budgets yet.</p>
            </div>
          ) : (
            alerts?.map((alert) => (
              <div key={alert.category} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{alert.category}</h3>
                    {alert.status === 'exceeded' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    {alert.status === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                    {alert.percentage < 80 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">₹{alert.spent.toLocaleString()} / ₹{alert.limit.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{alert.percentage.toFixed(0)}% used</p>
                  </div>
                </div>
                
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden shadow-inner">
                  <div 
                    className={cn(
                      "h-3 rounded-full transition-all duration-1000 ease-out",
                      alert.status === 'exceeded' ? "bg-red-500" : alert.status === 'warning' ? "bg-amber-500" : "bg-emerald-500"
                    )} 
                    style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                  ></div>
                </div>
                {alert.status === 'exceeded' && (
                  <p className="text-xs text-red-600 font-medium">You have exceeded your budget by ₹{(alert.spent - alert.limit).toLocaleString()}</p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Budget Insights</h3>
            {alerts?.filter(a => a.status !== 'good').length > 0 ? (
              <ul className="space-y-4">
                {alerts.filter(a => a.status === 'exceeded').map(a => (
                  <li key={`insight-${a.category}`} className="flex items-start bg-red-50 p-3 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-sm text-red-800">You've overspent your <strong>{a.category}</strong> budget. Consider cutting back this week to stay on track.</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">You're doing great! No immediate budget warnings.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
