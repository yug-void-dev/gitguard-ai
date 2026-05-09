import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, Cpu, GitPullRequest, Zap, ShieldCheck } from 'lucide-react';
import ParticleBackground from './components/ParticleBackground';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: 'easeOut', delay },
});

const StatBadge = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3">
    <div className={`p-2 rounded-xl ${color}`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div>
      <p className="text-xs text-white/50 leading-none mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-white leading-none">{value}</p>
    </div>
  </div>
);

function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{ background: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(120,50,255,0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 110%, rgba(6,182,212,0.2) 0%, transparent 60%), #08080f' }}
    >
      <ParticleBackground />

      {/* Ambient glow blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)' }} />
      <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)' }} />

      {/* Outer glass shell */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[1060px] rounded-[32px] overflow-hidden flex flex-col md:flex-row"
        style={{
          background: 'rgba(255,255,255,0.035)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >

        {/* ── LEFT: Login form ── */}
        <div className="w-full md:w-[48%] flex flex-col justify-center p-9 md:p-14">

          {/* Brand */}
          <motion.div {...fadeUp(0)} className="flex items-center gap-3 mb-10">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl blur-md opacity-70"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }} />
              <div className="relative p-2.5 rounded-xl"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                <Shield className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight"
              style={{ background: 'linear-gradient(90deg,#c4b5fd,#67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              GitGuard AI
            </span>
          </motion.div>

          {/* Heading */}
          <motion.div {...fadeUp(0.1)} className="mb-8">
            <h1 className="text-[2rem] font-bold text-white leading-tight mb-2">Welcome Back</h1>
            <p className="text-sm text-white/40">Sign in to access your AI sentinel dashboard.</p>
          </motion.div>

          {/* Form */}
          <motion.form {...fadeUp(0.2)} onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/40 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors"
                  style={{ color: email ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}>
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/20 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    backdropFilter: 'blur(10px)',
                  }}
                  onFocus={e => {
                    e.target.style.border = '1px solid rgba(167,139,250,0.6)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.border = '1px solid rgba(255,255,255,0.09)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/40 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors"
                  style={{ color: password ? '#67e8f9' : 'rgba(255,255,255,0.3)' }}>
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl py-3.5 pl-11 pr-12 text-sm text-white placeholder:text-white/20 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    backdropFilter: 'blur(10px)',
                  }}
                  onFocus={e => {
                    e.target.style.border = '1px solid rgba(103,232,249,0.6)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.border = '1px solid rgba(255,255,255,0.09)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative w-4 h-4">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="w-4 h-4 rounded-md border peer-checked:border-transparent transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  </div>
                </div>
                <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">Remember me</span>
              </label>
              <a href="#"
                className="text-xs font-medium transition-colors hover:underline"
                style={{ color: '#a78bfa', textDecorationColor: 'rgba(167,139,250,0.4)' }}>
                Forgot password?
              </a>
            </div>

            {/* Sign In Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full relative overflow-hidden rounded-xl py-3.5 font-semibold text-sm text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
                boxShadow: isLoading ? 'none' : '0 0 28px rgba(139,92,246,0.4), 0 4px 20px rgba(6,182,212,0.2)',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }} />
              <div className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </div>
            </motion.button>
          </motion.form>

          {/* Divider */}
          <motion.div {...fadeUp(0.35)} className="flex items-center gap-4 my-7">
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-[11px] uppercase tracking-widest font-medium text-white/25">or continue with</span>
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </motion.div>

          {/* GitHub Button */}
          <motion.button
            {...fadeUp(0.4)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-medium text-white/70 hover:text-white transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(10px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.18)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </motion.button>

          <motion.p {...fadeUp(0.45)} className="text-center text-xs text-white/25 mt-8">
            Don't have an account?{' '}
            <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">Request Access</a>
          </motion.p>
        </div>

        {/* ── RIGHT: Glassmorphism Visual Panel ── */}
        <div className="hidden md:flex w-[52%] flex-col relative overflow-hidden">

          {/* Image with gradient overlay */}
          <div className="absolute inset-0">
            <img
              src="/ai-bot.png"
              alt="GitGuard AI Sentinel"
              className="w-full h-full object-cover object-center"
              style={{ filter: 'brightness(0.75) saturate(1.2)' }}
            />
            {/* Glass tint overlays */}
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(6,182,212,0.15) 100%)' }} />
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, rgba(8,8,15,0.1) 0%, rgba(8,8,15,0.7) 100%)' }} />
            {/* Left fade to blend with form */}
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to right, rgba(8,8,15,0.55) 0%, transparent 40%)' }} />
          </div>

          {/* Top badge */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="relative m-7 self-end"
          >
            <div className="flex items-center gap-2 rounded-full px-4 py-2"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
              }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-white/80 tracking-wide">AI Sentinel Active</span>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="relative flex flex-col gap-3 mx-7 mt-auto"
          >
            <div className="grid grid-cols-2 gap-3">
              <StatBadge icon={GitPullRequest} label="PRs Analyzed" value="1,248" color="bg-violet-500/30" />
              <StatBadge icon={ShieldCheck} label="Threats Blocked" value="372" color="bg-cyan-500/30" />
              <StatBadge icon={Zap} label="Avg Response" value="0.9s" color="bg-amber-500/30" />
              <StatBadge icon={Cpu} label="Model" value="LLM v2.1" color="bg-pink-500/30" />
            </div>

            {/* Bottom card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="mb-7 mt-1 rounded-2xl p-5"
              style={{
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.11)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 40px rgba(0,0,0,0.3)',
              }}
            >
              <h2 className="text-lg font-bold text-white mb-1.5">Automated PR Sentinel</h2>
              <p className="text-sm text-white/45 leading-relaxed">
                Analyzes code diffs in real-time, detects security vulnerabilities, and posts AI-generated fix suggestions directly to your GitHub PRs.
              </p>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/40 mb-1.5">
                  <span>Security Score</span>
                  <span className="text-emerald-400 font-semibold">98.4%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '98.4%' }}
                    transition={{ delay: 1, duration: 1.2, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)' }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default App;
