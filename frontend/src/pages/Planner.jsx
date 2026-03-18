import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { Calculator, Calendar, Landmark, Plus, Trash2, ArrowRight } from 'lucide-react';

export default function Planner() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('loans');

  const { data: loans, isLoading: loadingLoans } = useQuery({
    queryKey: ['loans'], queryFn: async () => (await api.get('/loans')).data.data
  });
  
  const { data: subs, isLoading: loadingSubs } = useQuery({
    queryKey: ['subscriptions'], queryFn: async () => (await api.get('/subscriptions')).data.data
  });

  const { data: taxData, isLoading: loadingTaxes } = useQuery({
    queryKey: ['taxes'], queryFn: async () => (await api.get('/taxes')).data.data
  });

  const deleteLoanMut = useMutation({
    mutationFn: async (id) => await api.delete(`/loans/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['loans'])
  });

  const deleteSubMut = useMutation({
    mutationFn: async (id) => await api.delete(`/subscriptions/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['subscriptions'])
  });

  const tabs = [
    { id: 'loans', label: 'Loans & EMIs', icon: Calculator },
    { id: 'subs', label: 'Subscriptions', icon: Calendar },
    { id: 'tax', label: 'Tax Planner (80C)', icon: Landmark }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Financial Planner</h1>
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                activeTab === tab.id ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
        
        {/* LOANS TAB */}
        {activeTab === 'loans' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Active Loans</h2>
              <button className="flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-1" /> Add Loan
              </button>
            </div>
            
            {loadingLoans ? (
              <div className="animate-pulse bg-gray-50 h-32 rounded-xl"></div>
            ) : loans?.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">No active loans. You are debt-free!</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loans.map(loan => (
                  <div key={loan.id} className="border border-gray-100 p-4 rounded-xl flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <h3 className="font-bold text-gray-900">{loan.lender_name}</h3>
                         <p className="text-xs text-gray-500">EMI: ₹{Number(loan.emi_amount).toLocaleString()} • {loan.interest_rate}% interest</p>
                       </div>
                       <button onClick={() => deleteLoanMut.mutate(loan.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                    <div className="mt-4 flex justify-between items-end">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Outstanding</p>
                        <p className="text-lg font-bold text-indigo-600">₹{Number(loan.outstanding).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Principal</p>
                        <p className="font-medium text-gray-700">₹{Number(loan.principal).toLocaleString()}</p>
                      </div>
                    </div>
                    {/* Simulated Amortization progress */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4">
                       <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${Math.max(0, 100 - (Number(loan.outstanding)/Number(loan.principal)*100))}%`}}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBSCRIPTIONS TAB */}
        {activeTab === 'subs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Subscriptions</h2>
              <button className="flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-1" /> Add Sub
              </button>
            </div>
            
            {loadingSubs ? (
              <div className="animate-pulse bg-gray-50 h-32 rounded-xl"></div>
            ) : subs?.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">No active subscriptions.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-500 pb-3">Service</th>
                      <th className="text-left text-xs font-semibold text-gray-500 pb-3">Amount</th>
                      <th className="text-left text-xs font-semibold text-gray-500 pb-3">Next Due</th>
                      <th className="text-right text-xs font-semibold text-gray-500 pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subs.map(sub => (
                      <tr key={sub.id}>
                        <td className="py-4 font-medium text-gray-900">{sub.name} <span className="ml-2 text-xs text-gray-400 font-normal border border-gray-200 px-2 py-0.5 rounded capitalize">{sub.frequency}</span></td>
                        <td className="py-4 text-gray-700">₹{Number(sub.amount).toLocaleString()}</td>
                        <td className="py-4 text-indigo-600 font-medium">{new Date(sub.next_due).toLocaleDateString()}</td>
                        <td className="py-4 text-right">
                          <button onClick={() => deleteSubMut.mutate(sub.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4 inline" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAX PLANNER TAB */}
        {activeTab === 'tax' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">80C Limit Tracker (FY {taxData?.summary?.financial_year || '2024-2025'})</h2>
              <button className="flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-1" /> Declare Investment
              </button>
            </div>
            
            {loadingTaxes ? (
              <div className="animate-pulse bg-gray-50 h-32 rounded-xl"></div>
            ) : (
              <div>
                 <div className="mb-8 p-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1">
                      <p className="text-emerald-50 font-medium mb-1">Total 80C Investments Declared</p>
                      <h3 className="text-4xl font-extrabold">₹{Number(taxData?.summary?.total_invested || 0).toLocaleString()}</h3>
                      <div className="w-full bg-white/20 rounded-full h-2 mt-4 overflow-hidden">
                        <div className="bg-white h-2 rounded-full" style={{ width: `${taxData?.summary?.progress_percentage || 0}%`}}></div>
                      </div>
                    </div>
                    <div className="md:ml-auto md:border-l md:border-emerald-400 md:pl-8 text-center md:text-left">
                       <p className="text-emerald-50 font-medium mb-1">Remaining Limit</p>
                       <p className="text-2xl font-bold mb-1">₹{Number(taxData?.summary?.remaining_80c || 150000).toLocaleString()}</p>
                       <p className="text-xs text-emerald-100">Max limit: ₹1,50,000</p>
                    </div>
                 </div>

                 <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Declared Items</h3>
                 {taxData?.investments?.length === 0 ? (
                   <div className="text-gray-500 text-sm italic">No 80C investments declared for this FY.</div>
                 ) : (
                   <ul className="space-y-3">
                     {taxData?.investments?.map(tax => (
                       <li key={tax.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                         <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center mr-3 font-bold text-xs text-gray-500">
                               {tax.scheme}
                            </div>
                            <span className="font-medium text-gray-900">{tax.scheme} Investment</span>
                         </div>
                         <span className="font-bold text-gray-900">₹{Number(tax.amount).toLocaleString()}</span>
                       </li>
                     ))}
                   </ul>
                 )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
