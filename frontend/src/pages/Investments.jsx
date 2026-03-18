import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { Plus, RefreshCw, TrendingUp, TrendingDown, Wallet, Edit2, Trash2, X, ChevronDown, ChevronUp, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler);

const ASSET_COLORS = {
  stock: '#CC0000',
  mutual_fund: '#A855F7',
  crypto: '#FF9F43',
  fd: '#00C853',
  gold: '#EAB308',
  real_estate: '#3B82F6',
  other: '#6B7280'
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
    ctx.font = `bold ${fontSize}em "Bebas Neue", sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#F5F5F5"; // text-ignite-white

    const total = chart.config.data.datasets[0].totalValue || 0;
    const text = '₹' + formatInr(total);
    const textX = Math.round((width - ctx.measureText(text).width) / 2);
    const textY = height / 2;
    ctx.fillText(text, textX, textY);
    
    ctx.font = `600 ${(height / 300).toFixed(2)}em "Inter", sans-serif`;
    ctx.fillStyle = "#B0A0A0"; // text-ignite-muted
    const subText = 'TOTAL ASSET VOLUME';
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
    if (!summary.lastUpdated) return 'NEVER';
    const mins = Math.floor((new Date() - new Date(summary.lastUpdated)) / 60000);
    if (mins < 1) return 'JUST NOW';
    if (mins < 60) return `${mins} MIN AGO`;
    const hours = Math.floor(mins/60);
    return `${hours} HR AGO`;
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
         showToast('Node synced with market — live pricing active');
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
      showToast('Asset purged from portfolio matrix');
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
      borderColor: '#1A0000',
      borderWidth: 2,
      hoverOffset: 6,
      totalValue: totalPortValue
    }]
  };

  // -- HISTORICAL CHART MOCK --
  const historyData = useMemo(() => {
    const dates = [];
    const vals = [];
    const costs = [];
    const now = new Date();
    
    for(let i=5; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      dates.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }).toUpperCase());
      
      const pct = (6 - i) / 6; 
      const investedAtTime = summary.totalInvested * 0.4 + (summary.totalInvested * 0.6 * pct);
      costs.push(investedAtTime);
      
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
        borderColor: '#CC0000',
        backgroundColor: 'rgba(204, 0, 0, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2
      },
      {
        label: 'Invested Capital',
        data: historyData.costs,
        borderColor: '#6B7280',
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
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6, color: '#F5F5F5', font: { family: 'Inter', weight: 'bold' } } },
      tooltip: { 
        backgroundColor: '#110000',
        titleColor: '#F5F5F5',
        bodyColor: '#F5F5F5',
        borderColor: '#2D0000',
        borderWidth: 1,
        callbacks: { 
          label: (ctx) => `${ctx.dataset.label}: ₹${formatInr(ctx.raw)}` 
        } 
      }
    },
    scales: {
      y: { grid: { color: '#2D0000', drawBorder: false }, ticks: { color: '#B0A0A0', font: { family: 'Inter', weight: '600' }, callback: v => '₹'+formatInr(v) } },
      x: { grid: { display: false }, ticks: { color: '#B0A0A0', font: { family: 'Inter', weight: '600' } } }
    }
  };

  // -- RISK WARNING CALC --
  const cryptoAlloc = (assetMap['crypto'] || 0) / (totalPortValue || 1);
  const showRiskWarning = riskProfile?.risk_level === 'Conservative' && cryptoAlloc > 0.2;

  // -- HELPER COMPONENTS --
  const renderAssetBadge = (type) => {
    const color = ASSET_COLORS[type] || ASSET_COLORS.other;
    return (
      <span className="px-2.5 py-1 text-[10px] font-black tracking-widest text-[#F5F5F5] rounded border shadow-[inset_0_1px_3px_rgba(255,255,255,0.1)] inline-block uppercase bg-[#110000]/80 backdrop-blur" style={{ borderColor: color }}>
        <span className="w-2 h-2 rounded-full inline-block mr-1.5 align-middle" style={{ backgroundColor: color }}></span>
        {type.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* TOAST NOTIFICATIONS */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-ignite-bg border-l-[4px] border-ignite-success text-ignite-white px-6 py-3 rounded-lg shadow-ignite-card z-50 flex items-center animate-fade-in font-bold text-sm">
          <Info className="w-4 h-4 mr-2 text-ignite-success" />
          {toast}
        </div>
      )}

      {/* RISK MISMATCH BANNER */}
      {showRiskWarning && (
        <div className="bg-[#2D1A00] border border-ignite-warning rounded-xl p-4 flex items-start animate-fade-in slide-in-from-top-2 shadow-ignite-card">
          <AlertCircle className="w-5 h-5 text-ignite-warning mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-ignite-warning font-black text-sm uppercase tracking-widest">High Risk Allocation</h4>
            <p className="text-ignite-white font-medium text-[13px] mt-1">Decentralized asset allocation ({(cryptoAlloc*100).toFixed(0)}%) active. This conflicts with your Conservative structural profile. Consider rebalancing matrix.</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ignite-border pb-4">
        <div>
          <h1 className="text-4xl font-bebas tracking-[2px] text-ignite-white drop-shadow-md">Investment Portfolio</h1>
          <p className="text-sm font-bold text-ignite-muted uppercase tracking-widest mt-1">Multi-dimensional asset tracking</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="flex flex-col items-center flex-1 sm:flex-none">
            <button 
              onClick={handleRefresh} disabled={isRefreshing}
              className="w-full flex items-center justify-center px-4 py-2 bg-ignite-bg border border-ignite-border text-ignite-white rounded-xl shadow-sm hover:bg-ignite-card hover:border-ignite-bhover transition-all disabled:opacity-50 font-bold uppercase tracking-wider text-sm"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin text-ignite-red")} />
              {isRefreshing ? 'SYNCING...' : 'SYNC MARKET'}
            </button>
            <span className="text-[10px] text-ignite-muted mt-1.5 hidden sm:block font-bold tracking-widest">LIVE OVERRIDE: {timeSinceLastUpdate}</span>
          </div>
          <button onClick={() => { setActiveAsset(null); setModalMode('add'); }} className="h-fit flex-1 sm:flex-none flex items-center justify-center px-5 py-2.5 bg-ignite-red text-white rounded-xl shadow-ignite-card hover:bg-ignite-hover hover:scale-105 transition-all font-black tracking-widest uppercase text-sm">
            <Plus className="w-5 h-5 mr-1" /> ALLOCATE
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-ignite-card p-6 rounded-2xl shadow-ignite-card border-y border-r border-y-ignite-border border-r-ignite-border border-l-[4px] border-l-ignite-white relative overflow-hidden flex flex-col justify-center group hover:border-r-ignite-bhover transition-all">
          <Wallet className="absolute top-1/2 -translate-y-1/2 -right-4 w-28 h-28 text-ignite-white opacity-[0.03] group-hover:scale-110 transition-transform" />
          <h3 className="text-ignite-muted text-[11px] font-black uppercase tracking-widest z-10 relative">Gross Invested</h3>
          <p className="text-2xl font-black text-ignite-white mt-1 z-10 relative break-all tracking-tight pl-1 border-l-2 border-ignite-border pt-1">₹{formatInrDecimals(summary.totalInvested)}</p>
        </div>
        <div className="bg-ignite-card p-6 rounded-2xl shadow-ignite-card border-y border-r border-y-ignite-border border-r-ignite-border border-l-[4px] border-l-ignite-success relative overflow-hidden flex flex-col justify-center group hover:border-r-ignite-bhover transition-all">
          <TrendingUp className="absolute top-1/2 -translate-y-1/2 -right-4 w-28 h-28 text-ignite-success opacity-10 group-hover:scale-110 transition-transform" />
          <h3 className="text-ignite-muted text-[11px] font-black uppercase tracking-widest z-10 relative">Live Valuation</h3>
          <p className="text-3xl font-black mt-1 z-10 relative tracking-tight text-ignite-success">₹{formatInrDecimals(summary.currentValue)}</p>
        </div>
        <div className="bg-ignite-card p-6 rounded-2xl shadow-ignite-card border-y border-r border-y-ignite-border border-r-ignite-border border-l-[4px] border-l-ignite-red relative overflow-hidden flex flex-col justify-center group hover:border-r-ignite-bhover transition-all">
          <h3 className="text-ignite-muted text-[11px] font-black uppercase tracking-widest z-10 relative">Total Matrix PnL</h3>
          <div className="flex items-baseline mt-1 gap-2 z-10 relative">
            <p className={cn("text-2xl font-black tracking-tight", summary.totalPnl >= 0 ? "text-ignite-success" : "text-ignite-alert drop-shadow-[0_0_8px_rgba(255,68,68,0.3)]")}>
              {summary.totalPnl >= 0 ? '+' : '–'}₹{formatInrDecimals(Math.abs(summary.totalPnl))}
            </p>
            <div className={cn("flex items-center text-[11px] font-black tracking-widest px-2 py-0.5 rounded border", summary.totalPnl >= 0 ? "bg-[#0A2D0A] text-ignite-success border-ignite-success/30" : "bg-[#2D0000] text-ignite-alert border-ignite-alert/30")}>
              {summary.pnlPercent >= 0 ? '+' : ''}{summary.pnlPercent.toFixed(2)}%
            </div>
          </div>
        </div>
        <div className="bg-ignite-card p-6 rounded-2xl shadow-ignite-card border border-ignite-border relative overflow-hidden flex flex-col justify-center">
           <h3 className="text-ignite-muted text-[11px] font-black uppercase tracking-widest z-10 relative">Network Complexity</h3>
           <p className="text-3xl font-black text-ignite-white mt-1.5 flex items-end tracking-tight">
             {holdings.length}
             <span className="text-xs text-ignite-muted font-bold ml-2 uppercase tracking-widest mb-1">nodes</span>
           </p>
           <p className="text-[10px] text-ignite-muted font-black mt-1 uppercase tracking-widest">Span: {Object.keys(assetMap).length} dimensions</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-ignite-card border border-ignite-border rounded-2xl"><div className="w-10 h-10 border-4 border-[#2D0000] border-t-ignite-red rounded-full animate-spin"></div></div>
      ) : holdings.length === 0 ? (
        <div className="bg-ignite-card p-16 rounded-2xl shadow-ignite-card border border-ignite-border text-center flex flex-col items-center">
           <div className="w-24 h-24 bg-ignite-bg border border-ignite-border rounded-full flex items-center justify-center mb-6 shadow-[inset_0_4px_20px_rgba(204,0,0,0.05)]"><Wallet className="w-10 h-10 text-ignite-red/50" /></div>
           <h2 className="text-3xl font-bebas tracking-[2px] text-ignite-white mb-2">Portfolio Dimensions Unmapped</h2>
           <p className="text-ignite-muted max-w-sm mb-8 text-sm font-medium">Initialize tracking sequences. Allocate stock vectors, digital assets, or physical securities to establish network growth.</p>
           <button onClick={() => { setActiveAsset(null); setModalMode('add'); }} className="px-8 py-4 bg-ignite-red text-white rounded-xl shadow-ignite-card hover:bg-ignite-hover transition-all font-black text-[13px] tracking-widest uppercase hover:scale-105 active:scale-95">
              INJECT FIRST ASSET
           </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Asset Allocation Donut */}
            <div className="bg-ignite-card p-6 rounded-2xl shadow-ignite-card border border-ignite-border flex flex-col justify-center h-[380px] hover:border-ignite-bhover transition-colors">
              <h3 className="text-2xl font-bebas tracking-[2px] text-ignite-white mb-6 w-full border-b border-ignite-border pb-2">Asset Geography</h3>
              <div className="flex-1 w-full max-h-64 relative">
                <Doughnut 
                   data={donutData} 
                   options={{ 
                     maintainAspectRatio: false, 
                     cutout: '72%', 
                     plugins: { 
                       legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: {family: 'Inter', weight: 'bold'}, color: '#B0A0A0' } } 
                     } 
                   }} 
                   plugins={[centerTextPlugin]}
                />
              </div>
            </div>

            {/* Portfolio Performance Line Chart */}
            <div className="lg:col-span-2 bg-ignite-card p-6 rounded-2xl shadow-ignite-card border border-ignite-border h-[380px] flex flex-col hover:border-ignite-bhover transition-colors">
              <h3 className="text-2xl font-bebas tracking-[2px] text-ignite-white mb-4 border-b border-ignite-border pb-2">Valuation Trajectory</h3>
              <div className="flex-1 w-full relative">
                 <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>
          </div>

          {/* Holdings Grid */}
          <div className="bg-ignite-card rounded-2xl shadow-ignite-card border border-ignite-border overflow-hidden">
            <div className="p-6 border-b border-ignite-border bg-[#110000]">
               <h3 className="text-2xl font-bebas tracking-[2px] text-ignite-white">Network Nodes</h3>
            </div>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="min-w-full divide-y divide-[#230000]">
                <thead className="bg-[#110000]">
                  <tr>
                    <th className="px-6 py-4 text-left text-[11px] font-black text-ignite-muted uppercase tracking-widest">Asset Vector</th>
                    <th className="px-6 py-4 text-right text-[11px] font-black text-ignite-muted uppercase tracking-widest">Packets [QTY]</th>
                    <th className="px-6 py-4 text-right text-[11px] font-black text-ignite-muted uppercase tracking-widest">Entry Price</th>
                    <th className="px-6 py-4 text-right text-[11px] font-black text-ignite-muted uppercase tracking-widest text-[#F5F5F5]">Live Map</th>
                    <th className="px-6 py-4 text-right text-[11px] font-black text-ignite-muted uppercase tracking-widest">Dimensions [VAL]</th>
                    <th className="px-6 py-4 text-right text-[11px] font-black text-ignite-muted uppercase tracking-widest">Delta (PnL)</th>
                    <th className="px-6 py-4 w-[100px]"></th>
                  </tr>
                </thead>
                <tbody className="bg-ignite-card divide-y divide-[#230000]">
                  {holdings.map((h) => {
                    const isExp = expandedRow === h.id;
                    const isGain = h.pnl >= 0;
                    return (
                      <React.Fragment key={h.id}>
                        <tr onClick={() => setExpandedRow(isExp ? null : h.id)} className={`hover:bg-ignite-bg transition-colors cursor-pointer group ${isExp ? 'bg-ignite-bg' : ''}`}>
                          <td className="px-6 py-5">
                            <div className="font-extrabold text-[#F5F5F5] uppercase tracking-wide pr-4 break-words leading-tight">{h.name}</div>
                            <div className="mt-2 flex items-center space-x-2">
                              {renderAssetBadge(h.asset_type)}
                              {h.symbol && <span className="text-[11px] text-[#6B5555] font-black tracking-widest">{h.symbol}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right font-black text-ignite-white tracking-widest text-sm">
                            {Number(h.quantity).toLocaleString('en-IN', {maximumFractionDigits: 5})}
                          </td>
                          <td className="px-6 py-5 text-right text-sm text-ignite-muted font-bold">
                            ₹{formatInrDecimals(h.buy_price)}
                          </td>
                          <td className="px-6 py-5 text-right font-bebas tracking-[1px] text-lg text-ignite-white">
                            <span className="text-ignite-muted mr-1">₹</span>{formatInrDecimals(h.current_price)}
                          </td>
                          <td className="px-6 py-5 text-right font-black text-ignite-white tracking-tight border-l border-[#2D0000]">
                            ₹{formatInrDecimals(h.live_value)}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className={cn("text-sm font-black tracking-widest leading-none", isGain ? "text-ignite-success" : "text-ignite-alert")}>
                              {isGain ? '+' : '–'}₹{formatInrDecimals(Math.abs(h.pnl))}
                            </div>
                            <div className={cn("text-[11px] font-black uppercase mt-1.5 px-1.5 py-[1px] rounded inline-block", isGain ? "bg-[#0A2D0A] text-ignite-success" : "bg-[#2D0000] text-ignite-alert")}>
                              {isGain ? '+' : ''}{Number(h.pnl_percent).toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right relative">
                            <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                               <button onClick={(e) => { e.stopPropagation(); setActiveAsset(h); setModalMode('edit'); }} className="p-2 text-ignite-muted hover:text-ignite-white hover:bg-[#2D0000] border border-transparent hover:border-ignite-border rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                               <button onClick={(e) => { e.stopPropagation(); setActiveAsset(h); setModalMode('delete'); }} className="p-2 text-ignite-muted hover:text-ignite-alert hover:bg-[#2D0000] border border-transparent hover:border-ignite-border rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          </td>
                        </tr>
                        {isExp && (
                          <tr className="bg-[#110000]/50 border-b border-ignite-border shadow-[inset_0_3px_10px_rgba(0,0,0,0.5)]">
                             <td colSpan={7} className="px-6 py-5">
                                <div className="flex justify-between items-center text-sm">
                                   <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                                      <div><span className="text-[10px] font-black text-ignite-muted uppercase tracking-widest block mb-1">Execution T-Stamp:</span> <span className="font-bold text-ignite-white">{new Date(h.buy_date).toLocaleDateString('en-IN').toUpperCase()}</span></div>
                                      <div><span className="text-[10px] font-black text-ignite-muted uppercase tracking-widest block mb-1">Gross Capital:</span> <span className="font-bold text-ignite-white">₹{formatInrDecimals(h.amount_invested)}</span></div>
                                      <div className="col-span-2"><span className="text-[10px] font-black text-ignite-muted uppercase tracking-widest block mb-1">Decrypted Metadata:</span> <span className="font-medium text-[#6B5555] italic text-sm">{h.notes || 'NO EXTRACTION DATA'}</span></div>
                                   </div>
                                   <div className="h-14 w-40 shrink-0 opacity-80 border-l border-ignite-border pl-4">
                                      {/* Tiny Sparkline */}
                                      <Line 
                                        options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{enabled:false}}, scales:{x:{display:false},y:{display:false}}, elements:{point:{radius:0}} }}
                                        data={{ labels:['1','2','3','4','5'], datasets:[{ data: [h.buy_price, h.buy_price*1.02, h.buy_price*0.99, h.current_price*0.98, h.current_price], borderColor: isGain?'#00C853':'#FF4444', borderWidth: 2, tension: 0.3 }]}} 
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in relative">
          <div className="bg-ignite-card border border-ignite-border rounded-2xl p-8 w-full max-w-sm shadow-ignite-card relative overflow-hidden z-10">
             <div className="absolute top-0 right-0 w-32 h-32 bg-ignite-alert/10 rounded-full blur-[40px] pointer-events-none"></div>
             <h3 className="text-3xl font-bebas tracking-[2px] text-ignite-white mb-2 relative z-10">Purge Asset Vector</h3>
             <p className="text-ignite-muted text-sm font-medium mb-8 relative z-10">Confirm termination of <b className="text-ignite-red uppercase">{activeAsset?.name}</b> from matrix schema. This data shift cannot be reversed.</p>
             <div className="flex gap-4 relative z-10">
               <button onClick={() => setModalMode(null)} className="flex-1 py-3 bg-ignite-bg border border-ignite-border text-ignite-white font-bold rounded-xl hover:bg-[#2D0000] transition-colors text-sm uppercase tracking-wider text-center">Abort</button>
               <button onClick={() => deleteMut.mutate(activeAsset.id)} className="flex-1 py-3 border border-ignite-alert bg-ignite-alert/20 text-ignite-alert font-bold rounded-xl hover:bg-ignite-alert hover:text-white shadow-[0_0_15px_rgba(255,68,68,0.3)] transition-all flex justify-center items-center text-sm uppercase tracking-wider">
                 {deleteMut.isPending ? <div className="w-5 h-5 border-2 border-transparent border-t-white rounded-full animate-spin"></div> : 'EXECUTE PURGE'}
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
            showToast(modalMode === 'add' ? `Dim Map established for ${name}` : `Metadata parameter overwritten for ${name}`); 
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in relative">
      <div className="bg-ignite-card border border-ignite-border rounded-2xl w-full max-w-lg shadow-[0_4px_40px_rgba(204,0,0,0.2)] overflow-hidden flex flex-col max-h-[90vh] relative z-20">
        <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-ignite-red/10 rounded-full blur-[50px] pointer-events-none"></div>
        <div className="flex justify-between items-center p-6 border-b border-ignite-border relative z-10 bg-[#110000]">
          <h3 className="text-3xl font-bebas tracking-[2px] text-ignite-white">{tx ? 'Override Vector Map' : 'Initialize Asset Sequence'}</h3>
          <button onClick={onClose} className="p-2 bg-ignite-bg border border-ignite-border rounded hover:border-ignite-red hover:text-ignite-red text-ignite-muted transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar relative z-10 bg-ignite-card">
          <form id="ast-form" onSubmit={onSubmit} className="space-y-6">
             <div>
               <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Class Structure*</label>
               <select required value={formData.asset_type} onChange={e=>setFormData({...formData, asset_type: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-4 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-[15px] font-bold text-ignite-white appearance-none">
                 {Object.keys(ASSET_COLORS).map(cat => <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Primary Node Designation*</label>
               <input type="text" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-3 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-[15px] font-bold text-ignite-white placeholder-[#6B5555]" placeholder="e.g. Cyberdyne Systems Inc." />
             </div>
             <div>
               <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Global Tracker Identity</label>
               <input type="text" value={formData.symbol} onChange={e=>setFormData({...formData, symbol: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-3 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-[15px] font-bold text-ignite-white placeholder-[#6B5555]" placeholder="SYS, CDYNE" />
             </div>
             <div className="grid grid-cols-2 gap-5">
               <div>
                 <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Packets [QTY]*</label>
                 <input type="number" step="any" min="0.00001" required value={formData.quantity} onChange={e=>setFormData({...formData, quantity: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-3 outline-none focus:border-ignite-red focus:shadow-ignite-focus font-bold text-ignite-white placeholder-[#6B5555]" placeholder="e.g. 100" />
               </div>
               <div>
                 <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Base Cost (₹)*</label>
                 <input type="number" step="any" min="0.01" required value={formData.buy_price} onChange={e=>setFormData({...formData, buy_price: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-3 outline-none focus:border-ignite-red focus:shadow-ignite-focus font-bold text-ignite-white placeholder-[#6B5555]" placeholder="0.00" />
               </div>
               <div className="col-span-2 sm:col-span-1">
                 <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Execution Timeline*</label>
                 <input type="date" required value={formData.buy_date} onChange={e=>setFormData({...formData, buy_date: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-3 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-sm font-bold text-ignite-white [color-scheme:dark]" />
               </div>
             </div>
             <div>
               <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Encrypted Block (Meta)</label>
               <input type="text" value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-3 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-sm font-medium text-ignite-white placeholder-[#6B5555]" placeholder="Supplemental telemetry..." />
             </div>
          </form>
        </div>
        <div className="p-5 border-t border-ignite-border bg-[#110000] flex gap-4 relative z-10">
          <button type="button" onClick={onClose} className="flex-[0.5] py-3.5 bg-ignite-bg border border-ignite-border text-ignite-white font-black text-[13px] tracking-widest uppercase rounded-xl hover:bg-[#2D0000] transition-colors">Abhort</button>
          <button type="submit" form="ast-form" disabled={mut.isPending} className="flex-1 py-3.5 bg-ignite-red text-white font-black text-[13px] tracking-widest uppercase rounded-xl hover:bg-ignite-hover hover:shadow-[0_0_20px_rgba(204,0,0,0.4)] transition-all flex justify-center items-center">
            {mut.isPending ? <div className="w-5 h-5 border-2 border-transparent border-b-white border-l-white rounded-full animate-spin"></div> : 'COMMIT TO MATRIX'}
          </button>
        </div>
      </div>
    </div>
  );
}
