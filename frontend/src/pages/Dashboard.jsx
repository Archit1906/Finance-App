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
    if (loadingHealth) return <div className="w-12 h-12 rounded-full animate-pulse bg-ignite-border"></div>;
    if (errorHealth) return <div className="text-xs text-ignite-alert font-bold">Failed to load</div>;
    if (!health) return null;

    const score = Math.round(health.score);
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const colorClass = 'text-ignite-red';

    return (
      <div className="flex items-center space-x-3 bg-ignite-card px-4 py-3 rounded-2xl border border-ignite-border shadow-md">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
            <circle className="text-ignite-border stroke-current" strokeWidth="4" fill="transparent" r={radius} cx="24" cy="24" />
            <circle 
              className={`${colorClass} stroke-current transition-all duration-1000 ease-in-out`} 
              strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
              fill="transparent" r={radius} cx="24" cy="24" 
            />
          </svg>
          <span className="absolute text-xs font-black text-ignite-white">{score}</span>
        </div>
        <div>
          <p className="text-xs text-ignite-muted font-bold uppercase tracking-widest">Health Score</p>
          <p className="text-sm font-bold text-ignite-white">{score >= 70 ? 'Excellent Track' : score >= 40 ? 'Needs Attention' : 'Critical'}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bebas tracking-[2px] text-ignite-white flex items-center">
            Welcome back, {user?.name}
            <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-sans font-black bg-ignite-red/20 border border-ignite-red text-ignite-red uppercase tracking-widest mt-1">Ignite Phase Active</span>
          </h1>
          <p className="text-ignite-muted font-medium mt-[-4px]">Here is your structural financial summary for this month.</p>
        </div>
        
        {getHealthRing()}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-ignite-card p-6 rounded-2xl shadow-md border-y border-r border-y-ignite-border border-r-ignite-border border-l-[4px] border-l-ignite-red hover:shadow-ignite-card hover:border-y-ignite-bhover hover:border-r-ignite-bhover transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform">
            <Target className="w-20 h-20 text-ignite-white" />
          </div>
          <h3 className="text-ignite-muted text-[13px] font-bold uppercase tracking-wider">Net Worth</h3>
          {loadingNetworth ? (
             <div className="h-8 w-32 bg-ignite-border animate-pulse rounded mt-2"></div>
          ) : errorNetworth ? (
             <div className="text-sm text-ignite-alert font-bold mt-2">Error loading data</div>
          ) : (
             <p className="text-4xl font-black text-ignite-white mt-1 tracking-tight">
               ₹{networth?.net_worth ? Number(networth.net_worth).toLocaleString('en-IN') : '0'}
             </p>
          )}
        </div>
        
        <div className="bg-ignite-card p-6 rounded-2xl shadow-md border-y border-r border-y-ignite-border border-r-ignite-border border-l-[4px] border-l-ignite-success hover:shadow-ignite-card hover:border-y-ignite-bhover hover:border-r-ignite-bhover transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform">
            <TrendingUp className="w-20 h-20 text-ignite-white" />
          </div>
          <h3 className="text-ignite-muted text-[13px] font-bold uppercase tracking-wider">Monthly Income</h3>
          {loadingSummary ? (
             <div className="h-8 w-32 bg-ignite-border animate-pulse rounded mt-2"></div>
          ) : errorSummary ? (
             <div className="text-sm text-ignite-alert font-bold mt-2">Error loading data</div>
          ) : (
             <p className="text-4xl font-black text-ignite-success mt-1 tracking-tight">
               ₹{summary?.income ? Number(summary.income).toLocaleString('en-IN') : '0'}
             </p>
          )}
        </div>
        
        <div className="bg-ignite-card p-6 rounded-2xl shadow-md border-y border-r border-y-ignite-border border-r-ignite-border border-l-[4px] border-l-ignite-alert hover:shadow-ignite-card hover:border-y-ignite-bhover hover:border-r-ignite-bhover transition-all relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform">
            <TrendingDown className="w-20 h-20 text-ignite-white" />
          </div>
          <h3 className="text-ignite-muted text-[13px] font-bold uppercase tracking-wider">Monthly Expenses</h3>
          {loadingSummary ? (
             <div className="h-8 w-32 bg-ignite-border animate-pulse rounded mt-2"></div>
          ) : errorSummary ? (
             <div className="text-sm text-ignite-alert font-bold mt-2">Error loading data</div>
          ) : (
             <p className="text-4xl font-black text-ignite-alert mt-1 tracking-tight">
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
