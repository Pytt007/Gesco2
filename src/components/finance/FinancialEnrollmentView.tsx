import React, { useState } from 'react';
import { useStudentFinancialEnrollment } from '../../hooks/finance/useStudentFinancialEnrollment';
import { StudentFinancialEnrollment, DiscountType, TuitionLevelCode } from '../../services/finance/types';
import { StudentFinancialEnrollmentModal } from './StudentFinancialEnrollmentModal';
import { Plus, Search, Edit2, Archive, CheckCircle2, AlertCircle, DollarSign, UserCheck, Calendar, X } from 'lucide-react';
import { useAcademicYears } from '../../hooks/academic';

export const FinancialEnrollmentView: React.FC = () => {
  const { academicYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>('ay-2026');

  const {
    enrollments,
    loading,
    error,
    submitting,
    summaryStatus,
    createEnrollment,
    updateEnrollment,
    archiveEnrollment,
  } = useStudentFinancialEnrollment(selectedYearId);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingEnrollment, setEditingEnrollment] = useState<StudentFinancialEnrollment | null>(null);
  const [search, setSearch] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredEnrollments = enrollments.filter(
    (e) =>
      e.studentName.toLowerCase().includes(search.toLowerCase()) ||
      e.matricule.toLowerCase().includes(search.toLowerCase()) ||
      e.className.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingEnrollment(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (enrollment: StudentFinancialEnrollment) => {
    setEditingEnrollment(enrollment);
    setModalOpen(true);
  };

  const handleSaveModal = async (data: {
    studentId: string;
    classroomId: string;
    levelCode: TuitionLevelCode;
    discountType: DiscountType;
    discountValue: number;
    customInstallments?: { number: number; amountDue: number }[];
  }) => {
    if (editingEnrollment) {
      const ok = await updateEnrollment(editingEnrollment.id, data);
      if (ok) {
        setSuccessMessage(`Dossier financier de ${editingEnrollment.studentName} mis à jour.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
      return ok;
    } else {
      const res = await createEnrollment(data);
      if (res) {
        setSuccessMessage('Dossier financier créé avec succès.');
        setTimeout(() => setSuccessMessage(null), 4000);
        return true;
      }
      return false;
    }
  };

  const handleArchive = async (enrollment: StudentFinancialEnrollment) => {
    if (window.confirm(`Voulez-vous vraiment archiver le dossier financier de ${enrollment.studentName} ?`)) {
      const ok = await archiveEnrollment(enrollment.id);
      if (ok) {
        setSuccessMessage(`Dossier financier de ${enrollment.studentName} archivé.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    }
  };

  return (
    <div className="container-fluid p-4">
      {/* En-tête de la page */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Inscription financière
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Création automatique du dossier financier des élèves, répartition en 8 échéances et gestion des remises.
          </p>
        </div>

        <button
          className="btn btn-primary text-sm"
          onClick={handleOpenCreate}
          disabled={submitting}
          style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> Nouvelle Inscription Financière
        </button>
      </div>

      {/* Cartes d'indicateurs financiers réactifs */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-3">
          <div className="card p-3 shadow-sm" style={{ borderRadius: '10px', borderLeft: '4px solid #2563eb' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Élèves Inscrits</span>
            <h3 style={{ margin: '4px 0 0 0', fontWeight: 800, color: '#0f172a' }}>{summaryStatus.totalEnrollmentsCount}</h3>
          </div>
        </div>

        <div className="col-12 col-md-3">
          <div className="card p-3 shadow-sm" style={{ borderRadius: '10px', borderLeft: '4px solid #059669' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Montant Total Net Due</span>
            <h3 style={{ margin: '4px 0 0 0', fontWeight: 800, color: '#059669' }}>
              {summaryStatus.totalNetRevenue.toLocaleString('fr-FR')} FCFA
            </h3>
          </div>
        </div>

        <div className="col-12 col-md-3">
          <div className="card p-3 shadow-sm" style={{ borderRadius: '10px', borderLeft: '4px solid #16a34a' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Montant Payé</span>
            <h3 style={{ margin: '4px 0 0 0', fontWeight: 800, color: '#16a34a' }}>
              {summaryStatus.totalPaidRevenue.toLocaleString('fr-FR')} FCFA
            </h3>
          </div>
        </div>

        <div className="col-12 col-md-3">
          <div className="card p-3 shadow-sm" style={{ borderRadius: '10px', borderLeft: '4px solid #dc2626' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Montant Restant</span>
            <h3 style={{ margin: '4px 0 0 0', fontWeight: 800, color: '#dc2626' }}>
              {summaryStatus.totalRemainingRevenue.toLocaleString('fr-FR')} FCFA
            </h3>
          </div>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div
        className="card shadow-sm mb-4"
        style={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', backgroundColor: '#ffffff' }}
      >
        <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={18} color="#2563eb" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Année Scolaire :</span>
            <select
              className="form-select text-sm fw-semibold"
              style={{ width: '180px' }}
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

          <div className="search-bar-wrapper" style={{ width: '320px' }}>
            <Search size={16} className="search-bar-icon" />
            <input
              type="text"
              className="search-bar-input"
              placeholder="Rechercher élève, matricule, classe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-bar-clear" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerte Erreur / Succès */}
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

      {/* Tableau récapitulatif des inscriptions financières */}
      <div
        className="card shadow-sm mb-4"
        style={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}
      >
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Élève</th>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Classe & Niveau</th>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Frais Inscription</th>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Remise</th>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', textAlign: 'right', backgroundColor: '#eff6ff' }}>
                  Montant Net Due
                </th>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Restant / Payé</th>
                <th style={{ padding: '14px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    Chargement des dossiers financiers en cours...
                  </td>
                </tr>
              ) : filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    Aucun dossier financier trouvé. Cliquez sur "Nouvelle Inscription Financière".
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((enr) => (
                  <tr key={enr.id}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem' }}>
                          {enr.studentName.charAt(0)}
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.875rem', color: '#1e293b' }}>{enr.studentName}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Matricule : {enr.matricule}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge bg-light text-dark fw-bold me-2">{enr.className}</span>
                      <span className="text-xs text-muted">({enr.levelCode})</span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.875rem', color: '#334155' }}>
                      {enr.registrationFee.toLocaleString('fr-FR')} FCFA
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.875rem', color: enr.discountAmount > 0 ? '#166534' : '#64748b' }}>
                      {enr.discountAmount > 0 ? `-${enr.discountAmount.toLocaleString('fr-FR')} FCFA` : 'Aucune'}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.9375rem', fontWeight: 700, color: '#1d4ed8', backgroundColor: '#f8fafc' }}>
                      {enr.netTotalDue.toLocaleString('fr-FR')} FCFA
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.8125rem' }}>
                      <span style={{ display: 'block', color: '#dc2626', fontWeight: 600 }}>
                        Restant : {enr.remainingBalance.toLocaleString('fr-FR')} FCFA
                      </span>
                      <span style={{ color: '#16a34a', fontSize: '0.75rem' }}>
                        Payé : {enr.totalPaid.toLocaleString('fr-FR')} FCFA ({enr.installmentsCount} éch.)
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleOpenEdit(enr)}
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleArchive(enr)}
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
          </table>
        </div>
      </div>

      {/* Modale d'inscription financière */}
      <StudentFinancialEnrollmentModal
        isOpen={modalOpen}
        academicYearId={selectedYearId}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModal}
        initialData={editingEnrollment}
      />
    </div>
  );
};
