import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { Plus, RefreshCw, TrendingUp, TrendingDown, Wallet, Edit2, Trash2, X, ChevronDown, ChevronUp, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler);

const ASSET_COLORS = {
  stock: '#378ADD',
  mutual_fund: '#7F77DD',
  crypto: '#EF9F27',
  fd: '#1D9E75',
  gold: '#BA7517',
  real_estate: '#D85A30',
  other: '#64748b'
};

const formatInr = (num) => Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const formatInrDecimals = (num) => Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Custom Plugin for Center Text in Donut
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw: function(chart) {
    if (chart.config.type !== 'doughnut') return;
    const width = chart.width, height = chart.height, ctx = chart.ctx;
    ctx.restore();
    const fontSize = (height / 114).toFixed(2);
    ctx.font = `bold ${fontSize}em sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#111827"; // gray-900

    const total = chart.config.data.datasets[0].totalValue || 0;
    const text = '₹' + formatInr(total);
    const textX = Math.round((width - ctx.measureText(text).width) / 2);
    const textY = height / 2;
    ctx.fillText(text, textX, textY);
    
    ctx.font = `500 ${(height / 250).toFixed(2)}em sans-serif`;
    ctx.fillStyle = "#6B7280"; // gray-500
    const subText = 'Total Value';
    const subTextX = Math.round((width - ctx.measureText(subText).width) / 2);
    ctx.fillText(subText, subTextX, textY - (height * 0.15));
    ctx.save();
  }
};

export default function Investments() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalMode, setModalMode] = useState(null); // 'add', 'edit', 'delete'
  const [activeAsset, setActiveAsset] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // -- FETCH CORE DATA --
  const { data, isLoading } = useQuery({
    queryKey: ['investments'],
    queryFn: async () => {
      const { data } = await api.get('/investments');
      return data.data;
    }
  });

  const { data: riskProfile } = useQuery({
    queryKey: ['riskProfile'],
    queryFn: async () => {
      try { const { data } = await api.get('/risk-profile'); return data.data; } 
      catch { return null; }
    }
  });

  const summary = data?.summary || { totalInvested: 0, currentValue: 0, totalPnl: 0, pnlPercent: 0, lastUpdated: null };
  const holdings = data?.holdings || [];

  // -- TIME LOGIC --
  const timeSinceLastUpdate = useMemo(() => {
    if (!summary.lastUpdated) return 'Never';
    const mins = Math.floor((new Date() - new Date(summary.lastUpdated)) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins/60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }, [summary.lastUpdated]);

  // -- REFRESH MUTATION --
  const refreshMut = useMutation({
    mutationFn: async () => await api.post('/investments/refresh-prices'),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['investments']);
      setIsRefreshing(false);
      if (res.data.cached) {
         showToast(res.data.message);
      } else {
         showToast('Prices updated — last refreshed just now');
      }
    },
    onError: () => setIsRefreshing(false)
  });

  // -- DELETE MUTATION --
  const deleteMut = useMutation({
    mutationFn: async (id) => await api.delete(`/investments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['investments']);
      setModalMode(null);
      showToast('Asset removed from portfolio');
    }
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshMut.mutate();
  };

  // -- DONUT CHART CONFIG --
  const assetMap = {};
  holdings.forEach(h => {
    assetMap[h.asset_type] = (assetMap[h.asset_type] || 0) + Number(h.live_value);
  });

  const sortedAssetKeys = Object.keys(assetMap).sort((a,b) => assetMap[b] - assetMap[a]);
  const totalPortValue = summary.currentValue;

  const donutData = {
    labels: sortedAssetKeys.map(k => `${k.replace('_', ' ').toUpperCase()} — ${((assetMap[k]/totalPortValue)*100).toFixed(1)}% — ₹${formatInr(assetMap[k])}`),
    datasets: [{
      data: sortedAssetKeys.map(k => assetMap[k]),
      backgroundColor: sortedAssetKeys.map(k => ASSET_COLORS[k] || ASSET_COLORS.other),
      borderWidth: 0,
      hoverOffset: 4,
      totalValue: totalPortValue
    }]
  };

  // -- HISTORICAL CHART MOCK --
  const historyData = useMemo(() => {
    const dates = [];
    const vals = [];
    const costs = [];
    const steps = 6;
    const now = new Date();
    
    // Reverse engineer a fake 6-month growth curve to demo historical graphing
    for(let i=5; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      dates.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
      
      const pct = (6 - i) / 6; 
      // Ramp up investment gradually
      const investedAtTime = summary.totalInvested * 0.4 + (summary.totalInvested * 0.6 * pct);
      costs.push(investedAtTime);
      
      // Values bounce around the cost basis, trending towards current true value
      const targetVal = summary.currentValue;
      const progressVal = targetVal * 0.4 + (targetVal * 0.6 * pct);
      const noise = progressVal * ((Math.random() * 0.04) - 0.02); // ±2% noise
      vals.push(i === 0 ? targetVal : progressVal + noise);
    }
    return { dates, vals, costs };
  }, [summary.totalInvested, summary.currentValue]);

  const lineChartData = {
    labels: historyData.dates,
    datasets: [
      {
        label: 'Portfolio Value',
        data: historyData.vals,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2
      },
      {
        label: 'Invested Amount',
        data: historyData.costs,
        borderColor: '#9ca3af',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        borderWidth: 2
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6 } },
      tooltip: { 
        callbacks: { 
          label: (ctx) => `${ctx.dataset.label}: ₹${formatInr(ctx.raw)}` 
        } 
      }
    },
    scales: {
      y: { ticks: { callback: v => '₹'+formatInr(v) }, grid: { borderDash: [2, 4] } },
      x: { grid: { display: false } }
    }
  };

  // -- RISK WARNING CALC --
  const cryptoAlloc = (assetMap['crypto'] || 0) / (totalPortValue || 1);
  const showRiskWarning = riskProfile?.risk_level === 'Conservative' && cryptoAlloc > 0.2;

  // -- HELPER COMPONENTS --
  const renderAssetBadge = (type) => {
    const color = ASSET_COLORS[type] || ASSET_COLORS.other;
    return (
      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider text-white border border-black/10 shadow-sm inline-block" style={{ backgroundColor: color }}>
        {type.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* TOAST NOTIFICATIONS */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center animate-in slide-in-from-bottom-5">
          <Info className="w-4 h-4 mr-2 text-indigo-400" />
          {toast}
        </div>
      )}

      {/* RISK MISMATCH BANNER */}
      {showRiskWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-amber-900 font-bold text-sm">High Risk Allocation</h4>
            <p className="text-amber-800 text-sm mt-0.5">Your Crypto allocation ({(cryptoAlloc*100).toFixed(0)}%) is high for a Conservative risk profile. Consider rebalancing.</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment Portfolio</h1>
          <p className="text-xs text-gray-500 mt-1">Track and manage your diverse assets</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="flex flex-col items-center flex-1 sm:flex-none">
            <button 
              onClick={handleRefresh} disabled={isRefreshing}
              className="w-full flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
            </button>
            <span className="text-[10px] text-gray-400 mt-1 hidden sm:block">Last updated: {timeSinceLastUpdate}</span>
          </div>
          <button onClick={() => { setActiveAsset(null); setModalMode('add'); }} className="h-fit flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors font-medium">
            <Plus className="w-5 h-5 mr-1" />
            Add Asset
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-center">
          <Wallet className="absolute top-1/2 -translate-y-1/2 -right-4 w-24 h-24 text-gray-50 opacity-50" />
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide">Invested Value</h3>
          <p className="text-2xl font-black text-gray-900 mt-1">₹{formatInrDecimals(summary.totalInvested)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-center">
          <TrendingUp className="absolute top-1/2 -translate-y-1/2 -right-4 w-24 h-24 text-gray-50 opacity-50" />
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide">Current Value</h3>
          <p className="text-2xl font-black text-gray-900 mt-1">₹{formatInrDecimals(summary.currentValue)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-center">
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide">Total Returns</h3>
          <div className="flex items-baseline mt-1 gap-2">
            <p className={cn("text-2xl font-black", summary.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {summary.totalPnl >= 0 ? '+' : '–'}₹{formatInrDecimals(Math.abs(summary.totalPnl))}
            </p>
            <div className={cn("flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md", summary.totalPnl >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
              {summary.pnlPercent >= 0 ? '+' : ''}{summary.pnlPercent.toFixed(2)}%
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-center">
           <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide">Assets in Portfolio</h3>
           <p className="text-2xl font-black text-gray-900 mt-1">{holdings.length} <span className="text-sm text-gray-400 font-medium">holdings</span></p>
           <p className="text-xs text-gray-500 font-medium mt-1">across {Object.keys(assetMap).length} asset types</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
      ) : holdings.length === 0 ? (
        <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
           <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6"><Wallet className="w-10 h-10 text-indigo-300" /></div>
           <h2 className="text-2xl font-bold text-gray-900 mb-2">Your portfolio is empty</h2>
           <p className="text-gray-500 max-w-sm mb-8">Start tracking your investments — stocks, mutual funds, crypto, FDs and more to visualize your growth.</p>
           <button onClick={() => { setActiveAsset(null); setModalMode('add'); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 hover:-translate-y-0.5 transition-all font-bold text-lg">
              + Add Your First Asset
           </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Asset Allocation Donut */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center h-[350px]">
              <h3 className="text-lg font-bold text-gray-900 mb-6 w-full text-left">Asset Allocation</h3>
              <div className="flex-1 w-full max-h-64 relative">
                <Doughnut 
                   data={donutData} 
                   options={{ 
                     maintainAspectRatio: false, 
                     cutout: '72%', 
                     plugins: { 
                       legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: {size: 11, family: 'sans-serif'} } } 
                     } 
                   }} 
                   plugins={[centerTextPlugin]}
                />
              </div>
            </div>

            {/* Portfolio Performance Line Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[350px] flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-left">Portfolio Performance</h3>
              <div className="flex-1 w-full relative">
                 <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>
          </div>

          {/* Holdings Grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
               <h3 className="text-lg font-bold text-gray-900">Your Holdings</h3>
            </div>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Asset</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Price</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Live Price</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Current Value</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">P&L</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {holdings.map((h) => {
                    const isExp = expandedRow === h.id;
                    const isGain = h.pnl >= 0;
                    return (
                      <React.Fragment key={h.id}>
                        <tr onClick={() => setExpandedRow(isExp ? null : h.id)} className="hover:bg-gray-50/70 transition-colors cursor-pointer group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 pr-4 break-words leading-tight">{h.name}</div>
                            <div className="mt-1.5 flex items-center space-x-2">
                              {renderAssetBadge(h.asset_type)}
                              {h.symbol && <span className="text-xs text-gray-400 font-semibold">{h.symbol}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-700 font-bold">
                            {Number(h.quantity).toLocaleString('en-IN', {maximumFractionDigits: 5})}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-500 font-medium">
                            ₹{formatInrDecimals(h.buy_price)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-900 font-bold">
                            ₹{formatInrDecimals(h.current_price)}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-gray-900 tracking-tight">
                            ₹{formatInrDecimals(h.live_value)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className={cn("text-sm font-bold tracking-tight", isGain ? "text-emerald-600" : "text-rose-600")}>
                              {isGain ? '+' : '–'}₹{formatInrDecimals(Math.abs(h.pnl))}
                            </div>
                            <div className={cn("text-xs font-bold mt-0.5", isGain ? "text-emerald-500" : "text-rose-500")}>
                              {isGain ? '+' : ''}{Number(h.pnl_percent).toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right w-24">
                            <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                               <button onClick={(e) => { e.stopPropagation(); setActiveAsset(h); setModalMode('edit'); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                               <button onClick={(e) => { e.stopPropagation(); setActiveAsset(h); setModalMode('delete'); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          </td>
                        </tr>
                        {isExp && (
                          <tr className="bg-gray-50/50 border-b border-gray-100 shadow-inner">
                             <td colSpan={7} className="px-6 py-4">
                                <div className="flex justify-between items-center text-sm">
                                   <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                                      <div><span className="text-gray-400 font-medium">Buy Date:</span> <span className="font-bold text-gray-700">{new Date(h.buy_date).toLocaleDateString('en-IN')}</span></div>
                                      <div><span className="text-gray-400 font-medium">Invested:</span> <span className="font-bold text-gray-700">₹{formatInrDecimals(h.amount_invested)}</span></div>
                                      <div className="col-span-2"><span className="text-gray-400 font-medium">Notes:</span> <span className="text-gray-600 italic">{h.notes || 'None'}</span></div>
                                   </div>
                                   <div className="h-12 w-32 shrink-0">
                                      {/* Tiny Sparkline */}
                                      <Line 
                                        options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{enabled:false}}, scales:{x:{display:false},y:{display:false}}, elements:{point:{radius:0}} }}
                                        data={{ labels:['1','2','3','4','5'], datasets:[{ data: [h.buy_price, h.buy_price*1.02, h.buy_price*0.99, h.current_price*0.98, h.current_price], borderColor: isGain?'#10b981':'#f43f5e', borderWidth: 2, tension: 0.3 }]}} 
                                      />
                                   </div>
                                </div>
                             </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* CRUD MODALS */}
      {modalMode === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
             <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Asset</h3>
             <p className="text-gray-500 mb-6">Are you sure you want to remove <b>{activeAsset?.name}</b> from your portfolio? This cannot be undone.</p>
             <div className="flex gap-3">
               <button onClick={() => setModalMode(null)} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50">Cancel</button>
               <button onClick={() => deleteMut.mutate(activeAsset.id)} className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 shadow-sm flex justify-center items-center">
                 {deleteMut.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Confirm Delete'}
               </button>
             </div>
          </div>
        </div>
      )}

      {(modalMode === 'add' || modalMode === 'edit') && (
        <AssetModal 
          tx={activeAsset} 
          onClose={() => setModalMode(null)} 
          onSuccess={(name) => { 
            queryClient.invalidateQueries(['investments']); 
            setModalMode(null); 
            showToast(modalMode === 'add' ? `${name} added to portfolio` : `${name} updated successfully`); 
          }} 
        />
      )}
    </div>
  );
}

function AssetModal({ tx, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    asset_type: tx?.asset_type || 'stock',
    name: tx?.name || '',
    symbol: tx?.symbol || '',
    quantity: tx?.quantity || '',
    buy_price: tx?.buy_price || '',
    buy_date: tx ? tx.buy_date.split('T')[0] : new Date().toISOString().split('T')[0],
    notes: tx?.notes || ''
  });
  
  const mut = useMutation({
    mutationFn: async (data) => tx ? await api.put(`/investments/${tx.id}`, data) : await api.post('/investments', data),
    onSuccess: () => onSuccess(formData.name)
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mut.mutate({...formData, quantity: Number(formData.quantity), buy_price: Number(formData.buy_price)});
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">{tx ? 'Edit Asset' : 'Add Asset'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 overflow-y-auto">
          <form id="ast-form" onSubmit={onSubmit} className="space-y-4">
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Asset Type*</label>
               <select required value={formData.asset_type} onChange={e=>setFormData({...formData, asset_type: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white font-medium">
                 {Object.keys(ASSET_COLORS).map(cat => <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Asset Name*</label>
               <input type="text" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-medium text-gray-900" placeholder="e.g. Reliance Industries" />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Symbol / Ticker</label>
               <input type="text" value={formData.symbol} onChange={e=>setFormData({...formData, symbol: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-medium" placeholder="RELIANCE, bitcoin, 120503..." />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Quantity*</label>
                 <input type="number" step="any" min="0.00001" required value={formData.quantity} onChange={e=>setFormData({...formData, quantity: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-bold" placeholder="e.g. 50" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Buy Price (₹)*</label>
                 <input type="number" step="any" min="0.01" required value={formData.buy_price} onChange={e=>setFormData({...formData, buy_price: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-bold" placeholder="0.00" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Buy Date*</label>
                 <input type="date" required value={formData.buy_date} onChange={e=>setFormData({...formData, buy_date: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-medium" />
               </div>
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Notes</label>
               <input type="text" value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 text-sm" placeholder="Optional notes..." />
             </div>
          </form>
        </div>
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-100">Cancel</button>
          <button type="submit" form="ast-form" disabled={mut.isPending} className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-sm flex justify-center items-center">
            {mut.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}
