/**
 * @file components/settings/PreferencesToggle.tsx
 * @description Reusable animated toggle switch for preferences
 */

import React from 'react';
import { motion } from 'framer-motion';
import { T } from '../../constants/theme';

interface PreferencesToggleProps {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  color?: string;
}

export const PreferencesToggle: React.FC<PreferencesToggleProps> = ({
  label,
  desc,
  checked,
  onChange,
  color = T.cyan,
}) => (
  <motion.label
    whileHover={{ x: 2 }}
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      background: 'rgba(0,0,0,0.22)',
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '16px 20px',
      cursor: 'pointer',
      transition: 'border-color 0.25s, box-shadow 0.25s',
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.borderColor = `${color}50`;
      e.currentTarget.style.boxShadow = `0 0 12px ${color}06`;
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.borderColor = T.border;
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: T.textSecondary }}>{desc}</div>
    </div>

    <motion.div
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? color : 'rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        padding: '2px 4px',
        cursor: 'pointer',
        flexShrink: 0,
      }}
      onClick={() => onChange(!checked)}
    >
      <motion.div
        layout
        style={{
          width: 18,
          height: 18,
          borderRadius: 10,
          background: T.bg,
        }}
        transition={{ type: 'spring', damping: 15 }}
      />
    </motion.div>
  </motion.label>
);
