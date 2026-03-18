import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { TrendingUp, TrendingDown, Target, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import DashboardCharts from '../components/DashboardCharts';

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: summary, isLoading: loadingSummary, isError: errorSummary } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => (await api.get('/analytics/summary')).data.data
  });

  const { data: health, isLoading: loadingHealth, isError: errorHealth } = useQuery({
    queryKey: ['healthScore'],
    queryFn: async () => (await api.get('/health-score')).data.data
  });

  const { data: networth, isLoading: loadingNetworth, isError: errorNetworth } = useQuery({
    queryKey: ['networth'],
    queryFn: async () => (await api.get('/networth')).data.data
  });

  // SVG Progress Ring Logic
  const getHealthRing = () => {
    if (loadingHealth) return <div className="w-12 h-12 rounded-full animate-pulse bg-gray-200"></div>;
    if (errorHealth) return <div className="text-xs text-red-500">Failed to load</div>;
    if (!health) return null;

    const score = Math.round(health.score);
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const colorClass = score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-rose-500';

    return (
      <div className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
            <circle className="text-gray-100 stroke-current" strokeWidth="4" fill="transparent" r={radius} cx="24" cy="24" />
            <circle 
              className={`${colorClass} stroke-current transition-all duration-1000 ease-in-out`} 
              strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
              fill="transparent" r={radius} cx="24" cy="24" 
            />
          </svg>
          <span className="absolute text-xs font-bold text-gray-700">{score}</span>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Health Score</p>
          <p className="text-sm font-semibold text-gray-900">{score >= 70 ? 'Excellent Track' : score >= 40 ? 'Needs Attention' : 'Critical'}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}</h1>
          <p className="text-gray-500 mt-1">Here is your financial summary for this month.</p>
        </div>
        
        {getHealthRing()}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Target className="w-16 h-16 text-indigo-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Net Worth</h3>
          {loadingNetworth ? (
             <div className="h-8 w-32 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : errorNetworth ? (
             <div className="text-sm text-red-500 mt-2">Error loading data</div>
          ) : (
             <p className="text-3xl font-bold text-gray-900 mt-2">
               ₹{networth?.net_worth ? Number(networth.net_worth).toLocaleString('en-IN') : '0'}
             </p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-16 h-16 text-emerald-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Monthly Income</h3>
          {loadingSummary ? (
             <div className="h-8 w-32 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : errorSummary ? (
             <div className="text-sm text-red-500 mt-2">Error loading data</div>
          ) : (
             <p className="text-3xl font-bold text-emerald-600 mt-2">
               ₹{summary?.income ? Number(summary.income).toLocaleString('en-IN') : '0'}
             </p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingDown className="w-16 h-16 text-rose-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Monthly Expenses</h3>
          {loadingSummary ? (
             <div className="h-8 w-32 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : errorSummary ? (
             <div className="text-sm text-red-500 mt-2">Error loading data</div>
          ) : (
             <p className="text-3xl font-bold text-rose-600 mt-2">
               ₹{summary?.expense ? Number(summary.expense).toLocaleString('en-IN') : '0'}
             </p>
          )}
        </div>
      </div>

      {/* Analytics Charts */}
      <DashboardCharts />
    </div>
  );
}
