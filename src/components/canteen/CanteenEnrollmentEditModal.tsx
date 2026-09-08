import React, { useState, useEffect } from 'react';
import {
  CanteenEnrollment,
  CanteenDiscountType,
} from '../../services/canteen/types';
import { canteenEnrollmentService } from '../../services/canteen/canteenEnrollmentService';
import { CustomScheduleEditor, SchedulePeriodItem } from '../common/CustomScheduleEditor';
import { useToast } from '../../context/ToastContext';
import { X, UtensilsCrossed, DollarSign, Edit3, Save } from 'lucide-react';

interface CanteenEnrollmentEditModalProps {
  isOpen: boolean;
  enrollment: CanteenEnrollment | null;
  onClose: () => void;
  onSaved: () => void;
}

export const CanteenEnrollmentEditModal: React.FC<CanteenEnrollmentEditModalProps> = ({
  isOpen,
  enrollment,
  onClose,
  onSaved,
}) => {
  const { showToast } = useToast();
  const [discountType, setDiscountType] = useState<CanteenDiscountType>('NONE');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [customPeriods, setCustomPeriods] = useState<SchedulePeriodItem[]>([]);
  const [parentSponsor, setParentSponsor] = useState<string>('');
  const [parentPhone, setParentPhone] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !enrollment) return;

    setDiscountType(enrollment.discountType || 'NONE');
    setDiscountValue(enrollment.discountValue ? String(enrollment.discountValue) : '');
    setParentSponsor(enrollment.parentSponsor || '');
    setParentPhone(enrollment.parentPhone || '');

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
  }, [isOpen, enrollment]);

  if (!isOpen || !enrollment) return null;

  const annualRate = enrollment.annualRate || 0;
  const discountNum = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'FIXED'
    ? discountNum
    : discountType === 'PERCENTAGE'
    ? Math.round((annualRate * discountNum) / 100)
    : 0;
  const netAmount = Math.max(0, annualRate - discountAmount);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;

    setSaving(true);
    try {
      const res = await canteenEnrollmentService.updateEnrollment(enrollment.id, {
        discountType,
        discountValue: discountNum,
        customPeriods: customPeriods.length > 0 ? customPeriods : undefined,
        parentSponsor: parentSponsor.trim(),
        parentPhone: parentPhone.trim(),
      });

      if (res.success) {
        showToast('Inscription cantine modifiée avec succès.', 'success');
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
            background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
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
                Modifier l'inscription cantine
              </h5>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#a7f3d0' }}>
                {enrollment.studentName} ({enrollment.matricule}) — Niveau {enrollment.levelCode}
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
            {/* Info niveau cantine */}
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UtensilsCrossed size={18} color="#059669" />
                <div>
                  <div style={{ fontWeight: 700, color: '#064e3b', fontSize: '0.9375rem' }}>
                    Niveau {enrollment.levelCode} — {enrollment.className}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#047857' }}>
                    Tarif annuel de base : {annualRate.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
              </div>
            </div>

            {/* Remise */}
            <div className="card" style={{ borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div className="card-body p-3">
                <label className="form-label text-sm fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                  <DollarSign size={15} color="#059669" /> Réduction / Remise accordée
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <label className="form-label text-xs text-muted mb-1">Type de remise</label>
                    <select
                      className="form-select form-select-sm"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as CanteenDiscountType)}
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
                  <div style={{ marginTop: 8, fontSize: '0.8125rem', color: '#059669', fontWeight: 600 }}>
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
                title="Échéancier de cantine de l'élève"
                subtitle="Ajustez le nombre d'échéances et leurs montants pour cet élève."
                periodPrefix="Période"
                quickCounts={[1, 2, 3, 4, 6, 9, 10]}
                schoolYear={enrollment.academicYearId}
                accentColor="#059669"
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
              className="btn btn-success fw-semibold"
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
