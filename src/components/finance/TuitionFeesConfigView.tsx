import React, { useState } from 'react';
import { useTuitionFees } from '../../hooks/finance/useTuitionFees';
import { TuitionFeeSchedule, TuitionLevelCode } from '../../services/finance/types';
import { TuitionFeeModal } from './TuitionFeeModal';
import { Plus, Copy, Edit2, Archive, Calendar, DollarSign, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAcademicYears } from '../../hooks/academic';

export const TuitionFeesConfigView: React.FC = () => {
  const { academicYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>('ay-2026');

  const {
    schedules,
    loading,
    error,
    saving,
    grandTotals,
    createFeeSchedule,
    updateFeeSchedule,
    archiveFeeSchedule,
    duplicatePreviousYear,
  } = useTuitionFees(selectedYearId);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<TuitionFeeSchedule | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const existingLevelCodes = schedules.map((s) => s.levelCode);

  const handleOpenCreate = () => {
    setEditingSchedule(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (schedule: TuitionFeeSchedule) => {
    setEditingSchedule(schedule);
    setModalOpen(true);
  };

  const handleSaveModal = async (data: {
    levelCode: TuitionLevelCode;
    registrationFee: number;
    tuitionFee: number;
    allowFixedDiscount: boolean;
    allowPercentDiscount: boolean;
    maxDiscountPercent: number;
  }) => {
    if (editingSchedule) {
      const ok = await updateFeeSchedule(editingSchedule.id, data);
      if (ok) {
        setSuccessMessage(`Tarifs pour le niveau ${data.levelCode} mis à jour avec succès.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
      return ok;
    } else {
      const ok = await createFeeSchedule(data);
      if (ok) {
        setSuccessMessage(`Tarifs pour le niveau ${data.levelCode} créés avec succès.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
      return ok;
    }
  };

  const handleArchive = async (schedule: TuitionFeeSchedule) => {
    if (window.confirm(`Voulez-vous vraiment archiver les tarifs du niveau ${schedule.levelName} ?`)) {
      const ok = await archiveFeeSchedule(schedule.id);
      if (ok) {
        setSuccessMessage(`Tarifs du niveau ${schedule.levelName} archivés.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    }
  };

  const handleDuplicatePrevious = async () => {
    const prevYearId = selectedYearId === 'ay-2026' ? 'ay-2025' : 'ay-2026';
    if (window.confirm(`Dupliquer tous les tarifs de l'année précédente vers l'année sélectionnée ?`)) {
      const ok = await duplicatePreviousYear(prevYearId);
      if (ok) {
        setSuccessMessage(`Les tarifs de l'année précédente ont été dupliqués avec succès.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    }
  };

  return (
    <div className="container-fluid p-4">
      {/* En-tête principal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Configuration des frais de scolarité
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Paramétrage des frais d'inscription et de scolarité par niveau. Le total annuel est calculé automatiquement.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-outline-primary text-sm"
            onClick={handleDuplicatePrevious}
            disabled={saving}
            style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Copy size={16} /> Dupliquer les tarifs de l'année précédente
          </button>

          <button
            className="btn btn-primary text-sm"
            onClick={handleOpenCreate}
            disabled={saving}
            style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Ajouter un tarif
          </button>
        </div>
      </div>

      {/* Barre de sélection de l'année scolaire */}
      <div
        className="card shadow-sm mb-4"
        style={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', backgroundColor: '#ffffff' }}
      >
        <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={18} color="#2563eb" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Année Scolaire active :</span>
            <select
              className="form-select text-sm fw-semibold"
              style={{ width: '200px' }}
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.yearCode || ay.name} {ay.isCurrent ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Grille tarifaire enregistrée pour <strong>{schedules.length}</strong> niveaux
          </div>
        </div>
      </div>

      {/* Messages d'erreur ou succès */}
      {error && (
        <div className="alert alert-danger p-3 mb-4 text-sm" style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success p-3 mb-4 text-sm" style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {successMessage}
        </div>
      )}

      {/* Tableau récapitulatif par niveau */}
      <div
        className="card shadow-sm mb-4"
        style={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}
      >
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                  Niveau
                </th>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                  Frais d'inscription
                </th>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                  Frais de scolarité
                </th>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', textAlign: 'right', backgroundColor: '#eff6ff' }}>
                  Total annuel (Calculé)
                </th>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                  Remises autorisées
                </th>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    Chargement des tarifs en cours...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    Aucun tarif configuré pour cette année scolaire. Cliquez sur "Nouveau tarif" ou "Dupliquer les tarifs".
                  </td>
                </tr>
              ) : (
                schedules.map((sch) => (
                  <tr key={sch.id}>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge bg-light text-dark fw-bold me-2" style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        {sch.levelCode}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                        {sch.levelName}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
                      {sch.registrationFee.toLocaleString('fr-FR')} FCFA
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
                      {sch.tuitionFee.toLocaleString('fr-FR')} FCFA
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.9375rem', fontWeight: 700, color: '#1d4ed8', backgroundColor: '#f8fafc' }}>
                      {sch.totalAnnualFee.toLocaleString('fr-FR')} FCFA
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {sch.allowFixedDiscount && (
                          <span className="badge bg-info-subtle text-info text-xs px-2 py-1" style={{ borderRadius: '4px' }}>
                            ☑ Fixe
                          </span>
                        )}
                        {sch.allowPercentDiscount && (
                          <span className="badge bg-success-subtle text-success text-xs px-2 py-1" style={{ borderRadius: '4px' }}>
                            ☑ Pourcentage ({sch.maxDiscountPercent}%)
                          </span>
                        )}
                        {!sch.allowFixedDiscount && !sch.allowPercentDiscount && (
                          <span className="text-xs text-muted">Aucune remise</span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleOpenEdit(sch)}
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleArchive(sch)}
                          title="Archiver"
                        >
                          <Archive size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {schedules.length > 0 && (
              <tfoot style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                <tr>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                    Total Cumulé Grille Tarifaire
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    {grandTotals.totalRegistration.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    {grandTotals.totalTuition.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#1e40af', fontSize: '1rem', backgroundColor: '#dbeafe' }}>
                    {grandTotals.totalAnnual.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modale de création / édition */}
      <TuitionFeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModal}
        initialData={editingSchedule}
        existingLevels={existingLevelCodes}
      />
    </div>
  );
};
