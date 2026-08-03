// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Types Modèles de Données Database
// ─────────────────────────────────────────────────────────────────────────────

import { ViewId, FeeStatus, StudentStatus, Gender, StaffRole, StaffStatus, ExpenseCategory, PaymentMethod, AttendanceStatus, PrescolaireAppreciation, ComplementaryAppreciation } from '../ui';

export interface SchoolSettings {
  id: string;
  schoolName: string;
  directorName: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
  currentSchoolYear: string;
  rolePermissions: Record<string, ViewId[]>;
}

export interface SchoolInfo {
  id?: string;
  name: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  city: string;
  country: string;
  currency: string;
  language: string;
}

export type SchoolYearStatus = 'Active' | 'Clôturée' | 'Archivée' | 'Préparation';

export interface SchoolYearItem {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
  isArchived?: boolean;
  status?: SchoolYearStatus;
}

export interface AcademicTerm {
  id: string;
  name: string;
  sequenceOrder: number;
  startDate: string;
  endDate: string;
  isClosed: boolean;
}

export interface GeneralConfig {
  numberingPrefixStudent: string;
  numberingPrefixStaff: string;
  timezone: string;
  dateFormat: string;
  enableEmailAlerts: boolean;
  enableSmsAlerts: boolean;
}

export interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  grade: string;
  className?: string;
  status: StudentStatus;
  feesStatus: FeeStatus;
  attendance: number;
  schoolYear?: string;
  age?: number;
  gender?: Gender;
  parentName?: string;
  parentPhone?: string;
  emergencyContact?: string;
  address?: string;
  medicalInfo?: string;
  joinDate?: string;
  photo?: string;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  email: string;
  phone: string;
  subject?: string;
  photo?: string;
  gender?: Gender;
  status: StaffStatus;
  joinDate: string;
  salary: number;
}

export interface Subject {
  id: string;
  name: string;
  coef: number;
  maxGrade?: number;
  teacher: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  teacherId: string;
  studentCount: number;
  capacity: number;
  subjects: Subject[];
}

export interface InstallmentDetails {
  amount: number;
  date: string;
  method: string;
}

export type InstallmentValue = number | InstallmentDetails;

export interface SchoolFeeRecord {
  id: string;
  studentId?: string;
  studentName: string;
  class: string;
  schoolYear?: string;
  registration: number;
  registrationMethod?: string;
  registrationDate?: string;
  installments: {
    v1: InstallmentValue;
    v2: InstallmentValue;
    v3: InstallmentValue;
    v4: InstallmentValue;
    v5: InstallmentValue;
    v6: InstallmentValue;
    v7: InstallmentValue;
    v8: InstallmentValue;
  };
  discount: number;
  totalTuition: number;
  totalPaid: number;
  initialTuition: number;
  initialRegistration: number;
  initialAmount: number;
  netDue: number;
  remainingGlobal: number;
}

export interface FeeConfiguration {
  id: string;
  grade: string;
  tuitionAmount: number;
  registrationAmount: number;
  installmentCount: number;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  schoolYear?: string;
  createdBy?: string;
}

export interface CanteenMenu {
  id: string;
  day: string;
  date?: string;
  main: string;
  vegetarian: string;
  dessert: string;
  schoolYear?: string;
}

export interface BusRoute {
  id: string;
  name: string;
  driver: string;
  phone: string;
  licensePlate: string;
  capacity: number;
  registered: number;
}

export interface TransportSubscription {
  id: string;
  studentId?: string;
  studentName: string;
  class: string;
  routeId: string;
  schoolYear?: string;
  periods: { p1: number; p2: number; p3: number };
  discountPercent: number;
  discountAmount: number;
  initialTotal: number;
  netTotal: number;
  paidP1: number;
  paidP2: number;
  paidP3: number;
  totalPaid: number;
  remaining: number;
  status: 'Soldé' | 'Partiel' | 'Impayé';
  zone?: string;
  isCanteenSubscribed?: boolean;
}

export interface ActivityRegistration {
  studentId: string;
  studentName: string;
  studentClass: string;
  amountPaid: number;
  date: string;
}

export interface Activity {
  id: string;
  name: string;
  day: string;
  time: string;
  instructor: string;
  spots: number;
  price: number;
  registrations: ActivityRegistration[];
}

export interface AcademicSubject {
  id: string;
  name: string;
  maxScore: number;
  isComplementary: boolean;
}

export interface SubjectGrade {
  subjectId: string;
  score: number | null;
  prescolaireAppreciation?: PrescolaireAppreciation;
  complementaryAppreciation?: ComplementaryAppreciation;
}

export interface StudentEvaluationEntry {
  studentId: string;
  studentName: string;
  attendance: AttendanceStatus;
  grades: SubjectGrade[];
  average?: number | null;
  rank?: number | null;
  appreciation?: string;
}

export interface EvaluationSession {
  id: string;
  classId: string;
  className: string;
  levelCategory: string;
  evaluationType: string;
  sessionNumber: number;
  label: string;
  schoolYear: string;
  date: string;
  subjects: AcademicSubject[];
  entries: StudentEvaluationEntry[];
  isLocked: boolean;
}
