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
    <div className="min-h-screen bg-[#0a0a0a] flex animate-fade-in text-[#e0e0e0]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/85 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar - Bezel */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-cotes-de-geneve border-r border-[#222] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-[4px_0_24px_rgba(0,0,0,0.9)]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full relative plate-border">
          {/* Subtle shading over the cotes-de-geneve pattern to simulate crystal shadow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,255,255,0.02)] to-black/60 pointer-events-none"></div>
          
          <div className="flex items-center justify-center h-32 px-4 shadow-engraving bg-[#111]/80">
            <h1 className="text-4xl font-bebas tracking-[6px] text-engraved-gold relative flex items-center">
               WEALTH OS
               <div className="absolute -bottom-3 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-champagne-gold)] to-transparent opacity-30"></div>
            </h1>
          </div>

          <nav className="flex-1 px-6 py-10 overflow-y-auto relative scrollbar-hide z-10">
            {navigation.map((item, idx) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center text-[12px] font-bold transition-all relative w-full mb-8 group outline-none",
                    isActive ? "text-[var(--color-champagne-gold)] drop-shadow-[0_0_5px_rgba(212,175,55,0.4)]" : "text-[#7a7a7a] hover:text-[#b0b0b0]"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  {/* Metal component icon integration */}
                  <div className={cn("mr-5 p-2 rounded-full plate-border transition-all duration-500", isActive ? "bg-[#1f1f1f] shadow-recessed" : "bg-[#111] shadow-[0_2px_4px_rgba(0,0,0,0.8)]")}>
                     <Icon className="w-4 h-4" />
                  </div>
                  
                  <span className="font-mono tracking-[0.15em] uppercase transition-all duration-300 transform flex-1">{item.name}</span>
                  
                  {/* Mechanical Hand (Active State) */}
                  {isActive && (
                    <div className="absolute -right-2 flex items-center animate-pulse">
                       {/* SVG Hand mimicking a watch hand pointing inward */}
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform -rotate-90 origin-right">
                          <path d="M12 22L12 2" stroke="var(--color-champagne-gold)" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="12" cy="18" r="3" fill="var(--color-obsidian)" stroke="var(--color-champagne-gold)" strokeWidth="1.5"/>
                          <path d="M10 5L12 2L14 5" fill="var(--color-champagne-gold)"/>
                       </svg>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Security Terminal Lockbox - now an Engraved Plate Segment */}
          <div className="p-6 border-t border-[#333] shadow-recessed bg-[#0d0d0d] relative z-10">
            <div className="flex items-center mb-5 gap-4 relative">
              <div className="w-10 h-10 border border-[#333] bg-sunray shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] rounded-full flex items-center justify-center relative shrink-0">
                 <div className="w-3.5 h-3.5 border-[1.5px] border-[var(--color-champagne-gold)] rounded-full border-t-transparent animate-gear-spin"></div>
              </div>
              <div className="flex flex-col overflow-hidden leading-tight">
                <span className="text-[11px] font-mono font-bold text-engraved-gold uppercase tracking-widest truncate">SYSADM // {user?.name?.split(' ')[0] || 'USER'}</span>
                <span className="text-[9px] font-mono text-[#666] truncate tracking-widest mt-1">SECURE_LINK_ACTIVE</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex justify-between items-center group/btn px-4 py-3 text-[10px] font-mono font-bold text-[var(--color-enamel-red)] border border-[#333] bg-[#111] hover:border-[var(--color-enamel-red)] shadow-plate hover:shadow-[0_0_15px_rgba(139,0,0,0.4)] transition-all rounded-sm"
            >
              <span className="tracking-widest">DISENGAGE_CROWN</span>
              <LogOut className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#0a0a0a]">
        <header className="flex items-center justify-between h-16 px-4 border-b border-[#222] bg-[#111] lg:hidden relative z-30 shadow-engraving">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-[var(--color-champagne-gold)] rounded-md"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-xl font-bebas tracking-[3px] text-engraved-gold mt-1">WEALTH OS</span>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto w-full relative custom-scrollbar p-[2px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
