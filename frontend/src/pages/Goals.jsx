import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Target, Plus, CheckCircle2, Presentation, Calendar, Repeat, MoreVertical, Edit2, PauseCircle, PlayCircle, Trash2, ShieldAlert, Award, ChevronDown, ChevronUp, Plane, Shield, Laptop, Home, Briefcase, Car, Heart, Smartphone, Gift, Coffee } from 'lucide-react';
import { cn } from '../lib/utils';
import Confetti from 'react-confetti';

const CAT_ICONS = {
  'Travel': Plane, 'Savings': Shield, 'Gadget': Laptop, 'House': Home,
  'Retirement': Briefcase, 'Vehicle': Car, 'Health': Heart, 'Other': Coffee
};

const formatInr = (num) => Number(num || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function Goals() {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState(null); // 'add', 'edit'
  const [activeGoal, setActiveGoal] = useState(null);
  const [contribGoal, setContribGoal] = useState(null); // specific to contribution modal
  const [showConfetti, setShowConfetti] = useState(false);
  const [openMenu, setOpenMenu] = useState(null); // track which drop-menu is open
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data } = await api.get('/goals');
      return data.data;
    }
  });

  const activeGoals = goals.filter(g => g.status !== 'achieved');
  const sumTarget = goals.reduce((acc, g) => acc + Number(g.target_amount), 0);
  const sumSaved = goals.reduce((acc, g) => acc + Number(g.saved_amount), 0);
  const sumSip = activeGoals.reduce((acc, g) => g.status !== 'paused' ? acc + Number(g.monthly_sip) : acc, 0);

  // -- MUTATIONS --
  const mutateGoal = useMutation({
    mutationFn: async ({ id, data, method }) => {
      if(method === 'DELETE') return await api.delete(`/goals/${id}`);
      if(method === 'PUT') return await api.put(`/goals/${id}`, data);
      return await api.post('/goals', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      setModalMode(null);
      setOpenMenu(null);
    }
  });

  // Calculate Nudges dynamically
  const insights = useMemo(() => {
    const messages = [];
    if (sumSip > 0) messages.push(`You're committed to ₹${formatInr(sumSip)}/mo in SIPs — great discipline!`);
    
    // Find closest goal
    const closest = [...activeGoals].sort((a,b) => (Number(b.saved_amount)/Number(b.target_amount)) - (Number(a.saved_amount)/Number(a.target_amount)))[0];
    if (closest) {
      const pct = (Number(closest.saved_amount)/Number(closest.target_amount)*100);
      if (pct > 70) messages.push(`${closest.name} is ${Math.floor(pct)}% complete — just ₹${formatInr(closest.target_amount - closest.saved_amount)} more to go!`);
    }

    // Find delayed goals
    const today = new Date();
    activeGoals.forEach(g => {
       const msLeft = new Date(g.target_date) - today;
       const monthsLeft = Math.max(1, msLeft / (1000*60*60*24*30));
       const requiredSip = (Number(g.target_amount) - Number(g.saved_amount)) / monthsLeft;
       
       if (Number(g.monthly_sip) < requiredSip * 0.8 && g.status !== 'paused') {
          const shortageMonths = Math.ceil(((Number(g.target_amount) - Number(g.saved_amount)) / (Number(g.monthly_sip) || 1)) - monthsLeft);
          if (shortageMonths > 1) messages.push(`At your current savings rate, ${g.name} might be delayed by ~${shortageMonths} month${shortageMonths > 1?'s':''}.`);
       }
    });
    return messages.slice(0, 3);
  }, [activeGoals, sumSip]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} onConfettiComplete={() => setShowConfetti(false)} style={{zIndex: 9999, position: 'fixed'}} />}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Goals</h1>
          <p className="text-xs text-gray-500 mt-1">Track milestones and manage your SIP requirements</p>
        </div>
        <button onClick={() => { setActiveGoal(null); setModalMode('add'); }} className="flex items-center px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 hover:-translate-y-0.5 transition-all w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5 mr-2" />
          Create Goal
        </button>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Total Active Goals</span>
          <span className="text-2xl font-black text-gray-900 mt-1">{activeGoals.length}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center border-l-[3px] border-l-gray-300">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Total Target</span>
          <span className="text-2xl font-black text-gray-900 mt-1">₹{formatInr(sumTarget)}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center border-l-[3px] border-l-emerald-500 relative overflow-hidden">
          <CheckCircle2 className="w-16 h-16 absolute -right-4 top-1/2 -translate-y-1/2 text-emerald-50 opacity-50" />
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Total Saved</span>
          <span className="text-2xl font-black text-gray-900 mt-1">₹{formatInr(sumSaved)}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center border-l-[3px] border-l-indigo-600 relative overflow-hidden">
          <Repeat className="w-16 h-16 absolute -right-3 top-1/2 -translate-y-1/2 text-indigo-50 opacity-40" />
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Monthly SIP Committed</span>
          <span className="text-2xl font-black text-indigo-600 mt-1">₹{formatInr(sumSip)}<span className="text-lg text-indigo-400">/mo</span></span>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-gray-100"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
      ) : goals.length === 0 ? (
        <div className="bg-white p-16 rounded-2xl border border-gray-100 text-center flex flex-col items-center">
           <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6"><Target className="w-10 h-10 text-indigo-300" /></div>
           <h2 className="text-2xl font-bold text-gray-900 mb-2">No financial goals yet</h2>
           <p className="text-gray-500 max-w-sm mb-8">Set a goal — whether it's a trip, emergency fund, or retirement — and we'll help you get there.</p>
           <button onClick={() => { setActiveGoal(null); setModalMode('add'); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition font-bold text-lg">+ Create Your First Goal</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => (
             <GoalCard 
               key={goal.id} 
               goal={goal} 
               onContribute={() => setContribGoal(goal)} 
               menuOpen={openMenu === goal.id}
               setOpenMenu={setOpenMenu}
               menuRef={menuRef}
               onAction={(action) => {
                 if(action === 'edit') { setActiveGoal(goal); setModalMode('edit'); }
                 else if(action === 'delete') mutateGoal.mutate({ id: goal.id, method: 'DELETE' });
                 else mutateGoal.mutate({ id: goal.id, method: 'PUT', data: { status: action === 'pause' ? 'paused' : action === 'achieve' ? 'achieved' : 'active' }});
                 setOpenMenu(null);
               }}
             />
          ))}
        </div>
      )}

      {goals.length > 0 && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
           <div className="lg:col-span-2 space-y-6">
             {/* TIMELINE VIEW */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto min-h-[160px]">
               <h3 className="text-sm font-bold text-gray-900 mb-8 uppercase tracking-wider flex items-center"><Calendar className="w-4 h-4 mr-2" /> Goal Progress Timeline</h3>
               <TimelinePlotter goals={activeGoals} />
             </div>

             {/* NUDGES / INSIGHTS */}
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {insights.map((msg, i) => (
                  <div key={i} className="bg-gradient-to-b from-indigo-50 to-white p-4 border border-indigo-100 rounded-2xl flex items-start shadow-sm">
                    <ShieldAlert className="w-5 h-5 text-indigo-600 mr-3 shrink-0" />
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{msg}</p>
                  </div>
                ))}
             </div>
           </div>

           {/* SIP CALCULATOR WIDGET */}
           <div className="lg:col-span-1">
              <SIPCalculator goals={activeGoals} />
           </div>
         </div>
      )}

      {/* MODALS */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <GoalEditorModal 
           goal={activeGoal} 
           onClose={() => setModalMode(null)} 
           onSave={(data) => {
              mutateGoal.mutate({ id: activeGoal?.id, data, method: activeGoal ? 'PUT' : 'POST' });
           }}
        />
      )}
      
      {contribGoal && (
        <ContributionModal 
           goal={contribGoal} 
           onClose={() => setContribGoal(null)}
           onConfirm={async (amount) => {
             const res = await api.put(`/goals/${contribGoal.id}/contribute`, { amount });
             if (Number(res.data.data.saved_amount) >= Number(res.data.data.target_amount)) setShowConfetti(true);
             queryClient.invalidateQueries(['goals']);
             setContribGoal(null);
           }}
        />
      )}
    </div>
  );
}

// --- GOAL CARD COMPONENT ---
function GoalCard({ goal, onContribute, menuOpen, setOpenMenu, menuRef, onAction }) {
  const Icon = CAT_ICONS[goal.category] || Target;
  const isAchieved = goal.status === 'achieved';
  const isPaused = goal.status === 'paused';
  const target = Number(goal.target_amount);
  const saved = Number(goal.saved_amount);
  const sip = Number(goal.monthly_sip);
  
  let percentage = Math.min(100, Math.max(0, (saved / target) * 100));
  if (isNaN(percentage)) percentage = 0;

  // Ring colors
  let ringColor = '#ef4444'; // red (0-40)
  if (percentage > 40) ringColor = '#f59e0b'; // amber (41-75)
  if (percentage > 75) ringColor = '#3b82f6'; // blue (76-99)
  if (percentage >= 100) ringColor = '#10b981'; // green (100)
  if (isAchieved) ringColor = '#10b981';

  // SVG Math
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Date Math
  const today = new Date();
  const tDate = new Date(goal.target_date);
  const daysLeft = Math.ceil((tDate - today) / (1000 * 60 * 60 * 24));
  let monthsLeft = Math.max(1, daysLeft / 30);
  
  // Projection String
  let projectionStr = '';
  let projectionColor = 'text-gray-500';
  if (!isAchieved) {
    if (isPaused) {
       projectionStr = "Contributions Paused";
       projectionColor = "text-gray-400";
    } else {
       const reqSip = (target - saved) / monthsLeft;
       const monthsToFinish = sip > 0 ? (target - saved) / sip : 999;
       if (sip >= reqSip * 0.95) {
          const dateProj = new Date(today);
          dateProj.setMonth(dateProj.getMonth() + monthsToFinish);
          projectionStr = `On track to finish ${dateProj.toLocaleString('default',{month:'short', year:'numeric'})}`;
          projectionColor = "text-emerald-600";
       } else {
          const shortageMonths = Math.ceil(monthsToFinish - monthsLeft);
          projectionStr = shortageMonths > 100 ? "Goal stagnating" : `Behind pacing by ~${shortageMonths} mo`;
          projectionColor = "text-rose-600";
       }
    }
  }

  return (
    <div className={cn("bg-white p-6 rounded-2xl shadow-sm border relative transition-all group", isAchieved ? "border-emerald-200" : isPaused ? "border-gray-200 opacity-80" : "border-gray-100 hover:shadow-md")}>
      
      {/* Dynamic Status Banner */}
      {isAchieved && <div className="absolute inset-0 bg-emerald-50/60 rounded-2xl pointer-events-none border border-emerald-400 opacity-60"></div>}
      
      {/* 3 Dot Menu */}
      <div className="absolute top-4 right-4 z-10" ref={menuOpen ? menuRef : null}>
         <button onClick={(e) => { e.stopPropagation(); setOpenMenu(menuOpen ? null : goal.id); }} className={cn("p-1 rounded-md text-gray-400 hover:text-gray-800 transition-opacity", menuOpen ? "opacity-100 bg-gray-100" : "opacity-0 group-hover:opacity-100")}>
           <MoreVertical className="w-5 h-5" />
         </button>
         {menuOpen && (
           <div className="absolute right-0 top-8 w-44 bg-white border border-gray-100 shadow-xl rounded-xl py-2 animate-in slide-in-from-top-2">
             <button onClick={()=>onAction('edit')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium flex items-center"><Edit2 className="w-4 h-4 mr-2"/> Edit Goal</button>
             {isPaused ? 
               <button onClick={()=>onAction('active')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium flex items-center"><PlayCircle className="w-4 h-4 mr-2"/> Resume Saving</button>
               : !isAchieved && <button onClick={()=>onAction('pause')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium flex items-center"><PauseCircle className="w-4 h-4 mr-2"/> Pause Goal</button>
             }
             {!isAchieved && <button onClick={()=>onAction('achieve')} className="w-full text-left px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 font-medium flex items-center"><Award className="w-4 h-4 mr-2"/> Mark Achieved</button>}
             <div className="h-px bg-gray-100 my-1"></div>
             <button onClick={()=>onAction('delete')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold flex items-center"><Trash2 className="w-4 h-4 mr-2"/> Delete Goal</button>
           </div>
         )}
      </div>

      {/* TOP ROW */}
      <div className="flex justify-between items-start mb-6 align-top">
         <div className="pr-10">
            <div className="flex items-center space-x-2">
               <div className="bg-gray-100 p-2 rounded-lg text-gray-600 border border-gray-200"><Icon className="w-5 h-5"/></div>
               <span className="text-[10px] uppercase font-black tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{goal.category}</span>
               {isAchieved && <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md flex items-center"><Award className="w-3 h-3 mr-1"/> Achieved!</span>}
               {isPaused && <span className="text-[10px] uppercase font-black tracking-wider text-gray-500 bg-gray-200 px-2 py-1 rounded-md">Paused</span>}
            </div>
            <h3 className="text-xl font-black text-gray-900 mt-3 leading-tight tracking-tight">{goal.name}</h3>
         </div>
      </div>

      {/* MIDDLE ROW (SVG RING) */}
      <div className="flex flex-col items-center justify-center my-6 relative z-10">
         <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Background track */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
               <circle cx="56" cy="56" r={radius} stroke="#f3f4f6" strokeWidth="12" fill="none" />
               <circle cx="56" cy="56" r={radius} stroke={ringColor} strokeWidth="12" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="flex flex-col items-center">
               <span className="text-2xl font-black text-gray-900" style={{color: ringColor}}>{Math.floor(percentage)}%</span>
            </div>
         </div>
         <p className="text-sm font-bold text-gray-800 mt-4 rounded-full bg-gray-100 px-4 py-1.5 shadow-sm border border-black/5">
           ₹{formatInr(saved)} <span className="text-gray-400 font-medium mx-1">of</span> ₹{formatInr(target)}
         </p>
      </div>

      {/* BOTTOM ROW (DETAILS & BUTTON) */}
      <div className="border-t border-gray-100 pt-5 mt-2 flex flex-col gap-3 relative z-10">
         <div className="flex justify-between items-center px-1">
            <div className="flex items-center text-gray-600 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
               <Calendar className="w-4 h-4 mr-2 opacity-50 text-indigo-600" />
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Target Date</span>
                  <span className="text-xs font-black text-gray-900">{tDate.toLocaleString('default',{month:'short', year:'numeric'})}</span>
               </div>
            </div>
            <div className="flex items-center text-gray-600 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
               <Repeat className="w-4 h-4 mr-2 opacity-50 text-indigo-600" />
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Monthly SIP</span>
                  <span className="text-xs font-black text-gray-900">₹{formatInr(sip)}</span>
               </div>
            </div>
         </div>
         <div className="flex justify-between items-end px-1 mt-1">
            <div className="flex flex-col">
               <span className="text-xs font-bold text-gray-800">{daysLeft > 0 ? `${daysLeft} days left` : 'Past due'}</span>
               <span className={cn("text-[11px] font-bold mt-0.5", projectionColor)}>{projectionStr}</span>
            </div>
            {!isAchieved && (
               <button onClick={onContribute} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 hover:shadow-md transition-all">
                 + Add
               </button>
            )}
         </div>
      </div>
    </div>
  );
}

// --- CONTRIBUTION MODAL ---
function ContributionModal({ goal, onClose, onConfirm }) {
  const [val, setVal] = useState(goal.monthly_sip || 5000);
  const presets = [1000, 5000, 10000, 25000];
  const isFinishLine = Number(goal.saved_amount) + Number(val) >= Number(goal.target_amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
       <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
          {/* Decorative fade */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-1">Add Contribution</h3>
          <p className="text-sm font-medium text-gray-500 mb-6 flex flex-col gap-1">
            <span>Funding <b>{goal.name}</b></span>
            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 w-fit rounded-md text-xs border border-indigo-100">Target: ₹{formatInr(goal.target_amount)}</span>
          </p>
          
          <div className="flex flex-wrap gap-2 mb-6">
             {presets.map(p => (
                <button key={p} onClick={()=>setVal(p)} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all border", val === p ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100")}>
                  ₹{formatInr(p)}
                </button>
             ))}
          </div>

          <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Custom Amount (₹)</label>
          <input type="number" min="1" value={val} onChange={e=>setVal(e.target.value)} className="w-full text-2xl font-black border border-gray-200 rounded-xl p-4 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-gray-900 mb-6 transition-all" />

          {isFinishLine && <div className="mb-4 bg-emerald-50 text-emerald-800 p-3 rounded-lg text-sm font-bold border border-emerald-200 flex items-center shadow-sm"><Award className="w-4 h-4 mr-2"/> This accomplishes your goal!</div>}

          <div className="flex gap-3">
             <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50">Cancel</button>
             <button onClick={()=>onConfirm(val)} disabled={!val || Number(val)<=0} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50">Confirm</button>
          </div>
       </div>
    </div>
  );
}

// --- EDITOR MODAL ---
function GoalEditorModal({ goal, onClose, onSave }) {
  const [fd, setFd] = useState({
     name: goal?.name || '', category: goal?.category || 'Travel',
     target_amount: goal?.target_amount || '', saved_amount: goal?.saved_amount || 0,
     target_date: goal ? goal.target_date.split('T')[0] : '', monthly_sip: goal?.monthly_sip || ''
  });

  const calcPMT = () => {
    if(!fd.target_amount || !fd.target_date) return;
    const msLeft = new Date(fd.target_date) - new Date();
    const mLeft = Math.max(1, Math.ceil(msLeft / (1000*60*60*24*30)));
    const req = (Number(fd.target_amount) - Number(fd.saved_amount||0)) / mLeft;
    setFd({...fd, monthly_sip: Math.ceil(Math.max(0, req))});
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
       <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
             <h3 className="text-xl font-black text-gray-900">{goal ? 'Edit Goal' : 'Create New Goal'}</h3>
          </div>
          <div className="p-6 overflow-y-auto space-y-5">
             <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Goal Name*</label><input required value={fd.name} onChange={e=>setFd({...fd, name:e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-indigo-500 font-bold" placeholder="Europe Trip" /></div>
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Category*</label>
               <select value={fd.category} onChange={e=>setFd({...fd, category:e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-indigo-500 font-bold bg-white">
                 {Object.keys(CAT_ICONS).map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Target Amount (₹)*</label><input type="number" onBlur={calcPMT} required value={fd.target_amount} onChange={e=>setFd({...fd, target_amount:e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-indigo-500 font-black text-indigo-600" /></div>
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Already Saved (₹)</label><input type="number" onBlur={calcPMT} disabled={!!goal} value={fd.saved_amount} onChange={e=>setFd({...fd, saved_amount:e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold disabled:bg-gray-100 disabled:text-gray-400" /></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Target Date*</label><input type="date" onBlur={calcPMT} required value={fd.target_date} onChange={e=>setFd({...fd, target_date:e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-indigo-500 font-bold" /></div>
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Monthly SIP (₹)</label><input type="number" value={fd.monthly_sip} onChange={e=>setFd({...fd, monthly_sip:e.target.value})} className="w-full border-2 border-indigo-100 focus:border-indigo-500 bg-indigo-50/30 rounded-xl p-3 outline-none font-black text-indigo-700" /></div>
             </div>
          </div>
          <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
             <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100">Cancel</button>
             <button onClick={()=>onSave(fd)} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all">Save Goal</button>
          </div>
       </div>
    </div>
  );
}

// --- SIP CALCULATOR ENHANCED ---
function SIPCalculator({ goals }) {
  const [tgt, setTgt] = useState(5000000);
  const [yrs, setYrs] = useState(10);
  const [rate, setRate] = useState(12);

  const handleLink = (e) => {
    const id = e.target.value;
    if(!id) return;
    const g = goals.find(x => x.id === parseInt(id));
    if(g) {
      setTgt(Number(g.target_amount));
      const mLeft = Math.max(1, (new Date(g.target_date) - new Date()) / (1000*60*60*24*30));
      setYrs(Math.max(1, Math.ceil(mLeft/12)));
    }
  };

  const r = (rate / 100) / 12;
  const n = yrs * 12;
  const sip = r===0 ? tgt/n : tgt / (((Math.pow(1+r, n) - 1) / r) * (1+r));
  
  const invested = sip * n;
  const returns = tgt - invested;

  return (
    <div className="border border-gray-200 shadow-xl rounded-3xl bg-white overflow-hidden flex flex-col h-full sticky top-6">
       <div className="p-6 bg-gradient-to-br from-indigo-900 to-indigo-700 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <h3 className="text-xl font-black flex items-center tracking-tight"><Presentation className="w-6 h-6 mr-2 opacity-80" /> SIP Projection Engine</h3>
          <p className="text-indigo-200 text-sm mt-1.5 font-medium leading-relaxed">Calculate exact compound trajectories.</p>
       </div>
       <div className="p-6 space-y-7 flex-1 flex flex-col">
          {goals.length > 0 && (
             <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-2">
                <label className="text-[10px] font-black uppercase text-gray-500 mb-1 block">Quick Link to Goal Target</label>
                <select onChange={handleLink} defaultValue="" className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-700 outline-none focus:border-indigo-500">
                   <option value="" disabled>Select a goal...</option>
                   {goals.map(g => <option key={g.id} value={g.id}>{g.name} (₹{formatInr(g.target_amount)})</option>)}
                </select>
             </div>
          )}
          <div>
            <label className="flex justify-between text-xs font-black uppercase text-gray-500 mb-2"><span>Target Corpus</span><span className="text-indigo-600">₹{formatInr(tgt)}</span></label>
            <input type="range" min="10000" max="100000000" step="10000" value={tgt} onChange={e=>setTgt(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
          </div>
          <div>
            <label className="flex justify-between text-xs font-black uppercase text-gray-500 mb-2"><span>Time Horizon</span><span className="text-indigo-600">{yrs} Years</span></label>
            <input type="range" min="1" max="30" step="1" value={yrs} onChange={e=>setYrs(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
          </div>
          <div>
            <label className="flex justify-between text-xs font-black uppercase text-gray-500 mb-2"><span>Expected Return</span><span className="text-indigo-600">{rate}% p.a.</span></label>
            <input type="range" min="4" max="30" step="1" value={rate} onChange={e=>setRate(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
          </div>
          
          <div className="mt-auto border border-indigo-100 bg-indigo-50/50 rounded-2xl p-5 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5"><Target className="w-24 h-24 text-indigo-900" /></div>
             <p className="text-xs font-black uppercase text-indigo-800/60 mb-1">Required SIP Amount</p>
             <p className="text-4xl font-black text-indigo-700 flex items-end tracking-tighter">₹{formatInr(Math.ceil(sip))}<span className="text-lg text-indigo-400 font-bold ml-1 mb-1 leading-none">/mo</span></p>
             
             <div className="mt-6 pt-4 border-t border-indigo-200/50 space-y-3">
               <div className="w-full h-3 bg-indigo-100 rounded-full overflow-hidden flex">
                 <div className="bg-indigo-400 h-full transition-all" style={{width:`${(invested/tgt)*100}%`}}></div>
                 <div className="bg-emerald-400 h-full transition-all" style={{width:`${(returns/tgt)*100}%`}}></div>
               </div>
               <div className="flex justify-between text-xs font-black mt-2">
                 <div className="flex items-center text-indigo-700"><div className="w-2 h-2 rounded-full bg-indigo-400 mr-2"></div> Invested: ₹{formatInr(invested)}</div>
                 <div className="flex items-center text-emerald-700"><div className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></div> Returns: ₹{formatInr(returns)}</div>
               </div>
             </div>
          </div>
       </div>
    </div>
  );
}

// --- TIMELINE PLOTTER ---
function TimelinePlotter({ goals }) {
   if(!goals.length) return null;
   const sorted = [...goals].sort((a,b) => new Date(a.target_date)-new Date(b.target_date));
   const firstDate = new Date();
   const lastDate = new Date(sorted[sorted.length-1].target_date);
   const totalSpan = Math.max(1, lastDate - firstDate);

   return (
     <div className="relative w-full h-20 pt-10 pb-4 px-4 overflow-hidden -mt-4">
        {/* The Track */}
        <div className="absolute top-10 left-4 right-4 h-1.5 bg-gray-200 rounded-full"></div>
        {/* Today Marker */}
        <div className="absolute top-8 left-4 flex flex-col items-center group z-10">
           <div className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 rounded border border-indigo-200 mb-1 whitespace-nowrap">Today</div>
           <div className="w-2 h-4 bg-indigo-500 rounded-sm shadow-sm z-10"></div>
        </div>
        {/* Goal Markers */}
        {sorted.map(g => {
           const d = new Date(g.target_date);
           let pct = ((d - firstDate) / totalSpan) * 100;
           pct = Math.min(99, Math.max(5, pct)); // bound mapping tightly
           
           const isOnTrack = (Number(g.monthly_sip) * Math.max(1,(d-firstDate)/(1000*60*60*24*30))) >= (Number(g.target_amount) - Number(g.saved_amount))*0.9;
           
           return (
             <div key={g.id} className="absolute top-8 flex flex-col items-center group transform -translate-x-1/2 cursor-pointer z-10" style={{ left: `calc(1rem + ${pct} * (100% - 2rem) / 100)` }}>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 text-center pointer-events-none">
                   <div className="text-[10px] font-black text-gray-800 bg-white px-2 py-1 rounded-md shadow-lg border border-gray-100 whitespace-nowrap">
                     {g.name}
                     <div className="text-gray-400 font-bold">{d.toLocaleString('default',{month:'short',year:'2-digit'})}</div>
                   </div>
                </div>
                <div className={cn("w-3 h-3 rounded-full border-2 border-white shadow-md z-10 transition-transform group-hover:scale-125", isOnTrack ? "bg-emerald-500" : "bg-rose-500")}></div>
             </div>
           );
        })}
     </div>
   );
}
