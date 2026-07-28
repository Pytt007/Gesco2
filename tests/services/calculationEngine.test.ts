// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Tests du Moteur de Calcul Académique
// tests/services/calculationEngine.test.ts
//
// Couverture : Préscolaire, CP1/CP2 Mensuelle & IEP, CE1/CE2,
//              CM1, CM2 IEP, CM2 Examen Blanc + tous les cas limites.
// Objectif : ≥ 90 % de couverture sur le moteur de calcul.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  calculate,
  validateInputs,
  isResultValid,
  formatAverage,
  detectFormulaType,
  executeFormula,
  normalizeScore,
  scoreOn10ToOn20,
  computePercentage,
  isScoreInBounds,
  mapPrimaryAppreciation,
  mapPreschoolOverallAppreciation,
  isValidPreschoolAppreciation,
  getPreschoolAppreciationLabel,
  PRESCHOOL_APPRECIATION_VALUES,
} from '../../src/services/academic/calculation';
import type {
  AssessmentTemplate,
  SubjectGradeInput,
  FormulaConfig,
} from '../../src/services/academic/calculation';

// ═════════════════════════════════════════════════════════════════════════════
// FIXTURES — Modèles de test
// ═════════════════════════════════════════════════════════════════════════════

const DEFAULT_RULES = {
  generatesRanking: true,
  generatesAverage: true,
  affectsPromotion: false,
  allowsAbsenceStatus: true,
  allowsExcusedAbsence: true,
  unlimitedOccurrences: false,
};

const FORMULA_SUM9: FormulaConfig = {
  id: 'f1', code: 'SUM_OVER_9', name: 'SUM/9',
  formulaExpression: 'SUM(grades)/9',
  resultScale: 'SCORE_10', version: 1,
};

const FORMULA_SUM8: FormulaConfig = {
  id: 'f2', code: 'SUM_OVER_8', name: 'SUM/8',
  formulaExpression: 'SUM(grades)/8',
  resultScale: 'SCORE_10', version: 1,
};

const FORMULA_SUM10: FormulaConfig = {
  id: 'f3', code: 'SUM_OVER_10', name: 'SUM/10',
  formulaExpression: 'SUM(grades)/10',
  resultScale: 'SCORE_10', version: 1,
};

const FORMULA_W170: FormulaConfig = {
  id: 'f4', code: 'WEIGHTED_OVER_170', name: '(SUM/170)×20',
  formulaExpression: '(SUM(coeff*grade)/170)*20',
  resultScale: 'SCORE_20', version: 1,
};

const FORMULA_W180: FormulaConfig = {
  id: 'f5', code: 'WEIGHTED_OVER_180', name: '(SUM/180)×20',
  formulaExpression: '(SUM(coeff*grade)/180)*20',
  resultScale: 'SCORE_20', version: 1,
};

const FORMULA_APPRE: FormulaConfig = {
  id: 'f6', code: 'APPRECIATION_ENGINE', name: 'Appréciation',
  formulaExpression: 'APPRECIATION_ENGINE',
  resultScale: 'APPRECIATION', version: 1,
};

// ── CP1 Mensuelle : 9 matières /10, coeff=1 ───────────────────────────────────
const CP1_MONTHLY_TEMPLATE: AssessmentTemplate = {
  id: 'tpl-cp1-mo', code: 'CP1_MONTHLY_V1', name: 'CP1 Mensuelle',
  assessmentTypeCode: 'MONTHLY', levelCode: 'CP1',
  formula: FORMULA_SUM9,
  rules: DEFAULT_RULES,
  subjects: [
    { subjectId: 'lecture',   subjectName: 'Lecture',            displayOrder: 1,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'ecriture',  subjectName: 'Écriture',           displayOrder: 2,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'copie',     subjectName: 'Copie',              displayOrder: 3,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'ortho',     subjectName: 'Orthographe',        displayOrder: 4,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'expr',      subjectName: 'Expression écrite',  displayOrder: 5,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'math',      subjectName: 'Mathématiques',      displayOrder: 6,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'chant',     subjectName: 'Chant-Récitation',   displayOrder: 7,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
    { subjectId: 'dessin',    subjectName: 'Dessin',             displayOrder: 8,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
    { subjectId: 'ecm',       subjectName: 'ECM',                displayOrder: 9,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
  ],
};

// ── CP1 IEP : 8 matières /10, sans Copie ─────────────────────────────────────
const CP1_IEP_TEMPLATE: AssessmentTemplate = {
  id: 'tpl-cp1-iep', code: 'CP1_IEP_V1', name: 'CP1 IEP',
  assessmentTypeCode: 'IEP', levelCode: 'CP1',
  formula: FORMULA_SUM8,
  rules: { ...DEFAULT_RULES, affectsPromotion: true },
  subjects: [
    { subjectId: 'lecture',   subjectName: 'Lecture',           displayOrder: 1, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true },
    { subjectId: 'ecriture',  subjectName: 'Écriture',          displayOrder: 2, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true },
    { subjectId: 'ortho',     subjectName: 'Orthographe',       displayOrder: 3, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true },
    { subjectId: 'expr',      subjectName: 'Expression écrite', displayOrder: 4, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true },
    { subjectId: 'math',      subjectName: 'Mathématiques',     displayOrder: 5, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true },
    { subjectId: 'chant',     subjectName: 'Chant-Récitation',  displayOrder: 6, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
    { subjectId: 'dessin',    subjectName: 'Dessin',            displayOrder: 7, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
    { subjectId: 'ecm',       subjectName: 'ECM',               displayOrder: 8, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true },
  ],
};

// ── CE1 Mensuelle : 10 matières /10 ──────────────────────────────────────────
const CE1_TEMPLATE: AssessmentTemplate = {
  id: 'tpl-ce1-mo', code: 'CE1_MONTHLY_V1', name: 'CE1 Mensuelle',
  assessmentTypeCode: 'MONTHLY', levelCode: 'CE1',
  formula: FORMULA_SUM10,
  rules: DEFAULT_RULES,
  subjects: [
    { subjectId: 'lecture',  subjectName: 'Lecture',        displayOrder: 1,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'ecriture', subjectName: 'Écriture',       displayOrder: 2,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'copie',    subjectName: 'Copie',          displayOrder: 3,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'ortho',    subjectName: 'Orthographe',    displayOrder: 4,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'expr',     subjectName: 'Expression',     displayOrder: 5,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'math',     subjectName: 'Mathématiques',  displayOrder: 6,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'edt',      subjectName: 'Étude de texte', displayOrder: 7,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'edm',      subjectName: 'Étude du milieu',displayOrder: 8,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'dessin',   subjectName: 'Dessin',         displayOrder: 9,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
    { subjectId: 'ecm',      subjectName: 'ECM',            displayOrder: 10, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
  ],
};

// ── CM1 Mensuelle : 15 matières, Lecture×2, Maths×2 → max=170 ────────────────
const CM1_TEMPLATE: AssessmentTemplate = {
  id: 'tpl-cm1-mo', code: 'CM1_MONTHLY_V1', name: 'CM1 Mensuelle',
  assessmentTypeCode: 'MONTHLY', levelCode: 'CM1',
  formula: FORMULA_W170,
  rules: DEFAULT_RULES,
  subjects: [
    { subjectId: 'lecture',  subjectName: 'Lecture',          displayOrder: 1,  maximumScore: 10, coefficient: 2, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'ecriture', subjectName: 'Écriture',         displayOrder: 2,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'copie',    subjectName: 'Copie',            displayOrder: 3,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'ortho',    subjectName: 'Orthographe',      displayOrder: 4,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'expr',     subjectName: 'Expression',       displayOrder: 5,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'math',     subjectName: 'Mathématiques',    displayOrder: 6,  maximumScore: 10, coefficient: 2, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'edt',      subjectName: 'Étude de texte',   displayOrder: 7,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'histoire', subjectName: 'Histoire',         displayOrder: 8,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'geo',      subjectName: 'Géographie',       displayOrder: 9,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'sciences', subjectName: 'Sciences',         displayOrder: 10, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'chant',    subjectName: 'Chant',            displayOrder: 11, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
    { subjectId: 'dessin',   subjectName: 'Dessin',           displayOrder: 12, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
    { subjectId: 'ecm',      subjectName: 'ECM',              displayOrder: 13, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'anglais',  subjectName: 'Anglais',          displayOrder: 14, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
    { subjectId: 'info',     subjectName: 'Informatique',     displayOrder: 15, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
  ],
};

// ── CM2 IEP : 15 matières, Lecture×2, Ortho×2, Maths×2 → max=180 ────────────
const CM2_IEP_TEMPLATE: AssessmentTemplate = {
  id: 'tpl-cm2-iep', code: 'CM2_IEP_V1', name: 'CM2 IEP',
  assessmentTypeCode: 'IEP', levelCode: 'CM2',
  formula: FORMULA_W180,
  rules: { ...DEFAULT_RULES, affectsPromotion: true },
  subjects: [
    { subjectId: 'lecture',  subjectName: 'Lecture',       displayOrder: 1,  maximumScore: 10, coefficient: 2, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'ecriture', subjectName: 'Écriture',      displayOrder: 2,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'copie',    subjectName: 'Copie',         displayOrder: 3,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'ortho',    subjectName: 'Orthographe',   displayOrder: 4,  maximumScore: 10, coefficient: 2, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'expr',     subjectName: 'Expression',    displayOrder: 5,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'math',     subjectName: 'Mathématiques', displayOrder: 6,  maximumScore: 10, coefficient: 2, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'edt',      subjectName: 'Étude texte',   displayOrder: 7,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'histoire', subjectName: 'Histoire',      displayOrder: 8,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'geo',      subjectName: 'Géographie',    displayOrder: 9,  maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'sciences', subjectName: 'Sciences',      displayOrder: 10, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'chant',    subjectName: 'Chant',         displayOrder: 11, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
    { subjectId: 'dessin',   subjectName: 'Dessin',        displayOrder: 12, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
    { subjectId: 'ecm',      subjectName: 'ECM',           displayOrder: 13, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: true  },
    { subjectId: 'anglais',  subjectName: 'Anglais',       displayOrder: 14, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
    { subjectId: 'info',     subjectName: 'Informatique',  displayOrder: 15, maximumScore: 10, coefficient: 1, assessmentMode: 'GRADE', isRequired: false },
  ],
};

// ── Préscolaire PS : 6 domaines — APPRECIATION ───────────────────────────────
const PS_PRESCHOOL_TEMPLATE: AssessmentTemplate = {
  id: 'tpl-ps-pre', code: 'PS_PRESCHOOL_V1', name: 'PS Préscolaire',
  assessmentTypeCode: 'PRESCHOOL', levelCode: 'PS',
  formula: FORMULA_APPRE,
  rules: { ...DEFAULT_RULES, generatesRanking: false, generatesAverage: false, affectsPromotion: false, unlimitedOccurrences: true },
  subjects: [
    { subjectId: 'graphisme', subjectName: 'Graphisme',         displayOrder: 1, maximumScore: 10, coefficient: 1, assessmentMode: 'APPRECIATION', isRequired: true },
    { subjectId: 'lect_ps',   subjectName: 'Lecture/Pré-lecture',displayOrder: 2, maximumScore: 10, coefficient: 1, assessmentMode: 'APPRECIATION', isRequired: true },
    { subjectId: 'langage',   subjectName: 'Langage',           displayOrder: 3, maximumScore: 10, coefficient: 1, assessmentMode: 'APPRECIATION', isRequired: true },
    { subjectId: 'math_ps',   subjectName: 'Mathématiques PS',  displayOrder: 4, maximumScore: 10, coefficient: 1, assessmentMode: 'APPRECIATION', isRequired: true },
    { subjectId: 'aem',       subjectName: 'AEM',               displayOrder: 5, maximumScore: 10, coefficient: 1, assessmentMode: 'APPRECIATION', isRequired: true },
    { subjectId: 'aec',       subjectName: 'AEC',               displayOrder: 6, maximumScore: 10, coefficient: 1, assessmentMode: 'APPRECIATION', isRequired: true },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGrades(subjectIds: string[], grade: number, absent = false): SubjectGradeInput[] {
  return subjectIds.map((id) => ({
    subjectId: id,
    grade: absent ? null : grade,
    appreciation: null,
    absenceStatus: absent ? 'ABSENT' : 'PRESENT',
  }));
}

function makePreschoolGrades(subjectIds: string[], appreciation: 'TB' | 'B' | 'AB' | 'P' | 'I'): SubjectGradeInput[] {
  return subjectIds.map((id) => ({
    subjectId: id,
    grade: null,
    appreciation,
    absenceStatus: 'PRESENT',
  }));
}

const CP1_SUBJECT_IDS = ['lecture', 'ecriture', 'copie', 'ortho', 'expr', 'math', 'chant', 'dessin', 'ecm'];
const CP1_IEP_IDS     = ['lecture', 'ecriture', 'ortho', 'expr', 'math', 'chant', 'dessin', 'ecm'];
const CE1_SUBJECT_IDS = ['lecture', 'ecriture', 'copie', 'ortho', 'expr', 'math', 'edt', 'edm', 'dessin', 'ecm'];
const CM1_SUBJECT_IDS = ['lecture', 'ecriture', 'copie', 'ortho', 'expr', 'math', 'edt', 'histoire', 'geo', 'sciences', 'chant', 'dessin', 'ecm', 'anglais', 'info'];
const CM2_SUBJECT_IDS = CM1_SUBJECT_IDS; // même liste, coefficients différents
const PS_SUBJECT_IDS  = ['graphisme', 'lect_ps', 'langage', 'math_ps', 'aem', 'aec'];

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — Score Normalizer
// ═════════════════════════════════════════════════════════════════════════════

describe('ScoreNormalizer', () => {
  it('normalise 85/170 en 10/20', () => {
    const r = normalizeScore(85, 170, 'SCORE_20');
    expect(r.normalizedScore).toBe(10);
  });

  it('normalise 170/170 en 20/20', () => {
    const r = normalizeScore(170, 170, 'SCORE_20');
    expect(r.normalizedScore).toBe(20);
  });

  it('normalise 0/170 en 0/20', () => {
    const r = normalizeScore(0, 170, 'SCORE_20');
    expect(r.normalizedScore).toBe(0);
  });

  it('normalise 72/90 en 8/10', () => {
    const r = normalizeScore(72, 90, 'SCORE_10');
    expect(r.normalizedScore).toBeCloseTo(8, 1);
  });

  it('normalise 8/10 en 16/20 via scoreOn10ToOn20', () => {
    expect(scoreOn10ToOn20(8)).toBe(16);
  });

  it('calcule le pourcentage correctement', () => {
    expect(computePercentage(13, 20)).toBe(65);
    expect(computePercentage(0, 20)).toBe(0);
    expect(computePercentage(20, 20)).toBe(100);
  });

  it('retourne 0 si maximum = 0 dans computePercentage', () => {
    expect(computePercentage(10, 0)).toBe(0);
  });

  it('valide les bornes correctement', () => {
    expect(isScoreInBounds(8, 10)).toBe(true);
    expect(isScoreInBounds(0, 10)).toBe(true);
    expect(isScoreInBounds(10, 10)).toBe(true);
    expect(isScoreInBounds(-1, 10)).toBe(false);
    expect(isScoreInBounds(11, 10)).toBe(false);
  });

  it('lève une erreur si rawMaximum <= 0', () => {
    expect(() => normalizeScore(5, 0, 'SCORE_20')).toThrow();
    expect(() => normalizeScore(5, -1, 'SCORE_20')).toThrow();
  });

  it('lève une erreur si rawScore < 0', () => {
    expect(() => normalizeScore(-1, 10, 'SCORE_20')).toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — Appreciation Mapper
// ═════════════════════════════════════════════════════════════════════════════

describe('AppreciationMapper', () => {
  describe('mapPrimaryAppreciation — SCORE_10', () => {
    it('retourne Excellent travail pour >= 9', () => {
      expect(mapPrimaryAppreciation(9, 'SCORE_10')).toBe('Excellent travail');
      expect(mapPrimaryAppreciation(10, 'SCORE_10')).toBe('Excellent travail');
    });
    it('retourne Bon travail pour >= 7.5', () => {
      expect(mapPrimaryAppreciation(7.5, 'SCORE_10')).toBe('Bon travail');
      expect(mapPrimaryAppreciation(8.99, 'SCORE_10')).toBe('Bon travail');
    });
    it('retourne Travail satisfaisant pour >= 6', () => {
      expect(mapPrimaryAppreciation(6, 'SCORE_10')).toBe('Travail satisfaisant');
    });
    it('retourne Résultats passables pour >= 5', () => {
      expect(mapPrimaryAppreciation(5, 'SCORE_10')).toBe('Résultats passables');
    });
    it('retourne Travail insuffisant pour < 5', () => {
      expect(mapPrimaryAppreciation(0, 'SCORE_10')).toBe('Travail insuffisant');
      expect(mapPrimaryAppreciation(4.99, 'SCORE_10')).toBe('Travail insuffisant');
    });
  });

  describe('mapPrimaryAppreciation — SCORE_20', () => {
    it('retourne Excellent travail pour >= 18', () => {
      expect(mapPrimaryAppreciation(18, 'SCORE_20')).toBe('Excellent travail');
      expect(mapPrimaryAppreciation(20, 'SCORE_20')).toBe('Excellent travail');
    });
    it('retourne Bon travail pour >= 15', () => {
      expect(mapPrimaryAppreciation(15, 'SCORE_20')).toBe('Bon travail');
    });
    it('retourne Travail insuffisant pour < 10', () => {
      expect(mapPrimaryAppreciation(9.99, 'SCORE_20')).toBe('Travail insuffisant');
    });
  });

  describe('mapPreschoolOverallAppreciation', () => {
    it('retourne TB si toutes les appréciations sont TB', () => {
      expect(mapPreschoolOverallAppreciation(['TB', 'TB', 'TB', 'TB'])).toBe('TB');
    });
    it('retourne B pour un mélange TB/B', () => {
      expect(mapPreschoolOverallAppreciation(['TB', 'B', 'B', 'B'])).toBe('B');
    });
    it('retourne I si toutes les appréciations sont I', () => {
      expect(mapPreschoolOverallAppreciation(['I', 'I', 'I'])).toBe('I');
    });
    it('retourne I si la liste est vide', () => {
      expect(mapPreschoolOverallAppreciation([])).toBe('I');
    });
    it('gère les mélanges', () => {
      expect(mapPreschoolOverallAppreciation(['TB', 'I'])).toBe('AB');
    });
  });

  describe('isValidPreschoolAppreciation', () => {
    it('valide TB, B, AB, P, I', () => {
      ['TB', 'B', 'AB', 'P', 'I'].forEach((a) => {
        expect(isValidPreschoolAppreciation(a)).toBe(true);
      });
    });
    it('rejette les valeurs invalides', () => {
      expect(isValidPreschoolAppreciation('X')).toBe(false);
      expect(isValidPreschoolAppreciation('')).toBe(false);
      expect(isValidPreschoolAppreciation(null)).toBe(false);
      expect(isValidPreschoolAppreciation(undefined)).toBe(false);
      expect(isValidPreschoolAppreciation(42)).toBe(false);
    });
  });

  it('getPreschoolAppreciationLabel retourne le libellé complet', () => {
    expect(getPreschoolAppreciationLabel('TB')).toBe('Très Bien');
    expect(getPreschoolAppreciationLabel('I')).toBe('Insuffisant');
  });

  it('PRESCHOOL_APPRECIATION_VALUES contient les bonnes valeurs numériques', () => {
    expect(PRESCHOOL_APPRECIATION_VALUES['TB']).toBe(4);
    expect(PRESCHOOL_APPRECIATION_VALUES['I']).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — Formula Engine
// ═════════════════════════════════════════════════════════════════════════════

describe('FormulaEngine', () => {
  describe('detectFormulaType', () => {
    it('détecte APPRECIATION', () => expect(detectFormulaType('APPRECIATION_ENGINE')).toBe('APPRECIATION'));
    it('détecte SUM_DIVISOR',  () => expect(detectFormulaType('SUM(grades)/9')).toBe('SUM_DIVISOR'));
    it('détecte SUM_DIVISOR /10', () => expect(detectFormulaType('SUM(grades)/10')).toBe('SUM_DIVISOR'));
    it('détecte SUM_MULTIPLIER', () => expect(detectFormulaType('(SUM(coeff*grade)/170)*20')).toBe('SUM_MULTIPLIER'));
    it('détecte AVERAGE',      () => expect(detectFormulaType('AVERAGE(grades)')).toBe('AVERAGE'));
    it('détecte SUM',          () => expect(detectFormulaType('SUM(grades)')).toBe('SUM'));
    it('détecte CUSTOM',       () => expect(detectFormulaType('MY_CUSTOM_FORMULA')).toBe('CUSTOM'));
  });

  describe('executeFormula — SUM_DIVISOR', () => {
    it('calcule SUM/9 correctement', () => {
      const input = { weightedGrades: [8, 7, 9, 6, 7, 8, 8, 7, 9], weightedMaximums: [10,10,10,10,10,10,10,10,10], rawGrades: [8,7,9,6,7,8,8,7,9], subjectCount: 9 };
      const r = executeFormula(FORMULA_SUM9, input);
      expect(r.value).toBeCloseTo(69 / 9, 3);
      expect(r.resultScale).toBe('SCORE_10');
    });

    it('calcule SUM/8 correctement', () => {
      const input = { weightedGrades: [8, 7, 9, 6, 8, 8, 7, 9], weightedMaximums: Array(8).fill(10), rawGrades: [8,7,9,6,8,8,7,9], subjectCount: 8 };
      const r = executeFormula(FORMULA_SUM8, input);
      expect(r.value).toBeCloseTo(62 / 8, 3);
    });

    it('lève une erreur si le diviseur est 0', () => {
      const badFormula = { ...FORMULA_SUM9, formulaExpression: 'SUM(grades)/0' };
      const input = { weightedGrades: [8], weightedMaximums: [10], rawGrades: [8], subjectCount: 1 };
      expect(() => executeFormula(badFormula, input)).toThrow();
    });
  });

  describe('executeFormula — SUM_MULTIPLIER', () => {
    it('calcule (SUM/170)*20 avec données CM1 max', () => {
      // Toutes les notes au maximum (coeff 2 pour lecture et math)
      // Lecture: 10×2=20, Math: 10×2=20, autres: 10×1=10 × 13 = 130 → total = 170
      const weighted = [20, 10, 10, 10, 10, 20, 10, 10, 10, 10, 10, 10, 10, 10, 10];
      const input = { weightedGrades: weighted, weightedMaximums: weighted, rawGrades: Array(15).fill(10), subjectCount: 15 };
      const r = executeFormula(FORMULA_W170, input);
      expect(r.value).toBeCloseTo(20, 1);
    });

    it('calcule (SUM/170)*20 avec des notes moyennes', () => {
      // Lecture: 5×2=10, Math: 5×2=10, autres 13: 5×1=5 → total = 10+10+65 = 85
      const weighted = [10, 5, 5, 5, 5, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5];
      const input = { weightedGrades: weighted, weightedMaximums: [20,10,10,10,10,20,10,10,10,10,10,10,10,10,10], rawGrades: Array(15).fill(5), subjectCount: 15 };
      const r = executeFormula(FORMULA_W170, input);
      expect(r.value).toBeCloseTo((85 / 170) * 20, 2);
    });
  });

  describe('executeFormula — APPRECIATION', () => {
    it('retourne une valeur 0 pour le moteur d\'appréciation', () => {
      const input = { weightedGrades: [], weightedMaximums: [], rawGrades: [], subjectCount: 0 };
      const r = executeFormula(FORMULA_APPRE, input);
      expect(r.value).toBe(0);
      expect(r.resultScale).toBe('APPRECIATION');
    });
  });

  describe('executeFormula — AVERAGE', () => {
    it('calcule la moyenne simple', () => {
      const input = { weightedGrades: [8, 9, 7], weightedMaximums: [10, 10, 10], rawGrades: [8, 9, 7], subjectCount: 3 };
      const f: FormulaConfig = { ...FORMULA_SUM9, formulaExpression: 'AVERAGE(grades)', code: 'AVG' };
      const r = executeFormula(f, input);
      expect(r.value).toBeCloseTo(8, 2);
    });

    it('lève une erreur si aucune matière', () => {
      const input = { weightedGrades: [], weightedMaximums: [], rawGrades: [], subjectCount: 0 };
      const f: FormulaConfig = { ...FORMULA_SUM9, formulaExpression: 'AVERAGE(grades)', code: 'AVG' };
      expect(() => executeFormula(f, input)).toThrow();
    });
  });

  describe('executeFormula — SUM', () => {
    it('retourne la somme brute', () => {
      const input = { weightedGrades: [8, 9, 7], weightedMaximums: [10, 10, 10], rawGrades: [8, 9, 7], subjectCount: 3 };
      const f: FormulaConfig = { ...FORMULA_SUM9, formulaExpression: 'SUM(grades)', code: 'SUM' };
      const r = executeFormula(f, input);
      expect(r.value).toBe(24);
    });
  });

  it('lève une erreur si l\'expression est vide', () => {
    const badFormula: FormulaConfig = { ...FORMULA_SUM9, formulaExpression: '' };
    expect(() => executeFormula(badFormula, { weightedGrades: [], weightedMaximums: [], rawGrades: [], subjectCount: 0 })).toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — Calculation Engine (Scénarios réels MENA)
// ═════════════════════════════════════════════════════════════════════════════

describe('CalculationEngine — Préscolaire PS', () => {
  it('calcule une appréciation globale TB', () => {
    const inputs = makePreschoolGrades(PS_SUBJECT_IDS, 'TB');
    const result = calculate(PS_PRESCHOOL_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    expect(result.resultScale).toBe('APPRECIATION');
    expect(result.appreciation).toBe('TB');
    expect(result.average).toBeNull();
    expect(result.errors).toHaveLength(0);
  });

  it('calcule une appréciation globale I', () => {
    const inputs = makePreschoolGrades(PS_SUBJECT_IDS, 'I');
    const result = calculate(PS_PRESCHOOL_TEMPLATE, inputs);
    expect(result.appreciation).toBe('I');
  });

  it('calcule une appréciation globale AB pour un mélange TB/I', () => {
    const inputs: SubjectGradeInput[] = [
      { subjectId: 'graphisme', grade: null, appreciation: 'TB', absenceStatus: 'PRESENT' },
      { subjectId: 'lect_ps',   grade: null, appreciation: 'I',  absenceStatus: 'PRESENT' },
      { subjectId: 'langage',   grade: null, appreciation: 'TB', absenceStatus: 'PRESENT' },
      { subjectId: 'math_ps',   grade: null, appreciation: 'I',  absenceStatus: 'PRESENT' },
      { subjectId: 'aem',       grade: null, appreciation: 'TB', absenceStatus: 'PRESENT' },
      { subjectId: 'aec',       grade: null, appreciation: 'I',  absenceStatus: 'PRESENT' },
    ];
    const result = calculate(PS_PRESCHOOL_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    // Moyenne numérique : (4+0+4+0+4+0)/6 = 2.0 → AB
    expect(result.appreciation).toBe('AB');
  });

  it('retourne une erreur si une appréciation est invalide', () => {
    const inputs: SubjectGradeInput[] = [
      { subjectId: 'graphisme', grade: null, appreciation: 'XYZ' as any, absenceStatus: 'PRESENT' },
      ...makePreschoolGrades(['lect_ps', 'langage', 'math_ps', 'aem', 'aec'], 'B'),
    ];
    const result = calculate(PS_PRESCHOOL_TEMPLATE, inputs);
    expect(result.errors.some((e) => e.code === 'APPRECIATION_INVALID')).toBe(true);
  });
});

describe('CalculationEngine — CP1 Mensuelle (SUM/9)', () => {
  it('calcule la moyenne correctement pour des notes normales', () => {
    const inputs: SubjectGradeInput[] = [
      { subjectId: 'lecture',  grade: 8,   appreciation: null, absenceStatus: 'PRESENT' },
      { subjectId: 'ecriture', grade: 7.5, appreciation: null, absenceStatus: 'PRESENT' },
      { subjectId: 'copie',    grade: 9,   appreciation: null, absenceStatus: 'PRESENT' },
      { subjectId: 'ortho',    grade: 6,   appreciation: null, absenceStatus: 'PRESENT' },
      { subjectId: 'expr',     grade: 7,   appreciation: null, absenceStatus: 'PRESENT' },
      { subjectId: 'math',     grade: 8.5, appreciation: null, absenceStatus: 'PRESENT' },
      { subjectId: 'chant',    grade: 8,   appreciation: null, absenceStatus: 'PRESENT' },
      { subjectId: 'dessin',   grade: 7,   appreciation: null, absenceStatus: 'PRESENT' },
      { subjectId: 'ecm',      grade: 9,   appreciation: null, absenceStatus: 'PRESENT' },
    ];
    const result = calculate(CP1_MONTHLY_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.resultScale).toBe('SCORE_10');
    // SUM = 70 / 9 = 7.78
    expect(result.average).toBeCloseTo(70 / 9, 1);
    expect(result.appreciation).toBe('Bon travail');
  });

  it('toutes les notes à zéro → moyenne = 0, Travail insuffisant', () => {
    const inputs = makeGrades(CP1_SUBJECT_IDS, 0);
    const result = calculate(CP1_MONTHLY_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    expect(result.average).toBe(0);
    expect(result.appreciation).toBe('Travail insuffisant');
  });

  it('toutes les notes au maximum → moyenne = 10, Excellent travail', () => {
    const inputs = makeGrades(CP1_SUBJECT_IDS, 10);
    const result = calculate(CP1_MONTHLY_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    expect(result.average).toBe(10);
    expect(result.appreciation).toBe('Excellent travail');
    expect(result.totalObtained).toBe(90);
    expect(result.totalMaximum).toBe(90);
  });

  it('détecte une note supérieure au barème', () => {
    const inputs = makeGrades(CP1_SUBJECT_IDS, 10);
    inputs[0].grade = 11; // lecture > 10
    const result = calculate(CP1_MONTHLY_TEMPLATE, inputs);
    expect(result.errors.some((e) => e.code === 'GRADE_EXCEEDS_MAXIMUM')).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('détecte une note négative', () => {
    const inputs = makeGrades(CP1_SUBJECT_IDS, 8);
    inputs[0].grade = -1;
    const result = calculate(CP1_MONTHLY_TEMPLATE, inputs);
    expect(result.errors.some((e) => e.code === 'GRADE_NEGATIVE')).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('détecte une matière requise manquante', () => {
    // Envoi seulement 8 matières (manque ecm qui est required)
    const inputs = makeGrades(CP1_SUBJECT_IDS.slice(0, 8), 8);
    const result = calculate(CP1_MONTHLY_TEMPLATE, inputs);
    expect(result.errors.some((e) => e.code === 'REQUIRED_SUBJECT_MISSING')).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('accepte une matière optionnelle manquante avec avertissement', () => {
    // Envoi sans chant et dessin (optionnels)
    const optionalIds = ['lecture', 'ecriture', 'copie', 'ortho', 'expr', 'math', 'ecm'];
    const inputs = makeGrades(optionalIds, 8);
    const result = calculate(CP1_MONTHLY_TEMPLATE, inputs);
    // Erreurs bloquantes = 0, mais avertissements sur matières optionnelles
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('CalculationEngine — CP1 IEP (SUM/8)', () => {
  it('calcule correctement avec 8 matières', () => {
    const inputs: SubjectGradeInput[] = CP1_IEP_IDS.map((id, i) => ({
      subjectId: id, grade: 7 + i * 0.25, appreciation: null, absenceStatus: 'PRESENT',
    }));
    const result = calculate(CP1_IEP_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    expect(result.resultScale).toBe('SCORE_10');
    expect(result.average).toBeDefined();
  });

  it('gère l\'absence justifiée — score = 0 pour la matière concernée', () => {
    const inputs: SubjectGradeInput[] = CP1_IEP_IDS.map((id) => ({
      subjectId: id, grade: 8, appreciation: null,
      absenceStatus: id === 'lecture' ? 'EXCUSED' : 'PRESENT',
    }));
    const result = calculate(CP1_IEP_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    const lectureResult = result.subjectResults.find((r) => r.subjectId === 'lecture');
    expect(lectureResult?.absenceStatus).toBe('EXCUSED');
    expect(lectureResult?.grade).toBe(0);
  });

  it('gère l\'absence non justifiée — score = 0', () => {
    const inputs: SubjectGradeInput[] = CP1_IEP_IDS.map((id) => ({
      subjectId: id, grade: 8, appreciation: null,
      absenceStatus: id === 'math' ? 'ABSENT' : 'PRESENT',
    }));
    const result = calculate(CP1_IEP_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    const mathResult = result.subjectResults.find((r) => r.subjectId === 'math');
    expect(mathResult?.absenceStatus).toBe('ABSENT');
    expect(mathResult?.grade).toBe(0);
  });
});

describe('CalculationEngine — CE1 Mensuelle (SUM/10)', () => {
  it('calcule correctement avec 10 matières', () => {
    const inputs = makeGrades(CE1_SUBJECT_IDS, 7.5);
    const result = calculate(CE1_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    expect(result.average).toBeCloseTo(7.5, 1);
    expect(result.resultScale).toBe('SCORE_10');
    expect(result.appreciation).toBe('Bon travail');
  });

  it('élève absent à toutes les matières → moyenne = 0', () => {
    const inputs: SubjectGradeInput[] = CE1_SUBJECT_IDS.map((id) => ({
      subjectId: id, grade: null, appreciation: null, absenceStatus: 'ABSENT',
    }));
    const result = calculate(CE1_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    expect(result.average).toBe(0);
    expect(result.appreciation).toBe('Travail insuffisant');
  });
});

describe('CalculationEngine — CM1 Mensuelle ((SUM/170)×20)', () => {
  it('calcule correctement la moyenne pondérée maximale', () => {
    // Toutes les notes à 10 → somme pondérée = 170 → moyenne = 20
    const inputs = makeGrades(CM1_SUBJECT_IDS, 10);
    const result = calculate(CM1_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    expect(result.average).toBeCloseTo(20, 1);
    expect(result.resultScale).toBe('SCORE_20');
    expect(result.appreciation).toBe('Excellent travail');
    expect(result.totalObtained).toBe(170);
    expect(result.totalMaximum).toBe(170);
  });

  it('calcule correctement avec la moitié des points', () => {
    // Toutes les notes à 5 → somme pondérée = 85 → (85/170)*20 = 10
    const inputs = makeGrades(CM1_SUBJECT_IDS, 5);
    const result = calculate(CM1_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    expect(result.average).toBeCloseTo(10, 1);
    expect(result.appreciation).toBe('Résultats passables');
  });

  it('vérifie les coefficients Lecture(×2) et Maths(×2)', () => {
    // Seulement lecture=10 et math=10, les autres à 0
    const inputs: SubjectGradeInput[] = CM1_SUBJECT_IDS.map((id) => ({
      subjectId: id,
      grade: (id === 'lecture' || id === 'math') ? 10 : 0,
      appreciation: null,
      absenceStatus: 'PRESENT',
    }));
    const result = calculate(CM1_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    // Lecture: 10×2=20 + Math: 10×2=20 = 40 / 170 × 20 = 4.7
    expect(result.totalObtained).toBe(40);
    expect(result.average).toBeCloseTo((40 / 170) * 20, 1);
  });
});

describe('CalculationEngine — CM2 IEP ((SUM/180)×20)', () => {
  it('calcule correctement la moyenne pondérée maximale', () => {
    const inputs = makeGrades(CM2_SUBJECT_IDS, 10);
    const result = calculate(CM2_IEP_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    expect(result.average).toBeCloseTo(20, 1);
    expect(result.totalObtained).toBe(180);
    expect(result.totalMaximum).toBe(180);
    expect(result.appreciation).toBe('Excellent travail');
  });

  it('calcule correctement avec la moitié des points', () => {
    const inputs = makeGrades(CM2_SUBJECT_IDS, 5);
    const result = calculate(CM2_IEP_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    // Somme pondérée : Lecture 5×2=10, Ortho 5×2=10, Math 5×2=10, autres 12: 5×1=5 → 10+10+10+60=90
    expect(result.totalObtained).toBe(90);
    expect(result.average).toBeCloseTo((90 / 180) * 20, 1);
  });

  it('vérifie les 3 coefficients ×2 (Lecture, Ortho, Maths)', () => {
    const inputs: SubjectGradeInput[] = CM2_SUBJECT_IDS.map((id) => ({
      subjectId: id,
      grade: (['lecture', 'ortho', 'math'] as string[]).includes(id) ? 10 : 0,
      appreciation: null,
      absenceStatus: 'PRESENT',
    }));
    const result = calculate(CM2_IEP_TEMPLATE, inputs);
    // Lecture: 10×2=20 + Ortho: 10×2=20 + Math: 10×2=20 = 60
    expect(result.totalObtained).toBe(60);
    expect(result.average).toBeCloseTo((60 / 180) * 20, 1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — validateInputs & utilitaires de la façade
// ═════════════════════════════════════════════════════════════════════════════

describe('CalculationEngine — validateInputs', () => {
  it('retourne une erreur si le template est invalide', () => {
    const errors = validateInputs(null as any, []);
    expect(errors.some((e) => e.code === 'TEMPLATE_MISSING')).toBe(true);
  });

  it('retourne une erreur si la formule est absente', () => {
    const badTemplate = { ...CP1_MONTHLY_TEMPLATE, formula: null as any };
    const errors = validateInputs(badTemplate, makeGrades(CP1_SUBJECT_IDS, 8));
    expect(errors.some((e) => e.code === 'FORMULA_MISSING')).toBe(true);
  });

  it('retourne aucune erreur pour un jeu de données valide', () => {
    const errors = validateInputs(CP1_MONTHLY_TEMPLATE, makeGrades(CP1_SUBJECT_IDS, 8));
    expect(errors).toHaveLength(0);
  });
});

describe('CalculationEngine — isResultValid & formatAverage', () => {
  it('isResultValid retourne true si pas d\'erreur', () => {
    const result = calculate(CP1_MONTHLY_TEMPLATE, makeGrades(CP1_SUBJECT_IDS, 8));
    expect(isResultValid(result)).toBe(true);
  });

  it('isResultValid retourne false si erreur présente', () => {
    const inputs = makeGrades(CP1_SUBJECT_IDS, 10);
    inputs[0].grade = 15; // barème dépassé
    const result = calculate(CP1_MONTHLY_TEMPLATE, inputs);
    expect(isResultValid(result)).toBe(false);
  });

  it('formatAverage formate correctement /10', () => {
    const result = calculate(CP1_MONTHLY_TEMPLATE, makeGrades(CP1_SUBJECT_IDS, 8));
    expect(formatAverage(result)).toContain('/ 10');
  });

  it('formatAverage formate correctement /20', () => {
    const result = calculate(CM1_TEMPLATE, makeGrades(CM1_SUBJECT_IDS, 8));
    expect(formatAverage(result)).toContain('/ 20');
  });

  it('formatAverage retourne l\'appréciation pour le préscolaire', () => {
    const result = calculate(PS_PRESCHOOL_TEMPLATE, makePreschoolGrades(PS_SUBJECT_IDS, 'TB'));
    const formatted = formatAverage(result);
    expect(formatted).toBe('TB');
  });

  it('formatAverage retourne — si résultat invalide', () => {
    const emptyResult = calculate(null as any, []);
    expect(formatAverage(emptyResult)).toBe('—');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — Cas limites supplémentaires
// ═════════════════════════════════════════════════════════════════════════════

describe('Cas limites', () => {
  it('détecte une matière inconnue dans les inputs (ignorée silencieusement)', () => {
    const inputs = [
      ...makeGrades(CP1_SUBJECT_IDS, 8),
      { subjectId: 'inconnue', grade: 5, appreciation: null, absenceStatus: 'PRESENT' as const },
    ];
    // La matière inconnue n'est pas dans le template → ignorée
    const result = calculate(CP1_MONTHLY_TEMPLATE, inputs);
    expect(result.errors).toHaveLength(0);
  });

  it('note décimale précise (8.75 /10)', () => {
    const inputs = makeGrades(CP1_SUBJECT_IDS, 8.75);
    const result = calculate(CP1_MONTHLY_TEMPLATE, inputs);
    expect(result.isValid).toBe(true);
    expect(result.average).toBeCloseTo(8.75, 2);
  });

  it('note = 0 n\'est pas une erreur', () => {
    const inputs = makeGrades(CP1_SUBJECT_IDS, 0);
    const result = calculate(CP1_MONTHLY_TEMPLATE, inputs);
    expect(result.errors).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('le résultat trié par display_order', () => {
    const inputs = makeGrades(CP1_SUBJECT_IDS, 7);
    const result = calculate(CP1_MONTHLY_TEMPLATE, inputs);
    const orders = result.subjectResults.map((r) => r.displayOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('exécute une formule CUSTOM avec fallback', () => {
    const customFormula: FormulaConfig = {
      id: 'f-custom', code: 'CUSTOM_EXPR', name: 'Custom',
      formulaExpression: 'SOMME_SPECIFIQUE(grades)', resultScale: 'SCORE_10', version: 1,
    };
    const template: AssessmentTemplate = { ...CP1_MONTHLY_TEMPLATE, formula: customFormula };
    const result = calculate(template, makeGrades(CP1_SUBJECT_IDS, 8));
    expect(result.isValid).toBe(true);
    expect(result.average).toBe(8);
  });

  it('gère l\'option roundToQuarter de scoreNormalizer', () => {
    const r = normalizeScore(7.7, 10, 'SCORE_20', { roundToQuarter: true });
    expect(r.normalizedScore).toBe(15.5); // 7.7 * 2 = 15.4 -> 15.5
  });

  it('gère l\'erreur si l\'expression de formule est syntaxiquement invalide au runtime', () => {
    const brokenFormula: FormulaConfig = {
      id: 'f-broken', code: 'BROKEN', name: 'Broken',
      formulaExpression: 'SUM(grades)/0', resultScale: 'SCORE_10', version: 1,
    };
    const template: AssessmentTemplate = { ...CP1_MONTHLY_TEMPLATE, formula: brokenFormula };
    const result = calculate(template, makeGrades(CP1_SUBJECT_IDS, 8));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_FORMULA_EXPRESSION')).toBe(true);
  });
});

