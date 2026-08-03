import React, { useState } from 'react';
import { SessionSelector } from '../components/academic/results/SessionSelector';
import { useReportCards } from '../hooks/academic/reports/useReportCards';
import { IncompleteStudentsModal } from '../components/academic/reports/IncompleteStudentsModal';
import { ReportCardPreviewModal } from '../components/academic/reports/ReportCardPreviewModal';
import { AssessmentSession } from '../services/academic/sessions/types';
import { CompiledDocument } from '../services/documents/types';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Users,
  Eye,
  Download,
  Printer,
  RefreshCw,
  Award,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function ReportCardsPage() {
  const confirm = useConfirm();
  const { addNotification } = useToast();

  const [selectedSession, setSelectedSession] = useState<AssessmentSession | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('cls-1');
  const [levelCode, setLevelCode] = useState<string>('CP1');
  const [isIncompleteModalOpen, setIsIncompleteModalOpen] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [activePreviewDoc, setActivePreviewDoc] = useState<CompiledDocument | null>(null);

  // Session courante ou fallback par défaut pour affichage direct
  const activeSession = selectedSession || {
    id: 'sess-default-2026',
    academicYearId: 'ay-2026',
    assessmentTypeId: 'MONTHLY',
    assessmentPeriodId: 'p1',
    classroomId: selectedClassroomId || 'cls-1',
    title: 'Composition Mensuelle N°1',
    status: 'OPEN',
    locked: false,
    published: false,
    createdBy: 'Direction',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sessionId = activeSession.id;

  const {
    validation,
    loadingValidation,
    generating,
    generatedResult,
    error,
    generateReportCards,
    previewStudent,
    printClassSet,
    downloadClassSet,
  } = useReportCards(sessionId, selectedClassroomId, levelCode);

  const handleSessionSelect = (session: AssessmentSession | null, classroomId: string, lCode: string) => {
    setSelectedSession(session);
    setSelectedClassroomId(classroomId);
    setLevelCode(lCode);
  };

  const handleGenerate = async () => {
    const ok = await confirm({
      title: "Génération des bulletins",
      message: `Lancer la génération des bulletins sécurisés pour la classe (${validation.totalStudents} élèves) ?`,
      confirmText: 'Lancer la génération',
      cancelText: 'Annuler',
      variant: 'info',
    });
    if (ok) {
      await generateReportCards();
      addNotification('success', 'Bulletins de la classe générés avec succès !');
    }
  };

  const handlePreviewIndividual = async (studentId: string) => {
    const doc = await previewStudent(studentId);
    if (doc) {
      setActivePreviewDoc(doc);
      setIsPreviewModalOpen(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── HEADER ET ACTIONS UNIFIÉS SAAS ─────────────────────────────────── */}
      <div className="card shadow-sm p-4" style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Bulletins Scolaires & Éditions
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Génération automatisée, impression et sécurisation par QR Code des bulletins d'évaluation
            </p>
          </div>

          {generatedResult && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={downloadClassSet} style={{ fontWeight: 600 }}>
                <Download size={15} /> Télécharger Tous PDF
              </button>
              <button className="btn btn-outline btn-sm" onClick={printClassSet} style={{ fontWeight: 600 }}>
                <Printer size={15} /> Imprimer la Classe
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sélecteur multi-critères : Année, Classe, Type, Période, Session */}
      <SessionSelector onSessionSelect={handleSessionSelect} selectedSessionId={sessionId} />

      {activeSession && (
        <>
          {/* ── CARTES STATISTIQUES KPIS SAAS GRADIENTS ───────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            
            {/* Total Élèves - Royal Blue */}
            <div className="card-hover" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Classe</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Effectif Élèves</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{validation.totalStudents}</div>
            </div>

            {/* Bulletins Prêts - Émeraude */}
            <div className="card-hover" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Complets</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Bulletins Prêts</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{validation.readyCount}</div>
            </div>

            {/* Bulletins Incomplets - Rose/Ambre */}
            <div className="card-hover" style={{ background: validation.incompleteCount > 0 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #64748b 0%, #475569 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Manquants</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Bulletins Incomplets</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{validation.incompleteCount}</div>
            </div>

          </div>

          {/* ── BANNIÈRE DE VALIDATION & GÉNÉRATION ──────────────────────────── */}
          <div className="card shadow-sm p-4" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', background: validation.isReadyForGeneration ? '#f0fdf4' : '#fff1f2' }}>
            {!validation.isReadyForGeneration ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#be123c', fontSize: '1.05rem' }}>
                      La classe contient des copies non saisies ou non validées
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                      {validation.incompleteCount} élève(s) ont des notes ou appréciations manquantes.
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setIsIncompleteModalOpen(true)}
                  style={{ color: '#be123c', borderColor: '#fecdd3', fontWeight: 700 }}
                >
                  Voir la liste des élèves concernés
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#15803d', fontSize: '1.05rem' }}>
                      Tous les résultats sont prêts ({validation.totalStudents} élèves validés)
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                      Prêt pour la génération automatisée et la sécurisation avec filigrane et QR Code.
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{ fontWeight: 700, padding: '10px 20px' }}
                >
                  {generating ? (
                    <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Génération en cours...</>
                  ) : (
                    <><FileText size={16} /> Générer tous les bulletins</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ── TABLEAU DES BULLETINS GÉNÉRÉS ────────────────────────────────── */}
          {generatedResult && (
            <div className="card shadow-sm" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                    {generatedResult.generatedCount} bulletins générés et certifiés
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline btn-sm" onClick={downloadClassSet} style={{ fontWeight: 600 }}>
                    <Download size={14} /> PDF Classe
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={printClassSet} style={{ fontWeight: 600 }}>
                    <Printer size={14} /> Imprimer Tout
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Matricule</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Élève</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Moyenne / 20</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Rang</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Décision</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Empreinte QR</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedResult.reportCards.map((st) => (
                      <tr key={st.studentId} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#64748b', fontSize: '0.8125rem' }}>
                          {st.matricule}
                        </td>
                        
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                          {st.studentName}
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 900, color: '#2563eb', fontSize: '1rem', fontFamily: "'Outfit', sans-serif" }}>
                          {st.average !== null ? `${st.average.toFixed(2)} / 20` : '—'}
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>
                          {st.rank ? `${st.rank}${st.rank === 1 ? 'er' : 'ème'}` : '—'}
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span className="badge badge-success" style={{ fontWeight: 700 }}>
                            {st.decision || 'PASSE'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <code style={{ fontSize: '0.725rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {st.checksum?.substring(0, 16)}...
                          </code>
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Prévisualiser"
                              onClick={() => handlePreviewIndividual(st.studentId)}
                            >
                              <Eye size={15} color="#2563eb" />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Télécharger"
                              onClick={() => handlePreviewIndividual(st.studentId)}
                            >
                              <Download size={15} color="#16a34a" />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Imprimer"
                              onClick={() => handlePreviewIndividual(st.studentId)}
                            >
                              <Printer size={15} color="#475569" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modales d'interaction */}
      <IncompleteStudentsModal
        isOpen={isIncompleteModalOpen}
        onClose={() => setIsIncompleteModalOpen(false)}
        students={validation.incompleteStudents}
      />

      <ReportCardPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        document={activePreviewDoc}
      />
    </div>
  );
}
