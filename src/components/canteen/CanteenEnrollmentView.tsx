import React, { useState, useCallback } from 'react';
import { canteenEnrollmentService } from '../../services/canteen/canteenEnrollmentService';
import { canteenFeesService, normalizeCanteenLevelCode } from '../../services/canteen/canteenFeesService';
import {
  CanteenEnrollment, CanteenEnrollmentInput, CanteenDiscountType, CanteenLevelCode,
} from '../../services/canteen/types';
import { useToast } from '../../context/ToastContext';
import { useSchoolYear } from '../../context/SchoolYearContext';
import {
  Search, User, UtensilsCrossed, CheckCircle2, AlertCircle,
  Phone, DollarSign, Tag, RotateCcw, X, Eye, Edit2, Trash2,
} from 'lucide-react';
import { listStudents } from '../../services/students/studentsService';
import { CustomScheduleEditor, SchedulePeriodItem } from '../common/CustomScheduleEditor';
import { CanteenEnrollmentDetailModal } from './CanteenEnrollmentDetailModal';
import { CanteenEnrollmentEditModal } from './CanteenEnrollmentEditModal';
import { ConfirmDeleteEnrollmentModal } from '../common/ConfirmDeleteEnrollmentModal';

const LEVEL_ORDER: CanteenLevelCode[] = ['PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];

export interface CanteenStudentSearchItem {
  id: string;
  name: string;
  matricule: string;
  className: string;
  levelCode: CanteenLevelCode;
  parentSponsor?: string;
  parentPhone?: string;
}

export const CanteenEnrollmentView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const { showToast } = useToast();
  const academicYearId = schoolYear || '2026-2027';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CanteenStudentSearchItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<CanteenStudentSearchItem | null>(null);
  const [existingEnrollment, setExistingEnrollment] = useState<CanteenEnrollment | null>(null);
  const [schedule, setSchedule] = useState<{ annualRate: number; periodsCount: number; customPeriods?: SchedulePeriodItem[] } | null>(null);

  const [discountType, setDiscountType] = useState<CanteenDiscountType>('NONE');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [customPeriods, setCustomPeriods] = useState<SchedulePeriodItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<CanteenEnrollment | null>(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    try {
      const res = await listStudents({ searchQuery: query.trim(), pageSize: 20 });
      const students = res.data?.students || [];
      setSearchResults(students.map((s) => ({
        id: s.id,
        name: `${s.lastName} ${s.firstName}`,
        matricule: s.matricule || `MAT-${s.id.slice(0, 6)}`,
        className: s.className || s.grade || 'Classe',
        levelCode: normalizeCanteenLevelCode((s as any).level || s.grade || 'CP1'),
        parentSponsor: s.parentName,
        parentPhone: s.parentPhone,
      })));
    } catch {
      setSearchResults([]);
    }
  }, []);

  const handleSelectStudent = useCallback(async (student: CanteenStudentSearchItem) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearchQuery('');
    setExistingEnrollment(null);
    setSchedule(null);
    setDiscountType('NONE');
    setDiscountValue('');
    setCustomPeriods([]);
    setSuccess(null);

    // Vérifier inscription existante
    const existing = await canteenEnrollmentService.getEnrollmentByStudent(student.id, academicYearId);
    if (existing) {
      setExistingEnrollment(existing);
      return;
    }

    // Récupérer le tarif
    const sch = await canteenFeesService.getScheduleByLevel(academicYearId, student.levelCode);
    if (sch) {
      setSchedule({ annualRate: sch.annualRate, periodsCount: sch.periodsCount, customPeriods: sch.customPeriods });
      if (sch.customPeriods && sch.customPeriods.length > 0) {
        setCustomPeriods(
          sch.customPeriods.map((p, idx) => ({
            number: p.number || idx + 1,
            label: p.label || `Période ${idx + 1}`,
            dueDate: p.dueDate || '',
            amountDue: p.amountDue,
          }))
        );
      } else {
        const count = sch.periodsCount || 3;
        const base = Math.floor(sch.annualRate / count);
        const rem = sch.annualRate - base * count;
        setCustomPeriods(
          Array.from({ length: count }, (_, i) => ({
            number: i + 1,
            label: count === 3 ? (i === 0 ? '1er Trimestre' : i === 1 ? '2ème Trimestre' : '3ème Trimestre') : `Période ${i + 1}`,
            dueDate: '',
            amountDue: i === 0 ? base + rem : base,
          }))
        );
      }
    }
  }, [academicYearId]);

  const discountNum = parseFloat(discountValue) || 0;
  const annualRate = schedule?.annualRate || 0;
  const discountAmount = discountType === 'FIXED' ? discountNum
    : discountType === 'PERCENTAGE' ? Math.round((annualRate * discountNum) / 100) : 0;
  const netAmount = Math.max(0, annualRate - discountAmount);

  // Synchronisation des échéances de cantine
  React.useEffect(() => {
    if (schedule) {
      if (schedule.customPeriods && schedule.customPeriods.length > 0) {
        const schedTotal = schedule.annualRate || 1;
        const ratio = netAmount / schedTotal;
        setCustomPeriods(
          schedule.customPeriods.map((p, idx) => ({
            number: p.number || idx + 1,
            label: p.label || `Période ${idx + 1}`,
            dueDate: p.dueDate || '',
            amountDue: discountAmount > 0 ? Math.round(p.amountDue * ratio) : p.amountDue,
          }))
        );
      } else {
        const count = schedule.periodsCount || 3;
        const base = Math.floor(netAmount / count);
        const rem = netAmount - base * count;
        setCustomPeriods(
          Array.from({ length: count }, (_, i) => ({
            number: i + 1,
            label: count === 3 ? (i === 0 ? '1er Trimestre' : i === 1 ? '2ème Trimestre' : '3ème Trimestre') : `Période ${i + 1}`,
            dueDate: '',
            amountDue: i === 0 ? base + rem : base,
          }))
        );
      }
    }
  }, [discountType, discountValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !schedule) return;

    setSubmitting(true);
    try {
      const input: CanteenEnrollmentInput = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        matricule: selectedStudent.matricule,
        className: selectedStudent.className,
        levelCode: selectedStudent.levelCode,
        parentSponsor: selectedStudent.parentSponsor,
        parentPhone: selectedStudent.parentPhone,
        academicYearId,
        discountType,
        discountValue: discountNum,
        customPeriods: customPeriods.length > 0 ? customPeriods : undefined,
      };
      const result = await canteenEnrollmentService.createEnrollment(input);
      if (result.success && result.data) {
        setSuccess(result.data);
        showToast('Inscription cantine enregistrée avec succès.', 'success');
      } else {
        showToast(result.error || 'Erreur lors de l\'inscription.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setExistingEnrollment(null);
    setSchedule(null);
    setSuccess(null);
    setDiscountType('NONE');
    setDiscountValue('');
    setCustomPeriods([]);
  };

  const reloadEnrollment = async () => {
    if (selectedStudent) {
      const updated = await canteenEnrollmentService.getEnrollmentByStudent(selectedStudent.id, academicYearId);
      setExistingEnrollment(updated);
    }
  };

  const handleDeleteEnrollment = async () => {
    if (!existingEnrollment) return;
    setDeleting(true);
    try {
      const res = await canteenEnrollmentService.deleteEnrollment(existingEnrollment.id);
      if (res.success) {
        showToast('Inscription cantine supprimée avec succès.', 'success');
        setShowDeleteModal(false);
        setExistingEnrollment(null);
      } else {
        showToast(res.error || 'Erreur lors de la suppression.', 'error');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
          Inscription à la cantine
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
          Inscrivez un élève à la cantine. Le tarif est récupéré automatiquement selon le niveau.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Colonne gauche : Recherche + fiche élève */}
        <div>
          {/* Recherche */}
          <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div className="card-body p-4">
              <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={16} color="#0ea5e9" /> Rechercher un élève
              </h6>
              <div className="search-bar-wrapper">
                <Search size={16} className="search-bar-icon" />
                <input
                  type="text"
                  className="search-bar-input"
                  placeholder="Nom, prénom, matricule, classe..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searchQuery && (
                  <button className="search-bar-clear" onClick={() => handleSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {searchResults.length > 0 && (
                <div style={{ marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 12, background: '#ffffff', overflow: 'hidden', padding: '0 12px' }}>
                  <div className="gesco-dot-list">
                    {searchResults.map((s) => (
                      <div
                        key={s.id}
                        className="gesco-dot-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSelectStudent(s)}
                      >
                        <div className="gesco-dot-bullet" style={{ backgroundColor: '#2563eb' }} />
                        <div className="gesco-dot-content">
                          <div className="gesco-dot-title">{s.name}</div>
                          <div className="gesco-dot-subtitle">{s.matricule} — {s.className}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fiche élève */}
          {selectedStudent && (
            <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-4">
                <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={16} color="#0ea5e9" /> Fiche élève
                </h6>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.25rem', flexShrink: 0 }}>
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{selectedStudent.name}</p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>{selectedStudent.matricule}</p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>{selectedStudent.className} · {selectedStudent.levelCode}</p>
                  </div>
                </div>
                {selectedStudent.parentSponsor && (
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontSize: '0.8125rem', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={13} /> <strong>Responsable :</strong> {selectedStudent.parentSponsor}
                    </div>
                    {selectedStudent.parentPhone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Phone size={13} /> {selectedStudent.parentPhone}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite : Tarifs + formulaire */}
        <div>
          {/* Déjà inscrit */}
          {existingEnrollment && (
            <div className="card shadow-sm mb-4" style={{ borderRadius: 14, border: '1px solid #a7f3d0', background: '#f8fafc', overflow: 'hidden' }}>
              <div style={{ background: '#ecfdf5', padding: '16px 20px', borderBottom: '1px solid #d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UtensilsCrossed size={18} />
                  </div>
                  <div>
                    <h6 style={{ margin: 0, fontWeight: 800, color: '#064e3b', fontSize: '0.9375rem' }}>
                      Élève déjà inscrit à la cantine
                    </h6>
                    <div style={{ fontSize: '0.8125rem', color: '#059669' }}>
                      Niveau : <strong>{existingEnrollment.levelCode}</strong> ({existingEnrollment.className})
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: existingEnrollment.remainingBalance === 0 ? '#dcfce7' : existingEnrollment.totalPaid > 0 ? '#fef3c7' : '#fee2e2',
                    color: existingEnrollment.remainingBalance === 0 ? '#166534' : existingEnrollment.totalPaid > 0 ? '#92400e' : '#991b1b',
                    border: `1px solid ${existingEnrollment.remainingBalance === 0 ? '#86efac' : existingEnrollment.totalPaid > 0 ? '#fde68a' : '#fca5a5'}`,
                  }}
                >
                  {existingEnrollment.remainingBalance === 0 ? '🟢 À jour' : existingEnrollment.totalPaid > 0 ? '🟡 Partiel' : '🔴 Impayé'}
                </span>
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tarif annuel</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>{existingEnrollment.annualRate?.toLocaleString('fr-FR')} F</div>
                  </div>
                  {existingEnrollment.discountAmount > 0 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>Remise</div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#b91c1c' }}>– {existingEnrollment.discountAmount?.toLocaleString('fr-FR')} F</div>
                    </div>
                  )}
                  <div style={{ background: '#ffffff', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#047857' }}>Net à payer</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#064e3b' }}>{existingEnrollment.netAmountDue?.toLocaleString('fr-FR')} F</div>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>Déjà réglé</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#15803d' }}>{existingEnrollment.totalPaid?.toLocaleString('fr-FR')} F</div>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#ea580c' }}>Reste dû</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#c2410c' }}>{existingEnrollment.remainingBalance?.toLocaleString('fr-FR')} F</div>
                  </div>
                </div>

                {/* Barre d'action avec Voir, Modifier, Supprimer */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm fw-semibold"
                    style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setShowDetailModal(true)}
                  >
                    <Eye size={15} /> Voir les détails
                  </button>
                  <button
                    type="button"
                    className="btn btn-success btn-sm fw-semibold"
                    style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setShowEditModal(true)}
                  >
                    <Edit2 size={15} /> Modifier l'inscription
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm fw-semibold"
                    style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 size={15} /> Supprimer l'inscription
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm ms-auto"
                    style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={handleReset}
                  >
                    <RotateCcw size={13} /> Nouvel élève
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Succès */}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <CheckCircle2 size={20} color="#16a34a" />
                <strong style={{ color: '#166534' }}>Inscription enregistrée !</strong>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#14532d', display: 'grid', gap: 6 }}>
                <div><strong>Élève :</strong> {success.studentName}</div>
                <div><strong>Tarif net :</strong> {success.netAmountDue.toLocaleString('fr-FR')} FCFA</div>
                <div><strong>Périodes :</strong> {success.periodsCount} × {Math.round(success.netAmountDue / success.periodsCount).toLocaleString('fr-FR')} FCFA</div>
              </div>
              <button className="btn btn-sm btn-success mt-3 fw-semibold" onClick={handleReset}>
                <RotateCcw size={13} className="me-1" /> Inscrire un autre élève
              </button>
            </div>
          )}

          {/* Formulaire */}
          {selectedStudent && !existingEnrollment && !success && (
            <form onSubmit={handleSubmit}>
              {/* Tarifs */}
              {schedule ? (
                <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div className="card-body p-4">
                    <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UtensilsCrossed size={16} color="#0ea5e9" /> Tarif cantine — {selectedStudent.levelCode}
                    </h6>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: '#64748b' }}>Tarif annuel brut</span>
                        <strong>{annualRate.toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: '#64748b' }}>Nombre de périodes</span>
                        <strong>{schedule.periodsCount}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="alert alert-warning text-sm mb-4">
                  <AlertCircle size={15} className="me-2" />
                  Aucun tarif cantine configuré pour le niveau {selectedStudent.levelCode}.
                </div>
              )}

              {/* Remise */}
              {schedule && (
                <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div className="card-body p-4">
                    <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag size={16} color="#0ea5e9" /> Remise (optionnelle)
                    </h6>
                    <div className="mb-3">
                      <label className="form-label text-sm fw-semibold">Type de remise</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {(['NONE', 'FIXED', 'PERCENTAGE'] as CanteenDiscountType[]).map((t) => (
                          <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                            <input type="radio" name="discountType" value={t} checked={discountType === t} onChange={() => { setDiscountType(t); setDiscountValue(''); }} />
                            {t === 'NONE' ? 'Aucune' : t === 'FIXED' ? 'En FCFA' : 'En %'}
                          </label>
                        ))}
                      </div>
                    </div>
                    {discountType !== 'NONE' && (
                      <div className="mb-2">
                        <label className="form-label text-sm fw-semibold">
                          {discountType === 'FIXED' ? 'Montant remise (FCFA)' : 'Pourcentage remise (%)'}
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          min={0}
                          max={discountType === 'PERCENTAGE' ? 100 : undefined}
                          step={discountType === 'PERCENTAGE' ? 1 : 1000}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Échéancier personnalisable */}
              {schedule && (
                <div className="mb-4">
                  <CustomScheduleEditor
                    periods={customPeriods}
                    onChange={setCustomPeriods}
                    targetTotal={netAmount}
                    title="Échéancier de cantine de l'élève"
                    subtitle="Personnalisez le nombre d'échéances et leurs montants pour cet élève."
                    periodPrefix="Période"
                    quickCounts={[1, 2, 3, 4, 6, 9, 10]}
                    schoolYear={academicYearId}
                    accentColor="#0284c7"
                    compact
                  />
                </div>
              )}

              {/* Récapitulatif financier */}
              {schedule && (
                <div className="card mb-4" style={{ borderRadius: 12, border: '2px solid #0ea5e9', background: '#f0f9ff' }}>
                  <div className="card-body p-4">
                    <h6 style={{ fontWeight: 700, color: '#0369a1', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <DollarSign size={16} /> Récapitulatif
                    </h6>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>Tarif annuel brut</span>
                        <span>{annualRate.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      {discountAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#ef4444' }}>
                          <span>Remise</span>
                          <span>– {discountAmount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      )}
                      <div style={{ borderTop: '1px solid #bae6fd', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, color: '#0369a1' }}>
                        <span>Montant net à payer</span>
                        <span>{netAmount.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#475569' }}>
                        <span>Total échéances ({customPeriods.length})</span>
                        <span>{customPeriods.reduce((acc, p) => acc + (Number(p.amountDue) || 0), 0).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {schedule && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="btn btn-outline-secondary fw-semibold" style={{ borderRadius: 10 }} onClick={handleReset}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary fw-semibold flex-grow-1" style={{ borderRadius: 10 }} disabled={submitting}>
                    {submitting ? (
                      <><span className="spinner-border spinner-border-sm me-2" />Inscription en cours...</>
                    ) : (
                      <><CheckCircle2 size={16} className="me-2" />Confirmer l'inscription</>
                    )}
                  </button>
                </div>
              )}
            </form>
          )}

          {!selectedStudent && (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <UtensilsCrossed size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Recherchez un élève pour démarrer l'inscription.</p>
            </div>
          )}
        </div>
      </div>
      <CanteenEnrollmentDetailModal
        isOpen={showDetailModal}
        enrollment={existingEnrollment}
        onClose={() => setShowDetailModal(false)}
        onEdit={() => { setShowDetailModal(false); setShowEditModal(true); }}
        onDelete={() => { setShowDetailModal(false); setShowDeleteModal(true); }}
      />
      <CanteenEnrollmentEditModal
        isOpen={showEditModal}
        enrollment={existingEnrollment}
        onClose={() => setShowEditModal(false)}
        onSaved={reloadEnrollment}
      />
      <ConfirmDeleteEnrollmentModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteEnrollment}
        studentName={existingEnrollment?.studentName || ''}
        matricule={existingEnrollment?.matricule}
        serviceType="cantine"
        totalPaid={existingEnrollment?.totalPaid || 0}
        loading={deleting}
      />
    </div>
  );
};
