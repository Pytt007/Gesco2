import React from 'react';
import { Clock, Plus, Trash2, Scale, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export interface SchedulePeriodItem {
  number: number;
  label: string;
  dueDate: string;
  amountDue: number;
}

interface CustomScheduleEditorProps {
  periods: SchedulePeriodItem[];
  onChange: (periods: SchedulePeriodItem[]) => void;
  targetTotal: number;
  onTotalChange?: (newTotal: number) => void;
  title?: string;
  subtitle?: string;
  periodPrefix?: string;
  quickCounts?: number[];
  schoolYear?: string;
  accentColor?: string;
  compact?: boolean;
}

export const CustomScheduleEditor: React.FC<CustomScheduleEditorProps> = ({
  periods,
  onChange,
  targetTotal,
  onTotalChange,
  title = 'Échéancier de règlement',
  subtitle = "Personnalisez librement le nombre d'échéances, leurs libellés, dates et montants.",
  periodPrefix = 'Période',
  quickCounts = [1, 2, 3, 4, 6, 9, 10],
  schoolYear,
  accentColor = '#2563eb',
  compact = false,
}) => {
  // Générateur dynamique d'échéances selon le nombre
  const generatePeriodsForCount = (count: number, total: number = targetTotal): SchedulePeriodItem[] => {
    if (count <= 0) return [];
    const base = total > 0 ? Math.floor(total / count) : 0;
    const remainder = total > 0 ? total - base * count : 0;

    let startYear = new Date().getFullYear();
    if (schoolYear) {
      const parts = schoolYear.split(/[-/]/);
      const parsed = parseInt(parts[0], 10);
      if (!isNaN(parsed) && parsed > 2000) {
        startYear = parsed;
      }
    }

    const months = ['10', '11', '12', '01', '02', '03', '04', '05', '06', '07', '08', '09'];

    return Array.from({ length: count }, (_, i) => {
      let label = `${periodPrefix} ${i + 1}`;
      let dueDateStr = '';

      if (count === 1) {
        label = 'Paiement Unique (Comptant)';
        dueDateStr = `${startYear}-10-05`;
      } else if (count === 3) {
        const labels3 = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'];
        const dates3 = [`${startYear}-10-05`, `${startYear + 1}-01-05`, `${startYear + 1}-04-05`];
        label = labels3[i] || `${periodPrefix} ${i + 1}`;
        dueDateStr = dates3[i] || `${startYear + 1}-01-05`;
      } else {
        const yr = i >= 3 ? startYear + 1 : startYear;
        const monthStr = months[i % 12];
        dueDateStr = `${yr}-${monthStr}-05`;
      }

      return {
        number: i + 1,
        label,
        dueDate: dueDateStr,
        amountDue: i === 0 ? base + remainder : base,
      };
    });
  };

  const activePeriods = periods.length > 0 ? periods : generatePeriodsForCount(3, targetTotal);

  // Mettre à jour un champ d'une période
  const handleUpdateItem = (index: number, field: 'label' | 'dueDate' | 'amountDue', value: any) => {
    const list = [...activePeriods];
    list[index] = { ...list[index], [field]: value };
    onChange(list);
  };

  // Ajout d'une nouvelle période
  const handleAddPeriod = () => {
    const list = [...activePeriods];
    const nextNumber = list.length + 1;
    let nextDueDate = `${new Date().getFullYear()}-10-05`;
    if (list.length > 0) {
      const last = list[list.length - 1];
      if (last.dueDate) {
        const parts = last.dueDate.split('-');
        if (parts.length === 3) {
          let y = parseInt(parts[0], 10);
          let m = parseInt(parts[1], 10) + 1;
          if (m > 12) {
            m = 1;
            y += 1;
          }
          nextDueDate = `${y}-${String(m).padStart(2, '0')}-${parts[2]}`;
        }
      }
    }
    list.push({
      number: nextNumber,
      label: `${periodPrefix} ${nextNumber}`,
      dueDate: nextDueDate,
      amountDue: 0,
    });
    onChange(list);
  };

  // Suppression d'une période
  const handleDeletePeriod = (index: number) => {
    const filtered = activePeriods.filter((_, i) => i !== index);
    const renumbered = filtered.map((item, i) => ({
      ...item,
      number: i + 1,
      label: item.label.startsWith(periodPrefix) ? `${periodPrefix} ${i + 1}` : item.label,
    }));
    onChange(renumbered);
  };

  // Sélection rapide du nombre de périodes
  const handleSetCount = (count: number) => {
    const gen = generatePeriodsForCount(count, targetTotal);
    onChange(gen);
  };

  // Répartition équitable du total
  const handleDistributeEvenly = () => {
    if (activePeriods.length === 0) return;
    const count = activePeriods.length;
    const base = targetTotal > 0 ? Math.floor(targetTotal / count) : 0;
    const rem = targetTotal > 0 ? targetTotal - base * count : 0;
    const distributed = activePeriods.map((p, i) => ({
      ...p,
      amountDue: i === 0 ? base + rem : base,
    }));
    onChange(distributed);
  };

  // Ajuster l'écart sur la dernière échéance
  const handleAdjustOnLast = () => {
    if (activePeriods.length === 0) return;
    const sum = activePeriods.reduce((acc, p) => acc + (Number(p.amountDue) || 0), 0);
    const diff = targetTotal - sum;
    const list = [...activePeriods];
    const lastIdx = list.length - 1;
    list[lastIdx] = {
      ...list[lastIdx],
      amountDue: Math.max(0, (Number(list[lastIdx].amountDue) || 0) + diff),
    };
    onChange(list);
  };

  // Synchroniser le total parent avec la somme des périodes
  const handleSyncParentTotal = () => {
    if (onTotalChange) {
      const sum = activePeriods.reduce((acc, p) => acc + (Number(p.amountDue) || 0), 0);
      onTotalChange(sum);
    }
  };

  const installmentsSum = activePeriods.reduce((sum, p) => sum + (Number(p.amountDue) || 0), 0);
  const difference = targetTotal - installmentsSum;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: compact ? '14px 16px' : '20px',
        display: 'grid',
        gap: 14,
      }}
    >
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h6
            style={{
              margin: 0,
              fontSize: '0.9375rem',
              fontWeight: 800,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Clock size={17} style={{ color: accentColor }} />
            {title} ({activePeriods.length} {activePeriods.length > 1 ? 'échéances' : 'échéance'})
          </h6>
          {subtitle && (
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              {subtitle}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Raccourcis nombre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: '3px 6px', borderRadius: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginRight: 2 }}>Nb :</span>
            {quickCounts.map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => handleSetCount(cnt)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activePeriods.length === cnt ? accentColor : '#ffffff',
                  color: activePeriods.length === cnt ? '#ffffff' : '#334155',
                  boxShadow: activePeriods.length === cnt ? `0 2px 4px ${accentColor}40` : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease',
                }}
              >
                {cnt === 1 ? '1x' : cnt === 3 ? '3x' : `${cnt}x`}
              </button>
            ))}
          </div>

          {/* Bouton Répartir */}
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleDistributeEvenly}
            disabled={activePeriods.length === 0 || targetTotal <= 0}
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              cursor: targetTotal > 0 ? 'pointer' : 'not-allowed',
            }}
            title="Répartir le montant total équitablement sur toutes les échéances"
          >
            <Scale size={13} /> ⚖️ Répartir
          </button>

          {/* Bouton Ajouter */}
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleAddPeriod}
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: accentColor,
              borderRadius: 8,
              padding: '4px 11px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Ajouter
          </button>
        </div>
      </div>

      {/* Tableau des échéances */}
      {activePeriods.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
          <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '0.8125rem' }}>
            Aucune échéance configurée.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleAddPeriod}
            style={{ fontWeight: 700, borderRadius: 8, fontSize: '0.8125rem' }}
          >
            <Plus size={14} className="me-1" /> Ajouter une première échéance
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.8125rem', marginBottom: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '8px 10px', width: 50 }}>N°</th>
                <th style={{ padding: '8px 10px' }}>Libellé</th>
                <th style={{ padding: '8px 10px', width: 160 }}>Date d'Échéance</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: 170 }}>Montant Dû (FCFA)</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: 50 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {activePeriods.map((item, idx) => (
                <tr key={item.number} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px', verticalAlign: 'middle' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: '#f1f5f9',
                        color: '#334155',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                      }}
                    >
                      {item.number}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={item.label}
                      onChange={(e) => handleUpdateItem(idx, 'label', e.target.value)}
                      placeholder={`${periodPrefix} ${item.number}`}
                      style={{ fontWeight: 600, fontSize: '0.8125rem', borderRadius: 6 }}
                    />
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={item.dueDate || ''}
                      onChange={(e) => handleUpdateItem(idx, 'dueDate', e.target.value)}
                      style={{ fontSize: '0.8125rem', borderRadius: 6 }}
                    />
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-control form-control-sm text-end"
                      placeholder="0"
                      value={item.amountDue ? item.amountDue : ''}
                      onChange={(e) =>
                        handleUpdateItem(idx, 'amountDue', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))
                      }
                      style={{ width: 140, fontWeight: 700, marginLeft: 'auto', borderRadius: 6 }}
                    />
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <button
                      type="button"
                      onClick={() => handleDeletePeriod(idx)}
                      style={{
                        background: '#fee2e2',
                        border: 'none',
                        borderRadius: 6,
                        color: '#dc2626',
                        width: 26,
                        height: 26,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.15s ease',
                      }}
                      title="Supprimer cette échéance"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
              <tr>
                <td colSpan={2} style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                  {targetTotal > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {difference === 0 ? (
                        <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={14} /> Total conforme au montant annuel
                        </span>
                      ) : (
                        <>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: difference > 0 ? '#d97706' : '#dc2626',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <AlertCircle size={14} />
                            {difference > 0
                              ? `Reste à allouer : ${difference.toLocaleString('fr-FR')} FCFA`
                              : `Dépassement : ${Math.abs(difference).toLocaleString('fr-FR')} FCFA`}
                          </span>
                          <button
                            type="button"
                            onClick={handleAdjustOnLast}
                            style={{
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              borderRadius: 6,
                              padding: '2px 7px',
                              fontSize: '0.71875rem',
                              fontWeight: 700,
                              color: accentColor,
                              cursor: 'pointer',
                            }}
                            title="Ajuster l'écart sur la dernière échéance"
                          >
                            Ajuster sur la dernière
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {targetTotal === 0 && onTotalChange && installmentsSum > 0 && (
                    <button
                      type="button"
                      onClick={handleSyncParentTotal}
                      className="btn btn-sm btn-outline-primary"
                      style={{ fontSize: '0.71875rem', padding: '2px 8px', borderRadius: 6 }}
                    >
                      <RefreshCw size={11} className="me-1" />
                      Définir le tarif annuel à {installmentsSum.toLocaleString('fr-FR')} FCFA
                    </button>
                  )}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '0.8125rem' }}>
                  Total Échéancier :
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '0.9375rem' }}>
                  {installmentsSum > 0 ? `${installmentsSum.toLocaleString('fr-FR')} FCFA` : '—'}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
