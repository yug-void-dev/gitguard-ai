/**
 * @file components/common/Badge.tsx
 * @description Versatile badge/pill for status labels and severity indicators.
 */

import React from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'pending';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
  success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  warning: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  error: 'bg-red-500/15 border-red-500/30 text-red-400',
  info: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
  pending: 'bg-violet-500/15 border-violet-500/30 text-violet-400',
};

const DOT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  info: 'bg-sky-400',
  pending: 'bg-violet-400',
};

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', dot = false, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium',
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full animate-pulse', DOT_STYLES[variant])}
        />
      )}
      {children}
    </span>
  );
};

/** Map review status → badge variant */
export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'pending': return 'pending';
    default: return 'default';
  }
}

export default Badge;
