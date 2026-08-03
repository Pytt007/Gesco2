// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: SummaryCard & TotalsBlock
// Cartes SaaS en couleurs vibrantes comme dans l'application web
// ─────────────────────────────────────────────────────────────────────────────

import { DocumentThemeTokens } from '../theme/DocumentTheme';

export interface TotalsBlockProps {
  totalCoeff?: number | string;
  totalPoints?: number | string;
  rang?: string;
  moyenneGenerale: number | string;
  theme: DocumentThemeTokens;
}

export function renderTotalsBlock({
  totalCoeff,
  totalPoints,
  rang,
  moyenneGenerale,
  theme,
}: TotalsBlockProps): string {
  const coeffHtml = totalCoeff !== undefined ? `<div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;"><span style="color: ${theme.textSecondary} !important; font-weight: 700;">TOTAL COEFFICIENTS :</span><span style="font-weight: 800; color: ${theme.text} !important;">${totalCoeff}</span></div>` : '';
  const pointsHtml = totalPoints !== undefined ? `<div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;"><span style="color: ${theme.textSecondary} !important; font-weight: 700;">TOTAL POINTS :</span><span style="font-weight: 800; color: ${theme.text} !important;">${totalPoints}</span></div>` : '';
  const rangHtml = rang !== undefined ? `<div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 8px;"><span style="color: ${theme.textSecondary} !important; font-weight: 700;">RANG :</span><span style="font-weight: 800; color: ${theme.text} !important;">${rang}</span></div>` : '';

  return `
  <div style="margin-left: auto; width: 280px; margin-bottom: 20px;">
    ${coeffHtml}
    ${pointsHtml}
    ${rangHtml}

    <!-- BOX MOYENNE GÉNÉRALE BLEU NUIT & OR -->
    <div style="background-color: ${theme.primary} !important; color: #ffffff !important; padding: 10px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${theme.accent}; box-shadow: 0 4px 12px rgba(19, 38, 68, 0.15);">
      <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">MOYENNE GÉNÉRALE :</span>
      <span style="font-size: 16px; font-weight: 900; color: ${theme.accent} !important; font-family: 'Outfit', sans-serif;">${moyenneGenerale} / 20</span>
    </div>
  </div>
  `;
}

export interface SummaryCardProps {
  title: string;
  value: string | number;
  color?: string;
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'slate';
  theme: DocumentThemeTokens;
}

export function renderSummaryCard({ title, value, color, variant, theme }: SummaryCardProps): string {
  let bg = theme.surfaceAlt;
  let border = theme.border;
  let valColor = color || theme.primary;

  if (variant === 'green' || color === theme.success || color === '#16a34a') {
    bg = theme.successBg;
    border = theme.successBorder;
    valColor = theme.success;
  } else if (variant === 'amber' || color === theme.warning || color === '#d97706') {
    bg = theme.warningBg;
    border = theme.warningBorder;
    valColor = theme.warning;
  } else if (variant === 'red' || color === theme.danger || color === '#dc2626') {
    bg = theme.dangerBg;
    border = theme.dangerBorder;
    valColor = theme.danger;
  } else if (variant === 'blue' || color === theme.info || color === '#2563eb') {
    bg = theme.infoBg;
    border = theme.infoBorder;
    valColor = theme.info;
  }

  return `
  <div style="background-color: ${bg} !important; border: 1px solid ${border}; border-radius: 8px; padding: 12px 14px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
    <div style="font-size: 9px; font-weight: 800; color: ${theme.textSecondary} !important; text-transform: uppercase; letter-spacing: 0.5px;">${title}</div>
    <div style="font-size: 18px; font-weight: 900; color: ${valColor} !important; margin-top: 4px;">${value}</div>
  </div>
  `;
}
