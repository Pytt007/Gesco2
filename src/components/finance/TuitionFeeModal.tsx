import React, { useState, useEffect, useMemo } from 'react';
import { TuitionFeeSchedule, TuitionLevelCode } from '../../services/finance/types';
import { X, DollarSign, Percent, ShieldCheck } from 'lucide-react';

interface TuitionFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    levelCode: TuitionLevelCode;
    registrationFee: number;
    tuitionFee: number;
    allowFixedDiscount: boolean;
    allowPercentDiscount: boolean;
    maxDiscountPercent: number;
  }) => Promise<boolean>;
  initialData?: TuitionFeeSchedule | null;
  existingLevels?: TuitionLevelCode[];
}

const levelOptions: { code: TuitionLevelCode; label: string }[] = [
  { code: 'PS', label: 'PS - Petite Section' },
  { code: 'MS', label: 'MS - Moyenne Section' },
  { code: 'GS', label: 'GS - Grande Section' },
  { code: 'CP1', label: 'CP1 - Cours Préparatoire 1' },
  { code: 'CP2', label: 'CP2 - Cours Préparatoire 2' },
  { code: 'CE1', label: 'CE1 - Cours Élémentaire 1' },
  { code: 'CE2', label: 'CE2 - Cours Élémentaire 2' },
  { code: 'CM1', label: 'CM1 - Cours Moyen 1' },
  { code: 'CM2', label: 'CM2 - Cours Moyen 2' },
];

export const TuitionFeeModal: React.FC<TuitionFeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingLevels = [],
}) => {
  const [levelCode, setLevelCode] = useState<TuitionLevelCode>('CP1');
  const [registrationFee, setRegistrationFee] = useState<string>('60000');
  const [tuitionFee, setTuitionFee] = useState<string>('300000');
  const [allowFixedDiscount, setAllowFixedDiscount] = useState<boolean>(true);
  const [allowPercentDiscount, setAllowPercentDiscount] = useState<boolean>(true);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState<string>('30');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setLevelCode(initialData.levelCode);
      setRegistrationFee(initialData.registrationFee.toString());
      setTuitionFee(initialData.tuitionFee.toString());
      setAllowFixedDiscount(initialData.allowFixedDiscount);
      setAllowPercentDiscount(initialData.allowPercentDiscount);
      setMaxDiscountPercent((initialData.maxDiscountPercent || 30).toString());
    } else {
      setLevelCode('CP1');
      setRegistrationFee('60000');
      setTuitionFee('300000');
      setAllowFixedDiscount(true);
      setAllowPercentDiscount(true);
      setMaxDiscountPercent('30');
    }
    setError(null);
  }, [initialData, isOpen]);

  // Calcul automatique du total annuel
  const totalAnnualCalculated = useMemo(() => {
    const reg = Math.max(0, Number(registrationFee) || 0);
    const tui = Math.max(0, Number(tuitionFee) || 0);
    return reg + tui;
  }, [registrationFee, tuitionFee]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const reg = Number(registrationFee);
    const tui = Number(tuitionFee);

    if (isNaN(reg) || reg < 0) {
      setError('Les frais d’inscription ne peuvent pas être négatifs.');
      return;
    }
    if (isNaN(tui) || tui < 0) {
      setError('Les frais de scolarité ne peuvent pas être négatifs.');
      return;
    }

    if (!initialData && existingLevels.includes(levelCode)) {
      setError(`Le niveau ${levelCode} possède déjà un tarif configuré.`);
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onSave({
        levelCode,
        registrationFee: reg,
        tuitionFee: tui,
        allowFixedDiscount,
        allowPercentDiscount,
        maxDiscountPercent: Number(maxDiscountPercent) || 30,
      });

      if (ok) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
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
        style={{ width: '100%', maxWidth: '520px', borderRadius: '12px', overflow: 'hidden' }}
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
            {initialData ? `Modifier les tarifs - ${initialData.levelName}` : 'Nouveau Tarif Scolaire'}
          </h5>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div className="alert alert-danger p-2 mb-3 text-sm" style={{ borderRadius: '6px' }}>
              {error}
            </div>
          )}

          {/* Niveau */}
          <div className="mb-3">
            <label className="form-label text-sm fw-semibold">Niveau Scolaire</label>
            <select
              className="form-select text-sm"
              value={levelCode}
              onChange={(e) => setLevelCode(e.target.value as TuitionLevelCode)}
              disabled={!!initialData}
            >
              {levelOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Frais Inscription & Scolarité */}
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="form-label text-sm fw-semibold">Frais d'inscription (FCFA)</label>
              <input
                type="number"
                min="0"
                className="form-input text-sm"
                value={registrationFee}
                onChange={(e) => setRegistrationFee(e.target.value)}
                required
              />
            </div>

            <div className="col-6">
              <label className="form-label text-sm fw-semibold">Frais de scolarité (FCFA)</label>
              <input
                type="number"
                min="0"
                className="form-input text-sm"
                value={tuitionFee}
                onChange={(e) => setTuitionFee(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Total Annuel Calculé */}
          <div
            className="mb-4 p-3"
            style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}
          >
            <span style={{ fontSize: '0.8125rem', color: '#166534', fontWeight: 600, display: 'block' }}>
              Total annuel calculé automatiquement
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#15803d' }}>
              {totalAnnualCalculated.toLocaleString('fr-FR')} FCFA
            </span>
          </div>

          {/* Remises autorisées */}
          <div className="mb-4 p-3" style={{ backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label className="form-label text-sm fw-semibold mb-2" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#2563eb" /> Options de Remises Autorisées
            </label>

            <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="chk-fixed"
                checked={allowFixedDiscount}
                onChange={(e) => setAllowFixedDiscount(e.target.checked)}
              />
              <label className="form-check-label text-sm" htmlFor="chk-fixed">
                ☑ Autoriser la remise en montant fixe
              </label>
            </div>

            <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="chk-percent"
                checked={allowPercentDiscount}
                onChange={(e) => setAllowPercentDiscount(e.target.checked)}
              />
              <label className="form-check-label text-sm" htmlFor="chk-percent">
                ☑ Autoriser la remise en pourcentage (%)
              </label>
            </div>

            {allowPercentDiscount && (
              <div className="mt-2">
                <label className="form-label text-xs text-muted">Remise maximale autorisée (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-input text-sm"
                  style={{ width: '120px' }}
                  value={maxDiscountPercent}
                  onChange={(e) => setMaxDiscountPercent(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary text-sm" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary text-sm" disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Enregistrer les tarifs'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
