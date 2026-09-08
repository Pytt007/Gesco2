import React, { useState, useEffect } from 'react';
import {
  TransportEnrollment,
  TransportLine,
  TransportDiscountType,
} from '../../services/transport/types';
import { transportLineService } from '../../services/transport/transportLineService';
import { transportEnrollmentService } from '../../services/transport/transportEnrollmentService';
import { CustomScheduleEditor, SchedulePeriodItem } from '../common/CustomScheduleEditor';
import { useToast } from '../../context/ToastContext';
import { X, Bus, DollarSign, Edit3, Save, AlertCircle } from 'lucide-react';

interface TransportEnrollmentEditModalProps {
  isOpen: boolean;
  enrollment: TransportEnrollment | null;
  onClose: () => void;
  onSaved: () => void;
}

export const TransportEnrollmentEditModal: React.FC<TransportEnrollmentEditModalProps> = ({
  isOpen,
  enrollment,
  onClose,
  onSaved,
}) => {
  const { showToast } = useToast();
  const [lines, setLines] = useState<TransportLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [discountType, setDiscountType] = useState<TransportDiscountType>('NONE');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [customPeriods, setCustomPeriods] = useState<SchedulePeriodItem[]>([]);
  const [parentSponsor, setParentSponsor] = useState<string>('');
  const [parentPhone, setParentPhone] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !enrollment) return;

    setSelectedLineId(enrollment.lineId);
    setDiscountType(enrollment.discountType || 'NONE');
    setDiscountValue(enrollment.discountValue ? String(enrollment.discountValue) : '');
    setParentSponsor(enrollment.parentSponsor || '');
    setParentPhone(enrollment.parentPhone || '');

    // Convert existing periods to SchedulePeriodItem
    if (enrollment.periods && enrollment.periods.length > 0) {
      setCustomPeriods(
        enrollment.periods.map((p) => ({
          number: p.number,
          label: p.label,
          dueDate: p.dueDate || '',
          amountDue: p.amountDue,
        }))
      );
    }

    // Charger les lignes
    transportLineService.getLinesByYear(enrollment.academicYearId).then((allLines) => {
      setLines(allLines.filter((l) => l.status === 'ACTIVE' || l.id === enrollment.lineId));
    });
  }, [isOpen, enrollment]);

  if (!isOpen || !enrollment) return null;

  const currentLine = lines.find((l) => l.id === selectedLineId);
  const annualFee = currentLine ? currentLine.annualFee : enrollment.annualFee;
  const discountNum = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'FIXED'
    ? discountNum
    : discountType === 'PERCENTAGE'
    ? Math.round((annualFee * discountNum) / 100)
    : 0;
  const netAmount = Math.max(0, annualFee - discountAmount);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;

    setSaving(true);
    try {
      const res = await transportEnrollmentService.updateEnrollment(enrollment.id, {
        lineId: selectedLineId,
        discountType,
        discountValue: discountNum,
        customPeriods: customPeriods.length > 0 ? customPeriods : undefined,
        parentSponsor: parentSponsor.trim(),
        parentPhone: parentPhone.trim(),
      });

      if (res.success) {
        showToast('Inscription transport modifiée avec succès.', 'success');
        onSaved();
        onClose();
      } else {
        showToast(res.error || 'Erreur lors de la modification.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Erreur inattendue.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="card shadow-2xl border-0"
        style={{
          maxWidth: 720,
          width: '100%',
          maxHeight: '92vh',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInScale 0.18s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Edit3 size={20} color="#ffffff" />
            </div>
            <div>
              <h5 style={{ margin: 0, fontWeight: 800, fontSize: '1.0625rem', color: '#ffffff' }}>
                Modifier l'inscription transport
              </h5>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#dbeafe' }}>
                {enrollment.studentName} ({enrollment.matricule}) — {enrollment.className}
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-sm text-white p-1" onClick={onClose} disabled={saving}>
            <X size={22} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'grid', gap: 18 }}>
            {/* Choix de la ligne */}
            <div>
              <label className="form-label text-sm fw-bold text-dark d-flex align-items-center gap-2">
                <Bus size={15} color="#2563eb" /> Ligne de transport
              </label>
              <select
                className="form-select"
                value={selectedLineId}
                onChange={(e) => setSelectedLineId(e.target.value)}
                required
              >
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — {l.zone} ({l.annualFee.toLocaleString('fr-FR')} FCFA) {l.id === enrollment.lineId ? '[Actuelle]' : `(${l.availableSeats} place dispo)`}
                  </option>
                ))}
              </select>
            </div>

            {/* Remise */}
            <div className="card" style={{ borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div className="card-body p-3">
                <label className="form-label text-sm fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                  <DollarSign size={15} color="#2563eb" /> Réduction / Remise accordée
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <label className="form-label text-xs text-muted mb-1">Type de remise</label>
                    <select
                      className="form-select form-select-sm"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as TransportDiscountType)}
                    >
                      <option value="NONE">Aucune remise</option>
                      <option value="FIXED">Montant fixe (FCFA)</option>
                      <option value="PERCENTAGE">Pourcentage (%)</option>
                    </select>
                  </div>
                  {discountType !== 'NONE' && (
                    <div>
                      <label className="form-label text-xs text-muted mb-1">
                        {discountType === 'FIXED' ? 'Valeur en FCFA' : 'Pourcentage (%)'}
                      </label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        min={0}
                        max={discountType === 'PERCENTAGE' ? 100 : undefined}
                      />
                    </div>
                  )}
                </div>
                {discountAmount > 0 && (
                  <div style={{ marginTop: 8, fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>
                    Remise calculée : – {discountAmount.toLocaleString('fr-FR')} FCFA → Net à payer : {netAmount.toLocaleString('fr-FR')} FCFA
                  </div>
                )}
              </div>
            </div>

            {/* Échéancier personnalisable */}
            <div>
              <CustomScheduleEditor
                periods={customPeriods}
                onChange={setCustomPeriods}
                targetTotal={netAmount}
                title="Échéancier de règlement de l'élève"
                subtitle="Ajustez le nombre d'échéances et leurs montants pour cet élève."
                periodPrefix="Période"
                quickCounts={[1, 2, 3, 4, 6, 9, 10]}
                schoolYear={enrollment.academicYearId}
                accentColor="#2563eb"
                compact
              />
            </div>

            {/* Contacts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label className="form-label text-xs text-muted mb-1">Responsable / Tuteur</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={parentSponsor}
                  onChange={(e) => setParentSponsor(e.target.value)}
                  placeholder="Nom du tuteur"
                />
              </div>
              <div>
                <label className="form-label text-xs text-muted mb-1">Téléphone tuteur</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="Ex : 0700000000"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <button
              type="button"
              className="btn btn-outline-secondary fw-semibold"
              style={{ borderRadius: 10, padding: '8px 18px', fontSize: '0.875rem' }}
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary fw-semibold"
              style={{ borderRadius: 10, padding: '8px 22px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm" /> Enregistrement...
                </>
              ) : (
                <>
                  <Save size={16} /> Enregistrer les modifications
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
