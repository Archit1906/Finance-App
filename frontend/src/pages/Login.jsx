import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, Scan, Fingerprint, Lock } from 'lucide-react';

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

export default function Login() {
  const [email, setEmail] = useState('demo@wealth.os');
  const [password, setPassword] = useState('password123'); // Defaulted for easy access
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      setIsVerified(true);
      // Wait for the 3D Vault Spin transition to execute, then layout will native-route via AuthContext anyway if the token updates.
      // We'll give it a strict delay so the spin animation resolves visually.
      setTimeout(() => {}, 800); 
    } catch (err) {
      setError(err.response?.data?.error || 'Authorization Failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-vault-blueprint relative overflow-hidden group/vault">
      
      {/* Central Glass Terminal */}
      <div className={`sm:mx-auto sm:w-full sm:max-w-md relative z-10 transition-all duration-700 ${isVerified ? 'animate-vault-spin' : 'opacity-100'}`}>
        
        {/* Terminal Header */}
        <div className="flex flex-col items-center mb-8 relative">
          <div className="w-24 h-24 mb-6 rounded-2xl flex items-center justify-center relative">
             <div className="absolute inset-0 border border-[#00E5FF]/20 rounded-2xl transform rotate-45 animate-pulse shadow-[inset_0_0_20px_rgba(0,229,255,0.1)]"></div>
             <Wallet className="w-12 h-12 text-[#CC0000] relative z-10 animate-ignition drop-shadow-[0_0_15px_#CC0000]" />
          </div>
          
          <h2 className="text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#ADFF2F] drop-shadow-md pb-1">
             <TypewriterText text="SIGN_IN_TO_WEALTH_OS" active={mounted} delay={0.2} />
          </h2>
          
          <Link to="/register" className="mt-4 font-mono font-bold text-[10px] uppercase tracking-[0.3em] text-[#00E5FF]/80 hover:text-[#00E5FF] hover:drop-shadow-[0_0_8px_#00E5FF] transition-all border border-[#00E5FF]/20 px-4 py-2 bg-[#00E5FF]/5">
            INITIATE_NEW_NODE_REGISTRATION
          </Link>
        </div>

        {/* Data Entry Panel */}
        <div className="bg-[#050B0D]/80 backdrop-blur-xl py-8 px-6 shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(0,229,255,0.15)] sm:rounded-none sm:px-10 border border-[#00E5FF]/30 relative overflow-hidden">
          
          {/* Subtle moving scanline in the card edge */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent translate-x-[-100%] animate-[scan_3s_linear_infinite]"></div>

          <form className="space-y-8 relative z-10" onSubmit={handleSubmit}>
            
            {error && (
              <div className="p-3 bg-[#110000] border-l-2 border-[#FF4444] text-[#FF4444] font-mono text-[11px] tracking-widest flex items-center shadow-[0_0_15px_rgba(255,68,68,0.2)]">
                <Lock className="w-4 h-4 mr-3 shrink-0" />
                {error}
              </div>
            )}
            
            {/* Email Field */}
            <div className="relative group">
               <input
                 type="email"
                 required
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="peer block w-full px-0 py-2 bg-transparent border-0 border-b border-[#222] text-[#00E5FF] font-mono text-sm tracking-wider focus:outline-none focus:ring-0 focus:border-[#00E5FF] transition-colors shadow-none hover:border-[#444]"
                 placeholder=" "
               />
               <label className="absolute left-0 top-2 text-[#888] font-mono text-[11px] uppercase tracking-[0.2em] transition-all duration-300 peer-focus:-top-4 peer-focus:text-[9px] peer-focus:text-[#00E5FF] peer-not-placeholder-shown:-top-4 peer-not-placeholder-shown:text-[9px] peer-not-placeholder-shown:text-[#00E5FF] pointer-events-none">
                 SYSADM_ID [EMAIL]
               </label>
               <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#00E5FF] peer-focus:w-full transition-all duration-500 shadow-[0_0_10px_#00E5FF]"></div>
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
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
                {/* Cyber Toggle */}
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
            </div>

            <div className="pt-6 relative group/btn">
              {/* Outer Button Glow wrapper */}
              <div className="absolute inset-0 bg-[#FF8C00] translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 ease-out z-0 pointer-events-none blur-[10px] opacity-0 group-hover/btn:opacity-60"></div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full relative flex justify-center py-4 px-4 border border-[#CC0000]/50 bg-[#1A0000] overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover/btn:border-[#FF8C00] shadow-[inset_0_0_15px_rgba(204,0,0,0.2)] group-hover/btn:shadow-[inset_0_0_30px_rgba(255,140,0,0.4)]"
              >
                {/* Internal Hover Fill */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#FF8C00]/40 to-transparent translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 ease-out pointer-events-none"></div>

                {isSubmitting ? (
                  <div className="flex items-center text-[#00E5FF] font-mono tracking-widest text-[11px] drop-shadow-[0_0_8px_#00E5FF]">
                     <Scan className="w-5 h-5 animate-spin mr-3" />
                     VERIFYING_CREDENTIALS...
                  </div>
                ) : isVerified ? (
                  <div className="flex items-center text-[#ADFF2F] font-mono font-bold tracking-[0.3em] text-[12px] drop-shadow-[0_0_10px_#ADFF2F]">
                     <Fingerprint className="w-5 h-5 mr-3 animate-pulse" />
                     ACCESS_GRANTED
                  </div>
                ) : (
                  <span className="relative z-10 text-[11px] font-mono font-bold text-[#CC0000] group-hover/btn:text-[#FF8C00] tracking-[0.3em] uppercase drop-shadow-[0_0_5px_currentColor]">
                    Execute Safe-Login
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Terminal decorative footer */}
        <div className="mt-4 flex justify-between px-2 text-[8px] font-mono text-[#00E5FF]/40 tracking-widest uppercase pointer-events-none">
           <span>v2.0.1_BETA_SECURE</span>
           <span>LAT: 34.0522 N / LONG: 118.2437 W</span>
        </div>
      </div>
    </div>
  );
}
