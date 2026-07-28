// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Promotion Engine (src/services/academic/decision/promotionEngine.ts)
// Moteur de recommandation de promotion, redoublement et archivage (CM2).
// Règle d'or : Ne modifie aucun enregistrement en base. Génère uniquement des recommandations.
// ─────────────────────────────────────────────────────────────────────────────

import { DecisionEngineOutput, PromotionRecommendation, PromotionAction } from './types';

/** Cartographie de progression des niveaux scolaires en Côte d'Ivoire */
export const LEVEL_PROGRESSION_MAP: Record<string, string> = {
  // Préscolaire
  'GARDERIE': 'PTESECTION',
  'PTESECTION': 'MOYSECTION',
  'PTESECTION A': 'MOYSECTION',
  'PTESECTION B': 'MOYSECTION',
  'MOYSECTION': 'GRDSECTION',
  'GRDSECTION': 'CP1',

  // Primaire
  'CP1': 'CP2',
  'CP1A': 'CP2',
  'CP1B': 'CP2',
  'CP2': 'CE1',
  'CP2A': 'CE1',
  'CP2B': 'CE1',
  'CE1': 'CE2',
  'CE1A': 'CE2',
  'CE1B': 'CE2',
  'CE2': 'CM1',
  'CE2A': 'CM1',
  'CE2B': 'CM1',
  'CM1': 'CM2',
  'CM1A': 'CM2',
  'CM1B': 'CM2',
  'CM2': 'FIN_CYCLE_PRIMAIRE',
  'CM2A': 'FIN_CYCLE_PRIMAIRE',
  'CM2B': 'FIN_CYCLE_PRIMAIRE',
};

/**
 * Calcule la recommandation de promotion pour un élève sur la base de sa décision pédagogique.
 *
 * @param studentId - Identifiant unique de l'élève
 * @param currentLevel - Niveau ou classe actuel (ex: 'CP1', 'CM2')
 * @param decisionResult - Résultat produit par le Decision Engine
 * @returns Recommandation de promotion structurée
 *
 * @example
 * const promo = recommendPromotion('std-01', 'CP1', decisionResult);
 * // promo.action -> 'PROMOTION'
 * // promo.targetLevel -> 'CP2'
 */
export function recommendPromotion(
  studentId: string,
  currentLevel: string,
  decisionResult: DecisionEngineOutput
): PromotionRecommendation {
  if (!studentId || !currentLevel || !decisionResult) {
    return {
      studentId: studentId || 'UNKNOWN',
      currentLevel: currentLevel || 'UNKNOWN',
      decision: decisionResult?.decision || 'NON_APPLICABLE',
      action: 'NONE',
      targetLevel: null,
      explanation: 'Données insuffisantes pour établir une recommandation de promotion.',
    };
  }

  const normalizedLevel = currentLevel.toUpperCase().trim();
  const decision = decisionResult.decision;

  // 1. Cas En Attente
  if (decision === 'EN_ATTENTE') {
    return {
      studentId,
      currentLevel,
      decision,
      action: 'PENDING',
      targetLevel: null,
      explanation: 'Promotion suspendue : la décision pédagogique est en attente.',
    };
  }

  // 2. Cas Redoublement ou Ajournement
  if (decision === 'REDOUBLE' || decision === 'AJOURNÉ') {
    return {
      studentId,
      currentLevel,
      decision,
      action: 'REDOUBLEMENT',
      targetLevel: currentLevel, // Maintien dans le niveau actuel
      explanation: `Maintien proposé dans le niveau ${currentLevel} (Décision : ${decision}).`,
    };
  }

  // 3. Cas Admis / Acquis (PASSE ou ACQUIS)
  if (decision === 'PASSE' || decision === 'ACQUIS') {
    // Cas spécial CM2 -> Fin du cycle primaire & Archivage
    if (normalizedLevel.startsWith('CM2')) {
      return {
        studentId,
        currentLevel,
        decision,
        action: 'GRADUATION_ARCHIVE',
        targetLevel: null,
        explanation: 'Élève admis au CEPE / Fin de cycle primaire CM2. Recommandation d\'archivage et transfert au secondaire.',
      };
    }

    // Progression normale
    const nextLevel = LEVEL_PROGRESSION_MAP[normalizedLevel] || calculateGenericNextLevel(currentLevel);

    return {
      studentId,
      currentLevel,
      decision,
      action: 'PROMOTION',
      targetLevel: nextLevel,
      explanation: `Admis(e) pour le passage du niveau ${currentLevel} vers le niveau ${nextLevel}.`,
    };
  }

  // 4. Par défaut / Autre
  return {
    studentId,
    currentLevel,
    decision,
    action: 'NONE',
    targetLevel: null,
    explanation: `Aucune recommandation automatique définie pour la décision ${decision}.`,
  };
}

/**
 * Traite un ensemble d'élèves pour générer la liste des recommandations de promotion.
 *
 * @param records Liste d'objets contenant { studentId, currentLevel, decisionResult }
 */
export function recommendBatchPromotions(
  records: Array<{ studentId: string; currentLevel: string; decisionResult: DecisionEngineOutput }>
): PromotionRecommendation[] {
  return records.map((r) => recommendPromotion(r.studentId, r.currentLevel, r.decisionResult));
}

/**
 * Calculateur générique du niveau suivant en cas de variante de nom de classe non pré-mappée.
 */
function calculateGenericNextLevel(level: string): string {
  const upper = level.toUpperCase();
  if (upper.includes('CP1')) return 'CP2';
  if (upper.includes('CP2')) return 'CE1';
  if (upper.includes('CE1')) return 'CE2';
  if (upper.includes('CE2')) return 'CM1';
  if (upper.includes('CM1')) return 'CM2';
  return `${level} (Niveau supérieur)`;
}
