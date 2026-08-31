import React, { useState, useEffect, useMemo } from 'react';
import { TuitionFeeSchedule, TuitionLevelCode } from '../../services/finance/types';
import { X, DollarSign, Percent, ShieldCheck, CreditCard, Sparkles, Check } from 'lucide-react';

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
  { code: 'GARDERIE', label: 'Garderie' },
  { code: 'PS', label: 'Petite Section (PS)' },
  { code: 'MS', label: 'Moyenne Section (MS)' },
  { code: 'GS', label: 'Grande Section (GS)' },
  { code: 'CP1', label: 'Cours Préparatoire 1 (CP1)' },
  { code: 'CP2', label: 'Cours Préparatoire 2 (CP2)' },
  { code: 'CE1', label: 'Cours Élémentaire 1 (CE1)' },
  { code: 'CE2', label: 'Cours Élémentaire 2 (CE2)' },
  { code: 'CM1', label: 'Cours Moyen 1 (CM1)' },
  { code: 'CM2', label: 'Cours Moyen 2 (CM2)' },
];

export const TuitionFeeModal: React.FC<TuitionFeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingLevels = [],
}) => {
  const [levelCode, setLevelCode] = useState<TuitionLevelCode>('GARDERIE');
  const [registrationFee, setRegistrationFee] = useState<string>('');
  const [tuitionFee, setTuitionFee] = useState<string>('');
  const [allowFixedDiscount, setAllowFixedDiscount] = useState<boolean>(true);
  const [allowPercentDiscount, setAllowPercentDiscount] = useState<boolean>(true);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState<string>('30');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setLevelCode(initialData.levelCode);
      setRegistrationFee(initialData.registrationFee > 0 ? initialData.registrationFee.toString() : '');
      setTuitionFee(initialData.tuitionFee > 0 ? initialData.tuitionFee.toString() : '');
      setAllowFixedDiscount(initialData.allowFixedDiscount);
      setAllowPercentDiscount(initialData.allowPercentDiscount);
      setMaxDiscountPercent((initialData.maxDiscountPercent || 30).toString());
    } else {
      const availableLevel = levelOptions.find((l) => !existingLevels.includes(l.code))?.code || 'GARDERIE';
      setLevelCode(availableLevel);
      setRegistrationFee('');
      setTuitionFee('');
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

    const reg = Number(registrationFee) || 0;
    const tui = Number(tuitionFee) || 0;

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
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '1.25rem',
      }}
    >
      <div
        className="card shadow-xl"
        style={{
          width: '100%',
          maxWidth: '540px',
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--bg-surface, #ffffff)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── HEADER MODAL AÉRÉ & ÉLÉGANT ─────────────────────────────────── */}
        <div
          style={{
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <CreditCard size={20} color="#93c5fd" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', color: '#ffffff', letterSpacing: '-0.01em' }}>
                {initialData ? `Modifier le Tarif · ${initialData.levelName}` : 'Nouveau Tarif Scolaire'}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.78125rem', color: '#93c5fd' }}>
                Paramétrez les frais annuels et les règles d'allègement pour ce niveau
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── CORPS DU FORMULAIRE SPACIEUX & CONFORTABLE ───────────────────── */}
        <form onSubmit={handleSubmit} style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {/* Niveau Scolaire */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: '6px' }}>
              Niveau Scolaire
            </label>
            <select
              className="form-select"
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                fontSize: '0.875rem',
                fontWeight: 600,
                border: '1px solid var(--border)',
                background: initialData ? 'var(--bg-surface-hover, #f8fafc)' : 'var(--bg-surface, #ffffff)',
              }}
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

          {/* Grille Frais Inscription & Scolarité */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: '6px' }}>
                Frais d'inscription (FCFA)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                className="form-input"
                style={{ height: 44, borderRadius: 12, fontSize: '0.875rem', fontWeight: 600 }}
                placeholder="Ex : 40 000"
                value={registrationFee}
                onChange={(e) => setRegistrationFee(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: '6px' }}>
                Frais de scolarité (FCFA)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                className="form-input"
                style={{ height: 44, borderRadius: 12, fontSize: '0.875rem', fontWeight: 600 }}
                placeholder="Ex : 200 000"
                value={tuitionFee}
                onChange={(e) => setTuitionFee(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Total Annuel Calculé Dynamique */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                Total Annuel Calculé
              </span>
              <span style={{ fontSize: '0.75rem', color: '#065f46' }}>
                Inscription + Scolarité
              </span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#065f46', fontFamily: "'Outfit', sans-serif" }}>
              {totalAnnualCalculated.toLocaleString('fr-FR')} FCFA
            </div>
          </div>

          {/* Options de Remises Autorisées */}
          <div
            style={{
              padding: '1.125rem 1.25rem',
              borderRadius: '14px',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface-hover, #f8fafc)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary, #2563eb)', fontSize: '0.8125rem', fontWeight: 800 }}>
              <ShieldCheck size={16} />
              <span>Règles de Remises Autorisées</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {/* Remise Fixe */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.84375rem',
                  fontWeight: 600,
                  color: 'var(--text-primary, #1e293b)',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  id="chk-fixed"
                  checked={allowFixedDiscount}
                  onChange={(e) => setAllowFixedDiscount(e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: '#2563eb', cursor: 'pointer' }}
                />
                <span>Autoriser les remises en montant fixe</span>
              </label>

              {/* Remise Pourcentage */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.84375rem',
                  fontWeight: 600,
                  color: 'var(--text-primary, #1e293b)',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  id="chk-percent"
                  checked={allowPercentDiscount}
                  onChange={(e) => setAllowPercentDiscount(e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: '#2563eb', cursor: 'pointer' }}
                />
                <span>Autoriser les remises en pourcentage (%)</span>
              </label>
            </div>

            {allowPercentDiscount && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
                  Pourcentage max. autorisé :
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-input"
                    style={{ width: 80, height: 34, textAlign: 'center', fontWeight: 700, borderRadius: 8, fontSize: '0.875rem' }}
                    value={maxDiscountPercent}
                    onChange={(e) => setMaxDiscountPercent(e.target.value)}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
            )}
          </div>

          {/* ── FOOTER ACTIONS ──────────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              style={{ padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: '0.875rem' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                padding: '10px 24px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: '0.875rem',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              }}
            >
              {submitting ? 'Enregistrement...' : 'Enregistrer le tarif'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
