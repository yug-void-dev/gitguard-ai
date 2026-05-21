import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Bell,
  Bug,
  ChevronLeft,
  Code,
  Cpu,
  Database,
  GitBranch,
  GitPullRequest,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getReviews } from '../services/review.service';
import type { Review } from '../types/review.types';
import { getQueueMetrics, type QueueMetricsResponse } from '../services/queue.service';
import { getNotifications, type Notification } from '../services/notification.service';

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  login?: string;
  email?: string;
  avatarUrl?: string;
}
interface Props {
  user?: User;
  logout?: () => void;
}
type Page =
  | 'dashboard'
  | 'reviews'
  | 'repos'
  | 'analytics'
  | 'alerts'
  | 'settings';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  cyan: '#06b6d4',
  violet: '#818cf8',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  orange: '#f97316',
  bg: '#060a14',
  panel: 'rgba(255,255,255,0.032)',
  panelHov: 'rgba(255,255,255,0.055)',
  border: 'rgba(255,255,255,0.07)',
  text: '#e2e8f0',
  sub: '#94a3b8',
  muted: '#475569',
  dim: '#1e293b',
} as const;

const FONT_BODY = "'Inter', sans-serif";

// ─── Global styles ────────────────────────────────────────────────────────────
const GS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;overflow:hidden;}
body{background:${T.bg};font-family:${FONT_BODY};}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(6,182,212,0.2);border-radius:2px;}
.ns::-webkit-scrollbar{display:none;}
.ns{-ms-overflow-style:none;scrollbar-width:none;}
button{font-family:${FONT_BODY};border:none;cursor:pointer;background:none;}
.sidebar-wrap{position:relative;flex-shrink:0;display:flex;}
.sidebar-toggle{
  position:absolute;
  right:-13px;
  top:26px;
  width:26px;
  height:26px;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(12,16,28,0.98);
  border:1px solid ${T.border};
  color:${T.sub};
  box-shadow:0 2px 12px rgba(0,0,0,0.35);
  z-index:40;
  transition:background .18s,border-color .18s,color .18s;
}
.sidebar-toggle:hover{
  background:rgba(6,182,212,0.12);
  border-color:rgba(6,182,212,0.35);
  color:${T.cyan};
}
@media(max-width:768px){
  .sbar{display:none!important;}
  .sidebar-toggle{display:none!important;}
  .mbar{display:flex!important;}
  .mcontent{padding:14px 12px 80px!important;}
  .sgrid{grid-template-columns:1fr 1fr!important;gap:10px!important;}
  .mgrid{grid-template-columns:1fr!important;}
  .bgrid{grid-template-columns:1fr!important;}
  .rgrid{grid-template-columns:1fr 1fr!important;}
}
@media(max-width:480px){
  .sgrid{grid-template-columns:1fr 1fr!important;}
  .rgrid{grid-template-columns:1fr!important;}
}
`;

// ─── Three.js Neural BG ───────────────────────────────────────────────────────
function NeuralBG() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(
      60,
      el.clientWidth / el.clientHeight,
      0.1,
      100
    );
    cam.position.z = 9;
    const geo = new THREE.SphereGeometry(0.032, 6, 6);
    const nodes: THREE.Mesh[] = [];
    const pos: THREE.Vector3[] = [];
    for (let i = 0; i < 55; i++) {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0x06b6d4 : 0x818cf8,
          transparent: true,
          opacity: 0.55,
        })
      );
      const p = new THREE.Vector3(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 5
      );
      mesh.position.copy(p);
      pos.push(p);
      scene.add(mesh);
      nodes.push(mesh);
    }
    const lp: THREE.Vector3[] = [];
    for (let i = 0; i < pos.length; i++)
      for (let j = i + 1; j < pos.length; j++)
        if (pos[i].distanceTo(pos[j]) < 3.8)
          lp.push(pos[i].clone(), pos[j].clone());
    scene.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(lp),
        new THREE.LineBasicMaterial({
          color: 0x818cf8,
          transparent: true,
          opacity: 0.05,
        })
      )
    );
    let mx = 0,
      my = 0;
    const onM = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 0.04;
      my = (e.clientY / window.innerHeight - 0.5) * 0.04;
    };
    window.addEventListener('mousemove', onM);
    let t = 0,
      raf: number;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.003;
      nodes.forEach((n, i) => {
        n.position.y += Math.sin(t + i * 0.4) * 0.0014;
        n.position.x += Math.cos(t + i * 0.25) * 0.001;
      });
      scene.rotation.y = Math.sin(t * 0.08) * 0.04 + mx;
      scene.rotation.x = Math.cos(t * 0.06) * 0.02 - my;
      renderer.render(scene, cam);
    };
    draw();
    const onR = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      cam.aspect = el.clientWidth / el.clientHeight;
      cam.updateProjectionMatrix();
    };
    window.addEventListener('resize', onR);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onM);
      window.removeEventListener('resize', onR);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        opacity: 0.45,
        pointerEvents: 'none',
      }}
    />
  );
}

// ─── Floating Particles ───────────────────────────────────────────────────────
function FloatingParticles() {
  const particles = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 30 + 30,
    delay: Math.random() * -30,
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          animate={{
            y: [`${p.y}vh`, `${p.y - 30}vh`],
            x: [`${p.x}vw`, `${p.x + (Math.random() * 10 - 5)}vw`],
            opacity: [0, 0.4, 0]
          }}
          transition={{ duration: p.duration, repeat: Infinity, ease: 'linear', delay: p.delay }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: Math.random() > 0.5 ? T.cyan : T.violet,
            filter: 'blur(1px)'
          }}
        />
      ))}
    </div>
  );
}

// ─── Counter ──────────────────────────────────────────────────────────────────
function Counter({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let c = 0;
    const step = to / 90;
    const id = setInterval(() => {
      c += step;
      if (c >= to) {
        setV(to);
        clearInterval(id);
      } else setV(Math.floor(c));
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [to]);
  return <>{v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}</>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay = 0,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub?: string;
  color: string;
  delay?: number;
  trend?: string;
}) {
  const [h, setH] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setH(true)}
      onHoverEnd={() => setH(false)}
      whileHover={{ y: -4, scale: 1.02 }}
      style={{
        position: 'relative',
        borderRadius: 14,
        padding: '18px 20px',
        overflow: 'hidden',
        cursor: 'default',
        minWidth: 0,
        background: h
          ? `linear-gradient(135deg,${color}12,rgba(255,255,255,0.04))`
          : T.panel,
        border: `1px solid ${h ? color + '35' : T.border}`,
        transition: 'border-color .2s,background .2s',
      }}
    >
      {/* glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 14,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse at 20% 20%,${color}14,transparent 65%)`,
          opacity: h ? 1 : 0,
          transition: 'opacity .2s',
        }}
      />
      {/* top shimmer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg,transparent,${color}65,transparent)`,
          opacity: h ? 1 : 0.25,
          transition: 'opacity .2s',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${color}14`,
            border: `1px solid ${color}25`,
            color,
            flexShrink: 0,
          }}
        >
          <Icon size={16} />
        </div>
        {trend && (
          <span
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 20,
              background: `${T.green}14`,
              color: T.green,
              border: `1px solid ${T.green}25`,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <TrendingUp size={8} />
            {trend}
          </span>
        )}
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: 26,
            fontWeight: 800,
            color: T.text,
            letterSpacing: '-1px',
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          <Counter to={value} />
        </p>
        <p
          style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
            color: T.muted,
            marginBottom: sub ? 3 : 0,
          }}
        >
          {label}
        </p>
        {sub && (
          <p
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: 10,
              color: T.muted,
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Sev badge ────────────────────────────────────────────────────────────────
const SEV: Record<string, [string, string]> = {
  Critical: [T.red, 'rgba(239,68,68,0.12)'],
  High: [T.orange, 'rgba(249,115,22,0.12)'],
  Medium: [T.amber, 'rgba(245,158,11,0.12)'],
  Low: [T.green, 'rgba(16,185,129,0.12)'],
};
function SevBadge({ level }: { level: string }) {
  const [c, bg] = SEV[level] ?? [T.green, 'rgba(16,185,129,0.12)'];
  return (
    <span
      style={{
        fontFamily: "'Fira Code',monospace",
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        padding: '3px 8px',
        borderRadius: 20,
        color: c,
        background: bg,
        border: `1px solid ${c}25`,
        whiteSpace: 'nowrap' as const,
      }}
    >
      {level}
    </span>
  );
}

// ─── Review row ───────────────────────────────────────────────────────────────
export interface ReviewItem {
  repo: string;
  pr: string;
  title: string;
  severity: string;
  bugs: number;
  time: string;
}

function ReviewRow({
  item,
  delay,
}: {
  item: ReviewItem;
  delay: number;
}) {
  const [h, setH] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.36, delay, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setH(true)}
      onHoverEnd={() => setH(false)}
      whileHover={{ x: 3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 10,
        cursor: 'pointer',
        background: h ? 'rgba(6,182,212,0.05)' : 'transparent',
        border: `1px solid ${h ? 'rgba(6,182,212,0.15)' : 'transparent'}`,
        transition: 'background .18s,border-color .18s',
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: 'rgba(129,140,248,0.1)',
          border: '1px solid rgba(129,140,248,0.18)',
        }}
      >
        <GitPullRequest size={12} style={{ color: T.violet }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: 10,
            color: T.muted,
            marginBottom: 1,
          }}
        >
          {item.repo} <span style={{ color: T.cyan }}>{item.pr}</span>
        </p>
        <p
          style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: T.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
          }}
        >
          {item.title}
        </p>
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
      >
        <SevBadge level={item.severity} />
        <span
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: 10,
            color: T.muted,
            minWidth: 36,
            textAlign: 'right' as const,
          }}
        >
          {item.time} ago
        </span>
      </div>
    </motion.div>
  );
}

// ─── Activity chart ───────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  VALS = [12, 19, 8, 25, 31, 14, 7],
  MV = Math.max(...VALS);
function ActivityChart() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 5,
        height: 72,
        width: '100%',
      }}
    >
      {DAYS.map((d, i) => (
        <div
          key={d}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: `${(VALS[i] / MV) * 56}px`, opacity: 1 }}
            transition={{
              duration: 0.65,
              delay: 0.25 + i * 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ filter: 'brightness(1.4)', scaleX: 1.1 }}
            style={{
              width: '100%',
              borderRadius: '3px 3px 2px 2px',
              minHeight: 3,
              cursor: 'pointer',
              background:
                i === 4
                  ? `linear-gradient(180deg,${T.cyan},${T.violet})`
                  : `linear-gradient(180deg,rgba(6,182,212,0.45),rgba(129,140,248,0.3))`,
              boxShadow: i === 4 ? `0 0 8px ${T.cyan}45` : 'none',
            }}
          />
          <span
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: 8,
              color: T.muted,
            }}
          >
            {d}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Health ring ──────────────────────────────────────────────────────────────
function HealthRing({
  pct,
  color,
  label,
}: {
  pct: number;
  color: string;
  label: string;
}) {
  const r = 24,
    circ = 2 * Math.PI * r;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
          />
          <motion.circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
            transition={{ duration: 1.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: 11,
              fontWeight: 800,
              color: T.text,
            }}
          >
            {pct}%
          </span>
        </div>
      </div>
      <span
        style={{
          fontFamily: "'Inter',sans-serif",
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
          color: T.muted,
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Terminal ─────────────────────────────────────────────────────────────────
const LOGS = [
  { t: '00:01', lvl: 'INFO', msg: 'Webhook received: PR #44 opened' },
  { t: '00:02', lvl: 'INFO', msg: 'HMAC signature validated ✓' },
  { t: '00:03', lvl: 'INFO', msg: 'Fetching diff via Octokit SDK...' },
  { t: '00:04', lvl: 'WARN', msg: 'Large diff detected — chunking...' },
  { t: '00:06', lvl: 'INFO', msg: 'Sending to Gemini 1.5 Flash...' },
  { t: '00:09', lvl: 'CRIT', msg: 'SQL injection risk in query builder' },
  { t: '00:09', lvl: 'HIGH', msg: 'Unhandled rejection in async handler' },
  { t: '00:10', lvl: 'INFO', msg: 'Review comment posted to PR #44 ✓' },
];
const LC: Record<string, string> = {
  INFO: T.cyan,
  WARN: T.amber,
  CRIT: T.red,
  HIGH: T.orange,
};
function Terminal() {
  const [vis, setVis] = useState(0);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setVis(i);
      if (i >= LOGS.length) clearInterval(id);
    }, 280);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [vis]);
  return (
    <div
      style={{
        borderRadius: 10,
        padding: '11px 13px',
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.05)',
        height: 185,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          marginBottom: 9,
          flexShrink: 0,
        }}
      >
        {['#ef4444', '#f59e0b', '#10b981'].map((c) => (
          <div
            key={c}
            style={{ width: 8, height: 8, borderRadius: '50%', background: c }}
          />
        ))}
        <span
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: 9,
            color: T.muted,
            marginLeft: 4,
          }}
        >
          sentinel.log — live
        </span>
        <motion.div
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{
            marginLeft: 'auto',
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: T.green,
          }}
        />
      </div>
      <div
        className="ns"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {LOGS.slice(0, vis).map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.16 }}
            style={{
              display: 'flex',
              gap: 7,
              fontFamily: "'Fira Code',monospace",
              fontSize: 9.5,
              lineHeight: 1.55,
            }}
          >
            <span style={{ color: T.muted, flexShrink: 0 }}>[{l.t}]</span>
            <span
              style={{
                color: LC[l.lvl] ?? '#fff',
                fontWeight: 700,
                width: 34,
                flexShrink: 0,
              }}
            >
              {l.lvl}
            </span>
            <span style={{ color: '#94a3b8' }}>{l.msg}</span>
          </motion.div>
        ))}
        {vis < LOGS.length && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            style={{
              color: T.cyan,
              fontFamily: "'Fira Code',monospace",
              fontSize: 10,
            }}
          >
            ▋
          </motion.span>
        )}
        <div ref={end} />
      </div>
    </div>
  );
}

// ─── Quick Action card ────────────────────────────────────────────────────────
function QuickAction({
  icon: Icon,
  title,
  sub,
  color,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  sub: string;
  color: string;
  onClick?: () => void;
}) {
  const [h, setH] = useState(false);
  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setH(true)}
      onHoverEnd={() => setH(false)}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 12,
        width: '100%',
        textAlign: 'left',
        background: h ? T.panelHov : T.panel,
        border: `1px solid ${h ? color + '30' : T.border}`,
        cursor: 'pointer',
        transition: 'all .2s',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${color}14`,
          border: `1px solid ${color}22`,
          color,
          flexShrink: 0,
        }}
      >
        <Icon size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: 12,
            fontWeight: 700,
            color: T.text,
            marginBottom: 2,
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: 10,
            color: T.muted,
          }}
        >
          {sub}
        </p>
      </div>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${T.border}`,
          color: T.muted,
          flexShrink: 0,
        }}
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </motion.button>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SHead({
  label,
  accent,
  right,
  inline,
}: {
  label: string;
  accent: string;
  right?: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        marginBottom: inline ? 0 : 14,
      }}
    >
      <div
        style={{
          width: 3,
          height: 14,
          borderRadius: 2,
          background: `linear-gradient(to bottom,${accent},${T.violet})`,
          flexShrink: 0,
        }}
      />
      <h2
        style={{
          fontFamily: "'Inter',sans-serif",
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: T.muted,
          flex: 1,
        }}
      >
        {label}
      </h2>
      {right}
    </div>
  );
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
function SideItem({
  icon: Icon,
  label,
  page,
  active,
  collapsed,
  badge,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  page: Page;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  onClick: (p: Page) => void;
}) {
  const [h, setH] = useState(false);
  return (
    <motion.button
      onClick={() => onClick(page)}
      onHoverStart={() => setH(true)}
      onHoverEnd={() => setH(false)}
      whileTap={{ scale: 0.96 }}
      title={collapsed ? label : undefined}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: collapsed ? '10px' : '10px 12px',
        minHeight: 40,
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: active
          ? 'rgba(6,182,212,0.1)'
          : h
            ? 'rgba(255,255,255,0.045)'
            : 'transparent',
        border: active ? '1px solid rgba(6,182,212,0.2)' : '1px solid transparent',
        borderRadius: 10,
        position: 'relative',
        transition: 'background .18s, border-color .18s',
      }}
    >
      {active && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '18%',
            bottom: '18%',
            width: 3,
            borderRadius: '0 2px 2px 0',
            background: `linear-gradient(to bottom,${T.cyan},${T.violet})`,
          }}
        />
      )}
      <Icon
        size={15}
        style={{
          color: active ? T.cyan : h ? T.sub : T.muted,
          flexShrink: 0,
          transition: 'color .18s',
        }}
      />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              color: active ? T.text : h ? T.sub : T.muted,
              flex: 1,
              textAlign: 'left',
              whiteSpace: 'nowrap',
              transition: 'color .18s',
            }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {!collapsed && badge && badge > 0 && (
        <span
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: 9,
            fontWeight: 700,
            background: 'rgba(6,182,212,0.18)',
            border: '1px solid rgba(6,182,212,0.32)',
            color: T.cyan,
            borderRadius: 20,
            padding: '1px 6px',
          }}
        >
          {badge}
        </span>
      )}
    </motion.button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  logout,
  collapsed,
  page,
  setPage,
  reviewsCount,
  alertsCount,
}: {
  logout?: () => void;
  collapsed: boolean;
  page: Page;
  setPage: (p: Page) => void;
  reviewsCount?: number;
  alertsCount?: number;
}) {
  const NAV: [React.ElementType, string, Page, number?][] = [
    [Activity, 'Dashboard', 'dashboard'],
    [GitPullRequest, 'PR Reviews', 'reviews', reviewsCount || undefined],
    [GitBranch, 'Repositories', 'repos'],
    [BarChart2, 'Analytics', 'analytics'],
    [AlertTriangle, 'Alerts', 'alerts', alertsCount || undefined],
    [Settings, 'Settings', 'settings'],
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 232 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="sbar"
      style={{
        height: '100vh',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(5,8,18,0.98)',
        borderRight: `1px solid ${T.border}`,
        backdropFilter: 'blur(28px)',
        zIndex: 30,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Brand row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '16px 10px' : '18px 14px',
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}
      >
        <motion.div
          animate={{ rotate: [0, 6, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: `linear-gradient(135deg,${T.cyan},${T.violet})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 0 14px ${T.cyan}38`,
          }}
        >
          <Shield size={14} color="white" />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <p
                style={{
                  fontFamily: "'Inter',sans-serif",
                  fontSize: 14,
                  fontWeight: 800,
                  color: T.text,
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.3px',
                }}
              >
                GitGuard<span style={{ color: T.cyan }}>AI</span>
              </p>
              <p
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: 8,
                  color: T.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                }}
              >
                PR Sentinel
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav
        className="ns"
        style={{
          flex: 1,
          padding: collapsed ? '12px 8px' : '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          overflowY: 'auto',
        }}
      >
        {!collapsed && (
          <p
            style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.4px',
              color: T.muted,
              padding: '0 4px 8px',
              margin: 0,
            }}
          >
            Menu
          </p>
        )}
        {NAV.map(([Icon, label, pg, badge]) => (
          <SideItem
            key={pg}
            icon={Icon}
            label={label}
            page={pg}
            active={page === pg}
            collapsed={collapsed}
            badge={badge}
            onClick={setPage}
          />
        ))}
      </nav>

      {/* Footer — logout only */}
      <div
        style={{
          padding: collapsed ? '12px 8px 16px' : '14px 12px 18px',
          borderTop: `1px solid ${T.border}`,
          flexShrink: 0,
        }}
      >
        <motion.button
          onClick={logout}
          whileHover={{
            background: 'rgba(239,68,68,0.1)',
            borderColor: 'rgba(239,68,68,0.28)',
            color: T.red,
          }}
          whileTap={{ scale: 0.96 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '10px' : '10px 12px',
            minHeight: 40,
            borderRadius: 10,
            width: '100%',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent',
            border: '1px solid transparent',
            color: T.sub,
            transition: 'all .18s',
            cursor: 'pointer',
          }}
          title={collapsed ? 'Log out' : undefined}
        >
          <LogOut size={14} style={{ flexShrink: 0 }} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  fontFamily: "'Inter',sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                Log out
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  );
}

// ─── Mobile bar ───────────────────────────────────────────────────────────────
function MobileBar({
  page,
  setPage,
}: {
  page: Page;
  setPage: (p: Page) => void;
}) {
  const items: [React.ElementType, Page][] = [
    [Activity, 'dashboard'],
    [GitPullRequest, 'reviews'],
    [GitBranch, 'repos'],
    [BarChart2, 'analytics'],
    [Settings, 'settings'],
  ];
  return (
    <div
      className="mbar"
      style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '7px 8px calc(7px + env(safe-area-inset-bottom))',
        background: 'rgba(5,8,18,0.97)',
        borderTop: `1px solid ${T.border}`,
        backdropFilter: 'blur(20px)',
      }}
    >
      {items.map(([Icon, p]) => (
        <motion.button
          key={p}
          onClick={() => setPage(p)}
          whileTap={{ scale: 0.84 }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: page === p ? 'rgba(6,182,212,0.12)' : 'transparent',
            border: `1px solid ${page === p ? 'rgba(6,182,212,0.25)' : 'transparent'}`,
            color: page === p ? T.cyan : T.muted,
            cursor: 'pointer',
            transition: 'all .15s',
          }}
        >
          <Icon size={16} />
        </motion.button>
      ))}
    </div>
  );
}

// ─── Page placeholder ─────────────────────────────────────────────────────────
function Placeholder({
  title,
  icon: Icon,
  compact,
}: {
  title: string;
  icon: React.ElementType;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: compact ? '42vh' : '58vh',
        gap: 14,
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 24,
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: 'rgba(6,182,212,0.07)',
          border: '1px solid rgba(6,182,212,0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(6,182,212,0.45)',
        }}
      >
        <Icon size={24} />
      </motion.div>
      <p
        style={{
          fontFamily: "'Inter',sans-serif",
          fontSize: 18,
          fontWeight: 800,
          color: 'rgba(226,232,240,0.3)',
          letterSpacing: '-0.4px',
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontFamily: "'Fira Code',monospace",
          fontSize: 10,
          color: 'rgba(71,85,105,0.7)',
        }}
      >
        // coming in next sprint
      </p>
    </div>
  );
}

// ─── Greeting ─────────────────────────────────────────────────────────────────
function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

// ─── Page header (sub-pages) ──────────────────────────────────────────────────
function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h1
        style={{
          fontFamily: "'Inter',sans-serif",
          fontSize: 22,
          fontWeight: 800,
          color: T.text,
          letterSpacing: '-0.4px',
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: 13,
            color: T.sub,
            lineHeight: 1.45,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const DashboardPage: React.FC<Props> = ({ user, logout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [page, setPage] = useState<Page>('dashboard');
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [queueStats, setQueueStats] = useState<QueueMetricsResponse['data'] | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [r, q, n] = await Promise.all([
        getReviews(),
        getQueueMetrics(),
        getNotifications()
      ]);
      setReviews(r);
      setQueueStats(q);
      setNotifications(n);
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    const t = setTimeout(() => setMounted(true), 80);
    return () => {
      clearInterval(interval);
      clearTimeout(t);
    };
  }, []);

  const STATS = [
    {
      icon: GitPullRequest,
      label: 'PRs Analyzed',
      value: queueStats?.counts?.completed ?? 0,
      sub: 'All time',
      color: T.cyan,
      trend: queueStats?.counts?.completed ? '+12%' : undefined,
      delay: 0,
    },
    {
      icon: Bug,
      label: 'Bugs Caught',
      value: reviews.reduce((acc, r) => acc + (r.metrics?.vulnerabilitiesCount ?? 0), 0),
      sub: 'Total issues found',
      color: T.violet,
      trend: reviews.length > 0 ? '+8%' : undefined,
      delay: 0.07,
    },
    {
      icon: Zap,
      label: 'Avg Review (s)',
      value: 9,
      sub: '0.9s median',
      color: T.green,
      delay: 0.14,
    },
    {
      icon: Shield,
      label: 'Security Score',
      value: reviews.length ? Math.round(reviews.reduce((acc, r) => acc + (r.metrics?.codeQualityScore ?? 0), 0) / reviews.length) : 100,
      sub: 'Average quality',
      color: T.amber,
      trend: reviews.length > 0 ? '+2%' : undefined,
      delay: 0.21,
    },
  ];

  const PAGE_LABELS: Record<Page, string> = {
    dashboard: 'Overview',
    reviews: 'PR Reviews',
    repos: 'Repositories',
    analytics: 'Analytics',
    alerts: 'Alerts',
    settings: 'Settings',
  };

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        overflow: 'hidden',
        background: T.bg,
        position: 'relative',
      }}
    >
      <style>{GS}</style>
      <NeuralBG />
      <FloatingParticles />

      {/* Ambient blobs */}
      {[
        { c: 'rgba(6,182,212,0.06)', s: 480, t: '-5%', l: '-5%' },
        { c: 'rgba(129,140,248,0.05)', s: 400, t: '55%', l: '62%' },
        { c: 'rgba(16,185,129,0.04)', s: 340, t: '78%', l: '22%' },
      ].map((b, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.1, 0.92, 1] }}
          transition={{ duration: 20, repeat: Infinity, delay: i * 6 }}
          style={{
            position: 'fixed',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 0,
            width: b.s,
            height: b.s,
            top: b.t,
            left: b.l,
            background: `radial-gradient(circle,${b.c},transparent 70%)`,
            filter: 'blur(65px)',
          }}
        />
      ))}

      {/* Grid overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: `linear-gradient(rgba(6,182,212,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.022) 1px,transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Sidebar + edge collapse toggle */}
      <div className="sidebar-wrap">
        <Sidebar
          logout={logout}
          collapsed={collapsed}
          page={page}
          setPage={setPage}
          reviewsCount={reviews.length > 0 ? reviews.length : undefined}
          alertsCount={notifications.filter(n => n.outcome === 'failure').length > 0 ? notifications.filter(n => n.outcome === 'failure').length : undefined}
        />
        <motion.button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          whileTap={{ scale: 0.92 }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.28 }}
            style={{ display: 'flex' }}
          >
            <ChevronLeft size={13} />
          </motion.div>
        </motion.button>
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10,
          minWidth: 0,
        }}
      >
        {/* ── TOPBAR ── */}
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : -14 }}
          transition={{ duration: 0.4 }}
          style={{
            height: 60,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            borderBottom: `1px solid ${T.border}`,
            background: 'rgba(5,8,18,0.75)',
            backdropFilter: 'blur(14px)',
          }}
        >
          {/* Left — page title + breadcrumb */}
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: 17,
                fontWeight: 800,
                color: T.text,
                letterSpacing: '-0.3px',
                lineHeight: 1.2,
                marginBottom: 2,
              }}
            >
              {PAGE_LABELS[page]}
            </h1>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: "'Fira Code',monospace",
                fontSize: 10,
              }}
            >
              <span style={{ color: T.muted }}>gitguard</span>
              <span style={{ color: 'rgba(6,182,212,0.35)' }}>/</span>
              <span style={{ color: T.sub }}>
                {PAGE_LABELS[page].toLowerCase().replace(' ', '-')}
              </span>
            </div>
          </div>

          {/* Right */}
          <div
            className="topbar-right"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {/* Search */}
            <AnimatePresence>
              {searchOpen ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 180, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search reviews..."
                    autoFocus
                    onBlur={() => {
                      if (!search) setSearchOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${T.border}`,
                      color: T.text,
                      fontFamily: "'Fira Code',monospace",
                      fontSize: 11,
                      outline: 'none',
                    }}
                  />
                </motion.div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setSearchOpen(true)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${T.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: T.muted,
                  }}
                >
                  <Search size={13} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Bell */}
            <div style={{ position: 'relative' }}>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: notificationsOpen ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${notificationsOpen ? 'rgba(6,182,212,0.3)' : T.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: notificationsOpen ? T.cyan : T.muted,
                }}
              >
                <Bell size={13} />
                {notifications.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 7,
                      right: 7,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: T.red,
                      border: '1.5px solid ' + T.bg,
                    }}
                  />
                )}
              </motion.button>
              
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'absolute',
                      top: 45,
                      right: 0,
                      width: 320,
                      background: 'rgba(12,16,28,0.95)',
                      border: `1px solid ${T.border}`,
                      borderRadius: 12,
                      padding: 12,
                      zIndex: 100,
                      backdropFilter: 'blur(10px)',
                      maxHeight: 400,
                      overflowY: 'auto'
                    }}
                  >
                    <h3 style={{ color: T.text, fontSize: 13, marginBottom: 8, padding: '0 4px', fontFamily: "'Inter',sans-serif", fontWeight: 700 }}>
                      Notifications
                    </h3>
                    {notifications.length === 0 ? (
                      <p style={{ color: T.muted, fontSize: 11, padding: 4, fontFamily: "'Inter',sans-serif" }}>No notifications.</p>
                    ) : (
                      notifications.slice(0, 10).map(n => (
                        <div key={n._id} style={{ padding: '10px', borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.sub, fontFamily: "'Inter',sans-serif" }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: n.outcome === 'success' ? T.green : n.outcome === 'failure' ? T.red : T.amber, fontWeight: 700 }}>
                              {n.outcome.toUpperCase()}
                            </span>
                            <span style={{ color: T.muted }}>
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ color: T.text, marginBottom: 2 }}>
                            {n.eventType.replace(/_/g, ' ')}
                            {n.repositoryFullName && ` on ${n.repositoryFullName}`}
                          </div>
                          {n.pullRequestNumber && <div style={{ color: T.cyan }}>PR #{n.pullRequestNumber}</div>}
                          {n.failureReason && <div style={{ color: T.red, marginTop: 4 }}>{n.failureReason}</div>}
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar chip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '4px 10px',
                borderRadius: 9,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${T.border}`,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: `linear-gradient(135deg,${T.cyan}55,${T.violet}55)`,
                  border: `1px solid ${T.cyan}30`,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    alt="av"
                  />
                ) : (
                  <span
                    style={{
                      fontFamily: "'Inter',sans-serif",
                      fontSize: 10,
                      fontWeight: 800,
                      color: T.cyan,
                    }}
                  >
                    {(user?.login || 'D')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontFamily: "'Inter',sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.sub,
                }}
              >
                {user?.login || 'dev'}
              </span>
            </div>
          </div>
        </motion.header>

        {/* ── CONTENT ── */}
        <div
          className="ns mcontent"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px 32px',
            position: 'relative',
          }}
        >
          <AnimatePresence mode="wait">
            {/* DASHBOARD */}
            {page === 'dashboard' && (
              <motion.div
                key="dash"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
              >
                {/* Greeting + subtitle */}
                <div style={{ marginBottom: 24 }}>
                  <motion.h1
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                      fontFamily: "'Inter',sans-serif",
                      fontSize: 24,
                      fontWeight: 800,
                      color: T.text,
                      letterSpacing: '-0.5px',
                      marginBottom: 6,
                      lineHeight: 1.25,
                    }}
                  >
                    {greet()},{' '}
                    <span style={{ color: T.cyan }}>
                      {user?.login || 'Sentinel'}
                    </span>{' '}
                    👋
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.18 }}
                    style={{
                      fontFamily: "'Inter',sans-serif",
                      fontSize: 13,
                      color: T.sub,
                      lineHeight: 1.45,
                    }}
                  >
                    Here's what's happening with GitGuard AI today.
                  </motion.p>
                </div>

                {/* Stat cards */}
                <div
                  className="sgrid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4,1fr)',
                    gap: 14,
                    marginBottom: 24,
                  }}
                >
                  {STATS.map((s) => (
                    <StatCard key={s.label} {...s} />
                  ))}
                </div>

                {/* Quick actions */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.28 }}
                  style={{ marginBottom: 24 }}
                >
                  <SHead label="Quick Actions" accent={T.cyan} />
                  <div
                    className="sgrid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4,1fr)',
                      gap: 12,
                    }}
                  >
                    <QuickAction
                      icon={GitPullRequest}
                      title="View Reviews"
                      sub="See all PR analyses"
                      color={T.cyan}
                      onClick={() => setPage('reviews')}
                    />
                    <QuickAction
                      icon={GitBranch}
                      title="Repositories"
                      sub="Manage connected repos"
                      color={T.violet}
                      onClick={() => setPage('repos')}
                    />
                    <QuickAction
                      icon={BarChart2}
                      title="View Analytics"
                      sub="Audit AI performance"
                      color={T.green}
                      onClick={() => setPage('analytics')}
                    />
                    <QuickAction
                      icon={Settings}
                      title="System Settings"
                      sub="Configure guardrails"
                      color={T.amber}
                      onClick={() => setPage('settings')}
                    />
                  </div>
                </motion.div>

                {/* Middle row — reviews + health */}
                <div
                  className="mgrid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 300px',
                    gap: 18,
                    marginBottom: 18,
                  }}
                >
                  {/* Recent reviews */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.34 }}
                    style={{
                      background: T.panel,
                      border: `1px solid ${T.border}`,
                      borderRadius: 14,
                      overflow: 'hidden',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        padding: '16px 18px',
                        borderBottom: `1px solid ${T.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <SHead label="Recent Activity" accent={T.cyan} inline />
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        onClick={() => setPage('reviews')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 10px',
                          borderRadius: 7,
                          background: 'rgba(6,182,212,0.07)',
                          border: '1px solid rgba(6,182,212,0.16)',
                          color: T.cyan,
                          cursor: 'pointer',
                          fontFamily: "'Inter',sans-serif",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        <RefreshCw size={8} />
                        View All
                      </motion.button>
                    </div>
                    <div style={{ padding: '5px 7px' }}>
                      {reviews.length > 0 ? (
                        reviews.filter(r => !search || r.repository.fullName.toLowerCase().includes(search.toLowerCase()) || r.prTitle.toLowerCase().includes(search.toLowerCase()))
                        .slice(0, 5).map((r, i) => (
                          <ReviewRow key={i} item={{
                            repo: r.repository.fullName,
                            pr: `#${r.prNumber}`,
                            title: r.prTitle,
                            severity: r.findings?.[0]?.severity ?? 'Low',
                            bugs: r.metrics?.vulnerabilitiesCount ?? 0,
                            time: new Date(r.createdAt).toLocaleDateString()
                          }} delay={0.3 + i * 0.05} />
                        ))
                      ) : (
                        <div style={{ color: T.muted, padding: '10px', fontSize: 12, textAlign: 'center', fontFamily: "'Inter',sans-serif" }}>No reviews match the search.</div>
                      )}
                    </div>
                  </motion.div>

                  {/* System health */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.38 }}
                    style={{
                      background: T.panel,
                      border: `1px solid ${T.border}`,
                      borderRadius: 14,
                      padding: '16px 18px',
                      minWidth: 0,
                    }}
                  >
                    <SHead label="System Health" accent={T.green} />
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                        marginBottom: 16,
                      }}
                    >
                      <HealthRing pct={98} color={T.green} label="Security" />
                      <HealthRing pct={84} color={T.cyan} label="Quality" />
                      <HealthRing pct={91} color={T.violet} label="Coverage" />
                      <HealthRing pct={76} color={T.amber} label="Perf." />
                    </div>
                    <p
                      style={{
                        fontFamily: "'Inter',sans-serif",
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: T.muted,
                        marginBottom: 9,
                      }}
                    >
                      Issue Breakdown
                    </p>
                    {[
                      { l: 'Critical', c: T.red, p: 5, n: 2 },
                      { l: 'High', c: T.orange, p: 20, n: 8 },
                      { l: 'Medium', c: T.amber, p: 38, n: 15 },
                      { l: 'Low', c: T.green, p: 37, n: 14 },
                    ].map((b) => (
                      <div
                        key={b.l}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          marginBottom: 7,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Fira Code',monospace",
                            fontSize: 9,
                            color: b.c,
                            width: 38,
                            flexShrink: 0,
                          }}
                        >
                          {b.l}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 3,
                            borderRadius: 2,
                            background: 'rgba(255,255,255,0.04)',
                            overflow: 'hidden',
                          }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${b.p}%` }}
                            transition={{
                              duration: 0.8,
                              delay: 0.6,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            style={{
                              height: '100%',
                              borderRadius: 2,
                              background: b.c,
                              boxShadow: `0 0 4px ${b.c}45`,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: "'Fira Code',monospace",
                            fontSize: 9,
                            color: T.muted,
                            width: 12,
                            textAlign: 'right',
                            flexShrink: 0,
                          }}
                        >
                          {b.n}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                </div>

                {/* Bottom row — chart + terminal */}
                <div
                  className="bgrid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.42 }}
                    style={{
                      background: T.panel,
                      border: `1px solid ${T.border}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 14,
                      }}
                    >
                      <SHead label="PR Activity" accent={T.violet} />
                      <span
                        style={{
                          fontFamily: "'Fira Code',monospace",
                          fontSize: 9,
                          color: T.muted,
                          padding: '2px 8px',
                          borderRadius: 5,
                          background: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${T.border}`,
                        }}
                      >
                        This Week
                      </span>
                    </div>
                    <ActivityChart />
                    <div style={{ display: 'flex', marginTop: 12 }}>
                      {[
                        { l: 'Total PRs', v: '116', c: T.cyan },
                        { l: 'Bugs Found', v: '43', c: T.red },
                        { l: 'Auto-Fixed', v: '28', c: T.green },
                      ].map((s) => (
                        <div key={s.l} style={{ flex: 1, textAlign: 'center' }}>
                          <p
                            style={{
                              fontFamily: "'Fira Code',monospace",
                              fontSize: 16,
                              fontWeight: 800,
                              color: s.c,
                              letterSpacing: '-0.5px',
                            }}
                          >
                            {s.v}
                          </p>
                          <p
                            style={{
                              fontFamily: "'Inter',sans-serif",
                              fontSize: 8,
                              textTransform: 'uppercase',
                              letterSpacing: '0.7px',
                              color: T.muted,
                            }}
                          >
                            {s.l}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.46 }}
                    style={{
                      background: T.panel,
                      border: `1px solid ${T.border}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <SHead label="Live Sentinel Log" accent={T.green} />
                    </div>
                    <Terminal />
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3,1fr)',
                        gap: 7,
                        marginTop: 10,
                      }}
                    >
                      {[
                        { icon: Cpu, l: 'LLM Calls', v: '2.4k', c: T.violet },
                        { icon: Database, l: 'DB Ops', v: '18k', c: T.cyan },
                        {
                          icon: Code,
                          l: 'Lines Scanned',
                          v: '94k',
                          c: T.green,
                        },
                      ].map(({ icon: Icon, l, v, c }) => (
                        <div
                          key={l}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            padding: '9px 5px',
                            borderRadius: 9,
                            background: `${c}07`,
                            border: `1px solid ${c}12`,
                            textAlign: 'center',
                          }}
                        >
                          <Icon size={11} style={{ color: c }} />
                          <span
                            style={{
                              fontFamily: "'Fira Code',monospace",
                              fontSize: 11,
                              fontWeight: 800,
                              color: T.text,
                            }}
                          >
                            {v}
                          </span>
                          <span
                            style={{
                              fontFamily: "'Inter',sans-serif",
                              fontSize: 7.5,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              color: T.muted,
                              lineHeight: 1.3,
                            }}
                          >
                            {l}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Repos */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  style={{
                    background: T.panel,
                    border: `1px solid ${T.border}`,
                    borderRadius: 14,
                    padding: '14px 16px',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <SHead label="Monitored Repositories" accent={T.amber} />
                    <span
                      style={{
                        fontFamily: "'Fira Code',monospace",
                        fontSize: 9,
                        color: T.muted,
                      }}
                    >
                      47 total
                    </span>
                  </div>
                  <div
                    className="rgrid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4,1fr)',
                      gap: 8,
                    }}
                  >
                    {[
                      {
                        name: 'opsmind-ai',
                        prs: 44,
                        bugs: 12,
                        score: 94,
                        lang: 'TS',
                      },
                      {
                        name: 'gitguard',
                        prs: 17,
                        bugs: 4,
                        score: 98,
                        lang: 'TS',
                      },
                      {
                        name: 'api-core',
                        prs: 91,
                        bugs: 22,
                        score: 87,
                        lang: 'JS',
                      },
                      {
                        name: 'dashboard',
                        prs: 5,
                        bugs: 1,
                        score: 99,
                        lang: 'TSX',
                      },
                    ].map((r, i) => (
                      <motion.div
                        key={r.name}
                        initial={{ opacity: 0, scale: 0.93 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.32, delay: 0.55 + i * 0.05 }}
                        whileHover={{ y: -3, scale: 1.02 }}
                        style={{
                          padding: '11px 13px',
                          borderRadius: 11,
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.02)',
                          border: `1px solid ${T.border}`,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 7,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <GitBranch size={10} style={{ color: T.cyan }} />
                            <span
                              style={{
                                fontFamily: "'Fira Code',monospace",
                                fontSize: 10,
                                fontWeight: 700,
                                color: T.text,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 70,
                              }}
                            >
                              {r.name}
                            </span>
                          </div>
                          <span
                            style={{
                              fontFamily: "'Fira Code',monospace",
                              fontSize: 8,
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: 'rgba(6,182,212,0.1)',
                              color: T.cyan,
                            }}
                          >
                            {r.lang}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontFamily: "'Fira Code',monospace",
                            fontSize: 9,
                            marginBottom: 7,
                          }}
                        >
                          <span style={{ color: T.muted }}>{r.prs} PRs</span>
                          <span
                            style={{ color: r.bugs > 10 ? T.red : T.green }}
                          >
                            {r.bugs} bugs
                          </span>
                          <span
                            style={{ color: r.score >= 95 ? T.green : T.amber }}
                          >
                            {r.score}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: 2.5,
                            borderRadius: 2,
                            background: 'rgba(255,255,255,0.04)',
                            overflow: 'hidden',
                          }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${r.score}%` }}
                            transition={{
                              duration: 0.75,
                              delay: 0.6 + i * 0.06,
                            }}
                            style={{
                              height: '100%',
                              borderRadius: 2,
                              background:
                                r.score >= 95
                                  ? `linear-gradient(90deg,${T.green},${T.cyan})`
                                  : `linear-gradient(90deg,${T.amber},${T.cyan})`,
                            }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <div style={{ height: 12 }} />
              </motion.div>
            )}

            {page === 'reviews' && (
              <motion.div
                key="rev"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <PageHeader
                  title="PR Reviews"
                  subtitle="All pull request analyses from your connected repositories."
                />
                <div
                  style={{
                    background: T.panel,
                    border: `1px solid ${T.border}`,
                    borderRadius: 14,
                    overflow: 'hidden',
                    padding: '6px 8px',
                  }}
                >
                  {reviews.length > 0 ? (
                    reviews.map((r, i) => (
                      <ReviewRow key={i} item={{
                        repo: r.repository.fullName,
                        pr: `#${r.prNumber}`,
                        title: r.prTitle,
                        severity: r.findings?.[0]?.severity ?? 'Low',
                        bugs: r.metrics?.vulnerabilitiesCount ?? 0,
                        time: new Date(r.createdAt).toLocaleDateString()
                      }} delay={i * 0.04} />
                    ))
                  ) : (
                    <div style={{ color: T.muted, padding: '16px', fontSize: 12, textAlign: 'center', fontFamily: "'Inter',sans-serif" }}>No reviews found.</div>
                  )}
                </div>
              </motion.div>
            )}
            {page === 'repos' && (
              <motion.div
                key="rp"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <PageHeader
                  title="Repositories"
                  subtitle="Manage and monitor repositories connected to GitGuard AI."
                />
                <Placeholder title="Repositories" icon={GitBranch} compact />
              </motion.div>
            )}
            {page === 'analytics' && (
              <motion.div
                key="an"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <PageHeader
                  title="Analytics"
                  subtitle="Audit AI review performance, latency, and issue trends."
                />
                <Placeholder title="Analytics" icon={BarChart2} compact />
              </motion.div>
            )}
            {page === 'alerts' && (
              <motion.div
                key="al"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <PageHeader
                  title="Alerts"
                  subtitle="Critical findings and sentinel notifications across your org."
                />
                <Placeholder title="Alerts" icon={AlertTriangle} compact />
              </motion.div>
            )}
            {page === 'settings' && (
              <motion.div
                key="st"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <PageHeader
                  title="Settings"
                  subtitle="Configure guardrails, webhooks, and integration preferences."
                />
                <Placeholder title="Settings" icon={Settings} compact />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <MobileBar page={page} setPage={setPage} />
    </div>
  );
};

export default DashboardPage;
