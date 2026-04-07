import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Compass, Network, PlusSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import InvestmentsCharts from '../components/InvestmentsCharts';

export default function Investments() {
  const { user } = useAuth();
  const [hoveredNode, setHoveredNode] = useState(null);

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-7xl mx-auto px-4 mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-bebas tracking-[4px] text-engraved-gold flex items-center shadow-gold-text">
            INVESTMENT MOVEMENT // {user?.name?.toUpperCase() || 'PRIMARY'}
          </h1>
          <p className="text-[#888] font-mono text-[10px] tracking-[0.2em] uppercase mt-1">Status: Synced • 477 HR AGO</p>
        </div>
        
        {/* Watch Crown Button */}
        <button className="flex items-center gap-2 px-6 py-2 rounded-full plate-border bg-sunray shadow-[0_4px_10px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.2)] active:scale-[0.97] active:shadow-[0_1px_2px_rgba(0,0,0,0.9),inset_0_4px_10px_rgba(0,0,0,0.8)] transition-all group">
           <div className="w-5 h-5 flex items-center justify-center border border-[var(--color-champagne-gold)] rounded-full bg-[#111] shadow-engraving">
             <span className="text-[var(--color-champagne-gold)] font-mono font-bold text-sm leading-none mt-[-1px] relative z-10 group-active:scale-90 transition-transform">+</span>
           </div>
           <span className="text-[11px] font-bold tracking-[0.2em] text-engraved-gold uppercase group-active:text-[#AA8222] transition-colors">Allocate</span>
        </button>
      </div>
      
      {/* Complications Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-cotes-de-geneve p-6 rounded-2xl plate-border shadow-plate relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[rgba(255,255,255,0.02)] to-black/60 pointer-events-none rounded-2xl"></div>

        {/* Gross Invested */}
        <div className="bg-[#0a0a0a] p-5 rounded-xl border border-[#333] shadow-recessed relative overflow-hidden group">
          <div className="absolute top-2 right-2 opacity-10">
            <Compass className="w-16 h-16 text-[var(--color-champagne-gold)]" />
          </div>
          <h3 className="text-[#666] text-[10px] font-mono font-bold uppercase tracking-[0.2em]">Gross Invested</h3>
          <p className="text-2xl font-mono font-black text-[var(--color-champagne-gold)] mt-1 tracking-tight drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]">
            ₹6,82,575.00
          </p>
        </div>

        {/* Live Valuation Complication */}
        <div className="bg-[#0a0a0a] p-5 rounded-xl border border-[#333] shadow-recessed relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[#666] text-[10px] font-mono font-bold uppercase tracking-[0.2em] relative z-10">Live Valuation</h3>
            
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
            ₹7,81,680.00
          </p>
        </div>

        {/* PNL Gold Tag */}
        <div className="bg-sunray p-4 rounded-xl border border-[var(--color-champagne-gold)] shadow-[inset_0_0_20px_rgba(0,0,0,0.9),0_4px_10px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col justify-center items-center text-center group">
            <h3 className="text-[#888] text-[9px] font-mono font-bold uppercase tracking-[0.2em] mb-2 pointer-events-none drop-shadow-[0_1px_1px_#000]">Total Matrix PNL</h3>
            <p className="text-[12px] font-mono font-black text-[#111] tracking-widest drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] bg-[var(--color-champagne-gold)] bg-sunray px-3 py-1.5 border border-[#000] shadow-recessed mx-auto">
               +₹99,105.00 (+14.52%)
            </p>
        </div>
        
        {/* Complexity Complication */}
        <div className="bg-[#0a0a0a] p-5 rounded-xl border border-[#333] shadow-recessed relative overflow-hidden flex flex-col justify-between items-end text-right">
           <div className="flex justify-between w-full items-start">
             {/* Gravity Defying Tourbillon Gauge */}
             <div className="w-10 h-10 rounded-full border border-[#444] shadow-[0_0_10px_rgba(0,0,0,0.9),inset_0_0_5px_rgba(0,0,0,0.9)] flex items-center justify-center relative bg-[#111] shrink-0">
                <div className="absolute inset-2 border border-[var(--color-champagne-gold)] rounded-full opacity-30 shadow-[inset_0_0_3px_#D4AF37]"></div>
                <div className="w-1 h-6 bg-[var(--color-champagne-gold)] rounded-full animate-tourbillon-tick shadow-[0_0_5px_rgba(212,175,55,0.8)]"></div>
             </div>
             <h3 className="text-[#666] text-[10px] font-mono font-bold uppercase tracking-[0.2em]">Complexity</h3>
           </div>
           <div>
             <p className="text-xl font-mono font-black text-engraved-gold tracking-widest">8 NODES</p>
             <p className="text-[#888] text-[9px] font-mono font-bold uppercase tracking-[0.2em]">(5 DIMENSIONS)</p>
           </div>
        </div>

      </div>

      {/* Analytics Charts */}
      <InvestmentsCharts hoveredNode={hoveredNode} />
      
      {/* Network Nodes Table (Engraved Plate) */}
      <div className="mt-8 bg-pvd-plate p-8 rounded-none border border-[#333] border-b-[#444] border-r-[#444] shadow-plate relative z-10">
         {/* Screws */}
         <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-[#1A1A1A] border border-[#333] shadow-recessed flex items-center justify-center"><div className="w-1.5 h-[1.5px] bg-[#0a0a0a] rotate-45 shadow-[0_1px_0_rgba(255,255,255,0.1)]"></div></div>
         <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-[#1A1A1A] border border-[#333] shadow-recessed flex items-center justify-center"><div className="w-1.5 h-[1.5px] bg-[#0a0a0a] -rotate-12 shadow-[0_1px_0_rgba(255,255,255,0.1)]"></div></div>
         <div className="absolute bottom-4 left-4 w-3 h-3 rounded-full bg-[#1A1A1A] border border-[#333] shadow-recessed flex items-center justify-center"><div className="w-1.5 h-[1.5px] bg-[#0a0a0a] rotate-90 shadow-[0_1px_0_rgba(255,255,255,0.1)]"></div></div>
         <div className="absolute bottom-4 right-4 w-3 h-3 rounded-full bg-[#1A1A1A] border border-[#333] shadow-recessed flex items-center justify-center"><div className="w-1.5 h-[1.5px] bg-[#0a0a0a] rotate-180 shadow-[0_1px_0_rgba(255,255,255,0.1)]"></div></div>
         
         <div className="mb-6 ml-6">
             <h3 className="text-xl font-bebas tracking-[3px] text-[#777] uppercase flex items-center gap-3">
                <Network className="w-5 h-5 text-[#555]" />
                Network Node Ledger
             </h3>
         </div>

         <div className="overflow-x-auto mx-4 pb-2">
            <div className="min-w-[800px] flex flex-col gap-4">
               {[
                 { id: 'Reliance', tag: 'STOCK', qty: 50, avg: '₹2,400.00', ltp: '₹2,900.00', val: '₹1,45,000.00', pnl: '+₹25,000.00 (+20.83%)' },
                 { id: 'TCS', tag: 'STOCK', qty: 20, avg: '₹3,200.00', ltp: '₹3,850.00', val: '₹77,000.00', pnl: '+₹13,000.00 (+20.31%)' }
               ].map((row) => (
                 <div 
                    key={row.id}
                    onMouseEnter={() => setHoveredNode(row.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="flex flex-row items-center justify-between px-6 py-4 bg-[#0d0d0d] border border-[#222] rounded-none hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(0,0,0,0.9)] hover:border-[#333] hover:bg-[#111] transition-all duration-300 group cursor-default relative w-full"
                 >
                    {/* Hover Balance Wheel */}
                    <div className={cn("absolute -left-3 opacity-0 transition-opacity duration-300 z-20", hoveredNode === row.id && "opacity-100")}>
                       <div className="w-6 h-6 rounded-full border-2 border-[#333] shadow-plate flex items-center justify-center bg-[#0a0a0a]">
                         <div className="w-4 h-4 rounded-full border-2 border-[var(--color-champagne-gold)] animate-balance-wheel flex items-center justify-center">
                            <div className="w-1 h-2 bg-[var(--color-champagne-gold)]"></div>
                         </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-4 w-48 shrink-0">
                       <span className="font-mono text-[13px] font-bold tracking-widest text-engraved-gold drop-shadow-md">{row.id}</span>
                       <span className="px-2 py-0.5 bg-[var(--color-enamel-red)] text-white text-[9px] font-mono font-bold tracking-widest border border-[#111] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">
                         {row.tag}
                       </span>
                    </div>

                    <div className="flex-1 flex flex-row items-center justify-between text-right px-6 shrink-0">
                       <div className="flex flex-col text-right w-20">
                           <span className="text-[#555] text-[9px] font-mono font-bold uppercase tracking-widest mb-1">QTY</span>
                           <span className="text-[#a0a0a0] font-mono text-[11px] font-bold shadow-engraving bg-[#111] px-2 py-0.5 rounded-sm">{row.qty}</span>
                       </div>
                       <div className="flex flex-col text-right w-24">
                           <span className="text-[#555] text-[9px] font-mono font-bold uppercase tracking-widest mb-1">AVG_PRC</span>
                           <span className="text-[#888] font-mono text-[11px] tracking-wider">{row.avg}</span>
                       </div>
                       <div className="flex flex-col text-right w-24">
                           <span className="text-[#555] text-[9px] font-mono font-bold uppercase tracking-widest mb-1">LTP</span>
                           <span className="text-[var(--color-champagne-gold)] font-mono text-[12px] opacity-80">{row.ltp}</span>
                       </div>
                       <div className="flex flex-col text-right w-32">
                           <span className="text-[#555] text-[9px] font-mono font-bold uppercase tracking-widest mb-1">CUR_VAL</span>
                           <span className="text-engraved-gold font-mono text-[14px] font-black">{row.val}</span>
                       </div>
                    </div>

                    <div className="w-48 text-right flex flex-col justify-end shrink-0 pl-4 border-l border-[#222]">
                       <span className="text-[#00ff00] font-mono text-[11px] font-bold opacity-90 tracking-wider">
                          {row.pnl}
                       </span>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
