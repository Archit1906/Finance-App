import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Receipt, PieChart, Target, LogOut, Wallet, Menu, ClipboardList, Bot } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

export default function AppLayout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Transactions', href: '/transactions', icon: Receipt },
    { name: 'Budgets', href: '/budgets', icon: PieChart },
    { name: 'Investments', href: '/investments', icon: Wallet },
    { name: 'Goals', href: '/goals', icon: Target },
    { name: 'Planner', href: '/planner', icon: ClipboardList },
    { name: 'AI Coach', href: '/coach', icon: Bot },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex animate-fade-in text-[#F5F5F5]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/85 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#050505] border-r border-[#222] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-[4px_0_24px_rgba(0,0,0,0.8)]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full bg-mesh-grid relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#111] via-[#050505]/95 to-[#000] -z-10"></div>
          
          <div className="flex items-center justify-center h-24 px-4 border-b border-[#222]/50">
            <h1 className="text-3xl font-bebas tracking-[5px] text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#ADFF2F] mt-1 relative flex items-center">
               <Wallet className="w-6 h-6 mr-3 text-[#00E5FF] drop-shadow-[0_0_8px_#00E5FF]" />
               W_OS_2.0
               <div className="absolute -bottom-2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E5FF]/60 to-transparent"></div>
            </h1>
          </div>

          <nav className="flex-1 px-8 py-10 overflow-y-auto relative scrollbar-hide">
            {/* The underlying core data link line */}
            <div className="absolute left-[39px] top-14 bottom-14 w-px bg-gradient-to-b from-transparent via-[#00E5FF]/20 to-transparent z-0"></div>

            {navigation.map((item, idx) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center text-[12px] font-bold transition-all relative z-10 w-full mb-8 group outline-none",
                    isActive ? "text-[#00E5FF]" : "text-[#B0A0A0] hover:text-[#ADFF2F]"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  {/* Glowing Data Node */}
                  <div className="relative mr-6 flex-shrink-0 flex items-center justify-center w-4 h-4 isolate">
                     <div className={cn("absolute inset-0 rounded-full border transition-all duration-500", isActive ? "border-[#00E5FF] scale-150 opacity-60" : "border-[#B0A0A0]/20 scale-100 group-hover:scale-125 group-hover:border-[#ADFF2F]/40")}></div>
                     
                     <div className={cn("w-[6px] h-[6px] rounded-sm absolute transition-all duration-300 transform", isActive ? "bg-[#00E5FF] shadow-[0_0_12px_#00E5FF] rotate-45" : "bg-[#333] group-hover:bg-[#ADFF2F] group-hover:rotate-45")}></div>
                     
                     {/* Data Packet Pulse (Pseudo hover packet tracer) */}
                     <div className="absolute -top-10 left-[1px] w-[2px] h-[10px] bg-[#00E5FF] shadow-[0_0_8px_#00E5FF] opacity-0 group-hover:opacity-100 group-hover:animate-scan-vertical pointer-events-none rounded"></div>
                  </div>
                  
                  <span className="font-mono tracking-[0.15em] uppercase transition-all duration-300 transform group-hover:translate-x-1">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Security Terminal Lockbox */}
          <div className="p-5 border-t border-[#222]/50 bg-[#000] relative overflow-hidden group">
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{backgroundImage: 'linear-gradient(#00E5FF 1px, transparent 1px), linear-gradient(90deg, #00E5FF 1px, transparent 1px)', backgroundSize: '8px 8px'}}></div>
            
            <div className="flex items-center mb-5 gap-4 relative z-10">
              <div className="w-10 h-10 border border-[#00E5FF]/30 bg-[#0a0a0a] flex items-center justify-center relative shadow-[inset_0_0_15px_rgba(0,229,255,0.05)] overflow-hidden shrink-0">
                 <div className="absolute inset-0 border-t border-[#00E5FF]/80 animate-scan-vertical"></div>
                 <div className="w-3.5 h-3.5 border-[1.5px] border-[#ADFF2F] opacity-70 transform group-hover:scale-110 group-hover:rotate-12 transition-transform"></div>
              </div>
              <div className="flex flex-col overflow-hidden leading-tight">
                <span className="text-[11px] font-mono font-bold text-[#F5F5F5] uppercase tracking-widest truncate">SYSADM // {user?.name?.split(' ')[0] || 'USER'}</span>
                <span className="text-[9px] font-mono text-[#00E5FF]/70 truncate tracking-widest mt-1">{user?.email || 'AUTH.ACTIVE'}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex justify-between items-center group/btn px-3 py-2 text-[10px] font-mono font-bold text-[#FF4444]/70 border border-[#222] bg-[#0a0a0a] hover:border-[#FF4444]/50 hover:text-[#FF4444] transition-all relative z-10"
            >
              <span className="tracking-widest">INITIATE_SIGNOUT</span>
              <LogOut className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#050505]">
        <header className="flex items-center justify-between h-16 px-4 border-b border-[#222] bg-[#000] lg:hidden relative z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-ignite-cyan rounded-md"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-xl font-bebas tracking-[3px] text-ignite-cyan mt-1">W_OS_2.0</span>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto w-full relative custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
