import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import { T } from '../../constants/theme';

const EASE = [0.22, 1, 0.36, 1] as const;

export const AnimSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
}> = ({ value, onChange, options, icon }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const current = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ borderColor: `${T.cyan}40` }}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 12,
          cursor: 'pointer',
          background: T.panel,
          border: `1px solid ${open ? T.cyan + '45' : T.border}`,
          color: T.sub,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          whiteSpace: 'nowrap',
          transition: 'border-color 0.18s',
        }}
      >
        {icon && (
          <span style={{ color: T.muted, display: 'flex' }}>{icon}</span>
        )}
        {current}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={13} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: EASE }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              minWidth: '100%',
              zIndex: 100,
              background: 'rgba(8,12,24,0.97)',
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: `0 16px 40px rgba(0,0,0,0.5), 0 0 20px ${T.cyan}08`,
              backdropFilter: 'blur(16px)',
            }}
          >
            {options.map((opt, i) => (
              <motion.button
                key={opt.value}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  textAlign: 'left',
                  background:
                    value === opt.value ? `${T.cyan}12` : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: value === opt.value ? T.cyan : T.sub,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderLeft:
                    value === opt.value
                      ? `2px solid ${T.cyan}`
                      : '2px solid transparent',
                  transition: 'background 0.15s, color 0.15s',
                }}
                whileHover={{
                  background: 'rgba(255,255,255,0.05)',
                  color: T.text,
                }}
              >
                {value === opt.value && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <CheckCircle2 size={11} />
                  </motion.div>
                )}
                {opt.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
