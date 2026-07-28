// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Decision Rules Management & Validation (src/services/academic/decision/decisionRules.ts)
// Chargement, mise en cache et validation des règles de décision pédagogique.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../../common/supabaseClient';
import { DecisionRule, DecisionType } from './types';

export interface RuleValidationError {
  code: 'INACTIVE_RULE' | 'INVALID_RANGE' | 'OVERLAPPING_RULES' | 'NO_RULES';
  message: string;
  ruleId?: string;
  ruleCode?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: RuleValidationError[];
  warnings: string[];
}

/** Cache en mémoire des règles de décision */
let cachedRules: DecisionRule[] | null = null;

/** Règles par défaut utilisées comme fallback résilient */
export const DEFAULT_DECISION_RULES: DecisionRule[] = [
  {
    id: 'rule-def-1',
    code: 'RULE_PRIM_PASSE',
    assessmentTypeId: null,
    levelId: null,
    minimumAverage: 10.00,
    maximumAverage: 20.00,
    minimumRank: null,
    maximumRank: null,
    decision: 'PASSE',
    description: 'Admis en classe supérieure (Moyenne >= 10/20)',
    color: '#10b981',
    icon: 'check-circle',
    sortOrder: 1,
    version: 1,
    isActive: true,
  },
  {
    id: 'rule-def-2',
    code: 'RULE_PRIM_REDOUBLE',
    assessmentTypeId: null,
    levelId: null,
    minimumAverage: 0.00,
    maximumAverage: 9.99,
    minimumRank: null,
    maximumRank: null,
    decision: 'REDOUBLE',
    description: 'Proposé au redoublement (Moyenne < 10/20)',
    color: '#ef4444',
    icon: 'alert-triangle',
    sortOrder: 2,
    version: 1,
    isActive: true,
  },
  {
    id: 'rule-def-3',
    code: 'RULE_PRESCHOOL_ACQUIS',
    assessmentTypeId: 'PRESCHOOL',
    levelId: null,
    minimumAverage: 0.00,
    maximumAverage: 20.00,
    minimumRank: null,
    maximumRank: null,
    decision: 'ACQUIS',
    description: 'Compétences du préscolaire validées',
    color: '#3b82f6',
    icon: 'award',
    sortOrder: 1,
    version: 1,
    isActive: true,
  },
];

/**
 * Efface le cache des règles de décision.
 */
export function clearRulesCache(): void {
  cachedRules = null;
}

/**
 * Permet de définir manuellement les règles en cache (utile pour les tests et injections).
 */
export function setCachedRules(rules: DecisionRule[]): void {
  cachedRules = [...rules];
}

/**
 * Récupère les règles de décision actives (depuis le cache ou Supabase).
 * @param forceRefresh - Si true, force la relecture en base de données.
 */
export async function getDecisionRules(forceRefresh = false): Promise<DecisionRule[]> {
  if (!forceRefresh && cachedRules !== null) {
    return cachedRules;
  }

  try {
    const { data: rows, error } = await supabase
      .from('decision_rules')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && rows && rows.length > 0) {
      const loadedRules: DecisionRule[] = rows.map((r: any) => ({
        id: r.id,
        code: r.code,
        assessmentTypeId: r.assessment_type_id ?? null,
        levelId: r.level_id ?? null,
        minimumAverage: Number(r.minimum_average ?? 0),
        maximumAverage: Number(r.maximum_average ?? 20),
        minimumRank: r.minimum_rank ? Number(r.minimum_rank) : null,
        maximumRank: r.maximum_rank ? Number(r.maximum_rank) : null,
        decision: (r.decision as DecisionType) || 'NON_APPLICABLE',
        description: r.description ?? null,
        color: r.color || '#3b82f6',
        icon: r.icon || 'check-circle',
        sortOrder: r.sort_order ?? 1,
        version: r.version ?? 1,
        effectiveFrom: r.effective_from ?? null,
        effectiveTo: r.effective_to ?? null,
        isActive: r.is_active ?? true,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      cachedRules = loadedRules;
      return loadedRules;
    }

    // Fallback local en cas de table vide ou d'erreur de connexion Supabase
    cachedRules = DEFAULT_DECISION_RULES;
    return DEFAULT_DECISION_RULES;
  } catch (err) {
    console.warn('[decisionRules Warning] Fallback local sur règles par défaut:', err);
    cachedRules = DEFAULT_DECISION_RULES;
    return DEFAULT_DECISION_RULES;
  }
}

/**
 * Valide un ensemble de règles de décision pour vérifier leur cohérence.
 * Détecte :
 * - Aucune règle disponible
 * - Règles inactives incluses
 * - Plages moyennes ou rangs invalides (min > max)
 * - Chevauchements entre plages pour un même contexte (level_id + assessment_type_id)
 *
 * @param rules Liste des règles à valider
 */
export function validateDecisionRules(rules: DecisionRule[]): ValidationResult {
  const errors: RuleValidationError[] = [];
  const warnings: string[] = [];

  if (!rules || rules.length === 0) {
    errors.push({
      code: 'NO_RULES',
      message: 'Aucune règle de décision définie.',
    });
    return { isValid: false, errors, warnings };
  }

  for (const rule of rules) {
    // 1. Vérification règle active
    if (!rule.isActive) {
      errors.push({
        code: 'INACTIVE_RULE',
        message: `La règle "${rule.code}" est inactive mais incluse dans le jeu d'évaluation.`,
        ruleId: rule.id,
        ruleCode: rule.code,
      });
    }

    // 2. Plage moyenne invalide (minimum > maximum)
    if (rule.minimumAverage > rule.maximumAverage) {
      errors.push({
        code: 'INVALID_RANGE',
        message: `La règle "${rule.code}" possède une moyenne minimale (${rule.minimumAverage}) supérieure à la moyenne maximale (${rule.maximumAverage}).`,
        ruleId: rule.id,
        ruleCode: rule.code,
      });
    }

    // 3. Plage rang invalide (minimum > maximum)
    if (
      rule.minimumRank !== null &&
      rule.minimumRank !== undefined &&
      rule.maximumRank !== null &&
      rule.maximumRank !== undefined &&
      rule.minimumRank > rule.maximumRank
    ) {
      errors.push({
        code: 'INVALID_RANGE',
        message: `La règle "${rule.code}" possède un rang minimal (${rule.minimumRank}) supérieur au rang maximal (${rule.maximumRank}).`,
        ruleId: rule.id,
        ruleCode: rule.code,
      });
    }
  }

  // 4. Détection des chevauchements de plages (Overlaps)
  const activeRules = rules.filter((r) => r.isActive);
  for (let i = 0; i < activeRules.length; i++) {
    for (let j = i + 1; j < activeRules.length; j++) {
      const r1 = activeRules[i];
      const r2 = activeRules[j];

      // Même contexte (même level_id ou global, et même assessment_type_id ou global)
      const sameLevel = !r1.levelId || !r2.levelId || r1.levelId === r2.levelId;
      const sameEval = !r1.assessmentTypeId || !r2.assessmentTypeId || r1.assessmentTypeId === r2.assessmentTypeId;

      if (sameLevel && sameEval) {
        // Test de chevauchement sur la moyenne
        const overlapAverage =
          Math.max(r1.minimumAverage, r2.minimumAverage) <= Math.min(r1.maximumAverage, r2.maximumAverage);

        // Si les deux règles définissent aussi un rang, vérifier s'il y a chevauchement de rang
        let overlapRank = true;
        if (
          r1.minimumRank !== null && r1.minimumRank !== undefined && r1.maximumRank !== null && r1.maximumRank !== undefined &&
          r2.minimumRank !== null && r2.minimumRank !== undefined && r2.maximumRank !== null && r2.maximumRank !== undefined
        ) {
          overlapRank = Math.max(r1.minimumRank, r2.minimumRank) <= Math.min(r1.maximumRank, r2.maximumRank);
        }

        if (overlapAverage && overlapRank && r1.decision !== r2.decision) {
          warnings.push(
            `Chevauchement potentiel détecté entre la règle "${r1.code}" [${r1.minimumAverage}-${r1.maximumAverage}] et la règle "${r2.code}" [${r2.minimumAverage}-${r2.maximumAverage}].`
          );
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
