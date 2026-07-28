// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Tests du Moteur de Classement Académique (Ranking Engine)
// tests/services/rankingEngine.test.ts
//
// Couverture :
//   - Aucun élève / 1 seul élève / plusieurs élèves
//   - Ex æquo simples et multiples / moyennes toutes identiques
//   - Règle Préscolaire (PRESCHOOL -> aucun classement)
//   - Compositions Mensuelles, IEP, Examen Blanc
//   - Stratégies de classement (Standard, Dense, Competition, Custom)
//   - Calcul des statistiques (Moyenne classe, médiane, min, max, présences)
//   - Cas d'erreurs et edge cases
// Objectif : ≥ 95 % de couverture sur le moteur de classement.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  rankEvaluations,
  formatRankFrench,
  detectTieGroups,
  computeRankingStatistics,
  RankingStrategyRegistry,
  StandardRankingStrategy,
  DenseRankingStrategy,
  CompetitionRankingStrategy,
  CustomRankingStrategy,
} from '../../src/services/academic/ranking';
import type {
  EvaluationMetadata,
  StudentEvaluationInput,
  IRankingStrategy,
  ScoreEntry,
  CalculatedRank,
} from '../../src/services/academic/ranking';
import type { CalculationResult } from '../../src/services/academic/calculation';

// ═════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═════════════════════════════════════════════════════════════════════════════

const MONTHLY_META: EvaluationMetadata = {
  assessmentTypeCode: 'MONTHLY',
  title: 'Composition Mensuelle Octobre',
  rankingEnabled: true,
  rankingStrategy: 'STANDARD',
};

const IEP_META: EvaluationMetadata = {
  assessmentTypeCode: 'IEP',
  title: 'Composition IEP Trimestre 1',
  rankingEnabled: true,
  rankingStrategy: 'STANDARD',
};

const MOCK_EXAM_META: EvaluationMetadata = {
  assessmentTypeCode: 'MOCK_EXAM',
  title: 'Examen Blanc CEPE',
  rankingEnabled: true,
  rankingStrategy: 'STANDARD',
};

const PRESCHOOL_META: EvaluationMetadata = {
  assessmentTypeCode: 'PRESCHOOL',
  title: 'Bilan Préscolaire T1',
  rankingEnabled: false,
};

function makeMockCalculationResult(avg: number | null): CalculationResult {
  return {
    totalObtained: avg !== null ? avg * 10 : 0,
    totalMaximum: avg !== null ? 200 : 0,
    average: avg,
    resultScale: avg !== null ? 'SCORE_20' : 'APPRECIATION',
    appreciation: avg !== null ? 'Bon travail' : 'TB',
    subjectResults: [],
    formulaUsed: 'SUM/10',
    errors: [],
    warnings: [],
    isValid: true,
  };
}

function createStudent(
  id: string,
  avg: number | null,
  name?: string,
  gender?: 'M' | 'F',
  globalAbsence?: 'PRESENT' | 'ABSENT' | 'EXCUSED',
): StudentEvaluationInput {
  return {
    studentId: id,
    studentName: name ?? `Élève ${id}`,
    gender,
    globalAbsenceStatus: globalAbsence,
    calculationResult: makeMockCalculationResult(avg),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — Formatage des Rangs en Français (tieResolver)
// ═════════════════════════════════════════════════════════════════════════════

describe('tieResolver — formatRankFrench', () => {
  it('formate correctement 1er pour un garçon et 1ère pour une fille', () => {
    expect(formatRankFrench(1, false, 'M')).toBe('1er');
    expect(formatRankFrench(1, false, 'F')).toBe('1ère');
    expect(formatRankFrench(1, false)).toBe('1er');
  });

  it('formate correctement les ex æquo (1er ex, 1ère ex, 2ème ex)', () => {
    expect(formatRankFrench(1, true, 'M')).toBe('1er ex');
    expect(formatRankFrench(1, true, 'F')).toBe('1ère ex');
    expect(formatRankFrench(2, true)).toBe('2ème ex');
    expect(formatRankFrench(5, true)).toBe('5ème ex');
  });

  it('formate les rangs standard (2ème, 3ème, 10ème)', () => {
    expect(formatRankFrench(2)).toBe('2ème');
    expect(formatRankFrench(3)).toBe('3ème');
    expect(formatRankFrench(10)).toBe('10ème');
  });

  it('retourne "—" pour null ou 0', () => {
    expect(formatRankFrench(null)).toBe('—');
    expect(formatRankFrench(0)).toBe('—');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — Stratégies de Classement (rankingStrategies)
// ═════════════════════════════════════════════════════════════════════════════

describe('rankingStrategies', () => {
  const entries: ScoreEntry[] = [
    { studentId: 'e1', score: 17.5 },
    { studentId: 'e2', score: 17.5 },
    { studentId: 'e3', score: 15.0 },
    { studentId: 'e4', score: 12.0 },
    { studentId: 'e5', score: 12.0 },
    { studentId: 'e6', score: 12.0 },
    { studentId: 'e7', score: 9.0 },
  ];

  describe('StandardRankingStrategy (1, 1, 3, 4, 4, 4, 7)', () => {
    it('attribue les rangs avec sauts pour ex æquo', () => {
      const strategy = new StandardRankingStrategy();
      const map = strategy.calculateRanks(entries);

      expect(map.get('e1')?.rank).toBe(1);
      expect(map.get('e1')?.isExAequo).toBe(true);
      expect(map.get('e1')?.exAequoCount).toBe(2);

      expect(map.get('e2')?.rank).toBe(1);
      expect(map.get('e2')?.isExAequo).toBe(true);

      expect(map.get('e3')?.rank).toBe(3); // Saut après 2 x 1er
      expect(map.get('e3')?.isExAequo).toBe(false);

      expect(map.get('e4')?.rank).toBe(4);
      expect(map.get('e4')?.isExAequo).toBe(true);
      expect(map.get('e4')?.exAequoCount).toBe(3);

      expect(map.get('e7')?.rank).toBe(7); // Saut de 4 à 7
    });
  });

  describe('DenseRankingStrategy (1, 1, 2, 3, 3, 3, 4)', () => {
    it('attribue les rangs denses sans sauts', () => {
      const strategy = new DenseRankingStrategy();
      const map = strategy.calculateRanks(entries);

      expect(map.get('e1')?.rank).toBe(1);
      expect(map.get('e2')?.rank).toBe(1);
      expect(map.get('e3')?.rank).toBe(2); // Pas de saut !
      expect(map.get('e4')?.rank).toBe(3);
      expect(map.get('e7')?.rank).toBe(4);
    });
  });

  describe('CompetitionRankingStrategy (1, 2, 3, 4, 5, 6, 7)', () => {
    it('attribue les rangs strictement séquentiels sans ex æquo', () => {
      const strategy = new CompetitionRankingStrategy();
      const map = strategy.calculateRanks(entries);

      expect(map.get('e1')?.rank).toBe(1);
      expect(map.get('e2')?.rank).toBe(2);
      expect(map.get('e3')?.rank).toBe(3);
      expect(map.get('e1')?.isExAequo).toBe(false);
    });
  });

  describe('CustomRankingStrategy', () => {
    it('utilise le calculateur personnalisé fourni', () => {
      const customCalc = (eList: ScoreEntry[]) => {
        const res = new Map<string, CalculatedRank>();
        eList.forEach((e) => {
          res.set(e.studentId, { studentId: e.studentId, rank: 99, isExAequo: false, exAequoCount: 1 });
        });
        return res;
      };
      const strategy = new CustomRankingStrategy('Sur-mesure', 'Desc', customCalc);
      const map = strategy.calculateRanks(entries);
      expect(map.get('e1')?.rank).toBe(99);
    });
  });

  describe('RankingStrategyRegistry', () => {
    it('récupère la stratégie STANDARD par défaut', () => {
      const s = RankingStrategyRegistry.getStrategy();
      expect(s.code).toBe('STANDARD');
    });

    it('récupère les stratégies enregistrées', () => {
      expect(RankingStrategyRegistry.getStrategy('DENSE').code).toBe('DENSE');
      expect(RankingStrategyRegistry.getStrategy('COMPETITION').code).toBe('COMPETITION');
    });

    it('fallback sur STANDARD pour un code inconnu', () => {
      const s = RankingStrategyRegistry.getStrategy('UNKNOWN' as any);
      expect(s.code).toBe('STANDARD');
    });

    it('autorise l\'enregistrement d\'une nouvelle stratégie', () => {
      const newStrategy: IRankingStrategy = {
        code: 'CUSTOM',
        name: 'Mon Algorithme',
        description: 'Test',
        calculateRanks: () => new Map(),
      };
      RankingStrategyRegistry.registerStrategy(newStrategy);
      expect(RankingStrategyRegistry.getStrategy('CUSTOM').name).toBe('Mon Algorithme');
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — RankingEngine Façade (rankEvaluations)
// ═════════════════════════════════════════════════════════════════════════════

describe('RankingEngine — Scénarios Principaux', () => {
  it('1. Cas : AUCUN Élève (liste vide)', () => {
    const res = rankEvaluations(MONTHLY_META, []);
    expect(res.isRanked).toBe(false);
    expect(res.totalRankedStudents).toBe(0);
    expect(res.rankedStudents).toHaveLength(0);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.statistics.totalStudents).toBe(0);
  });

  it('2. Cas : UN SEUL Élève', () => {
    const student = createStudent('s1', 14.5, 'Kouassi Yves', 'M');
    const res = rankEvaluations(MONTHLY_META, [student]);

    expect(res.isRanked).toBe(true);
    expect(res.totalRankedStudents).toBe(1);
    expect(res.rankedStudents[0].rank).toBe(1);
    expect(res.rankedStudents[0].formattedRank).toBe('1er');
    expect(res.rankedStudents[0].isExAequo).toBe(false);
    expect(res.statistics.highestAverage).toBe(14.5);
    expect(res.statistics.lowestAverage).toBe(14.5);
    expect(res.statistics.classAverage).toBe(14.5);
    expect(res.statistics.medianAverage).toBe(14.5);
  });

  it('3. Cas : PLUSIEURS Élèves aux moyennes distinctes', () => {
    const students = [
      createStudent('s1', 12.0, 'Élève 1'),
      createStudent('s2', 17.5, 'Élève 2'),
      createStudent('s3', 14.0, 'Élève 3'),
    ];
    const res = rankEvaluations(MONTHLY_META, students);

    expect(res.isRanked).toBe(true);
    expect(res.totalRankedStudents).toBe(3);

    // L'ordre des résultats doit être du 1er au dernier
    expect(res.rankedStudents[0].studentId).toBe('s2'); // 17.5
    expect(res.rankedStudents[0].rank).toBe(1);
    expect(res.rankedStudents[0].formattedRank).toBe('1er');

    expect(res.rankedStudents[1].studentId).toBe('s3'); // 14.0
    expect(res.rankedStudents[1].rank).toBe(2);
    expect(res.rankedStudents[1].formattedRank).toBe('2ème');

    expect(res.rankedStudents[2].studentId).toBe('s1'); // 12.0
    expect(res.rankedStudents[2].rank).toBe(3);
    expect(res.rankedStudents[2].formattedRank).toBe('3ème');

    expect(res.statistics.highestAverage).toBe(17.5);
    expect(res.statistics.lowestAverage).toBe(12.0);
    expect(res.statistics.classAverage).toBe(14.5);
    expect(res.statistics.medianAverage).toBe(14.0);
  });

  it('4. Cas : PLUSIEURS Ex Æquo (ex: 2 premier ex, 1 troisième)', () => {
    const students = [
      createStudent('s1', 16.0, 'Awa', 'F'),
      createStudent('s2', 16.0, 'Koffi', 'M'),
      createStudent('s3', 11.5, 'Jean', 'M'),
    ];
    const res = rankEvaluations(MONTHLY_META, students);

    expect(res.isRanked).toBe(true);
    expect(res.rankedStudents[0].rank).toBe(1);
    expect(res.rankedStudents[0].isExAequo).toBe(true);
    expect(res.rankedStudents[0].formattedRank).toBe('1ère ex');

    expect(res.rankedStudents[1].rank).toBe(1);
    expect(res.rankedStudents[1].isExAequo).toBe(true);
    expect(res.rankedStudents[1].formattedRank).toBe('1er ex');

    expect(res.rankedStudents[2].rank).toBe(3); // Saut du rang 2
    expect(res.rankedStudents[2].isExAequo).toBe(false);
    expect(res.rankedStudents[2].formattedRank).toBe('3ème');

    expect(res.statistics.exAequoGroupsCount).toBe(1);
  });

  it('5. Cas : TOUTES les moyennes IDENTIQUES', () => {
    const students = [
      createStudent('s1', 10.0),
      createStudent('s2', 10.0),
      createStudent('s3', 10.0),
      createStudent('s4', 10.0),
    ];
    const res = rankEvaluations(MONTHLY_META, students);

    expect(res.isRanked).toBe(true);
    expect(res.totalRankedStudents).toBe(4);
    res.rankedStudents.forEach((r) => {
      expect(r.rank).toBe(1);
      expect(r.isExAequo).toBe(true);
      expect(r.exAequoCount).toBe(4);
      expect(r.formattedRank).toBe('1er ex');
    });

    expect(res.statistics.highestAverage).toBe(10.0);
    expect(res.statistics.lowestAverage).toBe(10.0);
    expect(res.statistics.classAverage).toBe(10.0);
    expect(res.statistics.medianAverage).toBe(10.0);
    expect(res.statistics.exAequoGroupsCount).toBe(1);
  });

  it('6. Cas : PRÉSCOLAIRE (Strictement AUCUN classement)', () => {
    const students = [
      createStudent('s1', null, 'Enfant 1'),
      createStudent('s2', null, 'Enfant 2'),
    ];
    const res = rankEvaluations(PRESCHOOL_META, students);

    expect(res.isRanked).toBe(false);
    expect(res.totalRankedStudents).toBe(0);

    res.rankedStudents.forEach((r) => {
      expect(r.rank).toBeNull();
      expect(r.formattedRank).toBe('—');
      expect(r.isRanked).toBe(false);
      expect(r.unrankedReason?.toLowerCase()).toContain('préscolaire');
    });

    expect(res.statistics.totalStudents).toBe(2);
    expect(res.statistics.totalRanked).toBe(0);
    expect(res.statistics.classAverage).toBeNull();
  });

  it('7. Cas : COMPOSITION IEP', () => {
    const students = [
      createStudent('s1', 13.0),
      createStudent('s2', 18.0),
    ];
    const res = rankEvaluations(IEP_META, students);

    expect(res.isRanked).toBe(true);
    expect(res.rankedStudents[0].studentId).toBe('s2');
    expect(res.rankedStudents[0].rank).toBe(1);
  });

  it('8. Cas : EXAMEN BLANC (MOCK_EXAM)', () => {
    const students = [
      createStudent('s1', 14.0),
      createStudent('s2', 15.0),
    ];
    const res = rankEvaluations(MOCK_EXAM_META, students);

    expect(res.isRanked).toBe(true);
    expect(res.rankedStudents[0].studentId).toBe('s2');
    expect(res.rankedStudents[0].rank).toBe(1);
  });

  it('9. Cas : ÉLÈVE NON CLASSÉ (Moyenne absente ou nulle)', () => {
    const students = [
      createStudent('s1', 15.0),
      createStudent('s2', null, 'Absent général', 'M', 'ABSENT'),
    ];
    const res = rankEvaluations(MONTHLY_META, students);

    expect(res.isRanked).toBe(true);
    expect(res.totalRankedStudents).toBe(1);

    const s1 = res.rankedStudents.find((r) => r.studentId === 's1');
    const s2 = res.rankedStudents.find((r) => r.studentId === 's2');

    expect(s1?.rank).toBe(1);
    expect(s1?.isRanked).toBe(true);

    expect(s2?.rank).toBeNull();
    expect(s2?.isRanked).toBe(false);
    expect(s2?.formattedRank).toBe('—');

    expect(res.statistics.totalStudents).toBe(2);
    expect(res.statistics.totalRanked).toBe(1);
    expect(res.statistics.totalUnranked).toBe(1);
    expect(res.statistics.absentCount).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — Edge Cases & Sécurité
// ═════════════════════════════════════════════════════════════════════════════

describe('RankingEngine — Edge Cases & Sécurité', () => {
  it('détecte les métadonnées invalides ou manquantes', () => {
    const res = rankEvaluations(null as any, [createStudent('s1', 12)]);
    expect(res.isRanked).toBe(false);
    expect(res.errors.some((e) => e.code === 'INVALID_METADATA')).toBe(true);
  });

  it('détecte les doublons de studentId', () => {
    const students = [
      createStudent('s1', 12),
      createStudent('s1', 15), // doublon
    ];
    const res = rankEvaluations(MONTHLY_META, students);
    expect(res.errors.some((e) => e.code === 'DUPLICATE_STUDENT_ID')).toBe(true);
  });

  it('calcule la médiane sur un nombre pair d\'élèves', () => {
    const students = [
      createStudent('s1', 10),
      createStudent('s2', 12),
      createStudent('s3', 14),
      createStudent('s4', 16),
    ];
    const res = rankEvaluations(MONTHLY_META, students);
    // Médiane entre 12 et 14 -> 13.0
    expect(res.statistics.medianAverage).toBe(13.0);
  });

  it('gère les absences justifiées (EXCUSED)', () => {
    const students = [
      createStudent('s1', 15),
      createStudent('s2', null, 'Malade', 'M', 'EXCUSED'),
    ];
    const res = rankEvaluations(MONTHLY_META, students);
    expect(res.statistics.excusedCount).toBe(1);
  });

  it('supporte les stratégies alternatives (DENSE & COMPETITION) via options', () => {
    const students = [
      createStudent('s1', 16.0),
      createStudent('s2', 16.0),
      createStudent('s3', 12.0),
    ];

    const denseRes = rankEvaluations(
      { ...MONTHLY_META, rankingStrategy: 'DENSE' },
      students,
    );
    expect(denseRes.rankedStudents.find((r) => r.studentId === 's3')?.rank).toBe(2);

    const compRes = rankEvaluations(
      { ...MONTHLY_META, rankingStrategy: 'COMPETITION' },
      students,
    );
    expect(compRes.rankedStudents[0].rank).toBe(1);
    expect(compRes.rankedStudents[1].rank).toBe(2);
  });
});
