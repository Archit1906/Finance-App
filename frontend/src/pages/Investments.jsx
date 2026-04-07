import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { Plus, RefreshCw, X, AlertCircle, Info, Database, Cpu, Activity, Hexagon, ArrowUpRight, ArrowDownRight, Edit2, Trash2, Radar } from 'lucide-react';
import { cn } from '../lib/utils';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler);

const ASSET_COLORS = {
  stock: '#00E5FF',     // Cyan
  mutual_fund: '#A855F7',
  crypto: '#ADFF2F',    // Cyber Lime
  fd: '#3B82F6',
  gold: '#F59E0B',
  real_estate: '#EC4899',
  other: '#6B7280'
};

const formatInr = (num) => Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const formatInrDecimals = (num) => Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const centerTextPlugin = {
  id: 'centerText',
  beforeDraw: function(chart) {
    if (chart.config.type !== 'doughnut') return;
    const ctx = chart.ctx;
    ctx.restore();
    
    const cx = (chart.chartArea.left + chart.chartArea.right) / 2;
    const cy = (chart.chartArea.top + chart.chartArea.bottom) / 2;
    const innerRadius = chart.innerRadius || (Math.min(chart.chartArea.right - chart.chartArea.left, chart.chartArea.bottom - chart.chartArea.top) / 2 * 0.7);

    const total = chart.config.data.datasets[0].totalValue || 0;
    const text = '₹' + formatInr(total);
    const subText = 'TOTAL ASSET VOLUME';

    // SubText
    let subFontSize = innerRadius * 0.16;
    ctx.font = `bold ${Math.round(subFontSize)}px "JetBrains Mono", monospace`;
    if (ctx.measureText(subText).width > innerRadius * 1.7) {
       subFontSize = subFontSize * ((innerRadius * 1.7) / ctx.measureText(subText).width);
       ctx.font = `bold ${Math.round(subFontSize)}px "JetBrains Mono", monospace`;
    }
    ctx.fillStyle = "#00E5FF"; 
    ctx.textBaseline = "bottom";
    const subTextX = cx - (ctx.measureText(subText).width / 2);
    ctx.fillText(subText, subTextX, cy - 2);

    // Main Value
    let mainFontSize = innerRadius * 0.35;
    ctx.font = `bold ${Math.round(mainFontSize)}px "JetBrains Mono", monospace`;
    if (ctx.measureText(text).width > innerRadius * 1.8) {
       mainFontSize = mainFontSize * ((innerRadius * 1.8) / ctx.measureText(text).width);
       ctx.font = `bold ${Math.round(mainFontSize)}px "JetBrains Mono", monospace`;
    }
    ctx.fillStyle = "#ADFF2F"; 
    ctx.shadowColor = "rgba(173, 255, 47, 0.4)";
    ctx.shadowBlur = 12;
    ctx.textBaseline = "top";
    const textX = cx - (ctx.measureText(text).width / 2);
    ctx.fillText(text, textX, cy + 2);
    
    ctx.shadowBlur = 0;
    ctx.save();
  }
};

export default function Investments() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalMode, setModalMode] = useState(null); 
  const [activeAsset, setActiveAsset] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [toast, setToast] = useState('');
  
  // Filter state
  const [activeFilter, setActiveFilter] = useState('All');
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

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

  const filteredHoldings = useMemo(() => {
    if (activeFilter === 'All') return holdings;
    return holdings.filter(h => h.asset_type === activeFilter.toLowerCase().replace(' ', '_'));
  }, [holdings, activeFilter]);

  const timeSinceLastUpdate = useMemo(() => {
    if (!summary.lastUpdated) return 'NEVER';
    const mins = Math.floor((new Date() - new Date(summary.lastUpdated)) / 60000);
    if (mins < 1) return 'JUST NOW';
    if (mins < 60) return `${mins} MIN AGO`;
    const hours = Math.floor(mins/60);
    return `${hours} HR AGO`;
  }, [summary.lastUpdated]);

  const refreshMut = useMutation({
    mutationFn: async () => await api.post('/investments/refresh-prices'),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['investments']);
      setIsRefreshing(false);
      showToast(res.data.cached ? res.data.message : 'Node synced with market — live pricing active');
    },
    onError: () => setIsRefreshing(false)
  });

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

  const assetMap = {};
  holdings.forEach(h => {
    assetMap[h.asset_type] = (assetMap[h.asset_type] || 0) + Number(h.live_value);
  });

  const sortedAssetKeys = Object.keys(assetMap).sort((a,b) => assetMap[b] - assetMap[a]);
  const totalPortValue = summary.currentValue;

  // Donut data with hover interactions
  const donutData = {
    labels: sortedAssetKeys.map(k => `${k.replace('_', ' ').toUpperCase()} — ${((assetMap[k]/totalPortValue)*100).toFixed(1)}% — ₹${formatInr(assetMap[k])}`),
    datasets: [{
      data: sortedAssetKeys.map(k => assetMap[k]),
      backgroundColor: sortedAssetKeys.map(k => {
         const baseColor = ASSET_COLORS[k] || ASSET_COLORS.other;
         if (hoveredCategory && hoveredCategory !== k) return '#222222';
         return baseColor;
      }),
      borderColor: '#101010',
      borderWidth: 2,
      hoverOffset: 8,
      totalValue: totalPortValue
    }]
  };

  // Historical data mock for area chart
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
      const noise = progressVal * ((Math.random() * 0.04) - 0.02); 
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
        borderColor: '#00E5FF',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(0, 229, 255, 0.4)');
          gradient.addColorStop(1, 'rgba(0, 229, 255, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.3,
        borderWidth: 3,
        pointBackgroundColor: '#ADFF2F',
        pointBorderColor: '#00E5FF',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Invested Capital',
        data: historyData.costs,
        borderColor: 'rgba(204, 0, 0, 0.5)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 0
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6, color: '#00E5FF', font: { family: '"JetBrains Mono", monospace', weight: '600' } } },
      tooltip: { 
        backgroundColor: 'rgba(16, 16, 16, 0.8)',
        backdropFilter: 'blur(10px)',
        titleColor: '#00E5FF',
        bodyColor: '#F5F5F5',
        borderColor: '#00E5FF',
        borderWidth: 1,
        titleFont: { family: '"JetBrains Mono", monospace' },
        bodyFont: { family: '"JetBrains Mono", monospace' },
        callbacks: { 
          label: (ctx) => `${ctx.dataset.label}: ₹${formatInr(ctx.raw)}` 
        } 
      }
    },
    scales: {
      y: { grid: { color: 'rgba(0, 229, 255, 0.05)', drawBorder: false }, ticks: { color: '#00E5FF', font: { family: '"JetBrains Mono", monospace', weight: '600' }, callback: v => '₹'+formatInr(v) } },
      x: { grid: { display: false }, ticks: { color: '#00E5FF', font: { family: '"JetBrains Mono", monospace', weight: '600' } } }
    }
  };

  const cryptoAlloc = (assetMap['crypto'] || 0) / (totalPortValue || 1);
  const showRiskWarning = riskProfile?.risk_level === 'Conservative' && cryptoAlloc > 0.2;

  const renderIcon = (type) => {
    switch (type) {
        case 'crypto': return <Hexagon className="w-5 h-5 opacity-70" />;
        case 'stock': return <Activity className="w-5 h-5 opacity-70" />;
        case 'mutual_fund': return <Database className="w-5 h-5 opacity-70" />;
        default: return <Cpu className="w-5 h-5 opacity-70" />;
    }
  };

  const renderAssetBadge = (type) => {
    const color = ASSET_COLORS[type] || ASSET_COLORS.other;
    return (
      <span className="px-2.5 py-1 text-[10px] font-black tracking-widest text-[#F5F5F5] rounded border inline-block uppercase bg-[#111]/80 backdrop-blur" style={{ borderColor: color, boxShadow: `0 0 10px ${color}33`, color: color }}>
        {type.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-ignite-cyan/10 to-transparent blur-[100px] pointer-events-none -z-10"></div>
      
      {toast && (
        <div className="fixed bottom-6 right-6 bg-ignite-bg border-l-[4px] border-ignite-cyan text-ignite-white px-6 py-3 rounded-lg shadow-ignite-focus z-50 flex items-center animate-fade-in font-mono font-bold text-sm">
          <Info className="w-4 h-4 mr-2 text-ignite-cyan" />
          {toast}
        </div>
      )}

      {showRiskWarning && (
        <div className="bg-[#1a1a1a]/60 backdrop-blur-md border border-ignite-warning rounded-xl p-4 flex items-start animate-fade-in slide-in-from-top-2 shadow-[0_0_20px_rgba(255,179,0,0.15)]">
          <AlertCircle className="w-5 h-5 text-ignite-warning mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-ignite-warning font-black text-sm uppercase tracking-widest font-mono">High Risk Allocation</h4>
            <p className="text-ignite-white font-medium text-[13px] mt-1 font-mono">Decentralized asset allocation ({(cryptoAlloc*100).toFixed(0)}%) active. This conflicts with your Conservative structural profile. Consider rebalancing matrix.</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-4xl font-bebas tracking-[2px] text-ignite-cyan drop-shadow-[0_0_15px_rgba(0,229,255,0.3)]">Investment Portfolio</h1>
          <p className="text-sm font-bold text-ignite-muted uppercase tracking-widest mt-1 font-mono">Multi-dimensional asset tracking</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto items-center">
          <div className="flex items-center gap-3">
             <div className="flex items-center text-[10px] text-ignite-cyan font-bold tracking-widest font-mono">
                <div className="w-2 h-2 rounded-full bg-ignite-cyan mr-1.5 animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]"></div>
                OVERRIDE: {timeSinceLastUpdate}
             </div>
             <button 
               onClick={handleRefresh} disabled={isRefreshing}
               className="flex items-center justify-center px-4 py-2 bg-black/40 backdrop-blur-md border border-ignite-cyan/30 text-ignite-cyan rounded-xl shadow-sm hover:bg-ignite-cyan/10 hover:border-ignite-cyan transition-all disabled:opacity-50 font-bold uppercase tracking-wider text-sm font-mono"
             >
               <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin text-ignite-cyan")} />
               {isRefreshing ? 'SYNCING...' : 'SYNC MARKET'}
             </button>
          </div>
          <button onClick={() => { setActiveAsset(null); setModalMode('add'); }} className="h-fit flex-1 sm:flex-none flex items-center justify-center px-5 py-2.5 bg-ignite-cyan/10 border border-ignite-cyan text-ignite-cyan rounded-xl shadow-[0_0_15px_rgba(0,229,255,0.2)] hover:bg-ignite-cyan hover:text-black hover:shadow-[0_0_25px_rgba(0,229,255,0.5)] transition-all font-black tracking-widest uppercase text-sm font-mono">
            <Plus className="w-5 h-5 mr-1" /> ALLOCATE
          </button>
        </div>
      </div>

      {/* METRICS ROW (Unified Panel) */}
      <div className="grid grid-cols-1 md:grid-cols-4 bg-[#1a1a1a]/40 backdrop-blur-xl border border-ignite-border rounded-2xl shadow-ignite-card divide-y md:divide-y-0 md:divide-x divide-ignite-border/50 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-ignite-cyan/5 to-transparent pointer-events-none opacity-50"></div>
        <div className="p-6 flex flex-col justify-center relative group">
          <h3 className="text-ignite-muted text-[11px] font-black uppercase tracking-widest font-mono mb-2">Gross Invested</h3>
          <p className="text-2xl font-black text-[#E0E0E0] drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] tracking-tight font-mono">₹{formatInrDecimals(summary.totalInvested)}</p>
        </div>
        <div className="p-6 flex flex-col justify-center relative group">
          <h3 className="text-ignite-muted text-[11px] font-black uppercase tracking-widest font-mono mb-2">Live Valuation</h3>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-ignite-lime rounded-full animate-ping"></div>
             <p className="text-3xl font-black text-ignite-lime drop-shadow-[0_0_12px_rgba(173,255,47,0.4)] tracking-tight font-mono">₹{formatInrDecimals(summary.currentValue)}</p>
          </div>
        </div>
        <div className="p-6 flex flex-col justify-center relative group">
          <h3 className="text-ignite-muted text-[11px] font-black uppercase tracking-widest font-mono mb-2">Total Matrix PnL</h3>
          <div className="flex items-baseline gap-3 mt-1">
            <p className={cn("text-2xl font-black tracking-tight font-mono", summary.totalPnl >= 0 ? "text-ignite-lime drop-shadow-[0_0_10px_rgba(173,255,47,0.3)]" : "text-ignite-red drop-shadow-[0_0_10px_rgba(204,0,0,0.3)]")}>
              {summary.totalPnl >= 0 ? '+' : '–'}₹{formatInrDecimals(Math.abs(summary.totalPnl))}
            </p>
            <div className={cn("flex items-center text-[12px] font-black tracking-widest px-2 py-0.5 rounded border shadow-sm font-mono", summary.totalPnl >= 0 ? "bg-ignite-lime/10 text-ignite-lime border-ignite-lime/30" : "bg-ignite-red/10 text-ignite-red border-ignite-red/30")}>
              {summary.pnlPercent >= 0 ? '+' : ''}{summary.pnlPercent.toFixed(2)}%
            </div>
          </div>
        </div>
        <div className="p-6 flex flex-col justify-center relative group">
           <h3 className="text-ignite-muted text-[11px] font-black uppercase tracking-widest font-mono mb-2">Network Complexity</h3>
           <div className="flex items-center gap-5">
             <div className="flex items-center gap-1.5 text-2xl font-black text-ignite-cyan font-mono drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]">
               {holdings.length} <Activity className="w-4 h-4 text-ignite-cyan/70"/>
             </div>
             <div className="w-px h-6 bg-ignite-border/50"></div>
             <div className="flex items-center gap-1.5 text-lg font-black text-ignite-cyan font-mono opacity-80">
               {Object.keys(assetMap).length} <Radar className="w-4 h-4 text-ignite-cyan/60" />
             </div>
           </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-ignite-card backdrop-blur-xl border border-ignite-border rounded-2xl"><div className="w-10 h-10 border-4 border-transparent border-t-ignite-cyan rounded-full animate-spin"></div></div>
      ) : holdings.length === 0 ? (
         // Empty State (same as before)
         <div className="bg-ignite-card p-16 rounded-2xl shadow-ignite-card border border-ignite-border text-center flex flex-col items-center">
            <h2 className="text-3xl font-bebas tracking-[2px] text-ignite-cyan mb-2">Portfolio Dimensions Unmapped</h2>
         </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#1a1a1a]/40 backdrop-blur-xl p-6 rounded-2xl shadow-ignite-card border border-ignite-border flex flex-col h-[520px] transition-colors hover:border-ignite-cyan/30 group">
              <h3 className="text-[22px] font-sans tracking-widest text-[#E0E0E0] mb-4 w-full border-b border-[#222] pb-3 font-medium">
                 Asset Geography
              </h3>
              <div className="flex-1 w-full relative min-h-0">
                <Doughnut 
                   data={donutData} 
                   options={{ 
                     maintainAspectRatio: false, 
                     cutout: '70%', 
                     layout: { padding: { bottom: 10, top: 10 } },
                     plugins: { 
                       legend: { display: false },
                       tooltip: { enabled: false }
                     } 
                   }} 
                   plugins={[centerTextPlugin]}
                />
              </div>
              <div className="mt-2 flex justify-center pb-2">
                <div className="flex flex-col space-y-1.5">
                   {sortedAssetKeys.map(k => (
                     <div 
                        key={k} 
                        className={cn("flex items-center text-[13px] font-mono font-bold transition-all cursor-pointer", hoveredCategory === k ? "text-[#F5F5F5] scale-105" : "text-[#B0A0A0]")}
                        onMouseEnter={() => setHoveredCategory(k)}
                        onMouseLeave={() => setHoveredCategory(null)}
                     >
                       <span className="w-3.5 h-3.5 rounded-full mr-3 shadow-sm border border-black/20" style={{ backgroundColor: ASSET_COLORS[k] || ASSET_COLORS.other, boxShadow: hoveredCategory === k ? `0 0 12px ${ASSET_COLORS[k]}99` : 'none' }}></span>
                       <span className="tracking-widest">{k.replace('_', ' ').toUpperCase()} - {((assetMap[k]/totalPortValue)*100).toFixed(1)}% - ₹{formatInr(assetMap[k])}</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-[#1a1a1a]/40 backdrop-blur-xl p-6 rounded-2xl shadow-ignite-card border border-ignite-border h-[520px] flex flex-col transition-colors hover:border-ignite-cyan/30">
              <h3 className="text-xl font-bebas tracking-[2px] text-ignite-white mb-4 border-b border-[#222] pb-2 flex items-center justify-between">
                 Valuation Trajectory
              </h3>
              <div className="flex-1 w-full relative">
                 <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a]/40 backdrop-blur-xl rounded-2xl shadow-ignite-card border border-ignite-border overflow-hidden">
            <div className="p-5 border-b border-[#222] bg-[#111]">
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bebas tracking-[2px] text-ignite-white">Network Matrix</h3>
                  <div className="flex gap-2">
                     {['All', 'Stock', 'Crypto', 'Mutual Fund', 'FD', 'Gold'].map(filter => (
                        <button 
                           key={filter} 
                           onClick={() => setActiveFilter(filter)}
                           className={cn("px-3 py-1 rounded text-[11px] font-mono font-bold tracking-widest border transition-all", activeFilter === filter ? "bg-ignite-cyan/20 border-ignite-cyan text-ignite-cyan shadow-[0_0_10px_rgba(0,229,255,0.3)]" : "bg-transparent border-[#333] text-ignite-muted hover:border-ignite-cyan/50")}
                        >
                           {filter}
                        </button>
                     ))}
                  </div>
               </div>
            </div>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="min-w-full divide-y divide-[#230000]">
                <thead className="bg-[#111]">
                  <tr>
                    <th className="px-6 py-4 text-left text-[11px] font-bold text-ignite-muted uppercase tracking-widest font-mono">Asset Vector</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold text-ignite-muted uppercase tracking-widest font-mono">Packets [QTY]</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold text-ignite-muted uppercase tracking-widest font-mono">Entry Price</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold text-ignite-cyan uppercase tracking-widest font-mono">Live Map</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold text-ignite-muted uppercase tracking-widest font-mono">Dimensions [VAL]</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold text-ignite-muted uppercase tracking-widest font-mono">Delta (PnL)</th>
                    <th className="px-6 py-4 w-[100px]"></th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-[#222]">
                  {filteredHoldings.map((h) => {
                    const isExp = expandedRow === h.id;
                    const isGain = h.pnl >= 0;
                    const isHoveredChartMatches = hoveredCategory === h.asset_type;
                    
                    return (
                      <React.Fragment key={h.id}>
                        <tr 
                          onMouseEnter={() => setHoveredCategory(h.asset_type)}
                          onMouseLeave={() => setHoveredCategory(null)}
                          onClick={() => setExpandedRow(isExp ? null : h.id)} 
                          className={cn("transition-colors cursor-pointer group hover:bg-ignite-cyan/5 hover:shadow-[inset_4px_0_0_#00E5FF]", isExp && "bg-ignite-cyan/5 border-l-[4px] border-l-ignite-cyan", isHoveredChartMatches && "bg-ignite-cyan/10 shadow-[inset_4px_0_0_#00E5FF]")}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                               <div className={cn("p-2 rounded-lg bg-black/40 border", isHoveredChartMatches ? "border-ignite-cyan text-ignite-cyan" : "border-[#333] text-ignite-muted group-hover:border-ignite-cyan group-hover:text-ignite-cyan transition-colors")}>
                                  {renderIcon(h.asset_type)}
                               </div>
                               <div>
                                  <div className="font-extrabold text-[#F5F5F5] uppercase tracking-wide break-words leading-tight flex items-center gap-2">
                                     {h.name} {h.symbol && <span className="text-[10px] text-ignite-cyan border border-ignite-cyan/30 px-1.5 py-0.5 rounded font-mono bg-ignite-cyan/10">{h.symbol}</span>}
                                  </div>
                                  <div className="mt-1.5">
                                    {renderAssetBadge(h.asset_type)}
                                  </div>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right font-black text-ignite-white font-mono text-sm">
                            {Number(h.quantity).toLocaleString('en-IN', {maximumFractionDigits: 5})}
                          </td>
                          <td className="px-6 py-5 text-right text-sm text-ignite-muted font-bold font-mono group-hover:text-[#F5F5F5] transition-colors">
                            ₹{formatInrDecimals(h.buy_price)}
                          </td>
                          <td className="px-6 py-5 text-right font-mono font-bold text-lg text-ignite-cyan drop-shadow-[0_0_5px_rgba(0,229,255,0.4)]">
                            ₹{formatInrDecimals(h.current_price)}
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-[#E0E0E0] font-mono border-l border-[#333] group-hover:border-ignite-cyan/50 transition-colors">
                            ₹{formatInrDecimals(h.live_value)}
                          </td>
                          <td className="px-6 py-5 text-right font-mono">
                            <div className={cn("text-sm font-bold tracking-widest", isGain ? "text-ignite-lime" : "text-ignite-red")}>
                              {isGain ? '+' : '–'}₹{formatInrDecimals(Math.abs(h.pnl))}
                            </div>
                            <div className={cn("text-[11px] font-bold mt-1 px-1.5 py-0.5 rounded inline-block", isGain ? "bg-ignite-lime/10 text-ignite-lime border border-ignite-lime/20" : "bg-ignite-red/10 text-ignite-red border border-ignite-red/20")}>
                              {isGain ? <ArrowUpRight className="inline w-3 h-3 mr-0.5" /> : <ArrowDownRight className="inline w-3 h-3 mr-0.5" />}
                              {Number(h.pnl_percent).toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                               <button onClick={(e) => { e.stopPropagation(); setActiveAsset(h); setModalMode('edit'); }} className="p-2 text-ignite-cyan hover:bg-ignite-cyan hover:text-black border border-ignite-cyan/30 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                               <button onClick={(e) => { e.stopPropagation(); setActiveAsset(h); setModalMode('delete'); }} className="p-2 text-ignite-alert hover:bg-ignite-alert hover:text-white border border-ignite-alert/30 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {modalMode === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-mono">
          <div className="bg-black border border-ignite-alert rounded-2xl p-8 w-full max-w-sm shadow-[0_0_30px_rgba(255,68,68,0.3)] relative overflow-hidden z-10">
             <h3 className="text-3xl font-bebas tracking-[2px] text-[#F5F5F5] mb-2">Purge Asset Vector</h3>
             <p className="text-ignite-muted text-sm font-medium mb-8">Confirm termination of <b className="text-ignite-alert uppercase">{activeAsset?.name}</b> from matrix schema. This data shift cannot be reversed.</p>
             <div className="flex gap-4">
               <button onClick={() => setModalMode(null)} className="flex-1 py-3 bg-transparent border border-[#333] text-ignite-muted font-bold rounded-xl hover:border-[#666] hover:text-white transition-colors text-sm uppercase tracking-wider">Abort</button>
               <button onClick={() => deleteMut.mutate(activeAsset.id)} className="flex-1 py-3 border border-ignite-alert bg-ignite-alert/10 text-ignite-alert font-bold rounded-xl hover:bg-ignite-alert hover:text-white transition-all flex justify-center items-center text-sm uppercase tracking-wider">
                 {deleteMut.isPending ? <div className="w-5 h-5 border-2 border-transparent border-t-white rounded-full animate-spin"></div> : 'EXECUTE PURGE'}
               </button>
             </div>
          </div>
        </div>
      )}

      {(modalMode === 'add' || modalMode === 'edit') && (
        <AssetModal tx={activeAsset} onClose={() => setModalMode(null)} onSuccess={(name) => { queryClient.invalidateQueries(['investments']); setModalMode(null); showToast(modalMode === 'add' ? `Dim Map established for ${name}` : `Metadata parameter overwritten for ${name}`); }} />
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-mono">
      <div className="bg-[#0A0A0A] border border-ignite-cyan border-opacity-50 rounded-2xl w-full max-w-lg shadow-[0_0_40px_rgba(0,229,255,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-[#222]">
          <h3 className="text-3xl font-bebas tracking-[2px] text-ignite-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">{tx ? 'Override Vector Map' : 'Initialize Asset Sequence'}</h3>
          <button onClick={onClose} className="p-2 bg-transparent text-ignite-cyan hover:bg-ignite-cyan/10 rounded transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="ast-form" onSubmit={(e) => { e.preventDefault(); mut.mutate({...formData, quantity: Number(formData.quantity), buy_price: Number(formData.buy_price)}); }} className="space-y-6">
             {/* Form fields identical logic but restyled */}
             <div>
               <label className="block text-[11px] font-bold text-ignite-cyan uppercase tracking-widest mb-2">Class Structure*</label>
               <select required value={formData.asset_type} onChange={e=>setFormData({...formData, asset_type: e.target.value})} className="w-full bg-black border border-[#333] rounded-xl p-4 outline-none focus:border-ignite-cyan text-sm font-bold text-ignite-white appearance-none">
                 {Object.keys(ASSET_COLORS).map(cat => <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-[11px] font-bold text-ignite-cyan uppercase tracking-widest mb-2">Primary Node Designation*</label>
               <input type="text" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-[#333] rounded-xl p-3 outline-none focus:border-ignite-cyan text-sm font-bold text-ignite-white" placeholder="e.g. Cyberdyne Systems Inc." />
             </div>
             <div>
               <label className="block text-[11px] font-bold text-ignite-cyan uppercase tracking-widest mb-2">Global Tracker Identity</label>
               <input type="text" value={formData.symbol} onChange={e=>setFormData({...formData, symbol: e.target.value})} className="w-full bg-black border border-[#333] rounded-xl p-3 outline-none focus:border-ignite-cyan text-sm font-bold text-ignite-white" placeholder="SYS, CDYNE" />
             </div>
             <div className="grid grid-cols-2 gap-5">
               <div>
                 <label className="block text-[11px] font-bold text-ignite-cyan uppercase tracking-widest mb-2">Packets [QTY]*</label>
                 <input type="number" step="any" min="0.00001" required value={formData.quantity} onChange={e=>setFormData({...formData, quantity: e.target.value})} className="w-full bg-black border border-[#333] rounded-xl p-3 outline-none focus:border-ignite-cyan font-bold text-ignite-white" placeholder="e.g. 100" />
               </div>
               <div>
                 <label className="block text-[11px] font-bold text-ignite-cyan uppercase tracking-widest mb-2">Base Cost (₹)*</label>
                 <input type="number" step="any" min="0.01" required value={formData.buy_price} onChange={e=>setFormData({...formData, buy_price: e.target.value})} className="w-full bg-black border border-[#333] rounded-xl p-3 outline-none focus:border-ignite-cyan font-bold text-ignite-white" placeholder="0.00" />
               </div>
               <div className="col-span-2 sm:col-span-1">
                 <label className="block text-[11px] font-bold text-ignite-cyan uppercase tracking-widest mb-2">Execution Timeline*</label>
                 <input type="date" required value={formData.buy_date} onChange={e=>setFormData({...formData, buy_date: e.target.value})} className="w-full bg-black border border-[#333] rounded-xl p-3 outline-none focus:border-ignite-cyan text-sm font-bold text-ignite-white [color-scheme:dark]" />
               </div>
             </div>
          </form>
        </div>
        <div className="p-5 border-t border-[#222] bg-[#0A0A0A] flex gap-4">
          <button type="button" onClick={onClose} className="flex-[0.5] py-3.5 bg-transparent border border-[#333] text-ignite-muted font-bold tracking-widest uppercase rounded-xl hover:text-white transition-colors">Abort</button>
          <button type="submit" form="ast-form" disabled={mut.isPending} className="flex-1 py-3.5 bg-ignite-cyan/10 border border-ignite-cyan text-ignite-cyan font-bold tracking-widest uppercase rounded-xl hover:bg-ignite-cyan hover:text-black transition-all flex justify-center items-center shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            {mut.isPending ? <div className="w-5 h-5 border-2 border-transparent border-t-white rounded-full animate-spin"></div> : 'COMMIT TO MATRIX'}
          </button>
        </div>
      </div>
    </div>
  );
}
