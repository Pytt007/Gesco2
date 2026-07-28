import React, { useState, useEffect, useMemo } from 'react';
import {
  StudentFinancialEnrollment,
  DiscountType,
  TuitionFeeSchedule,
  EnrollmentInstallmentItem,
  TuitionLevelCode,
} from '../../services/finance/types';
import { tuitionFeesService } from '../../services/finance/tuitionFeesService';
import { generateDefaultInstallments } from '../../services/finance/studentFinancialEnrollmentService';
import { X, User, ShieldCheck, DollarSign, Calendar, AlertCircle } from 'lucide-react';

interface StudentOption {
  id: string;
  name: string;
  matricule: string;
  classroomId: string;
  className: string;
  levelCode: TuitionLevelCode;
  photoUrl?: string;
}

const mockStudentsOptions: StudentOption[] = [
  { id: 'st-001', name: 'KOUASSI Jean-Philippe', matricule: 'MAT-2026-001', classroomId: 'cls-1', className: 'CP1 A', levelCode: 'CP1' },
  { id: 'st-002', name: 'DOUAMBA Marie', matricule: 'MAT-2026-002', classroomId: 'cls-1', className: 'CP1 A', levelCode: 'CP1' },
  { id: 'st-003', name: 'YAO Patrick', matricule: 'MAT-2026-003', classroomId: 'cls-3', className: 'CM2 A', levelCode: 'CM2' },
  { id: 'st-004', name: 'KOFFI Amélie', matricule: 'MAT-2026-004', classroomId: 'cls-4', className: 'CE2 B', levelCode: 'CE2' },
];

interface StudentFinancialEnrollmentModalProps {
  isOpen: boolean;
  academicYearId?: string;
  onClose: () => void;
  onSave: (data: {
    studentId: string;
    classroomId: string;
    levelCode: TuitionLevelCode;
    discountType: DiscountType;
    discountValue: number;
    customInstallments?: { number: number; amountDue: number }[];
  }) => Promise<boolean>;
  initialData?: StudentFinancialEnrollment | null;
}

export const StudentFinancialEnrollmentModal: React.FC<StudentFinancialEnrollmentModalProps> = ({
  isOpen,
  academicYearId = 'ay-2026',
  onClose,
  onSave,
  initialData,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('st-001');
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [tariffs, setTariffs] = useState<TuitionFeeSchedule | null>(null);
  const [loadingTariffs, setLoadingTariffs] = useState<boolean>(false);
  const [installments, setInstallments] = useState<EnrollmentInstallmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const selectedStudent = useMemo(() => {
    return mockStudentsOptions.find((s) => s.id === selectedStudentId) || mockStudentsOptions[0];
  }, [selectedStudentId]);

  useEffect(() => {
    if (initialData) {
      setSelectedStudentId(initialData.studentId);
      setDiscountType(initialData.discountType);
      setDiscountValue(initialData.discountValue.toString());
      setInstallments(initialData.installments);
    } else {
      setSelectedStudentId('st-001');
      setDiscountType('NONE');
      setDiscountValue('0');
    }
    setError(null);
  }, [initialData, isOpen]);

  // Chargement automatique des tarifs par rapport à l'année scolaire et le niveau
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingTariffs(true);

    tuitionFeesService
      .getSchedulesByYear(academicYearId)
      .then((list) => {
        if (!isMounted) return;
        const match = list.find((s) => s.levelCode === selectedStudent.levelCode);
        setTariffs(match || null);
      })
      .finally(() => {
        if (isMounted) setLoadingTariffs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, academicYearId, selectedStudent]);

  // Calculs financiers automatiques
  const { totalAnnualFee, discountAmount, netTotalDue } = useMemo(() => {
    const reg = tariffs ? tariffs.registrationFee : 60000;
    const tui = tariffs ? tariffs.tuitionFee : 300000;
    const total = reg + tui;

    const val = Number(discountValue) || 0;
    let disc = 0;
    if (discountType === 'FIXED') {
      disc = val;
    } else if (discountType === 'PERCENTAGE') {
      disc = Math.round((tui * val) / 100);
    }

    const net = Math.max(0, total - disc);
    return {
      totalAnnualFee: total,
      discountAmount: disc,
      netTotalDue: net,
    };
  }, [tariffs, discountType, discountValue]);

  // Mise à jour automatique des 8 échéances lors des changements de remises
  useEffect(() => {
    if (!initialData && tariffs) {
      const reg = tariffs.registrationFee;
      const defaultItems = generateDefaultInstallments(netTotalDue, reg);
      setInstallments(defaultItems);
    }
  }, [netTotalDue, tariffs, initialData]);

  if (!isOpen) return null;

  const handleInstallmentAmountChange = (idx: number, newAmountStr: string) => {
    const newAmt = Math.max(0, Number(newAmountStr) || 0);
    setInstallments((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], amountDue: newAmt };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = Number(discountValue);
    if (isNaN(val) || val < 0) {
      setError('La remise ne peut pas être négative.');
      return;
    }

    if (discountAmount > totalAnnualFee) {
      setError('Le montant de la remise ne peut pas dépasser le total annuel des tarifs.');
      return;
    }

    if (!tariffs) {
      setError(`Aucun tarif n’a été trouvé pour le niveau ${selectedStudent.levelCode}. Configurer les tarifs d'abord.`);
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onSave({
        studentId: selectedStudent.id,
        classroomId: selectedStudent.classroomId,
        levelCode: selectedStudent.levelCode,
        discountType,
        discountValue: val,
        customInstallments: installments.map((i) => ({ number: i.number, amountDue: i.amountDue })),
      });

      if (ok) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du dossier financier.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px',
      }}
    >
      <div
        className="card shadow-lg"
        style={{ width: '100%', maxWidth: '780px', borderRadius: '12px', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h5 style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', color: '#ffffff' }}>
            {initialData ? `Modifier l'inscription financière - ${initialData.studentName}` : 'Nouvelle Inscription Financière'}
          </h5>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div className="alert alert-danger p-2 mb-0 text-sm" style={{ borderRadius: '6px' }}>
              {error}
            </div>
          )}

          {/* Sélection de l'Élève & Fiche Signalétique */}
          <div className="card p-3" style={{ backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <label className="form-label text-sm fw-semibold mb-2">Sélectionner un Élève</label>
            <select
              className="form-select text-sm mb-3"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              disabled={!!initialData}
            >
              {mockStudentsOptions.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.matricule}) — Classe {st.className}
                </option>
              ))}
            </select>

            {/* Profil Élève complet */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem' }}>
                {selectedStudent.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <h6 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{selectedStudent.name}</h6>
                <span style={{ fontSize: '0.8125rem', color: '#64748b', display: 'block' }}>
                  Matricule : <strong>{selectedStudent.matricule}</strong> | Classe : <strong>{selectedStudent.className}</strong> ({selectedStudent.levelCode})
                </span>
              </div>
              <span className="badge bg-primary-subtle text-primary fw-bold" style={{ padding: '6px 12px', borderRadius: '6px' }}>
                Année Scolaire 2026-2027
              </span>
            </div>
          </div>

          {/* Récupération Automatique des Tarifs */}
          <div className="card p-3" style={{ backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
            <h6 style={{ margin: '0 0 10px 0', fontSize: '0.875rem', fontWeight: 700, color: '#1e40af' }}>
              Tarifs Récupérés Automatiquement par Niveau ({selectedStudent.levelCode})
            </h6>

            {loadingTariffs ? (
              <span className="text-xs text-muted">Chargement des tarifs en cours...</span>
            ) : (
              <div className="row g-2 text-center">
                <div className="col-4">
                  <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #93c5fd' }}>
                    <span style={{ fontSize: '0.75rem', color: '#475569', display: 'block' }}>Frais d'inscription</span>
                    <strong style={{ fontSize: '1rem', color: '#1e293b' }}>
                      {(tariffs ? tariffs.registrationFee : 60000).toLocaleString('fr-FR')} FCFA
                    </strong>
                  </div>
                </div>

                <div className="col-4">
                  <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #93c5fd' }}>
                    <span style={{ fontSize: '0.75rem', color: '#475569', display: 'block' }}>Frais de scolarité</span>
                    <strong style={{ fontSize: '1rem', color: '#1e293b' }}>
                      {(tariffs ? tariffs.tuitionFee : 300000).toLocaleString('fr-FR')} FCFA
                    </strong>
                  </div>
                </div>

                <div className="col-4">
                  <div style={{ backgroundColor: '#dbeafe', padding: '8px', borderRadius: '6px', border: '1px solid #60a5fa' }}>
                    <span style={{ fontSize: '0.75rem', color: '#1e40af', display: 'block', fontWeight: 600 }}>Total annuel brut</span>
                    <strong style={{ fontSize: '1.05rem', color: '#1d4ed8' }}>
                      {totalAnnualFee.toLocaleString('fr-FR')} FCFA
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section Remises */}
          <div className="card p-3" style={{ backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <label className="form-label text-sm fw-semibold mb-2">Remises Autorisées</label>
            <div className="row g-2 align-items-center mb-2">
              <div className="col-6">
                <select
                  className="form-select text-sm"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                >
                  <option value="NONE">Aucune remise</option>
                  <option value="FIXED">Remise en FCFA (Montant fixe)</option>
                  <option value="PERCENTAGE">Remise en Pourcentage (%)</option>
                </select>
              </div>

              {discountType !== 'NONE' && (
                <div className="col-6">
                  <input
                    type="number"
                    min="0"
                    className="form-input text-sm"
                    placeholder={discountType === 'PERCENTAGE' ? 'Ex: 10 (%)' : 'Ex: 20000 (FCFA)'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Recalcul automatique du Total Net */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', padding: '10px 14px', borderRadius: '6px', border: '1px solid #bbf7d0', marginTop: '6px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534' }}>
                Montant Total Net à Payer (après remise) :
              </span>
              <strong style={{ fontSize: '1.25rem', color: '#15803d' }}>
                {netTotalDue.toLocaleString('fr-FR')} FCFA
              </strong>
            </div>
          </div>

          {/* Tableau Répartition des 8 Échéances */}
          <div>
            <h6 style={{ margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
              Répartition Automatique des 8 Échéances de Règlement
            </h6>
            <div className="table-responsive" style={{ maxHeight: '180px', overflowY: 'auto' }}>
              <table className="table table-sm table-bordered align-middle mb-0" style={{ fontSize: '0.8125rem' }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '100px' }}>N°</th>
                    <th>Échéance</th>
                    <th>Date d'échéance</th>
                    <th style={{ textAlign: 'right', width: '160px' }}>Montant dû (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((item, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold text-center">N° {item.number}</td>
                      <td className="fw-semibold">{item.label}</td>
                      <td className="text-muted">{item.dueDate || 'Selon calendrier'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          min="0"
                          className="form-input text-xs text-end"
                          style={{ padding: '2px 6px', height: '26px' }}
                          value={item.amountDue}
                          onChange={(e) => handleInstallmentAmountChange(idx, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary text-sm" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary text-sm" disabled={submitting}>
              {submitting ? 'Création en cours...' : 'Créer le dossier financier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
