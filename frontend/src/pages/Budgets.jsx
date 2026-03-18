import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Edit2, Trash2, X, Wallet, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

const CATEGORY_STYLES = {
  Food: { color: 'text-[#FF6B6B]', bg: 'bg-[#2D0A0A]', border: 'border-[#4D1515]', icon: '🍔' },
  Housing: { color: 'text-[#FF4444]', bg: 'bg-[#2D0000]', border: 'border-[#4D0000]', icon: '🏠' },
  Travel: { color: 'text-[#FF9F43]', bg: 'bg-[#2D1A0A]', border: 'border-[#4D2D0A]', icon: '✈️' },
  Shopping: { color: 'text-[#A855F7]', bg: 'bg-[#1A0A2D]', border: 'border-[#2D1545]', icon: '🛍️' },
  Entertainment: { color: 'text-[#FF9F43]', bg: 'bg-[#2D1A0A]', border: 'border-[#4D2D0A]', icon: '🎬' },
  Health: { color: 'text-[#00C853]', bg: 'bg-[#0A2D0A]', border: 'border-[#154D15]', icon: '⚕️' },
  Utilities: { color: 'text-[#06B6D4]', bg: 'bg-[#110000]', border: 'border-[#2D0000]', icon: '⚡' },
  Education: { color: 'text-[#3B82F6]', bg: 'bg-[#00112D]', border: 'border-[#00224D]', icon: '📚' },
  'Personal Care': { color: 'text-[#EC4899]', bg: 'bg-[#2D001A]', border: 'border-[#4D002D]', icon: '🧴' },
  Savings: { color: 'text-[#00C853]', bg: 'bg-[#0A2D0A]', border: 'border-[#154D15]', icon: '💰' },
  Other: { color: 'text-[#B0A0A0]', bg: 'bg-[#1A0000]', border: 'border-[#2D0000]', icon: '📦' }
};

const getStyle = (cat) => CATEGORY_STYLES[cat] || CATEGORY_STYLES.Other;
const formatInr = (num) => Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function Budgets() {
  const queryClient = useQueryClient();
  
  // -- STATE: Month Navigation --
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  
  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const [modalMode, setModalMode] = useState(null); // 'edit', 'delete'
  const [activeBudget, setActiveBudget] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // -- API FETCH --
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['budgets', monthStr],
    queryFn: async () => {
      const { data } = await api.get(`/budgets/alerts?month=${monthStr}`);
      return data.data;
    }
  });

  // -- MUTATIONS --
  const deleteMut = useMutation({
    mutationFn: async (id) => await api.delete(`/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
      setModalMode(null);
      showToast('Budget Vector Terminated');
    }
  });

  // -- COMPUTED STATS --
  const stats = useMemo(() => {
    if (!alerts) return { budgeted: 0, spent: 0, remaining: 0 };
    const budgeted = alerts.reduce((sum, a) => sum + a.limit, 0);
    const spent = alerts.reduce((sum, a) => sum + a.spent, 0);
    return { budgeted, spent, remaining: budgeted - spent };
  }, [alerts]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
  const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;
  const daysRemaining = daysInMonth - currentDay;
  const expectedPace = currentDay / daysInMonth; // e.g. 0.5 if halfway through month

  // -- INSIGHTS GENERATOR --
  const insights = useMemo(() => {
    if (!alerts) return [];
    let msgs = [];
    
    // Day Tracker
    if (isCurrentMonth && daysRemaining > 0) {
      msgs.push({ type: 'info', text: `${daysRemaining} cycles remaining in ${currentDate.toLocaleString('default', { month: 'long' }).toUpperCase()} — regulate your outflows.` });
    }

    alerts.forEach(a => {
      const pct = a.percentage / 100;
      if (pct >= 1) {
        msgs.push({ type: 'danger', icon: <AlertTriangle className="w-5 h-5 text-ignite-alert" />, text: `${a.category.toUpperCase()} constraint breached (${a.percentage.toFixed(0)}%) — ₹${formatInr(a.spent - a.limit)} deficit!` });
      } else if (pct >= 0.8) {
        msgs.push({ type: 'warning', icon: <AlertCircle className="w-5 h-5 text-ignite-warning" />, text: `${a.category.toUpperCase()} matrix at ${a.percentage.toFixed(0)}% limit — ₹${formatInr(a.limit - a.spent)} buffer available.` });
      } else if (isCurrentMonth && (pct > expectedPace + 0.15)) {
        // Pacing warning (spending too fast)
        const projected = (a.spent / currentDay) * daysInMonth;
        if (projected > a.limit) {
           msgs.push({ type: 'warning', icon: <TrendingDown className="w-5 h-5 text-ignite-warning" />, text: `Bleed rate critical: ${a.category.toUpperCase()} projecting ₹${formatInr(projected - a.limit)} overrun.` });
        }
      } else if (pct < 0.6 && a.limit > 0 && isCurrentMonth && currentDay > 15) {
        msgs.push({ type: 'success', icon: <CheckCircle2 className="w-5 h-5 text-ignite-success" />, text: `${a.category.toUpperCase()} optimizing efficiently — ₹${formatInr(a.limit - a.spent)} surplus active!` });
      }
    });

    if (msgs.length === 0 && alerts.length > 0) {
       msgs.push({ type: 'success', icon: <CheckCircle2 className="w-5 h-5 text-ignite-success" />, text: `System executing perfectly across all assigned vectors.` });
    }
    return msgs;
  }, [alerts, isCurrentMonth, daysRemaining, currentDay, daysInMonth, expectedPace, currentDate]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {toast && (
        <div className="fixed bottom-6 right-6 bg-ignite-bg border-l-[4px] border-ignite-success text-ignite-white px-6 py-3 rounded-lg shadow-ignite-card z-50 flex items-center animate-fade-in font-bold text-sm">
          {toast}
        </div>
      )}

      {/* HEADER & MONTH SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ignite-border pb-4">
        <div>
          <h1 className="text-4xl font-bebas tracking-[2px] text-ignite-white drop-shadow-md">Budget Architecture</h1>
          <p className="text-sm font-bold text-ignite-muted uppercase tracking-widest mt-1">Regulate dimensional capital limits</p>
        </div>

        <div className="flex items-center justify-between bg-ignite-card px-2 py-2 rounded-xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-ignite-border min-w-[280px]">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-ignite-bg rounded-lg transition-colors text-ignite-muted hover:text-ignite-white"><ChevronLeft className="w-5 h-5"/></button>
          <span className="font-bebas text-xl text-ignite-white tracking-widest">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-ignite-bg rounded-lg transition-colors text-ignite-muted hover:text-ignite-white"><ChevronRight className="w-5 h-5"/></button>
        </div>

        <button onClick={() => { setActiveBudget(null); setModalMode('edit'); }} className="flex justify-center items-center px-6 py-3 bg-ignite-red text-white rounded-xl shadow-ignite-card hover:bg-ignite-hover hover:scale-105 transition-all font-black tracking-widest uppercase text-sm">
          <Plus className="w-5 h-5 mr-1" /> ALLOCATE VECTOR
        </button>
      </div>

      {/* SUMMARY STATS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-ignite-card p-6 rounded-2xl shadow-ignite-card border-y border-r border-y-ignite-border border-r-ignite-border border-l-[4px] border-l-ignite-white flex items-center space-x-6 relative overflow-hidden group hover:border-r-ignite-bhover transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform"><Target className="w-24 h-24 text-ignite-white" /></div>
          <div className="w-14 h-14 bg-ignite-bg rounded-xl flex items-center justify-center border border-ignite-border shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)] relative z-10"><Target className="w-7 h-7 text-ignite-white" /></div>
          <div className="relative z-10"><p className="text-[11px] font-black text-ignite-muted uppercase tracking-widest">Total Active Vector Limits</p><p className="text-3xl font-black text-ignite-white mt-1">₹{formatInr(stats.budgeted)}</p></div>
        </div>
        <div className="bg-ignite-card p-6 rounded-2xl shadow-ignite-card border-y border-r border-y-ignite-border border-r-ignite-border border-l-[4px] border-l-ignite-red flex items-center space-x-6 relative overflow-hidden group hover:border-r-ignite-bhover transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform"><TrendingDown className="w-24 h-24 text-ignite-white" /></div>
          <div className="w-14 h-14 bg-ignite-bg rounded-xl flex items-center justify-center border border-ignite-red/30 shadow-[inset_0_2px_10px_rgba(204,0,0,0.1)] relative z-10"><TrendingDown className="w-7 h-7 text-ignite-red" /></div>
          <div className="relative z-10"><p className="text-[11px] font-black text-ignite-muted uppercase tracking-widest">Total Capital Burn</p><p className="text-3xl font-black text-ignite-red mt-1">₹{formatInr(stats.spent)}</p></div>
        </div>
        <div className={`bg-ignite-card p-6 rounded-2xl shadow-ignite-card border-y border-r border-y-ignite-border border-r-ignite-border border-l-[4px] ${stats.remaining >= 0 ? 'border-l-ignite-success' : 'border-l-ignite-alert'} flex items-center space-x-6 relative overflow-hidden group hover:border-r-ignite-bhover transition-all`}>
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform"><Wallet className="w-24 h-24 text-ignite-white" /></div>
          <div className={`w-14 h-14 bg-ignite-bg rounded-xl flex items-center justify-center border shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] relative z-10 ${stats.remaining >= 0 ? 'border-ignite-success/30' : 'border-ignite-alert/30'}`}>
            <Wallet className={`w-7 h-7 ${stats.remaining >= 0 ? 'text-ignite-success' : 'text-ignite-alert'}`} />
          </div>
          <div className="relative z-10">
            <p className="text-[11px] font-black text-ignite-muted uppercase tracking-widest">{stats.remaining >= 0 ? 'Remaining Surplus' : 'Deficit Active'}</p>
            <p className={`text-3xl font-black mt-1 ${stats.remaining >= 0 ? 'text-ignite-success' : 'text-ignite-alert drop-shadow-[0_0_8px_rgba(255,68,68,0.5)]'}`}>₹{formatInr(Math.abs(stats.remaining))}</p>
          </div>
        </div>
      </div>

      {/* MAIN CARDS GRID + SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="col-span-1 lg:col-span-2 space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {[...Array(4)].map((_, i) => <div key={i} className="bg-ignite-card p-6 rounded-2xl border border-ignite-border animate-pulse h-40"></div>)}
            </div>
          ) : alerts?.length === 0 ? (
            <div className="bg-ignite-card p-16 rounded-2xl shadow-ignite-card border border-ignite-border text-center flex flex-col items-center">
              <div className="w-24 h-24 bg-ignite-bg border border-ignite-border rounded-full flex items-center justify-center mb-6 shadow-[inset_0_4px_20px_rgba(204,0,0,0.05)]">
                 <Target className="w-10 h-10 text-ignite-red/50" />
              </div>
              <h2 className="text-3xl font-bebas tracking-[2px] text-ignite-white mb-2">Matrix Framework Empty</h2>
              <p className="text-ignite-muted max-w-md mb-8 text-sm font-medium">Inject monthly constraint thresholds to monitor capital pacing routines. System will automatically map warning signals.</p>
              <button onClick={() => { setActiveBudget(null); setModalMode('edit'); }} className="px-8 py-4 bg-ignite-red text-white font-black text-[13px] tracking-widest uppercase rounded-xl hover:bg-ignite-hover shadow-ignite-card transition-all hover:scale-105 active:scale-95">
                ESTABLISH CORE LIMIT
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {alerts?.map((alert) => {
                const style = getStyle(alert.category);
                const pct = alert.percentage;
                
                let barColor = "bg-ignite-success";
                if (pct > 100) barColor = "bg-ignite-alert shadow-[0_0_15px_rgba(255,68,68,0.8)]";
                else if (pct >= 86) barColor = "bg-ignite-red shadow-[0_0_10px_rgba(204,0,0,0.5)]";
                else if (pct >= 61) barColor = "bg-ignite-warning shadow-[0_0_10px_rgba(255,179,0,0.4)]";
                
                return (
                  <div key={alert.category} className={`bg-ignite-card rounded-2xl shadow-ignite-card hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-all border border-ignite-border group relative overflow-hidden`}>
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-ignite-border">
                       <div className={`h-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-6 mt-1">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] ${style.bg} ${style.border} border`}>{style.icon}</div>
                          <h3 className="font-bebas tracking-[1.5px] text-xl text-ignite-white">{alert.category}</h3>
                        </div>
                        {/* Hover Actions */}
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                          <button onClick={() => { setActiveBudget(alert); setModalMode('edit'); }} className="p-2 text-ignite-muted hover:text-ignite-white hover:bg-[#2D0000] border border-transparent hover:border-ignite-border rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { setActiveBudget(alert); setModalMode('delete'); }} className="p-2 text-ignite-muted hover:text-ignite-alert hover:bg-[#2D0000] border border-transparent hover:border-ignite-border rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-end mb-3">
                        <div className="text-ignite-muted text-[11px] font-black uppercase tracking-widest leading-none mb-1">Burned Capital</div>
                        <div className="text-right leading-none">
                          <span className={`text-2xl font-black tracking-tight ${pct > 100 ? 'text-ignite-alert drop-shadow-[0_0_8px_rgba(255,68,68,0.5)]' : 'text-ignite-white'}`}>₹{formatInr(alert.spent)}</span>
                          <span className="text-xs font-bold text-[#6B5555] ml-1">/ ₹{formatInr(alert.limit)}</span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-[#110000] rounded-[3px] h-1.5 mb-3 overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] flex">
                        <div className={cn("h-full transition-all duration-1000 ease-out", barColor)} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${pct > 100 ? 'text-ignite-alert' : 'text-ignite-muted'}`}>{pct.toFixed(0)}% LIMIT REACHED</p>
                        {pct > 100 && (
                          <div className="flex items-center text-ignite-alert text-[10px] font-black tracking-widest px-2 py-0.5 bg-ignite-alert/10 border border-ignite-alert/30 rounded">
                            <AlertTriangle className="w-3 h-3 mr-1" /> ₹{formatInr(alert.spent - alert.limit)} BREACH
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* INSIGHTS PANEL (Sticky) */}
        {!isLoading && alerts?.length > 0 && (
          <div className="col-span-1 lg:sticky lg:top-8 space-y-6">
            <div className="bg-ignite-card p-6 rounded-2xl shadow-ignite-card border border-ignite-border relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-ignite-red/5 rounded-full blur-[40px] pointer-events-none"></div>
              <div className="flex items-center mb-6 border-b border-ignite-border pb-4">
                <AlertCircle className="w-6 h-6 text-ignite-red mr-3" />
                <h3 className="text-2xl font-bebas tracking-[2px] text-ignite-white drop-shadow-md">System Heuristics</h3>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-ignite-border scrollbar-track-transparent">
                {insights.map((insight, idx) => {
                   let blockClass = "bg-ignite-bg border-ignite-border text-ignite-muted";
                   if(insight.type === 'danger') blockClass = "bg-[#2D0000] border-ignite-alert text-ignite-alert drop-shadow-[0_0_8px_rgba(255,68,68,0.2)]";
                   if(insight.type === 'warning') blockClass = "bg-[#2D1A00] border-ignite-warning text-ignite-warning";
                   if(insight.type === 'success') blockClass = "bg-[#0A2D0A] border-ignite-success text-ignite-success";

                   return (
                     <div key={idx} className={`flex items-start p-4 rounded-xl border shadow-sm ${blockClass}`}>
                        {(insight.type === 'info') && <AlertCircle className="w-5 h-5 text-ignite-muted mt-0.5 mr-3 flex-shrink-0" />}
                        {insight.icon && <div className="mt-0.5 mr-3 flex-shrink-0 text-current">{insight.icon}</div>}
                        <span className={`text-[13px] font-bold leading-relaxed tracking-wide text-current`}>
                           {insight.text}
                        </span>
                     </div>
                   );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {modalMode === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in relative">
          <div className="bg-ignite-card border border-ignite-border rounded-2xl p-8 w-full max-w-sm shadow-ignite-card relative overflow-hidden z-10">
             <div className="absolute top-0 right-0 w-32 h-32 bg-ignite-alert/10 rounded-full blur-[40px] pointer-events-none"></div>
             <h3 className="text-3xl font-bebas tracking-[2px] text-ignite-white mb-2 relative z-10">Delete Constraint</h3>
             <p className="text-ignite-muted text-sm font-medium mb-8 relative z-10">Permanently remove the budget vector for <b className="text-ignite-red uppercase">{activeBudget?.category}</b>? Associated transaction limits will be unlocked.</p>
             <div className="flex gap-4 relative z-10">
               <button onClick={() => setModalMode(null)} className="flex-1 py-3 bg-ignite-bg border border-ignite-border text-ignite-white font-bold rounded-xl hover:bg-[#2D0000] transition-colors text-sm uppercase tracking-wider text-center">Abort</button>
               <button onClick={() => deleteMut.mutate(activeBudget.id)} className="flex-1 py-3 border border-ignite-alert bg-ignite-alert/20 text-ignite-alert font-bold rounded-xl hover:bg-ignite-alert hover:text-white shadow-[0_0_15px_rgba(255,68,68,0.3)] transition-all flex justify-center items-center text-sm uppercase tracking-wider">
                 {deleteMut.isPending ? <div className="w-5 h-5 border-2 border-transparent border-t-white rounded-full animate-spin"></div> : 'PURGE'}
               </button>
             </div>
          </div>
        </div>
      )}

      {(modalMode === 'edit') && (
        <BudgetModal 
          tx={activeBudget} 
          monthStr={monthStr}
          onClose={() => setModalMode(null)} 
          onSuccess={(cat, limit) => { 
            queryClient.invalidateQueries(['budgets']); 
            setModalMode(null); 
            showToast(`Vector boundary set for ${cat} : ₹${formatInr(limit)}/mo`); 
          }} 
        />
      )}
    </div>
  );
}

function BudgetModal({ tx, monthStr, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    category: tx?.category || 'Food',
    monthly_limit: tx?.limit || '',
    month: tx ? tx.month : monthStr
  });
  
  const mut = useMutation({
    mutationFn: async (data) => await api.post('/budgets', data),
    onSuccess: () => onSuccess(formData.category, formData.monthly_limit)
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mut.mutate({...formData, monthly_limit: Number(formData.monthly_limit)});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in relative">
      <div className="bg-ignite-card border border-ignite-border rounded-2xl w-full max-w-md shadow-[0_4px_40px_rgba(204,0,0,0.2)] overflow-hidden flex flex-col relative z-20">
        <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-ignite-red/10 rounded-full blur-[50px] pointer-events-none"></div>
        <div className="flex justify-between items-center p-6 border-b border-ignite-border relative z-10 bg-[#110000]">
          <h3 className="text-3xl font-bebas tracking-[2px] text-ignite-white">{tx ? 'Modify Limit' : 'Initialize Constraint'}</h3>
          <button onClick={onClose} className="p-2 bg-ignite-bg border border-ignite-border rounded hover:border-ignite-red hover:text-ignite-red text-ignite-muted transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 relative z-10">
          <form id="bg-form" onSubmit={onSubmit} className="space-y-6">
             <div>
               <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Target Sector Map*</label>
               <select required disabled={!!tx} value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-4 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-[15px] font-bold text-ignite-white appearance-none disabled:opacity-50">
                 {Object.keys(CATEGORY_STYLES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Monthly Max Limit (₹)*</label>
               <input type="number" required min="1" step="1" value={formData.monthly_limit} onChange={e=>setFormData({...formData, monthly_limit: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-4 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-2xl font-black text-ignite-white tracking-tight text-center placeholder-[#333]" placeholder="e.g. 10000" />
             </div>
             <div>
               <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Target Active Cycle</label>
               <input type="month" required value={formData.month} onChange={e=>setFormData({...formData, month: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-4 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-sm font-bold text-ignite-white [color-scheme:dark]" />
             </div>
          </form>
        </div>
        <div className="p-5 border-t border-ignite-border bg-[#110000] flex gap-4 relative z-10">
          <button type="button" onClick={onClose} className="flex-[0.5] py-3.5 bg-ignite-bg border border-ignite-border text-ignite-white font-black text-[13px] tracking-widest uppercase rounded-xl hover:bg-[#2D0000] transition-colors">Abhort</button>
          <button type="submit" form="bg-form" disabled={mut.isPending} className="flex-1 py-3.5 bg-ignite-red text-white font-black text-[13px] tracking-widest uppercase rounded-xl hover:bg-ignite-hover hover:shadow-[0_0_20px_rgba(204,0,0,0.4)] transition-all flex justify-center items-center">
            {mut.isPending ? <div className="w-5 h-5 border-2 border-transparent border-b-white border-l-white rounded-full animate-spin"></div> : 'LOCK BOUNDARY'}
          </button>
        </div>
      </div>
    </div>
  );
}
