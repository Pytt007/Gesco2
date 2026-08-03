/**
 * Types pour le module Cantine GESCO
 */

export type CanteenLevelCode = 'PS' | 'MS' | 'GS' | 'CP1' | 'CP2' | 'CE1' | 'CE2' | 'CM1' | 'CM2';

export type CanteenDiscountType = 'NONE' | 'FIXED' | 'PERCENTAGE';

export type CanteenSubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'NOT_ENROLLED' | 'ARCHIVED';

export type CanteenPaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration des Tarifs Cantine
// ─────────────────────────────────────────────────────────────────────────────

export interface CanteenPeriod {
  number: number;
  label: string;        // 'Période 1', 'Période 2', 'Période 3'
  amountDue: number;    // Calculé automatiquement = annualRate / periodsCount
  amountPaid: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  dueDate?: string;
}

export interface CanteenFeeSchedule {
  id: string;
  academicYearId: string;
  levelCode: CanteenLevelCode;
  levelName: string;
  annualRate: number;         // Tarif annuel de base
  periodsCount: number;       // Nombre de périodes (défaut: 3)
  totalAmount: number;        // Calculé automatiquement = annualRate
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface CanteenFeeInput {
  academicYearId: string;
  levelCode: CanteenLevelCode;
  levelName?: string;
  annualRate: number;
  periodsCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inscription Cantine
// ─────────────────────────────────────────────────────────────────────────────

export interface CanteenEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  matricule: string;
  photoUrl?: string;
  className: string;
  levelCode: CanteenLevelCode;
  parentSponsor?: string;
  parentPhone?: string;
  academicYearId: string;
  annualRate: number;
  periodsCount: number;
  discountType: CanteenDiscountType;
  discountValue: number;
  discountAmount: number;
  netAmountDue: number;       // annualRate - discountAmount
  totalPaid: number;
  remainingBalance: number;   // netAmountDue - totalPaid
  periods: CanteenPeriod[];
  subscriptionStatus: CanteenSubscriptionStatus;
  status?: CanteenSubscriptionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CanteenEnrollmentInput {
  studentId: string;
  studentName: string;
  matricule: string;
  photoUrl?: string;
  className: string;
  levelCode: CanteenLevelCode;
  parentSponsor?: string;
  parentPhone?: string;
  academicYearId: string;
  discountType: CanteenDiscountType;
  discountValue: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Paiement Cantine
// ─────────────────────────────────────────────────────────────────────────────

export type CanteenPaymentMode = 'CASH' | 'ORANGE_MONEY' | 'MTN_MONEY' | 'WAVE' | 'TRANSFER' | 'CHECK';

export interface CanteenPaymentRecord {
  id: string;
  enrollmentId: string;
  receiptNumber: string;
  amount: number;
  periodNumber?: number;
  paymentDate: string;
  paymentMode: CanteenPaymentMode;
  referenceNumber?: string;
  remarks?: string;
  recordedBy: string;
  status: 'VALIDATED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface RecordCanteenPaymentInput {
  enrollmentId: string;
  amount: number;
  periodNumber?: number;
  paymentDate: string;
  paymentMode: CanteenPaymentMode;
  referenceNumber?: string;
  remarks?: string;
  recordedBy?: string;
}

export interface CanteenReceiptData {
  receiptNumber: string;
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  academicYear: string;
  studentName: string;
  matricule: string;
  className: string;
  parentSponsorName: string;
  paymentDate: string;
  amountPaid: number;
  paymentModeLabel: string;
  periodLabel?: string;
  annualRate: number;
  totalPaidAfter: number;
  remainingBalance: number;
  statusLabel: string;
  recordedBy: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suivi & KPIs Cantine
// ─────────────────────────────────────────────────────────────────────────────

export interface CanteenKPIs {
  totalEnrolled: number;
  upToDate: number;
  partial: number;
  unpaid: number;
  totalCollected: number;
  totalRemaining: number;
  recoveryRate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Liste Repas du Jour
// ─────────────────────────────────────────────────────────────────────────────

export type MealAuthorizationStatus = 'AUTHORIZED' | 'SUSPENDED' | 'NOT_ENROLLED';

export interface DailyMealEntry {
  studentId: string;
  studentName: string;
  matricule: string;
  photoUrl?: string;
  className: string;
  levelCode: CanteenLevelCode;
  subscriptionStatus: CanteenSubscriptionStatus;
  mealStatus: MealAuthorizationStatus;
  remainingBalance: number;
}

export interface DailyMealFilter {
  date: string;
  levelCode?: CanteenLevelCode | 'ALL';
  classroomId?: string | 'ALL';
}

export interface DailyMealSummary {
  date: string;
  totalEnrolled: number;
  authorizedCount: number;
  suspendedCount: number;
  notEnrolledCount: number;
  entries: DailyMealEntry[];
}
