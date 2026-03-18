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
    <div className="min-h-screen bg-ignite-bg flex animate-fade-in">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/85 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-ignite-side border-r border-ignite-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-20 px-4 border-b border-ignite-border">
            <Wallet className="w-8 h-8 text-ignite-red drop-shadow-[0_0_8px_rgba(204,0,0,0.5)] mr-3" />
            <span className="text-3xl font-bebas tracking-[2px] text-ignite-red drop-shadow-[0_0_8px_rgba(204,0,0,0.5)] mt-1">Wealth OS</span>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-bold rounded-r-xl transition-all",
                    isActive 
                      ? "bg-ignite-card text-ignite-white border-l-[4px] border-ignite-red" 
                      : "text-ignite-muted bg-transparent border-l-[4px] border-transparent hover:bg-ignite-card hover:text-ignite-hover"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={cn("w-5 h-5 mr-3 hidden sm:block", isActive ? "text-ignite-red" : "text-ignite-muted group-hover:text-ignite-hover")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-ignite-border bg-ignite-bg/30">
            <div className="flex items-center justify-between mb-4 px-2 tracking-tight">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-ignite-white">{user?.name}</span>
                <span className="text-xs text-ignite-muted truncate w-40">{user?.email}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center px-4 py-2 text-sm font-bold text-ignite-muted rounded-xl hover:bg-ignite-card hover:text-ignite-hover transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between h-16 px-4 border-b border-ignite-border bg-ignite-bg lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-ignite-muted rounded-md hover:bg-ignite-card"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-xl font-bebas tracking-[2px] text-ignite-red drop-shadow-[0_0_8px_rgba(204,0,0,0.5)] mt-1">Wealth OS</span>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
