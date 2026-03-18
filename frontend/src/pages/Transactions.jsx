import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, UploadCloud, X, ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORY_COLORS = {
  Food: 'bg-orange-100 text-orange-800 border-orange-200',
  Travel: 'bg-blue-100 text-blue-800 border-blue-200',
  Shopping: 'bg-purple-100 text-purple-800 border-purple-200',
  Housing: 'bg-teal-100 text-teal-800 border-teal-200',
  Salary: 'bg-green-100 text-green-800 border-green-200',
  Health: 'bg-red-100 text-red-800 border-red-200',
  Entertainment: 'bg-pink-100 text-pink-800 border-pink-200',
  Utilities: 'bg-amber-100 text-amber-800 border-amber-200',
  Other: 'bg-gray-100 text-gray-800 border-gray-200'
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
    <div className="space-y-6 animate-in fade-in duration-500 relative pb-20">
      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center animate-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your income and expenses</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <button onClick={() => setModalMode('import')} className="flex-1 sm:flex-none flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors justify-center font-medium">
            <UploadCloud className="w-4 h-4 mr-2" /> Import CSV
          </button>
          <button onClick={() => { setActiveTx(null); setModalMode('add'); }} className="flex-1 sm:flex-none flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors justify-center font-medium">
            <Plus className="w-5 h-5 mr-1" /> Add
          </button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by merchant, category, or notes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center px-5 py-2.5 border rounded-xl transition-colors font-medium ${showFilters || activeFilterCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
          <Filter className="w-4 h-4 mr-2" />
          Filters {activeFilterCount > 0 && <span className="ml-2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>}
        </button>
      </div>

      {/* FILTERS PANEL */}
      {showFilters && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Advanced Filters</h3>
            <button onClick={() => setFilters({type:'', category:[], startDate:'', endDate:'', minAmount:'', maxAmount:''})} className="text-sm text-indigo-600 font-medium hover:underline">Reset All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Type</label>
              <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500">
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Category</label>
               <input type="text" placeholder="e.g. Food, Travel" disabled title="Multi-select UI simplified for demo" value={filters.category.join(', ')} onChange={(e) => setFilters({...filters, category: e.target.value ? e.target.value.split(',').map(s=>s.trim()) : []})} className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 bg-gray-50 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Date Range</label>
              <div className="flex gap-2">
                <input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" />
                <input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Amount Range</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min ₹" value={filters.minAmount} onChange={(e) => setFilters({...filters, minAmount: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" />
                <input type="number" placeholder="Max ₹" value={filters.maxAmount} onChange={(e) => setFilters({...filters, maxAmount: e.target.value})} className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400">
             <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
             <p>Loading transactions...</p>
          </div>
        ) : filteredTxs.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
               <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-xl font-bold text-gray-900 mb-2">No transactions found</p>
            <p className="text-gray-500 max-w-sm mb-6">We couldn't find any transactions matching your current search or filter criteria. Add a new one to get started!</p>
            <button onClick={() => { setActiveTx(null); setModalMode('add'); }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 font-medium transition-colors">
              + Add Transaction
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[400px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Transaction Info</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{tx.merchant}</div>
                      {tx.notes && <div className="text-xs text-gray-500 mt-1 truncate max-w-[250px]">{tx.notes}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-md border ${getBadgeColor(tx.category)}`}>
                        {tx.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold tracking-tight ${tx.type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {tx.type === 'income' ? '+' : '-'}₹{formatInr(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                        <button onClick={() => { setActiveTx(tx); setModalMode('edit'); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setActiveTx(tx); setModalMode('delete'); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
          <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-900">{(page-1)*limit + 1}</span> to <span className="font-medium text-gray-900">{Math.min(page*limit, pagination.total)}</span> of <span className="font-medium text-gray-900">{pagination.total}</span> entries
            </p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm text-gray-600">
                 <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-4 py-2 text-sm font-medium text-gray-700">Page {page} of {pagination.totalPages}</div>
              <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p+1)} className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm text-gray-600">
                 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ALL MODALS */}
      {modalMode === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
             <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Transaction</h3>
             <p className="text-gray-500 mb-6">Are you sure you want to delete this transaction for <b>{activeTx?.merchant}</b>? This action cannot be undone.</p>
             <div className="flex gap-3">
               <button onClick={() => setModalMode(null)} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50">Cancel</button>
               <button onClick={() => deleteMut.mutate(activeTx.id)} className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 shadow-sm flex justify-center items-center">
                 {deleteMut.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Confirm Delete'}
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
            showToast(modalMode === 'add' ? 'Transaction added!' : 'Transaction updated!'); 
          }} 
        />
      )}

      {modalMode === 'import' && (
        <CSVImportModal 
           onClose={() => setModalMode(null)} 
           onSuccess={(inserted) => {
             queryClient.invalidateQueries(['transactions']);
             setModalMode(null);
             showToast(`Imported ${inserted} transactions successfully!`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">{mode === 'add' ? 'Add Transaction' : 'Edit Transaction'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 overflow-y-auto">
          <form id="tx-form" onSubmit={onSubmit} className="space-y-4">
             <div className="flex p-1 bg-gray-100 rounded-lg">
                <button type="button" onClick={()=>setFormData({...formData, type: 'expense'})} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${formData.type==='expense' ? 'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>Expense</button>
                <button type="button" onClick={()=>setFormData({...formData, type: 'income'})} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${formData.type==='income' ? 'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>Income</button>
             </div>
             
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Amount (₹)*</label>
               <input type="number" required min="0" step="any" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 text-lg font-medium" placeholder="0.00" />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Merchant / Source*</label>
               <input type="text" required value={formData.merchant} onChange={e=>setFormData({...formData, merchant: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500" placeholder="e.g. Amazon, Salary" />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Date*</label>
                 <input type="date" required value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Category</label>
                 <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white">
                   <option value="">Auto-categorize</option>
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
                 <p className="text-[10px] text-gray-400 mt-1">Leave blank to auto-guess</p>
               </div>
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Notes</label>
               <input type="text" value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500" placeholder="Optional details..." />
             </div>
          </form>
        </div>
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-100">Cancel</button>
          <button type="submit" form="tx-form" disabled={mut.isPending} className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-sm flex justify-center items-center">
            {mut.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Transaction'}
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
      // Very basic manual parser for demo
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Import CSV</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50 mb-6">
           <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
           <p className="text-sm font-medium text-gray-900 mb-1">Upload your bank statement</p>
           <p className="text-xs text-gray-500 mb-4">CSV must contain Date, Merchant, Amount, and Type columns.</p>
           <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mx-auto" />
        </div>

        <button onClick={handleUpload} disabled={!file || mut.isPending} className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-sm disabled:opacity-50 flex justify-center items-center">
            {mut.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Start Import'}
        </button>
      </div>
    </div>
  );
}
