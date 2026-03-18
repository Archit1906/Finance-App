import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Bot, Send, User, Trophy, Flame } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export default function Coach() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: `Hello ${user?.name}, I'm your AI Wealth Coach running the Ignite protocol. How can I optimize your capital today?` }
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  const { data: gamification } = useQuery({
    queryKey: ['gamification'],
    queryFn: async () => (await api.get('/coach/gamification')).data.data
  });

  const chatMutation = useMutation({
    mutationFn: async (message) => await api.post('/coach/chat', { message }),
    onSuccess: (res) => {
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: res.data.data }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: "SYSTEM FAILURE: Connection broken to the Ignite neural core. Verify API configurations." }]);
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMsg }]);
    setInput('');
    chatMutation.mutate(userMsg);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
           <h1 className="text-4xl font-bebas tracking-[2px] text-ignite-white flex items-center">
             AI Wealth Coach <Bot className="w-8 h-8 ml-3 text-ignite-red drop-shadow-[0_0_8px_rgba(204,0,0,0.5)] bg-ignite-card p-1 border border-ignite-border rounded-lg" />
           </h1>
           <p className="text-ignite-muted font-bold mt-1 text-sm uppercase tracking-widest">Real-time deep learning insight engine</p>
        </div>

        {/* Gamification Strip */}
        <div className="flex items-center gap-4 bg-ignite-card px-5 py-3 rounded-2xl shadow-ignite-card border border-ignite-border">
           <div className="flex items-center text-sm font-black text-ignite-alert">
              <Flame className="w-5 h-5 mr-1" />
              {gamification?.currentStreak || 0} WEEK STREAK
           </div>
           <div className="w-px h-6 bg-ignite-border"></div>
           <div className="flex items-center text-sm font-black text-ignite-warning drop-shadow-[0_0_8px_rgba(255,179,0,0.3)]">
              <Trophy className="w-5 h-5 mr-1" />
              {gamification?.badge || 'OPERATOR'}
           </div>
        </div>
      </div>

      <div className="flex-1 bg-ignite-bg border border-ignite-border rounded-2xl shadow-ignite-card flex flex-col overflow-hidden">
        {/* Chat window */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-ignite-bg/50 scrollbar-thin scrollbar-thumb-ignite-border scrollbar-track-transparent">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex items-start max-w-[85%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md border",
                m.role === 'user' ? "bg-ignite-red border-ignite-red text-ignite-white ml-4 shadow-ignite-card" : "bg-ignite-card border-ignite-border text-ignite-red mr-4 shadow-sm"
              )}>
                {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={cn(
                "px-5 py-4 rounded-3xl text-[15px] font-medium leading-relaxed shadow-sm",
                m.role === 'user' ? "bg-ignite-red text-ignite-white rounded-tr-none shadow-ignite-card" : "bg-ignite-card border border-ignite-border text-ignite-white rounded-tl-none shadow-md"
              )}>
                {m.content}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
             <div className="flex items-center max-w-[85%] animate-fade-in">
               <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-ignite-card border border-ignite-border text-ignite-red mr-4 shadow-sm">
                 <Bot className="w-5 h-5" />
               </div>
               <div className="px-5 py-4 bg-ignite-card border border-ignite-border rounded-3xl rounded-tl-none shadow-md flex items-center space-x-2">
                 <div className="w-2.5 h-2.5 bg-ignite-red rounded-full animate-pulse shadow-[0_0_5px_rgba(204,0,0,0.8)]"></div>
                 <div className="w-2.5 h-2.5 bg-ignite-red rounded-full animate-pulse shadow-[0_0_5px_rgba(204,0,0,0.8)]" style={{ animationDelay: '200ms' }}></div>
                 <div className="w-2.5 h-2.5 bg-ignite-red rounded-full animate-pulse shadow-[0_0_5px_rgba(204,0,0,0.8)]" style={{ animationDelay: '400ms' }}></div>
               </div>
             </div>
          )}
          <div ref={chatEndRef}></div>
        </div>

        {/* Quick Suggestion Chips */}
        {messages.length < 3 && !chatMutation.isPending && (
           <div className="bg-ignite-bg px-6 py-2 flex gap-2 overflow-x-auto border-t border-ignite-border/30">
              {['Analyze my spending this month', 'What is the 50/30/20 rule?', 'How do I save on 80C taxes?'].map(txt => (
                 <button key={txt} onClick={()=>setInput(txt)} className="text-xs font-bold text-ignite-red border border-ignite-red px-4 py-2 rounded-xl whitespace-nowrap hover:bg-ignite-red hover:text-white transition-colors shadow-[0_0_10px_rgba(204,0,0,0.1)]">
                    {txt}
                 </button>
              ))}
           </div>
        )}

        {/* Input box */}
        <div className="p-5 border-t border-ignite-border bg-ignite-card">
          <form onSubmit={handleSend} className="flex gap-4">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query the system or request financial heuristics..."
              className="flex-1 bg-ignite-side border border-ignite-border text-ignite-white text-[15px] font-medium rounded-2xl focus:shadow-ignite-focus focus:border-ignite-red block px-5 py-4 outline-none transition-all placeholder-[#6B5555]"
            />
            <button 
              type="submit" 
              disabled={chatMutation.isPending || !input.trim()}
              className="px-6 py-4 bg-ignite-red text-ignite-white rounded-2xl shadow-ignite-card hover:bg-ignite-hover hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center font-bold"
            >
              <Send className="w-6 h-6 mr-2" /> SEND
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
