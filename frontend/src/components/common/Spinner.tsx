/**
 * @file components/common/Spinner.tsx
 * @description Lightweight CSS-animated loading spinner.
 */

import React from 'react';

interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 20,
  color = '#818cf8',
  className,
}) => {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${Math.max(2, size * 0.12)}px solid rgba(255,255,255,0.1)`,
        borderTopColor: color,
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
      aria-label="Loading"
      role="status"
    />
  );
};

export default Spinner;
