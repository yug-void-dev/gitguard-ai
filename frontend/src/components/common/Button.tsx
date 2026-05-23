/**
 * @file components/common/Button.tsx
 * @description Primary, secondary, ghost, and danger button variants.
 * Supports icon-only, loading state, and full-width modes.
 */

import React from 'react';
import { cn } from '../../utils/cn';
import Spinner from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_BASE = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 rounded-xl border cursor-pointer select-none';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: [
    'bg-gradient-to-r from-indigo-600 to-cyan-500',
    'border-transparent text-white',
    'hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5',
    'active:translate-y-0 active:shadow-none',
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none',
  ].join(' '),

  secondary: [
    'bg-white/5 border-white/10 text-slate-200',
    'hover:bg-white/10 hover:border-indigo-500/40',
    'active:bg-white/5',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),

  ghost: [
    'bg-transparent border-transparent text-slate-400',
    'hover:text-slate-200 hover:bg-white/5',
    'active:bg-white/10',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),

  danger: [
    'bg-red-500/10 border-red-500/30 text-red-400',
    'hover:bg-red-500/20 hover:border-red-400/50',
    'active:bg-red-500/10',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),

  outline: [
    'bg-transparent border-indigo-500/40 text-indigo-400',
    'hover:bg-indigo-500/10 hover:border-indigo-400',
    'active:bg-indigo-500/5',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  className,
  ...rest
}) => {
  return (
    <button
      className={cn(
        VARIANT_BASE,
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Spinner size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
};

export default Button;
