// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: Typography System
// Système typographique unifié pour tous les documents imprimables & PDF
// ─────────────────────────────────────────────────────────────────────────────

export interface TypographyStyle {
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
  letterSpacing?: string;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
}

export const documentTypography = {
  display: {
    fontSize: '26px',
    fontWeight: 900,
    lineHeight: '1.1',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  } as TypographyStyle,

  title: {
    fontSize: '20px',
    fontWeight: 800,
    lineHeight: '1.2',
    letterSpacing: '-0.5px',
  } as TypographyStyle,

  subtitle: {
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '1.3',
  } as TypographyStyle,

  heading: {
    fontSize: '13px',
    fontWeight: 800,
    lineHeight: '1.4',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  } as TypographyStyle,

  body: {
    fontSize: '11px',
    fontWeight: 400,
    lineHeight: '1.4',
  } as TypographyStyle,

  small: {
    fontSize: '10px',
    fontWeight: 500,
    lineHeight: '1.3',
  } as TypographyStyle,

  caption: {
    fontSize: '9px',
    fontWeight: 700,
    lineHeight: '1.2',
    textTransform: 'uppercase',
  } as TypographyStyle,

  tableHeader: {
    fontSize: '10px',
    fontWeight: 800,
    lineHeight: '1.2',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  } as TypographyStyle,

  footer: {
    fontSize: '10px',
    fontWeight: 700,
    lineHeight: '1.3',
  } as TypographyStyle,
};
