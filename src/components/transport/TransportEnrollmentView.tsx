import React, { useState, useCallback } from 'react';
import { transportEnrollmentService } from '../../services/transport/transportEnrollmentService';
import { transportLineService } from '../../services/transport/transportLineService';
import {
  TransportEnrollmentInput, TransportDiscountType, TransportLine,
} from '../../services/transport/types';
import { useToast } from '../../context/ToastContext';
import { useSchoolYear } from '../../context/SchoolYearContext';
import {
  Search, User, Bus, CheckCircle2, AlertCircle, Phone,
  DollarSign, Tag, RotateCcw, MapPin, X, Eye, Edit2, Trash2,
} from 'lucide-react';
import { listStudents } from '../../services/students/studentsService';
import { CustomScheduleEditor, SchedulePeriodItem } from '../common/CustomScheduleEditor';
import { TransportEnrollmentDetailModal } from './TransportEnrollmentDetailModal';
import { TransportEnrollmentEditModal } from './TransportEnrollmentEditModal';
import { ConfirmDeleteEnrollmentModal } from '../common/ConfirmDeleteEnrollmentModal';

export interface StudentSearchItem {
  id: string;
  name: string;
  matricule: string;
  className: string;
  levelCode: any;
  parentSponsor?: string;
  parentPhone?: string;
}

export const TransportEnrollmentView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const { showToast } = useToast();
  const academicYearId = schoolYear || 'ay-2026';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentSearchItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchItem | null>(null);
  const [existingEnrollment, setExistingEnrollment] = useState<any>(null);
  const [lines, setLines] = useState<TransportLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string>('');

  const [discountType, setDiscountType] = useState<TransportDiscountType>('NONE');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [customPeriods, setCustomPeriods] = useState<SchedulePeriodItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<any>(null);

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
        levelCode: ((s as any).level || s.grade || 'CP1') as any,
        parentSponsor: s.parentName,
        parentPhone: s.parentPhone,
      })));
    } catch {
      setSearchResults([]);
    }
  }, []);

  const handleSelectStudent = useCallback(async (student: StudentSearchItem) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearchQuery('');
    setExistingEnrollment(null);
    setSelectedLineId('');
    setDiscountType('NONE');
    setDiscountValue('');
    setCustomPeriods([]);
    setSuccess(null);

    const existing = await transportEnrollmentService.getEnrollmentByStudent(student.id, academicYearId);
    if (existing) { setExistingEnrollment(existing); return; }

    const allLines = await transportLineService.getLinesByYear(academicYearId);
    const active = allLines.filter((l) => l.status === 'ACTIVE' && l.availableSeats > 0);
    setLines(active);
    if (active.length > 0) setSelectedLineId(active[0].id);
  }, [academicYearId]);

  const selectedLine = lines.find((l) => l.id === selectedLineId);
  const annualFee = selectedLine?.annualFee || 0;
  const discountNum = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'FIXED' ? discountNum
    : discountType === 'PERCENTAGE' ? Math.round((annualFee * discountNum) / 100) : 0;
  const netAmount = Math.max(0, annualFee - discountAmount);

  // Synchronisation des échéances de transport
  React.useEffect(() => {
    if (selectedLine) {
      if (selectedLine.customPeriods && selectedLine.customPeriods.length > 0) {
        const lineTotal = selectedLine.annualFee || 1;
        const ratio = netAmount / lineTotal;
        setCustomPeriods(
          selectedLine.customPeriods.map((p, idx) => ({
            number: p.number || idx + 1,
            label: p.label || `Période ${idx + 1}`,
            dueDate: p.dueDate || '',
            amountDue: discountAmount > 0 ? Math.round(p.amountDue * ratio) : p.amountDue,
          }))
        );
      } else {
        const count = selectedLine.periodsCount || 3;
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
    } else {
      setCustomPeriods([]);
    }
  }, [selectedLineId, discountType, discountValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedLine) return;
    setSubmitting(true);
    try {
      const input: TransportEnrollmentInput = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        matricule: selectedStudent.matricule,
        className: selectedStudent.className,
        levelCode: selectedStudent.levelCode,
        parentSponsor: selectedStudent.parentSponsor,
        parentPhone: selectedStudent.parentPhone,
        lineId: selectedLine.id,
        academicYearId,
        discountType,
        discountValue: discountNum,
        customPeriods: customPeriods.length > 0 ? customPeriods : undefined,
      };
      const result = await transportEnrollmentService.createEnrollment(input);
      if (result.success && result.data) {
        setSuccess(result.data);
        showToast('Inscription transport enregistrée avec succès.', 'success');
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
    setLines([]);
    setSelectedLineId('');
    setSuccess(null);
    setDiscountType('NONE');
    setDiscountValue('');
    setCustomPeriods([]);
  };

  const reloadEnrollment = async () => {
    if (selectedStudent) {
      const updated = await transportEnrollmentService.getEnrollmentByStudent(selectedStudent.id, academicYearId);
      setExistingEnrollment(updated);
    }
  };

  const handleDeleteEnrollment = async () => {
    if (!existingEnrollment) return;
    setDeleting(true);
    try {
      const res = await transportEnrollmentService.deleteEnrollment(existingEnrollment.id);
      if (res.success) {
        showToast('Inscription transport supprimée avec succès. La place a été libérée.', 'success');
        setShowDeleteModal(false);
        setExistingEnrollment(null);
        // recharger les lignes actives
        const allLines = await transportLineService.getLinesByYear(academicYearId);
        const active = allLines.filter((l) => l.status === 'ACTIVE' && l.availableSeats > 0);
        setLines(active);
        if (active.length > 0) setSelectedLineId(active[0].id);
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
          Inscription au transport
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
          Inscrivez un élève à une ligne de transport. La tarification est récupérée automatiquement.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Gauche : Recherche + fiche élève */}
        <div>
          <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div className="card-body p-4">
              <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={16} color="#2563eb" /> Rechercher un élève
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

          {selectedStudent && (
            <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-4">
                <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={16} color="#2563eb" /> Fiche élève
                </h6>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.25rem', flexShrink: 0 }}>
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{selectedStudent.name}</p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>{selectedStudent.matricule}</p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>{selectedStudent.className}</p>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontSize: '0.8125rem', color: '#475569' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><User size={13} /> <strong>Responsable :</strong> {selectedStudent.parentSponsor}</div>
                  {selectedStudent.parentPhone && <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}><Phone size={13} /> {selectedStudent.parentPhone}</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Droite : Formulaire */}
        <div>
          {existingEnrollment && (
            <div className="card shadow-sm mb-4" style={{ borderRadius: 14, border: '1px solid #bfdbfe', background: '#f8fafc', overflow: 'hidden' }}>
              <div style={{ background: '#eff6ff', padding: '16px 20px', borderBottom: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bus size={18} />
                  </div>
                  <div>
                    <h6 style={{ margin: 0, fontWeight: 800, color: '#1e3a8a', fontSize: '0.9375rem' }}>
                      Élève déjà inscrit au transport
                    </h6>
                    <div style={{ fontSize: '0.8125rem', color: '#3b82f6' }}>
                      Ligne : <strong>{existingEnrollment.lineName}</strong> ({existingEnrollment.zone})
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
                  {existingEnrollment.remainingBalance === 0 ? '🟢 Soldé' : existingEnrollment.totalPaid > 0 ? '🟡 Partiel' : '🔴 Impayé'}
                </span>
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tarif brut</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>{existingEnrollment.annualFee?.toLocaleString('fr-FR')} F</div>
                  </div>
                  {existingEnrollment.discountAmount > 0 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>Remise</div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#b91c1c' }}>– {existingEnrollment.discountAmount?.toLocaleString('fr-FR')} F</div>
                    </div>
                  )}
                  <div style={{ background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>Net à payer</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1d4ed8' }}>{existingEnrollment.netAmountDue?.toLocaleString('fr-FR')} F</div>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>Déjà réglé</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#15803d' }}>{existingEnrollment.totalPaid?.toLocaleString('fr-FR')} F</div>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#ea580c' }}>Reste à payer</div>
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
                    className="btn btn-primary btn-sm fw-semibold"
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

          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <CheckCircle2 size={20} color="#16a34a" />
                <strong style={{ color: '#166534' }}>Inscription enregistrée !</strong>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#14532d', display: 'grid', gap: 4 }}>
                <div><strong>Ligne :</strong> {success.lineName}</div>
                <div><strong>Montant net :</strong> {success.netAmountDue.toLocaleString('fr-FR')} FCFA</div>
                <div><strong>Périodes :</strong> {success.periodsCount} × {Math.round(success.netAmountDue / success.periodsCount).toLocaleString('fr-FR')} FCFA</div>
              </div>
              <button className="btn btn-sm btn-success mt-3 fw-semibold" onClick={handleReset}><RotateCcw size={13} className="me-1" /> Inscrire un autre élève</button>
            </div>
          )}

          {selectedStudent && !existingEnrollment && !success && (
            <form onSubmit={handleSubmit}>
              {/* Sélection de ligne */}
              <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div className="card-body p-4">
                  <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bus size={16} color="#2563eb" /> Sélectionner une ligne
                  </h6>
                  {lines.length === 0 ? (
                    <div className="alert alert-warning text-sm mb-0"><AlertCircle size={14} className="me-2" />Aucune ligne active avec des places disponibles.</div>
                  ) : (
                    <>
                      <select
                        className="form-select mb-3"
                        value={selectedLineId}
                        onChange={(e) => setSelectedLineId(e.target.value)}
                        required
                      >
                        {lines.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} — {l.zone} ({l.availableSeats} place{l.availableSeats > 1 ? 's' : ''} dispo)
                          </option>
                        ))}
                      </select>
                      {selectedLine && (
                        <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px', display: 'grid', gap: 6, fontSize: '0.8125rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1d4ed8' }}>
                            <MapPin size={13} /> {selectedLine.zone}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Chauffeur :</span><strong>{selectedLine.driverName}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Véhicule :</span><strong>{selectedLine.vehicleName} ({selectedLine.vehicleLicensePlate})</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Places disponibles :</span><strong style={{ color: selectedLine.availableSeats === 0 ? '#dc2626' : '#16a34a' }}>{selectedLine.availableSeats} / {selectedLine.vehicleCapacity}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#2563eb' }}>
                            <span>Tarif annuel :</span><span>{selectedLine.annualFee.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {selectedLine && (
                <>
                  {/* Remise */}
                  <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div className="card-body p-4">
                      <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag size={16} color="#2563eb" /> Remise (optionnelle)
                      </h6>
                      <div className="mb-3">
                        <div style={{ display: 'flex', gap: 10 }}>
                          {(['NONE', 'FIXED', 'PERCENTAGE'] as TransportDiscountType[]).map((t) => (
                            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                              <input type="radio" name="dt" value={t} checked={discountType === t} onChange={() => { setDiscountType(t); setDiscountValue(''); }} />
                              {t === 'NONE' ? 'Aucune' : t === 'FIXED' ? 'En FCFA' : 'En %'}
                            </label>
                          ))}
                        </div>
                      </div>
                      {discountType !== 'NONE' && (
                        <input
                          type="number" className="form-control"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          min={0} max={discountType === 'PERCENTAGE' ? 100 : undefined}
                          placeholder={discountType === 'PERCENTAGE' ? 'Ex : 10 (%)' : 'Ex : 25000'}
                        />
                      )}
                    </div>
                  </div>

                  {/* Échéancier personnalisable */}
                  <div className="mb-4">
                    <CustomScheduleEditor
                      periods={customPeriods}
                      onChange={setCustomPeriods}
                      targetTotal={netAmount}
                      title="Échéancier de transport de l'élève"
                      subtitle="Personnalisez le nombre d'échéances et leurs montants pour cet élève."
                      periodPrefix="Période"
                      quickCounts={[1, 2, 3, 4, 6, 9, 10]}
                      schoolYear={academicYearId}
                      accentColor="#2563eb"
                      compact
                    />
                  </div>

                  {/* Récapitulatif */}
                  <div className="card mb-4" style={{ borderRadius: 12, border: '2px solid #2563eb', background: '#eff6ff' }}>
                    <div className="card-body p-4">
                      <h6 style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <DollarSign size={16} /> Récapitulatif
                      </h6>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                          <span>Tarif annuel brut</span><span>{annualFee.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        {discountAmount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#ef4444' }}>
                            <span>Remise</span><span>– {discountAmount.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        )}
                        <div style={{ borderTop: '1px solid #bfdbfe', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, color: '#1d4ed8' }}>
                          <span>Montant net à payer</span><span>{netAmount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#475569' }}>
                          <span>Total échéances ({customPeriods.length})</span>
                          <span>{customPeriods.reduce((acc, p) => acc + (Number(p.amountDue) || 0), 0).toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button type="button" className="btn btn-outline-secondary fw-semibold" style={{ borderRadius: 10 }} onClick={handleReset}>Annuler</button>
                    <button type="submit" className="btn btn-primary fw-semibold flex-grow-1" style={{ borderRadius: 10 }} disabled={submitting}>
                      {submitting ? <><span className="spinner-border spinner-border-sm me-2" />...</> : <><CheckCircle2 size={16} className="me-2" />Confirmer l'inscription</>}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {!selectedStudent && (
            <div style={{ background: '#f8fafc', borderRadius: 16, padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              <Bus size={44} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Recherchez un élève pour démarrer l'inscription.</p>
            </div>
          )}
        </div>
      </div>
      <TransportEnrollmentDetailModal
        isOpen={showDetailModal}
        enrollment={existingEnrollment}
        onClose={() => setShowDetailModal(false)}
        onEdit={() => { setShowDetailModal(false); setShowEditModal(true); }}
        onDelete={() => { setShowDetailModal(false); setShowDeleteModal(true); }}
      />
      <TransportEnrollmentEditModal
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
        serviceType="transport"
        totalPaid={existingEnrollment?.totalPaid || 0}
        loading={deleting}
      />
    </div>
  );
};
