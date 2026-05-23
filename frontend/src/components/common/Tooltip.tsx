/**
 * @file components/common/Tooltip.tsx
 * @description Simple hover tooltip implemented with pure CSS positioning.
 * No external dependency — keeps bundle size down.
 * Fixed: useRef now takes null as initial value (required in React 19).
 */

import React, { useState } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: TooltipPosition;
  delay?: number;
}

const POSITION_STYLES: Record<TooltipPosition, React.CSSProperties> = {
  top:    { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
  bottom: { top:    'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
  left:   { right:  'calc(100% + 6px)', top:  '50%', transform: 'translateY(-50%)' },
  right:  { left:   'calc(100% + 6px)', top:  '50%', transform: 'translateY(-50%)' },
};

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
}) => {
  const [visible, setVisible] = useState(false);
  // React 19 requires an explicit initial value for useRef
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {visible && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 500,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            background: 'rgba(10,11,30,0.96)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#e2e8f0',
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            padding: '5px 10px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.15s ease',
            ...POSITION_STYLES[position],
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
};

export default Tooltip;
