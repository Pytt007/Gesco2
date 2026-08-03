// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: DocumentFooter Component
// Footer Bleu Nuit (#132644) avec puces dorées et métadonnées de sécurité
// ─────────────────────────────────────────────────────────────────────────────

import { SchoolIdentityData } from '../services/SchoolIdentityService';
import { DocumentThemeTokens } from '../theme/DocumentTheme';

export interface DocumentFooterProps {
  schoolIdentity: SchoolIdentityData;
  generatedAt?: string;
  generatedBy?: string;
  version?: string;
  qrCodeDataUrl?: string;
  checksum?: string;
  theme: DocumentThemeTokens;
}

export function renderDocumentFooter({
  schoolIdentity,
  generatedAt = new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  generatedBy = 'Système GESCO ERP',
  version = 'v1.0.0 Enterprise',
  qrCodeDataUrl,
  checksum,
  theme,
}: DocumentFooterProps): string {
  const qrHtml = qrCodeDataUrl
    ? `<div style="display: flex; align-items: center; gap: 8px;">
        <div style="font-size: 8px; color: #cbd5e1 !important; text-align: right;">
          <div>Empreinte Sécurité</div>
          <div style="font-family: monospace; font-weight: bold; color: ${theme.accent} !important;">${checksum ? checksum.substring(0, 16) + '...' : 'VERIFIED'}</div>
        </div>
        <img src="${qrCodeDataUrl}" alt="QR Code" width="40" height="40" style="border: 1px solid ${theme.accent}; border-radius: 4px; padding: 2px; background: #ffffff;"/>
      </div>`
    : '';

  return `
  <!-- FOOTER CONTACT BAR BLEU NUIT (#132644) -->
  <div style="margin-top: 40px; padding: 16px 36px; border-top: 3px solid ${theme.accent} !important; background-color: ${theme.primary} !important; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #ffffff !important; font-weight: 700;">
    
    <!-- PUCES CONTACTS DORÉES -->
    <div style="display: flex; gap: 20px; align-items: center;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="width: 18px; height: 18px; border-radius: 50%; background-color: ${theme.accent} !important; color: ${theme.primary} !important; display: inline-flex; align-items: center; justify-content: center;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </span>
        <span>${schoolIdentity.phone}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="width: 18px; height: 18px; border-radius: 50%; background-color: ${theme.accent} !important; color: ${theme.primary} !important; display: inline-flex; align-items: center; justify-content: center;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </span>
        <span>${schoolIdentity.email}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="width: 18px; height: 18px; border-radius: 50%; background-color: ${theme.accent} !important; color: ${theme.primary} !important; display: inline-flex; align-items: center; justify-content: center;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </span>
        <span>${schoolIdentity.city}, ${schoolIdentity.country}</span>
      </div>
    </div>

    <!-- SÉCURITÉ ET VERSION -->
    <div style="display: flex; align-items: center; gap: 16px;">
      <div style="font-size: 9px; color: #cbd5e1 !important; text-align: right;">
        <div>Édité le ${generatedAt} par ${generatedBy}</div>
        <div>GESCO Enterprise ${version} — Page 1 / 1</div>
      </div>
      ${qrHtml}
    </div>

  </div>
  `;
}
