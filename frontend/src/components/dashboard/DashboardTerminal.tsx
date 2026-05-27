import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useWebSocket } from '../../hooks/useWebSocket';

const T = {
  cyan: '#06b6d4',
  violet: '#818cf8',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  orange: '#f97316',
  muted: '#475569',
};

const LC: Record<string, string> = {
  INFO: T.cyan,
  WARN: T.amber,
  CRIT: T.red,
  HIGH: T.orange,
  SUCC: T.green,
};

export function DashboardTerminal() {
  const { events, isConnected } = useWebSocket(true);
  const [terminalLines, setTerminalLines] = useState<Array<{ t: string; lvl: string; msg: string }>>([
    { t: new Date().toLocaleTimeString().slice(0, 5), lvl: 'INFO', msg: 'Initializing Sentinel AI agent...' },
    { t: new Date().toLocaleTimeString().slice(0, 5), lvl: 'INFO', msg: 'System integrity verification complete ✓' },
  ]);
  const end = useRef<HTMLDivElement>(null);

  // Tracks connection updates
  useEffect(() => {
    setTerminalLines((prev) => [
      ...prev,
      {
        t: new Date().toLocaleTimeString().slice(0, 5),
        lvl: 'INFO',
        msg: isConnected
          ? 'Connected to Sentinel real-time socket server ✓'
          : 'Connecting to real-time socket... falling back to polling feed.',
      },
    ]);
  }, [isConnected]);

  // Processes incoming websocket event updates
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[0];
      const timeStr = new Date(latestEvent.timestamp || new Date()).toLocaleTimeString().slice(0, 5);
      let lvl = 'INFO';
      let msg = '';

      if (latestEvent.type === 'review:queued') {
        lvl = 'INFO';
        msg = `PR #${latestEvent.payload.prNumber || '?'} enqueued for AI review: "${latestEvent.payload.prTitle || ''}"`;
      } else if (latestEvent.type === 'review:completed') {
        lvl = 'SUCC';
        const score = latestEvent.payload.metrics?.codeQualityScore ?? 100;
        const bugs = latestEvent.payload.metrics?.vulnerabilitiesCount ?? 0;
        msg = `PR #${latestEvent.payload.prNumber || '?'} review complete ✓ Score: ${score}% | Vulnerabilities: ${bugs}`;
      } else if (latestEvent.type === 'review:failed') {
        lvl = 'CRIT';
        msg = `PR #${latestEvent.payload.prNumber || '?'} review pipeline failed ✗`;
      }

      if (msg) {
        setTerminalLines((prev) => [...prev, { t: timeStr, lvl, msg }]);
      }
    }
  }, [events]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

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
        {terminalLines.map((l, i) => (
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
        <div ref={end} />
      </div>
    </div>
  );
}
