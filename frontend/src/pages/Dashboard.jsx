import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { TrendingUp, TrendingDown, Target, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import DashboardCharts from '../components/DashboardCharts';

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: summary } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => (await api.get('/analytics/summary')).data.data
  });

  const { data: health } = useQuery({
    queryKey: ['healthScore'],
    queryFn: async () => (await api.get('/health-score')).data.data
  });

  const { data: networth } = useQuery({
    queryKey: ['networth'],
    queryFn: async () => (await api.get('/networth')).data.data
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}</h1>
          <p className="text-gray-500 mt-1">Here is your financial summary for this month.</p>
        </div>
        
        {health && (
          <div className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-50 border-2 border-indigo-100 relative">
              <span className="text-indigo-700 font-bold text-sm tracking-tighter">
                {Math.round(health.score)}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Health Score</p>
              <p className="text-sm font-semibold text-gray-900">{health.score > 70 ? 'Excellent Track' : 'Needs Attention'}</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Target className="w-16 h-16 text-indigo-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Net Worth</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ₹{networth?.net_worth ? Number(networth.net_worth).toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-16 h-16 text-emerald-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Monthly Income</h3>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            ₹{summary?.income ? Number(summary.income).toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingDown className="w-16 h-16 text-rose-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Monthly Expenses</h3>
          <p className="text-3xl font-bold text-rose-600 mt-2">
            ₹{summary?.expense ? Number(summary.expense).toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}
          </p>
        </div>
      </div>

      {/* Analytics Charts */}
      <DashboardCharts />
    </div>
  );
}
