// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Catalogue Pédagogique Services Index (src/services/academic/catalog/index.ts)
// Point d'entrée unique de la couche Services du Catalogue Pédagogique
// ─────────────────────────────────────────────────────────────────────────────

export * from './subjectCategoriesService';
export * from './subjectsService';

export {
  getComponents,
  getComponentsBySubject,
  addComponent,
  removeComponent,
  updateOrder as updateComponentOrder,
} from './subjectComponentsService';
export type { SubjectComponent } from './subjectComponentsService';

export {
  assignSubjectToLevel,
  removeSubjectFromLevel,
  updateOrder as updateLevelSubjectOrder,
  getSubjectsByLevel,
  getLevelsBySubject,
} from './levelSubjectsService';
export type { LevelSubject } from './levelSubjectsService';
