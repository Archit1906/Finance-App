import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, UploadCloud, X, ChevronLeft, ChevronRight, Upload, Settings } from 'lucide-react';

const CATEGORY_COLORS = {
  Food: 'bg-[#111] text-[#8B0000] border-[#333] shadow-[var(--shadow-recessed)]',
  Travel: 'bg-[#111] text-[#D4AF37] border-[#333] shadow-[var(--shadow-recessed)]',
  Shopping: 'bg-[#111] text-[#a38a3d] border-[#333] shadow-[var(--shadow-recessed)]',
  Housing: 'bg-[#111] text-[#8B0000] border-[#333] shadow-[var(--shadow-recessed)]',
  Salary: 'bg-[#111] text-[#005c00] border-[#333] shadow-[var(--shadow-recessed)]',
  Health: 'bg-[#111] text-[#8B0000] border-[#333] shadow-[var(--shadow-recessed)]',
  Entertainment: 'bg-[#111] text-[#D4AF37] border-[#333] shadow-[var(--shadow-recessed)]',
  Utilities: 'bg-[#111] text-[#2F4F4F] border-[#333] shadow-[var(--shadow-recessed)]',
  Other: 'bg-[#111] text-[#888] border-[#333] shadow-[var(--shadow-recessed)]'
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
    <div className="space-y-6 animate-fade-in pb-20 relative z-0 min-h-[90vh]">
      <div className="fixed inset-0 pointer-events-none bg-cotes-de-geneve animate-cotes-breathe z-[-1]"></div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-sunray plate-border text-[#D4AF37] px-6 py-3 rounded-sm shadow-plate z-50 flex items-center animate-fade-in font-sans font-bold text-sm tracking-widest uppercase">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#333] pb-6">
        <div>
          <h1 className="text-3xl font-sans text-engraved-gold tracking-widest font-bold">Ledger Transactions</h1>
          <p className="text-xs font-sans font-bold text-[#888] mt-1 uppercase tracking-widest">Financial Movement Caliber</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <button onClick={() => setModalMode('import')} className="flex-1 sm:flex-none flex items-center px-4 py-2 bg-[#0d0d0d] border border-[#333] text-[#888] hover:text-[#D4AF37] hover:border-[#D4AF37] shadow-[var(--shadow-recessed)] animate-button-compress transition-all justify-center font-sans font-bold tracking-widest rounded-sm">
            <UploadCloud className="w-4 h-4 mr-2" /> IMPORT CSV
          </button>
          <button onClick={() => { setActiveTx(null); setModalMode('add'); }} className="flex-1 sm:flex-none flex items-center px-5 py-2 bg-[#1a1a1a] border border-[#D4AF37] text-engraved-gold shadow-plate hover:bg-[#D4AF37] hover:text-[#000] animate-button-compress transition-all justify-center font-sans font-bold tracking-widest rounded-sm">
            <Plus className="w-4 h-4 mr-1" /> CREATE
          </button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555] group-focus-within:text-[#D4AF37] transition-colors w-5 h-5" />
          <input 
            type="text" 
            placeholder="Dial into merchant, category, or notes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#0d0d0d] border border-[#333] rounded-sm outline-none focus:shadow-[var(--shadow-recessed)] focus:border-[#D4AF37] transition-all text-sm font-sans font-bold tracking-wide text-engraved-gold placeholder-[#555] shadow-[var(--shadow-recessed)]"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center px-6 py-3 border rounded-sm transition-all font-sans font-bold tracking-widest text-sm animate-button-compress ${showFilters || activeFilterCount > 0 ? 'bg-[#D4AF37] border-[#D4AF37] text-[#000] shadow-plate' : 'bg-[#111] border-[#333] text-[#888] shadow-[var(--shadow-recessed)] hover:text-[#D4AF37] hover:border-[#D4AF37]'}`}>
          <Filter className="w-4 h-4 mr-2" />
          FILTERS {activeFilterCount > 0 && <span className="ml-2 bg-[#050505] text-[#D4AF37] text-xs px-2 py-0.5 rounded-sm border border-[#333]">{activeFilterCount}</span>}
        </button>
      </div>

      {/* FILTERS PANEL */}
      {showFilters && (
        <div className="bg-sunray p-6 rounded-sm shadow-plate plate-border animate-fade-in relative z-10">
          <div className="flex justify-between items-center mb-5 relative z-10">
            <h3 className="font-sans font-bold tracking-widest uppercase text-engraved-gold">Mechanism Filters</h3>
            <button onClick={() => setFilters({type:'', category:[], startDate:'', endDate:'', minAmount:'', maxAmount:''})} className="text-xs font-bold text-[#888] uppercase tracking-wider hover:text-[#D4AF37] transition-colors">Reset Dials</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
            <div>
              <label className="block text-[11px] font-sans font-bold text-[#888] uppercase tracking-widest mb-2">Flow Velocity</label>
              <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})} className="w-full border border-[#333] bg-[#0d0d0d] text-[#e0e0e0] rounded-sm p-3 text-sm font-sans font-bold outline-none focus:border-[#D4AF37] focus:shadow-[var(--shadow-recessed)] shadow-[var(--shadow-recessed)] transition-all">
                <option value="all">Global Matrix</option>
                <option value="income">Capital Injection</option>
                <option value="expense">Capital Bleed</option>
              </select>
            </div>
            <div>
               <label className="block text-[11px] font-sans font-bold text-[#888] uppercase tracking-widest mb-2">Sector Dial</label>
               <input type="text" placeholder="e.g. Food, Travel" disabled title="Multi-select UI simplified for demo" value={filters.category.join(', ')} onChange={(e) => setFilters({...filters, category: e.target.value ? e.target.value.split(',').map(s=>s.trim()) : []})} className="w-full border border-[#333] bg-[#111] text-[#555] rounded-sm p-3 text-sm font-sans font-bold shadow-[var(--shadow-recessed)] outline-none cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-[11px] font-sans font-bold text-[#888] uppercase tracking-widest mb-2">Timeline Range</label>
              <div className="flex gap-2">
                <input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} className="w-full border border-[#333] bg-[#0d0d0d] text-[#e0e0e0] shadow-[var(--shadow-recessed)] rounded-sm p-2 text-[11px] font-mono outline-none focus:border-[#D4AF37] transition-all [color-scheme:dark]" />
                <input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} className="w-full border border-[#333] bg-[#0d0d0d] text-[#e0e0e0] shadow-[var(--shadow-recessed)] rounded-sm p-2 text-[11px] font-mono outline-none focus:border-[#D4AF37] transition-all [color-scheme:dark]" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-sans font-bold text-[#888] uppercase tracking-widest mb-2">Capital Threshold</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min ₹" value={filters.minAmount} onChange={(e) => setFilters({...filters, minAmount: e.target.value})} className="w-full border border-[#333] shadow-[var(--shadow-recessed)] bg-[#0d0d0d] text-engraved-gold placeholder-[#555] rounded-sm p-3 text-sm font-mono font-bold outline-none focus:border-[#D4AF37] transition-all" />
                <input type="number" placeholder="Max ₹" value={filters.maxAmount} onChange={(e) => setFilters({...filters, maxAmount: e.target.value})} className="w-full border border-[#333] shadow-[var(--shadow-recessed)] bg-[#0d0d0d] text-engraved-gold placeholder-[#555] rounded-sm p-3 text-sm font-mono font-bold outline-none focus:border-[#D4AF37] transition-all" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-sunray rounded-sm shadow-plate plate-border overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-[#D4AF37]">
             <Settings className="w-8 h-8 animate-gear-spin mb-4 text-[#D4AF37]" />
             <p className="font-bold tracking-widest uppercase text-sm font-sans">Engaging Mechanism...</p>
          </div>
        ) : filteredTxs.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-[#0d0d0d] border border-[#333] rounded-full flex items-center justify-center mb-6 shadow-[var(--shadow-recessed)]">
               <Search className="w-10 h-10 text-[#555]" />
            </div>
            <p className="text-2xl font-sans font-bold tracking-widest text-[#D4AF37] mb-2 uppercase">No Movements Recorded</p>
            <p className="text-[#888] max-w-sm mb-8 text-xs font-bold uppercase tracking-widest">Adjust dials to surface internal data blocks.</p>
            <button onClick={() => { setActiveTx(null); setModalMode('add'); }} className="px-8 py-3 bg-[#111] border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#000] text-engraved-gold rounded-sm shadow-plate animate-button-compress font-bold tracking-widest uppercase text-sm transition-all">
              INITIALIZE FLOW
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[400px]">
            <table className="min-w-full divide-y divide-[#333]">
              <thead className="bg-[#050505]">
                <tr>
                  <th className="px-6 py-4 text-left text-[9px] font-sans font-bold text-[#888] uppercase tracking-[0.2em]">Timeline Date</th>
                  <th className="px-6 py-4 text-left text-[9px] font-sans font-bold text-[#888] uppercase tracking-[0.2em]">Metadata Record</th>
                  <th className="px-6 py-4 text-left text-[9px] font-sans font-bold text-[#888] uppercase tracking-[0.2em]">Sector Index</th>
                  <th className="px-6 py-4 text-right text-[9px] font-sans font-bold text-[#888] uppercase tracking-[0.2em]">Volume Shift</th>
                  <th className="px-6 py-4 text-center text-[9px] font-sans font-bold text-[#888] uppercase tracking-[0.2em] w-20">Control</th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-[#222]">
                {filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#111] transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap text-[11px] text-[#e0e0e0] font-sans font-bold tracking-widest uppercase">
                      {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[13px] font-bold text-engraved-gold uppercase tracking-widest">{tx.merchant}</div>
                      {tx.notes && <div className="text-[10px] font-sans font-medium text-[#888] mt-1.5 truncate max-w-[250px] uppercase tracking-widest">{tx.notes}</div>}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-[9px] uppercase tracking-widest font-sans font-bold rounded-sm border ${getBadgeColor(tx.category)}`}>
                        {tx.category || 'UNCATEGORIZED'}
                      </span>
                    </td>
                    <td className={`px-6 py-5 whitespace-nowrap text-right font-mono font-black text-lg ${tx.type === 'income' ? 'text-[#005c00]' : 'text-engraved-gold'}`}>
                      {tx.type === 'income' ? '+' : '-'}₹{formatInr(tx.amount)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center text-sm">
                      <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                        <button onClick={() => { setActiveTx(tx); setModalMode('edit'); }} className="p-2 text-[#888] hover:text-[#D4AF37] hover:bg-[#1a1a1a] rounded-sm transition-colors border border-transparent hover:border-[#333] shadow-[var(--shadow-recessed)]">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setActiveTx(tx); setModalMode('delete'); }} className="p-2 text-[#888] hover:text-[#8B0000] hover:bg-[#1a1a1a] rounded-sm transition-colors border border-transparent hover:border-[#333] shadow-[var(--shadow-recessed)]">
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
          <div className="bg-[#050505] px-6 py-4 border-t border-[#333] flex items-center justify-between">
            <p className="text-[10px] font-sans font-bold text-[#888] uppercase tracking-widest">
              Indexing <span className="text-[#e0e0e0]">{(page-1)*limit + 1}</span> to <span className="text-[#e0e0e0]">{Math.min(page*limit, pagination.total)}</span> / <span className="text-[#D4AF37]">{pagination.total}</span> points
            </p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="p-1 px-2 border border-[#333] rounded-sm hover:bg-[#111] hover:border-[#555] disabled:opacity-30 disabled:cursor-not-allowed bg-[#0d0d0d] text-[#e0e0e0] transition-all shadow-[var(--shadow-recessed)] animate-button-compress">
                 <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-4 py-1.5 text-[10px] font-sans font-bold text-engraved-gold tracking-widest bg-[#0d0d0d] plate-border shadow-[var(--shadow-recessed)]">P {page} / {pagination.totalPages}</div>
              <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p+1)} className="p-1 px-2 border border-[#333] rounded-sm hover:bg-[#111] hover:border-[#555] disabled:opacity-30 disabled:cursor-not-allowed bg-[#0d0d0d] text-[#e0e0e0] transition-all shadow-[var(--shadow-recessed)] animate-button-compress">
                 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ALL MODALS */}
      {modalMode === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-sunray shadow-plate plate-border rounded-sm p-8 w-full max-w-sm relative overflow-hidden">
             <h3 className="text-xl font-bold tracking-widest text-[#8B0000] mb-2 relative z-10 uppercase">Authorize Core Deletion</h3>
             <p className="text-[#888] text-[11px] font-bold mb-8 relative z-10 tracking-widest uppercase">Confirm permanent structural removal for <b className="text-engraved-gold">{activeTx?.merchant}</b>. This mechanical shift cannot be reversed.</p>
             <div className="flex gap-4 relative z-10">
               <button onClick={() => setModalMode(null)} className="flex-1 py-3 bg-[#111] border border-[#333] text-[#888] font-bold rounded-sm hover:border-[#555] shadow-[var(--shadow-recessed)] transition-colors text-[10px] uppercase tracking-widest text-center animate-button-compress">Abort</button>
               <button onClick={() => deleteMut.mutate(activeTx.id)} className="flex-1 py-3 border border-[#8B0000] bg-[#1a0a0a] text-[#8B0000] font-bold rounded-sm hover:bg-[#8B0000] hover:text-[#fff] shadow-plate transition-all flex justify-center items-center text-[10px] uppercase tracking-widest animate-button-compress">
                 {deleteMut.isPending ? <Settings className="w-4 h-4 animate-gear-spin" /> : 'PURGE'}
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
            showToast(modalMode === 'add' ? 'Movement successfully mapped!' : 'Vector parameter updated!'); 
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

// Subcomponents for Modals
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in font-sans">
      <div className="bg-sunray plate-border shadow-plate rounded-sm w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] relative z-20">
        <div className="flex justify-between items-center p-6 border-b border-[#333] relative z-10 bg-[#0d0d0d]">
          <h3 className="text-sm font-bold tracking-widest text-[#D4AF37] uppercase">{mode === 'add' ? 'Inject Capital Flow' : 'Modify Internal Flow'}</h3>
          <button onClick={onClose} className="p-2 bg-[#111] border border-[#333] shadow-[var(--shadow-recessed)] rounded-sm hover:border-[#D4AF37] hover:text-[#D4AF37] text-[#888] animate-button-compress transition-colors"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-6 overflow-y-auto relative z-10 bg-sunray">
          <form id="tx-form" onSubmit={onSubmit} className="space-y-6">
             <div className="flex p-1.5 bg-[#0d0d0d] border border-[#333] rounded-sm shadow-[var(--shadow-recessed)]">
                <button type="button" onClick={()=>setFormData({...formData, type: 'expense'})} className={`flex-1 py-2.5 text-[10px] tracking-[0.2em] uppercase font-bold rounded-sm transition-all ${formData.type==='expense' ? 'bg-[#1a0a0a] border border-[#8B0000] text-[#8B0000] shadow-plate':'text-[#888] hover:text-[#e0e0e0]'}`}>Capital Bleed</button>
                <button type="button" onClick={()=>setFormData({...formData, type: 'income'})} className={`flex-1 py-2.5 text-[10px] tracking-[0.2em] uppercase font-bold rounded-sm transition-all ${formData.type==='income' ? 'bg-[#0a1a0a] border border-[#005c00] text-[#005c00] shadow-plate':'text-[#888] hover:text-[#e0e0e0]'}`}>Capital Injection</button>
             </div>
             
             <div>
               <label className="block text-[11px] font-bold text-[#888] uppercase tracking-widest mb-2">Total Volume (₹) *</label>
               <input type="number" required min="0" step="any" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className="w-full bg-[#111] border border-[#333] shadow-[var(--shadow-recessed)] rounded-sm p-4 outline-none focus:border-[#D4AF37] text-xl font-mono font-black text-engraved-gold tracking-tight text-center placeholder-[#555]" placeholder="0" />
             </div>
             <div>
               <label className="block text-[11px] font-bold text-[#888] uppercase tracking-widest mb-2">Merchant Link *</label>
               <input type="text" required value={formData.merchant} onChange={e=>setFormData({...formData, merchant: e.target.value})} className="w-full bg-[#0d0d0d] border border-[#333] shadow-[var(--shadow-recessed)] rounded-sm p-3 outline-none focus:border-[#D4AF37] text-[13px] font-bold text-[#e0e0e0] placeholder-[#555] uppercase tracking-widest" placeholder="e.g. AWS Core" />
             </div>
             <div className="grid grid-cols-2 gap-5">
               <div>
                 <label className="block text-[11px] font-bold text-[#888] uppercase tracking-widest mb-2">Timestamp *</label>
                 <input type="date" required value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full bg-[#0d0d0d] border border-[#333] shadow-[var(--shadow-recessed)] rounded-sm p-2 outline-none focus:border-[#D4AF37] text-xs font-mono font-bold text-[#e0e0e0] [color-scheme:dark]" />
               </div>
               <div>
                 <label className="block text-[11px] font-bold text-[#888] uppercase tracking-widest mb-2">Sector Map</label>
                 <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full bg-[#0d0d0d] border border-[#333] shadow-[var(--shadow-recessed)] rounded-sm p-2.5 outline-none focus:border-[#D4AF37] text-xs font-bold text-[#e0e0e0] uppercase tracking-widest">
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
               <label className="block text-[11px] font-bold text-[#888] uppercase tracking-widest mb-2">Ledger Metadata (Optional)</label>
               <input type="text" value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className="w-full bg-[#0d0d0d] border border-[#333] shadow-[var(--shadow-recessed)] rounded-sm p-3 outline-none focus:border-[#D4AF37] text-[11px] font-bold text-[#888] uppercase tracking-widest placeholder-[#555]" placeholder="Add metadata..." />
             </div>
          </form>
        </div>
        <div className="p-5 border-t border-[#333] bg-[#050505] flex gap-4 relative z-10">
          <button type="button" onClick={onClose} className="flex-[0.5] py-3.5 bg-[#111] border border-[#333] shadow-[var(--shadow-recessed)] text-[#888] font-bold text-[10px] tracking-widest uppercase rounded-sm hover:border-[#555] transition-colors animate-button-compress">Abort</button>
          <button type="submit" form="tx-form" disabled={mut.isPending} className="flex-1 py-3.5 bg-[#1a1a1a] border border-[#D4AF37] text-[#000] bg-[#D4AF37] font-bold text-[10px] tracking-widest uppercase rounded-sm shadow-plate hover:bg-[#b0912c] transition-all flex justify-center items-center animate-button-compress">
            {mut.isPending ? <Settings className="w-4 h-4 animate-gear-spin text-[#000]" /> : (mode === 'add' ? 'INITIALIZE VECTOR' : 'OVERWRITE CORE')}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in font-sans">
      <div className="bg-sunray shadow-plate plate-border rounded-sm p-8 w-full max-w-md relative overflow-hidden">
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h3 className="text-lg font-bold tracking-widest text-[#D4AF37] uppercase">Mass Data Injection</h3>
          <button onClick={onClose} className="p-2 bg-[#111] border border-[#333] shadow-[var(--shadow-recessed)] rounded-sm hover:border-[#D4AF37] text-[#888] transition-colors animate-button-compress"><X className="w-4 h-4"/></button>
        </div>
        
        <div className="border border-dashed border-[#555] bg-[#0d0d0d] shadow-[var(--shadow-recessed)] rounded-sm p-8 text-center mb-6 relative z-10">
           <Upload className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
           <p className="text-[11px] font-bold tracking-widest uppercase text-[#e0e0e0] mb-2">Uplink Bulk Architecture Node</p>
           <p className="text-[10px] text-[#888] font-bold tracking-widest uppercase mb-5 px-4 leading-relaxed">CSV schema MUST contain valid <b className="text-[#D4AF37]">Date, Merchant, Amount, and Type</b> explicit columns.</p>
           <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} className="text-xs font-bold text-[#888] file:mr-4 file:py-2 file:px-6 file:rounded-sm file:border file:border-[#333] file:font-bold file:uppercase file:text-[9px] file:tracking-widest file:bg-[#111] file:text-[#e0e0e0] file:shadow-[var(--shadow-recessed)] hover:file:bg-[#1a1a1a] hover:file:border-[#D4AF37] transition-all mx-auto cursor-pointer w-full pl-5" />
        </div>

        <button onClick={handleUpload} disabled={!file || mut.isPending} className="w-full py-4 bg-[#1a1a1a] border border-[#D4AF37] bg-[#D4AF37] text-[#000] font-bold text-[11px] tracking-widest uppercase rounded-sm shadow-plate disabled:opacity-30 flex justify-center items-center transition-all animate-button-compress relative z-10">
            {mut.isPending ? <Settings className="w-5 h-5 animate-gear-spin text-[#000]" /> : 'EXECUTE BATCH INJECTION'}
        </button>
      </div>
    </div>
  );
}
