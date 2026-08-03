// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: QRCodeBlock Component
// ─────────────────────────────────────────────────────────────────────────────

import { DocumentThemeTokens } from '../theme/DocumentTheme';

export interface QRCodeBlockProps {
  qrCodeDataUrl?: string;
  checksum?: string;
  enabled?: boolean;
  theme: DocumentThemeTokens;
}

export function renderQRCodeBlock({ qrCodeDataUrl, checksum, enabled = true, theme }: QRCodeBlockProps): string {
  if (!enabled || !qrCodeDataUrl) return '';

  return `
  <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 20px; border-top: 1px solid ${theme.border}; padding-top: 12px;">
    <div style="text-align: right; font-size: 10px; color: ${theme.textMuted} !important;">
      <div style="font-weight: 700; color: ${theme.textSecondary} !important;">Document Officiel Certifié GESCO ERP</div>
      <div style="font-family: monospace; font-size: 9px; font-weight: bold; margin-top: 2px;">Empreinte : ${checksum ? checksum.substring(0, 20) : 'AUTHENTICATED'}</div>
    </div>
    <img src="${qrCodeDataUrl}" alt="QR Code Sécurité" width="60" height="60" style="border: 1px solid ${theme.border}; padding: 2px; border-radius: 4px;"/>
  </div>
  `;
}
