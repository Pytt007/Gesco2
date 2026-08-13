// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Constantes de Configuration Globale
// ─────────────────────────────────────────────────────────────────────────────

export const SCHOOL_YEARS: string[] = [];

export const GRADES = [
  'Garderie', 'Petite Section', 'Moyenne Section', 'Grande Section',
  'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2',
  '6ème', '5ème', '4ème', '3ème',
];

export const EXPENSE_CATEGORIES = [
  'Salaires', 'Transport', 'Matériel', 'Entretien', 'Alimentation', 'Communication', 'Autres',
] as const;

export const PAYMENT_METHODS = ['Espèces', 'Virement', 'Chèque', 'Mobile Money'] as const;
