import React, { useState, useCallback } from 'react';
import { canteenEnrollmentService } from '../../services/canteen/canteenEnrollmentService';
import { canteenFeesService } from '../../services/canteen/canteenFeesService';
import {
  CanteenEnrollment, CanteenEnrollmentInput, CanteenDiscountType, CanteenLevelCode,
} from '../../services/canteen/types';
import { useToast } from '../../context/ToastContext';
import { useSchoolYear } from '../../context/SchoolYearContext';
import {
  Search, User, UtensilsCrossed, CheckCircle2, AlertCircle,
  Phone, DollarSign, Tag, RotateCcw, X,
} from 'lucide-react';

const LEVEL_ORDER: CanteenLevelCode[] = ['PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];

// Données de démonstration (simulées depuis la DB)
const DEMO_STUDENTS = [
  { id: 'st-004', name: 'KOFFI Amélie', matricule: 'MAT-2026-004', className: 'CE1 A', levelCode: 'CE1' as CanteenLevelCode, parentSponsor: 'KOFFI Edmond', parentPhone: '0700000004' },
  { id: 'st-005', name: 'BAMBA Seydou', matricule: 'MAT-2026-005', className: 'GS B', levelCode: 'GS' as CanteenLevelCode, parentSponsor: 'BAMBA Ibrahim', parentPhone: '0700000005' },
  { id: 'st-006', name: 'TRAORE Fatoumata', matricule: 'MAT-2026-006', className: 'CM1 A', levelCode: 'CM1' as CanteenLevelCode, parentSponsor: 'TRAORE Moussa', parentPhone: '0700000006' },
  { id: 'st-007', name: 'DIALLO Mamadou', matricule: 'MAT-2026-007', className: 'CP2 B', levelCode: 'CP2' as CanteenLevelCode, parentSponsor: 'DIALLO Ousmane', parentPhone: '0700000007' },
];

export const CanteenEnrollmentView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const { showToast } = useToast();
  const academicYearId = schoolYear || 'ay-2026';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof DEMO_STUDENTS>([]);
  const [selectedStudent, setSelectedStudent] = useState<typeof DEMO_STUDENTS[0] | null>(null);
  const [existingEnrollment, setExistingEnrollment] = useState<CanteenEnrollment | null>(null);
  const [schedule, setSchedule] = useState<{ annualRate: number; periodsCount: number } | null>(null);

  const [discountType, setDiscountType] = useState<CanteenDiscountType>('NONE');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<CanteenEnrollment | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    const q = query.toLowerCase();
    const results = DEMO_STUDENTS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.matricule.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
    );
    setSearchResults(results);
  }, []);

  const handleSelectStudent = useCallback(async (student: typeof DEMO_STUDENTS[0]) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearchQuery('');
    setExistingEnrollment(null);
    setSchedule(null);
    setDiscountType('NONE');
    setDiscountValue('');
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
      setSchedule({ annualRate: sch.annualRate, periodsCount: sch.periodsCount });
    }
  }, [academicYearId]);

  const discountNum = parseFloat(discountValue) || 0;
  const annualRate = schedule?.annualRate || 0;
  const discountAmount = discountType === 'FIXED' ? discountNum
    : discountType === 'PERCENTAGE' ? Math.round((annualRate * discountNum) / 100) : 0;
  const netAmount = Math.max(0, annualRate - discountAmount);
  const perPeriod = schedule?.periodsCount ? Math.round(netAmount / schedule.periodsCount) : 0;

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
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <AlertCircle size={20} color="#a16207" />
                <strong style={{ color: '#a16207' }}>Déjà inscrit à la cantine</strong>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#713f12', margin: '0 0 12px' }}>
                Cet élève est déjà inscrit à la cantine pour cette année scolaire.
              </p>
              <div style={{ fontSize: '0.875rem', display: 'grid', gap: 6 }}>
                <div><strong>Tarif net :</strong> {existingEnrollment.netAmountDue.toLocaleString('fr-FR')} FCFA</div>
                <div><strong>Payé :</strong> {existingEnrollment.totalPaid.toLocaleString('fr-FR')} FCFA</div>
                <div><strong>Restant :</strong> {existingEnrollment.remainingBalance.toLocaleString('fr-FR')} FCFA</div>
              </div>
              <button className="btn btn-sm btn-outline-secondary mt-3" onClick={handleReset}>
                <RotateCcw size={13} className="me-1" /> Nouveau élève
              </button>
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
                        <span>Montant à payer</span>
                        <span>{netAmount.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#475569' }}>
                        <span>Par période ({schedule.periodsCount})</span>
                        <span>≈ {perPeriod.toLocaleString('fr-FR')} FCFA</span>
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
    </div>
  );
};
