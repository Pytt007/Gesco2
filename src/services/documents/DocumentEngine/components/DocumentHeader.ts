// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: DocumentHeader Component
// En-tête Bleu Nuit (#132644) avec titre Or (#f59e0b) et ruban d'accentuation
// ─────────────────────────────────────────────────────────────────────────────

import { SchoolIdentityData } from '../services/SchoolIdentityService';
import { DocumentThemeTokens } from '../theme/DocumentTheme';

export interface DocumentHeaderProps {
  title: string;
  subtitle?: string;
  schoolIdentity: SchoolIdentityData;
  meta?: Record<string, string>;
  theme: DocumentThemeTokens;
}

export function renderDocumentHeader({
  title,
  subtitle,
  schoolIdentity,
  meta = {},
  theme,
}: DocumentHeaderProps): string {
  const logoHtml = schoolIdentity.logoUrl
    ? `<img src="${schoolIdentity.logoUrl}" alt="Logo" style="height: 44px; max-width: 120px; object-fit: contain; border-radius: 6px;"/>`
    : `<div style="width: 42px; height: 42px; background-color: ${theme.accent} !important; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: ${theme.primary} !important; font-weight: 900; font-size: 24px; font-family: 'Outfit', sans-serif;">G</div>`;

  const metaRows = Object.entries(meta)
    .map(([key, val]) => `<div style="font-size: 10px; color: #cbd5e1 !important; margin-top: 2px;">${key.toUpperCase()} : <strong style="color: #ffffff !important;">${val}</strong></div>`)
    .join('');

  return `
  <!-- HEADER BANNER BLEU NUIT (#132644) -->
  <div style="background-color: ${theme.primary} !important; color: #ffffff !important; padding: 28px 36px 20px 36px; display: flex; justify-content: space-between; align-items: flex-start;">
    
    <!-- GAUCHE : LOGO + INFOS ÉTABLISSEMENT -->
    <div style="display: flex; align-items: center; gap: 14px;">
      ${logoHtml}
      <div>
        <div style="font-size: 18px; font-weight: 800; color: #ffffff !important; letter-spacing: -0.3px;">${schoolIdentity.name.toUpperCase()}</div>
        <div style="font-size: 10px; color: #94a3b8 !important; margin-top: 2px;">${schoolIdentity.address} · ${schoolIdentity.city}, ${schoolIdentity.country}</div>
        <div style="font-size: 9.5px; color: #cbd5e1 !important; margin-top: 1px;">Tél : ${schoolIdentity.phone} · Email : ${schoolIdentity.email}</div>
      </div>
    </div>

    <!-- DROITE : TITRE OR ET MÉTA -->
    <div style="text-align: right;">
      <div style="font-size: 24px; font-weight: 900; color: ${theme.accent} !important; text-transform: uppercase; letter-spacing: 1px; line-height: 1; margin-bottom: 8px;">${title}</div>
      <div style="font-size: 10px; color: #cbd5e1 !important;">ANNÉE SCOLAIRE : <strong style="color: #ffffff !important;">${schoolIdentity.currentSchoolYear}</strong></div>
      ${metaRows}
    </div>

  </div>

  <!-- RUBAN D'ACCENTUATION OR (#f59e0b) AVEC STRIPES BIAISÉES -->
  <div style="background-color: ${theme.accent} !important; color: ${theme.primary} !important; padding: 10px 36px; font-weight: 800; font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
    <div>📍 ${subtitle || schoolIdentity.motto || 'DOCUMENT OFFICIEL SÉCURISÉ GESCO ERP'}</div>
    <div style="display: flex; gap: 4px;">
      <div style="width: 8px; height: 22px; background-color: #ffffff !important; transform: skewX(-20deg); opacity: 0.9;"></div>
      <div style="width: 8px; height: 22px; background-color: #ffffff !important; transform: skewX(-20deg); opacity: 0.9;"></div>
      <div style="width: 8px; height: 22px; background-color: #ffffff !important; transform: skewX(-20deg); opacity: 0.9;"></div>
    </div>
  </div>
  `;
}
