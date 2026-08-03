// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: SectionTitle, AlertBox, Divider, StampBlock
// ─────────────────────────────────────────────────────────────────────────────

import { DocumentThemeTokens } from '../theme/DocumentTheme';

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  theme: DocumentThemeTokens;
}

export function renderSectionTitle({ title, subtitle, theme }: SectionTitleProps): string {
  return `
  <div style="margin-bottom: 12px; margin-top: 16px; border-bottom: 2px solid ${theme.borderLight}; padding-bottom: 6px;">
    <h3 style="font-size: 13px; font-weight: 800; color: ${theme.primary} !important; text-transform: uppercase; letter-spacing: 0.5px; margin: 0;">${title}</h3>
    ${subtitle ? `<p style="font-size: 10px; color: ${theme.textMuted} !important; margin-top: 2px;">${subtitle}</p>` : ''}
  </div>
  `;
}

export interface AlertBoxProps {
  message: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  theme: DocumentThemeTokens;
}

export function renderAlertBox({ message, type = 'info', theme }: AlertBoxProps): string {
  const bgColor = type === 'success' ? '#f0fdf4' : type === 'warning' ? '#fffbeb' : type === 'danger' ? '#fef2f2' : '#eff6ff';
  const borderColor = type === 'success' ? '#bbf7d0' : type === 'warning' ? '#fde68a' : type === 'danger' ? '#fecdd3' : '#bfdbfe';
  const textColor = type === 'success' ? '#15803d' : type === 'warning' ? '#b45309' : type === 'danger' ? '#be123c' : '#1d4ed8';

  return `
  <div style="background-color: ${bgColor} !important; border: 1px solid ${borderColor}; border-radius: 8px; padding: 12px 16px; font-size: 11px; font-weight: 700; color: ${textColor} !important; margin-bottom: 16px;">
    ${message}
  </div>
  `;
}

export interface DividerProps {
  theme: DocumentThemeTokens;
}

export function renderDivider({ theme }: DividerProps): string {
  return `<div style="height: 1px; background-color: ${theme.border} !important; margin: 20px 0;"></div>`;
}

export interface StampBlockProps {
  stampUrl?: string;
  label?: string;
}

export function renderStampBlock({ stampUrl, label = 'Cachet Officiel' }: StampBlockProps): string {
  if (!stampUrl) return '';
  return `
  <div style="text-align: center; margin-top: 10px;">
    <img src="${stampUrl}" alt="${label}" style="max-height: 64px; opacity: 0.85;"/>
    <div style="font-size: 9px; font-weight: bold; color: #94a3b8 !important;">${label}</div>
  </div>
  `;
}
