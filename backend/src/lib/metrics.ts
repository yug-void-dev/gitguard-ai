/**
 * @file src/lib/metrics.ts
 * @description Prometheus metrics registry and custom metric definitions.
 */

import client from 'prom-client';

// ── Registry Setup ──────────────────────────────────────────────────────────
export const registry = new client.Registry();

// Enable default Node.js metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register: registry, prefix: 'gitguard_' });

// ── Custom Product Metrics ──────────────────────────────────────────────────

export const reviewsTotalCounter = new client.Counter({
  name: 'gitguard_reviews_total',
  help: 'Total number of PR reviews processed',
  labelNames: ['status', 'repository'],
  registers: [registry],
});

export const reviewLatencyHistogram = new client.Histogram({
  name: 'gitguard_review_latency_seconds',
  help: 'Latency of the LLM analysis stage in seconds',
  labelNames: ['repository'],
  buckets: [1, 5, 10, 30, 60, 120, 300], // Latency buckets
  registers: [registry],
});
