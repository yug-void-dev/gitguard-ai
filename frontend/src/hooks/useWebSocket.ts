/**
 * @file hooks/useWebSocket.ts
 * @description Hook for real-time review event streaming.
 * Attempts a native WebSocket connection to the backend and falls back
 * to HTTP polling when the socket is unavailable (e.g. local dev without Redis).
 *
 * Emitted events:
 *   review:completed  – a PR review finished successfully
 *   review:failed     – a PR review job failed
 *   review:queued     – a new PR was received and queued
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { FEED_POLL_INTERVAL_MS, WS_URL } from '../constants/config';
import type { Review } from '../types/review.types';

export type WSEventType = 'review:completed' | 'review:failed' | 'review:queued';

export interface WSReviewEvent {
  type: WSEventType;
  payload: Partial<Review> & { id: string };
  timestamp: string;
}

export interface UseWebSocketReturn {
  /** Latest events received (capped at 50). */
  events: WSReviewEvent[];
  /** Whether the WebSocket is currently connected. */
  isConnected: boolean;
  /** Clears the event list. */
  clearEvents: () => void;
}

/** Maximum number of live events to keep in memory. */
const MAX_EVENTS = 50;

export function useWebSocket(enabled = true): UseWebSocketReturn {
  const [events, setEvents] = useState<WSReviewEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const pushEvent = useCallback((evt: WSReviewEvent) => {
    if (!isMountedRef.current) return;
    setEvents((prev) => [evt, ...prev].slice(0, MAX_EVENTS));
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);

  // ─── WebSocket connection ────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!enabled || !isMountedRef.current) return;

    try {
      const wsUrl = WS_URL.replace(/^http/, 'ws') + '/ws/reviews';
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        // Stop polling fallback if it was running
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data: WSReviewEvent = JSON.parse(event.data);
          pushEvent(data);
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        socketRef.current = null;
        // Start polling fallback & schedule reconnect
        startPolling();
        reconnectTimerRef.current = setTimeout(connect, 8_000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not supported — use polling
      startPolling();
    }
  }, [enabled, pushEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── HTTP polling fallback ────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return; // already polling
    // Polling is a lightweight GET to /api/reviews?limit=5&sortOrder=desc
    // We track the last seen ID to avoid duplicates
    let lastSeenId: string | null = null;

    const poll = async () => {
      if (!isMountedRef.current) return;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/reviews?limit=5&sortOrder=desc`,
          { credentials: 'include' },
        );
        if (!res.ok) return;
        const json = await res.json();
        const reviews: Review[] = json.reviews ?? [];
        const newOnes = lastSeenId
          ? reviews.filter((r) => r.id !== lastSeenId && r.createdAt > (lastSeenId ?? ''))
          : reviews.slice(0, 1);
        if (reviews.length > 0) lastSeenId = reviews[0].id;
        newOnes.forEach((r) =>
          pushEvent({
            type: r.status === 'completed' ? 'review:completed' : 'review:failed',
            payload: r,
            timestamp: r.updatedAt,
          }),
        );
      } catch {
        // Network error — silently retry next interval
      }
    };

    poll(); // immediate first call
    pollTimerRef.current = setInterval(poll, FEED_POLL_INTERVAL_MS);
  }, [pushEvent]);

  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) connect();

    return () => {
      isMountedRef.current = false;
      socketRef.current?.close();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [enabled, connect]);

  return { events, isConnected, clearEvents };
}
