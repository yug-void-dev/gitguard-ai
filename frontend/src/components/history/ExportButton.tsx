/**
 * @file components/history/ExportButton.tsx
 * @description CSV export button for the History page.
 * Calls historyService.exportHistoryCSV() with the current visible reviews.
 */

import React, { useState } from 'react';
import { Download, CheckCircle } from 'lucide-react';
import { exportHistoryCSV } from '../../services/history.service';
import type { Review } from '../../types/review.types';
import Button from '../common/Button';

interface ExportButtonProps {
  reviews: Review[];
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ reviews, disabled }) => {
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    exportHistoryCSV(reviews);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  return (
    <Button
      variant="secondary"
      size="md"
      onClick={handleExport}
      disabled={disabled || reviews.length === 0}
      leftIcon={
        exported ? <CheckCircle size={14} color="#34d399" /> : <Download size={14} />
      }
    >
      {exported ? 'Exported!' : 'Export CSV'}
    </Button>
  );
};

export default ExportButton;
