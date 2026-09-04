import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2, User, Users, CreditCard, BookOpen, FileText, AlertCircle, Printer } from 'lucide-react';
import { StudentInfoStep, StudentInfoData, AVATAR_BOY, AVATAR_GIRL } from './steps/StudentInfoStep';
import { ParentsInfoStep, ParentsStepData } from './steps/ParentsInfoStep';
import { FinancialConfigStep, FinancialConfigStepData } from './steps/FinancialConfigStep';
import { ClassAssignmentStep, ClassAssignmentStepData } from './steps/ClassAssignmentStep';
import { SummaryStep } from './steps/SummaryStep';
import { executeStudentRegistrationTransaction } from '../../services/students/studentEnrollmentTransactionService';
import { useSchoolYear } from '../../context/SchoolYearContext';
import { useToast } from '../../context/ToastContext';
import { useDraftAutosave } from '../../hooks/common/useDraftAutosave';
import { safePrintHtml } from '../../services/documents/safePrintService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolYear?: string;
}

const STEPS = [
  { id: 1, label: 'Élève', icon: User },
  { id: 2, label: 'Parents', icon: Users },
  { id: 3, label: 'Configuration financière', icon: CreditCard },
  { id: 4, label: 'Affectation', icon: BookOpen },
  { id: 5, label: 'Résumé', icon: CheckCircle2 },
];

export const StudentRegistrationWizard: React.FC<Props> = ({ isOpen, onClose, onSuccess, schoolYear: schoolYearProp }) => {
  const { schoolYear: contextSchoolYear } = useSchoolYear();
  const schoolYear = schoolYearProp || contextSchoolYear;
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
    registrationFee: 0,
    tuitionFee: 0,
    canteenFee: 0,
    transportFee: 0,
    otherFees: 0,
    discountType: 'FIXED',
    discountValue: 0,
    paidAmount: 0,
    paymentMode: 'CASH',
    paymentReference: '',
    remarks: '',
  });

  // État Step 4: Affectation
  const [assignmentData, setAssignmentData] = useState<ClassAssignmentStepData>({
    schoolYear: schoolYear || '2025-2026',
    levelId: 'lvl-cp1',
    classId: '',
    className: '',
    allowCapacityOverflow: false,
  });

  useEffect(() => {
    if (schoolYear) {
      setAssignmentData((prev) => ({ ...prev, schoolYear }));
    }
  }, [schoolYear]);

  const isDirty = Boolean(studentData.firstName || studentData.lastName || parentsData.father?.firstName);
  const { clearDraft } = useDraftAutosave('student_registration', {
    studentData,
    parentsData,
    paymentData,
    assignmentData,
  }, { isDirty, enabled: isOpen });

  if (!isOpen) return null;

  // Validation stricte et guidée par étape
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!studentData.lastName.trim()) {
        errs.lastName = 'Le nom de famille de l\'élève est obligatoire.';
      }
      if (!studentData.firstName.trim()) {
        errs.firstName = 'Le prénom de l\'élève est obligatoire.';
      }
      if (!studentData.gender) {
        errs.gender = 'Le genre de l\'élève est obligatoire.';
      }
    } else if (step === 2) {
      const payer = parentsData.financialPayer;
      if (payer === 'FATHER') {
        if (!parentsData.father.lastName.trim() && !parentsData.father.firstName.trim()) {
          errs.fatherName = 'Veuillez renseigner le nom ou prénom du père (responsable financier).';
        }
        if (!parentsData.father.phone.trim()) {
          errs.fatherPhone = 'Le numéro de téléphone du responsable financier est obligatoire.';
        }
      } else if (payer === 'MOTHER') {
        if (!parentsData.mother.lastName.trim() && !parentsData.mother.firstName.trim()) {
          errs.motherName = 'Veuillez renseigner le nom ou prénom de la mère (responsable financière).';
        }
        if (!parentsData.mother.phone.trim()) {
          errs.motherPhone = 'Le numéro de téléphone de la mère est obligatoire.';
        }
      } else if (payer === 'GUARDIAN') {
        if (!parentsData.guardian.lastName.trim() && !parentsData.guardian.firstName.trim()) {
          errs.guardianName = 'Veuillez renseigner le nom ou prénom du tuteur légal.';
        }
        if (!parentsData.guardian.phone.trim()) {
          errs.guardianPhone = 'Le numéro de téléphone du tuteur légal est obligatoire.';
        }
      }
    } else if (step === 3) {
      if (paymentData.registrationFee < 0) {
        errs.registrationFee = 'Les frais d\'inscription ne peuvent pas être négatifs.';
      }
      if (paymentData.tuitionFee < 0) {
        errs.tuitionFee = 'Les frais de scolarité ne peuvent pas être négatifs.';
      }
      if (paymentData.paidAmount < 0) {
        errs.paidAmount = 'Le montant versé ne peut pas être négatif.';
      }
      if (paymentData.discountType === 'PERCENTAGE' && (paymentData.discountValue < 0 || paymentData.discountValue > 100)) {
        errs.discountValue = 'Le pourcentage de remise doit être compris entre 0 et 100%.';
      }
    } else if (step === 4) {
      // Le choix de la classe est optionnel lors de l'inscription initiale.
      // Si aucune classe n'est choisie, l'élève sera enregistré avec le statut "Non affecté".
      if (!assignmentData.className && !assignmentData.classId) {
        setAssignmentData((prev) => ({
          ...prev,
          className: 'Non affecté',
        }));
      }
    }

    setErrors(errs);
    const hasErrors = Object.keys(errs).length > 0;
    if (hasErrors) {
      const firstError = Object.values(errs)[0];
      addNotification('error', firstError);
    }
    return !hasErrors;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => Math.min(5, prev + 1));
    }
  };

  const handlePrev = () => {
    setErrors({});
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
        clearDraft();
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
    if (receiptHtml) {
      safePrintHtml(receiptHtml, 'Reçu d\'inscription GESCO');
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
                <FinancialConfigStep
                  data={paymentData}
                  onChange={(u) => setPaymentData((p) => ({ ...p, ...u }))}
                  levelCode={assignmentData.levelId}
                  onLevelChange={(newLevelId) => setAssignmentData((p) => ({ ...p, levelId: newLevelId }))}
                  schoolYear={assignmentData.schoolYear}
                  errors={errors}
                />
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
