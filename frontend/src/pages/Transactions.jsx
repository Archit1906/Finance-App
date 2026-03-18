import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, UploadCloud, X, ChevronLeft, ChevronRight, Upload } from 'lucide-react';

const CATEGORY_COLORS = {
  Food: 'bg-[#2D0A0A] text-[#FF6B6B] border-[#4D1515]',
  Travel: 'bg-[#2D1A0A] text-[#FF9F43] border-[#4D2D0A]',
  Shopping: 'bg-[#1A0A2D] text-[#A855F7] border-[#2D1545]',
  Housing: 'bg-[#2D0000] text-[#FF4444] border-[#4D0000]',
  Salary: 'bg-[#0A2D0A] text-[#00C853] border-[#154D15]',
  Health: 'bg-[#2D0000] text-[#FF4444] border-[#4D0000]',
  Entertainment: 'bg-[#2D1A0A] text-[#FF9F43] border-[#4D2D0A]',
  Utilities: 'bg-[#110000] text-[#06B6D4] border-[#2D0000]',
  Other: 'bg-[#1A0000] text-[#B0A0A0] border-[#2D0000]'
};

const getBadgeColor = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
const formatInr = (num) => Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function Transactions() {
  const queryClient = useQueryClient();
  
  // -- STATE --
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [filters, setFilters] = useState({
    type: '',
    category: [],
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [modalMode, setModalMode] = useState(null); // 'add', 'edit', 'import', 'delete'
  const [activeTx, setActiveTx] = useState(null);
  const [toast, setToast] = useState('');

  // -- DEBOUNCE SEARCH --
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // -- API FETCH --
  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (filters.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters.category.length > 0) params.append('category', filters.category.join(','));
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.minAmount) params.append('minAmount', filters.minAmount);
      if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
      
      const res = await api.get(`/transactions?${params.toString()}`);
      return res.data;
    }
  });

  const txs = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

  // -- CLIENT-SIDE FILTER (By Search) --
  const filteredTxs = useMemo(() => {
    if (!debouncedSearch) return txs;
    const lower = debouncedSearch.toLowerCase();
    return txs.filter(t => 
      t.merchant?.toLowerCase().includes(lower) || 
      t.category?.toLowerCase().includes(lower) ||
      t.notes?.toLowerCase().includes(lower)
    );
  }, [txs, debouncedSearch]);

  const activeFilterCount = Object.values(filters).filter(v => 
    (Array.isArray(v) && v.length > 0) || (typeof v === 'string' && v !== '' && v !== 'all')
  ).length;

  // -- MUTATIONS --
  const deleteMut = useMutation({
    mutationFn: async (id) => await api.delete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['analytics']);
      setModalMode(null);
      showToast('Transaction deleted successfully');
    }
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-ignite-bg border-l-[4px] border-ignite-success text-ignite-white px-6 py-3 rounded-lg shadow-ignite-card z-50 flex items-center animate-fade-in font-bold text-sm">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bebas tracking-[2px] text-ignite-white drop-shadow-md">Transactions</h1>
          <p className="text-sm font-bold text-ignite-muted mt-1 uppercase tracking-widest">Manage your structural capital flow</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <button onClick={() => setModalMode('import')} className="flex-1 sm:flex-none flex items-center px-4 py-2 bg-ignite-bg border border-ignite-red text-ignite-red rounded-xl hover:bg-ignite-card hover:shadow-[0_0_15px_rgba(204,0,0,0.15)] transition-all justify-center font-bold">
            <UploadCloud className="w-5 h-5 mr-2" /> IMPORT CSV
          </button>
          <button onClick={() => { setActiveTx(null); setModalMode('add'); }} className="flex-1 sm:flex-none flex items-center px-5 py-2 bg-ignite-red text-white rounded-xl shadow-md hover:bg-ignite-hover hover:scale-105 transition-all justify-center font-black tracking-wider">
            <Plus className="w-5 h-5 mr-1" /> CREATE
          </button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ignite-muted group-focus-within:text-ignite-red transition-colors w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search logs across merchants, category, or notes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-ignite-card border border-ignite-border rounded-xl outline-none focus:shadow-ignite-focus focus:border-ignite-red transition-all text-sm font-medium text-ignite-white placeholder-[#6B5555]"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center px-6 py-3 border rounded-xl transition-all font-bold tracking-wider text-sm ${showFilters || activeFilterCount > 0 ? 'bg-ignite-red border-ignite-red text-white shadow-ignite-card' : 'bg-ignite-card border-ignite-border text-ignite-muted hover:bg-ignite-bg hover:text-ignite-white hover:border-ignite-bhover'}`}>
          <Filter className="w-4 h-4 mr-2" />
          FILTERS {activeFilterCount > 0 && <span className="ml-2 bg-ignite-bg text-ignite-white text-xs px-2 py-0.5 rounded border border-ignite-border">{activeFilterCount}</span>}
        </button>
      </div>

      {/* FILTERS PANEL */}
      {showFilters && (
        <div className="bg-ignite-card p-6 rounded-2xl shadow-ignite-card border border-ignite-border animate-fade-in relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-ignite-red/5 rounded-full blur-[50px] pointer-events-none"></div>
          <div className="flex justify-between items-center mb-5 relative z-10">
            <h3 className="font-bebas text-xl text-ignite-white tracking-widest">Structural Filters</h3>
            <button onClick={() => setFilters({type:'', category:[], startDate:'', endDate:'', minAmount:'', maxAmount:''})} className="text-xs font-bold text-ignite-red uppercase tracking-wider hover:text-ignite-hover transition-colors">Reset Limits</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
            <div>
              <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Flow Type</label>
              <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})} className="w-full border border-ignite-border bg-ignite-bg text-ignite-white rounded-xl p-3 text-sm font-medium outline-none focus:border-ignite-red focus:shadow-ignite-focus transition-all">
                <option value="all">Global Matrix</option>
                <option value="income">Income Stream</option>
                <option value="expense">Capital Burn</option>
              </select>
            </div>
            <div>
               <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Category Sector</label>
               <input type="text" placeholder="e.g. Food, Travel" disabled title="Multi-select UI simplified for demo" value={filters.category.join(', ')} onChange={(e) => setFilters({...filters, category: e.target.value ? e.target.value.split(',').map(s=>s.trim()) : []})} className="w-full border border-ignite-border bg-ignite-bg/50 text-ignite-muted rounded-xl p-3 text-sm font-medium outline-none cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Time Horizon</label>
              <div className="flex gap-2">
                <input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} className="w-full border border-ignite-border bg-ignite-bg text-ignite-white placeholder-ignite-muted rounded-xl p-2.5 text-sm outline-none focus:border-ignite-red focus:shadow-ignite-focus transition-all [color-scheme:dark]" />
                <input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} className="w-full border border-ignite-border bg-ignite-bg text-ignite-white placeholder-ignite-muted rounded-xl p-2.5 text-sm outline-none focus:border-ignite-red focus:shadow-ignite-focus transition-all [color-scheme:dark]" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Capital Range</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min ₹" value={filters.minAmount} onChange={(e) => setFilters({...filters, minAmount: e.target.value})} className="w-full border border-ignite-border bg-ignite-bg text-ignite-white placeholder-[#6B5555] rounded-xl p-3 text-sm outline-none focus:border-ignite-red focus:shadow-ignite-focus transition-all" />
                <input type="number" placeholder="Max ₹" value={filters.maxAmount} onChange={(e) => setFilters({...filters, maxAmount: e.target.value})} className="w-full border border-ignite-border bg-ignite-bg text-ignite-white placeholder-[#6B5555] rounded-xl p-3 text-sm outline-none focus:border-ignite-red focus:shadow-ignite-focus transition-all" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-ignite-card rounded-2xl shadow-ignite-card border border-ignite-border overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-ignite-muted">
             <div className="w-8 h-8 border-4 border-ignite-border border-t-ignite-red rounded-full animate-spin mb-4"></div>
             <p className="font-bold tracking-widest uppercase text-sm">Querying Matrix...</p>
          </div>
        ) : filteredTxs.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-ignite-bg border border-ignite-border rounded-full flex items-center justify-center mb-6 shadow-[inset_0_4px_20px_rgba(204,0,0,0.05)]">
               <Search className="w-10 h-10 text-ignite-red/50" />
            </div>
            <p className="text-2xl font-bebas tracking-[2px] text-ignite-white mb-2">No nodes found in sector</p>
            <p className="text-ignite-muted max-w-sm mb-8 text-sm font-medium">No transactional flows match current structural filters. Adjust parameters to visualize capital.</p>
            <button onClick={() => { setActiveTx(null); setModalMode('add'); }} className="px-8 py-3 bg-ignite-red hover:bg-ignite-hover text-white rounded-xl shadow-ignite-card font-black tracking-widest uppercase text-sm transition-all hover:scale-105">
              INJECT CAPITAL EVENT
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[400px]">
            <table className="min-w-full divide-y divide-ignite-border">
              <thead className="bg-[#110000]">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-black text-ignite-muted uppercase tracking-widest">Timeline</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black text-ignite-muted uppercase tracking-widest">Metadata</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black text-ignite-muted uppercase tracking-widest">Sector</th>
                  <th className="px-6 py-4 text-right text-[11px] font-black text-ignite-muted uppercase tracking-widest">Volume Form</th>
                  <th className="px-6 py-4 text-center text-[11px] font-black text-ignite-muted uppercase tracking-widest w-20">Access</th>
                </tr>
              </thead>
              <tbody className="bg-ignite-card divide-y divide-[#230000]">
                {filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-ignite-bg transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap text-[13px] text-ignite-white font-bold tracking-wide">
                      {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[15px] font-extrabold text-[#F5F5F5] uppercase tracking-wide">{tx.merchant}</div>
                      {tx.notes && <div className="text-[12px] font-medium text-[#B0A0A0] mt-1 truncate max-w-[250px]">{tx.notes}</div>}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex text-[11px] uppercase tracking-widest font-black rounded border ${getBadgeColor(tx.category)} shadow-sm`}>
                        {tx.category || 'UNCATEGORIZED'}
                      </span>
                    </td>
                    <td className={`px-6 py-5 whitespace-nowrap text-right font-bebas tracking-[1.5px] text-xl ${tx.type === 'income' ? 'text-ignite-success' : 'text-ignite-white'}`}>
                      {tx.type === 'income' ? '+' : '-'}₹{formatInr(tx.amount)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center text-sm">
                      <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                        <button onClick={() => { setActiveTx(tx); setModalMode('edit'); }} className="p-2 text-ignite-muted hover:text-ignite-white hover:bg-[#2D0000] rounded transition-colors border border-transparent hover:border-ignite-border">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setActiveTx(tx); setModalMode('delete'); }} className="p-2 text-ignite-muted hover:text-ignite-alert hover:bg-[#2D0000] rounded transition-colors border border-transparent hover:border-ignite-border">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* PAGINATION FOOTER */}
        {!isLoading && txs.length > 0 && !debouncedSearch && (
          <div className="bg-[#110000] px-6 py-4 border-t border-ignite-border flex items-center justify-between">
            <p className="text-xs font-bold text-ignite-muted uppercase tracking-widest">
              Rendering <span className="font-black text-ignite-white">{(page-1)*limit + 1}</span> to <span className="font-black text-ignite-white">{Math.min(page*limit, pagination.total)}</span> / <span className="font-black text-ignite-white">{pagination.total}</span> points
            </p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="p-2 border border-ignite-border rounded-lg hover:bg-ignite-card hover:border-ignite-bhover disabled:opacity-30 disabled:cursor-not-allowed bg-ignite-bg text-ignite-white transition-all">
                 <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-4 py-2 text-sm font-black text-ignite-white tracking-widest">P {page} / {pagination.totalPages}</div>
              <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p+1)} className="p-2 border border-ignite-border rounded-lg hover:bg-ignite-card hover:border-ignite-bhover disabled:opacity-30 disabled:cursor-not-allowed bg-ignite-bg text-ignite-white transition-all">
                 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ALL MODALS */}
      {modalMode === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-ignite-card border border-ignite-border rounded-2xl p-8 w-full max-w-sm shadow-ignite-card relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-ignite-alert/10 rounded-full blur-[40px] pointer-events-none"></div>
             <h3 className="text-3xl font-bebas tracking-[2px] text-ignite-white mb-2 relative z-10">Delete Authorization</h3>
             <p className="text-ignite-muted text-sm font-medium mb-8 relative z-10">Confirm permanent deletion of flow vector for <b className="text-ignite-red uppercase">{activeTx?.merchant}</b>. This data shift cannot be reversed.</p>
             <div className="flex gap-4 relative z-10">
               <button onClick={() => setModalMode(null)} className="flex-1 py-3 bg-ignite-bg border border-ignite-border text-ignite-white font-bold rounded-xl hover:bg-[#2D0000] transition-colors text-sm uppercase tracking-wider text-center">Abort</button>
               <button onClick={() => deleteMut.mutate(activeTx.id)} className="flex-1 py-3 border border-ignite-alert bg-ignite-alert/20 text-ignite-alert font-bold rounded-xl hover:bg-ignite-alert hover:text-white shadow-[0_0_15px_rgba(255,68,68,0.3)] transition-all flex justify-center items-center text-sm uppercase tracking-wider">
                 {deleteMut.isPending ? <div className="w-5 h-5 border-2 border-transparent border-t-white rounded-full animate-spin"></div> : 'PURGE'}
               </button>
             </div>
          </div>
        </div>
      )}

      {(modalMode === 'add' || modalMode === 'edit') && (
        <TransactionModal 
          mode={modalMode} 
          tx={activeTx} 
          onClose={() => setModalMode(null)} 
          onSuccess={() => { 
            queryClient.invalidateQueries(['transactions']); 
            queryClient.invalidateQueries(['analytics']);
            setModalMode(null); 
            showToast(modalMode === 'add' ? 'Matrix successfully mapped!' : 'Vector parameter updated!'); 
          }} 
        />
      )}

      {modalMode === 'import' && (
        <CSVImportModal 
           onClose={() => setModalMode(null)} 
           onSuccess={(inserted) => {
             queryClient.invalidateQueries(['transactions']);
             setModalMode(null);
             showToast(`Injected ${inserted} volume packets correctly!`);
           }} 
        />
      )}
    </div>
  );
}

// Subcomponents for Modals to keep code cleaner
function TransactionModal({ mode, tx, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    type: tx?.type || 'expense', merchant: tx?.merchant || '', amount: tx?.amount || '',
    category: tx?.category || '', date: tx ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0], notes: tx?.notes || ''
  });
  
  const mut = useMutation({
    mutationFn: async (data) => mode === 'add' ? await api.post('/transactions', data) : await api.put(`/transactions/${tx.id}`, data),
    onSuccess
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mut.mutate({...formData, amount: Number(formData.amount)});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in relative">
      <div className="bg-ignite-card border border-ignite-border rounded-2xl w-full max-w-lg shadow-[0_4px_40px_rgba(204,0,0,0.2)] overflow-hidden flex flex-col max-h-[90vh] relative z-20">
        <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-ignite-red/10 rounded-full blur-[50px] pointer-events-none"></div>
        <div className="flex justify-between items-center p-6 border-b border-ignite-border relative z-10 bg-[#110000]">
          <h3 className="text-3xl font-bebas tracking-[2px] text-ignite-white">{mode === 'add' ? 'Inject Transaction Vector' : 'Modify Existing Vector'}</h3>
          <button onClick={onClose} className="p-2 bg-ignite-bg border border-ignite-border rounded hover:border-ignite-red hover:text-ignite-red text-ignite-muted transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar relative z-10 bg-ignite-card">
          <form id="tx-form" onSubmit={onSubmit} className="space-y-6">
             <div className="flex p-1.5 bg-ignite-bg border border-ignite-border rounded-xl">
                <button type="button" onClick={()=>setFormData({...formData, type: 'expense'})} className={`flex-1 py-2.5 text-[13px] tracking-wider uppercase font-black rounded-lg transition-all ${formData.type==='expense' ? 'bg-[#2D0000] text-ignite-red shadow-md':'text-ignite-muted hover:text-ignite-white'}`}>Capital Bleed</button>
                <button type="button" onClick={()=>setFormData({...formData, type: 'income'})} className={`flex-1 py-2.5 text-[13px] tracking-wider uppercase font-black rounded-lg transition-all ${formData.type==='income' ? 'bg-[#0A2D0A] text-ignite-success shadow-md':'text-ignite-muted hover:text-ignite-white'}`}>Capital Injection</button>
             </div>
             
             <div>
               <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Total Volume (₹)*</label>
               <input type="number" required min="0" step="any" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-4 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-2xl font-black text-ignite-white tracking-tight text-center placeholder-[#333]" placeholder="0" />
             </div>
             <div>
               <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Merchant Link*</label>
               <input type="text" required value={formData.merchant} onChange={e=>setFormData({...formData, merchant: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-3 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-[15px] font-bold text-ignite-white placeholder-[#6B5555]" placeholder="e.g. AWS Core, Cyberdyne" />
             </div>
             <div className="grid grid-cols-2 gap-5">
               <div>
                 <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Timestamp*</label>
                 <input type="date" required value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-3 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-sm font-bold text-ignite-white [color-scheme:dark]" />
               </div>
               <div>
                 <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Sector Map</label>
                 <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-3 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-sm font-bold text-ignite-white appearance-none">
                   <option value="">Auto-Node</option>
                   <option value="Food">Food</option>
                   <option value="Travel">Travel</option>
                   <option value="Shopping">Shopping</option>
                   <option value="Housing">Housing</option>
                   <option value="Entertainment">Entertainment</option>
                   <option value="Utilities">Utilities</option>
                   <option value="Health">Health</option>
                   <option value="Salary">Salary</option>
                   <option value="Other">Other</option>
                 </select>
               </div>
             </div>
             <div>
               <label className="block text-[11px] font-black text-ignite-muted uppercase tracking-widest mb-2">Decrypted Logs (Optional)</label>
               <input type="text" value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className="w-full bg-ignite-bg border border-ignite-border rounded-xl p-3 outline-none focus:border-ignite-red focus:shadow-ignite-focus text-[14px] font-medium text-ignite-white placeholder-[#6B5555]" placeholder="Add metadata context..." />
             </div>
          </form>
        </div>
        <div className="p-5 border-t border-ignite-border bg-[#110000] flex gap-4 relative z-10">
          <button type="button" onClick={onClose} className="flex-[0.5] py-3.5 bg-ignite-bg border border-ignite-border text-ignite-white font-black text-[13px] tracking-widest uppercase rounded-xl hover:bg-[#2D0000] transition-colors">Abhort</button>
          <button type="submit" form="tx-form" disabled={mut.isPending} className="flex-1 py-3.5 bg-ignite-red text-white font-black text-[13px] tracking-widest uppercase rounded-xl hover:bg-ignite-hover hover:shadow-[0_0_20px_rgba(204,0,0,0.4)] transition-all flex justify-center items-center">
            {mut.isPending ? <div className="w-5 h-5 border-2 border-transparent border-b-white border-l-white rounded-full animate-spin"></div> : (mode === 'add' ? 'INITIALIZE VECTOR' : 'OVERWRITE CORE')}
          </button>
        </div>
      </div>
    </div>
  );
}

function CSVImportModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const mut = useMutation({
    mutationFn: async (csvText) => {
      const lines = csvText.split('\n').filter(l => l.trim() !== '');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const transactions = lines.slice(1).map(line => {
        const row = line.split(',');
        return {
           date: row[headers.indexOf('date')]?.trim(),
           merchant: row[headers.indexOf('merchant')]?.trim(),
           amount: Number(row[headers.indexOf('amount')] || 0),
           type: row[headers.indexOf('type')]?.trim().toLowerCase() || 'expense',
           category: row[headers.indexOf('category')]?.trim() || '',
           notes: row[headers.indexOf('notes')]?.trim() || ''
        };
      }).filter(t => t.merchant && t.amount);

      const res = await api.post('/transactions/import', { transactions });
      return res.data;
    },
    onSuccess: (data) => onSuccess(data.inserted)
  });

  const handleUpload = () => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => mut.mutate(e.target.result);
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in relative">
      <div className="bg-ignite-card border border-ignite-border rounded-2xl p-8 w-full max-w-md shadow-[0_4px_40px_rgba(204,0,0,0.2)] relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-ignite-red/10 rounded-full blur-[50px] pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h3 className="text-3xl font-bebas tracking-[2px] text-ignite-white">Mass CSV Injection</h3>
          <button onClick={onClose} className="p-2 bg-ignite-bg border border-ignite-border rounded hover:border-ignite-red hover:text-ignite-red text-ignite-muted transition-colors"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="border border-dashed border-ignite-red bg-ignite-red/5 rounded-xl p-8 text-center mb-6 shadow-[inset_0_4px_20px_rgba(204,0,0,0.05)] relative z-10">
           <Upload className="w-12 h-12 text-ignite-red drop-shadow-[0_0_8px_rgba(204,0,0,0.5)] mx-auto mb-4" />
           <p className="text-[13px] font-black tracking-widest uppercase text-ignite-white mb-2">Uplink Bulk Architecture Node</p>
           <p className="text-[12px] text-ignite-muted font-medium mb-5 px-4 leading-relaxed">CSV schema MUST contain valid <b className="text-ignite-white font-black">Date, Merchant, Amount, and Type</b> explicit columns.</p>
           <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} className="text-sm font-bold text-ignite-muted file:mr-4 file:py-2 file:px-6 file:rounded-xl file:border file:border-ignite-border file:font-black file:uppercase file:text-[11px] file:tracking-widest file:bg-ignite-bg file:text-ignite-white hover:file:bg-[#2D0000] hover:file:border-ignite-red transition-all mx-auto cursor-pointer w-full pl-5" />
        </div>

        <button onClick={handleUpload} disabled={!file || mut.isPending} className="w-full py-4 bg-ignite-red text-white font-black text-[13px] tracking-widest uppercase rounded-xl hover:bg-ignite-hover shadow-ignite-card disabled:opacity-30 flex justify-center items-center transition-all hover:scale-[1.02] relative z-10 active:scale-95">
            {mut.isPending ? <div className="w-6 h-6 border-2 border-transparent border-t-white border-l-white rounded-full animate-spin"></div> : 'EXECUTE BATCH INJECTION'}
        </button>
      </div>
    </div>
  );
}
