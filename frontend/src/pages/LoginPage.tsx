import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useAuth } from '../hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  login: string;
  email: string;
  password: string;
  confirmPassword: string;
  rememberMe: boolean;
}

type Tab = 'login' | 'register';

// ─── Animated Left Graphic ────────────────────────────────────────────────────

const SentinelGraphic: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Orbiting rings
    interface Ring { radius: number; speed: number; angle: number; nodeCount: number; r: number; g: number; b: number; }
    const rings: Ring[] = [
      { radius: 70,  speed:  0.009, angle: 0,   nodeCount: 5, r: 99,  g: 102, b: 241 },
      { radius: 115, speed: -0.006, angle: 1.2, nodeCount: 7, r: 34,  g: 211, b: 238 },
      { radius: 162, speed:  0.004, angle: 2.4, nodeCount: 9, r: 129, g: 140, b: 248 },
    ];

    // Floating sparks
    interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; sz: number; r: number; g: number; b: number; }
    const sparks: Spark[] = [];
    const SPARK_COLS = [[99,102,241],[34,211,238],[129,140,248],[167,139,250],[56,189,248]];

    const spawnSpark = (W: number, H: number) => {
      const cx = W/2; const cy = H/2;
      const a = Math.random() * Math.PI * 2;
      const d = 50 + Math.random() * 180;
      const col = SPARK_COLS[Math.floor(Math.random() * SPARK_COLS.length)];
      sparks.push({
        x: cx + Math.cos(a)*d, y: cy + Math.sin(a)*d,
        vx: (Math.random()-0.5)*0.5, vy: -0.25 - Math.random()*0.5,
        life: 0, max: 100 + Math.random()*80,
        sz: 1 + Math.random()*2.5,
        r: col[0], g: col[1], b: col[2],
      });
    };

    // Hex grid cells — computed once
    interface HexCell { x: number; y: number; po: number; }
    let hexCells: HexCell[] = [];
    let lastW = 0; let lastH = 0;

    const buildHex = (W: number, H: number) => {
      hexCells = [];
      const s = 28; const hh = s * Math.sqrt(3);
      for (let row = -1; row < H/hh + 2; row++) {
        for (let col = -1; col < W/(s*1.5) + 2; col++) {
          hexCells.push({ x: col*s*1.5, y: row*hh+(col%2===0?0:hh/2), po: Math.random()*Math.PI*2 });
        }
      }
      lastW = W; lastH = H;
    };

    const drawHex = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI/3)*i - Math.PI/6;
        i === 0 ? ctx.moveTo(x+s*Math.cos(a), y+s*Math.sin(a)) : ctx.lineTo(x+s*Math.cos(a), y+s*Math.sin(a));
      }
      ctx.closePath();
    };

    // Scan
    let scanA = 0;

    // Data streams
    interface Stream { angle: number; len: number; spd: number; prog: number; }
    const streams: Stream[] = Array.from({ length: 14 }, (_, i) => ({
      angle: (Math.PI*2/14)*i, len: 35+Math.random()*55,
      spd: 0.005+Math.random()*0.007, prog: Math.random(),
    }));

    let frame = 0;

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      tRef.current += 0.016;
      const t = tRef.current;
      frame++;

      if (frame % 5 === 0) spawnSpark(W, H);
      if (W !== lastW || H !== lastH) buildHex(W, H);

      ctx.clearRect(0, 0, W, H);

      // BG
      const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.75);
      bg.addColorStop(0, 'rgba(18,12,50,1)');
      bg.addColorStop(0.55, 'rgba(9,7,28,1)');
      bg.addColorStop(1, 'rgba(2,4,12,1)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Hex grid
      hexCells.forEach(cell => {
        const a = 0.025 * (0.6 + 0.4*Math.sin(t*0.5+cell.po));
        ctx.strokeStyle = `rgba(99,102,241,${a})`;
        ctx.lineWidth = 0.5;
        drawHex(ctx, cell.x, cell.y, 26);
        ctx.stroke();
      });

      const cx = W/2; const cy = H/2;

      // Ambient glow
      const aGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 240);
      aGlow.addColorStop(0, 'rgba(79,70,229,0.12)');
      aGlow.addColorStop(0.6, 'rgba(34,211,238,0.04)');
      aGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = aGlow;
      ctx.beginPath(); ctx.arc(cx, cy, 240, 0, Math.PI*2); ctx.fill();

      // Rings
      rings.forEach(ring => {
        ring.angle += ring.speed;
        const {r,g,b} = ring;

        // Track
        ctx.beginPath(); ctx.arc(cx, cy, ring.radius, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.1)`; ctx.lineWidth = 1; ctx.stroke();

        // Nodes
        for (let i = 0; i < ring.nodeCount; i++) {
          const a = ring.angle + (Math.PI*2/ring.nodeCount)*i;
          const nx = cx + Math.cos(a)*ring.radius;
          const ny = cy + Math.sin(a)*ring.radius;
          const pulse = 0.5 + 0.5*Math.sin(t*2.2 + i*1.1);

          // Glow halo
          const ng = ctx.createRadialGradient(nx,ny,0,nx,ny,9);
          ng.addColorStop(0, `rgba(${r},${g},${b},${0.35*pulse})`);
          ng.addColorStop(1, 'transparent');
          ctx.beginPath(); ctx.arc(nx,ny,9,0,Math.PI*2);
          ctx.fillStyle = ng; ctx.fill();

          // Core dot
          ctx.beginPath(); ctx.arc(nx,ny,2+pulse*1.5,0,Math.PI*2);
          ctx.fillStyle = `rgba(${r},${g},${b},${0.55+pulse*0.45})`; ctx.fill();
        }

        // Bright arc
        ctx.beginPath();
        ctx.arc(cx, cy, ring.radius, ring.angle-0.05, ring.angle+0.7);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.75)`; ctx.lineWidth = 2; ctx.stroke();
      });

      // Radar sweep
      scanA += 0.013;
      ctx.save(); ctx.translate(cx, cy);
      const sweepG = ctx.createLinearGradient(0, 0, 190, 0);
      sweepG.addColorStop(0, 'rgba(34,211,238,0.2)');
      sweepG.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.rotate(scanA);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,190,-0.3,0,false); ctx.closePath();
      ctx.fillStyle = sweepG; ctx.fill();
      ctx.restore();

      ctx.beginPath(); ctx.arc(cx,cy,190,0,Math.PI*2);
      ctx.strokeStyle = 'rgba(34,211,238,0.05)'; ctx.lineWidth = 1; ctx.stroke();

      // Streams
      streams.forEach(s => {
        s.prog += s.spd;
        if (s.prog > 1) s.prog = 0;
        const sr = 36; const er = sr + s.len;
        const pr = sr + (er-sr)*s.prog;
        const sx = cx + Math.cos(s.angle)*sr; const sy = cy + Math.sin(s.angle)*sr;
        const ex = cx + Math.cos(s.angle)*pr; const ey = cy + Math.sin(s.angle)*pr;
        const lg = ctx.createLinearGradient(sx,sy,ex,ey);
        lg.addColorStop(0,'transparent'); lg.addColorStop(1,`rgba(99,102,241,${0.45*s.prog})`);
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey);
        ctx.strokeStyle=lg; ctx.lineWidth=1; ctx.stroke();
      });

      // Core shield
      ctx.save(); ctx.translate(cx,cy);
      const sp = 0.92 + 0.08*Math.sin(t*1.6);
      ctx.scale(sp,sp);

      const sg = ctx.createRadialGradient(0,0,0,0,0,38);
      sg.addColorStop(0,'rgba(99,102,241,0.3)'); sg.addColorStop(1,'transparent');
      ctx.beginPath(); ctx.arc(0,0,38,0,Math.PI*2); ctx.fillStyle=sg; ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0,-24); ctx.lineTo(20,-13); ctx.lineTo(20,5);
      ctx.quadraticCurveTo(20,26,0,31);
      ctx.quadraticCurveTo(-20,26,-20,5); ctx.lineTo(-20,-13); ctx.closePath();
      const sf = ctx.createLinearGradient(0,-24,0,31);
      sf.addColorStop(0,'rgba(99,102,241,0.55)'); sf.addColorStop(1,'rgba(34,211,238,0.35)');
      ctx.fillStyle=sf; ctx.fill();
      ctx.strokeStyle='rgba(165,180,252,0.85)'; ctx.lineWidth=1.5; ctx.stroke();

      ctx.beginPath(); ctx.moveTo(-8,3); ctx.lineTo(-1,11); ctx.lineTo(10,-6);
      ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=2.2;
      ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke();
      ctx.restore();

      // Sparks
      for (let i = sparks.length-1; i >= 0; i--) {
        const p = sparks[i];
        p.x+=p.vx; p.y+=p.vy; p.life++;
        if (p.life > p.max) { sparks.splice(i,1); continue; }
        const lr = p.life/p.max;
        const alpha = lr<0.2 ? lr/0.2 : 1-(lr-0.2)/0.8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.sz*(1-lr*0.4), 0, Math.PI*2);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha*0.65})`; ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block' }}
    />
  );
};

// ─── Input Field Component ────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  name: keyof FormData;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  suffix?: React.ReactNode;
  autoComplete?: string;
  required?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, name, type='text', placeholder, value, onChange, icon, suffix, autoComplete, required }) => {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{
        fontFamily:"'JetBrains Mono',monospace", fontSize:10,
        textTransform:'uppercase' as const, letterSpacing:'1.2px',
        color: active ? 'rgba(165,180,252,0.85)' : 'rgba(148,163,184,0.45)',
        paddingLeft:2, transition:'color 0.2s',
      }}>{label}</label>
      <div style={{ position:'relative' }}>
        <span style={{
          position:'absolute', left:13, top:'50%', transform:'translateY(-50%)',
          color: focused ? '#818cf8' : 'rgba(148,163,184,0.35)',
          transition:'color 0.2s', display:'flex', alignItems:'center', pointerEvents:'none',
        }}>{icon}</span>
        <input
          type={type} name={name} value={value} onChange={onChange}
          placeholder={placeholder} required={required} autoComplete={autoComplete}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width:'100%',
            background: focused ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.08)',
            border:`1px solid ${focused ? 'rgba(99,102,241,0.65)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius:10,
            padding:`11px 14px 11px 42px`,
            paddingRight: suffix ? 42 : 14,
            color:'#e2e8f0',
            fontFamily:"'JetBrains Mono',monospace",
            fontSize:13,
            outline:'none',
            transition:'all 0.2s ease',
            boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.13)' : 'none',
            boxSizing:'border-box' as const,
          }}
        />
        {suffix && (
          <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', display:'flex', alignItems:'center' }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Eye Toggle ───────────────────────────────────────────────────────────────

const EyeToggle: React.FC<{ show: boolean; onToggle: () => void }> = ({ show, onToggle }) => (
  <button type="button" onClick={onToggle} style={{
    background:'none', border:'none', cursor:'pointer',
    color:'rgba(148,163,184,0.4)', display:'flex', alignItems:'center', padding:0,
    transition:'color 0.2s',
  }}
    onMouseEnter={e=>(e.currentTarget.style.color='rgba(165,180,252,0.8)')}
    onMouseLeave={e=>(e.currentTarget.style.color='rgba(148,163,184,0.4)')}
  >
    {show
      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    }
  </button>
);

// ─── Icon helpers ─────────────────────────────────────────────────────────────

const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const { user, login, register, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [init, setInit] = useState(false);
  const [tab, setTab] = useState<Tab>('login');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    login: localStorage.getItem('gg_remembered_login') || '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: !!localStorage.getItem('gg_remembered_login')
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesOptions = useMemo(() => ({
    background: { color: { value: "transparent" } },
    fpsLimit: 120,
    interactivity: {
      events: {
        onHover: { enable: true, mode: "grab" },
      },
      modes: {
        grab: { distance: 140, links: { opacity: 0.5 } },
      },
    },
    particles: {
      color: { value: "#818cf8" },
      links: {
        color: "#818cf8",
        distance: 150,
        enable: true,
        opacity: 0.2,
        width: 1,
      },
      move: {
        direction: "none" as const,
        enable: true,
        outModes: { default: "bounce" as const },
        random: true,
        speed: 1,
        straight: false,
      },
      number: { density: { enable: true }, value: 80 },
      opacity: { value: 0.3 },
      shape: { type: "circle" },
      size: { value: { min: 1, max: 3 } },
    },
    detectRetina: true,
  }), []);

  useEffect(() => { const t = setTimeout(()=>setMounted(true),80); return ()=>clearTimeout(t); }, []);
  useEffect(() => { setShowPass(false); setShowConfirm(false); }, [tab]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (tab === 'login') {
        await login({ login: formData.login, password: formData.password });

        if (formData.rememberMe) {
          localStorage.setItem('gg_remembered_login', formData.login);
        } else {
          localStorage.removeItem('gg_remembered_login');
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords don't match");
        }
        if (formData.password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        await register({ login: formData.login, email: formData.email, password: formData.password });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGitHub = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    window.location.href = `${baseUrl}/auth/github`;
  };

  return (
    <>
      <div className="gg-root">

        {/* LEFT */}
        <div className="gg-left">
          <SentinelGraphic />
          <div className="gg-left-veil" />
          <div className="gg-left-edge" />
          <div className="gg-left-body">

            <div className="gg-brand">
              <div className="gg-brand-ico">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <span className="gg-brand-name">
                GitGuard AI
                <div className="gg-float-icon" style={{ top: -15, left: -20, animationDelay: '0s' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div className="gg-float-icon" style={{ top: -5, right: -25, animationDelay: '1s' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                </div>
              </span>
            </div>

            <div className="gg-hero">
              <h2>Your Automated<br /><em>PR Sentinel</em><br />Never Sleeps.</h2>
              <p>AI-powered code review that catches bugs,<br />vulnerabilities & bad patterns<br />before they reach production.</p>
            </div>

            <div className="gg-bottom">
              <div className="gg-grid">
                <div className="gg-stat"><span className="gg-stat-v" style={{color:'#818cf8'}}>1,248</span><span className="gg-stat-l">PRs Analyzed</span></div>
                <div className="gg-stat"><span className="gg-stat-v" style={{color:'#22d3ee'}}>4.3k</span><span className="gg-stat-l">Bugs Caught</span></div>
                <div className="gg-stat"><span className="gg-stat-v" style={{color:'#f59e0b'}}>0.9s</span><span className="gg-stat-l">Avg Review</span></div>
                <div className="gg-stat"><span className="gg-stat-v" style={{color:'#22c55e'}}>98.4%</span><span className="gg-stat-l">Security Score</span></div>
              </div>
              <div className="gg-live">
                <div className="gg-dot" />
                <span>Sentinel active · Monitoring 47 repositories</span>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT */}
        <div className="gg-right">
          {init && (
            <Particles
              id="tsparticles"
              options={particlesOptions}
              style={{ position: 'absolute', inset: 0, zIndex: 0 }}
            />
          )}
          <div className={`gg-panel ${mounted ? 'in' : ''}`}>

            <div className="gg-tabs">
              <button className={`gg-tab ${tab==='login'?'on':''}`} onClick={()=>setTab('login')}>Sign In</button>
              <button className={`gg-tab ${tab==='register'?'on':''}`} onClick={()=>setTab('register')}>Create Account</button>
            </div>

            <div className="gg-head">
              <h1>{tab==='login' ? 'Welcome back' : 'Join GitGuard AI'}</h1>
              <p>{tab==='login' ? '> access your sentinel dashboard' : '> start protecting your codebase today'}</p>
              {error && (
                <div style={{
                  marginTop: 12, padding: '8px 12px', borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#f87171', fontSize: 11, fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {error}
                </div>
              )}
            </div>

            <button className="gg-gh" type="button" onClick={handleGitHub}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>

            <div className="gg-div">
              <div className="gg-div-ln"/><span>or with email</span><div className="gg-div-ln"/>
            </div>

            <form className="gg-form gg-fa" key={tab} onSubmit={handleSubmit}>

              {/* Login: single identifier field */}
              {tab==='login' && (
                <Field label="Username or Email" name="login" type="text"
                  placeholder="your_username or email" value={formData.login}
                  onChange={handleChange} autoComplete="username" required icon={<UserIcon/>}
                />
              )}

              {/* Register: username + email */}
              {tab==='register' && (<>
                <Field label="GitHub Username" name="login" type="text"
                  placeholder="your_username" value={formData.login}
                  onChange={handleChange} autoComplete="username" required icon={<UserIcon/>}
                />
                <Field label="Email Address" name="email" type="email"
                  placeholder="dev@company.io" value={formData.email}
                  onChange={handleChange} autoComplete="email" required icon={<MailIcon/>}
                />
              </>)}

              <Field label="Password" name="password" type={showPass?'text':'password'}
                placeholder="••••••••••••" value={formData.password}
                onChange={handleChange} autoComplete={tab==='login'?'current-password':'new-password'}
                required icon={<LockIcon/>}
                suffix={<EyeToggle show={showPass} onToggle={()=>setShowPass(p=>!p)}/>}
              />

              {tab==='register' && (
                <Field label="Confirm Password" name="confirmPassword" type={showConfirm?'text':'password'}
                  placeholder="••••••••••••" value={formData.confirmPassword}
                  onChange={handleChange} autoComplete="new-password" required icon={<ShieldIcon/>}
                  suffix={<EyeToggle show={showConfirm} onToggle={()=>setShowConfirm(p=>!p)}/>}
                />
              )}

              {tab==='login' && (
                <div className="gg-row">
                  <label className="gg-rem">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                    />
                    <span>Remember me</span>
                  </label>
                  <button type="button" className="gg-fgt" onClick={() => setError("Password reset feature coming soon!")}>
                    Forgot password?
                  </button>
                </div>
              )}

              <button type="submit" className="gg-btn" disabled={loading}>
                {loading
                  ? <div className="gg-spin"/>
                  : (<>
                      <span>{tab==='login'?'Access Dashboard':'Create Account'}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </>)
                }
              </button>
            </form>

            <p className="gg-foot">
              {tab==='login'
                ? <>No account?{' '}<button onClick={()=>setTab('register')}>Create one free →</button></>
                : <>Already have access?{' '}<button onClick={()=>setTab('login')}>Sign in →</button></>
              }
            </p>

            <p className="gg-terms">
              By continuing you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
            </p>

          </div>
        </div>

      </div>
    </>
  );
};

export default LoginPage;
