import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2, User, Users, CreditCard, BookOpen, FileText, AlertCircle, Printer } from 'lucide-react';
import { StudentInfoStep, StudentInfoData, AVATAR_BOY, AVATAR_GIRL } from './steps/StudentInfoStep';
import { ParentsInfoStep, ParentsStepData } from './steps/ParentsInfoStep';
import { FinancialConfigStep, FinancialConfigStepData } from './steps/FinancialConfigStep';
import { ClassAssignmentStep, ClassAssignmentStepData } from './steps/ClassAssignmentStep';
import { SummaryStep } from './steps/SummaryStep';
import { executeStudentRegistrationTransaction } from '../../services/students/studentEnrollmentTransactionService';
import { useSchoolYear } from '../../context/SchoolYearContext';
import { useToast } from '../../context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, label: 'Élève', icon: User },
  { id: 2, label: 'Parents', icon: Users },
  { id: 3, label: 'Configuration financière', icon: CreditCard },
  { id: 4, label: 'Affectation', icon: BookOpen },
  { id: 5, label: 'Résumé', icon: CheckCircle2 },
];

export const StudentRegistrationWizard: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { schoolYear } = useSchoolYear();
  const { addNotification } = useToast();

  const [activeStep, setActiveStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [receiptHtml, setReceiptHtml] = useState<string | null>(null);

  // État Step 1: Élève
  const [studentData, setStudentData] = useState<StudentInfoData>({
    firstName: '',
    lastName: '',
    gender: 'Masculin',
    birthDate: '',
    birthPlace: '',
    nationality: 'Ivoirienne',
    photo: AVATAR_BOY,
    address: '',
    specialSituation: '',
    documents: [],
  });

  // État Step 2: Parents
  const [parentsData, setParentsData] = useState<ParentsStepData>({
    father: { firstName: '', lastName: '', profession: '', phone: '', email: '', address: '' },
    mother: { firstName: '', lastName: '', profession: '', phone: '', email: '', address: '' },
    guardian: { firstName: '', lastName: '', profession: '', phone: '', email: '', address: '', relationshipType: 'Tuteur Légal' },
    emergencyContact: { name: '', phone: '', relationship: '' },
    financialPayer: 'FATHER',
  });

  // État Step 3: Configuration Financière
  const [paymentData, setPaymentData] = useState<FinancialConfigStepData>({
    registrationFee: 60000,
    tuitionFee: 300000,
    canteenFee: 0,
    transportFee: 0,
    otherFees: 0,
    discountType: 'FIXED',
    discountValue: 0,
    paidAmount: 85000,
    paymentMode: 'CASH',
    paymentReference: '',
    remarks: '',
  });

  // État Step 4: Affectation
  const [assignmentData, setAssignmentData] = useState<ClassAssignmentStepData>({
    schoolYear: schoolYear || '2024-2025',
    levelId: 'lvl-cp1',
    classId: '',
    className: '',
    allowCapacityOverflow: false,
  });

  if (!isOpen) return null;

  // Validation par étape
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!studentData.lastName.trim()) errs.lastName = 'Le nom de famille est obligatoire.';
      if (!studentData.firstName.trim()) errs.firstName = 'Le prénom est obligatoire.';
      if (!studentData.birthDate) errs.birthDate = 'La date de naissance est obligatoire.';
      if (!studentData.birthPlace.trim()) errs.birthPlace = 'Le lieu de naissance est obligatoire.';
      if (!studentData.address.trim()) errs.address = 'L\'adresse de résidence est obligatoire.';
    }

    if (step === 2) {
      const payer = parentsData.financialPayer;
      if (payer === 'FATHER' && !parentsData.father.phone.trim()) {
        errs.fatherPhone = 'Le numéro du père (payeur principal) est obligatoire.';
      }
      if (payer === 'MOTHER' && !parentsData.mother.phone.trim()) {
        errs.motherPhone = 'Le numéro de la mère (payeuse principale) est obligatoire.';
      }
      if (payer === 'GUARDIAN' && !parentsData.guardian.phone.trim()) {
        errs.guardianPhone = 'Le numéro du tuteur (payeur principal) est obligatoire.';
      }
    }

    if (step === 3) {
      if (paymentData.paidAmount <= 0) {
        errs.paidAmount = 'Un versement valide est obligatoire pour autoriser l\'inscription.';
      }
    }

    if (step === 4) {
      if (!assignmentData.classId) {
        errs.classId = 'Veuillez sélectionner une classe d\'affectation.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => Math.min(5, prev + 1));
    }
  };

  const handlePrev = () => {
    setActiveStep((prev) => Math.max(1, prev - 1));
  };

  // Soumission atomique finale (All-or-Nothing)
  const handleFinalSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      addNotification('error', 'Certaines étapes contiennent des erreurs non résolues.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await executeStudentRegistrationTransaction({
        student: studentData,
        parents: parentsData,
        payment: paymentData,
        assignment: assignmentData,
        recordedBy: 'Secrétariat GESCO',
      });

      if (!res.success) {
        addNotification('error', res.error || 'Erreur lors de la validation transactionnelle.');
      } else {
        addNotification('success', `Élève inscrit avec succès ! Matricule attribué : ${res.matricule}`);
        if (res.receiptHtml) {
          setReceiptHtml(res.receiptHtml);
        } else {
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      addNotification('error', err?.message || 'Échec critique de la transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Imprimer / Fermer Reçu
  const handlePrintReceipt = () => {
    if (!receiptHtml) return;
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(receiptHtml);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 250);
    }
    onSuccess();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      
      <div
        className="card shadow-2xl animate-fade-in-up"
        style={{
          width: '100%', maxWidth: 880, maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          background: '#ffffff', borderRadius: 20, border: '1px solid #cbd5e1', overflow: 'hidden',
        }}
      >
        
        {/* EN-TÊTE MODALE & STEPPER */}
        <div style={{ background: '#0f172a', color: '#ffffff', padding: '18px 24px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Assistant d'Inscription Officielle Élève
              </h3>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                Parcours sécurisé et transactionnel à 4 étapes obligatoires + Résumé
              </span>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* STEPPER PROGRES */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`, gap: 8 }}>
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              const isPassed = activeStep > step.id;

              return (
                <div
                  key={step.id}
                  onClick={() => isPassed && setActiveStep(step.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    borderRadius: 10, background: isActive ? '#2563eb' : isPassed ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: isActive ? '#ffffff' : isPassed ? '#93c5fd' : '#64748b',
                    cursor: isPassed ? 'pointer' : 'default', transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: isActive ? '#ffffff' : 'transparent', color: isActive ? '#2563eb' : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                    {isPassed ? '✓' : step.id}
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CORPS DE L'ÉTAPE (SCROLLABLE) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {receiptHtml ? (
            <div className="text-center p-4">
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={36} />
              </div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                Inscription Atomique Validée avec Succès !
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 24 }}>
                Le reçu officiel de paiement a été généré via le Document Engine.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={handlePrintReceipt} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, fontWeight: 700 }}>
                  <Printer size={16} /> Imprimer le Reçu Officiel
                </button>
                <button className="btn btn-outline-secondary" onClick={() => { onSuccess(); onClose(); }} style={{ padding: '10px 20px', borderRadius: 10, fontWeight: 700 }}>
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeStep === 1 && (
                <StudentInfoStep data={studentData} onChange={(u) => setStudentData((p) => ({ ...p, ...u }))} errors={errors} />
              )}
              {activeStep === 2 && (
                <ParentsInfoStep data={parentsData} onChange={(u) => setParentsData((p) => ({ ...p, ...u }))} errors={errors} />
              )}
              {activeStep === 3 && (
                <FinancialConfigStep data={paymentData} onChange={(u) => setPaymentData((p) => ({ ...p, ...u }))} levelCode={assignmentData.levelId} schoolYear={assignmentData.schoolYear} errors={errors} />
              )}
              {activeStep === 4 && (
                <ClassAssignmentStep data={assignmentData} onChange={(u) => setAssignmentData((p) => ({ ...p, ...u }))} errors={errors} />
              )}
              {activeStep === 5 && (
                <SummaryStep
                  student={studentData}
                  parents={parentsData}
                  payment={paymentData}
                  assignment={assignmentData}
                  isSubmitting={isSubmitting}
                  onValidate={handleFinalSubmit}
                />
              )}
            </>
          )}
        </div>

        {/* PIED DE MODALE & NAVIGATION */}
        {!receiptHtml && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={activeStep === 1 ? onClose : handlePrev}
              disabled={isSubmitting}
              style={{ fontWeight: 600 }}
            >
              {activeStep === 1 ? 'Annuler' : '← Précédent'}
            </button>

            {activeStep < 5 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                style={{ borderRadius: 10, padding: '8px 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                Suivant →
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
