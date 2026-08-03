// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: StudentCard & InformationCard Components
// ─────────────────────────────────────────────────────────────────────────────

import { DocumentThemeTokens } from '../theme/DocumentTheme';

export interface StudentCardProps {
  matricule: string;
  name: string;
  className: string;
  birthDate?: string;
  photoUrl?: string;
  theme: DocumentThemeTokens;
}

export function renderStudentCard({ matricule, name, className, birthDate, photoUrl, theme }: StudentCardProps): string {
  const photoHtml = photoUrl
    ? `<img src="${photoUrl}" alt="Photo Élève" style="width: 54px; height: 64px; object-fit: cover; border-radius: 6px; border: 1px solid ${theme.border};"/>`
    : `<div style="width: 54px; height: 64px; background: ${theme.surfaceAlt}; border: 1px solid ${theme.border}; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: ${theme.textMuted}; font-size: 20px;">🎓</div>`;

  return `
  <div style="background-color: ${theme.surfaceAlt} !important; border: 1px solid ${theme.border}; border-radius: 8px; padding: 14px 18px; display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
    ${photoHtml}
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex: 1;">
      <div style="font-size: 11px;"><span style="font-weight: 800; color: ${theme.textSecondary} !important;">Matricule :</span> <strong style="color: ${theme.text} !important;">${matricule}</strong></div>
      <div style="font-size: 11px;"><span style="font-weight: 800; color: ${theme.textSecondary} !important;">Nom & Prénom :</span> <strong style="color: ${theme.text} !important;">${name}</strong></div>
      <div style="font-size: 11px;"><span style="font-weight: 800; color: ${theme.textSecondary} !important;">Classe :</span> <strong style="color: ${theme.text} !important;">${className}</strong></div>
      ${birthDate ? `<div style="font-size: 11px;"><span style="font-weight: 800; color: ${theme.textSecondary} !important;">Né(e) le :</span> <span>${birthDate}</span></div>` : ''}
    </div>
  </div>
  `;
}

export interface InfoItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface InformationCardProps {
  items: InfoItem[];
  theme: DocumentThemeTokens;
}

export function renderInformationCard({ items, theme }: InformationCardProps): string {
  const itemCells = items
    .map(
      (item) => `
    <div style="font-size: 11px; display: flex; align-items: center; gap: 8px;">
      <span style="font-weight: 800; width: 130px; color: ${theme.textSecondary} !important;">${item.label} :</span>
      <span style="${item.highlight ? `font-weight: 900; color: ${theme.primary} !important;` : `color: ${theme.text} !important;`}">${item.value}</span>
    </div>`
    )
    .join('');

  return `
  <div style="background-color: ${theme.surfaceAlt} !important; border: 1px solid ${theme.border}; border-radius: 8px; padding: 14px 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
    ${itemCells}
  </div>
  `;
}
