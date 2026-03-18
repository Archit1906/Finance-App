import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Bot, Send, User, Trophy, Flame } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export default function Coach() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: `Hello ${user?.name}, I'm your AI Wealth Coach. Need help analyzing your spending, reviewing your investments, or planning for taxes?` }
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
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: "I'm having trouble connecting to my neural network right now. Please check your API keys or try again later." }]);
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
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 flex items-center">
             AI Wealth Coach <Bot className="w-6 h-6 ml-2 text-indigo-600" />
           </h1>
           <p className="text-gray-500 text-sm mt-1">Get personalized financial insights instantly.</p>
        </div>

        {/* Gamification Strip */}
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
           <div className="flex items-center text-sm font-bold text-orange-500">
              <Flame className="w-5 h-5 mr-1" />
              {gamification?.currentStreak || 0} Month Streak
           </div>
           <div className="w-px h-6 bg-gray-200"></div>
           <div className="flex items-center text-sm font-bold text-yellow-500">
              <Trophy className="w-5 h-5 mr-1" />
              {gamification?.badge || 'Starter'}
           </div>
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {/* Chat window */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex items-start max-w-[85%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border",
                m.role === 'user' ? "bg-indigo-100 border-indigo-200 text-indigo-700 ml-3" : "bg-white border-gray-200 text-indigo-600 mr-3"
              )}>
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                m.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white border border-gray-100 text-gray-700 shadow-sm rounded-tl-none"
              )}>
                {m.content}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
             <div className="flex items-center max-w-[85%]">
               <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white border border-gray-200 text-indigo-600 mr-3 shadow-sm">
                 <Bot className="w-4 h-4" />
               </div>
               <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2">
                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
               </div>
             </div>
          )}
          <div ref={chatEndRef}></div>
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <form onSubmit={handleSend} className="flex gap-3">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your budget, investments, or get a tax saving tip..."
              className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block px-4 py-3 outline-none transition-colors"
            />
            <button 
              type="submit" 
              disabled={chatMutation.isPending || !input.trim()}
              className="px-4 py-3 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
