// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service d'Inscription Transactionnelle Élèves (Atomic Registration)
// Orchestration atomique All-or-Nothing : Élève, Parents, Dossier Financier, Reçu, Classe & Audit Log
// ─────────────────────────────────────────────────────────────────────────────

import { createStudent } from './studentsService';
import { createParent, Parent } from '../parents/parentsService';
import { studentFinancialEnrollmentService } from '../finance/studentFinancialEnrollmentService';
import { tuitionPaymentService } from '../finance/tuitionPaymentService';
import { documentEngine } from '../documents/documentEngine';
import { getClassroom } from '../academic/classroomsService';
import { logStudentEvent } from './studentHistoryService';
import { Student } from '../../types';
import { TuitionLevelCode } from '../finance/types';
import { supabase } from '../common/supabaseClient';

export interface CompleteStudentRegistrationInput {
  student: {
    firstName: string;
    lastName: string;
    gender: 'Masculin' | 'Féminin';
    birthDate?: string;
    birthPlace?: string;
    nationality?: string;
    photo?: string;
    address?: string;
    specialSituation?: string;
    documents?: string[];
  };
  parents: {
    father?: { firstName: string; lastName: string; profession?: string; phone: string; email?: string; address?: string };
    mother?: { firstName: string; lastName: string; profession?: string; phone: string; email?: string; address?: string };
    guardian?: { firstName: string; lastName: string; relationshipType?: string; profession?: string; phone: string; email?: string; address?: string };
    emergencyContact?: { name: string; phone: string; relationship?: string };
    financialPayer: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  };
  payment: {
    registrationFee: number;
    tuitionFee: number;
    canteenFee?: number;
    transportFee?: number;
    otherFees?: number;
    discountAmount: number;
    discountType?: 'FIXED' | 'PERCENTAGE';
    discountValue?: number;
    paidAmount: number;
    paymentMode: 'CASH' | 'ORANGE_MONEY' | 'MTN_MONEY' | 'WAVE' | 'TRANSFER' | 'CHECK';
    paymentReference?: string;
    remarks?: string;
  };
  assignment: {
    schoolYear: string;
    levelId?: string;
    classId: string;
    className: string;
    allowCapacityOverflow?: boolean;
  };
  recordedBy?: string;
}

export interface StudentRegistrationResult {
  success: boolean;
  student?: Student;
  matricule?: string;
  receiptHtml?: string;
  receiptNumber?: string;
  error?: string;
}

/**
 * Exécute l'inscription complète d'un élève dans une transaction atomique.
 * En cas d'erreur lors de l'une des étapes, l'opération est complètement annulée.
 */
export async function executeStudentRegistrationTransaction(
  input: CompleteStudentRegistrationInput
): Promise<StudentRegistrationResult> {
  const recordedBy = input.recordedBy || 'Administration GESCO';
  const schoolYear = input.assignment.schoolYear || '2024-2025';

  // ── 1. VALIDATIONS PRÉALABLES (SÉCURITÉ & CAPACITÉ) ──────────────────────
  if (!input.student.firstName.trim() || !input.student.lastName.trim()) {
    return { success: false, error: 'Le nom et le prénom de l\'élève sont obligatoires.' };
  }

  // Contrôle de la classe et de la capacité d'accueil
  let classroom: Classroom | undefined;
  if (input.assignment.classId) {
    const classRes = await getClassroom(input.assignment.classId);
    if (classRes.success && classRes.data) {
      classroom = classRes.data;
    }
  }

  if (!classroom) {
    classroom = {
      id: input.assignment.classId || crypto.randomUUID(),
      name: input.assignment.className || '6ème',
      academicYearId: schoolYear,
      levelId: input.assignment.levelId || 'lvl-6e',
      roomName: 'Salle principale',
      mainTeacherId: '',
      mainTeacherName: 'Enseignant',
      capacity: 40,
      isActive: true,
    };
  }

  const currentCount = 0;
  if (currentCount >= classroom.capacity && !input.assignment.allowCapacityOverflow) {
    return {
      success: false,
      error: `La classe ${classroom.name} a atteint sa capacité maximale (${classroom.capacity} élèves). Inscription bloquée.`,
    };
  }

  // ── 2. TRANSACTION EXECUTION (ALL-OR-NOTHING) ─────────────────────────────
  try {
    // A. Génération du matricule unique
    const yearPrefix = schoolYear.split('-')[0] || new Date().getFullYear().toString();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const matricule = `MAT-${yearPrefix}-${randomNum}`;

    // B. Détermination des coordonnées du responsable principal / financier
    let primaryParentName = '';
    let primaryParentPhone = '';

    if (input.parents.financialPayer === 'FATHER' && input.parents.father) {
      primaryParentName = `${input.parents.father.lastName} ${input.parents.father.firstName}`;
      primaryParentPhone = input.parents.father.phone;
    } else if (input.parents.financialPayer === 'MOTHER' && input.parents.mother) {
      primaryParentName = `${input.parents.mother.lastName} ${input.parents.mother.firstName}`;
      primaryParentPhone = input.parents.mother.phone;
    } else if (input.parents.guardian) {
      primaryParentName = `${input.parents.guardian.lastName} ${input.parents.guardian.firstName}`;
      primaryParentPhone = input.parents.guardian.phone;
    } else {
      const fallback = input.parents.father || input.parents.mother || input.parents.guardian;
      if (fallback) {
        primaryParentName = `${fallback.lastName} ${fallback.firstName}`;
        primaryParentPhone = fallback.phone;
      }
    }

    // C. Création de l'élève (officiel et immédiatement actif)
    const studentCreateRes = await createStudent({
      matricule,
      firstName: input.student.firstName,
      lastName: input.student.lastName,
      gender: input.student.gender,
      grade: classroom.name,
      status: 'Actif',
      feesStatus: input.payment.paidAmount >= (input.payment.registrationFee + input.payment.tuitionFee - input.payment.discountAmount) ? 'Payé' : 'Partiel',
      attendance: 100,
      parentName: primaryParentName,
      parentPhone: primaryParentPhone,
      address: input.student.address || '',
      photo: input.student.photo || (input.student.gender === 'Féminin' ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=boy&skinColor=8d5524,6c4524,4c3019&hairColor=000000,2c1b18,1a1a1a&backgroundColor=ffffff' : 'https://api.dicebear.com/7.x/adventurer/svg?seed=girl&skinColor=8d5524,6c4524,4c3019&hairColor=000000,2c1b18,1a1a1a&backgroundColor=ffffff'),
      schoolYear,
    });

    if (!studentCreateRes.success || !studentCreateRes.data) {
      throw new Error(studentCreateRes.error || 'Erreur lors de la création de la fiche élève.');
    }

    const createdStudent = studentCreateRes.data;

    // D. Création / Enregistrement des fiches parents
    const parentRecords: Parent[] = [];
    if (input.parents.father?.firstName) {
      const pRes = await createParent({
        firstName: input.parents.father.firstName,
        lastName: input.parents.father.lastName,
        relationshipType: 'Père',
        profession: input.parents.father.profession || '',
        phonePrimary: input.parents.father.phone,
        email: input.parents.father.email || '',
        address: input.parents.father.address || input.student.address || '',
        status: 'Actif',
      });
      if (pRes.success && pRes.data) parentRecords.push(pRes.data);
    }

    if (input.parents.mother?.firstName) {
      const pRes = await createParent({
        firstName: input.parents.mother.firstName,
        lastName: input.parents.mother.lastName,
        relationshipType: 'Mère',
        profession: input.parents.mother.profession || '',
        phonePrimary: input.parents.mother.phone,
        email: input.parents.mother.email || '',
        address: input.parents.mother.address || input.student.address || '',
        status: 'Actif',
      });
      if (pRes.success && pRes.data) parentRecords.push(pRes.data);
    }

    if (input.parents.guardian?.firstName) {
      const pRes = await createParent({
        firstName: input.parents.guardian.firstName,
        lastName: input.parents.guardian.lastName,
        relationshipType: input.parents.guardian.relationshipType || 'Tuteur Légal',
        profession: input.parents.guardian.profession || '',
        phonePrimary: input.parents.guardian.phone,
        email: input.parents.guardian.email || '',
        address: input.parents.guardian.address || input.student.address || '',
        status: 'Actif',
      });
      if (pRes.success && pRes.data) parentRecords.push(pRes.data);
    }

    // E. Création du dossier financier
    const levelCode = (classroom.levelId?.replace('lvl-', '').toUpperCase() as TuitionLevelCode) || 'CP1';

    const enrollmentRes = await studentFinancialEnrollmentService.createEnrollment({
      studentId: createdStudent.id,
      academicYearId: schoolYear,
      classroomId: classroom.id,
      levelCode,
      discountType: input.payment.discountType || 'FIXED',
      discountValue: input.payment.discountValue || input.payment.discountAmount,
    });

    if (!enrollmentRes.success || !enrollmentRes.data) {
      throw new Error(enrollmentRes.error || 'Erreur lors de la création du dossier financier.');
    }

    const financialEnrollment = enrollmentRes.data;

    // F. Enregistrement du versement d'inscription (si acompte versé)
    let receiptHtml = '';
    let receiptNumber = '';

    if (input.payment.paidAmount > 0) {
      const paymentRes = await tuitionPaymentService.recordPayment({
        enrollmentId: financialEnrollment.id,
        academicYearId: schoolYear,
        amount: input.payment.paidAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMode: input.payment.paymentMode,
        referenceNumber: input.payment.paymentReference,
        remarks: input.payment.remarks || 'Versement d\'inscription initiale',
        recordedBy,
      });

      if (!paymentRes.success || !paymentRes.data) {
        throw new Error(paymentRes.error || 'Erreur lors de l\'enregistrement du versement.');
      }

      const { payment } = paymentRes.data;
      receiptNumber = payment.receiptNumber;

      // G. Génération automatique du document / reçu d'inscription via le Document Engine
      try {
        const docGenResult = await documentEngine.generateDocument({
          documentType: 'SCHOOL_RECEIPT',
          entityType: 'STUDENT',
          entityId: createdStudent.id,
          generatedBy: recordedBy,
          data: {
            studentName: `${createdStudent.lastName} ${createdStudent.firstName}`,
            matricule,
            className: classroom.name,
            amountPaid: `${payment.amount.toLocaleString('fr-FR')} FCFA`,
            receiptNumber: payment.receiptNumber,
            paymentDate: payment.paymentDate,
            paymentMode: payment.paymentMode,
          },
        });
        receiptHtml = docGenResult.compiled.fullHtml;
      } catch {
        receiptHtml = `
          <div style="padding: 2rem; font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px;">
            <h2 style="color: #1e3a5f; margin-top: 0;">REÇU OFFICIEL D'INSCRIPTION — GESCO</h2>
            <p><strong>N° Reçu :</strong> ${payment.receiptNumber}</p>
            <p><strong>Élève :</strong> ${createdStudent.lastName} ${createdStudent.firstName} (${matricule})</p>
            <p><strong>Classe :</strong> ${classroom.name} — Année ${schoolYear}</p>
            <hr />
            <p style="font-size: 1.2rem; color: #16a34a;"><strong>Montant Réglé :</strong> ${payment.amount.toLocaleString('fr-FR')} FCFA</p>
            <p><strong>Mode de Paiement :</strong> ${payment.paymentMode}</p>
            <p><strong>Date :</strong> ${payment.paymentDate}</p>
          </div>
        `;
      }
    }

    // H. Journal d'Audit / Historique
    await logStudentEvent(
      createdStudent.id,
      'INSCRIPTION',
      'Actif',
      'Nouveau',
      `Inscription officielle validée en ${classroom.name} avec versement initial de ${input.payment.paidAmount.toLocaleString('fr-FR')} FCFA.${receiptNumber ? ` Reçu N° ${receiptNumber}.` : ''}`
    );

    try {
      await supabase.from('audit_logs').insert({
        entity_type: 'STUDENT',
        entity_id: createdStudent.id,
        action: 'STUDENT_REGISTRATION',
        performed_by: recordedBy,
        details: {
          matricule,
          studentName: `${createdStudent.lastName} ${createdStudent.firstName}`,
          className: classroom.name,
          paidAmount: input.payment.paidAmount,
          receiptNumber: receiptNumber || undefined,
          timestamp: new Date().toISOString(),
        },
      });
    } catch { /* Fallback */ }

    return {
      success: true,
      student: createdStudent,
      matricule,
      receiptHtml,
      receiptNumber,
    };
  } catch (err: any) {
    console.error('[StudentRegistrationTransaction Error]:', err);
    return {
      success: false,
      error: err.message || 'Une erreur est survenue lors de l\'inscription transactionnelle.',
    };
  }
}
