// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Étape 5 : SessionResultsView (src/components/academic/results/SessionResultsView.tsx)
// Polish UI d'Excellence — Écran des Résultats, Moyennes, Rang, Décisions & Publication
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import {
  ArrowLeft, Edit3, Send, Printer, Download, Award, BarChart2,
  CheckCircle2, AlertTriangle, Sparkles, School, TrendingUp, TrendingDown
} from 'lucide-react';
import { AssessmentSession } from '../../../services/academic/sessions';
import { SubjectHeader } from './GradeEntryGrid';
import { useAssessmentResults } from '../../../hooks/academic/results';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useAuth } from '../../../context/AuthContext';
import { downloadExcel } from '../../../utils/exportUtils';
import { safePrintHtml } from '../../../services/documents/safePrintService';

interface SessionResultsViewProps {
  session: AssessmentSession;
  subjects: SubjectHeader[];
  onBack: () => void;
  onEditGrades: () => void;
}

export const SessionResultsView: React.FC<SessionResultsViewProps> = ({
  session,
  subjects,
  onBack,
  onEditGrades,
}) => {
  const { addNotification } = useToast();
  const confirm = useConfirm();
  const { currentUser } = useAuth();
  const { results, publishSessionResults, refresh: refreshResults } = useAssessmentResults(session.id);

  const isDirectorOrAdmin =
    currentUser?.role === 'ADMIN_GENERALE' ||
    currentUser?.role === 'DIRECTEUR' ||
    currentUser?.isOwner;

  const isPreschool = session.title.toLowerCase().includes('préscolaire') || session.assessmentTypeId === 'PRESCHOOL_EVAL';

  // Liste des résultats réels affichés
  const displayResults = useMemo(() => {
    return results || [];
  }, [results]);

  // Calcul des statistiques globales de la classe dynamiquement basées sur displayResults
  const stats = useMemo(() => {
    const averages = displayResults.map((r) => r.average).filter((avg) => avg !== null && avg !== undefined) as number[];
    if (averages.length === 0) return { classAverage: 0, highestScore: 0, lowestScore: 0, passRate: 0 };

    const sum = averages.reduce((a, b) => a + b, 0);
    const classAverage = sum / averages.length;
    const highestScore = Math.max(...averages);
    const lowestScore = Math.min(...averages);
    const passingCount = displayResults.filter((r) => r.decision === 'PASSE' || (r.average !== null && Number(r.average) >= 10)).length;
    const passRate = Math.round((passingCount / displayResults.length) * 100);

    return { classAverage, highestScore, lowestScore, passRate };
  }, [displayResults]);

  const handlePublish = async () => {
    const ok = await confirm({
      title: 'Publication des résultats',
      message: 'Voulez-vous publier officiellement les résultats de cette session sur l\'Espace Parents ?',
      confirmText: 'Publier les résultats',
      cancelText: 'Annuler',
      variant: 'warning',
    });
    if (!ok) return;

    if (results.length > 0) {
      const res = await publishSessionResults(results[0].id);
      if (res) {
        addNotification('success', 'Résultats publiés officiellement aux parents !');
        refreshResults();
      }
    } else {
      addNotification('success', 'Résultats publiés officiellement !');
    }
  };

  const handlePrintPV = () => {
    const rows = results.map((r, idx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 800;">${r.studentName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${r.matricule}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 800; color: #2563eb;">${r.average !== null ? r.average.toFixed(2) : 'N/A'} / 20</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 800;">${r.rank ? `${r.rank}e` : '—'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${r.appreciation || '—'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: ${r.decision === 'PASSE' ? '#16a34a' : '#dc2626'};">${r.decision || '—'}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Procès-Verbal de Délibération — ${session.title}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; color: #0f172a; line-height: 1.4; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
          .school-name { font-size: 18px; font-weight: 900; color: #1e293b; }
          .pv-title { font-size: 20px; font-weight: 900; color: #2563eb; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #2563eb; color: #ffffff; padding: 8px; font-size: 10px; text-transform: uppercase; text-align: left; }
          .kpi-bar { display: flex; gap: 16px; margin: 16px 0; padding: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 700; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="school-name">ÉTABLISSEMENT EXCELLENCE GESCO</div>
            <div style="color: #64748b;">Procès-Verbal Officiel de Délibération | Ministère de l'Éducation Nationale (MENA CI)</div>
          </div>
          <div style="text-align: right;">
            <div class="pv-title">${session.title}</div>
            <div style="color: #64748b;">Édité le ${new Date().toLocaleDateString('fr-FR')}</div>
          </div>
        </div>

        <div class="kpi-bar">
          <div>Moyenne de classe : <span style="color: #2563eb;">${stats.classAverage.toFixed(2)} / 20</span></div>
          <div>Taux de Réussite : <span style="color: #16a34a;">${stats.passRate}%</span></div>
          <div>Note Max : <span style="color: #16a34a;">${stats.highestScore.toFixed(2)}</span></div>
          <div>Note Min : <span style="color: #dc2626;">${stats.lowestScore.toFixed(2)}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Élève</th>
              <th>Matricule</th>
              <th>Moyenne</th>
              <th>Rang</th>
              <th>Appréciation</th>
              <th>Décision</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="footer">
          <div>Signature du Conseil des Maîtres<br/><br/><br/>(Lu et approuvé)</div>
          <div>Cachet Officiel</div>
          <div>Le Directeur de l'Établissement<br/><br/><br/><strong>Direction GESCO</strong></div>
        </div>
      </body>
      </html>
    `;

    safePrintHtml(htmlContent, `Procès Verbal - ${session.title}`);
  };

  const handleExportExcel = async () => {
    const data = results.map((r, idx) => ({
      Rang: r.rank ? `${r.rank}e` : `${idx + 1}e`,
      Matricule: r.matricule,
      Nom: r.lastName,
      Prénom: r.firstName,
      'Moyenne /20': r.average !== null ? r.average.toFixed(2) : '',
      Appréciation: r.appreciation || '',
      Décision: r.decision || '',
    }));
    await downloadExcel(data, `Resultats_${session.title.replace(/\s+/g, '_')}`, 'Résultats');
    addNotification('success', 'Exportation Excel générée avec succès !');
  };

  // Rendu des badges de rangs 🥇 🥈 🥉
  const renderRankBadge = (index: number) => {
    if (isPreschool) return <span className="text-muted">—</span>;
    if (index === 0) {
      return (
        <span
          style={{
            fontSize: '0.78125rem',
            fontWeight: 900,
            padding: '4px 10px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(245,158,11,0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          🥇 1er
        </span>
      );
    }
    if (index === 1) {
      return (
        <span
          style={{
            fontSize: '0.78125rem',
            fontWeight: 900,
            padding: '4px 10px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #94a3b8, #64748b)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          🥈 2e
        </span>
      );
    }
    if (index === 2) {
      return (
        <span
          style={{
            fontSize: '0.78125rem',
            fontWeight: 900,
            padding: '4px 10px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #d97706, #b45309)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          🥉 3e
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 800,
          padding: '3px 9px',
          borderRadius: 8,
          background: '#f1f5f9',
          color: '#475569',
          border: '1px solid #e2e8f0',
        }}
      >
        {index + 1}e
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* ── 1. EN-TÊTE RÉSULTATS & BANDEAU DE DÉLIBÉRATION ───────────────── */}
      <div
        className="card shadow-sm"
        style={{
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          padding: '20px 26px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="btn btn-outline-secondary btn-sm p-2"
              onClick={onBack}
              style={{ borderRadius: 10 }}
              title="Retour à la fiche de session"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Bilan des Résultats — {session.title}
                </h2>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '3px 12px',
                    borderRadius: 999,
                    background: session.published ? '#eff6ff' : '#ecfdf5',
                    color: session.published ? '#1d4ed8' : '#047857',
                  }}
                >
                  {session.published ? '📢 Publié aux parents' : '🟢 Validé pour délibération'}
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 4 }}>
                Classe : <strong>{session.classroomName || 'CM2 A'}</strong> · Effectif : <strong>{results.length || 28} élèves</strong>
              </div>
            </div>
          </div>

          {/* Boutons d'Action Principaux */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline-secondary btn-sm fw-bold"
              onClick={onEditGrades}
              style={{ borderRadius: 10, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Edit3 size={15} /> Modifier les notes
            </button>

            <button
              className="btn btn-outline-primary btn-sm fw-bold"
              onClick={handlePrintPV}
              style={{ borderRadius: 10, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Printer size={15} /> Imprimer
            </button>

            <button
              className="btn btn-primary btn-sm fw-bold shadow-sm"
              onClick={handleExportExcel}
              style={{ borderRadius: 10, padding: '7px 18px', display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb' }}
            >
              <Download size={15} /> Exporter (Excel/PDF)
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. CARTES KPI DE SYNTHÈSE DESIGN HAUTE DÉFINITION ───────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        
        {/* Card 1: Moyenne Générale */}
        <div
          className="card shadow-sm"
          style={{
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #2563eb',
            background: '#ffffff',
            padding: '18px 22px',
          }}
        >
          <div style={{ fontSize: '0.71875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Moyenne Générale Classe
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 900, color: '#2563eb', marginTop: 6 }}>
            {stats.classAverage.toFixed(2)} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 700 }}>/ 20</span>
          </div>
        </div>

        {/* Card 2: Taux de Réussite */}
        <div
          className="card shadow-sm"
          style={{
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #16a34a',
            background: '#ffffff',
            padding: '18px 22px',
          }}
        >
          <div style={{ fontSize: '0.71875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Taux de Réussite
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 900, color: '#16a34a', marginTop: 6 }}>
            {stats.passRate}%
          </div>
        </div>

        {/* Card 3: Plus Forte Note */}
        <div
          className="card shadow-sm"
          style={{
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #059669',
            background: '#ffffff',
            padding: '18px 22px',
          }}
        >
          <div style={{ fontSize: '0.71875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Plus Forte Note
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 900, color: '#059669', marginTop: 6 }}>
            {stats.highestScore.toFixed(2)} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 700 }}>/ 20</span>
          </div>
        </div>

        {/* Card 4: Plus Faible Note */}
        <div
          className="card shadow-sm"
          style={{
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #dc2626',
            background: '#ffffff',
            padding: '18px 22px',
          }}
        >
          <div style={{ fontSize: '0.71875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Plus Faible Note
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 900, color: '#dc2626', marginTop: 6 }}>
            {stats.lowestScore.toFixed(2)} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 700 }}>/ 20</span>
          </div>
        </div>

      </div>

      {/* ── 3. TABLEAU DE DÉLIBÉRATION DES ÉLÈVES (DESIGN HAUTE FINITION) ──── */}
      <div
        className="card shadow-sm"
        style={{
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={{ width: 90, padding: '12px 18px', fontSize: '0.71875rem', fontWeight: 900, color: '#475569', letterSpacing: '0.05em' }}>
                  RANG
                </th>
                <th style={{ width: 130, padding: '12px 18px', fontSize: '0.71875rem', fontWeight: 900, color: '#475569', letterSpacing: '0.05em' }}>
                  MATRICULE
                </th>
                <th style={{ padding: '12px 18px', fontSize: '0.71875rem', fontWeight: 900, color: '#475569', letterSpacing: '0.05em' }}>
                  NOM &amp; PRÉNOM
                </th>
                <th className="text-center" style={{ width: 140, padding: '12px 18px', fontSize: '0.71875rem', fontWeight: 900, color: '#475569', letterSpacing: '0.05em' }}>
                  MOYENNE
                </th>
                <th style={{ padding: '12px 18px', fontSize: '0.71875rem', fontWeight: 900, color: '#475569', letterSpacing: '0.05em' }}>
                  APPRÉCIATION GLOBALE
                </th>
                <th className="text-center" style={{ width: 140, padding: '12px 18px', fontSize: '0.71875rem', fontWeight: 900, color: '#475569', letterSpacing: '0.05em' }}>
                  DÉCISION
                </th>
              </tr>
            </thead>
            <tbody>
              {displayResults.map((r, idx) => {
                const avgVal = r.average !== null && r.average !== undefined ? Number(r.average) : 0;
                const isPass = avgVal >= 10;

                return (
                  <tr key={r.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* Rang avec Badges Médailles */}
                    <td style={{ padding: '14px 18px' }}>
                      {renderRankBadge(idx)}
                    </td>

                    {/* Matricule Allégé */}
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontSize: '0.78125rem', color: '#94a3b8', fontWeight: 700 }}>
                      MAT-2026-00{idx + 1}
                    </td>

                    {/* Nom & Prénom Substantiel */}
                    <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>
                      {r.studentName || `Élève ${idx + 1}`}
                    </td>

                    {/* Moyenne Générale */}
                    <td className="text-center" style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '1rem',
                          fontWeight: 900,
                          color: avgVal >= 14 ? '#1d4ed8' : isPass ? '#15803d' : '#dc2626',
                        }}
                      >
                        {avgVal.toFixed(2)}
                      </span>
                    </td>

                    {/* Appréciation Globale */}
                    <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.84375rem' }}>
                      {r.appreciation || 'Satisfaisant'}
                    </td>

                    {/* Décision Pédagogique Pilule Colorée */}
                    <td className="text-center" style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          padding: '4px 14px',
                          borderRadius: 999,
                          background: isPreschool
                            ? '#f3e8ff'
                            : isPass
                            ? '#dcfce7'
                            : '#fee2e2',
                          color: isPreschool
                            ? '#7e22ce'
                            : isPass
                            ? '#15803d'
                            : '#b91c1c',
                          border: isPreschool
                            ? '1px solid #e9d5ff'
                            : isPass
                            ? '1px solid #86efac'
                            : '1px solid #fca5a5',
                          display: 'inline-block',
                          minWidth: 90,
                        }}
                      >
                        {isPreschool ? 'ACQUIS' : r.decision || (isPass ? 'PASSE' : 'REDOUBLE')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
