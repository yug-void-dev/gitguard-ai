/**
 * @file components/reviews/SeverityTag.tsx
 * @description Inline severity chip used in FindingCard and tables.
 */

import React from 'react';
import { severityTextClass, severityBgClass } from '../../utils/severityColor';
import { SEVERITY_LABELS } from '../../constants/severity';
import type { SeverityLevel } from '../../constants/severity';

interface SeverityTagProps {
  severity: string;
  size?: 'sm' | 'md';
}

const SeverityTag: React.FC<SeverityTagProps> = ({ severity, size = 'sm' }) => {
  const label = SEVERITY_LABELS[severity as SeverityLevel] ?? severity;
  const textCls = severityTextClass(severity);
  const bgCls = severityBgClass(severity);

  return (
    <span
      className={`inline-flex items-center border rounded-full font-semibold uppercase tracking-wider ${textCls} ${bgCls} ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
    >
      {label}
    </span>
  );
};

export default SeverityTag;
