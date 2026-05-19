import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface Statistic {
  label: string;
  value: string;
  subtext: string;
}

// ─── Animated Sentinel Graphic ────────────────────────────────────────────────

const SentinelGraphic: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    interface Ring {
      radius: number;
      speed: number;
      angle: number;
      nodeCount: number;
      r: number;
      g: number;
      b: number;
    }
    const rings: Ring[] = [
      { radius: 70, speed: 0.009, angle: 0, nodeCount: 5, r: 99, g: 102, b: 241 },
      { radius: 115, speed: -0.006, angle: 1.2, nodeCount: 7, r: 34, g: 211, b: 238 },
      { radius: 162, speed: 0.004, angle: 2.4, nodeCount: 9, r: 129, g: 140, b: 248 },
    ];

    interface Spark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      max: number;
      sz: number;
      r: number;
      g: number;
      b: number;
    }
    const sparks: Spark[] = [];
    const SPARK_COLS = [[99, 102, 241], [34, 211, 238], [129, 140, 248], [167, 139, 250], [56, 189, 248]];

    const spawnSpark = (W: number, H: number) => {
      const cx = W / 2;
      const cy = H / 2;
      const a = Math.random() * Math.PI * 2;
      const d = 50 + Math.random() * 180;
      const col = SPARK_COLS[Math.floor(Math.random() * SPARK_COLS.length)];
      sparks.push({
        x: cx + Math.cos(a) * d,
        y: cy + Math.sin(a) * d,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.25 - Math.random() * 0.5,
        life: 0,
        max: 100 + Math.random() * 80,
        sz: 1 + Math.random() * 2.5,
        r: col[0],
        g: col[1],
        b: col[2],
      });
    };

    interface HexCell {
      x: number;
      y: number;
      po: number;
    }
    let hexCells: HexCell[] = [];
    let lastW = 0;
    let lastH = 0;

    const buildHex = (W: number, H: number) => {
      hexCells = [];
      const s = 28;
      const hh = s * Math.sqrt(3);
      for (let row = -1; row < H / hh + 2; row++) {
        for (let col = -1; col < W / (s * 1.5) + 2; col++) {
          hexCells.push({
            x: col * s * 1.5,
            y: row * hh + (col % 2 === 0 ? 0 : hh / 2),
            po: Math.random() * Math.PI * 2,
          });
        }
      }
      lastW = W;
      lastH = H;
    };

    const drawHex = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        i === 0 ? ctx.moveTo(x + s * Math.cos(a), y + s * Math.sin(a)) : ctx.lineTo(x + s * Math.cos(a), y + s * Math.sin(a));
      }
      ctx.closePath();
    };

    let scanA = 0;

    interface Stream {
      angle: number;
      len: number;
      spd: number;
      prog: number;
    }
    const streams: Stream[] = Array.from({ length: 14 }, (_, i) => ({
      angle: (Math.PI * 2) / 14 * i,
      len: 35 + Math.random() * 55,
      spd: 0.005 + Math.random() * 0.007,
      prog: Math.random(),
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

      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
      bg.addColorStop(0, 'rgba(18,12,50,1)');
      bg.addColorStop(0.55, 'rgba(9,7,28,1)');
      bg.addColorStop(1, 'rgba(2,4,12,1)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      hexCells.forEach((cell) => {
        const a = 0.025 * (0.6 + 0.4 * Math.sin(t * 0.5 + cell.po));
        ctx.strokeStyle = `rgba(99,102,241,${a})`;
        ctx.lineWidth = 0.5;
        drawHex(ctx, cell.x, cell.y, 26);
        ctx.stroke();
      });

      const cx = W / 2;
      const cy = H / 2;

      const aGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 240);
      aGlow.addColorStop(0, 'rgba(79,70,229,0.12)');
      aGlow.addColorStop(0.6, 'rgba(34,211,238,0.04)');
      aGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = aGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 240, 0, Math.PI * 2);
      ctx.fill();

      rings.forEach((ring) => {
        ring.angle += ring.speed;
        const { r, g, b } = ring;

        ctx.beginPath();
        ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.1)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        for (let i = 0; i < ring.nodeCount; i++) {
          const a = ring.angle + ((Math.PI * 2) / ring.nodeCount) * i;
          const nx = cx + Math.cos(a) * ring.radius;
          const ny = cy + Math.sin(a) * ring.radius;
          const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.1);

          const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, 9);
          ng.addColorStop(0, `rgba(${r},${g},${b},${0.35 * pulse})`);
          ng.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(nx, ny, 9, 0, Math.PI * 2);
          ctx.fillStyle = ng;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(nx, ny, 2 + pulse * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${0.55 + pulse * 0.45})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, ring.radius, ring.angle - 0.05, ring.angle + 0.7);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.75)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      scanA += 0.013;
      ctx.save();
      ctx.translate(cx, cy);
      const sweepG = ctx.createLinearGradient(0, 0, 190, 0);
      sweepG.addColorStop(0, 'rgba(34,211,238,0.2)');
      sweepG.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.rotate(scanA);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 190, -0.3, 0, false);
      ctx.closePath();
      ctx.fillStyle = sweepG;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, 190, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34,211,238,0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      streams.forEach((s) => {
        s.prog += s.spd;
        if (s.prog > 1) s.prog = 0;

        const x0 = cx + Math.cos(s.angle) * 70;
        const y0 = cy + Math.sin(s.angle) * 70;
        const x1 = cx + Math.cos(s.angle) * (70 + s.len * s.prog);
        const y1 = cy + Math.sin(s.angle) * (70 + s.len * s.prog);

        const st = ctx.createLinearGradient(x0, y0, x1, y1);
        st.addColorStop(0, 'rgba(34,211,238,0.6)');
        st.addColorStop(0.8, 'rgba(34,211,238,0.15)');
        st.addColorStop(1, 'transparent');
        ctx.strokeStyle = st;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      });

      sparks.forEach((sp, idx) => {
        sp.life++;
        sp.x += sp.vx;
        sp.y += sp.vy;
        const li = sp.life / sp.max;
        const a = (1 - li) * (1 - li);

        ctx.globalAlpha = a;
        ctx.fillStyle = `rgba(${sp.r},${sp.g},${sp.b},0.8)`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.sz, 0, Math.PI * 2);
        ctx.fill();

        if (sp.life >= sp.max) sparks.splice(idx, 1);
      });
      ctx.globalAlpha = 1;

      requestAnimationFrame(draw);
    };

    draw();
    return () => ro.disconnect();
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 -z-10" />;
};

// ─── Feature Card Component ────────────────────────────────────────────────────

const FeatureCard: React.FC<Feature> = ({ icon, title, description }) => (
  <div className="p-5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/8 transition-all duration-300 group">
    <div className="text-2xl mb-3 group-hover:scale-110 transition-transform duration-300">{icon}</div>
    <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
    <p className="text-xs text-slate-400">{description}</p>
  </div>
);

// ─── Statistic Card Component ──────────────────────────────────────────────────

const StatCard: React.FC<Statistic> = ({ label, value, subtext }) => (
  <div className="gg-stat">
    <span className="gg-stat-v">{value}</span>
    <span className="gg-stat-l">{label}</span>
    {subtext && <span className="text-xs text-slate-500 mt-1 block">{subtext}</span>}
  </div>
);

// ─── Main Landing Page ────────────────────────────────────────────────────────

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats] = useState<Statistic[]>([
    { label: 'AI Models', value: '3+', subtext: 'Multi-LLM support' },
    { label: 'Repos', value: 'Unlimited', subtext: 'GitHub integration' },
    { label: 'Reviews', value: '24/7', subtext: 'Continuous monitoring' },
    { label: 'Latency', value: '<2s', subtext: 'Real-time analysis' },
  ]);

  const features: Feature[] = [
    {
      icon: '🤖',
      title: 'AI-Powered Reviews',
      description: 'Autonomous pull request analysis using Google Gemini, Groq, and other LLMs.',
    },
    {
      icon: '🔍',
      title: 'Vulnerability Detection',
      description: 'Advanced security scanning for common vulnerabilities and code anti-patterns.',
    },
    {
      icon: '⚡',
      title: 'GitHub Integration',
      description: 'Seamless webhook integration with your GitHub repositories.',
    },
    {
      icon: '📊',
      title: 'Audit Logging',
      description: 'Complete audit trail of all reviews and security events.',
    },
    {
      icon: '🎯',
      title: 'Smart Queue',
      description: 'Efficient PR review queue management with real-time metrics.',
    },
    {
      icon: '🔐',
      title: 'Enterprise Ready',
      description: 'Built with security best practices and production-grade infrastructure.',
    },
  ];

  return (
    <div className="gg-root">
      {/* ── LEFT SECTION ── */}
      <div className="gg-left">
        <SentinelGraphic />
        <div className="gg-left-veil" />
        <div className="gg-left-edge" />
        <div className="gg-left-body">
          {/* Brand */}
          <div>
            <div className="gg-brand">
              <div className="gg-brand-ico">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="gg-brand-name">GitGuard AI</span>
            </div>

            {/* Hero Text */}
            <div className="gg-hero mt-12">
              <h2>
                Autonomous <em>Pull Request Reviews</em>
              </h2>
              <p>
                GitGuard AI continuously monitors your repositories with advanced AI-powered security scanning and intelligent code review
                suggestions, 24/7.
              </p>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="gg-bottom">
            <div className="gg-grid">
              {stats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
              ))}
            </div>
            <div className="gg-live">
              <div className="gg-dot" />
              <span>System operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT SECTION ── */}
      <div className="gg-right">
        <div className="gg-panel in">
          {/* Header */}
          <div className="gg-head">
            <h1>Welcome to GitGuard AI</h1>
            <p>Next-generation code security and review automation</p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {features.map((feature, idx) => (
              <FeatureCard key={idx} {...feature} />
            ))}
          </div>

          {/* Description */}
          <div className="mb-6 p-4 rounded-lg bg-white/3 border border-white/5">
            <p className="text-xs leading-relaxed text-slate-300">
              <strong>How it works:</strong> Connect your GitHub account, GitGuard AI automatically monitors your pull requests in real-time.
              Our multi-LLM engine analyzes code changes, detects vulnerabilities, and provides intelligent suggestions—all without slowing down your
              development process.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/login')} className="gg-btn">
              Get Started
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all"
            >
              Learn More
            </button>
          </div>

          {/* Footer */}
          <div className="gg-foot">
            <p>
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="font-semibold">
                Login
              </button>
            </p>
          </div>

          {/* Terms */}
          <div className="gg-terms">
            <p>
              By using GitGuard AI, you agree to our{' '}
              <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
