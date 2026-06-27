/**
 * @file components/history/ExportPdfButton.tsx
 * @description PDF export button for the History page.
 * Uses jsPDF to format the active reviews list into a clean, downloadable PDF report.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { Review } from '../../types/review.types';
import { T } from '../../constants/theme';

interface ExportPdfButtonProps {
  reviews: Review[];
  disabled?: boolean;
}

export const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({ reviews, disabled }) => {
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Colors
      const primaryColor = [6, 182, 212]; // T.cyan (Cyan 500)
      const textColor = [226, 232, 240]; // Dark text (slate 200)
      const subTextColor = [148, 163, 184]; // Muted text (slate 400)
      
      // Page styling helper (Header & Footer)
      const drawHeaderFooter = (pageNumber: number) => {
        // Dark header block
        doc.setFillColor(15, 23, 42); // slate 900
        doc.rect(0, 0, 210, 38, 'F');

        // Cyan accent line
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 38, 210, 1.5, 'F');

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('GITGUARD AI', 14, 16);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('SENTINEL SECURITY AUDIT REPORT', 14, 22);

        // Metadata (right aligned)
        doc.setFontSize(8);
        doc.setTextColor(subTextColor[0], subTextColor[1], subTextColor[2]);
        const dateStr = `Audit Date: ${new Date().toLocaleString()}`;
        doc.text(dateStr, 196 - doc.getTextWidth(dateStr), 15);
        const scopeStr = `Scope: ${reviews.length} reviewed pull requests`;
        doc.text(scopeStr, 196 - doc.getTextWidth(scopeStr), 20);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate 500
        doc.text('CONFIDENTIAL - FOR INTERNAL USE ONLY', 14, 287);
        doc.text(`Page ${pageNumber}`, 196 - doc.getTextWidth(`Page ${pageNumber}`), 287);
      };

      let pageNumber = 1;
      drawHeaderFooter(pageNumber);

      // Table configuration
      const startY = 48;
      let currentY = startY;

      // Table Header Row
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setFillColor(30, 41, 59); // slate 800
      doc.rect(14, currentY, 182, 8, 'F');

      doc.setTextColor(255, 255, 255);
      doc.text('Repository', 16, currentY + 5.5);
      doc.text('PR', 82, currentY + 5.5);
      doc.text('Pull Request Title', 95, currentY + 5.5);
      doc.text('Status', 148, currentY + 5.5);
      doc.text('Quality', 168, currentY + 5.5);
      doc.text('Bugs', 186, currentY + 5.5);

      currentY += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      reviews.forEach((r, idx) => {
        // Page break logic (A4 is 297mm high, leave space for footer)
        if (currentY > 268) {
          doc.addPage();
          pageNumber++;
          drawHeaderFooter(pageNumber);
          
          currentY = startY;
          // Re-draw Table Header on new page
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(30, 41, 59);
          doc.rect(14, currentY, 182, 8, 'F');

          doc.setTextColor(255, 255, 255);
          doc.text('Repository', 16, currentY + 5.5);
          doc.text('PR', 82, currentY + 5.5);
          doc.text('Pull Request Title', 95, currentY + 5.5);
          doc.text('Status', 148, currentY + 5.5);
          doc.text('Quality', 168, currentY + 5.5);
          doc.text('Bugs', 186, currentY + 5.5);

          currentY += 8;
          doc.setFont('helvetica', 'normal');
        }

        // Zebra striping background
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252); // grey-50
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(14, currentY, 182, 7.5, 'F');

        // Row border separator
        doc.setDrawColor(241, 245, 249); // slate 100
        doc.setLineWidth(0.15);
        doc.line(14, currentY + 7.5, 196, currentY + 7.5);

        // Data fields styling
        doc.setTextColor(15, 23, 42); // slate 900 for body
        
        // Truncate fields if necessary
        const rawRepo = r.repository.fullName;
        const repo = rawRepo.length > 28 ? rawRepo.substring(0, 26) + '...' : rawRepo;
        
        const rawTitle = r.prTitle;
        const title = rawTitle.length > 30 ? rawTitle.substring(0, 28) + '...' : rawTitle;

        const prText = `#${r.prNumber}`;
        const score = `${r.metrics.codeQualityScore ?? 0}%`;
        const bugs = `${r.metrics.vulnerabilitiesCount ?? 0}`;

        doc.text(repo, 16, currentY + 4.8);
        doc.text(prText, 82, currentY + 4.8);
        doc.text(title, 95, currentY + 4.8);

        // Status coloring
        const status = r.status.toUpperCase();
        if (r.status === 'completed') {
          doc.setTextColor(16, 185, 129); // Green 500
        } else if (r.status === 'failed') {
          doc.setTextColor(239, 68, 68); // Red 500
        } else {
          doc.setTextColor(245, 158, 11); // Amber 500
        }
        doc.text(status, 148, currentY + 4.8);

        // Reset to normal text color
        doc.setTextColor(15, 23, 42);
        doc.text(score, 168, currentY + 4.8);
        doc.text(bugs, 186, currentY + 4.8);

        currentY += 7.5;
      });

      doc.save(`gitguard-audit-history-${new Date().toISOString().slice(0, 10)}.pdf`);
      setExported(true);
      setTimeout(() => setExported(false), 2500);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('An error occurred while generating the PDF export.');
    }
  };

  const isDisabled = disabled || reviews.length === 0;

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.04, borderColor: `${T.violet}55` } : {}}
      whileTap={!isDisabled ? { scale: 0.96 } : {}}
      onClick={handleExport}
      disabled={isDisabled}
      style={{
        padding: '11px 18px',
        borderRadius: 12,
        background: exported ? `${T.violet}18` : T.panel,
        color: exported ? T.violet : T.text,
        border: `1px solid ${exported ? T.violet + '55' : T.border}`,
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
        ? <CheckCircle size={15} color={T.violet} />
        : <FileText size={15} color={isDisabled ? T.muted : T.violet} />
      }
      {exported ? 'Exported!' : 'Export PDF'}
    </motion.button>
  );
};
