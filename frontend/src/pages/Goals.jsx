import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Target, Plus, CheckCircle2, TrendingUp, Presentation } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Goals() {
  const queryClient = useQueryClient();
  const [targetAmount, setTargetAmount] = useState(100000);
  const [returnRate, setReturnRate] = useState(12);
  const [years, setYears] = useState(5);

  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data } = await api.get('/goals');
      return data.data;
    }
  });

  const contributeMutation = useMutation({
    mutationFn: async ({ id, amount }) => {
      return await api.put(`/goals/${id}/contribute`, { amount });
    },
    onSuccess: () => queryClient.invalidateQueries(['goals'])
  });

  // SIP Calculator Formula: FV = P × [((1 + r)^n - 1) / r] × (1 + r)
  const monthlyRate = (returnRate / 100) / 12;
  const totalMonths = years * 12;
  const calculateSIP = () => {
    if (monthlyRate === 0) return targetAmount / totalMonths;
    const sip = targetAmount / (((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate));
    return sip;
  };

  const requiredSip = calculateSIP();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Financial Goals</h1>
        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5 mr-2" />
          Create Goal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals List */}
        <div className="lg:col-span-2 space-y-6">
          {isLoading ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center h-64 text-gray-500 animate-pulse">Loading goals...</div>
          ) : goals?.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
              <Target className="w-16 h-16 text-indigo-100 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No active goals yet.</p>
              <p className="text-sm text-gray-400 mt-1">Start planning your future today.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {goals?.map(goal => {
                const percentage = Math.min(100, (Number(goal.saved_amount) / Number(goal.target_amount)) * 100);
                const isAchieved = goal.status === 'achieved';

                return (
                  <div key={goal.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group transition-all hover:shadow-md">
                    {isAchieved && (
                      <div className="absolute top-4 right-4 text-emerald-500 flex items-center bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Achieved
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-gray-900 pr-16">{goal.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 capitalize">{goal.category}</p>
                    
                    <div className="mt-6">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-900">₹{Number(goal.saved_amount).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                        <span className="text-gray-500">₹{Number(goal.target_amount).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={cn("h-2.5 rounded-full transition-all duration-1000", isAchieved ? "bg-emerald-500" : "bg-indigo-600")}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-right">{percentage.toFixed(1)}% funded</p>
                    </div>

                    {!isAchieved && (
                      <div className="mt-6 pt-4 border-t border-gray-100 flex gap-2">
                        <button 
                          onClick={() => contributeMutation.mutate({ id: goal.id, amount: 5000 })}
                          className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          + ₹5,000
                        </button>
                        <button 
                          onClick={() => contributeMutation.mutate({ id: goal.id, amount: 10000 })}
                          className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          + ₹10,000
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SIP Calculator */}
        <div className="lg:col-span-1 border border-gray-100 rounded-2xl shadow-sm bg-white overflow-hidden">
          <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
            <h3 className="text-xl font-bold flex items-center">
              <Presentation className="w-6 h-6 mr-2 opacity-80" />
              SIP What-If Target
            </h3>
            <p className="text-indigo-100 text-sm mt-2 opacity-90">Calculate the monthly investment required to reach a future goal.</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                <span>Target Goal Amount</span>
                <span className="text-indigo-600 font-bold">₹{targetAmount.toLocaleString()}</span>
              </label>
              <input 
                type="range" min="10000" max="10000000" step="10000" 
                value={targetAmount} 
                onChange={(e) => setTargetAmount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                <span>Expected Return Rate</span>
                <span className="text-indigo-600 font-bold">{returnRate}%</span>
              </label>
              <input 
                type="range" min="4" max="30" step="1" 
                value={returnRate} 
                onChange={(e) => setReturnRate(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                <span>Time Horizon</span>
                <span className="text-indigo-600 font-bold">{years} years</span>
              </label>
              <input 
                type="range" min="1" max="30" step="1" 
                value={years} 
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
              />
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 font-medium text-center uppercase tracking-wider">Required Monthly SIP</p>
              <p className="text-4xl font-extrabold text-indigo-600 text-center mt-2 flex items-center justify-center">
                ₹{Math.ceil(requiredSip).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
