/**
 * @file components/layout/AppBackground.tsx
 * @description Global ambient background for all dashboard/app pages.
 *
 * Layer stack (bottom → top):
 *   1. Radial colour blobs  (purely decorative ambiance)
 *   2. Dot-grid texture
 *   3. Floating soap bubbles
 *   4. Content-protection vignette — a soft dark overlay that keeps
 *      the mid-screen area readable without removing any decorations.
 *      This is the key technique: content cards sit on top of it and pop.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FloatingBubbles } from './FloatingBubbles';

export const AppBackground: React.FC = () => (
  <div
    aria-hidden="true"
    style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}
  >
    {/* ── Layer 1: Ambient radial colour blobs (very soft) ── */}
    {[
      { c: 'rgba(6,182,212,0.06)',   s: 480, t: '-8%',  l: '-8%'  },
      { c: 'rgba(129,140,248,0.05)', s: 400, t: '52%',  l: '62%'  },
      { c: 'rgba(16,185,129,0.04)',  s: 340, t: '76%',  l: '16%'  },
      { c: 'rgba(236,72,153,0.03)',  s: 280, t: '18%',  l: '80%'  },
    ].map((b, i) => (
      <motion.div
        key={i}
        animate={{ scale: [1, 1.07, 0.95, 1] }}
        transition={{ duration: 24, repeat: Infinity, delay: i * 6, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          borderRadius: '50%',
          width:  b.s,
          height: b.s,
          top:  b.t,
          left: b.l,
          background: `radial-gradient(circle, ${b.c}, transparent 70%)`,
          filter: 'blur(80px)',
        }}
      />
    ))}

    {/* ── Layer 2: Subtle dot-grid texture ── */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(circle, rgba(6,182,212,0.07) 1px, transparent 1px)`,
        backgroundSize: '44px 44px',
        opacity: 0.5,
      }}
    />

    {/* ── Layer 3: Floating soap bubbles ── */}
    <FloatingBubbles count={18} />

    {/* ── Layer 4: Content-protection vignette ──────────────────────────────
        This is the magic layer. It's a radial dark overlay — pitch-black at
        the very edges (frame), softening toward the centre but never fully
        transparent. It "grounds" the content area while the ambient decoration
        still peeks through around the periphery. Content cards appear on top
        with their own glass backgrounds, so they pop cleanly.
    ─────────────────────────────────────────────────────────────────────── */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(
            ellipse 80% 70% at 50% 50%,
            rgba(6, 10, 20, 0.0)  0%,
            rgba(6, 10, 20, 0.25) 55%,
            rgba(6, 10, 20, 0.55) 100%
          )
        `,
      }}
    />
  </div>
);
