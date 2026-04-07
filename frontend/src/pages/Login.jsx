import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, Scan, Fingerprint, Lock, Box, Globe } from 'lucide-react';

function TypewriterText({ text, active, delay = 0 }) {
  const [disp, setDisp] = useState('');
  useEffect(() => {
    if(!active) return;
    let t2 = setTimeout(() => {
        let i = 0;
        const t = setInterval(() => {
          setDisp(text.slice(0, i+1));
          i++;
          if (i > text.length) clearInterval(t);
        }, 50); 
        return () => clearInterval(t);
    }, delay * 1000);
    return () => clearTimeout(t2);
  }, [text, active, delay]);

  return <span className="font-mono tracking-widest">{disp}<span className="animate-pulse">_</span></span>;
}

// Simulated rapid number counter on mount
function RapidCounter({ target, active }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 800;
      if (current >= target) {
         setVal(target);
         clearInterval(interval);
      } else {
         setVal(Math.floor(current));
      }
    }, 30);
    return () => clearInterval(interval);
  }, [active, target]);
  return <span>{val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>;
}

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [isAnimating, setIsAnimating] = useState(false);
  const [showGoldDust, setShowGoldDust] = useState(false);

  // Login Form
  const [email, setEmail] = useState('demo@wealth.os');
  const [password, setPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);

  // Signup Form
  const [displayName, setDisplayName] = useState('');
  const [enable2FA, setEnable2FA] = useState(false);
  const [network, setNetwork] = useState('INR');

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleModeSwitch = (newMode) => {
    if (newMode === mode || isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setMode(newMode);
      if (newMode === 'signup') {
        setShowGoldDust(true);
        setTimeout(() => setShowGoldDust(false), 1200);
      }
      setTimeout(() => setIsAnimating(false), 500);
    }, 450); // Midpoint of page-turn animation
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        // Actual signup flow to create a unique user account
        await register(displayName, email, password);
      }
      setIsVerified(true);
      setTimeout(() => navigate('/'), 800); 
    } catch (err) {
      setError(err.response?.data?.error || 'Authorization Failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden group/vault bg-vault-blueprint animate-system-pulse">
      
      {/* Deep-Space Atmos Effects handled by bg-vault-blueprint and animate-system-pulse in index.css */}

      {/* Mode Selector */}
      <div className="flex gap-4 mb-4 justify-center z-20 relative px-4">
        <div 
          onClick={() => handleModeSwitch('login')}
          className={`flex items-center gap-2 px-6 py-2 border cursor-pointer transition-all duration-300 ${mode === 'login' ? 'border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF] shadow-[inset_0_0_15px_rgba(0,229,255,0.3)]' : 'border-[#333] bg-[#050B0D]/80 text-[#666] hover:border-[#666] hover:text-[#bbb]'}`}
        >
          <Lock className={`w-4 h-4 transition-colors ${mode === 'login' ? 'text-[#00E5FF] drop-shadow-[0_0_5px_#00E5FF]' : 'text-[#666]'}`} />
          <span className="font-mono text-[11px] tracking-widest uppercase">MODE_001 [SECURE LOGIN]</span>
        </div>
        <div 
          onClick={() => handleModeSwitch('signup')}
          className={`flex items-center gap-2 px-6 py-2 border cursor-pointer transition-all duration-300 ${mode === 'signup' ? 'border-[#FF8C00] bg-[#FF8C00]/10 text-[#FF8C00] shadow-[inset_0_0_15px_rgba(255,140,0,0.3)]' : 'border-[#333] bg-[#050B0D]/80 text-[#666] hover:border-[#666] hover:text-[#bbb]'}`}
        >
          <Box className={`w-4 h-4 transition-colors ${mode === 'signup' ? 'text-[#FF8C00] drop-shadow-[0_0_5px_#FF8C00]' : 'text-[#666]'}`} />
          <span className="font-mono text-[11px] tracking-widest uppercase">MODE_002 [NODE PROVISIONING]</span>
        </div>
      </div>
      
      {/* Central Glass Terminal */}
      <div className={`sm:mx-auto sm:w-full sm:max-w-md relative z-10 transition-all duration-500 ${isVerified ? 'animate-vault-spin' : ''} ${isAnimating ? 'animate-mode-switch' : ''}`}>
        
        {showGoldDust && <div className="animate-gold-dust"></div>}
        
        {/* Terminal Header */}
        <div className="flex flex-col items-center mb-6 relative">
          <div className="w-24 h-24 mb-4 rounded-2xl flex items-center justify-center relative">
             <div className={`absolute inset-0 border rounded-2xl transform rotate-45 animate-pulse transition-colors duration-500 ${mode === 'signup' ? 'border-[#FF8C00]/20 shadow-[inset_0_0_20px_rgba(255,140,0,0.1)]' : 'border-[#00E5FF]/20 shadow-[inset_0_0_20px_rgba(0,229,255,0.1)]'}`}></div>
             {mode === 'signup' ? (
                <Box className="w-12 h-12 text-[#FF8C00] relative z-10 animate-ignition drop-shadow-[0_0_15px_#FF8C00]" />
             ) : (
                <Wallet className="w-12 h-12 text-[#CC0000] relative z-10 animate-ignition drop-shadow-[0_0_15px_#CC0000]" />
             )}
          </div>
          
          <h2 className={`text-2xl text-transparent bg-clip-text drop-shadow-md pb-1 transition-all duration-500 ${mode === 'signup' ? 'bg-gradient-to-r from-[#FF8C00] to-[#FFD700]' : 'bg-gradient-to-r from-[#00E5FF] to-[#ADFF2F]'}`}>
             {mode === 'signup' ? (
                 <TypewriterText text="PROVISION_NEW_WEALTH_NODE" active={mounted && mode === 'signup'} delay={0.1} />
             ) : (
                 <TypewriterText text="SIGN_IN_TO_WEALTH_OS" active={mounted && mode === 'login'} delay={0.1} />
             )}
          </h2>
        </div>

        {/* Data Entry Panel */}
        <div className={`backdrop-blur-xl py-8 px-6 sm:rounded-none sm:px-10 border relative overflow-hidden transition-colors duration-500 ${mode === 'signup' ? 'bg-[#050505]/80 shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(255,140,0,0.15)] border-[#FF8C00]/30' : 'bg-[#050B0D]/80 shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(0,229,255,0.15)] border-[#00E5FF]/30'}`}>
          
          {/* Subtle moving scanline in the card edge */}
          <div className={`absolute top-0 left-0 w-full h-[1px] translate-x-[-100%] animate-[scan_3s_linear_infinite] ${mode === 'signup' ? 'bg-gradient-to-r from-transparent via-[#FF8C00] to-transparent' : 'bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent'}`}></div>

          <form className="space-y-8 relative z-10" onSubmit={handleSubmit}>
            
            {error && (
              <div className="p-3 bg-[#110000] border-l-2 border-[#FF4444] text-[#FF4444] font-mono text-[11px] tracking-widest flex items-center shadow-[0_0_15px_rgba(255,68,68,0.2)]">
                <Lock className="w-4 h-4 mr-3 shrink-0" />
                {error}
              </div>
            )}
            
            {mode === 'signup' && (
                <div className="relative group animate-fade-in" style={{ animationDelay: '0.1s' }}>
                   <input
                     type="text"
                     value={displayName}
                     onChange={(e) => setDisplayName(e.target.value)}
                     className="peer block w-full px-0 py-2 bg-transparent border-0 border-b border-[#222] text-[#FF8C00] font-mono text-sm tracking-wider focus:outline-none focus:ring-0 focus:border-[#FF8C00] transition-colors shadow-none hover:border-[#444]"
                     placeholder=" "
                   />
                   <label className="absolute left-0 top-2 text-[#888] font-mono text-[11px] uppercase tracking-[0.2em] transition-all duration-300 peer-focus:-top-4 peer-focus:text-[9px] peer-focus:text-[#FF8C00] peer-not-placeholder-shown:-top-4 peer-not-placeholder-shown:text-[9px] peer-not-placeholder-shown:text-[#FF8C00] pointer-events-none">
                     NODE_OPERATOR_ALIAS [DISPLAY NAME]
                   </label>
                   <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#FF8C00] peer-focus:w-full transition-all duration-500 shadow-[0_0_10px_#FF8C00]"></div>
                </div>
            )}

            {/* Email Field */}
            <div className="relative group">
               <input
                 type="email"
                 required
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className={`peer block w-full px-0 py-2 bg-transparent border-0 border-b border-[#222] font-mono text-sm tracking-wider focus:outline-none focus:ring-0 transition-colors shadow-none hover:border-[#444] ${mode === 'signup' ? 'text-[#FF8C00] focus:border-[#FF8C00]' : 'text-[#00E5FF] focus:border-[#00E5FF]'}`}
                 placeholder=" "
               />
               <label className={`absolute left-0 top-2 text-[#888] font-mono text-[11px] uppercase tracking-[0.2em] transition-all duration-300 peer-focus:-top-4 peer-focus:text-[9px] peer-not-placeholder-shown:-top-4 peer-not-placeholder-shown:text-[9px] pointer-events-none ${mode === 'signup' ? 'peer-focus:text-[#FF8C00] peer-not-placeholder-shown:text-[#FF8C00]' : 'peer-focus:text-[#00E5FF] peer-not-placeholder-shown:text-[#00E5FF]'}`}>
                 SYSTEM_ID [EMAIL]
               </label>
               <div className={`absolute bottom-0 left-0 h-[1px] w-0 peer-focus:w-full transition-all duration-500 ${mode === 'signup' ? 'bg-[#FF8C00] shadow-[0_0_10px_#FF8C00]' : 'bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]'}`}></div>
            </div>

            {/* Password Field */}
            <div className="relative group">
               <input
                 type="password"
                 required
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="peer block w-full px-0 py-2 bg-transparent border-0 border-b border-[#222] text-[#ADFF2F] font-mono text-lg tracking-[0.4em] focus:outline-none focus:ring-0 focus:border-[#ADFF2F] transition-colors shadow-none hover:border-[#444]"
                 placeholder=" "
               />
               <label className="absolute left-0 top-2 text-[#888] font-mono text-[11px] uppercase tracking-[0.2em] transition-all duration-300 peer-focus:-top-4 peer-focus:text-[9px] peer-focus:text-[#ADFF2F] peer-not-placeholder-shown:-top-4 peer-not-placeholder-shown:text-[9px] peer-not-placeholder-shown:text-[#ADFF2F] pointer-events-none">
                 BIOMETRIC_KEY [PASSWORD]
               </label>
               <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#ADFF2F] peer-focus:w-full transition-all duration-500 shadow-[0_0_10px_#ADFF2F]"></div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {mode === 'login' ? (
                <>
                  <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
                    <div className={`w-8 h-4 border transition-colors flex items-center px-0.5 ${rememberMe ? 'border-[#00E5FF] bg-[#00E5FF]/10' : 'border-[#333] bg-[#111]'}`}>
                       <div className={`w-2 h-2 bg-current transform transition-transform ${rememberMe ? 'text-[#00E5FF] translate-x-4 shadow-[0_0_5px_#00E5FF]' : 'text-[#555] translate-x-0'}`}></div>
                    </div>
                    <label className="text-[9px] font-mono text-[#888] tracking-[0.2em] uppercase group-hover:text-[#E0E0E0] cursor-pointer">
                      Persist Session
                    </label>
                  </div>
                  <a href="#" className="text-[9px] font-mono text-[#CC0000] tracking-[0.2em] uppercase hover:text-[#FF4444] hover:drop-shadow-[0_0_5px_#FF4444] transition-all">
                    Override Code?
                  </a>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setEnable2FA(!enable2FA)}>
                    <div className={`w-8 h-4 border transition-colors flex items-center px-0.5 ${enable2FA ? 'border-[#FF8C00] bg-[#FF8C00]/10' : 'border-[#333] bg-[#111]'}`}>
                       <div className={`w-2 h-2 bg-current transform transition-transform ${enable2FA ? 'text-[#FF8C00] translate-x-4 shadow-[0_0_5px_#FF8C00]' : 'text-[#555] translate-x-0'}`}></div>
                    </div>
                    <label className="text-[9px] font-mono text-[#888] tracking-[0.2em] uppercase group-hover:text-[#E0E0E0] cursor-pointer">
                      REQUEST_MULTISIG_LAYER [ENABLE 2FA]
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-2 group">
                    <Globe className="w-3 h-3 text-[#FF8C00]" />
                    <select 
                       className="bg-transparent border-0 border-b border-[#333] text-[#FF8C00] font-mono text-[9px] tracking-[0.2em] focus:outline-none focus:ring-0 uppercase cursor-pointer"
                       value={network}
                       onChange={(e) => setNetwork(e.target.value)}
                    >
                       <option value="INR" className="bg-[#111] text-[#00E5FF]">[{'\u20B9'}] INR</option>
                       <option value="USD" className="bg-[#111] text-[#00E5FF]">[$] USD</option>
                       <option value="EUR" className="bg-[#111] text-[#00E5FF]">[{'\u20AC'}] EUR</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="pt-6 relative group/btn">
              {/* Outer Button Glow wrapper */}
              <div className={`absolute inset-0 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 ease-out z-0 pointer-events-none blur-[10px] opacity-0 group-hover/btn:opacity-60 ${mode === 'signup' ? 'bg-[#FF8C00]' : 'bg-[#FF8C00]'}`}></div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full relative flex justify-center py-4 px-4 border overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'signup' ? 'bg-[#1A0A00] border-[#FF8C00]/50 hover:border-[#FFD700] shadow-[inset_0_0_15px_rgba(255,140,0,0.2)] hover:shadow-[inset_0_0_30px_rgba(255,215,0,0.4)]' : 'bg-[#1A0000] border-[#CC0000]/50 hover:border-[#FF8C00] shadow-[inset_0_0_15px_rgba(204,0,0,0.2)] hover:shadow-[inset_0_0_30px_rgba(255,140,0,0.4)]'}`}
              >
                {/* Internal Hover Fill */}
                <div className={`absolute inset-0 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 ease-out pointer-events-none ${mode === 'signup' ? 'bg-gradient-to-t from-[#FFD700]/30 to-transparent' : 'bg-gradient-to-t from-[#FF8C00]/40 to-transparent'}`}></div>

                {isSubmitting ? (
                  <div className="flex items-center text-[#00E5FF] font-mono tracking-widest text-[11px] drop-shadow-[0_0_8px_#00E5FF]">
                     <Scan className="w-5 h-5 animate-spin mr-3" />
                     {mode === 'signup' ? 'PROVISIONING...' : 'VERIFYING_CREDENTIALS...'}
                  </div>
                ) : isVerified ? (
                  <div className="flex items-center text-[#ADFF2F] font-mono font-bold tracking-[0.3em] text-[12px] drop-shadow-[0_0_10px_#ADFF2F]">
                     <Fingerprint className="w-5 h-5 mr-3 animate-pulse" />
                     {mode === 'signup' ? 'NODE_CREATED' : 'ACCESS_GRANTED'}
                  </div>
                ) : (
                  <span className={`relative z-10 text-[11px] font-mono font-bold tracking-[0.3em] uppercase drop-shadow-[0_0_5px_currentColor] transition-colors ${mode === 'signup' ? 'text-[#FF8C00] group-hover/btn:text-[#FFD700]' : 'text-[#CC0000] group-hover/btn:text-[#FF8C00]'}`}>
                    {mode === 'signup' ? 'INITIATE_NODE_CREATION_PROTOCOL' : 'Execute Safe-Login'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Terminal decorative footer */}
        <div className="mt-4 flex justify-between px-2 text-[8px] font-mono text-[#00E5FF]/40 tracking-widest uppercase pointer-events-none">
           <span>
             SYNC: <RapidCounter target={9824} active={mounted} />ms
           </span>
           <span>LAT: 34.0522 N / LONG: 118.2437 W</span>
        </div>
      </div>
    </div>
  );
}
