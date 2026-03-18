import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Plus, RefreshCw, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Investments() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['investments'],
    queryFn: async () => {
      const { data } = await api.get('/investments');
      return data.data;
    }
  });

  const refreshMutation = useMutation({
    mutationFn: async () => await api.post('/investments/refresh-prices'),
    onSuccess: () => {
      queryClient.invalidateQueries(['investments']);
      setIsRefreshing(false);
    }
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshMutation.mutate();
  };

  const summary = data?.summary || { totalInvested: 0, currentValue: 0, totalPnl: 0, pnlPercent: 0 };
  const holdings = data?.holdings || [];

  // Prepare Donut Chart Data
  const assetMap = {};
  holdings.forEach(h => {
    assetMap[h.asset_type] = (assetMap[h.asset_type] || 0) + Number(h.live_value);
  });

  const donutData = {
    labels: Object.keys(assetMap).map(type => type.replace('_', ' ').toUpperCase()),
    datasets: [{
      data: Object.values(assetMap),
      backgroundColor: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#64748b', '#0ea5e9'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Investment Portfolio</h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh Prices
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors">
            <Plus className="w-5 h-5 mr-1" />
            Add Asset
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-16 h-16 text-indigo-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Invested Value</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">₹{summary.totalInvested.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16 text-gray-600" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Current Value</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">₹{summary.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <h3 className="text-gray-500 text-sm font-medium">Total Returns</h3>
          <div className="flex items-baseline mt-2 gap-3">
            <p className={cn("text-3xl font-bold", summary.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {summary.totalPnl >= 0 ? '+' : ''}₹{summary.totalPnl.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </p>
            <div className={cn("flex items-center text-sm font-semibold px-2 py-0.5 rounded-md", 
              summary.totalPnl >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
              {summary.totalPnl >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {summary.pnlPercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center h-80">
          <h3 className="text-lg font-bold text-gray-900 w-full text-left mb-4">Asset Allocation</h3>
          {Object.keys(assetMap).length > 0 ? (
            <div className="flex-1 w-full max-h-56 relative">
              <Doughnut data={donutData} options={{ maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'right' } } }} />
            </div>
          ) : (
             <div className="flex-1 flex items-center text-sm text-gray-500">No assets allocated</div>
          )}
        </div>

        {/* Holdings Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
             <h3 className="text-lg font-bold text-gray-900">Your Holdings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Asset</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Avg / Live Price</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Current Value</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">P&L</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500 animate-pulse">Loading holdings...</td></tr>
                ) : holdings.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500">No investments added yet.</td></tr>
                ) : (
                  holdings.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 truncate max-w-[150px]">{h.name}</div>
                        <div className="text-xs text-gray-500">{h.asset_type.replace('_', ' ').toUpperCase()} {h.symbol ? `· ${h.symbol}` : ''}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700 font-medium">
                        {Number(h.quantity).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="text-gray-900 font-medium">₹{Number(h.current_price).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">avg: ₹{Number(h.buy_price).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        ₹{Number(h.live_value).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className={cn("text-sm font-bold", h.pnl >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {h.pnl >= 0 ? '+' : ''}₹{Number(h.pnl).toLocaleString()}
                        </div>
                        <div className={cn("text-xs font-medium", h.pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                          {h.pnl >= 0 ? '+' : ''}{Number(h.pnl_percent).toFixed(2)}%
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
