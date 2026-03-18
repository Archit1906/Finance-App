import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, Search, Filter } from 'lucide-react';
import { useState } from 'react';

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions');
      return res.data.data;
    }
  });

  const filteredData = data?.filter((tx) => 
    tx.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    tx.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5 mr-2" />
          Add Transaction
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by merchant or category..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
        <button className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading transactions...</div>
        ) : filteredData?.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">No transactions found.</p>
            <p className="text-sm mt-1">Get started by adding your first transaction.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData?.map((tx) => (
                  <tr key={tx.id} className="hover:bg-indigo-50/50 transition-colors group cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{tx.merchant || 'Unknown Merchant'}</div>
                      {tx.notes && <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{tx.notes}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs font-medium rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                        {tx.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
