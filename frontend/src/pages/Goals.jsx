import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Target, Plus, ShieldAlert, Award, Plane, Shield, Laptop, Home, Briefcase, Car, Heart, Coffee, PlayCircle, PauseCircle, Edit2, Trash2, MoreVertical, Terminal, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import Confetti from 'react-confetti';

const CAT_ICONS = {
  'Travel': Plane, 'Savings': Shield, 'Gadget': Laptop, 'House': Home,
  'Retirement': Briefcase, 'Vehicle': Car, 'Health': Heart, 'Other': Coffee
};

const formatInr = (num) => Number(num || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// Simple glitch effect text component
function GlitchText({ text, glowColor }) {
  return (
    <span className="glitch-text font-mono font-black" data-text={text} style={{textShadow: `0 0 10px ${glowColor}`}}>
       {text}
    </span>
  );
}

// Typewriter terminal component
function TypewriterText({ text, active, colorClass, icon: Icon }) {
  const [disp, setDisp] = useState('');
  useEffect(() => {
    if(!active) return;
    setDisp('');
    let i = 0;
    const t = setInterval(() => {
      setDisp(text.slice(0, i+1));
      i++;
      if (i > text.length) clearInterval(t);
    }, 20); // FAST type
    return () => clearInterval(t);
  }, [text, active]);

  return (
    <div className="relative group overflow-hidden bg-[#050505]/80 border border-[#222]/50 p-4 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md">
       <div className="absolute inset-0 pointer-events-none crt-overlay opacity-50"></div>
       <div className={cn("flex items-start text-sm font-mono tracking-widest relative z-10", colorClass)}>
          <span className="mr-3 mt-0.5"><Icon className="w-4 h-4 shadow-sm" /></span>
          <span className="leading-relaxed">{disp}<span className="animate-pulse">_</span></span>
       </div>
    </div>
  );
}

export default function Goals() {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState(null);
  const [activeGoal, setActiveGoal] = useState(null);
  const [contribGoal, setContribGoal] = useState(null); 
  const [showConfetti, setShowConfetti] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => { const { data } = await api.get('/goals'); return data.data; }
  });

  const activeGoals = goals.filter(g => g.status !== 'achieved');
  const sumTarget = goals.reduce((acc, g) => acc + Number(g.target_amount), 0);
  const sumSaved = goals.reduce((acc, g) => acc + Number(g.saved_amount), 0);
  const sumSip = activeGoals.reduce((acc, g) => g.status !== 'paused' ? acc + Number(g.monthly_sip) : acc, 0);

  const mutateGoal = useMutation({
    mutationFn: async ({ id, data, method }) => {
      if(method === 'DELETE') return await api.delete(`/goals/${id}`);
      if(method === 'PUT') return await api.put(`/goals/${id}`, data);
      return await api.post('/goals', data);
    },
    onSuccess: () => { queryClient.invalidateQueries(['goals']); setModalMode(null); setOpenMenu(null); }
  });

  const insights = useMemo(() => {
    const list = [];
    if (sumSip > 0) list.push({ text: `SIPs — great discipline! Active commit: ₹${formatInr(sumSip)}/mo`, type: 'nominal' });
    
    // Find closest
    const closest = [...activeGoals].sort((a,b) => (Number(b.saved_amount)/Number(b.target_amount)) - (Number(a.saved_amount)/Number(a.target_amount)))[0];
    if (closest) {
      const pct = (Number(closest.saved_amount)/Number(closest.target_amount)*100);
      if (pct > 70) list.push({ text: `${closest.name} is ${Math.floor(pct)}% funded. System Nominal.`, type: 'nominal' });
    }

    // Find delayed
    const today = new Date();
    activeGoals.forEach(g => {
       const msLeft = new Date(g.target_date) - today;
       const monthsLeft = Math.max(1, msLeft / (1000*60*60*24*30));
       const requiredSip = (Number(g.target_amount) - Number(g.saved_amount)) / monthsLeft;
       
       if (Number(g.monthly_sip) < requiredSip * 0.8 && g.status !== 'paused') {
          const shortageMonths = Math.ceil(((Number(g.target_amount) - Number(g.saved_amount)) / (Number(g.monthly_sip) || 1)) - monthsLeft);
          if (shortageMonths > 1 && list.length < 3) list.push({ text: `${g.name} might be delayed by ~${shortageMonths} mo. Adjust vectors.`, type: 'danger' });
       }
    });
    return list.slice(0, 3);
  }, [activeGoals, sumSip]);

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative bg-transparent text-[#E0E0E0] min-h-[90vh]">
      <div className="fixed inset-0 pointer-events-none bg-mesh-grid z-[-1] opacity-50 mix-blend-screen"></div>

      {showConfetti && <Confetti recycle={false} numberOfPieces={500} onConfettiComplete={() => setShowConfetti(false)} style={{zIndex: 9999, position: 'fixed'}} />}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b border-[#222] pb-6">
        <div className="relative group overflow-hidden">
          <div className="absolute inset-0 bg-[#00E5FF]/10 w-0 group-hover:w-full transition-all duration-1000 ease-in-out pointer-events-none"></div>
          <h1 className="text-3xl font-bebas tracking-[5px] text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]">Financial Goals</h1>
          <p className="text-xs font-mono tracking-widest text-[#B0A0A0] mt-1.5 uppercase">Network Milestones and Sub-System allocations</p>
        </div>
        <button onClick={() => { setActiveGoal(null); setModalMode('add'); }} className="group flex items-center px-6 py-2.5 bg-[#0a0a0a] border border-[#00E5FF]/40 text-[#00E5FF] font-mono font-bold tracking-widest rounded-none shadow-[inset_0_0_10px_rgba(0,229,255,0.1),0_0_10px_rgba(0,229,255,0.1)] hover:bg-[#00E5FF]/10 hover:border-[#00E5FF] transition-all w-full sm:w-auto justify-center relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#00E5FF] scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
          <Plus className="w-4 h-4 mr-3 group-hover:rotate-90 transition-transform duration-500" />
          INITIALIZE_GOAL
        </button>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0a0a0a]/60 backdrop-blur-xl p-5 border border-[#222] flex flex-col justify-center relative group overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00E5FF]/50 group-hover:bg-[#00E5FF] transition-colors shadow-[0_0_10px_#00E5FF]"></div>
          <span className="text-[#888] text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1">Active Goals</span>
          <span className="text-3xl font-mono font-black text-[#00E5FF]">{mounted ? activeGoals.length : 0}</span>
        </div>
        <div className="bg-[#0a0a0a]/60 backdrop-blur-xl p-5 border border-[#222] flex flex-col justify-center relative group overflow-hidden">
           <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00E5FF]/30 group-hover:bg-[#00E5FF] transition-colors"></div>
          <span className="text-[#888] text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1">Total Target</span>
          <span className="text-3xl font-mono font-black text-[#E0E0E0]">₹<GlitchText text={formatInr(sumTarget)} glowColor="transparent" /></span>
        </div>
        <div className="bg-[#0a0a0a]/60 backdrop-blur-xl p-5 border border-[#222] flex flex-col justify-center relative group overflow-hidden">
           <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ADFF2F]/50 group-hover:bg-[#ADFF2F] transition-colors shadow-[0_0_10px_#ADFF2F]"></div>
          <span className="text-[#888] text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1">Total Funded</span>
          <span className="text-3xl font-mono font-black text-[#ADFF2F]">₹<GlitchText text={formatInr(sumSaved)} glowColor="transparent" /></span>
        </div>
        <div className="bg-[#0a0a0a]/60 backdrop-blur-xl p-5 border border-[#222] flex flex-col justify-center relative group overflow-hidden">
           <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ADFF2F]/50 group-hover:bg-[#ADFF2F] transition-colors shadow-[0_0_10px_#ADFF2F]"></div>
          <span className="text-[#888] text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1 text-[#ADFF2F]/80">SIP Uplink</span>
          <div className="flex font-mono items-end gap-1">
             <span className="text-3xl font-black text-[#ADFF2F]">₹<GlitchText text={formatInr(sumSip)} glowColor="#ADFF2F" /></span>
             <span className="text-[10px] text-[#ADFF2F]/60 tracking-widest mb-1.5 uppercase">/ mo</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-transparent"><div className="w-10 h-10 border-4 border-[#222] border-t-[#00E5FF] rounded-full animate-spin"></div></div>
      ) : goals.length === 0 ? (
        <div className="bg-[#0a0a0a]/60 backdrop-blur-xl p-16 border border-[#222] text-center flex flex-col items-center">
           <Target className="w-16 h-16 text-[#00E5FF]/40 mb-6 drop-shadow-[0_0_15px_#00E5FF]" />
           <h2 className="text-2xl font-mono font-bold text-[#F5F5F5] mb-2 uppercase tracking-widest">No Node Dependencies Found</h2>
           <p className="text-[#B0A0A0] max-w-sm mb-8 font-mono text-xs leading-loose">Install core goal parameters array to initialize holographic monitoring sequences.</p>
           <button onClick={() => { setActiveGoal(null); setModalMode('add'); }} className="px-6 py-3 bg-[#0a0a0a] border border-[#00E5FF] text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)] font-mono font-bold text-xs uppercase tracking-widest hover:bg-[#00E5FF] hover:text-[#000] transition-colors">INITIALIZE</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
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
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
           <div className="lg:col-span-2 flex flex-col justify-end space-y-4">
              <h3 className="font-mono text-[10px] text-[#00E5FF] tracking-[0.3em] uppercase opacity-70 flex items-center gap-2 mb-2"><Terminal className="w-3 h-3" /> System Log Terminal</h3>
              {insights.map((msg, i) => (
                 <TypewriterText 
                   key={i} 
                   text={msg.text} 
                   active={mounted} 
                   colorClass={msg.type === 'danger' ? 'text-[#FF4444]' : 'text-[#ADFF2F]'} 
                   icon={msg.type === 'danger' ? AlertTriangle : CheckCircle2}
                 />
              ))}
           </div>

           {/* SIP CALCULATOR WIDGET */}
           <div className="lg:col-span-1">
              <SIPHUD goals={activeGoals} />
           </div>
         </div>
      )}

      {/* MODALS */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <GoalEditorModal goal={activeGoal} onClose={() => setModalMode(null)} onSave={(data) => mutateGoal.mutate({ id: activeGoal?.id, data, method: activeGoal ? 'PUT' : 'POST' })} />
      )}
      
      {contribGoal && (
        <ContributionModal goal={contribGoal} onClose={() => setContribGoal(null)} onConfirm={async (amount) => {
             const res = await api.put(`/goals/${contribGoal.id}/contribute`, { amount });
             if (Number(res.data.data.saved_amount) >= Number(res.data.data.target_amount)) setShowConfetti(true);
             queryClient.invalidateQueries(['goals']);
             setContribGoal(null);
        }} />
      )}
    </div>
  );
}

// --- HOLOGRAPHIC GOAL CARD ---
function GoalCard({ goal, onContribute, menuOpen, setOpenMenu, menuRef, onAction }) {
  const Icon = CAT_ICONS[goal.category] || Target;
  const isAchieved = goal.status === 'achieved';
  const isPaused = goal.status === 'paused';
  const target = Number(goal.target_amount);
  const saved = Number(goal.saved_amount);
  const sip = Number(goal.monthly_sip);
  
  let fundPct = Math.min(100, Math.max(0, (saved / target) * 100));
  if (isNaN(fundPct)) fundPct = 0;

  const today = new Date();
  const tDate = new Date(goal.target_date);
  const CREATED_FICT = new Date(today); // fictional creation date for time inner ring
  CREATED_FICT.setFullYear(today.getFullYear()-1);
  if(goal.createdAt) CREATED_FICT.setTime(new Date(goal.createdAt).getTime());
  
  const totalDays = Math.max(1, (tDate - CREATED_FICT) / (1000*60*60*24));
  const daysPassed = Math.max(0, (today - CREATED_FICT) / (1000*60*60*24));
  let timePct = Math.min(100, (daysPassed / totalDays) * 100);
  
  const daysLeft = Math.ceil((tDate - today) / (1000 * 60 * 60 * 24));
  let monthsLeft = Math.max(1, daysLeft / 30);
  
  let projectionStr = '';
  let ringColor = '#00E5FF'; // Nominal Cyan
  let timeColor = '#00E5FF44'; // Dimmer for internal
  let statusTx = 'text-[#00E5FF]';
  
  if (isAchieved) {
     ringColor = '#ADFF2F'; timeColor = '#ADFF2F44'; statusTx = 'text-[#ADFF2F]';
  } else if (isPaused) {
     ringColor = '#555'; timeColor = '#333'; statusTx = 'text-[#888]';
     projectionStr = "PAUSED";
  } else {
     const reqSip = (target - saved) / monthsLeft;
     const monthsToFinish = sip > 0 ? (target - saved) / sip : 999;
     if (sip >= reqSip * 0.95) {
        const d2 = new Date(today); d2.setMonth(d2.getMonth() + monthsToFinish);
        projectionStr = `NOMINAL: ETA ${d2.toLocaleString('default',{month:'short', year:'2-digit'})}`;
     } else {
        const short = Math.ceil(monthsToFinish - monthsLeft);
        projectionStr = short > 100 ? "WARNING: STALLED" : `DANGER: BEHIND ${short}MO`;
        ringColor = '#FF4444'; timeColor = '#FF444455'; statusTx = 'text-[#FF4444]';
     }
  }

  // SVG Concentric Rings Setup
  const outerR = 45; const innerR = 30;
  const outerCirc = 2 * Math.PI * outerR;
  const innerCirc = 2 * Math.PI * innerR;
  const outerDash = outerCirc - (fundPct / 100) * outerCirc;
  const innerDash = innerCirc - (timePct / 100) * innerCirc;

  return (
    <div className={cn("bg-[#0a0a0a]/80 backdrop-blur-md p-6 border relative transition-all group overflow-hidden", isAchieved ? "border-[#ADFF2F]/30" : isPaused ? "border-[#222]" : "border-[#222] hover:border-[#00E5FF]/40 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(0,229,255,0.1)]")}>
       
       <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '12px 12px'}}></div>
      
      {/* 3 Dot Menu */}
      <div className="absolute top-4 right-4 z-20" ref={menuOpen ? menuRef : null}>
         <button onClick={(e) => { e.stopPropagation(); setOpenMenu(menuOpen ? null : goal.id); }} className="p-1 text-[#888] hover:text-[#E0E0E0] outline-none">
           <MoreVertical className="w-4 h-4" />
         </button>
         {menuOpen && (
           <div className="absolute right-0 top-6 w-36 bg-[#050505] border border-[#222] shadow-[0_0_15px_#000] py-1 font-mono text-[10px] uppercase tracking-widest z-50">
             <button onClick={()=>onAction('edit')} className="w-full text-left px-3 py-2 text-[#E0E0E0] hover:bg-[#111] hover:text-[#00E5FF]"><Edit2 className="w-3 h-3 inline mr-2"/> EDIT</button>
             {isPaused ? 
               <button onClick={()=>onAction('active')} className="w-full text-left px-3 py-2 text-[#E0E0E0] hover:bg-[#111] hover:text-[#00E5FF]"><PlayCircle className="w-3 h-3 inline mr-2"/> RESUME</button>
               : !isAchieved && <button onClick={()=>onAction('pause')} className="w-full text-left px-3 py-2 text-[#E0E0E0] hover:bg-[#111] hover:text-[#FFB300]"><PauseCircle className="w-3 h-3 inline mr-2"/> PAUSE</button>
             }
             {!isAchieved && <button onClick={()=>onAction('achieve')} className="w-full text-left px-3 py-2 text-[#ADFF2F] hover:bg-[#111]"><Award className="w-3 h-3 inline mr-2"/> ACHIEVE</button>}
             <button onClick={()=>onAction('delete')} className="w-full text-left px-3 py-2 text-[#FF4444] hover:bg-[#111] mt-1 border-t border-[#222]"><Trash2 className="w-3 h-3 inline mr-2"/> DELETE</button>
           </div>
         )}
      </div>

      {/* TOP ROW */}
      <div className="flex justify-between items-start mb-6 relative z-10">
         <div className="pr-10">
            <div className="flex items-center space-x-3">
               <div className="text-[#888]"><Icon className="w-4 h-4"/></div>
               <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-[#666] border border-[#333] px-2 py-0.5">{goal.category}</span>
            </div>
            <h3 className="text-xl font-sans tracking-wide text-[#E0E0E0] mt-3 font-medium truncate w-[200px]">{goal.name}</h3>
         </div>
      </div>

      {/* HOLOGRAPHIC GAUGE */}
      <div className="flex flex-col items-center justify-center my-8 relative z-10">
         <div className="relative w-32 h-32 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90 filter drop-shadow-[0_0_5px_currentColor]" style={{color: ringColor}}>
               {/* Grid / Target ticks */}
               {[...Array(12)].map((_, i) => <line key={i} x1="64" y1="15" x2="64" y2="17" transform={`rotate(${i*30} 64 64)`} stroke="#444" strokeWidth="1" />)}
               {/* Inner Time Ring */}
               <circle cx="64" cy="64" r={innerR} stroke="#111" strokeWidth="4" fill="none" />
               <circle cx="64" cy="64" r={innerR} stroke={timeColor} strokeWidth="4" fill="none" strokeDasharray={innerCirc} strokeDashoffset={innerDash} strokeLinecap="square" className="transition-all duration-1000" />
               {/* Outer Funding Ring */}
               <circle cx="64" cy="64" r={outerR} stroke="#111" strokeWidth="2" fill="none" />
               <circle cx="64" cy="64" r={outerR} stroke={ringColor} strokeWidth="6" fill="none" strokeDasharray={outerCirc} strokeDashoffset={outerDash} strokeLinecap="butt" className="transition-all duration-1000" />
            </svg>
            <div className="flex flex-col items-center">
               <span className="text-xl font-mono font-black" style={{color: ringColor, textShadow: `0 0 10px ${ringColor}88`}}>{Math.floor(fundPct)}%</span>
            </div>
         </div>
      </div>

      {/* PARAMETERS */}
      <div className="border-t border-[#222] pt-4 flex flex-col gap-3 relative z-10">
         <div className="flex justify-between items-center text-xs font-mono">
            <div className="flex flex-col">
               <span className="text-[9px] text-[#888] tracking-widest uppercase">Target</span>
               <span className="text-[#00E5FF]">₹{formatInr(target)}</span>
            </div>
            <div className="flex flex-col text-right">
               <span className="text-[9px] text-[#888] tracking-widest uppercase">Funded</span>
               <span className={cn(statusTx)}>₹{formatInr(saved)}</span>
            </div>
         </div>
         <div className="flex justify-between items-center text-xs font-mono">
            <div className="flex flex-col">
               <span className="text-[9px] text-[#888] tracking-widest uppercase">Terminal Date</span>
               <span className="text-[#E0E0E0]">{tDate.toLocaleString('default',{month:'short', year:'numeric'})}</span>
            </div>
            <div className="flex flex-col text-right">
               <span className="text-[9px] text-[#888] tracking-widest uppercase">Monthly Uplink</span>
               <span className="text-[#E0E0E0]">₹{formatInr(sip)}</span>
            </div>
         </div>
         
         <div className="flex justify-between items-end mt-2 pt-2 border-t border-[#222] border-dashed">
            <div className="flex flex-col">
               <span className={cn("text-[9px] font-mono tracking-widest uppercase", statusTx)}>{projectionStr}</span>
               <span className="text-[10px] font-mono text-[#666] uppercase mt-0.5">{daysLeft > 0 ? `D-${daysLeft} Days` : 'EXPIRED'}</span>
            </div>
            {!isAchieved && (
               <button onClick={onContribute} className="px-3 py-1 bg-[#111] border border-[#333] text-[#E0E0E0] font-mono hover:text-[#00E5FF] hover:border-[#00E5FF] text-[10px] tracking-widest transition-all">
                 +UPLINK
               </button>
            )}
         </div>
      </div>
    </div>
  );
}

// --- SIP HUD ENGINE ---
function SIPHUD({ goals }) {
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
    <div className="border border-[#222] shadow-[0_0_30px_rgba(0,0,0,0.8)] bg-[#050505]/95 flex flex-col h-full sticky top-6 overflow-hidden backdrop-blur-xl">
       {/* HUD Header */}
       <div className="p-5 border-b border-[#222] relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,rgba(0,229,255,0.05),transparent)]">
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)'}}></div>
          <h3 className="text-lg font-bebas tracking-[4px] text-[#00E5FF] flex items-center shadow-[0_0_10px_rgba(0,229,255,0)] group">
             <Activity className="w-5 h-5 mr-3 opacity-80 group-hover:animate-spin text-[#ADFF2F]" /> FLIGHT COMPUTER
          </h3>
          <p className="text-[#888] font-mono text-[9px] tracking-widest mt-1 uppercase">SIP Projection Trajectory Engine</p>
       </div>

       <div className="p-6 flex-1 flex flex-col space-y-6">
          {goals.length > 0 && (
             <div className="bg-[#111] p-3 border border-[#222] mb-2 relative group focus-within:border-[#00E5FF]/40 transition-colors">
                <label className="text-[9px] font-mono uppercase text-[#00E5FF] mb-2 block tracking-widest">Connect Data Stream</label>
                <select onChange={handleLink} defaultValue="" className="w-full bg-[#0a0a0a] border border-[#333] p-1.5 text-[11px] font-mono text-[#E0E0E0] outline-none">
                   <option value="" disabled>-- SELECT NODE --</option>
                   {goals.map(g => <option key={g.id} value={g.id}>{g.name} (TGT: {formatInr(g.target_amount)})</option>)}
                </select>
             </div>
          )}

          {/* HUD Levers */}
          <div className="space-y-6">
             {[{lbl:'CORPUS TGT', v:tgt, min:10000, max:100000000, step:10000, sx:'₹'+formatInr(tgt), set:setTgt, col:'accent-[#00E5FF]'},
               {lbl:'TIME_HRZ', v:yrs, min:1, max:30, step:1, sx:yrs+' YRS', set:setYrs, col:'accent-[#ADFF2F]'},
               {lbl:'RET_YIELD', v:rate, min:4, max:30, step:1, sx:rate+'% PA', set:setRate, col:'accent-[#FF4444]'}
              ].map((inp, idx) => (
                <div key={idx}>
                   <div className="flex justify-between items-end mb-1.5 font-mono text-[10px] tracking-widest">
                      <span className="text-[#888] uppercase">{inp.lbl}</span>
                      <span className="text-[#E0E0E0] shadow-[0_0_5px_currentColor]" style={{color: inp.col.replace('accent-','').replace(/\]/,'').replace(/\[/,'')}}>{inp.sx}</span>
                   </div>
                   <input type="range" min={inp.min} max={inp.max} step={inp.step} value={inp.v} onChange={e=>inp.set(e.target.value)} className={`w-full h-1 bg-[#222] appearance-none cursor-crosshair ${inp.col} hover:h-2 transition-all`} />
                </div>
             ))}
          </div>
          
          <div className="mt-auto pt-6">
             <div className="border border-[#00E5FF]/30 bg-[#00E5FF]/5 p-5 relative overflow-hidden shadow-[inset_0_0_15px_rgba(0,229,255,0.05)] text-center">
                <div className="absolute top-0 right-0 p-3 opacity-10"><Target className="w-16 h-16 text-[#00E5FF]" /></div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00E5FF] mb-2">Required Uplink (SIP)</p>
                <p className="text-3xl font-mono font-black text-[#00E5FF] tracking-tight">₹<GlitchText text={formatInr(Math.ceil(sip))} glowColor="#00E5FF" /></p>
                
                {/* Segmented Power Core (Returns vs Invested) */}
                <div className="mt-8 pt-4 border-t border-[#00E5FF]/20">
                  <div className="flex w-full h-[6px] bg-[#111] overflow-hidden gap-[1px]">
                     {[...Array(20)].map((_, i) => {
                        const cellPct = (i / 20) * 100;
                        const invPct = (invested / tgt) * 100;
                        let colorClass = "bg-[#222]";
                        if (cellPct < invPct) colorClass = "bg-[#00E5FF] shadow-[0_0_5px_#00E5FF]";
                        else colorClass = "bg-[#ADFF2F] shadow-[0_0_5px_#ADFF2F]";
                        return <div key={i} className={`flex-1 ${colorClass}`}></div>;
                     })}
                  </div>
                  <div className="flex justify-between text-[9px] font-mono tracking-widest mt-3">
                    <div className="flex items-center text-[#00E5FF]"><div className="w-1.5 h-1.5 border border-[#00E5FF] mr-2"></div> INV: ₹{formatInr(invested)}</div>
                    <div className="flex items-center text-[#ADFF2F]"><div className="w-1.5 h-1.5 bg-[#ADFF2F] mr-2"></div> YLD: ₹{formatInr(returns)}</div>
                  </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

// --- CONTRIBUTION MODAL ---
function ContributionModal({ goal, onClose, onConfirm }) {
  const [val, setVal] = useState(goal.monthly_sip || 5000);
  const presets = [1000, 5000, 10000, 25000];
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#000]/80 backdrop-blur-md p-4 animate-fade-in font-mono">
       <div className="bg-[#050505] border border-[#00E5FF]/40 w-full max-w-sm shadow-[0_0_30px_rgba(0,229,255,0.1)] relative">
          <div className="p-5 border-b border-[#222]"><h3 className="text-sm tracking-widest text-[#00E5FF]">INITIATE_UPLINK</h3></div>
          <div className="p-5">
             <p className="text-[10px] text-[#888] mb-4 uppercase tracking-widest">Routing funds to {goal.name}</p>
             <div className="flex flex-wrap gap-2 mb-6">
                {presets.map(p => (
                   <button key={p} onClick={()=>setVal(p)} className={cn("px-3 py-1.5 text-[10px] tracking-widest border transition-all", val === p ? "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]" : "bg-[#111] text-[#888] border-[#333] hover:border-[#555]")}>
                     ₹{formatInr(p)}
                   </button>
                ))}
             </div>
             <input type="number" min="1" value={val} onChange={e=>setVal(e.target.value)} className="w-full text-xl bg-[#111] border border-[#333] text-[#00E5FF] p-3 outline-none focus:border-[#00E5FF]/50 transition-colors mb-6 text-center" />
             <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-3 bg-[#111] text-[#888] text-[10px] tracking-widest uppercase hover:bg-[#222]">Abort</button>
                <button onClick={()=>onConfirm(val)} disabled={!val || Number(val)<=0} className="flex-1 py-3 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/40 text-[10px] tracking-widest uppercase hover:bg-[#00E5FF]/20 disabled:opacity-50">Transmit</button>
             </div>
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
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#000]/80 backdrop-blur-md p-4 animate-fade-in font-mono">
       <div className="bg-[#050505] border border-[#00E5FF]/40 w-full max-w-lg shadow-[0_0_30px_rgba(0,229,255,0.1)] relative max-h-[90vh] flex flex-col">
          <div className="p-5 border-b border-[#222]"><h3 className="text-sm tracking-widest text-[#00E5FF]">{goal ? 'EDIT_NODE_PARAMS' : 'ALLOCATE_NEW_NODE'}</h3></div>
          <div className="p-5 overflow-y-auto space-y-4">
             <div><label className="text-[9px] text-[#888] uppercase tracking-widest mb-1 block">IDENTIFIER</label><input required value={fd.name} onChange={e=>setFd({...fd, name:e.target.value})} className="w-full bg-[#111] border border-[#333] text-[#E0E0E0] p-2 outline-none focus:border-[#00E5FF]/50 text-xs" /></div>
             <div><label className="text-[9px] text-[#888] uppercase tracking-widest mb-1 block">CLASS</label><select value={fd.category} onChange={e=>setFd({...fd, category:e.target.value})} className="w-full bg-[#111] border border-[#333] text-[#E0E0E0] p-2 outline-none focus:border-[#00E5FF]/50 text-xs">{Object.keys(CAT_ICONS).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[9px] text-[#888] uppercase tracking-widest mb-1 block">TGT_VOLUME</label><input type="number" required value={fd.target_amount} onChange={e=>setFd({...fd, target_amount:e.target.value})} className="w-full bg-[#111] border border-[#333] text-[#00E5FF] p-2 outline-none focus:border-[#00E5FF]/50 text-xs" /></div>
                <div><label className="text-[9px] text-[#888] uppercase tracking-widest mb-1 block">CURRENT_VOL</label><input type="number" disabled={!!goal} value={fd.saved_amount} onChange={e=>setFd({...fd, saved_amount:e.target.value})} className="w-full bg-[#0a0a0a] border border-[#222] text-[#666] p-2 outline-none text-xs" /></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[9px] text-[#888] uppercase tracking-widest mb-1 block">TGT_DATE</label><input type="date" required value={fd.target_date} onChange={e=>setFd({...fd, target_date:e.target.value})} className="w-full bg-[#111] border border-[#333] text-[#E0E0E0] p-2 outline-none focus:border-[#00E5FF]/50 text-xs" /></div>
                <div><label className="text-[9px] text-[#888] uppercase tracking-widest mb-1 block">RQR_UPLINK/MO</label><input type="number" value={fd.monthly_sip} onChange={e=>setFd({...fd, monthly_sip:e.target.value})} className="w-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#ADFF2F] p-2 outline-none focus:border-[#00E5FF] text-xs" /></div>
             </div>
          </div>
          <div className="p-4 border-t border-[#222] flex gap-2">
             <button onClick={onClose} className="flex-1 py-3 bg-[#111] text-[#888] text-[10px] tracking-widest uppercase hover:bg-[#222]">Abort</button>
             <button onClick={()=>onSave(fd)} className="flex-1 py-3 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/40 text-[10px] tracking-widest uppercase hover:bg-[#00E5FF]/20">Commit</button>
          </div>
       </div>
    </div>
  );
}
