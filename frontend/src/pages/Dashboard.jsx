import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Compass, Activity } from 'lucide-react';
import DashboardCharts from '../components/DashboardCharts';

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: summary, isLoading } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
       const res = await api.get('/analytics/summary');
       return res.data.data;
    }
  });

  const netWorth = summary?.netWorth || 0;
  const income = summary?.thisMonthIncome || 0;
  const expense = summary?.thisMonthExpense || 0;
  
  // Basic Health Score logic recreating original Dashboard
  const savings = income - expense;
  const healthRaw = income > 0 ? (savings / income) * 100 : (expense > 0 ? -10 : 0);
  const healthScore = Math.max(0, Math.min(100, healthRaw + 50)); 

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-7xl mx-auto px-4 mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-bebas tracking-[4px] text-engraved-gold flex items-center shadow-gold-text">
            COMMAND CENTER // {user?.name?.toUpperCase() || 'PRIMARY'}
          </h1>
          <p className="text-[#888] font-mono text-[10px] tracking-[0.2em] uppercase mt-1">Status: Online • {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
      
      {/* Complications Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-cotes-de-geneve p-6 rounded-2xl plate-border shadow-plate relative z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[rgba(255,255,255,0.02)] to-black/60 pointer-events-none rounded-2xl"></div>

        {/* Live Net Worth Complication */}
        <div className="bg-[#0a0a0a] p-5 rounded-xl border border-[#333] shadow-recessed relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[#666] text-[10px] font-mono font-bold uppercase tracking-[0.2em] relative z-10">Live Net Worth</h3>
            
            {/* Animated Gear System */}
            <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
               <svg viewBox="0 0 100 100" className="absolute w-10 h-10 text-[#444] animate-gear-spin fill-current">
                 <path d="M50,10 L55,20 L65,18 L68,28 L78,32 L75,42 L85,50 L75,58 L78,68 L68,72 L65,82 L55,80 L50,90 L45,80 L35,82 L32,72 L22,68 L25,58 L15,50 L25,42 L22,32 L32,28 L35,18 L45,20 Z" />
                 <circle cx="50" cy="50" r="15" fill="#0a0a0a" />
               </svg>
               <svg viewBox="0 0 100 100" className="absolute w-6 h-6 text-[var(--color-champagne-gold)] animate-gear-spin fill-current drop-shadow-[0_0_3px_#D4AF37]" style={{ animationDirection: 'reverse', animationDuration: '4s' }}>
                 <path d="M50,15 L54,25 L64,25 L66,35 L76,40 L70,48 L76,56 L66,61 L64,71 L54,71 L50,81 L46,71 L36,71 L34,61 L24,56 L30,48 L24,40 L34,35 L36,25 L46,25 Z" />
                 <circle cx="50" cy="50" r="10" fill="#0a0a0a" />
               </svg>
            </div>
          </div>
          <p className="text-2xl font-mono font-black text-engraved-gold mt-1 tracking-tight z-10">
            ₹{(netWorth || 0).toLocaleString('en-IN')}
          </p>
        </div>
        
        {/* Monthly Income */}
        <div className="bg-[#0a0a0a] p-5 rounded-xl border border-[#333] shadow-recessed relative overflow-hidden group">
          <div className="absolute top-2 right-2 opacity-10">
            <Compass className="w-16 h-16 text-[var(--color-champagne-gold)]" />
          </div>
          <h3 className="text-[#666] text-[10px] font-mono font-bold uppercase tracking-[0.2em] relative z-10">Monthly Income</h3>
          <p className="text-2xl font-mono font-black text-[#00C853] mt-1 tracking-tight drop-shadow-[0_0_8px_rgba(0,200,83,0.3)] relative z-10">
            ₹{(income || 0).toLocaleString('en-IN')}
          </p>
        </div>
        
        {/* Monthly Expense */}
        <div className="bg-[#0a0a0a] p-5 rounded-xl border border-[#333] shadow-recessed relative overflow-hidden group">
          <div className="absolute top-2 right-2 opacity-10">
            <Activity className="w-16 h-16 text-[var(--color-enamel-red)]" />
          </div>
          <h3 className="text-[#666] text-[10px] font-mono font-bold uppercase tracking-[0.2em] relative z-10">Monthly Expense</h3>
          <p className="text-2xl font-mono font-black text-[var(--color-enamel-red)] mt-1 tracking-tight drop-shadow-[0_0_8px_rgba(139,0,0,0.3)] relative z-10">
            ₹{(expense || 0).toLocaleString('en-IN')}
          </p>
        </div>

        {/* Health Score Tourbillon */}
        <div className="bg-[#0a0a0a] p-5 rounded-xl border border-[#333] shadow-recessed relative overflow-hidden flex flex-col justify-between items-end text-right">
           <div className="flex justify-between w-full items-start">
             {/* Gravity Defying Tourbillon Gauge */}
             <div className="w-10 h-10 rounded-full border border-[#444] shadow-[0_0_10px_rgba(0,0,0,0.9),inset_0_0_5px_rgba(0,0,0,0.9)] flex items-center justify-center relative bg-[#111] shrink-0">
                <div className="absolute inset-2 border border-[var(--color-champagne-gold)] rounded-full opacity-30 shadow-[inset_0_0_3px_#D4AF37]"></div>
                <div className="w-1 h-6 bg-[var(--color-champagne-gold)] rounded-full animate-tourbillon-tick shadow-[0_0_5px_rgba(212,175,55,0.8)]"></div>
             </div>
             <h3 className="text-[#666] text-[10px] font-mono font-bold uppercase tracking-[0.2em]">Node Health</h3>
           </div>
           <div>
             <p className="text-xl font-mono font-black text-engraved-gold tracking-widest">{healthScore.toFixed(0)} / 100</p>
             <p className="text-[#888] text-[9px] font-mono font-bold uppercase tracking-[0.2em]">{healthScore > 60 ? 'OPTIMAL' : 'DEGRADED'}</p>
           </div>
        </div>

      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-transparent border-t-[var(--color-champagne-gold)] animate-spin"></div></div>
      ) : (
        <DashboardCharts />
      )}
    </div>
  );
}
