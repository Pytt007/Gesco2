/**
 * Types pour le module de Gestion Financière et Scolarité GESCO
 */

export type TuitionLevelCode = 'PS' | 'MS' | 'GS' | 'CP1' | 'CP2' | 'CE1' | 'CE2' | 'CM1' | 'CM2';

export interface TuitionFeeSchedule {
  id: string;
  academicYearId: string;
  levelCode: TuitionLevelCode;
  levelName: string;
  registrationFee: number;
  tuitionFee: number;
  totalAnnualFee: number; // Calculé automatiquement (registrationFee + tuitionFee)
  allowFixedDiscount: boolean;
  allowPercentDiscount: boolean;
  maxDiscountPercent?: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface TuitionFeeInput {
  academicYearId: string;
  levelCode: TuitionLevelCode;
  levelName?: string;
  registrationFee: number;
  tuitionFee: number;
  allowFixedDiscount?: boolean;
  allowPercentDiscount?: boolean;
  maxDiscountPercent?: number;
}

export interface TuitionFeeDiscount {
  id: string;
  code: string;
  name: string;
  discountType: 'FIXED' | 'PERCENTAGE';
  value: number;
  description?: string;
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types Inscription Financière de l'Élève
// ─────────────────────────────────────────────────────────────────────────────

export type DiscountType = 'NONE' | 'FIXED' | 'PERCENTAGE';

export interface EnrollmentInstallmentItem {
  id?: string;
  number: number; // 1 à 8
  label: string; // 'Échéance 1', ...
  dueDate?: string;
  amountDue: number;
  amountPaid: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
}

export interface StudentFinancialEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  parentSponsor?: string;
  parentPhone?: string;
  photoUrl?: string;
  matricule: string;
  academicYearId: string;
  classroomId: string;
  className: string;
  levelCode: TuitionLevelCode;
  registrationFee: number;
  tuitionFee: number;
  totalAnnualFee: number; // Frais inscription + scolarité bruts
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  netTotalDue: number; // Total annuel - discountAmount
  netAmountDue?: number;
  parentSponsorName?: string;
  totalPaid: number;
  remainingBalance: number; // netTotalDue - totalPaid
  installmentsCount: number;
  installments: EnrollmentInstallmentItem[];
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface FinancialEnrollmentInput {
  studentId: string;
  academicYearId: string;
  classroomId: string;
  parentSponsor?: string;
  parentPhone?: string;
  levelCode?: TuitionLevelCode;
  discountType: DiscountType;
  discountValue: number;
  customInstallments?: { number: number; amountDue: number; label?: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Types Enregistrement des Paiements & Reçus
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentMode = 'CASH' | 'ORANGE_MONEY' | 'MTN_MONEY' | 'WAVE' | 'TRANSFER' | 'CHECK';

export type TuitionPaymentStatus = 'VALIDATED' | 'CANCELLED';

export interface TuitionPaymentRecord {
  id: string;
  enrollmentId: string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
  recordedBy: string;
  status: TuitionPaymentStatus;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordPaymentInput {
  enrollmentId: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
  recordedBy?: string;
  confirmOverpayment?: boolean;
  /** ✅ INT-005 : Année scolaire dynamique — évite l'année scolaire codée en dur */
  academicYearId?: string;
}

export interface ReceiptData {
  id?: string;
  paymentId?: string;
  receiptNumber: string; // e.g. REC-2026-000001
  schoolLogoUrl?: string;
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  academicYear: string;
  studentPhotoUrl?: string;
  studentName: string;
  matricule: string;
  className: string;
  parentSponsorName?: string;
  parentSponsor?: string;
  parentSponsorPhone?: string;
  paymentDate: string;
  amountPaid: number;
  paymentModeLabel: string;
  referenceNumber?: string;
  remarks?: string;
  totalAnnualFee?: number;
  totalPaidBefore?: number;
  remainingBalance?: number;
  statusLabel?: string;
  recordedBy?: string;
  checksum?: string;
  qrCodeUrl?: string;
  htmlContent?: string;
  status?: TuitionPaymentStatus;
  cancellationReason?: string;
  cancelledBy?: string;
}

export interface PaymentReceiptFilter {
  search?: string; // Numéro, Élève, Matricule, Responsable
  className?: string;
  startDate?: string;
  endDate?: string;
  status?: 'ALL' | 'VALIDATED' | 'CANCELLED';
}

// ─────────────────────────────────────────────────────────────────────────────
// Types Suivi Financier & KPIs
// ─────────────────────────────────────────────────────────────────────────────

export interface FinancialKPIs {
  totalStudents: number;
  paidStudents: number;
  partialStudents: number;
  unpaidStudents: number;
  totalCollected: number;
  totalRemaining: number;
  totalNetDue: number;
  recoveryRate: number; // En pourcentage 0..100
}

export interface FinancialTrackingFilter {
  search?: string;
  classroomId?: string;
  levelCode?: TuitionLevelCode | 'ALL';
  status?: 'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID';
  academicYearId?: string;
}

export interface FinancialAlertItem {
  type: 'OVERDUE_INSTALLMENT' | 'HIGH_BALANCE';
  studentId: string;
  studentName: string;
  className: string;
  amount: number;
  message: string;
}
