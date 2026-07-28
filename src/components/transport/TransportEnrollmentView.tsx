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
  DollarSign, Tag, RotateCcw, MapPin,
} from 'lucide-react';

const DEMO_STUDENTS = [
  { id: 'st-010', name: 'OUÉDRAOGO Fatimata', matricule: 'MAT-2026-010', className: 'CE1 A', levelCode: 'CE1', parentSponsor: 'OUÉDRAOGO Salif', parentPhone: '0700000010' },
  { id: 'st-011', name: 'KONÉ Ibrahim', matricule: 'MAT-2026-011', className: 'CM2 B', levelCode: 'CM2', parentSponsor: 'KONÉ Moussa', parentPhone: '0700000011' },
  { id: 'st-012', name: 'COULIBALY Amina', matricule: 'MAT-2026-012', className: 'CP2 A', levelCode: 'CP2', parentSponsor: 'COULIBALY Adama', parentPhone: '0700000012' },
  { id: 'st-013', name: 'DIARRA Seydou', matricule: 'MAT-2026-013', className: 'GS B', levelCode: 'GS', parentSponsor: 'DIARRA Boubacar', parentPhone: '0700000013' },
];

export const TransportEnrollmentView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const { showToast } = useToast();
  const academicYearId = schoolYear?.id || 'ay-2026';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof DEMO_STUDENTS>([]);
  const [selectedStudent, setSelectedStudent] = useState<typeof DEMO_STUDENTS[0] | null>(null);
  const [existingEnrollment, setExistingEnrollment] = useState<any>(null);
  const [lines, setLines] = useState<TransportLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string>('');

  const [discountType, setDiscountType] = useState<TransportDiscountType>('NONE');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    const q = query.toLowerCase();
    setSearchResults(DEMO_STUDENTS.filter((s) =>
      s.name.toLowerCase().includes(q) || s.matricule.toLowerCase().includes(q) || s.className.toLowerCase().includes(q)
    ));
  }, []);

  const handleSelectStudent = useCallback(async (student: typeof DEMO_STUDENTS[0]) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearchQuery('');
    setExistingEnrollment(null);
    setSelectedLineId('');
    setDiscountType('NONE');
    setDiscountValue('');
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
  const perPeriod = selectedLine?.periodsCount ? Math.round(netAmount / selectedLine.periodsCount) : 0;

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
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nom, prénom, matricule, classe..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{ paddingLeft: 36, borderRadius: 10 }}
                />
              </div>
              {searchResults.length > 0 && (
                <div style={{ marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  {searchResults.map((s) => (
                    <button key={s.id} className="btn btn-light w-100 text-start" style={{ borderRadius: 0, padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }} onClick={() => handleSelectStudent(s)}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.matricule} — {s.className}</div>
                    </button>
                  ))}
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
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <AlertCircle size={20} color="#a16207" />
                <strong style={{ color: '#a16207' }}>Déjà inscrit au transport</strong>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#713f12', margin: '0 0 8px' }}>
                Cet élève est déjà inscrit sur la <strong>{existingEnrollment.lineName}</strong> pour cette année scolaire.
              </p>
              <div style={{ fontSize: '0.875rem', display: 'grid', gap: 4 }}>
                <div><strong>Net :</strong> {existingEnrollment.netAmountDue.toLocaleString('fr-FR')} FCFA</div>
                <div><strong>Payé :</strong> {existingEnrollment.totalPaid.toLocaleString('fr-FR')} FCFA</div>
              </div>
              <button className="btn btn-sm btn-outline-secondary mt-3" onClick={handleReset}><RotateCcw size={13} className="me-1" /> Nouvel élève</button>
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
                          <span>Montant à payer</span><span>{netAmount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#475569' }}>
                          <span>Par période ({selectedLine.periodsCount})</span><span>≈ {perPeriod.toLocaleString('fr-FR')} FCFA</span>
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
    </div>
  );
};
