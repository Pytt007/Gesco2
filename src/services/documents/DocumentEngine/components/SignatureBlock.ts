// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: SignatureBlock Component
// Bloc d'émargement et signatures à 3 colonnes d'après le design ReportLab GESCO
// ─────────────────────────────────────────────────────────────────────────────

import { DocumentThemeTokens } from '../theme/DocumentTheme';

export interface SignatureSigner {
  role: string;
  rows?: string[];
  name?: string;
  signatureUrl?: string;
}

export interface SignatureBlockProps {
  signers?: SignatureSigner[];
  prochainePeriode?: string;
  appreciationGenerale?: string;
  stampUrl?: string;
  theme: DocumentThemeTokens;
}

export function renderSignatureBlock({
  signers,
  prochainePeriode,
  appreciationGenerale,
  theme,
}: SignatureBlockProps): string {
  const defaultSigners: SignatureSigner[] = signers || [
    { role: 'Prochaine période', rows: ['Reprise des cours :', prochainePeriode || '08/09/2026'] },
    { role: 'Signature du Parent', rows: ['Nom :', 'Date :'] },
    { role: 'Signature de la Direction', rows: ['Cachet de l\'établissement'] },
  ];

  const appreciationHtml = appreciationGenerale
    ? `<div style="margin-bottom: 20px;">
        <div style="font-size: 10px; font-weight: 800; color: ${theme.primaryDark} !important; text-transform: uppercase; margin-bottom: 4px;">Appréciation du Conseil de classe :</div>
        <div style="font-size: 10px; color: ${theme.text} !important; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid ${theme.border}; line-height: 1.4;">${appreciationGenerale}</div>
      </div>`
    : '';

  const columnsHtml = defaultSigners
    .map(
      (s) => `
    <div style="flex: 1; min-width: 150px;">
      <div style="font-size: 10px; font-weight: 800; color: ${theme.primaryDark} !important; margin-bottom: 6px;">${s.role}</div>
      ${(s.rows || [])
        .map((r) => `<div style="font-size: 9.5px; color: ${theme.text} !important; margin-bottom: 4px;">${r}</div>`)
        .join('')}
      <div style="border-bottom: 1px solid ${theme.border}; margin-top: 14px; height: 1px;"></div>
    </div>`
    )
    .join('');

  return `
  ${appreciationHtml}

  <!-- LIGNE DE SÉPARATION MAJEURE VIOLETTE -->
  <div style="height: 1.5px; background-color: ${theme.primary} !important; margin: 20px 0 16px 0;"></div>

  <!-- 3 COLONNES DE SIGNATURE -->
  <div style="display: flex; gap: 24px; justify-content: space-between; align-items: flex-start;">
    ${columnsHtml}
  </div>
  `;
}
