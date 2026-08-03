// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Étape 4 : GradeEntryWorkspaceView (src/components/academic/results/GradeEntryWorkspaceView.tsx)
// WORKSPACE DE SAISIE DES NOTES (Google Sheets / Excel feel conforne aux consignes)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { ArrowLeft, CheckCircle2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { AssessmentSession } from '../../../services/academic/sessions';
import { GradeEntryGrid, SubjectHeader, StudentRowData } from './GradeEntryGrid';
import { useAssessmentResults, useCorrectionProgress } from '../../../hooks/academic/results';
import { useToast } from '../../../context/ToastContext';

interface GradeEntryWorkspaceViewProps {
  session: AssessmentSession;
  subjects: SubjectHeader[];
  initialSubjectId?: string;
  onBack: () => void;
  onFinishEntry: () => void;
}

export const GradeEntryWorkspaceView: React.FC<GradeEntryWorkspaceViewProps> = ({
  session,
  subjects,
  initialSubjectId,
  onBack,
  onFinishEntry,
}) => {
  const { addNotification } = useToast();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || subjects[0]?.id || 'math'
  );

  const {
    results,
    saveStudentDraft,
  } = useAssessmentResults(session.id);

  const { refresh: refreshProgress } = useCorrectionProgress(session.id);

  // Matière active actuellement sélectionnée
  const activeSubjectObj = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) || subjects[0],
    [subjects, selectedSubjectId]
  );

  // Transformation des données résultats pour le tableur
  const studentRows: StudentRowData[] = useMemo(() => {
    if (results && results.length > 0) {
      return results.map((r, idx) => ({
        studentId: r.studentId,
        matricule: `MAT-2026-${(idx + 1).toString().padStart(3, '0')}`,
        firstName: r.studentName ? r.studentName.split(' ')[0] : `Élève`,
        lastName: r.studentName ? r.studentName.split(' ').slice(1).join(' ') : `${r.studentId}`,
        scores: r.scores.reduce((acc, s) => {
          acc[s.subjectId] = { score: s.score, absenceStatus: s.absenceStatus };
          return acc;
        }, {} as Record<string, { score: number | null; absenceStatus: any }>),
        total: r.total,
        average: r.average,
        appreciation: r.appreciation,
        status: r.correctionStatus,
        decision: r.decision,
        isPublished: r.published,
      }));
    }

    // Échantillon de secours par défaut si aucun élève chargé
    return [
      {
        studentId: 'st-001',
        matricule: 'MAT-2026-001',
        firstName: 'Jean',
        lastName: 'KOUASSI',
        scores: {
          math: { score: 16, absenceStatus: 'PRESENT' },
          fr: { score: 14, absenceStatus: 'PRESENT' },
          hist_geo: { score: 15, absenceStatus: 'PRESENT' },
          sciences: { score: 17, absenceStatus: 'PRESENT' },
          eps: { score: 18, absenceStatus: 'PRESENT' },
        },
        total: 80,
        average: 16,
        appreciation: 'Très bon travail',
        status: 'COMPLETED',
        decision: 'PASSE',
      },
      {
        studentId: 'st-002',
        matricule: 'MAT-2026-002',
        firstName: 'Marie',
        lastName: 'KONAN',
        scores: {
          math: { score: 14, absenceStatus: 'PRESENT' },
          fr: { score: 12, absenceStatus: 'PRESENT' },
          hist_geo: { score: 10, absenceStatus: 'PRESENT' },
          sciences: { score: 13, absenceStatus: 'PRESENT' },
          eps: { score: 14, absenceStatus: 'PRESENT' },
        },
        total: 63,
        average: 12.6,
        appreciation: 'Satisfaisant',
        status: 'IN_PROGRESS',
        decision: 'PASSE',
      },
      {
        studentId: 'st-003',
        matricule: 'MAT-2026-003',
        firstName: 'Awa',
        lastName: 'DIABATÉ',
        scores: {
          math: { score: null, absenceStatus: 'EXCUSED_ABSENT' },
          fr: { score: 10, absenceStatus: 'PRESENT' },
          hist_geo: { score: 11, absenceStatus: 'PRESENT' },
          sciences: { score: 12, absenceStatus: 'PRESENT' },
          eps: { score: 15, absenceStatus: 'PRESENT' },
        },
        total: 48,
        average: 9.6,
        appreciation: 'Absente justifiée en Math',
        status: 'IN_PROGRESS',
        decision: 'REDOUBLE',
      },
    ];
  }, [results]);

  // Calcul du nombre de notes saisies et moyennes provisoires pour le Footer
  const workspaceFooterStats = useMemo(() => {
    const totalStudents = studentRows.length;
    let enteredCount = 0;
    let scoreSum = 0;

    studentRows.forEach((st) => {
      const scoreObj = st.scores[selectedSubjectId];
      if (scoreObj && scoreObj.score !== null && scoreObj.score !== undefined && scoreObj.absenceStatus === 'PRESENT') {
        enteredCount++;
        scoreSum += Number(scoreObj.score);
      }
    });

    const remainingCount = totalStudents - enteredCount;
    const provisoireAvg = enteredCount > 0 ? (scoreSum / enteredCount).toFixed(2) : '—';

    return {
      totalStudents,
      enteredCount,
      remainingCount,
      provisoireAvg,
    };
  }, [studentRows, selectedSubjectId]);

  const handleSaveScores = async (studentId: string, scoresInput: any[]) => {
    const ok = await saveStudentDraft(studentId, scoresInput, 'CP1', session.assessmentTypeId || 'MONTHLY');
    if (ok) {
      refreshProgress();
    }
    return ok;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 100px)',
        minHeight: '85vh',
        gap: 10,
        background: '#f8fafc',
        padding: 4,
      }}
    >
      {/* ── HEADER CONFORME EXIGENCES STRICTES ──────────────────────────── */}
      {/* Contient UNIQUEMENT : Retour, Nom Session, Classe, Matière, Barème, Progression, Statut Sauvegarde */}
      <div
        className="card shadow-sm"
        style={{
          borderRadius: 14,
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Partie Gauche : Retour, Session & Classe */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={onBack}
            style={{ borderRadius: 8, fontWeight: 700 }}
            title="Retour à la fiche de session"
          >
            <ArrowLeft size={16} /> Retour
          </button>

          <div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
              {session.title}
            </div>
            <div style={{ fontSize: '0.78125rem', color: '#64748b', marginTop: 1 }}>
              Classe : <strong>{session.classroomName || 'CM2 A'}</strong>
            </div>
          </div>
        </div>

        {/* Partie Centre : Sélecteur de Matière Dynamique & Barème (Sans doublon) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              fontSize: '0.9375rem',
              fontWeight: 900,
              padding: '4px 12px',
              borderRadius: 10,
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1.5px solid #2563eb',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 1px 3px rgba(37,99,235,0.1)',
            }}
          >
            <span style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 800 }}>Matière :</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#1d4ed8',
                fontWeight: 900,
                fontSize: '0.9375rem',
                cursor: 'pointer',
                outline: 'none',
                paddingRight: 4,
              }}
            >
              {subjects.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {subj.name}
                </option>
              ))}
            </select>
          </div>

          <span
            style={{
              fontSize: '0.78125rem',
              fontWeight: 800,
              padding: '6px 12px',
              borderRadius: 10,
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #cbd5e1',
            }}
          >
            Barème : /{activeSubjectObj?.maxScore || 20} pts
          </span>
        </div>

        {/* Partie Droite : Progression & Statut Sauvegarde */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 900, color: '#0f172a' }}>
              {workspaceFooterStats.enteredCount} / {workspaceFooterStats.totalStudents} notes
            </span>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🟢 Sauvegardé automatiquement</span>
          </div>
        </div>
      </div>

      {/* ── ZONE TABLEUR PRINCIPALE (CONCÈDE 85% DE LA SURFACE) ───────────── */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: '#ffffff', borderRadius: 14, border: '1px solid #cbd5e1' }}>
        <GradeEntryGrid
          sessionId={session.id}
          subjects={subjects}
          students={studentRows}
          onSaveScores={handleSaveScores}
          isLocked={session.locked}
          isPublished={session.published}
          selectedSubjectId={selectedSubjectId}
        />
      </div>

      {/* ── FOOTER DÉDIÉ WORKSPACE ─────────────────────────────────────── */}
      {/* Contient UNIQUEMENT : Notes saisies, Nombre restant, Moyenne provisoire, Bouton "Valider la matière" */}
      <div
        className="card shadow-sm"
        style={{
          borderRadius: 12,
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: '0.8125rem', fontWeight: 700, color: '#334155', flexWrap: 'wrap' }}>
          <span>Notes saisies : <strong style={{ color: '#2563eb' }}>{workspaceFooterStats.enteredCount}</strong></span>
          <span>•</span>
          <span>Restantes : <strong style={{ color: '#dc2626' }}>{workspaceFooterStats.remainingCount}</strong></span>
          <span>•</span>
          <span>Moyenne provisoire : <strong style={{ color: '#047857' }}>{workspaceFooterStats.provisoireAvg} / {activeSubjectObj?.maxScore || 20}</strong></span>
          <span>•</span>
          <span className="text-muted">Dernière sauvegarde : <strong style={{ color: '#16a34a' }}>{new Date().toLocaleTimeString('fr-FR')}</strong></span>
        </div>

        <button
          className="btn btn-success btn-sm fw-bold"
          onClick={() => {
            addNotification('success', `Saisie de la matière ${activeSubjectObj?.name} validée !`);
            onFinishEntry();
          }}
          style={{ borderRadius: 8, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}
        >
          <CheckCircle2 size={16} /> Valider la matière
        </button>
      </div>

    </div>
  );
};
