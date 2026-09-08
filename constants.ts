
import { Student, Teacher, StaffMember, ClassGroup, Transaction, CanteenMenu, BusRoute, Activity, ActivityLog, SchoolFeeRecord, FeeConfiguration, AcademicSubject, SchoolLevelCategory, EvaluationType } from './types';

export const PREDEFINED_CLASS_NAMES = [
  "Garderie",
  "Ptesection A",
  "Ptesection B",
  "Moysection",
  "Grdsection",
  "CP1A",
  "CP1B",
  "CP2A",
  "CP2B",
  "CE1A",
  "CE1B",
  "CE2A",
  "CE2B",
  "CM1A",
  "CM1B",
  "CM2A",
  "CM2B"
];

export const MOCK_STUDENTS: Student[] = [];

export const MOCK_TEACHERS: Teacher[] = [];

export const MOCK_STAFF: StaffMember[] = [];

export const MOCK_CLASSES: ClassGroup[] = PREDEFINED_CLASS_NAMES.map((name, index) => ({
  id: `C${index + 100}`,
  name: name,
  teacherId: '',
  studentCount: 0,
  capacity: 30,
  subjects: []
}));

export const MOCK_TRANSACTIONS: Transaction[] = [];

export const REVENUE_DATA: any[] = [];

export const STUDENT_DISTRIBUTION: any[] = [];

export const WEEKLY_MENU: Omit<CanteenMenu, 'id'>[] = [];

export const BUS_ROUTES: BusRoute[] = [];

export const ACTIVITIES: Activity[] = [];

export const MOCK_HISTORY: ActivityLog[] = [];

export const MOCK_FEE_RECORDS: SchoolFeeRecord[] = [];

export const MOCK_FEE_CONFIGS: FeeConfiguration[] = [
  { id: 'CF01', grade: 'Garderie', tuitionAmount: 0, registrationAmount: 0, installmentCount: 8 },
  { id: 'CF02', grade: 'Ptesection', tuitionAmount: 0, registrationAmount: 0, installmentCount: 8 },
  { id: 'CF03', grade: 'Moysection', tuitionAmount: 0, registrationAmount: 0, installmentCount: 8 },
  { id: 'CF04', grade: 'Grdsection', tuitionAmount: 0, registrationAmount: 0, installmentCount: 8 },
  { id: 'CF05', grade: 'CP1', tuitionAmount: 0, registrationAmount: 0, installmentCount: 8 },
  { id: 'CF06', grade: 'CP2', tuitionAmount: 0, registrationAmount: 0, installmentCount: 8 },
  { id: 'CF07', grade: 'CE1', tuitionAmount: 0, registrationAmount: 0, installmentCount: 8 },
  { id: 'CF08', grade: 'CE2', tuitionAmount: 0, registrationAmount: 0, installmentCount: 8 },
  { id: 'CF09', grade: 'CM1', tuitionAmount: 0, registrationAmount: 0, installmentCount: 8 },
  { id: 'CF10', grade: 'CM2', tuitionAmount: 0, registrationAmount: 0, installmentCount: 8 },
];

// ─────────────────────────────────────────────────────────────
// MODULE NOTES ET ÉVALUATIONS — Configuration académique
// ─────────────────────────────────────────────────────────────

/** Niveaux préscolaires */
export const PRESCOLAIRE_CLASS_NAMES = ['Garderie', 'Ptesection A', 'Ptesection B', 'Moysection', 'Grdsection'];

/** Correspondance nom de classe → catégorie de niveau */
export const CLASS_LEVEL_MAP: Record<string, SchoolLevelCategory> = {
  'Garderie':     'PRESCOLAIRE',
  'Ptesection A': 'PRESCOLAIRE',
  'Ptesection B': 'PRESCOLAIRE',
  'Moysection':   'PRESCOLAIRE',
  'Grdsection':   'PRESCOLAIRE',
  'CP1A': 'CP', 'CP1B': 'CP',
  'CP2A': 'CP', 'CP2B': 'CP',
  'CE1A': 'CE', 'CE1B': 'CE',
  'CE2A': 'CE', 'CE2B': 'CE',
  'CM1A': 'CM1', 'CM1B': 'CM1',
  'CM2A': 'CM2', 'CM2B': 'CM2',
};

/** Types d'évaluations disponibles par catégorie de niveau */
export const AVAILABLE_EVAL_TYPES: Record<SchoolLevelCategory, EvaluationType[]> = {
  PRESCOLAIRE: ['PRESCOLAIRE'],
  CP:          ['MENSUELLE', 'IEP'],
  CE:          ['MENSUELLE', 'IEP'],
  CM1:         ['MENSUELLE', 'IEP'],
  CM2:         ['EXAMEN_BLANC', 'IEP'],
};

/** Libellés des types d'évaluation */
export const EVAL_TYPE_LABELS: Record<EvaluationType, string> = {
  PRESCOLAIRE:  'Évaluation Préscolaire',
  MENSUELLE:    'Composition Mensuelle',
  IEP:          'Composition IEP',
  EXAMEN_BLANC: 'Examen Blanc',
};

// ─── Matières par niveau + type d'évaluation ───────────────────

/**
 * Matières PRÉSCOLAIRE
 * Français (Graphisme, Lecture, Langage) + Mathématiques + AEM + AEC
 * Toutes en appréciations : Non acquis / En cours / Acquis
 */
export const SUBJECTS_PRESCOLAIRE: AcademicSubject[] = [
  { id: 'prs-graphisme',  name: 'Graphisme',    maxScore: 3, isComplementary: false },
  { id: 'prs-lecture',    name: 'Lecture',       maxScore: 3, isComplementary: false },
  { id: 'prs-langage',    name: 'Langage',       maxScore: 3, isComplementary: false },
  { id: 'prs-maths',      name: 'Mathématiques', maxScore: 3, isComplementary: false },
  { id: 'prs-aem',        name: 'AEM',           maxScore: 3, isComplementary: false },
  { id: 'prs-aec',        name: 'AEC',           maxScore: 3, isComplementary: false },
];

/**
 * Matières CP/CE — Composition MENSUELLE (/10 chacune, total /80, diviseur = 8)
 * Sans Dessin
 */
export const SUBJECTS_CP_CE_MENSUELLE: AcademicSubject[] = [
  { id: 'cp-lecture',       name: 'Lecture',                       maxScore: 10, isComplementary: false },
  { id: 'cp-ecriture',      name: 'Écriture',                      maxScore: 10, isComplementary: false },
  { id: 'cp-copie',         name: 'Copie',                         maxScore: 10, isComplementary: false },
  { id: 'cp-ortho',         name: 'Orthographe',                   maxScore: 10, isComplementary: false },
  { id: 'cp-expr-ecrite',   name: 'Expression écrite',             maxScore: 10, isComplementary: false },
  { id: 'cp-maths',         name: 'Mathématiques',                 maxScore: 10, isComplementary: false },
  { id: 'cp-chant-recit',   name: 'Chant - Récitation',            maxScore: 10, isComplementary: false },
  { id: 'cp-icm',           name: 'EDHC', maxScore: 10, isComplementary: false },
  { id: 'cp-anglais',       name: 'Anglais',                       maxScore: 10, isComplementary: true  },
  { id: 'cp-informatique',  name: 'Informatique',                  maxScore: 10, isComplementary: true  },
];

/**
 * Matières CP/CE — Composition IEP (/10 chacune, total /90, diviseur = 9)
 * Inclut le Dessin
 */
export const SUBJECTS_CP_CE_IEP: AcademicSubject[] = [
  { id: 'cp-lecture',       name: 'Lecture',                       maxScore: 10, isComplementary: false },
  { id: 'cp-ecriture',      name: 'Écriture',                      maxScore: 10, isComplementary: false },
  { id: 'cp-copie',         name: 'Copie',                         maxScore: 10, isComplementary: false },
  { id: 'cp-ortho',         name: 'Orthographe',                   maxScore: 10, isComplementary: false },
  { id: 'cp-expr-ecrite',   name: 'Expression écrite',             maxScore: 10, isComplementary: false },
  { id: 'cp-maths',         name: 'Mathématiques',                 maxScore: 10, isComplementary: false },
  { id: 'cp-chant-recit',   name: 'Chant - Récitation',            maxScore: 10, isComplementary: false },
  { id: 'cp-dessin',        name: 'Dessin',                        maxScore: 10, isComplementary: false },
  { id: 'cp-icm',           name: 'EDHC', maxScore: 10, isComplementary: false },
  { id: 'cp-anglais',       name: 'Anglais',                       maxScore: 10, isComplementary: true  },
  { id: 'cp-informatique',  name: 'Informatique',                  maxScore: 10, isComplementary: true  },
];

/**
 * Matières CE1/CE2 — identiques Mensuelle et IEP (total /100, diviseur = 10)
 * Orthographe /10 + Étude de texte /30 + Étude du milieu /30 + Maths /30
 */
export const SUBJECTS_CE: AcademicSubject[] = [
  { id: 'ce-ortho',         name: 'Orthographe',                            maxScore: 10, isComplementary: false },
  { id: 'ce-etude-texte',   name: 'Étude de texte',                         maxScore: 30, isComplementary: false },
  { id: 'ce-etude-milieu',  name: 'Étude du milieu (Histoire + Géo + Sci)', maxScore: 30, isComplementary: false },
  { id: 'ce-maths',         name: 'Mathématiques',                          maxScore: 30, isComplementary: false },
  { id: 'ce-anglais',       name: 'Anglais',                                maxScore: 10, isComplementary: true  },
  { id: 'ce-informatique',  name: 'Informatique',                           maxScore: 10, isComplementary: true  },
];

/**
 * Matières CM1 — Mensuelle et IEP (total /170)
 * Orthographe /20 + Étude de texte /50 + Étude du milieu /50 + Maths /50
 */
export const SUBJECTS_CM1: AcademicSubject[] = [
  { id: 'cm1-ortho',        name: 'Orthographe',                            maxScore: 20, isComplementary: false },
  { id: 'cm1-etude-texte',  name: 'Étude de texte',                         maxScore: 50, isComplementary: false },
  { id: 'cm1-etude-milieu', name: 'Étude du milieu (Histoire + Géo + Sci)', maxScore: 50, isComplementary: false },
  { id: 'cm1-maths',        name: 'Mathématiques',                          maxScore: 50, isComplementary: false },
  { id: 'cm1-anglais',      name: 'Anglais',                                maxScore: 20, isComplementary: true  },
  { id: 'cm1-informatique', name: 'Informatique',                           maxScore: 20, isComplementary: true  },
];

/**
 * Matières CM2 — Examen Blanc et IEP (total /170)
 * Orthographe /20 + Étude de texte /50 + Étude du milieu /50 + Maths /50
 */
export const SUBJECTS_CM2: AcademicSubject[] = [
  { id: 'cm2-ortho',        name: 'Orthographe',                            maxScore: 20, isComplementary: false },
  { id: 'cm2-etude-texte',  name: 'Étude de texte',                         maxScore: 50, isComplementary: false },
  { id: 'cm2-etude-milieu', name: 'Étude du milieu (Histoire + Géo + Sci)', maxScore: 50, isComplementary: false },
  { id: 'cm2-maths',        name: 'Mathématiques',                          maxScore: 50, isComplementary: false },
  { id: 'cm2-anglais',      name: 'Anglais',                                maxScore: 20, isComplementary: true  },
  { id: 'cm2-informatique', name: 'Informatique',                           maxScore: 20, isComplementary: true  },
];

/** Retourne les matières selon le niveau et le type d'évaluation */
export const getSubjectsForEval = (
  level: SchoolLevelCategory,
  evalType: EvaluationType
): AcademicSubject[] => {
  if (level === 'PRESCOLAIRE') return SUBJECTS_PRESCOLAIRE;
  if (level === 'CP') {
    return evalType === 'IEP' ? SUBJECTS_CP_CE_IEP : SUBJECTS_CP_CE_MENSUELLE;
  }
  if (level === 'CE') return SUBJECTS_CE;
  if (level === 'CM1') return SUBJECTS_CM1;
  if (level === 'CM2') return SUBJECTS_CM2;
  return [];
};

// ─── Formules de calcul ────────────────────────────────────────

/** Paramètres de calcul de la moyenne par niveau */
export const AVERAGE_CONFIG: Record<SchoolLevelCategory, {
  divisor: (evalType: EvaluationType) => number;
  scale: 10 | 20;
  totalMax: (evalType: EvaluationType) => number;
}> = {
  PRESCOLAIRE: {
    divisor: () => 6,      // 6 matières préscolaires
    scale: 10,
    totalMax: () => 18,    // 6 × 3
  },
  CP: {
    divisor: (t) => t === 'IEP' ? 9 : 8,
    scale: 10,
    totalMax: (t) => t === 'IEP' ? 90 : 80,
  },
  CE: {
    divisor: () => 10,
    scale: 10,
    totalMax: () => 100,
  },
  CM1: {
    divisor: () => 170,
    scale: 20,
    totalMax: () => 170,
  },
  CM2: {
    divisor: () => 170,
    scale: 20,
    totalMax: () => 170,
  },
};

// ─── Appréciations automatiques ────────────────────────────────

/** Appréciations pour les moyennes sur 10 (CP/CE) */
export const APPRECIATIONS_SUR_10: { min: number; max: number; text: string }[] = [
  { min: 0,   max: 4.99, text: 'Travail insuffisant. Des efforts sont nécessaires.' },
  { min: 5,   max: 6.99, text: 'Résultats passables. Peut mieux faire.' },
  { min: 7,   max: 7.99, text: 'Travail satisfaisant. Continue tes efforts.' },
  { min: 8,   max: 8.99, text: 'Bon travail. Continue ainsi.' },
  { min: 9,   max: 10,   text: 'Excellent travail. Félicitations.' },
];

/** Appréciations pour les moyennes sur 20 (CM1/CM2) */
export const APPRECIATIONS_SUR_20: { min: number; max: number; text: string }[] = [
  { min: 0,   max: 9.99,  text: 'Travail insuffisant.' },
  { min: 10,  max: 11.99, text: 'Résultats passables.' },
  { min: 12,  max: 13.99, text: 'Travail satisfaisant.' },
  { min: 14,  max: 15.99, text: 'Bon travail.' },
  { min: 16,  max: 17.99, text: 'Très bon travail.' },
  { min: 18,  max: 20,    text: 'Excellent travail. Félicitations.' },
];

/** Appréciations des matières complémentaires */
export const COMPLEMENTARY_APPRECIATIONS = [
  'Mauvais', 'Insuffisant', 'Passable', 'Assez bien', 'Bien', 'Très bien', 'Excellent'
] as const;

/** Appréciations préscolaires */
export const PRESCOLAIRE_APPRECIATIONS = [
  'Non acquis', 'En cours d\'acquisition', 'Acquis'
] as const;

/** Valeurs internes des appréciations préscolaires (pour calcul de progression) */
export const PRESCOLAIRE_APPRECIATION_VALUES: Record<string, number> = {
  'Non acquis':           1,
  "En cours d'acquisition": 2,
  'Acquis':               3,
};
