// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: Theme Tokens
// Thème Corporate Bleu Nuit & Cartes SaaS Colorées comme dans l'application
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentThemeTokens {
  primary: string;        // #132644 Bleu Nuit Corporate
  primaryDark: string;    // #0b172a Bleu Nuit Profond
  secondary: string;      // #f59e0b Or / Ambre Corporate
  accent: string;         // #f59e0b Or / Ambre
  background: string;     // #ffffff Blanc pur
  surface: string;        // #ffffff Blanc pur
  surfaceAlt: string;     // #f8fafc Gris très doux
  border: string;         // #e2e8f0 Bordure fine
  borderLight: string;    // #f1f5f9
  text: string;           // #1e293b Texte principal sombre
  textSecondary: string;  // #475569 Texte secondaire
  textMuted: string;      // #94a3b8 Texte adouci
  textWhite: string;      // #ffffff Blanc pur
  success: string;        // #16a34a Vert Succès
  successBg: string;      // #f0fdf4
  successBorder: string;  // #bbf7d0
  warning: string;        // #d97706 Orange Avertissement
  warningBg: string;      // #fffbeb
  warningBorder: string;  // #fde68a
  danger: string;         // #dc2626 Rouge Danger
  dangerBg: string;       // #fef2f2
  dangerBorder: string;   // #fecdd3
  info: string;           // #2563eb Bleu Info
  infoBg: string;         // #eff6ff
  infoBorder: string;     // #bfdbfe
}

export const defaultDocumentTheme: DocumentThemeTokens = {
  primary: '#132644',
  primaryDark: '#0b172a',
  secondary: '#f59e0b',
  accent: '#f59e0b',
  background: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  text: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textWhite: '#ffffff',
  success: '#16a34a',
  successBg: '#f0fdf4',
  successBorder: '#bbf7d0',
  warning: '#d97706',
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecdd3',
  info: '#2563eb',
  infoBg: '#eff6ff',
  infoBorder: '#bfdbfe',
};

export function createDocumentTheme(customPrimaryColor?: string, customAccentColor?: string): DocumentThemeTokens {
  const primary = customPrimaryColor || defaultDocumentTheme.primary;
  const accent = customAccentColor || defaultDocumentTheme.accent;

  return {
    ...defaultDocumentTheme,
    primary,
    accent,
    secondary: accent,
  };
}
