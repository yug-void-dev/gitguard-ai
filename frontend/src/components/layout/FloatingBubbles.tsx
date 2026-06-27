/**
 * @file components/layout/FloatingBubbles.tsx
 * @description Cute floating soap bubbles — subtle background decoration.
 * Deliberately kept very soft (low opacity, small sizes) so the main content
 * always stays readable. The bubbles are purely ambient — they should be
 * noticed only when you're not focused on the content.
 */

import React, { useMemo } from 'react';

interface Bubble {
  id: number;
  size: number;
  left: number;
  duration: number;
  delay: number;
  color: string;
  borderColor: string;
  swayAmount: number;
}

// Very soft palette — low alpha so bubbles stay firmly in the background
const COLORS = [
  { fill: 'rgba(6,182,212,0.07)',   border: 'rgba(6,182,212,0.25)'   }, // cyan
  { fill: 'rgba(129,140,248,0.07)', border: 'rgba(129,140,248,0.25)' }, // violet
  { fill: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.22)' }, // purple
  { fill: 'rgba(236,72,153,0.05)',  border: 'rgba(236,72,153,0.20)'  }, // pink
  { fill: 'rgba(34,211,238,0.06)',  border: 'rgba(34,211,238,0.22)'  }, // teal
  { fill: 'rgba(99,102,241,0.07)',  border: 'rgba(99,102,241,0.25)'  }, // indigo
];

// Inject keyframes once into <head>
const KEYFRAMES = `
@keyframes bubbleFloat {
  0%   { transform: translateY(0px) translateX(0px) scale(1);   opacity: 0;    }
  10%  { opacity: 1; }
  50%  { transform: translateY(-48vh) translateX(var(--sway)) scale(1.03); opacity: 1; }
  90%  { opacity: 0.6; }
  100% { transform: translateY(-108vh) translateX(0px) scale(0.96); opacity: 0; }
}
@keyframes bubbleShimmer {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.65; }
}
`;

let injected = false;
function injectKeyframes() {
  if (injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  injected = true;
}

interface FloatingBubblesProps {
  count?: number;
  variant?: 'default' | 'login';
}

export const FloatingBubbles: React.FC<FloatingBubblesProps> = ({
  count = 18,
  variant = 'default',
}) => {
  injectKeyframes();

  const bubbles = useMemo<Bubble[]>(() => {
    const result: Bubble[] = [];
    // Login panel is narrower — fewer bubbles
    const total = variant === 'login' ? Math.min(count, 12) : count;

    for (let i = 0; i < total; i++) {
      const c = COLORS[i % COLORS.length];
      const sizeRoll = Math.random();
      // Intentionally smaller than before — tiny/small only, medium rarely
      const size =
        sizeRoll < 0.70
          ? Math.random() * 8 + 4     // tiny:   4–12px  (70%)
          : sizeRoll < 0.93
          ? Math.random() * 8 + 12    // small:  12–20px (23%)
          : Math.random() * 8 + 20;   // medium: 20–28px  (7%)

      result.push({
        id: i,
        size,
        left: Math.random() * 96 + 2,
        duration: Math.random() * 18 + 16,  // 16–34s — slower = more subtle
        delay: -(Math.random() * 24),        // stagger mid-flight at load
        color: c.fill,
        borderColor: c.border,
        swayAmount: (Math.random() - 0.5) * 60,
      });
    }
    return result;
  }, [count, variant]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        // Master opacity dial — one place to control how prominent bubbles are
        opacity: 0.55,
      }}
    >
      {bubbles.map((b) => (
        <div
          key={b.id}
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            background: b.color,
            border: `1px solid ${b.borderColor}`,
            // Glow is very soft — no distracting halos
            boxShadow: `0 0 ${b.size * 0.4}px ${b.borderColor}`,
            ['--sway' as string]: `${b.swayAmount}px`,
            animation: `bubbleFloat ${b.duration}s ease-in-out ${b.delay}s infinite`,
            willChange: 'transform, opacity',
          }}
        >
          {/* Subtle gloss crescent */}
          <div
            style={{
              position: 'absolute',
              top: '16%',
              left: '18%',
              width: '28%',
              height: '20%',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.30)',
              filter: 'blur(1px)',
              animation: `bubbleShimmer ${b.duration * 0.55}s ease-in-out ${b.delay}s infinite`,
            }}
          />
        </div>
      ))}
    </div>
  );
};
