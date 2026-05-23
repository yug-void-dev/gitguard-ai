import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const T = {
  cyan: '#06b6d4',
  violet: '#818cf8',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  orange: '#f97316',
  muted: '#475569',
};

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

export function DashboardTerminal() {
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
