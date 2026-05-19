import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

// ─── Animated Background Orbs ─────────────────────────────────────────────

const AnimatedOrbs: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      color: [number, number, number];
    }

    const particles: Particle[] = [];
    const COLORS = [[99, 102, 241], [34, 211, 238], [129, 140, 248]];

    for (let i = 0; i < 20; i++) {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)] as [number, number, number],
      });
    }

    let animId = 0;
    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;

      // Background
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, 'rgba(15, 23, 42, 1)');
      bg.addColorStop(0.5, 'rgba(2, 4, 12, 1)');
      bg.addColorStop(1, 'rgba(12, 8, 32, 1)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.6)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        glow.addColorStop(0, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.15)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
      });

      // Ambient glow
      const cx = W / 2;
      const cy = H / 2;
      const amb = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.6);
      amb.addColorStop(0, 'rgba(79, 70, 229, 0.08)');
      amb.addColorStop(0.6, 'rgba(34, 211, 238, 0.04)');
      amb.addColorStop(1, 'transparent');
      ctx.fillStyle = amb;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(W, H) * 0.6, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 -z-10" />;
};

// ─── Main 404 Page ────────────────────────────────────────────────────────────

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex items-center justify-center p-4">
      <AnimatedOrbs />

      <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
        {/* Animated 404 */}
        <div className="space-y-4 animate-fade-in">
          {/* Error Code */}
          <div className="inline-block mb-6">
            <div className="text-8xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 -webkit-background-clip text -webkit-text-fill-color transparent bg-clip-text animate-pulse">
              404
            </div>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white">Page Not Found</h1>

          {/* Description */}
          <p className="text-lg text-slate-400 leading-relaxed">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>

          {/* Attempted Path */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 max-w-md mx-auto">
            <div className="text-xs text-slate-500 mb-2 flex items-center gap-2 justify-center">
              <Search size={14} />
              Searched Route
            </div>
            <p className="font-mono text-sm text-cyan-400 break-all">{location.pathname}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-white/5"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          {/* Home Button */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold transition-all duration-300 shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/70"
          >
            <Home size={18} />
            Go Home
          </button>
        </div>

        {/* Quick Links */}
        <div className="pt-8 border-t border-white/10 space-y-4">
          <p className="text-sm text-slate-400">Helpful links:</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            >
              Landing Page
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Footer Message */}
        <div className="pt-4 text-xs text-slate-500">
          <p>If this is an error, please contact support at support@gitguard.ai</p>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
    </div>
  );
};

export default NotFoundPage;
