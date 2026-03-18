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
  'Streaming': 'text-purple-600 bg-purple-50 border-purple-200',
  'Fitness': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'Software': 'text-indigo-600 bg-indigo-50 border-indigo-200',
  'Insurance': 'text-blue-600 bg-blue-50 border-blue-200',
  'Utility': 'text-teal-600 bg-teal-50 border-teal-200',
  'Other': 'text-gray-600 bg-gray-50 border-gray-200',
};

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
    { id: 'loans', label: 'Loans & EMIs', icon: Calculator },
    { id: 'subs', label: 'Subscriptions', icon: Calendar },
    { id: 'tax', label: 'Tax Planner (80C)', icon: Landmark }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Financial Planner</h1>
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 w-full sm:w-auto overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center px-4 py-2.5 text-sm font-bold rounded-lg transition-colors whitespace-nowrap",
                activeTab === tab.id ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <tab.icon className="w-4 h-4 mr-2" />
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

   // Approx interest paid to date
   const sumIntPaid = loans.reduce((acc, l) => {
      const p = Number(l.principal);
      const o = Number(l.outstanding);
      const emi = Number(l.emi_amount);
      const r = (Number(l.interest_rate)/100)/12;
      // Reverse engineer: if we paid off P-O principal, how much interest? Rough estimation.
      // total paid approx = (principal - outstanding) * (1 + random avg ratio). Better math:
      // Not stored explicitly, so rough heuristic mapping
      return acc + ((p - o) * r * 20); // Placeholder heuristic
   }, 0);

   return (
      <div className="space-y-6 animate-in fade-in">
        
        {/* STATS HEADER */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-100 flex flex-col justify-center border-l-4 border-l-rose-500">
             <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Total Outstanding</span>
             <span className="text-2xl font-black text-rose-600 mt-1">₹{formatInr(sumOut)}</span>
           </div>
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
             <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Monthly EMI Burden</span>
             <span className="text-2xl font-black text-gray-900 mt-1">₹{formatInr(sumEmi)}<span className="text-sm font-medium text-gray-400">/mo</span></span>
           </div>
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center hidden sm:flex">
             <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Total Principal</span>
             <span className="text-xl font-black text-gray-700 mt-1">₹{formatInr(sumPrin)}</span>
           </div>
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center hidden sm:flex">
             <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Est. Interest Paid</span>
             <span className="text-xl font-black text-gray-700 mt-1">₹{formatInr(sumPrin * 0.15)}</span>
           </div>
        </div>

        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-black text-gray-900">Active Loans Matrix</h2>
          <button onClick={onAdd} className="flex items-center px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition">
            <Plus className="w-4 h-4 mr-2" /> Add Loan
          </button>
        </div>

        {isLoading ? (
           <div className="h-64 flex bg-white/50 border border-gray-100 rounded-2xl items-center justify-center animate-pulse text-indigo-300 font-bold">Crunching ledgers...</div>
        ) : loans.length === 0 ? (
           <div className="bg-white p-16 rounded-2xl border border-gray-100 text-center flex flex-col items-center shadow-sm">
             <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6"><Landmark className="w-10 h-10 text-emerald-500" /></div>
             <h2 className="text-2xl font-bold text-gray-900 mb-2">You are officially Debt Free!</h2>
             <p className="text-gray-500 max-w-sm mb-8">Or maybe you just need to add your history. Track EMIs flawlessly here.</p>
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
   const Icon = LOAN_TYPES[loan.lender_name] || Calculator; // Naive icon mapping, usually use a specific field
   const prin = Number(loan.principal);
   const out = Number(loan.outstanding);
   const emi = Number(loan.emi_amount);
   const rate = Number(loan.interest_rate);
   const repaid = Math.max(0, prin - out);
   let pct = (repaid / prin) * 100;
   if(isNaN(pct) || pct < 0) pct = 0;

   let pColor = 'bg-rose-500';
   if(pct > 25) pColor = 'bg-amber-500';
   if(pct > 60) pColor = 'bg-emerald-500';

   const estMonthsLeft = emi > 0 ? out / emi : 0;
   const pDate = new Date();
   pDate.setMonth(pDate.getMonth() + estMonthsLeft);

   return (
     <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
       <div className="p-6 relative">
          
          <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
             <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
          </div>

          <div className="flex items-center space-x-3 mb-5">
             <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600"><Icon className="w-6 h-6"/></div>
             <div>
                <h3 className="font-black text-gray-900 leading-tight">{loan.lender_name}</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md mt-1 inline-block">Loan Active</span>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
             <div>
                <p className="text-[10px] uppercase font-black text-rose-500/70 mb-1">Outstanding</p>
                <p className="text-2xl font-black text-rose-600 tracking-tighter">₹{formatInr(out)}</p>
             </div>
             <div>
                <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Original Principal</p>
                <p className="text-xl font-black text-gray-800 tracking-tighter">₹{formatInr(prin)}</p>
             </div>
             <div className="col-span-2 flex justify-between border-t border-gray-200/60 pt-3">
                <div className="flex flex-col"><span className="text-xs font-bold text-gray-400">EMI Amount</span><span className="font-black text-gray-800">₹{formatInr(emi)}<span className="text-[10px]/none font-normal">/mo</span></span></div>
                <div className="flex flex-col text-right"><span className="text-xs font-bold text-gray-400">Interest Rate</span><span className="font-black text-gray-800">{rate}% <span className="text-[10px]/none font-normal uppercase">p.a</span></span></div>
             </div>
          </div>

          <div>
             <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
                <span>₹{formatInr(repaid)} Repaid</span>
                <span className={cn(pColor.replace('bg-', 'text-'))}>{Math.floor(pct)}% Done</span>
             </div>
             <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all", pColor)} style={{width: `${pct}%`}}></div>
             </div>
          </div>
       </div>

       <div className="border-t border-gray-100 bg-gray-50/50 p-4 flex justify-between items-center">
          <div className="flex flex-col">
             <span className="text-[10px] font-black uppercase text-gray-400">Est. Payoff</span>
             <span className="text-xs font-bold text-gray-900">{pDate.toLocaleString('default',{month:'short', year:'numeric'})}</span>
          </div>
          <button onClick={toggle} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center hover:bg-indigo-100 transition">
             {expanded ? 'Hide Amortization' : 'Amortization Table'} {expanded ? <ChevronUp className="w-3 h-3 ml-1"/> : <ChevronDown className="w-3 h-3 ml-1"/>}
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

   // Prepayment state calc
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
      <div className="border-t border-indigo-100 bg-white p-4 animate-in slide-in-from-top-2">
         <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-4 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900">Prepayment Simulator: +₹</span>
            <input type="number" value={extra} onChange={e=>setExtra(e.target.value)} placeholder="0" className="w-24 text-right ml-2 px-2 py-1 text-sm font-black border border-indigo-200 rounded outline-none focus:border-indigo-500" />
         </div>
         <table className="w-full text-left text-xs">
            <thead>
               <tr className="text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-black">Mo</th>
                  <th className="pb-2 font-black">Principal</th>
                  <th className="pb-2 font-black">Interest</th>
                  <th className="pb-2 font-black text-right">Balance</th>
               </tr>
            </thead>
            <tbody>
               {rows.map(r => (
                  <tr key={r.m} className="border-b border-gray-50 text-gray-700 font-medium">
                     <td className="py-2">{r.m}</td>
                     <td className="py-2 text-indigo-600">₹{formatInr(r.pComp)}</td>
                     <td className="py-2 text-rose-500">₹{formatInr(r.iComp)}</td>
                     <td className="py-2 text-right font-black">₹{formatInr(r.cb)}</td>
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
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
       <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50"><h3 className="text-xl font-black">{initial?'Edit Loan':'Add Loan'}</h3></div>
          <div className="p-6 overflow-y-auto space-y-4">
             <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Loan Name / Lender</label><input required value={fd.lender_name} onChange={e=>setFd({...fd, lender_name:e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" /></div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Principal (₹)</label><input type="number" required value={fd.principal} onChange={e=>setFd({...fd, principal:e.target.value})} onBlur={calcEmi} className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold text-indigo-600" /></div>
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Outstanding (₹)</label><input type="number" value={fd.outstanding} onChange={e=>setFd({...fd, outstanding:e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" /></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Rate (% p.a)</label><input type="number" step="0.1" required value={fd.interest_rate} onChange={e=>setFd({...fd, interest_rate:e.target.value})} onBlur={calcEmi} className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" /></div>
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Tenure (Mos)</label><input type="number" required value={fd.tenure_months} onChange={e=>setFd({...fd, tenure_months:e.target.value})} onBlur={calcEmi} className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" /></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">EMI (₹/mo)</label><input type="number" required value={fd.emi_amount} onChange={e=>setFd({...fd, emi_amount:e.target.value})} className="w-full border-2 border-indigo-200 bg-indigo-50/50 rounded-xl p-3 font-black text-indigo-700" /></div>
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Start Date</label><input type="date" required value={fd.start_date.split('T')[0]} onChange={e=>setFd({...fd, start_date:e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" /></div>
             </div>
          </div>
          <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
             <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100">Cancel</button>
             <button onClick={()=>onSave(fd)} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md transition-all">Save</button>
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
   
   // Calcs
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
      <div className="space-y-6 animate-in fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
             <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Monthly Burn</span>
             <span className="text-2xl font-black text-gray-900 mt-1">₹{formatInr(moTotal)}<span className="text-sm font-medium text-gray-400">/mo</span></span>
           </div>
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
             <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Yearly Total</span>
             <span className="text-2xl font-black text-gray-700 mt-1">₹{formatInr(yrTotal)}</span>
           </div>
           <div className={cn("bg-white p-5 rounded-2xl shadow-sm border flex flex-col justify-center", due7>0 ? "border-amber-200 bg-amber-50/10 border-l-4 border-l-amber-500" : "border-gray-100")}>
             <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Next 7 Days</span>
             <span className="text-2xl font-black text-amber-600 mt-1">{due7} <span className="text-sm font-medium">BILLS (₹{formatInr(due7Amnt)})</span></span>
           </div>
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center hidden sm:flex">
             <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wide">Most Expensive</span>
             <span className="text-lg font-black text-indigo-600 mt-1 leading-tight">{mostEx ? mostEx.name : '--'}</span>
             <span className="text-xs font-bold text-gray-400">₹{formatInr(mostEx?.amount||0)}</span>
           </div>
        </div>

        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-black text-gray-900">Subscriptions & Recurring</h2>
          <button onClick={onAdd} className="flex items-center px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Add Sub
          </button>
        </div>

        {subs.length === 0 && !isLoading && (
           <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center flex flex-col items-center">
             <Calendar className="w-16 h-16 text-indigo-200 mb-4" />
             <h2 className="text-xl font-bold text-gray-900 mb-1">Track your recurring bills</h2>
             <p className="text-gray-500 font-medium tracking-tight mb-6">Centralize all software, life and utility subscriptions in one place.</p>
             <button onClick={onAdd} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition">+ Create First Set</button>
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
                    const cc = SUB_COLORS[sub.category] || SUB_COLORS['Other'];
                    
                    return (
                       <div key={sub.id} className={cn("p-5 rounded-2xl bg-white border shadow-sm group relative transition", isOver ? "border-rose-400" : isAlert ? "border-amber-400" : "border-gray-100 hover:border-indigo-200")}>
                          <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100">
                            <button onClick={()=>onEdit(sub)} className="p-1 rounded bg-gray-50 text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4"/></button>
                            <button onClick={()=>onDelete(sub.id)} className="p-1 rounded bg-gray-50 text-gray-400 hover:text-rose-600"><Trash2 className="w-4 h-4"/></button>
                          </div>
                          <div className="flex items-center space-x-3 mb-4 pr-10">
                             <div className={cn("w-10 h-10 flex items-center justify-center font-black text-lg rounded-xl", cc)}>{sub.name.charAt(0)}</div>
                             <div>
                                <h4 className="font-extrabold text-gray-900 leading-tight">{sub.name}</h4>
                                <span className={cn("text-[9px] uppercase font-black px-1.5 py-0.5 rounded", cc)}>{sub.category}</span>
                             </div>
                          </div>
                          <div className="flex justify-between items-end border-t border-gray-100 pt-3">
                             <div className="flex flex-col">
                                <span className="text-xl font-black tracking-tight text-gray-800">₹{formatInr(sub.amount)}</span>
                                <span className="text-[10px] uppercase font-bold text-gray-400">{sub.frequency}</span>
                             </div>
                             <div className="flex flex-col text-right">
                                <span className="text-xs font-bold text-gray-500">Next due</span>
                                <span className={cn("font-black", isOver ? "text-rose-600" : isAlert ? "text-amber-600" : "text-gray-800")}>
                                   {d.toLocaleDateString('en-IN', {month:'short', day:'numeric'})}
                                </span>
                             </div>
                          </div>
                          {isAlert && <div className="absolute -top-3 left-4 bg-amber-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-full border-2 border-white shadow-sm flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> Due in {diff}d</div>}
                          {isOver && <div className="absolute -top-3 left-4 bg-rose-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-full border-2 border-white shadow-sm flex items-center">Overdue</div>}
                       </div>
                    )
                 })}
              </div>

              {/* CALENDAR COLUMN */}
              <div className="lg:col-span-1 border border-gray-100 bg-white rounded-2xl shadow-sm p-5 h-fit sticky top-6">
                 <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3 mb-4 flex items-center"><Calendar className="w-4 h-4 mr-2 text-indigo-600"/> 30-Day Outlook</h3>
                 <div className="space-y-4">
                    {sorted.slice(0, 10).map((s, i) => {
                       const d = new Date(s.next_due);
                       const isOver = Math.ceil((d - today)/(86400000)) < 0;
                       return (
                          <div key={i} className="flex items-center justify-between group">
                             <div className="flex items-center space-x-3">
                                <div className={cn("w-10 text-center font-bold text-sm", isOver ? "text-rose-600" : "text-gray-500")}>
                                   {d.toLocaleDateString('en-IN', {month:'short'})}<br/><span className="text-lg leading-none font-black text-gray-900 group-hover:text-indigo-600">{d.getDate()}</span>
                                </div>
                                <div className="h-8 w-px bg-gray-200"></div>
                                <span className="font-bold text-gray-800">{s.name}</span>
                             </div>
                             <span className="font-black text-gray-900">₹{formatInr(s.amount)}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
       <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50"><h3 className="text-xl font-black">{initial?'Edit Sub':'Add Sub'}</h3></div>
          <div className="p-6 space-y-4">
             <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Service Name</label><input required value={fd.name} onChange={e=>setFd({...fd, name:e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" /></div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Amount (₹)</label><input type="number" required value={fd.amount} onChange={e=>setFd({...fd, amount:e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold text-rose-600" /></div>
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Frequency</label><select value={fd.frequency} onChange={e=>setFd({...fd, frequency:e.target.value})} className="w-full border-2 border-gray-100 bg-white rounded-xl p-3 font-bold text-sm"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div>
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Category</label>
               <select value={fd.category} onChange={e=>setFd({...fd, category:e.target.value})} className="w-full border-2 border-gray-100 bg-white rounded-xl p-3 font-bold text-sm">
                 {Object.keys(SUB_CATS).map(c=><option key={c} value={c}>{c}</option>)}
               </select>
             </div>
             <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Next Due Date</label><input type="date" required value={fd.next_due.split('T')[0]} onChange={e=>setFd({...fd, next_due:e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold text-indigo-600" /></div>
          </div>
          <div className="p-5 border-t border-gray-100 flex gap-3"><button onClick={onClose} className="flex-1 py-3 bg-gray-50 border border-gray-200 font-bold rounded-xl hover:bg-gray-100">Cancel</button><button onClick={()=>onSave(fd)} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md">Save</button></div>
       </div>
    </div>
  );
}


// -------------------------------------------------------------
// TAB 3: TAX PLANNER
// -------------------------------------------------------------
function TaxTab({ taxRaw, isLoading, onAdd, onEdit, onDelete }) {
   const [slab, setSlab] = useState(30);
   
   if(isLoading) return <div className="h-64 flex bg-white/50 border border-gray-100 justify-center items-center text-indigo-600 font-bold">Validating IRS matrices...</div>;

   const data = taxRaw?.investments || [];
   const sumData = taxRaw?.summary || { total_invested:0, progress_percentage:0, remaining_80c:150000, total_80c_limit:150000 };

   const saved = sumData.total_invested * (slab/100);
   const potSave = sumData.remaining_80c * (slab/100);

   return (
      <div className="space-y-6 animate-in fade-in">
         {/* HEADER SUMMARY */}
         <div className="p-8 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-3xl shadow-sm text-white relative overflow-hidden">
            <Landmark className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 opacity-10 text-white stroke-[1.5]" />
            <div className="flex justify-between items-start mb-6 border-b border-emerald-400/50 pb-4 relative z-10">
               <div>
                  <h2 className="text-xl font-black">FY {sumData.financial_year} · 80C Limit</h2>
                  <p className="text-emerald-100 font-medium">Maximize your deductions securely.</p>
               </div>
               <span className="text-2xl font-black bg-white/20 px-3 py-1 rounded-xl">₹{formatInr(sumData.total_80c_limit)}</span>
            </div>

            <div className="relative z-10">
               <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-black tracking-tight">₹{formatInr(sumData.total_invested)} <span className="text-base font-normal text-emerald-100">invested ({Math.floor(sumData.progress_percentage)}%)</span></span>
                  <span className="text-sm font-bold bg-white text-emerald-700 px-3 py-1 rounded-lg">₹{formatInr(sumData.remaining_80c)} left</span>
               </div>
               <div className="w-full bg-emerald-800/40 rounded-full h-3 overflow-hidden border border-emerald-400/50">
                  <div className="bg-white h-full transition-all duration-1000 shadow-[0_0_10px_white]" style={{width: `${sumData.progress_percentage}%`}}></div>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
               <div className="flex justify-between items-center mb-4 px-1">
                 <h3 className="text-lg font-black text-gray-900">Declared Tax Assets</h3>
                 <button onClick={()=>onAdd(null)} className="flex items-center px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-1" /> Add
                 </button>
               </div>
               
               {data.length === 0 ? (
                 <div className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl p-8 text-center">
                    <p className="text-gray-500 font-bold">No assets declared. Your taxes are high entirely by choice.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.map(t => (
                       <div key={t.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative group hover:border-emerald-200 transition">
                          <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100">
                             <button onClick={()=>onEdit(t)} className="p-1 mr-1 rounded bg-gray-50 text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4"/></button>
                             <button onClick={()=>onDelete(t.id)} className="p-1 rounded bg-gray-50 text-gray-400 hover:text-rose-600"><Trash2 className="w-4 h-4"/></button>
                          </div>
                          <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mb-2 inline-block">{t.scheme}</span>
                          <h4 className="text-lg font-black text-gray-900 leading-tight pr-10">{t.scheme} Asset</h4>
                          <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col">
                             <span className="text-2xl font-black text-emerald-600 tracking-tight">₹{formatInr(t.amount)}</span>
                             <span className="text-[10px] uppercase font-bold text-gray-400">Invested {t.financial_year}</span>
                          </div>
                       </div>
                    ))}
                 </div>
               )}
            </div>

            {/* LIVE TAX CALCULATOR */}
            <div className="lg:col-span-1 border border-gray-100 bg-white rounded-3xl p-6 shadow-sm border-t-8 border-t-indigo-600 sticky top-6">
               <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center"><Calculator className="w-5 h-5 mr-2 text-indigo-600"/> Tax Saving Simulator</h3>
               <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Calculated Slab</span>
                  <select value={slab} onChange={e=>setSlab(Number(e.target.value))} className="bg-white border border-gray-200 px-3 py-1 font-black text-indigo-600 rounded-lg outline-none cursor-pointer">
                     <option value={5}>5%</option>
                     <option value={20}>20%</option>
                     <option value={30}>30%</option>
                  </select>
               </div>
               
               <div className="space-y-4">
                  <div className="flex justify-between border-b border-gray-50 pb-3">
                     <span className="font-bold text-gray-500">Currently Saved</span>
                     <span className="font-black text-emerald-600 text-lg tracking-tight">₹{formatInr(saved)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-3">
                     <span className="font-bold text-gray-500">Potential Ext.</span>
                     <span className="font-black text-amber-500 text-lg tracking-tight">+₹{formatInr(potSave)}</span>
                  </div>
               </div>

               <div className="mt-8">
                  <p className="text-[10px] uppercase font-black text-gray-400 text-center mb-3">Quick Add 80C Instruments</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                     {['ELSS', 'PPF', 'LIC'].map(p => (
                       <button key={p} onClick={()=>onAdd(p)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-xs font-bold rounded-lg text-gray-600 hover:bg-gray-100 hover:border-gray-300">
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
  // If `initial` is a string (e.g. from quick chips), use it as scheme
  let initialDef = { scheme: 'ELSS', amount:'', financial_year:'2025-26' };
  if(typeof initial === 'string') initialDef.scheme = initial;
  if(typeof initial === 'object' && initial !== null) initialDef = initial;

  const [fd, setFd] = useState(initialDef);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
       <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50"><h3 className="text-xl font-black">{initial?.id?'Edit Investment':'Declare Investment'}</h3></div>
          <div className="p-6 space-y-4">
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Instrument</label>
               <select value={fd.scheme} onChange={e=>setFd({...fd, scheme:e.target.value})} className="w-full border-2 border-gray-100 bg-white rounded-xl p-3 font-bold text-sm">
                 {['ELSS','PPF','LIC','NPS','NSC','EPF','Home Loan Principal','Other'].map(c=><option key={c} value={c}>{c}</option>)}
               </select>
             </div>
             <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Amount Deposited (₹)</label><input type="number" required value={fd.amount} onChange={e=>setFd({...fd, amount:e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold text-emerald-700" /></div>
             <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Financial Year</label><input value={fd.financial_year} disabled className="w-full border-2 border-gray-50 bg-gray-50 text-gray-400 rounded-xl p-3 font-bold" /></div>
          </div>
          <div className="p-5 border-t border-gray-100 flex gap-3"><button onClick={onClose} className="flex-1 py-3 bg-gray-50 border border-gray-200 font-bold rounded-xl hover:bg-gray-100">Cancel</button><button onClick={()=>onSave(fd)} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md">Confirm</button></div>
       </div>
    </div>
  );
}
