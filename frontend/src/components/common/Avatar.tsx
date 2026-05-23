/**
 * @file components/common/Avatar.tsx
 * @description User avatar with image fallback to initials.
 */

import React, { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 36, className }) => {
  const [imgError, setImgError] = useState(false);

  const initials = name
    .split(/[\s-_]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid rgba(99,102,241,0.3)',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: size * 0.38,
        flexShrink: 0,
        border: '2px solid rgba(99,102,241,0.3)',
        userSelect: 'none',
      }}
    >
      {initials || '?'}
    </div>
  );
};

export default Avatar;
