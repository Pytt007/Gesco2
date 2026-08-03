// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: DocumentTable Component
// Tableau de données à En-tête Bleu Nuit (#132644) & Lignes alternées
// ─────────────────────────────────────────────────────────────────────────────

import { DocumentThemeTokens } from '../theme/DocumentTheme';

export interface ColumnDefinition {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  isItalic?: boolean;
}

export interface DocumentTableProps {
  columns: ColumnDefinition[];
  rows: Record<string, any>[];
  totalsRow?: Record<string, any>;
  theme: DocumentThemeTokens;
}

export function renderDocumentTable({
  columns,
  rows,
  totalsRow,
  theme,
}: DocumentTableProps): string {
  const headerCells = columns
    .map(
      (col) =>
        `<th style="background-color: ${theme.primary} !important; color: #ffffff !important; padding: 10px 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; text-align: ${col.align || 'left'}; width: ${col.width || 'auto'}; letter-spacing: 0.5px; border: none;">${col.label}</th>`
    )
    .join('');

  const bodyRows = rows
    .map((row, idx) => {
      const bg = idx % 2 === 1 ? `background-color: ${theme.surfaceAlt} !important;` : 'background-color: #ffffff !important;';
      const cells = columns
        .map((col) => {
          const val = row[col.key] !== undefined ? row[col.key] : '—';
          const style = col.isItalic ? `font-style: italic; color: ${theme.textSecondary} !important;` : '';
          return `<td style="padding: 9px 12px; border-bottom: 1px solid ${theme.border}; font-size: 11px; color: ${theme.text}; text-align: ${col.align || 'left'}; ${bg} ${style}">${val}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  let totalsHtml = '';
  if (totalsRow) {
    const totalCells = columns
      .map((col, idx) => {
        const val = totalsRow[col.key] !== undefined ? totalsRow[col.key] : idx === 0 ? 'TOTAL' : '';
        return `<td style="padding: 10px 12px; font-weight: 900; font-size: 11px; color: #ffffff !important; background-color: ${theme.primary} !important; text-align: ${col.align || 'left'};">${val}</td>`;
      })
      .join('');
    totalsHtml = `<tr style="border-top: 2px solid ${theme.accent};">${totalCells}</tr>`;
  }

  return `
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <thead>
      <tr>${headerCells}</tr>
    </thead>
    <tbody>
      ${bodyRows}
      ${totalsHtml}
    </tbody>
  </table>
  `;
}
