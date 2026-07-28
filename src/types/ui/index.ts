// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Types Interface Utilisateur & Options UI
// ─────────────────────────────────────────────────────────────────────────────

export type ViewId =
  | 'DASHBOARD'
  | 'STUDENTS'
  | 'CLASSES'
  | 'STAFF'
  | 'CANTEEN'
  | 'TRANSPORT'
  | 'ACTIVITIES'
  | 'SCOLARITY'
  | 'EXPENSES'
  | 'REPORTS'
  | 'HISTORY'
  | 'STATISTICS'
  | 'SETTINGS'
  | 'NOTES';

export type FeeStatus = 'Payé' | 'En retard' | 'Partiel' | 'En attente';
export type StudentStatus = 'Actif' | 'Inactif';
export type Gender = 'Masculin' | 'Féminin';

export type StaffRole = 'Direction' | 'Enseignant' | 'Administratif' | 'Support';
export type StaffStatus = 'Actif' | 'En congé' | 'Arrêt maladie' | 'Terminé' | 'Suspendu';

export type ExpenseCategory = 'Salaires' | 'Transport' | 'Matériel' | 'Entretien' | 'Alimentation' | 'Communication' | 'Autres';
export type PaymentMethod = 'Espèces' | 'Virement' | 'Chèque' | 'Mobile Money';

export type SchoolLevelCategory = 'PRESCOLAIRE' | 'CP' | 'CE' | 'CM1' | 'CM2';
export type EvaluationType = 'PRESCOLAIRE' | 'MENSUELLE' | 'IEP' | 'EXAMEN_BLANC';
export type AttendanceStatus = 'Présent' | 'Absent' | 'Absent justifié';
export type PrescolaireAppreciation = 'Non acquis' | "En cours d'acquisition" | 'Acquis';
export type ComplementaryAppreciation = 'Mauvais' | 'Insuffisant' | 'Passable' | 'Assez bien' | 'Bien' | 'Très bien' | 'Excellent';
