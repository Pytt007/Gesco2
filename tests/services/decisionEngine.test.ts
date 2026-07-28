// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Tests complets du Decision Engine & Promotion Engine
// Fichier : tests/services/decisionEngine.test.ts
// Couverture minimale ciblée : ≥ 95%
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateDecision,
  evaluateBatchDecisions,
  recommendPromotion,
  recommendBatchPromotions,
  getDecisionRules,
  validateDecisionRules,
  clearRulesCache,
  setCachedRules,
  isPreschoolLevel,
  evaluatePreschoolDecision,
  evaluatePrimaryDecision,
  DEFAULT_DECISION_RULES,
  DecisionRule,
  DecisionEngineInput,
} from '../../src/services/academic/decision';

describe('Decision Engine Module', () => {
  beforeEach(() => {
    clearRulesCache();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. TESTS PRÉSCOLAIRE (Garderie, PS, MS, GS)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Cycle Préscolaire — Règle Garantie ACQUIS & Interdiction REDOUBLE', () => {
    const preschoolLevels = [
      'Garderie',
      'Ptesection A',
      'Ptesection B',
      'Moysection',
      'Grdsection',
      'PRESCHOOL',
      'PS',
      'MS',
      'GS',
    ];

    it('identifie correctement tous les niveaux du préscolaire', () => {
      preschoolLevels.forEach((level) => {
        expect(isPreschoolLevel(level)).toBe(true);
      });
      expect(isPreschoolLevel('CP1')).toBe(false);
      expect(isPreschoolLevel('CM2')).toBe(false);
      expect(isPreschoolLevel(null, 'PRESCHOOL')).toBe(true);
    });

    it('accorde TOUJOURS la décision ACQUIS quel que soit la moyenne (0, 5, 10, 20, null)', async () => {
      const averages = [0.00, 4.50, 9.99, 10.00, 15.50, 20.00, null];

      for (const level of ['Garderie', 'Ptesection A', 'Grdsection']) {
        for (const avg of averages) {
          const res = await evaluateDecision({
            average: avg,
            assessmentType: 'PRESCHOOL',
            level,
            academicYear: '2026-2027',
          });

          expect(res.decision).toBe('ACQUIS');
          expect(res.decision).not.toBe('REDOUBLE');
          expect(res.isValid).toBe(true);
          expect(res.icon).toBe('award');
        }
      }
    });

    it('ne propose JAMAIS la décision REDOUBLE au préscolaire même en cas d\'échec extrême', () => {
      const input: DecisionEngineInput = {
        average: 0.00,
        assessmentType: 'PRESCHOOL',
        level: 'Moysection',
        academicYear: '2026-2027',
      };

      const res = evaluatePreschoolDecision(input);
      expect(res.decision).toBe('ACQUIS');
      expect(res.decision).not.toBe('REDOUBLE');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TESTS PRIMAIRE (CP1, CP2, CE1, CE2, CM1, CM2)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Cycle Primaire — Évaluation selon les Règles en DB & Bornes', () => {
    const primaryLevels = ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];

    it('attribue PASSE pour une moyenne minimale de passage (10.00/20)', async () => {
      for (const level of primaryLevels) {
        const res = await evaluateDecision({
          average: 10.00,
          assessmentType: 'MONTHLY',
          level,
          academicYear: '2026-2027',
        });

        expect(res.decision).toBe('PASSE');
        expect(res.isValid).toBe(true);
        expect(res.color).toBe('#10b981');
      }
    });

    it('attribue REDOUBLE pour une moyenne sous la borne de passage (9.99/20)', async () => {
      for (const level of primaryLevels) {
        const res = await evaluateDecision({
          average: 9.99,
          assessmentType: 'MONTHLY',
          level,
          academicYear: '2026-2027',
        });

        expect(res.decision).toBe('REDOUBLE');
        expect(res.isValid).toBe(true);
        expect(res.color).toBe('#ef4444');
      }
    });

    it('attribue PASSE pour une moyenne maximale (20.00/20)', async () => {
      const res = await evaluateDecision({
        average: 20.00,
        assessmentType: 'MONTHLY',
        level: 'CM2',
        academicYear: '2026-2027',
      });

      expect(res.decision).toBe('PASSE');
      expect(res.isValid).toBe(true);
    });

    it('attribue REDOUBLE pour une moyenne minimale absolue (0.00/20)', async () => {
      const res = await evaluateDecision({
        average: 0.00,
        assessmentType: 'MONTHLY',
        level: 'CP1',
        academicYear: '2026-2027',
      });

      expect(res.decision).toBe('REDOUBLE');
      expect(res.isValid).toBe(true);
    });

    it('attribue EN_ATTENTE si la moyenne est nulle (absent ou non évalué)', async () => {
      const res = await evaluateDecision({
        average: null,
        assessmentType: 'MONTHLY',
        level: 'CE2',
        academicYear: '2026-2027',
      });

      expect(res.decision).toBe('EN_ATTENTE');
      expect(res.isValid).toBe(true);
      expect(res.warnings.length).toBeGreaterThan(0);
    });

    it('applique les règles spécifiques par niveau lorsque définies', async () => {
      const customRules: DecisionRule[] = [
        {
          id: 'custom-cm2-excel',
          code: 'RULE_CM2_EXCEL',
          assessmentTypeId: 'MOCK_EXAM',
          levelId: 'CM2',
          minimumAverage: 16.00,
          maximumAverage: 20.00,
          decision: 'ACQUIS',
          description: 'Mention Très Bien CM2',
          color: '#8b5cf6',
          icon: 'star',
          sortOrder: 1,
          version: 1,
          isActive: true,
        },
      ];

      setCachedRules(customRules);

      const res = await evaluateDecision({
        average: 17.50,
        assessmentType: 'MOCK_EXAM',
        level: 'CM2',
        academicYear: '2026-2027',
      });

      expect(res.decision).toBe('ACQUIS');
      expect(res.ruleApplied?.code).toBe('RULE_CM2_EXCEL');
      expect(res.color).toBe('#8b5cf6');
    });

    it('respecte les filtres par rang si définis dans la règle', () => {
      const rankRules: DecisionRule[] = [
        {
          id: 'rank-top3',
          code: 'RULE_TOP3_PASSE',
          assessmentTypeId: null,
          levelId: 'CE1',
          minimumAverage: 9.50,
          maximumAverage: 20.00,
          minimumRank: 1,
          maximumRank: 3,
          decision: 'PASSE',
          description: 'Passe si dans le top 3 même avec 9.50',
          color: '#10b981',
          icon: 'award',
          sortOrder: 1,
          version: 1,
          isActive: true,
        },
      ];

      const resRank2 = evaluatePrimaryDecision(
        { average: 9.60, rank: 2, level: 'CE1', assessmentType: 'MONTHLY', academicYear: '2026-2027' },
        rankRules
      );
      expect(resRank2.decision).toBe('PASSE');

      const resRank10 = evaluatePrimaryDecision(
        { average: 9.60, rank: 10, level: 'CE1', assessmentType: 'MONTHLY', academicYear: '2026-2027' },
        rankRules
      );
      expect(resRank10.decision).toBe('REDOUBLE'); // Ne match pas le rang top 3
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. GESTION DES ERREURS & VALIDATION DES RÈGLES
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Gestion des Erreurs et Validation des Règles', () => {
    it('détecte l\'absence de règle et renvoie une erreur NO_RULES', () => {
      const validation = validateDecisionRules([]);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].code).toBe('NO_RULES');
    });

    it('détecte une règle inactive incluse et renvoie INACTIVE_RULE', () => {
      const rules: DecisionRule[] = [
        { ...DEFAULT_DECISION_RULES[0], isActive: false },
      ];

      const validation = validateDecisionRules(rules);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].code).toBe('INACTIVE_RULE');
    });

    it('détecte une plage invalide (minimum > maximum) et renvoie INVALID_RANGE', () => {
      const invalidRules: DecisionRule[] = [
        {
          id: 'invalid-1',
          code: 'BAD_RANGE',
          minimumAverage: 15.00,
          maximumAverage: 10.00,
          decision: 'PASSE',
          color: '#000',
          icon: 'error',
          sortOrder: 1,
          version: 1,
          isActive: true,
        },
      ];

      const validation = validateDecisionRules(invalidRules);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].code).toBe('INVALID_RANGE');
    });

    it('détecte un chevauchement potentiel entre deux règles actives', () => {
      const overlappingRules: DecisionRule[] = [
        {
          id: 'ov-1',
          code: 'RULE_A',
          minimumAverage: 8.00,
          maximumAverage: 12.00,
          decision: 'PASSE',
          color: '#10b981',
          icon: 'check',
          sortOrder: 1,
          version: 1,
          isActive: true,
        },
        {
          id: 'ov-2',
          code: 'RULE_B',
          minimumAverage: 10.00,
          maximumAverage: 15.00,
          decision: 'REDOUBLE',
          color: '#ef4444',
          icon: 'alert',
          sortOrder: 2,
          version: 1,
          isActive: true,
        },
      ];

      const validation = validateDecisionRules(overlappingRules);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Chevauchement potentiel');
    });

    it('gère proprement une entrée nullo/incomplète dans evaluateDecision', async () => {
      const resNull = await evaluateDecision(null as any);
      expect(resNull.isValid).toBe(false);
      expect(resNull.decision).toBe('NON_APPLICABLE');

      const resIncomplete = await evaluateDecision({ average: 12 } as any);
      expect(resIncomplete.isValid).toBe(false);
      expect(resIncomplete.decision).toBe('NON_APPLICABLE');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PROMOTION ENGINE (Passage, Redoublement, Archivage CM2)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Promotion Engine — Progression et Recommandations', () => {
    it('recommande la PROMOTION vers le niveau supérieur pour un élève admis (CP1 -> CP2)', () => {
      const decisionOutput = {
        decision: 'PASSE' as const,
        comment: 'Admis',
        color: '#10b981',
        icon: 'check',
        ruleApplied: null,
        isValid: true,
        errors: [],
        warnings: [],
      };

      const promo = recommendPromotion('std-01', 'CP1', decisionOutput);
      expect(promo.action).toBe('PROMOTION');
      expect(promo.targetLevel).toBe('CP2');
      expect(promo.explanation).toContain('CP1 vers le niveau CP2');
    });

    it('recommande le REDOUBLEMENT dans le même niveau pour un élève non admis (CE1 -> CE1)', () => {
      const decisionOutput = {
        decision: 'REDOUBLE' as const,
        comment: 'Redoublement',
        color: '#ef4444',
        icon: 'alert',
        ruleApplied: null,
        isValid: true,
        errors: [],
        warnings: [],
      };

      const promo = recommendPromotion('std-02', 'CE1', decisionOutput);
      expect(promo.action).toBe('REDOUBLEMENT');
      expect(promo.targetLevel).toBe('CE1');
    });

    it('recommande l\'ARCHIVAGE / FIN DE CYCLE pour un élève admis en CM2', () => {
      const decisionOutput = {
        decision: 'PASSE' as const,
        comment: 'Admis CEPE',
        color: '#10b981',
        icon: 'check',
        ruleApplied: null,
        isValid: true,
        errors: [],
        warnings: [],
      };

      const promo = recommendPromotion('std-03', 'CM2 A', decisionOutput);
      expect(promo.action).toBe('GRADUATION_ARCHIVE');
      expect(promo.targetLevel).toBeNull();
      expect(promo.explanation).toContain('Fin de cycle primaire CM2');
    });

    it('recommande PENDING pour un élève dont la décision est EN_ATTENTE', () => {
      const decisionOutput = {
        decision: 'EN_ATTENTE' as const,
        comment: 'En attente',
        color: '#6b7280',
        icon: 'clock',
        ruleApplied: null,
        isValid: true,
        errors: [],
        warnings: [],
      };

      const promo = recommendPromotion('std-04', 'CE2', decisionOutput);
      expect(promo.action).toBe('PENDING');
      expect(promo.targetLevel).toBeNull();
    });

    it('gère l\'évaluation et la recommandation par lot (Batch)', async () => {
      const inputs: DecisionEngineInput[] = [
        { average: 14.0, level: 'CP1', assessmentType: 'MONTHLY', academicYear: '2026-2027', studentId: 's1' },
        { average: 7.5, level: 'CP2', assessmentType: 'MONTHLY', academicYear: '2026-2027', studentId: 's2' },
        { average: 15.0, level: 'CM2', assessmentType: 'MOCK_EXAM', academicYear: '2026-2027', studentId: 's3' },
      ];

      const decisions = await evaluateBatchDecisions(inputs);
      expect(decisions.length).toBe(3);

      const batchRecords = inputs.map((inp, idx) => ({
        studentId: inp.studentId!,
        currentLevel: inp.level,
        decisionResult: decisions[idx],
      }));

      const promotions = recommendBatchPromotions(batchRecords);
      expect(promotions.length).toBe(3);
      expect(promotions[0].action).toBe('PROMOTION');
      expect(promotions[1].action).toBe('REDOUBLEMENT');
      expect(promotions[2].action).toBe('GRADUATION_ARCHIVE');
    });

    it('gère les entrées invalides ou incomplètes dans recommendPromotion', () => {
      const emptyPromo = recommendPromotion('', '', null as any);
      expect(emptyPromo.action).toBe('NONE');
      expect(emptyPromo.explanation).toContain('Données insuffisantes');

      const nonApplicableDecision = {
        decision: 'NON_APPLICABLE' as const,
        comment: 'N/A',
        color: '#000',
        icon: 'slash',
        ruleApplied: null,
        isValid: true,
        errors: [],
        warnings: [],
      };
      const naPromo = recommendPromotion('s-na', 'CP1', nonApplicableDecision);
      expect(naPromo.action).toBe('NONE');
    });

    it('calcule le niveau supérieur générique pour des variantes de classes non-mappées', () => {
      const decisionPass = {
        decision: 'PASSE' as const,
        comment: 'Passage',
        color: '#10b981',
        icon: 'check',
        ruleApplied: null,
        isValid: true,
        errors: [],
        warnings: [],
      };

      expect(recommendPromotion('s1', 'Niveau-CP1-Bis', decisionPass).targetLevel).toBe('CP2');
      expect(recommendPromotion('s2', 'Niveau-CP2-Bis', decisionPass).targetLevel).toBe('CE1');
      expect(recommendPromotion('s3', 'Niveau-CE1-Bis', decisionPass).targetLevel).toBe('CE2');
      expect(recommendPromotion('s4', 'Niveau-CE2-Bis', decisionPass).targetLevel).toBe('CM1');
      expect(recommendPromotion('s5', 'Niveau-CM1-Bis', decisionPass).targetLevel).toBe('CM2');
      expect(recommendPromotion('s6', 'CLASSE_SPE', decisionPass).targetLevel).toBe('CLASSE_SPE (Niveau supérieur)');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. CACHE & VALIDATION AVANCÉE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Gestion du Cache des Règles et Validation Avancée', () => {
    it('utilise le cache en mémoire et permet sa réinitialisation via clearRulesCache', async () => {
      const rules = await getDecisionRules();
      expect(rules.length).toBeGreaterThan(0);

      setCachedRules([DEFAULT_DECISION_RULES[0]]);
      const cached = await getDecisionRules();
      expect(cached.length).toBe(1);

      clearRulesCache();
      const reloaded = await getDecisionRules();
      expect(reloaded.length).toBeGreaterThan(0);
    });

    it('détecte une plage de rang invalide (minimumRank > maximumRank)', () => {
      const badRankRule: DecisionRule = {
        id: 'bad-rank',
        code: 'BAD_RANK',
        minimumAverage: 0,
        maximumAverage: 20,
        minimumRank: 10,
        maximumRank: 2,
        decision: 'PASSE',
        color: '#000',
        icon: 'slash',
        sortOrder: 1,
        version: 1,
        isActive: true,
      };

      const validation = validateDecisionRules([badRankRule]);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].code).toBe('INVALID_RANGE');
    });

    it('gère l\'absence explicite de description dans une règle appliquée et couvre tous les commentaires par défaut', () => {
      const ruleAcquis: DecisionRule = {
        id: 'no-desc-acq',
        code: 'NO_DESC_ACQ',
        minimumAverage: 0,
        maximumAverage: 20,
        decision: 'ACQUIS',
        description: null,
        color: '#3b82f6',
        icon: 'award',
        sortOrder: 1,
        version: 1,
        isActive: true,
      };

      const resAcq = evaluatePrimaryDecision(
        { average: 14, level: 'CP1', assessmentType: 'MONTHLY', academicYear: '2026-2027' },
        [ruleAcquis]
      );
      expect(resAcq.comment).toContain('Compétences fondamentales validées');

      const ruleEnAttente: DecisionRule = {
        id: 'no-desc-att',
        code: 'NO_DESC_ATT',
        minimumAverage: 0,
        maximumAverage: 20,
        decision: 'EN_ATTENTE',
        description: null,
        color: '#6b7280',
        icon: 'clock',
        sortOrder: 1,
        version: 1,
        isActive: true,
      };

      const resAtt = evaluatePrimaryDecision(
        { average: 14, level: 'CP1', assessmentType: 'MONTHLY', academicYear: '2026-2027' },
        [ruleEnAttente]
      );
      expect(resAtt.comment).toContain('en attente de délibération');

      const ruleDefaultOther: DecisionRule = {
        id: 'no-desc-oth',
        code: 'NO_DESC_OTH',
        minimumAverage: 0,
        maximumAverage: 20,
        decision: 'NON_APPLICABLE',
        description: null,
        color: '#9ca3af',
        icon: 'slash',
        sortOrder: 1,
        version: 1,
        isActive: true,
      };

      const resOth = evaluatePrimaryDecision(
        { average: 14, level: 'CP1', assessmentType: 'MONTHLY', academicYear: '2026-2027' },
        [ruleDefaultOther]
      );
      expect(resOth.comment).toContain('Décision : NON_APPLICABLE');
    });
  });
});
