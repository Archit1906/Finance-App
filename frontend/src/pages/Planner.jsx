import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { Calculator, Calendar, Landmark, Plus, Trash2, Edit2, ChevronDown, ChevronUp, AlertCircle, PlayCircle, Home, Car, CreditCard, BookOpen, Gift, Shield, Activity, Monitor, Coffee } from 'lucide-react';

const formatInr = (num) => Number(Math.max(0, num || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// Categories and icons mapping
const LOAN_TYPES = {
  'Home Loan': Home, 'Car Loan': Car, 'Personal Loan': CreditCard, 'Education Loan': BookOpen, 'Credit Card': CreditCard, 'Other': Calculator
};
const SUB_CATS = {
  'Streaming': Monitor, 'Fitness': Activity, 'Software': Calculator, 'Insurance': Shield, 'Utility': Home, 'Other': Gift
};
const SUB_COLORS = {
  'Streaming': 'text-[#ff00ff] bg-[#ff00ff]/10 border-[#ff00ff]/30',
  'Fitness': 'text-[#00ffcc] bg-[#00ffcc]/10 border-[#00ffcc]/30',
  'Software': 'text-[#00E5FF] bg-[#00E5FF]/10 border-[#00E5FF]/30',
  'Insurance': 'text-[#FF8C00] bg-[#FF8C00]/10 border-[#FF8C00]/30',
  'Utility': 'text-[#ADFF2F] bg-[#ADFF2F]/10 border-[#ADFF2F]/30',
  'Other': 'text-gray-400 bg-gray-800/50 border-gray-700',
};

// Holographic cyber modal background style
const cyberPanelClass = "backdrop-blur-xl bg-[#050B0D]/80 shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_15px_rgba(0,229,255,0.1)] border border-[#00E5FF]/30";
const cyberPanelAltClass = "backdrop-blur-md bg-[#0A0F11]/90 border border-[#222] shadow-lg";

export default function Planner() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('plannerTab') || 'loans');
  
  useEffect(() => { localStorage.setItem('plannerTab', activeTab); }, [activeTab]);

  // Modals Data
  const [loanModal, setLoanModal] = useState(null); // { mode, data }
  const [subModal, setSubModal] = useState(null);
  const [taxModal, setTaxModal] = useState(null);

  // Queries
  const { data: loans = [], isLoading: loadingLoans } = useQuery({ queryKey:['loans'], queryFn: async () => (await api.get('/loans')).data.data });
  const { data: subs = [], isLoading: loadingSubs } = useQuery({ queryKey:['subscriptions'], queryFn: async () => (await api.get('/subscriptions')).data.data });
  const { data: taxRaw, isLoading: loadingTaxes } = useQuery({ queryKey:['taxes'], queryFn: async () => (await api.get('/taxes')).data.data });

  // Mutations
  const executeMut = useMutation({
     mutationFn: async ({ path, method, data }) => {
        if(method === 'DELETE') return await api.delete(path);
        if(method === 'PUT') return await api.put(path, data);
        return await api.post(path, data);
     },
     onSuccess: (_, v) => {
        if(v.path.includes('loans')) queryClient.invalidateQueries(['loans']);
        if(v.path.includes('subscription')) queryClient.invalidateQueries(['subscriptions']);
        if(v.path.includes('tax')) queryClient.invalidateQueries(['taxes']);
        setLoanModal(null); setSubModal(null); setTaxModal(null);
     }
  });

  const tabs = [
    { id: 'loans', label: 'LOANS & EMIs', icon: Calculator },
    { id: 'subs', label: 'SUBSCRIPTIONS', icon: Calendar },
    { id: 'tax', label: 'TAX PLANNER [80C]', icon: Landmark }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#333] pb-4">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#ADFF2F] tracking-widest uppercase">
          Financial Planner
        </h1>
        <div className="flex bg-[#050B0D]/80 rounded-xl shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] border border-[#222] p-1 w-full sm:w-auto overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center px-4 py-2 text-xs font-bold rounded-lg transition-all tracking-widest uppercase whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/50 shadow-[inset_0_0_10px_rgba(0,229,255,0.2)]" 
                  : "text-gray-500 hover:text-[#bbb] border border-transparent hover:bg-white/5"
              )}
            >
              <tab.icon className="w-3 h-3 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'loans' && <LoansTab loans={loans} isLoading={loadingLoans} onAdd={()=>setLoanModal({mode:'add'})} onEdit={l=>setLoanModal({mode:'edit', data:l})} onDelete={id=>executeMut.mutate({path:`/loans/${id}`, method:'DELETE'})} />}
        {activeTab === 'subs' && <SubsTab subs={subs} isLoading={loadingSubs} onAdd={()=>setSubModal({mode:'add'})} onEdit={s=>setSubModal({mode:'edit', data:s})} onDelete={id=>executeMut.mutate({path:`/subscriptions/${id}`, method:'DELETE'})} />}
        {activeTab === 'tax' && <TaxTab taxRaw={taxRaw} isLoading={loadingTaxes} onAdd={preset=>setTaxModal({mode:'add', data:preset})} onEdit={t=>setTaxModal({mode:'edit', data:t})} onDelete={id=>executeMut.mutate({path:`/taxes/investments/${id}`, method:'DELETE'})} />}
      </div>

      {loanModal && <LoanEditorModal initial={loanModal.data} onClose={()=>setLoanModal(null)} onSave={(d)=>executeMut.mutate({path: loanModal.data ? `/loans/${loanModal.data.id}` : '/loans', method: loanModal.data ? 'PUT' : 'POST', data:d})} />}
      {subModal && <SubEditorModal initial={subModal.data} onClose={()=>setSubModal(null)} onSave={(d)=>executeMut.mutate({path: subModal.data ? `/subscriptions/${subModal.data.id}` : '/subscriptions', method: subModal.data ? 'PUT' : 'POST', data:d})} />}
      {taxModal && <TaxEditorModal initial={taxModal.data} onClose={()=>setTaxModal(null)} onSave={(d)=>executeMut.mutate({path: taxModal.data && taxModal.data.id ? `/taxes/investments/${taxModal.data.id}` : '/taxes/investments', method: taxModal.data && taxModal.data.id ? 'PUT' : 'POST', data:d})} />}
    </div>
  );
}

// -------------------------------------------------------------
// TAB 1: LOANS
// -------------------------------------------------------------
function LoansTab({ loans, isLoading, onAdd, onEdit, onDelete }) {
   const [expanded, setExpanded] = useState({});

   const toggleL = (id) => setExpanded(p => ({...p, [id]: !p[id]}));

   const sumOut = loans.reduce((acc,l)=>acc+Number(l.outstanding||0), 0);
   const sumPrin = loans.reduce((acc,l)=>acc+Number(l.principal||0), 0);
   const sumEmi = loans.reduce((acc,l)=>acc+Number(l.emi_amount||0), 0);
   const sumIntPaid = loans.reduce((acc, l) => {
      const p = Number(l.principal);
      const o = Number(l.outstanding);
      const r = (Number(l.interest_rate)/100)/12;
      return acc + ((p - o) * r * 20); // Placeholder heuristic
   }, 0);

   return (
      <div className="space-y-6 animate-fade-in">
        {/* STATS HEADER */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div className={`${cyberPanelClass} p-5 rounded-xl border-l-[3px] border-l-[#FF4444] flex flex-col justify-center relative overflow-hidden`}>
             <div className="absolute inset-0 bg-gradient-to-r from-[#FF4444]/10 to-transparent pointer-events-none"></div>
             <span className="text-[#888] text-[10px] font-bold uppercase tracking-[0.2em] relative z-10">Total Outstanding</span>
             <span className="text-xl font-bold text-[#FF4444] mt-1 tracking-wider relative z-10 drop-shadow-[0_0_5px_#FF4444]">₹{formatInr(sumOut)}</span>
           </div>
           <div className={`${cyberPanelAltClass} p-5 rounded-xl flex flex-col justify-center`}>
             <span className="text-[#888] text-[10px] font-bold uppercase tracking-[0.2em]">Monthly EMI Burden</span>
             <span className="text-xl font-bold text-[#00E5FF] mt-1 tracking-wider">₹{formatInr(sumEmi)}<span className="text-xs text-[#555] ml-1 uppercase">/mo</span></span>
           </div>
           <div className={`${cyberPanelAltClass} p-5 rounded-xl hidden sm:flex flex-col justify-center`}>
             <span className="text-[#888] text-[10px] font-bold uppercase tracking-[0.2em]">Total Principal</span>
             <span className="text-xl font-bold text-[#ADFF2F] mt-1 tracking-wider drop-shadow-[0_0_3px_rgba(173,255,47,0.5)]">₹{formatInr(sumPrin)}</span>
           </div>
           <div className={`${cyberPanelAltClass} p-5 rounded-xl hidden sm:flex flex-col justify-center`}>
             <span className="text-[#888] text-[10px] font-bold uppercase tracking-[0.2em]">Est. Interest Paid</span>
             <span className="text-xl font-bold text-[#FF8C00] mt-1 tracking-wider">₹{formatInr(sumPrin * 0.15)}</span>
           </div>
        </div>

        <div className="flex justify-between items-center px-1 mt-8 mb-4">
          <h2 className="text-sm font-bold text-[#E0E0E0] tracking-[0.2em] uppercase border-b border-[#333] pb-1">Active Loans Matrix</h2>
          <button onClick={onAdd} className="flex items-center px-4 py-1.5 text-[10px] border border-[#00E5FF]/50 bg-[#00E5FF]/10 text-[#00E5FF] font-bold uppercase tracking-widest shadow-[inset_0_0_10px_rgba(0,229,255,0.2)] hover:bg-[#00E5FF]/20 hover:border-[#00E5FF] transition-all">
            <Plus className="w-3 h-3 mr-2" /> Add Loan
          </button>
        </div>

        {isLoading ? (
           <div className="h-64 flex bg-[#050B0D]/50 border border-[#222] rounded-xl items-center justify-center animate-pulse text-[#00E5FF] font-mono tracking-widest">CRUNCHING LEDGERS...</div>
        ) : loans.length === 0 ? (
           <div className={`${cyberPanelClass} p-16 rounded-xl text-center flex flex-col items-center`}>
             <div className="w-20 h-20 bg-[#ADFF2F]/10 border border-[#ADFF2F]/30 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(173,255,47,0.2)]"><Landmark className="w-10 h-10 text-[#ADFF2F]" /></div>
             <h2 className="text-xl font-bold text-[#ADFF2F] tracking-widest mb-2 uppercase drop-shadow-[0_0_5px_#ADFF2F]">Node is Debt Free</h2>
             <p className="text-[#888] max-w-sm mb-8 text-xs tracking-wider">Or missing ledger data. Initialize EMI tracking above.</p>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loans.map(loan => (
                 <LoanCard key={loan.id} loan={loan} expanded={expanded[loan.id]} toggle={()=>toggleL(loan.id)} onEdit={()=>onEdit(loan)} onDelete={()=>onDelete(loan.id)}/>
              ))}
           </div>
        )}
      </div>
   );
}

function LoanCard({ loan, expanded, toggle, onEdit, onDelete }) {
   const Icon = LOAN_TYPES[loan.lender_name] || Calculator;
   const prin = Number(loan.principal);
   const out = Number(loan.outstanding);
   const emi = Number(loan.emi_amount);
   const rate = Number(loan.interest_rate);
   const repaid = Math.max(0, prin - out);
   let pct = (repaid / prin) * 100;
   if(isNaN(pct) || pct < 0) pct = 0;

   let pColorClass = 'bg-[#FF4444] shadow-[0_0_10px_#FF4444]';
   let pTextColor = 'text-[#FF4444]';
   if(pct > 25) { pColorClass = 'bg-[#FF8C00] shadow-[0_0_10px_#FF8C00]'; pTextColor = 'text-[#FF8C00]'; }
   if(pct > 60) { pColorClass = 'bg-[#ADFF2F] shadow-[0_0_10px_#ADFF2F]'; pTextColor = 'text-[#ADFF2F]'; }

   const estMonthsLeft = emi > 0 ? out / emi : 0;
   const pDate = new Date();
   pDate.setMonth(pDate.getMonth() + estMonthsLeft);

   return (
     <div className={`${cyberPanelClass} overflow-hidden group`}>
       <div className="p-6 relative">
          
          <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={onEdit} className="p-1.5 text-[#555] hover:text-[#00E5FF] bg-black/40 border border-transparent hover:border-[#00E5FF]/50 rounded"><Edit2 className="w-3.5 h-3.5"/></button>
             <button onClick={onDelete} className="p-1.5 text-[#555] hover:text-[#FF4444] bg-black/40 border border-transparent hover:border-[#FF4444]/50 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
          </div>

          <div className="flex items-center space-x-3 mb-5">
             <div className="w-12 h-12 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] shadow-[inset_0_0_10px_rgba(0,229,255,0.2)]">
                <Icon className="w-6 h-6"/>
             </div>
             <div>
                <h3 className="font-bold text-[#E0E0E0] tracking-wider uppercase text-sm">{loan.lender_name}</h3>
                <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/20 px-2 py-0.5 rounded mt-1 inline-block">NODE ACTIVE</span>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-black/40 p-4 rounded-xl border border-[#222] mb-6">
             <div>
                <p className="text-[10px] uppercase font-bold text-[#888] tracking-widest mb-1">Outstanding</p>
                <p className="text-xl font-bold text-[#FF4444] tracking-widest drop-shadow-[0_0_5px_#FF4444]">₹{formatInr(out)}</p>
             </div>
             <div>
                <p className="text-[10px] uppercase font-bold text-[#888] tracking-widest mb-1">Original Principal</p>
                <p className="text-xl font-bold text-[#E0E0E0] tracking-widest">₹{formatInr(prin)}</p>
             </div>
             <div className="col-span-2 flex justify-between border-t border-[#333] pt-3 mt-1">
                <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-[#888] tracking-widest">EMI Amount</span><span className="font-bold text-[#00E5FF]">₹{formatInr(emi)}<span className="text-[9px] text-[#555] ml-1">/MO</span></span></div>
                <div className="flex flex-col text-right"><span className="text-[10px] uppercase font-bold text-[#888] tracking-widest">Interest Rate</span><span className="font-bold text-[#FF8C00]">{rate}% <span className="text-[9px] text-[#555]">P.A</span></span></div>
             </div>
          </div>

          <div>
             <div className="flex justify-between text-[10px] tracking-widest uppercase font-bold text-[#888] mb-2">
                <span>₹{formatInr(repaid)} REPAID</span>
                <span className={pTextColor}>{Math.floor(pct)}% DONE</span>
             </div>
             <div className="w-full bg-[#111] border border-[#333] h-2 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all", pColorClass)} style={{width: `${pct}%`}}></div>
             </div>
          </div>
       </div>

       <div className="border-t border-[#222] bg-[#0A0F11]/60 p-4 flex justify-between items-center">
          <div className="flex flex-col">
             <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#555]">Est. Payoff</span>
             <span className="text-[11px] uppercase tracking-widest font-bold text-[#ADFF2F]">{pDate.toLocaleString('default',{month:'short', year:'numeric'})}</span>
          </div>
          <button onClick={toggle} className="text-[9px] uppercase tracking-widest font-bold text-[#00E5FF] bg-black/40 hover:bg-[#00E5FF]/10 px-3 py-1.5 rounded border border-[#00E5FF]/30 flex items-center transition">
             {expanded ? 'HIDE AMORTIZATION' : 'AMORTIZATION TABLE'} {expanded ? <ChevronUp className="w-3 h-3 ml-1"/> : <ChevronDown className="w-3 h-3 ml-1"/>}
          </button>
       </div>

       {expanded && <AmortizationViewer loan={loan} />}
     </div>
   );
}

function AmortizationViewer({ loan }) {
   const p = Number(loan.outstanding);
   const r = (Number(loan.interest_rate)/100)/12;
   const emi = Number(loan.emi_amount);

   const [extra, setExtra] = useState('');
   const E = Math.max(emi, emi + Number(extra||0));
   
   let bal = p;
   const rows = [];
   for(let i=1; i<=6; i++) {
      if(bal <= 0) break;
      const intComp = bal * r;
      const prinComp = E - intComp;
      bal -= prinComp;
      rows.push({m: i, emi: E, pComp: prinComp, iComp: intComp, cb: Math.max(0, bal)});
   }

   return (
      <div className="border-t border-[#00E5FF]/30 bg-black/50 p-4 relative overflow-hidden animate-fade-in">
         <div className="bg-[#00E5FF]/5 border border-[#00E5FF]/20 p-3 rounded mb-4 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#00E5FF]">Simulator (Extra +₹):</span>
            <input type="number" value={extra} onChange={e=>setExtra(e.target.value)} placeholder="0" className="w-24 text-right ml-2 px-2 py-1 text-xs font-bold font-mono bg-black/60 border border-[#00E5FF]/40 text-[#00E5FF] rounded outline-none focus:border-[#00E5FF]" />
         </div>
         <table className="w-full text-left text-[10px] tracking-widest uppercase">
            <thead>
               <tr className="text-[#555] border-b border-[#333]">
                  <th className="pb-2">Mo</th>
                  <th className="pb-2">Prin. Comp</th>
                  <th className="pb-2">Int. Comp</th>
                  <th className="pb-2 text-right">Balance</th>
               </tr>
            </thead>
            <tbody>
               {rows.map(r => (
                  <tr key={r.m} className="border-b border-[#222] text-[#888] font-mono">
                     <td className="py-2 text-[#E0E0E0]">{r.m}</td>
                     <td className="py-2 text-[#ADFF2F]">₹{formatInr(r.pComp)}</td>
                     <td className="py-2 text-[#FF4444]">₹{formatInr(r.iComp)}</td>
                     <td className="py-2 text-right font-bold text-[#E0E0E0]">₹{formatInr(r.cb)}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}

function LoanEditorModal({ initial, onClose, onSave }) {
   const [fd, setFd] = useState(initial || { lender_name:'', type:'Personal Loan', principal:'', outstanding:'', interest_rate:'', emi_amount:'', tenure_months:'', start_date:new Date().toISOString().split('T')[0]});
   const calcEmi = () => {
      if(!fd.principal || !fd.interest_rate || !fd.tenure_months) return;
      const P = Number(fd.principal);
      const r = (Number(fd.interest_rate)/100)/12;
      const n = Number(fd.tenure_months);
      const emi = (P * r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
      setFd({...fd, emi_amount: Math.ceil(emi)});
   };
   
   return (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-mono">
       <div className={`${cyberPanelClass} rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]`}>
          <div className="p-4 border-b border-[#00E5FF]/30 bg-[#00E5FF]/5">
             <h3 className="text-sm tracking-[0.3em] font-bold text-[#00E5FF] uppercase">{initial?'Update Protocol':'Provision Loan'}</h3>
          </div>
          <div className="p-6 overflow-y-auto space-y-5 bg-black/40">
             <div>
                <label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Lender Entity</label>
                <input required value={fd.lender_name} onChange={e=>setFd({...fd, lender_name:e.target.value})} className="w-full bg-black/50 border border-[#333] text-[#E0E0E0] rounded p-2 focus:border-[#00E5FF] focus:outline-none" />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Principal [₹]</label>
                  <input type="number" required value={fd.principal} onChange={e=>setFd({...fd, principal:e.target.value})} onBlur={calcEmi} className="w-full bg-black/50 border border-[#333] text-[#E0E0E0] rounded p-2 focus:border-[#00E5FF] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Outstanding [₹]</label>
                  <input type="number" value={fd.outstanding} onChange={e=>setFd({...fd, outstanding:e.target.value})} className="w-full bg-black/50 border border-[#333] text-[#FF4444] rounded p-2 focus:border-[#FF4444] focus:outline-none" />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Rate [% p.a]</label><input type="number" step="0.1" required value={fd.interest_rate} onChange={e=>setFd({...fd, interest_rate:e.target.value})} onBlur={calcEmi} className="w-full bg-black/50 border border-[#333] text-[#FF8C00] rounded p-2 focus:border-[#FF8C00] focus:outline-none" /></div>
                <div><label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Term [Mo]</label><input type="number" required value={fd.tenure_months} onChange={e=>setFd({...fd, tenure_months:e.target.value})} onBlur={calcEmi} className="w-full bg-black/50 border border-[#333] text-[#E0E0E0] rounded p-2 focus:border-[#00E5FF] focus:outline-none" /></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Calculated EMI</label><input type="number" required value={fd.emi_amount} onChange={e=>setFd({...fd, emi_amount:e.target.value})} className="w-full bg-[#00E5FF]/10 border border-[#00E5FF]/40 text-[#00E5FF] rounded p-2 focus:border-[#00E5FF] shadow-[inset_0_0_10px_rgba(0,229,255,0.1)] focus:outline-none" /></div>
                <div><label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Initiation Date</label><input type="date" required value={fd.start_date.split('T')[0]} onChange={e=>setFd({...fd, start_date:e.target.value})} className="w-full bg-black/50 border border-[#333] text-[#E0E0E0] rounded p-2 focus:border-[#00E5FF] focus:outline-none [color-scheme:dark]" /></div>
             </div>
          </div>
          <div className="p-4 border-t border-[#00E5FF]/30 bg-[#00E5FF]/5 flex gap-3">
             <button onClick={onClose} className="flex-1 py-2 bg-transparent border border-[#555] text-[#888] hover:text-[#E0E0E0] text-[10px] uppercase font-bold tracking-[0.2em] rounded">Abort</button>
             <button onClick={()=>onSave(fd)} className="flex-1 py-2 bg-[#00E5FF]/20 border border-[#00E5FF]/50 text-[#00E5FF] text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.2)] rounded transition-all">Execute</button>
          </div>
       </div>
     </div>
   );
}

// -------------------------------------------------------------
// TAB 2: SUBSCRIPTIONS
// -------------------------------------------------------------
function SubsTab({ subs, isLoading, onAdd, onEdit, onDelete }) {
   const today = new Date();
   
   const moTotal = subs.filter(s=>s.frequency==='monthly').reduce((acc,s)=>acc+Number(s.amount), 0);
   const yrTotal = subs.filter(s=>s.frequency==='yearly').reduce((acc,s)=>acc+Number(s.amount), 0) + (moTotal*12);
   
   let due7 = 0; let due7Amnt = 0;
   const sorted = [...subs].sort((a,b)=>new Date(a.next_due) - new Date(b.next_due));
   
   sorted.forEach(s => {
      const d = new Date(s.next_due);
      const diff = Math.ceil((d - today)/(1000*60*60*24));
      if(diff >= 0 && diff <= 7) { due7++; due7Amnt += Number(s.amount); }
   });

   const mostEx = [...subs].sort((a,b)=>Number(b.amount)-Number(a.amount))[0] || null;

   return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div className={`${cyberPanelAltClass} p-5 rounded-xl flex flex-col justify-center`}>
             <span className="text-[#888] text-[10px] font-bold uppercase tracking-[0.2em]">Monthly Burn</span>
             <span className="text-xl font-bold text-[#E0E0E0] mt-1 tracking-wider">₹{formatInr(moTotal)}<span className="text-xs text-[#555] ml-1 uppercase">/mo</span></span>
           </div>
           <div className={`${cyberPanelAltClass} p-5 rounded-xl flex flex-col justify-center`}>
             <span className="text-[#888] text-[10px] font-bold uppercase tracking-[0.2em]">Yearly Output</span>
             <span className="text-xl font-bold text-[#ADFF2F] mt-1 tracking-wider">₹{formatInr(yrTotal)}</span>
           </div>
           <div className={cn("p-5 rounded-xl flex flex-col justify-center transition-colors border shadow-lg backdrop-blur-md", due7>0 ? "bg-[#FF8C00]/10 border-[#FF8C00]/50" : "bg-[#0A0F11]/90 border-[#222]")}>
             <span className="text-[#888] text-[10px] font-bold uppercase tracking-[0.2em]">Next 7 Days</span>
             <span className="text-xl font-bold text-[#FF8C00] mt-1 drop-shadow-[0_0_5px_rgba(255,140,0,0.5)]">{due7} <span className="text-[10px] tracking-widest text-[#FF8C00]">QUEUED [₹{formatInr(due7Amnt)}]</span></span>
           </div>
           <div className={`${cyberPanelAltClass} p-5 rounded-xl hidden sm:flex flex-col justify-center`}>
             <span className="text-[#888] text-[10px] font-bold uppercase tracking-[0.2em]">High Impact</span>
             <span className="text-[14px] font-bold text-[#ff00ff] mt-1 leading-tight tracking-widest uppercase">{mostEx ? mostEx.name : '--'}</span>
             <span className="text-xs font-bold text-[#888] mt-1">₹{formatInr(mostEx?.amount||0)}</span>
           </div>
        </div>

        <div className="flex justify-between items-center px-1 mt-8 mb-4">
          <h2 className="text-sm font-bold text-[#E0E0E0] tracking-[0.2em] uppercase border-b border-[#333] pb-1">Subscription Nodes</h2>
          <button onClick={onAdd} className="flex items-center px-4 py-1.5 text-[10px] border border-[#ff00ff]/50 bg-[#ff00ff]/10 text-[#ff00ff] font-bold uppercase tracking-widest shadow-[inset_0_0_10px_rgba(255,0,255,0.2)] hover:bg-[#ff00ff]/20 transition-all">
            <Plus className="w-3 h-3 mr-2" /> Add Node
          </button>
        </div>

        {subs.length === 0 && !isLoading && (
           <div className={`${cyberPanelClass} p-12 rounded-xl text-center flex flex-col items-center`}>
             <Monitor className="w-12 h-12 text-[#555] mb-4 opacity-50" />
             <h2 className="text-sm font-bold text-[#888] tracking-widest uppercase mb-1">No Active Data-Links</h2>
             <button onClick={onAdd} className="mt-4 px-4 py-2 border border-[#ff00ff]/50 text-[#ff00ff] text-[10px] tracking-[0.2em] uppercase hover:bg-[#ff00ff]/10 transition">+ Initialize Sync</button>
           </div>
        )}

        {subs.length > 0 && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {subs.map(sub => {
                    const d = new Date(sub.next_due);
                    const diff = Math.ceil((d - today)/(1000*60*60*24));
                    const isAlert = diff >= 0 && diff <= 7;
                    const isOver = diff < 0;
                    const ccClass = SUB_COLORS[sub.category] || SUB_COLORS['Other'];
                    
                    return (
                       <div key={sub.id} className={cn("p-5 rounded-xl border relative transition backdrop-blur-md shadow-lg", isOver ? "bg-[#FF4444]/10 border-[#FF4444]/40" : isAlert ? "bg-[#FF8C00]/10 border-[#FF8C00]/40" : "bg-[#0A0F11]/80 border-[#333] hover:border-[#555]")}>
                          <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={()=>onEdit(sub)} className="p-1 rounded bg-black/40 text-[#555] hover:text-[#00E5FF]"><Edit2 className="w-3 h-3"/></button>
                            <button onClick={()=>onDelete(sub.id)} className="p-1 rounded bg-black/40 text-[#555] hover:text-[#FF4444]"><Trash2 className="w-3 h-3"/></button>
                          </div>
                          <div className="flex items-center space-x-3 mb-4 pr-10">
                             <div className={cn("w-10 h-10 flex items-center justify-center font-bold text-lg rounded border", ccClass)}>{sub.name.charAt(0)}</div>
                             <div>
                                <h4 className="font-bold text-[#E0E0E0] tracking-wider uppercase text-sm">{sub.name}</h4>
                                <span className={cn("text-[8px] uppercase font-bold tracking-[0.2em] px-1.5 py-0.5 rounded inline-block mt-1", ccClass)}>{sub.category}</span>
                             </div>
                          </div>
                          <div className="flex justify-between items-end border-t border-[#333] pt-3">
                             <div className="flex flex-col">
                                <span className="text-xl font-bold tracking-widest text-[#00E5FF]">₹{formatInr(sub.amount)}</span>
                                <span className="text-[9px] uppercase font-bold text-[#555] tracking-widest">{sub.frequency}</span>
                             </div>
                             <div className="flex flex-col text-right">
                                <span className="text-[9px] font-bold text-[#888] tracking-[0.2em] uppercase">Next Cycle</span>
                                <span className={cn("text-xs tracking-widest font-bold uppercase", isOver ? "text-[#FF4444] drop-shadow-[0_0_5px_#FF4444]" : isAlert ? "text-[#FF8C00] drop-shadow-[0_0_5px_#FF8C00]" : "text-[#E0E0E0]")}>
                                   {d.toLocaleDateString('en-IN', {month:'short', day:'numeric'})}
                                </span>
                             </div>
                          </div>
                          {isAlert && <div className="absolute -top-3 left-4 bg-[#FF8C00]/20 text-[#FF8C00] text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border border-[#FF8C00]/50 backdrop-blur-md rounded shadow-[0_0_10px_rgba(255,140,0,0.3)]">DUE_IN_{diff}D</div>}
                          {isOver && <div className="absolute -top-3 left-4 bg-[#FF4444]/20 text-[#FF4444] text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border border-[#FF4444]/50 backdrop-blur-md rounded shadow-[0_0_10px_rgba(255,68,68,0.3)]">FAULT_OVERDUE</div>}
                       </div>
                    )
                 })}
              </div>

              {/* CALENDAR COLUMN */}
              <div className={`${cyberPanelClass} rounded-xl p-5 h-fit lg:sticky lg:top-6`}>
                 <h3 className="text-xs font-bold text-[#E0E0E0] uppercase tracking-[0.2em] border-b border-[#333] pb-3 mb-4 flex items-center"><Calendar className="w-3 h-3 mr-2 text-[#00E5FF]"/> Sync Outlook [30D]</h3>
                 <div className="space-y-4">
                    {sorted.slice(0, 10).map((s, i) => {
                       const d = new Date(s.next_due);
                       const isOver = Math.ceil((d - today)/(86400000)) < 0;
                       return (
                          <div key={i} className="flex items-center justify-between group py-1 border-b border-[#222]">
                             <div className="flex items-center space-x-3">
                                <div className={cn("w-10 text-center font-bold text-[9px] tracking-widest uppercase", isOver ? "text-[#FF4444]" : "text-[#555]")}>
                                   {d.toLocaleDateString('en-IN', {month:'short'})}<br/><span className={cn("text-lg leading-none font-bold", isOver ? "text-[#FF4444]" : "text-[#E0E0E0] group-hover:text-[#00E5FF]")}>{d.getDate()}</span>
                                </div>
                                <div className="h-6 w-px bg-[#333]"></div>
                                <span className="text-xs font-bold text-[#E0E0E0] tracking-wider uppercase">{s.name}</span>
                             </div>
                             <span className="font-bold text-[#00E5FF] tracking-widest text-xs">₹{formatInr(s.amount)}</span>
                          </div>
                       )
                    })}
                 </div>
              </div>
           </div>
        )}
      </div>
   );
}

function SubEditorModal({ initial, onClose, onSave }) {
  const [fd, setFd] = useState(initial || { name:'', amount:'', frequency:'monthly', category:'Streaming', next_due:new Date().toISOString().split('T')[0] });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-mono">
       <div className={`${cyberPanelClass} rounded-xl w-full max-w-sm overflow-hidden flex flex-col`}>
          <div className="p-4 border-b border-[#00E5FF]/30 bg-[#00E5FF]/5"><h3 className="text-sm tracking-[0.3em] font-bold text-[#00E5FF] uppercase">{initial?'Modify Sub Node':'Instantiate Node'}</h3></div>
          <div className="p-6 space-y-4 bg-black/40">
             <div><label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Service ID</label><input required value={fd.name} onChange={e=>setFd({...fd, name:e.target.value})} className="w-full bg-black/50 border border-[#333] text-[#E0E0E0] rounded p-2 focus:border-[#00E5FF] focus:outline-none" /></div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Debit [₹]</label><input type="number" required value={fd.amount} onChange={e=>setFd({...fd, amount:e.target.value})} className="w-full bg-black/50 border border-[#333] text-[#FF4444] rounded p-2 focus:border-[#FF4444] focus:outline-none" /></div>
                <div><label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Cycle</label><select value={fd.frequency} onChange={e=>setFd({...fd, frequency:e.target.value})} className="w-full bg-black/50 border border-[#333] text-[#E0E0E0] rounded p-2 focus:border-[#00E5FF] focus:outline-none"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div>
             </div>
             <div>
               <label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Class</label>
               <select value={fd.category} onChange={e=>setFd({...fd, category:e.target.value})} className="w-full bg-black/50 border border-[#333] text-[#E0E0E0] rounded p-2 focus:border-[#00E5FF] focus:outline-none">
                 {Object.keys(SUB_CATS).map(c=><option key={c} value={c} className="bg-[#111]">{c}</option>)}
               </select>
             </div>
             <div><label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Next Execution</label><input type="date" required value={fd.next_due.split('T')[0]} onChange={e=>setFd({...fd, next_due:e.target.value})} className="w-full bg-black/50 border border-[#333] text-[#E0E0E0] rounded p-2 focus:border-[#00E5FF] focus:outline-none [color-scheme:dark]" /></div>
          </div>
          <div className="p-4 border-t border-[#00E5FF]/30 bg-[#00E5FF]/5 flex gap-3">
             <button onClick={onClose} className="flex-1 py-2 bg-transparent border border-[#555] text-[#888] text-[10px] uppercase font-bold tracking-[0.2em] rounded">Abort</button>
             <button onClick={()=>onSave(fd)} className="flex-1 py-2 bg-[#ff00ff]/20 border border-[#ff00ff]/50 text-[#ff00ff] text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-[#ff00ff]/40 shadow-[0_0_10px_rgba(255,0,255,0.2)] rounded transition-all">Compile</button>
          </div>
       </div>
    </div>
  );
}

// -------------------------------------------------------------
// TAB 3: TAX PLANNER
// -------------------------------------------------------------
function TaxTab({ taxRaw, isLoading, onAdd, onEdit, onDelete }) {
   const [slab, setSlab] = useState(30);
   
   if(isLoading) return <div className="h-64 flex bg-[#050B0D]/50 border border-[#222] rounded-xl items-center justify-center animate-pulse text-[#ADFF2F] font-mono tracking-[0.2em]">VALIDATING SCHEMAS...</div>;

   const data = taxRaw?.investments || [];
   const sumData = taxRaw?.summary || { total_invested:0, progress_percentage:0, remaining_80c:150000, total_80c_limit:150000 };

   // Safe check if progress is over 100
   let pct = sumData.progress_percentage || 0;
   if(pct > 100) pct = 100;
   if(pct < 0) pct = 0;

   const saved = sumData.total_invested * (slab/100);
   const potSave = sumData.remaining_80c * (slab/100);

   return (
      <div className="space-y-6 animate-fade-in">
         {/* HEADER SUMMARY */}
         <div className="p-8 backdrop-blur-xl bg-black/60 shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(173,255,47,0.1)] border border-[#ADFF2F]/30 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ADFF2F]/10 blur-[80px] pointer-events-none"></div>
            <Landmark className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-48 h-48 opacity-5 text-[#ADFF2F] stroke-1" />
            
            <div className="flex justify-between items-start mb-6 border-b border-[#ADFF2F]/20 pb-4 relative z-10">
               <div>
                  <h2 className="text-xl font-bold tracking-[0.2em] text-[#E0E0E0] uppercase"><span className="text-[#ADFF2F]">FY {sumData.financial_year}</span> · 80C LIMIT</h2>
                  <p className="text-[#888] text-xs tracking-widest mt-1">DEDUCTION MAXIMIZATION PROTOCOL</p>
               </div>
               <span className="text-xl font-bold text-[#ADFF2F] border border-[#ADFF2F]/30 bg-[#ADFF2F]/5 px-3 py-1 rounded shadow-[inset_0_0_5px_rgba(173,255,47,0.2)] tracking-widest">₹{formatInr(sumData.total_80c_limit)}</span>
            </div>

            <div className="relative z-10">
               <div className="flex justify-between items-end mb-2 text-xs uppercase tracking-widest">
                  <span className="text-2xl font-bold text-[#E0E0E0] drop-shadow-[0_0_5px_#E0E0E0]">₹{formatInr(sumData.total_invested)} <span className="text-[10px] text-[#ADFF2F] font-bold">ALLOCATED ({Math.floor(sumData.progress_percentage)}%)</span></span>
                  <span className="text-[10px] text-[#FF8C00] font-bold tracking-[0.2em]">₹{formatInr(sumData.remaining_80c)} LEFT</span>
               </div>
               <div className="w-full bg-[#111] border border-[#222] h-2.5 rounded-full overflow-hidden shadow-[inset_0_0_5px_#000]">
                  <div className="bg-[#ADFF2F] h-full shadow-[0_0_15px_#ADFF2F] relative" style={{width: `${pct}%`}}>
                     <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-r from-transparent to-white/40"></div>
                  </div>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
               <div className="flex justify-between items-center mb-4 px-1">
                 <h3 className="text-sm font-bold text-[#E0E0E0] uppercase tracking-[0.2em] border-b border-[#333] pb-1">Declared Assets [80C]</h3>
                 <button onClick={()=>onAdd(null)} className="flex items-center px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase border border-[#ADFF2F]/50 bg-[#ADFF2F]/10 text-[#ADFF2F] hover:bg-[#ADFF2F]/20 transition-all shadow-[inset_0_0_10px_rgba(173,255,47,0.2)]">
                    <Plus className="w-3 h-3 mr-1" /> Append
                 </button>
               </div>
               
               {data.length === 0 ? (
                 <div className={`${cyberPanelClass} p-8 text-center border-dashed border-[#555]`}>
                    <p className="text-[#888] text-[10px] uppercase font-bold tracking-[0.2em]">Deduction array empty. Sub-optimal tax metrics applied.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.map(t => (
                       <div key={t.id} className={`${cyberPanelAltClass} p-5 rounded-xl border-l-[3px] border-l-[#ADFF2F] relative group hover:border-[#ADFF2F]/50 transition`}>
                          <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={()=>onEdit(t)} className="p-1 mr-1 rounded bg-black/40 text-[#555] hover:text-[#00E5FF]"><Edit2 className="w-3 h-3"/></button>
                             <button onClick={()=>onDelete(t.id)} className="p-1 rounded bg-black/40 text-[#555] hover:text-[#FF4444]"><Trash2 className="w-3 h-3"/></button>
                          </div>
                          <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#ADFF2F] border border-[#ADFF2F]/30 bg-[#ADFF2F]/10 px-2 py-0.5 rounded inline-block mb-2">{t.scheme}</span>
                          <h4 className="text-sm font-bold text-[#E0E0E0] tracking-wider uppercase pr-10">{t.scheme} Asset</h4>
                          <div className="mt-4 pt-4 border-t border-[#333] flex flex-col">
                             <span className="text-xl font-bold tracking-widest text-[#00E5FF]">₹{formatInr(t.amount)}</span>
                             <span className="text-[9px] uppercase font-bold text-[#888] tracking-[0.2em]">DECLARED {t.financial_year}</span>
                          </div>
                       </div>
                    ))}
                 </div>
               )}
            </div>

            {/* LIVE TAX CALCULATOR */}
            <div className={`${cyberPanelClass} p-6 lg:sticky lg:top-6 rounded-xl border-t border-t-[#00E5FF]`}>
               <h3 className="text-xs font-bold text-[#E0E0E0] uppercase tracking-[0.2em] mb-4 flex items-center border-b border-[#333] pb-2">
                 <Calculator className="w-4 h-4 mr-2 text-[#00E5FF]"/> Diagnostic Core
               </h3>
               
               <div className="bg-black/50 p-4 border border-[#333] rounded mb-6 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em]">Tax Vector</span>
                  <select value={slab} onChange={e=>setSlab(Number(e.target.value))} className="bg-transparent border-0 border-b border-[#00E5FF]/50 px-1 py-1 font-bold text-[#00E5FF] text-xs uppercase focus:outline-none appearance-none">
                     <option className="bg-[#111]" value={5}>BRACKET [05%]</option>
                     <option className="bg-[#111]" value={20}>BRACKET [20%]</option>
                     <option className="bg-[#111]" value={30}>BRACKET [30%]</option>
                  </select>
               </div>
               
               <div className="space-y-4">
                  <div className="flex justify-between border-b border-[#222] pb-3">
                     <span className="text-[10px] font-bold text-[#888] uppercase tracking-[0.2em]">Deflected Load</span>
                     <span className="font-bold text-[#ADFF2F] text-sm tracking-widest drop-shadow-[0_0_3px_#ADFF2F]">₹{formatInr(saved)}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#222] pb-3">
                     <span className="text-[10px] font-bold text-[#888] uppercase tracking-[0.2em]">Capacity Yield</span>
                     <span className="font-bold text-[#FF8C00] text-sm tracking-widest">+₹{formatInr(potSave)}</span>
                  </div>
               </div>

               <div className="mt-8">
                  <p className="text-[9px] uppercase font-bold tracking-[0.3em] text-[#00E5FF] text-center mb-4">Quick Provision</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                     {['ELSS', 'PPF', 'LIC'].map(p => (
                       <button key={p} onClick={()=>onAdd(p)} className="px-3 py-1 border border-[#333] bg-[#111] hover:bg-[#00E5FF]/10 hover:border-[#00E5FF]/50 hover:text-[#00E5FF] text-[#888] text-[9px] font-bold tracking-[0.2em] rounded uppercase transition">
                          + {p}
                       </button>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}

function TaxEditorModal({ initial, onClose, onSave }) {
  let initialDef = { scheme: 'ELSS', amount:'', financial_year:'2025-26' };
  if(typeof initial === 'string') initialDef.scheme = initial;
  if(typeof initial === 'object' && initial !== null) initialDef = initial;

  const [fd, setFd] = useState(initialDef);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-mono">
       <div className={`${cyberPanelClass} rounded-xl w-full max-w-sm overflow-hidden flex flex-col`}>
          <div className="p-4 border-b border-[#00E5FF]/30 bg-[#00E5FF]/5"><h3 className="text-sm tracking-[0.3em] font-bold text-[#00E5FF] uppercase">{initial?.id?'Alter Asset':'Declare Asset'}</h3></div>
          <div className="p-6 space-y-4 bg-black/40">
             <div>
               <label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Instrument Type</label>
               <select value={fd.scheme} onChange={e=>setFd({...fd, scheme:e.target.value})} className="w-full bg-black/50 border border-[#333] text-[#E0E0E0] rounded p-2 focus:border-[#00E5FF] focus:outline-none text-sm uppercase">
                 {['ELSS','PPF','LIC','NPS','NSC','EPF','Home Loan Principal','Other'].map(c=><option key={c} value={c} className="bg-[#111]">{c}</option>)}
               </select>
             </div>
             <div><label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Quantum [₹]</label><input type="number" required value={fd.amount} onChange={e=>setFd({...fd, amount:e.target.value})} className="w-full bg-[#ADFF2F]/10 border border-[#ADFF2F]/30 text-[#ADFF2F] font-bold tracking-widest rounded p-2 focus:border-[#ADFF2F] focus:outline-none" /></div>
             <div><label className="block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2">Fiscal Cycle</label><input value={fd.financial_year} disabled className="w-full bg-[#111] border border-[#222] text-[#555] rounded p-2 font-bold cursor-not-allowed" /></div>
          </div>
          <div className="p-4 border-t border-[#00E5FF]/30 bg-[#00E5FF]/5 flex gap-3"><button onClick={onClose} className="flex-1 py-2 bg-transparent border border-[#555] text-[#888] text-[10px] uppercase font-bold tracking-[0.2em] rounded">Abort</button><button onClick={()=>onSave(fd)} className="flex-1 py-2 bg-[#ADFF2F]/20 border border-[#ADFF2F]/50 text-[#ADFF2F] text-[10px] uppercase font-bold tracking-[0.2em] shadow-[inset_0_0_10px_rgba(173,255,47,0.2)] hover:bg-[#ADFF2F]/30 rounded transition-all">Submit</button></div>
       </div>
    </div>
  );
}
