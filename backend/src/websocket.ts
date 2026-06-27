/**
 * @file src/websocket.ts
 * @description WebSocket Server implementation for real-time review event streaming.
 */

import { Server as HttpServer } from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';
import { logger } from './lib/logger';

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: HttpServer): void {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const { pathname } = new URL(
        request.url || '',
        `http://${request.headers.host || 'localhost'}`,
      );

      if (pathname === '/ws/reviews') {
        wss?.handleUpgrade(request, socket, head, (ws) => {
          wss?.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (err) {
      logger.error({ err }, '🔌 WebSocket connection upgrade failed');
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    logger.info('🔌 New WebSocket client connected');

    ws.on('close', () => {
      logger.info('🔌 WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ err }, '🔌 WebSocket error');
    });
  });

  logger.info('🔌 WebSocket server initialized on /ws/reviews');
}

/**
 * Broadcasts real-time events to all connected frontend clients via WebSockets.
 * Used to push asynchronous PR review updates (queued, processing, completed)
 * directly to the UI without requiring polling.
 *
 * @param event - The payload containing the event type, repository details, and review state.
 */
export function broadcastReviewEvent(event: {
  type: 'review:completed' | 'review:failed' | 'review:queued';
  payload: Record<string, unknown>;
  timestamp: string;
}): void {
  if (!wss) {
    logger.warn('🔌 WebSocket server not initialized; cannot broadcast event');
    return;
  }

  const data = JSON.stringify(event);
  let count = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
        count++;
      } catch (err) {
        logger.error({ err }, '🔌 Failed to send message to client');
      }
    }
  });

  logger.debug(
    { eventType: event.type, clientCount: count },
    '🔌 Broadcasted WebSocket event',
  );
}
