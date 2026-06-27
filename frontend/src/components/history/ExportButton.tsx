/**
 * @file components/history/ExportButton.tsx
 * @description CSV export button for the History page.
 * Calls historyService.exportHistoryCSV() with the current visible reviews.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle } from 'lucide-react';
import { exportHistoryCSV } from '../../services/history.service';
import type { Review } from '../../types/review.types';
import { T } from '../../constants/theme';

interface ExportButtonProps {
  reviews: Review[];
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ reviews, disabled }) => {
  const [exported, setExported] = useState(false);
  const isDisabled = disabled || reviews.length === 0;

  const handleExport = () => {
    if (isDisabled) return;
    exportHistoryCSV(reviews);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.04, borderColor: `${T.green}55` } : {}}
      whileTap={!isDisabled ? { scale: 0.96 } : {}}
      onClick={handleExport}
      disabled={isDisabled}
      style={{
        padding: '11px 18px',
        borderRadius: 12,
        background: exported ? `${T.green}18` : T.panel,
        color: exported ? T.green : T.text,
        border: `1px solid ${exported ? T.green + '55' : T.border}`,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontWeight: 600,
        fontSize: 13,
        opacity: isDisabled ? 0.45 : 1,
        transition: 'background 0.25s, color 0.25s, border-color 0.25s',
        whiteSpace: 'nowrap',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {exported
        ? <CheckCircle size={15} color={T.green} />
        : <Download size={15} color={isDisabled ? T.muted : T.green} />
      }
      {exported ? 'Exported!' : 'Export CSV'}
    </motion.button>
  );
};

export default ExportButton;
