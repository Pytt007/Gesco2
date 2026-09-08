import React, { useState } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import { useCanteenFees } from '../../hooks/canteen/useCanteenFees';
import { CanteenFeeSchedule, CanteenLevelCode } from '../../services/canteen/types';
import { Plus, Copy, Edit2, Archive, Calendar, AlertCircle, CheckCircle2, UtensilsCrossed, BarChart3 } from 'lucide-react';
import { useAcademicYears } from '../../hooks/academic';
import { CustomScheduleEditor, SchedulePeriodItem } from '../common/CustomScheduleEditor';

const LEVEL_ORDER: CanteenLevelCode[] = ['GARDERIE', 'PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];

const LEVEL_NAMES: Record<CanteenLevelCode, string> = {
  GARDERIE: 'Garderie',
  PS: 'Petite Section (PS)', MS: 'Moyenne Section (MS)', GS: 'Grande Section (GS)',
  CP1: 'CP1', CP2: 'CP2', CE1: 'CE1', CE2: 'CE2', CM1: 'CM1', CM2: 'CM2',
};

interface CanteenFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { levelCode: CanteenLevelCode; annualRate: number; periodsCount: number; customPeriods?: SchedulePeriodItem[] }) => Promise<boolean>;
  initialData: CanteenFeeSchedule | null;
  existingLevels: CanteenLevelCode[];
  schoolYear?: string;
}

const CanteenFeeModal: React.FC<CanteenFeeModalProps> = ({ isOpen, onClose, onSave, initialData, existingLevels, schoolYear }) => {
  const [levelCode, setLevelCode] = useState<CanteenLevelCode>(initialData?.levelCode || 'GARDERIE');
  const [annualRate, setAnnualRate] = useState<string>(initialData ? String(initialData.annualRate) : '');
  const [periodsCount, setPeriodsCount] = useState<number>(initialData?.periodsCount || 3);
  const [customPeriods, setCustomPeriods] = useState<SchedulePeriodItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableLevels = LEVEL_ORDER.filter(
    (l) => !existingLevels.includes(l) || (initialData && l === initialData.levelCode)
  );

  React.useEffect(() => {
    if (isOpen) {
      const defaultLvl = initialData?.levelCode || availableLevels[0] || 'GARDERIE';
      setLevelCode(defaultLvl);
      const rateStr = initialData ? String(initialData.annualRate) : '';
      setAnnualRate(rateStr);
      const count = initialData?.periodsCount || 3;
      setPeriodsCount(count);

      const feeVal = initialData?.annualRate || 0;
      if (initialData?.customPeriods && initialData.customPeriods.length > 0) {
        setCustomPeriods(
          initialData.customPeriods.map((p, idx) => ({
            number: p.number || idx + 1,
            label: p.label || `Période ${idx + 1}`,
            dueDate: p.dueDate || '',
            amountDue: p.amountDue,
          }))
        );
      } else if (feeVal > 0) {
        const base = Math.floor(feeVal / count);
        const rem = feeVal - base * count;
        setCustomPeriods(
          Array.from({ length: count }, (_, i) => ({
            number: i + 1,
            label: count === 3 ? (i === 0 ? '1er Trimestre' : i === 1 ? '2ème Trimestre' : '3ème Trimestre') : `Période ${i + 1}`,
            dueDate: '',
            amountDue: i === 0 ? base + rem : base,
          }))
        );
      } else {
        setCustomPeriods([]);
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const annualRateNum = parseFloat(annualRate) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const periodsSum = customPeriods.reduce((acc, p) => acc + (Number(p.amountDue) || 0), 0);
    const finalRate = periodsSum > 0 ? periodsSum : annualRateNum;

    if (finalRate <= 0) {
      setError('Le tarif annuel doit être supérieur à 0.');
      return;
    }
    setSaving(true);
    setError(null);
    const ok = await onSave({
      levelCode,
      annualRate: finalRate,
      periodsCount: customPeriods.length > 0 ? customPeriods.length : periodsCount,
      customPeriods: customPeriods.length > 0 ? customPeriods : undefined,
    });
    setSaving(false);
    if (ok) onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', padding: 16 }}>
      <div className="card shadow-lg" style={{ width: '100%', maxWidth: 720, borderRadius: 16, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UtensilsCrossed size={22} color="white" />
            <h5 style={{ margin: 0, fontWeight: 700, color: 'white' }}>
              {initialData ? 'Modifier le tarif cantine' : 'Nouveau tarif cantine'}
            </h5>
          </div>
          <button className="btn btn-sm btn-outline-light" onClick={onClose} style={{ borderRadius: 8, padding: '4px 10px' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px', display: 'grid', gap: 16 }}>
            {error && (
              <div className="alert alert-danger text-sm p-2 mb-2" style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label fw-semibold text-sm">Niveau *</label>
                <select
                  className="form-select"
                  value={levelCode}
                  onChange={(e) => setLevelCode(e.target.value as CanteenLevelCode)}
                  disabled={!!initialData}
                  required
                >
                  {availableLevels.map((l) => (
                    <option key={l} value={l}>{LEVEL_NAMES[l]}</option>
                  ))}
                </select>
                {availableLevels.length === 0 && !initialData && (
                  <p className="text-muted text-xs mt-1">Tous les niveaux sont déjà configurés.</p>
                )}
              </div>

              <div>
                <label className="form-label fw-semibold text-sm">Tarif annuel global (FCFA) *</label>
                <input
                  type="number"
                  className="form-control"
                  value={annualRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnnualRate(val);
                    const num = parseFloat(val) || 0;
                    if (customPeriods.length > 0 && num > 0) {
                      const base = Math.floor(num / customPeriods.length);
                      const rem = num - base * customPeriods.length;
                      setCustomPeriods(customPeriods.map((p, i) => ({ ...p, amountDue: i === 0 ? base + rem : base })));
                    }
                  }}
                  min={0}
                  step={1000}
                  placeholder="Ex : 150000"
                  required
                />
              </div>
            </div>

            {/* Échéancier personnalisable comme dans l'inscription d'un élève */}
            <CustomScheduleEditor
              periods={customPeriods}
              onChange={(newPeriods) => {
                setCustomPeriods(newPeriods);
                setPeriodsCount(newPeriods.length);
                const sum = newPeriods.reduce((acc, p) => acc + (Number(p.amountDue) || 0), 0);
                if (sum > 0) {
                  setAnnualRate(String(sum));
                }
              }}
              targetTotal={annualRateNum}
              onTotalChange={(newTotal) => setAnnualRate(String(newTotal))}
              title="Échéancier de cantine du niveau"
              subtitle="Définissez les tranches, dates limites et montants pour ce niveau."
              periodPrefix="Période"
              quickCounts={[1, 2, 3, 4, 6]}
              schoolYear={schoolYear}
              accentColor="#10b981"
            />
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'flex-end', background: '#f8fafc' }}>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="btn btn-success fw-semibold" disabled={saving || availableLevels.length === 0}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement...</> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Vue principale : Configuration des tarifs cantine
// ─────────────────────────────────────────────────────────────────────────────

import { useSchoolYear } from '../../context/SchoolYearContext';

export const CanteenConfigView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const confirm = useConfirm();

  const {
    schedules,
    loading,
    error,
    createSchedule,
    updateSchedule,
    archiveSchedule,
    duplicatePreviousYear,
  } = useCanteenFees(schoolYear);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<CanteenFeeSchedule | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const existingLevels = schedules.map((s) => s.levelCode);

  const handleOpenCreate = () => { setEditingSchedule(null); setModalOpen(true); };
  const handleOpenEdit = (s: CanteenFeeSchedule) => { setEditingSchedule(s); setModalOpen(true); };

  const handleSave = async (data: { levelCode: CanteenLevelCode; annualRate: number; periodsCount: number; customPeriods?: SchedulePeriodItem[] }) => {
    let result;
    if (editingSchedule) {
      result = await updateSchedule(editingSchedule.id, data);
    } else {
      result = await createSchedule({ ...data, academicYearId: schoolYear });
    }
    if (result.success) {
      setSuccessMsg(result.message || 'Opération réussie.');
      setTimeout(() => setSuccessMsg(null), 4000);
      return true;
    }
    return false;
  };

  const handleArchive = async (s: CanteenFeeSchedule) => {
    const isConfirmed = await confirm({
      title: 'Archiver le tarif cantine',
      message: `Archiver le tarif cantine du niveau ${s.levelName} ?`,
      confirmText: 'Oui, archiver',
      cancelText: 'Annuler',
      variant: 'warning',
    });
    if (isConfirmed) {
      const result = await archiveSchedule(s.id);
      if (result.success) {
        setSuccessMsg(`Tarif du niveau ${s.levelName} archivé.`);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    }
  };

  const handleDuplicate = async () => {
    const prevYearId = schoolYear === '2024-2025' ? '2023-2024' : '2024-2025';
    const isConfirmed = await confirm({
      title: 'Dupliquer la grille tarifaire',
      message: "Dupliquer tous les tarifs cantine de l'année précédente ?",
      confirmText: 'Oui, dupliquer',
      cancelText: 'Annuler',
      variant: 'info',
    });
    if (isConfirmed) {
      const result = await duplicatePreviousYear(prevYearId, schoolYear);
      if (result.success) {
        setSuccessMsg('Tarifs cantine dupliqués avec succès.');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    }
  };

  const totalAnnual = schedules.reduce((sum, s) => sum + s.annualRate, 0);

  return (
    <div style={{ padding: '8px 0' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Configuration de la cantine
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Tarifs annuels et périodes de paiement par niveau. Le total est calculé automatiquement.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline-primary text-sm fw-semibold"
            onClick={handleDuplicate}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
          >
            <Copy size={15} /> Dupliquer l'année précédente
          </button>
          <button
            className="btn btn-primary fw-semibold"
            onClick={handleOpenCreate}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
          >
            <Plus size={15} /> Nouveau tarif
          </button>
        </div>
      </div>

      {/* Sélecteur d'année */}
      <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 700, color: '#047857' }}>
            <span>🟢</span>
            <span>Année scolaire active :</span>
            <span style={{ fontWeight: 900, color: '#065f46' }}>{schoolYear}</span>
          </div>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            <strong>{schedules.length}</strong> niveau{schedules.length > 1 ? 'x' : ''} configuré{schedules.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Alertes */}
      {error && (
        <div className="alert alert-danger p-3 mb-3 text-sm" style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success p-3 mb-3 text-sm" style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* Tableau */}
      <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                {['Niveau', 'Tarif annuel', 'Nb. périodes', 'Total (Calculé)', 'Actions'].map((h, i) => (
                  <th key={h} style={{ padding: '13px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: i >= 1 && i <= 3 ? 'right' : i === 4 ? 'center' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-5 text-muted">Chargement...</td></tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">
                    <UtensilsCrossed size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p style={{ margin: 0 }}>Aucun tarif cantine configuré.</p>
                    <button className="btn btn-sm btn-primary mt-3" onClick={handleOpenCreate}>
                      <Plus size={14} className="me-1" /> Ajouter un tarif
                    </button>
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{s.levelName}</span>
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 500 }}>
                      {s.annualRate.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 500 }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 20, padding: '3px 10px', fontSize: '0.8125rem', fontWeight: 600 }}>
                        {s.periodsCount} période{s.periodsCount > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontSize: '0.9375rem', fontWeight: 700, color: '#0369a1', background: '#f0f9ff' }}>
                      {s.totalAmount.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => handleOpenEdit(s)} title="Modifier">
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleArchive(s)} title="Archiver">
                          <Archive size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {schedules.length > 0 && (
              <tfoot style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                <tr>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: '#0f172a' }}>Total cumulé</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700 }}>
                    {totalAnnual.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td />
                  <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 800, color: '#0369a1', fontSize: '1rem', background: '#e0f2fe' }}>
                    {totalAnnual.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <CanteenFeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editingSchedule}
        existingLevels={existingLevels}
        schoolYear={schoolYear}
      />
    </div>
  );
};
