import { useState } from "react";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Splash screen progress states
  const [splashActive, setSplashActive] = useState(false);
  const [splashPercent, setSplashPercent] = useState(5);
  const [splashText, setSplashText] = useState("Connecting to high-speed relay network...");

  const runSplashAndLogin = (targetEmail: string, targetPass: string) => {
    setSplashActive(true);
    setLoading(true);
    setError("");

    const stages = [
      { percent: 10, text: "Verifying credentials... SSL/TLS Handshake" },
      { percent: 35, text: "Authenticating token sequence... Authorizing" },
      { percent: 65, text: "Initiating SMS gateway channels... Ready" },
      { percent: 85, text: "Synchronizing Cafe Chai localized segment data..." },
      { percent: 100, text: "Handshake completed. Redirecting to workspace..." }
    ];

    let currentStage = 0;
    const timer = setInterval(() => {
      if (currentStage < stages.length) {
        setSplashPercent(stages[currentStage].percent);
        setSplashText(stages[currentStage].text);
        currentStage++;
      } else {
        clearInterval(timer);
        onLogin(targetEmail, targetPass)
          .catch((err: unknown) => {
            setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
            setSplashActive(false);
            setLoading(false);
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 400);
          });
      }
    }, 500); // 2.5 seconds total splash transition
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email address is required.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }
    if (!password) {
      setError("Password is required.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }

    runSplashAndLogin(email.trim(), password);
  };

  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen flex flex-col overflow-x-hidden antialiased">
      {/* Main Container */}
      <main className="flex-grow flex flex-col relative justify-center">
        <section className="flex-grow flex flex-col items-center justify-center p-4 sm:p-10 min-h-[calc(100vh-40px)] relative overflow-hidden bg-[#f3f7f7]">
          {/* Animated Ambient Orbs */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-brand/10 filter blur-[80px] sm:blur-[120px] pointer-events-none animate-pulse duration-[8s]"></div>
          <div className="absolute bottom-1/4 left-1/3 w-64 sm:w-[350px] h-64 sm:h-[350px] rounded-full bg-brand-accent/5 filter blur-[60px] sm:blur-[90px] pointer-events-none"></div>

          {/* Centered card container */}
          <div className="w-full max-w-[450px] bg-white rounded-[32px] overflow-hidden shadow-2xl shadow-slate-350/80 border border-slate-100 z-10 transition-transform duration-300 hover:scale-[1.01]">
            {/* Header Block */}
            <div className="bg-gradient-to-b from-[#004953] to-[#003e47] px-6 py-12 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-brand-200 to-transparent pointer-events-none"></div>

              {/* SMS Envelope Badge */}
              <div className="w-20 h-20 bg-white rounded-[24px] shadow-lg flex items-center justify-center mb-4 border border-brand-100/50 transform hover:rotate-6 transition-transform duration-300">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
                  <i className="fa-solid fa-comment-sms text-brand text-2xl animate-pulse"></i>
                </div>
              </div>

              {/* Title & Subtitle */}
              <h1 className="text-white text-3xl font-extrabold tracking-tight">SMSBlast</h1>
              <p className="text-brand-100/90 text-xs tracking-wider uppercase font-semibold mt-1">Cafe Management System</p>
            </div>

            {/* Form & Actions Body */}
            <div className="p-8 sm:p-10 space-y-6 bg-white">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-800">Welcome Back!</h2>
                <p className="text-slate-400 text-xs sm:text-sm font-medium">Sign in to access your campaign dashboard</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Input Group */}
                <div className={`space-y-1.5 ${isShaking ? "shake-animation" : ""}`}>
                  <label htmlFor="emailInput" className="text-xs font-bold text-slate-500 tracking-wide">Username</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand transition-colors duration-200">
                      <i className="fa-solid fa-user text-sm"></i>
                    </div>
                    <input 
                      type="email" 
                      id="emailInput" 
                      required
                      className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand shadow-sm transition-all duration-200 text-xs font-semibold"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password Input Group */}
                <div className={`space-y-1.5 ${isShaking ? "shake-animation" : ""}`}>
                  <div className="flex justify-between items-center">
                    <label htmlFor="passwordInput" className="text-xs font-bold text-slate-500 tracking-wide">Password</label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setError("Password reset tokens inside sandbox route back directly to local console log files.");
                      }} 
                      className="text-[11px] font-bold text-brand hover:text-brand-700 hover:underline transition-colors duration-200"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand transition-colors duration-200">
                      <i className="fa-solid fa-lock text-sm"></i>
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      id="passwordInput" 
                      required
                      className="block w-full pl-11 pr-10 py-3.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand shadow-sm transition-all duration-200 text-xs font-semibold"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowPassword(!showPassword);
                      }} 
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-brand transition-colors duration-200 focus:outline-none"
                    >
                      <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`}></i>
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-center gap-2.5 shadow-sm transition-all duration-300">
                    <i className="fa-solid fa-triangle-exclamation text-rose-500 text-sm"></i>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit button */}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#004953] to-[#003e47] hover:from-[#003e47] hover:to-[#00292f] active:from-[#00292f] active:to-[#001e23] text-white font-bold py-3.5 px-5 rounded-2xl shadow-lg shadow-brand/20 hover:shadow-brand/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{loading ? "Verifying..." : "Sign In"}</span>
                  <i className="fa-solid fa-arrow-right-to-bracket text-brand-accent"></i>
                </button>
              </form>
            </div>
          </div>

          {/* Footer system details */}
          <div className="mt-8 text-center text-xs text-slate-400 font-semibold space-y-1 z-10">
            <p>&copy; 2026 SMSBlast Cafe Management System</p>
            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <i className="fa-solid fa-shield-halved text-brand"></i>
                <span>End-to-End Cryptography</span>
              </span>
              <span>&bull;</span>
              <span>v2.4.1-Prod</span>
            </div>
          </div>
        </section>
      </main>

      {/* Full screen authentication progress splash page */}
      {splashActive && (
        <section className="fixed inset-0 z-50 bg-brand flex flex-col items-center justify-center text-white p-8 animate-gradient">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-600/30 to-brand-900/90 pointer-events-none"></div>

          <div className="text-center space-y-6 max-w-md relative z-10">
            {/* Glowing satellite logo frame */}
            <div className="relative inline-block">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-brand-accent to-emerald-400 blur opacity-75 animate-pulse"></div>
              <div className="relative w-20 h-20 rounded-full bg-brand-800 border-2 border-brand-300/30 flex items-center justify-center shadow-2xl">
                <i className="fa-solid fa-satellite-dish text-brand-accent text-3xl animate-bounce"></i>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight text-white">SECURE AUTHENTICATION</h3>
              <p className="text-brand-200 text-xs sm:text-sm font-mono">{splashText}</p>
            </div>

            {/* Custom progress runner */}
            <div className="w-full bg-brand-800/85 rounded-full h-2.5 p-0.5 border border-white/5 shadow-inner">
              <div 
                className="bg-gradient-to-r from-brand-accent to-emerald-400 h-1.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${splashPercent}%` }}
              ></div>
            </div>

            <div className="text-[10px] text-brand-300 uppercase tracking-widest font-semibold flex justify-between items-center">
              <span>Establishing TLS Tunnel</span>
              <span>100% Secure</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
