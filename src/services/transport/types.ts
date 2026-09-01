/**
 * GESCO — Types du module Transport Scolaire
 */

// ─────────────────────────────────────────────────────────────────────────────
// Énumérations & Primitives
// ─────────────────────────────────────────────────────────────────────────────

export type TransportLineStatus = 'ACTIVE' | 'SUSPENDED' | 'OUT_OF_SERVICE' | 'ARCHIVED';

export type TransportPaymentMode =
  | 'CASH'
  | 'ORANGE_MONEY'
  | 'MTN_MONEY'
  | 'WAVE'
  | 'TRANSFER'
  | 'CHECK';

export type TransportDiscountType = 'NONE' | 'FIXED' | 'PERCENTAGE';

export type TransportPeriodStatus = 'PENDING' | 'PARTIAL' | 'PAID';

// ─────────────────────────────────────────────────────────────────────────────
// Véhicule
// ─────────────────────────────────────────────────────────────────────────────

export interface TransportVehicle {
  id: string;
  name: string;           // Nom d'usage : "Bus 01"
  brand: string;          // Marque : "Mercedes"
  model: string;          // Modèle : "Sprinter"
  licensePlate: string;   // Immatriculation : "CI-1234-AB"
  capacity: number;       // Nombre de places
  createdAt: string;
  updatedAt: string;
}

export interface TransportVehicleInput {
  name: string;
  brand: string;
  model: string;
  licensePlate: string;
  capacity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chauffeur
// ─────────────────────────────────────────────────────────────────────────────

export interface TransportDriver {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransportDriverInput {
  name: string;
  phone: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Arrêts & Étapes de Transport
// ─────────────────────────────────────────────────────────────────────────────

export interface TransportStop {
  id: string;
  lineId: string;
  name: string;
  orderIndex: number;
  pickupTime?: string;
  dropoffTime?: string;
  zone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransportStopInput {
  name: string;
  orderIndex: number;
  pickupTime?: string;
  dropoffTime?: string;
  zone?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ligne de Transport
// ─────────────────────────────────────────────────────────────────────────────

export interface TransportLine {
  id: string;
  name: string;             // Nom de la ligne : "Ligne Cocody"
  zone: string;             // Zone desservie : "Cocody, Riviera"
  vehicleId: string;
  vehicleName: string;
  vehicleLicensePlate: string;
  vehicleCapacity: number;
  driverId: string;
  driverName: string;
  driverPhone: string;
  annualFee: number;        // Tarif annuel
  periodsCount: number;     // Nombre de périodes (défaut: 3)
  enrolledCount: number;    // Nombre d'élèves inscrits (calculé)
  availableSeats: number;   // Places restantes (calculé)
  occupancyRate: number;    // Taux d'occupation en % (calculé)
  stops?: TransportStop[];  // Arrêts ordonnés desservis par la ligne
  academicYearId: string;
  status: TransportLineStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TransportLineInput {
  name: string;
  zone: string;
  vehicleId: string;
  driverId: string;
  annualFee: number;
  periodsCount?: number;
  stops?: TransportStopInput[];
  academicYearId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inscription Transport
// ─────────────────────────────────────────────────────────────────────────────

export interface TransportPeriod {
  number: number;
  label: string;
  amountDue: number;
  amountPaid: number;
  status: TransportPeriodStatus;
  dueDate?: string;
}

export interface TransportEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  matricule: string;
  photoUrl?: string;
  className: string;
  levelCode: string;
  parentSponsor?: string;
  parentPhone?: string;
  lineId: string;
  lineName: string;
  zone: string;
  academicYearId: string;
  annualFee: number;
  periodsCount: number;
  discountType: TransportDiscountType;
  discountValue: number;
  discountAmount: number;
  netAmountDue: number;
  totalPaid: number;
  remainingBalance: number;
  periods: TransportPeriod[];
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface TransportEnrollmentInput {
  studentId: string;
  studentName: string;
  matricule: string;
  photoUrl?: string;
  className: string;
  levelCode: string;
  parentSponsor?: string;
  parentPhone?: string;
  lineId: string;
  academicYearId: string;
  discountType: TransportDiscountType;
  discountValue: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Paiement Transport
// ─────────────────────────────────────────────────────────────────────────────

export interface TransportPaymentRecord {
  id: string;
  enrollmentId: string;
  receiptNumber: string;
  amount: number;
  periodNumber?: number;
  paymentDate: string;
  paymentMode: TransportPaymentMode;
  referenceNumber?: string;
  remarks?: string;
  recordedBy: string;
  status: 'VALIDATED' | 'CANCELLED' | 'PENDING_SYNC';
  createdAt: string;
  updatedAt: string;
}

export interface RecordTransportPaymentInput {
  enrollmentId: string;
  amount: number;
  periodNumber?: number;
  paymentDate: string;
  paymentMode: TransportPaymentMode;
  referenceNumber?: string;
  remarks?: string;
  recordedBy?: string;
}

export interface TransportReceiptData {
  receiptNumber: string;
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  academicYear: string;
  studentName: string;
  matricule: string;
  className: string;
  parentSponsorName: string;
  lineName: string;
  zone: string;
  paymentDate: string;
  amountPaid: number;
  paymentModeLabel: string;
  periodLabel?: string;
  netAmountDue: number;
  totalPaidAfter: number;
  remainingBalance: number;
  statusLabel: string;
  recordedBy: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// KPIs & Suivi
// ─────────────────────────────────────────────────────────────────────────────

export interface TransportKPIs {
  totalLines: number;
  activeLines: number;
  totalCapacity: number;
  totalEnrolled: number;
  availableSeats: number;
  overallOccupancyRate: number;
  paidStudents: number;
  partialStudents: number;
  unpaidStudents: number;
  totalCollected: number;
  totalRemaining: number;
  recoveryRate: number;
}

export interface TransportTrackingFilter {
  search?: string;
  lineId?: string | 'ALL';
  status?: 'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID';
  academicYearId?: string;
}
