/**
 * @file components/dashboard/LiveReviewFeed.tsx
 * @description Real-time incoming review event stream panel.
 * Connects via useWebSocket and displays the last N events with
 * animated entry transitions using framer-motion.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, XCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { useWebSocket, type WSReviewEvent } from '../../hooks/useWebSocket';
import { formatRelativeTime } from '../../utils/formatDate';
import { truncateText } from '../../utils/truncateText';
import Badge, { statusVariant } from '../common/Badge';

const EVENT_ICONS = {
  'review:completed': <CheckCircle2 size={14} color="#34d399" />,
  'review:failed': <XCircle size={14} color="#f87171" />,
  'review:queued': <Clock size={14} color="#a78bfa" />,
};

const LiveReviewFeed: React.FC = () => {
  const { events, isConnected, clearEvents } = useWebSocket(true);

  return (
    <div
      style={{
        background: 'rgba(10,11,30,0.7)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 16,
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 300,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={15} color="#818cf8" />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              color: '#e2e8f0',
            }}
          >
            Live Feed
          </span>
          {/* Connection indicator */}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              color: isConnected ? '#34d399' : '#f87171',
            }}
          >
            {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
            {isConnected ? 'Live' : 'Polling'}
          </span>
        </div>

        {events.length > 0 && (
          <button
            onClick={clearEvents}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(148,163,184,0.5)',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'var(--font-body)',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Event list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {events.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 8,
              color: 'rgba(148,163,184,0.3)',
              padding: '32px',
            }}
          >
            <Zap size={28} />
            <span style={{ fontSize: 13 }}>Waiting for events…</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((evt, i) => (
              <FeedEvent key={`${evt.payload.id}-${i}`} event={evt} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// ─── Individual event row ─────────────────────────────────────────────────────

const FeedEvent: React.FC<{ event: WSReviewEvent }> = ({ event }) => {
  const { type, payload, timestamp } = event;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      style={{ overflow: 'hidden' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 10,
          marginBottom: 4,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(99,102,241,0.08)',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')
        }
      >
        <span style={{ marginTop: 2, flexShrink: 0 }}>
          {EVENT_ICONS[type] ?? <Clock size={14} color="#94a3b8" />}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#e2e8f0',
                fontFamily: 'var(--font-body)',
              }}
            >
              {payload.repository?.fullName ?? 'Unknown repo'}
            </span>
            {payload.status && (
              <Badge variant={statusVariant(payload.status)}>
                {payload.status}
              </Badge>
            )}
          </div>

          {payload.prTitle && (
            <p
              style={{
                fontSize: 11,
                color: 'rgba(148,163,184,0.6)',
                margin: '2px 0 0',
                fontFamily: 'var(--font-body)',
              }}
            >
              {truncateText(payload.prTitle, 60)}
            </p>
          )}
        </div>

        <span
          style={{
            fontSize: 10,
            color: 'rgba(148,163,184,0.4)',
            flexShrink: 0,
            marginTop: 2,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {formatRelativeTime(timestamp)}
        </span>
      </div>
    </motion.div>
  );
};

export default LiveReviewFeed;
