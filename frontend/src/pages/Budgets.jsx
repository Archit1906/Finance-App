import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Edit2, Trash2, X, Wallet, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

const CATEGORY_STYLES = {
  Food: { color: 'orange', icon: '🍔' },
  Housing: { color: 'teal', icon: '🏠' },
  Travel: { color: 'blue', icon: '✈️' },
  Shopping: { color: 'purple', icon: '🛍️' },
  Entertainment: { color: 'pink', icon: '🎬' },
  Health: { color: 'red', icon: '⚕️' },
  Utilities: { color: 'amber', icon: '⚡' },
  Education: { color: 'indigo', icon: '📚' },
  'Personal Care': { color: 'rose', icon: '🧴' },
  Savings: { color: 'emerald', icon: '💰' },
  Other: { color: 'gray', icon: '📦' }
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
      showToast('Budget removed successfully');
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
      msgs.push({ type: 'info', text: `${daysRemaining} days left in ${currentDate.toLocaleString('default', { month: 'long' })} — pace your spending.` });
    }

    alerts.forEach(a => {
      const pct = a.percentage / 100;
      if (pct >= 1) {
        msgs.push({ type: 'danger', icon: <AlertTriangle className="w-5 h-5 text-red-500" />, text: `${a.category} is ${a.percentage.toFixed(0)}% used — ₹${formatInr(a.spent - a.limit)} over limit!` });
      } else if (pct >= 0.8) {
        msgs.push({ type: 'warning', icon: <AlertCircle className="w-5 h-5 text-amber-500" />, text: `${a.category} is ${a.percentage.toFixed(0)}% used — only ₹${formatInr(a.limit - a.spent)} remaining.` });
      } else if (isCurrentMonth && (pct > expectedPace + 0.15)) {
        // Pacing warning (spending too fast)
        const projected = (a.spent / currentDay) * daysInMonth;
        if (projected > a.limit) {
           msgs.push({ type: 'warning', icon: <TrendingDown className="w-5 h-5 text-amber-500" />, text: `At current pace, you'll overspend ${a.category} by ₹${formatInr(projected - a.limit)} by month end.` });
        }
      } else if (pct < 0.6 && a.limit > 0 && isCurrentMonth && currentDay > 15) {
        msgs.push({ type: 'success', icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, text: `${a.category} is well under budget — ₹${formatInr(a.limit - a.spent)} saved!` });
      }
    });

    if (msgs.length === 0 && alerts.length > 0) {
       msgs.push({ type: 'success', icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, text: `You're tracking perfectly across all categories!` });
    }
    return msgs;
  }, [alerts, isCurrentMonth, daysRemaining, currentDay, daysInMonth, expectedPace, currentDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}

      {/* HEADER & MONTH SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Budgets</h1>
        </div>

        <div className="flex items-center justify-between bg-white px-2 py-1.5 rounded-2xl shadow-sm border border-gray-100 min-w-[250px]">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"><ChevronLeft className="w-5 h-5"/></button>
          <span className="font-bold text-gray-800 tracking-tight">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"><ChevronRight className="w-5 h-5"/></button>
        </div>

        <button onClick={() => { setActiveBudget(null); setModalMode('edit'); }} className="flex justify-center items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors font-medium">
          <Plus className="w-5 h-5 mr-1" /> Set Budget
        </button>
      </div>

      {/* SUMMARY STATS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center border-2 border-indigo-100"><Target className="w-6 h-6 text-indigo-600" /></div>
          <div><p className="text-xs font-bold text-gray-500 uppercase">Total Budgeted</p><p className="text-2xl font-black text-gray-900">₹{formatInr(stats.budgeted)}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100"><TrendingDown className="w-6 h-6 text-gray-600" /></div>
          <div><p className="text-xs font-bold text-gray-500 uppercase">Total Spent</p><p className="text-2xl font-black text-gray-900">₹{formatInr(stats.spent)}</p></div>
        </div>
        <div className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${stats.remaining >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <Wallet className={`w-6 h-6 ${stats.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">{stats.remaining >= 0 ? 'Remaining' : 'Over Total'}</p>
            <p className={`text-2xl font-black ${stats.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₹{formatInr(Math.abs(stats.remaining))}</p>
          </div>
        </div>
      </div>

      {/* MAIN CARDS GRID + SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="col-span-1 lg:col-span-2 space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[...Array(4)].map((_, i) => <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse h-32"></div>)}
            </div>
          ) : alerts?.length === 0 ? (
            <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6"><Target className="w-12 h-12 text-indigo-300" /></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You haven't set any budgets yet.</h2>
              <p className="text-gray-500 max-w-md mb-8">Set monthly limits to track your spending by category. We'll automatically build pacing charts to keep you on track.</p>
              <button onClick={() => { setActiveBudget(null); setModalMode('edit'); }} className="px-8 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 hover:-translate-y-0.5 transition-all font-bold text-lg shadow-indigo-200">
                + Set Your First Budget
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {alerts?.map((alert) => {
                const style = getStyle(alert.category);
                const pct = alert.percentage;
                
                // Redesign Rules
                let barColor = "bg-emerald-500";
                if (pct > 100) barColor = "bg-red-500";
                else if (pct >= 86) barColor = "bg-orange-600"; // orange-red
                else if (pct >= 61) barColor = "bg-amber-500"; // amber/orange
                
                return (
                  <div key={alert.category} className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-y border-r border-${style.color}-500 group relative`}>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full bg-${style.color}-50 flex items-center justify-center text-lg shadow-sm border border-${style.color}-100`}>{style.icon}</div>
                          <h3 className="font-bold text-gray-900 text-lg">{alert.category}</h3>
                        </div>
                        {/* Hover Actions */}
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                          <button onClick={() => { setActiveBudget(alert); setModalMode('edit'); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { setActiveBudget(alert); setModalMode('delete'); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-end mb-2">
                        <div className="text-gray-500 text-sm font-medium">Spent</div>
                        <div className="text-right">
                          <span className={`text-lg font-black ${pct > 100 ? 'text-red-600' : 'text-gray-900'}`}>₹{formatInr(alert.spent)}</span>
                          <span className="text-sm font-medium text-gray-400 ml-1">/ ₹{formatInr(alert.limit)}</span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2 overflow-hidden shadow-inner flex">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000 ease-out", barColor)} 
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center mt-1">
                        <p className={`text-xs font-bold ${pct > 100 ? 'text-red-600' : 'text-gray-400'}`}>{pct.toFixed(0)}% used</p>
                        {pct > 100 && (
                          <div className="flex items-center text-red-600 text-xs font-bold px-2 py-0.5 bg-red-50 rounded-md">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Over by ₹{formatInr(alert.spent - alert.limit)}
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
          <div className="col-span-1 lg:sticky lg:top-6 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center mb-5">
                <AlertCircle className="w-5 h-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-bold text-gray-900">Budget Insights</h3>
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {insights.map((insight, idx) => (
                  <div key={idx} className={`flex items-start p-3.5 rounded-xl ${insight.type === 'danger' ? 'bg-red-50 border border-red-100' : insight.type === 'warning' ? 'bg-amber-50 border border-amber-100' : insight.type === 'success' ? 'bg-emerald-50 border border-emerald-100' : 'bg-blue-50 border border-blue-100'}`}>
                     {(insight.type === 'info') && <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />}
                     {insight.icon && <div className="mt-0.5 mr-3 flex-shrink-0">{insight.icon}</div>}
                     <span className={`text-sm font-medium ${insight.type === 'danger' ? 'text-red-900' : insight.type === 'warning' ? 'text-amber-900' : insight.type === 'success' ? 'text-emerald-900' : 'text-blue-900'}`}>
                        {insight.text}
                     </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {modalMode === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
             <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Budget</h3>
             <p className="text-gray-500 mb-6">Remove <b>{activeBudget?.category}</b> budget for {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}?</p>
             <div className="flex gap-3">
               <button onClick={() => setModalMode(null)} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50">Cancel</button>
               <button onClick={() => deleteMut.mutate(activeBudget.id)} className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 shadow-sm flex justify-center items-center">
                 {deleteMut.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Confirm'}
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
            showToast(`Budget set for ${cat} — ₹${formatInr(limit)}/month`); 
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">{tx ? 'Edit Budget' : 'Set Budget'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5">
          <form id="bg-form" onSubmit={onSubmit} className="space-y-4">
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Category*</label>
               <select required disabled={!!tx} value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white font-medium">
                 {Object.keys(CATEGORY_STYLES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Monthly Limit (₹)*</label>
               <input type="number" required min="1" step="1" value={formData.monthly_limit} onChange={e=>setFormData({...formData, monthly_limit: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 text-lg font-bold text-indigo-700" placeholder="e.g. 5000" />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Target Month</label>
               <input type="month" required value={formData.month} onChange={e=>setFormData({...formData, month: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-medium" />
             </div>
          </form>
        </div>
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-100">Cancel</button>
          <button type="submit" form="bg-form" disabled={mut.isPending} className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-sm flex justify-center items-center">
            {mut.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Budget'}
          </button>
        </div>
      </div>
    </div>
  );
}
