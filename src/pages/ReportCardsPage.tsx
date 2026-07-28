import React, { useState, useMemo } from 'react';
import { SessionSelector } from '../components/academic/results/SessionSelector';
import { useReportCards } from '../hooks/academic/reports/useReportCards';
import { IncompleteStudentsModal } from '../components/academic/reports/IncompleteStudentsModal';
import { ReportCardPreviewModal } from '../components/academic/reports/ReportCardPreviewModal';
import { AssessmentSession } from '../services/academic/sessions/types';
import { CompiledDocument } from '../services/documents/types';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Users,
  Eye,
  Download,
  Printer,
  RefreshCw,
  Award,
} from 'lucide-react';

export default function ReportCardsPage() {
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
    await generateReportCards();
  };

  const handlePreviewIndividual = async (studentId: string) => {
    const doc = await previewStudent(studentId);
    if (doc) {
      setActivePreviewDoc(doc);
      setIsPreviewModalOpen(true);
    }
  };

  return (
    <div className="container-fluid p-4">
      {/* En-tête de la page */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Bulletins scolaires
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Génération automatisée, impression et archivage sécurisé par QR Code des bulletins par classe.
          </p>
        </div>
      </div>

      {/* Sélecteur multi-critères : Année, Classe, Type, Période, Session */}
      <SessionSelector onSessionSelect={handleSessionSelect} selectedSessionId={sessionId} />

      {activeSession && (
        <>
          {/* Cartes d'indicateurs synthétiques */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <div className="card p-3 shadow-sm" style={{ borderRadius: '10px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} color="#2563eb" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Nombre d'élèves</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1e293b' }}>{validation.totalStudents}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card p-3 shadow-sm" style={{ borderRadius: '10px', borderLeft: '4px solid #16a34a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={20} color="#16a34a" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Bulletins prêts</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#16a34a' }}>{validation.readyCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card p-3 shadow-sm" style={{ borderRadius: '10px', borderLeft: `4px solid ${validation.incompleteCount > 0 ? '#e11d48' : '#94a3b8'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: validation.incompleteCount > 0 ? '#fff1f2' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={20} color={validation.incompleteCount > 0 ? '#e11d48' : '#94a3b8'} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Bulletins incomplets</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: validation.incompleteCount > 0 ? '#e11d48' : '#64748b' }}>{validation.incompleteCount}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation & Bouton principal de génération */}
          <div className="card p-4 shadow-sm mb-4" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            {!validation.isReadyForGeneration ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertTriangle size={24} color="#e11d48" />
                  <div>
                    <div style={{ fontWeight: 700, color: '#be123c', fontSize: '1rem' }}>
                      Tous les résultats ne sont pas encore prêts.
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                      Des notes, rangs ou appréciations manquent pour {validation.incompleteCount} élève(s).
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-outline-danger text-sm"
                  onClick={() => setIsIncompleteModalOpen(true)}
                  style={{ fontWeight: 600 }}
                >
                  Voir les élèves concernés
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle size={24} color="#16a34a" />
                  <div>
                    <div style={{ fontWeight: 700, color: '#15803d', fontSize: '1rem' }}>
                      Tous les résultats sont validés ({validation.totalStudents} élèves prêts).
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                      Prêt pour la génération automatique avec sécurisation par QR Code.
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{
                    padding: '10px 24px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    backgroundColor: '#2563eb',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {generating ? (
                    <>
                      <RefreshCw size={18} className="spin" /> Génération en cours...
                    </>
                  ) : (
                    <>📄 Générer les bulletins</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Vue Après Génération */}
          {generatedResult && (
            <div className="card p-4 shadow-sm mb-4" style={{ borderRadius: '12px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle size={24} color="#16a34a" />
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#15803d' }}>
                    ✓ {generatedResult.generatedCount} bulletins générés avec succès
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-outline-success text-sm" onClick={downloadClassSet}>
                    <Download size={16} style={{ marginRight: '6px' }} /> Télécharger tous les PDF
                  </button>
                  <button className="btn btn-outline-primary text-sm" onClick={printClassSet}>
                    <Printer size={16} style={{ marginRight: '6px' }} /> Imprimer la classe
                  </button>
                  <button
                    className="btn btn-primary text-sm"
                    onClick={() => {
                      if (generatedResult.reportCards.length > 0) {
                        handlePreviewIndividual(generatedResult.reportCards[0].studentId);
                      }
                    }}
                  >
                    <Eye size={16} style={{ marginRight: '6px' }} /> Prévisualiser
                  </button>
                </div>
              </div>

              {/* Tableau de la classe */}
              <div className="table-responsive" style={{ backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <table className="table table-hover align-middle m-0" style={{ fontSize: '0.875rem' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th>Matricule</th>
                      <th>Élève</th>
                      <th style={{ textAlign: 'center' }}>Moyenne</th>
                      <th style={{ textAlign: 'center' }}>Rang</th>
                      <th>Décision</th>
                      <th>Empreinte QR</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedResult.reportCards.map((st) => (
                      <tr key={st.studentId}>
                        <td><code>{st.matricule}</code></td>
                        <td><strong>{st.studentName}</strong></td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#2563eb' }}>
                          {st.average !== null ? `${st.average.toFixed(2)} / 20` : '-'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                          {st.rank ? `${st.rank}${st.rank === 1 ? 'er' : 'ème'}` : '-'}
                        </td>
                        <td>
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            {st.decision || 'PASSE'}
                          </span>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.75rem', color: '#64748b' }}>{st.checksum?.substring(0, 16)}...</code>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              className="btn btn-sm btn-light"
                              title="Prévisualiser"
                              onClick={() => handlePreviewIndividual(st.studentId)}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              className="btn btn-sm btn-light"
                              title="Télécharger"
                              onClick={() => handlePreviewIndividual(st.studentId)}
                            >
                              <Download size={14} />
                            </button>
                            <button
                              className="btn btn-sm btn-light"
                              title="Imprimer"
                              onClick={() => handlePreviewIndividual(st.studentId)}
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              className="btn btn-sm btn-light"
                              title="Regénérer"
                              onClick={() => handleGenerate()}
                            >
                              <RefreshCw size={14} />
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
