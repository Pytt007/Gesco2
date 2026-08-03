// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Étape 3 : SessionDetailView (src/components/academic/results/SessionDetailView.tsx)
// POLISH UX/UI — Tableau de Bord Fiche de Session
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import {
  ArrowLeft, Play, Eye, Lock, CheckCircle2, Clock, Circle,
  ChevronRight, School, BookOpen, Layers
} from 'lucide-react';
import { AssessmentSession } from '../../../services/academic/sessions';
import { useAssessmentResults } from '../../../hooks/academic/results';
import { SubjectHeader } from './GradeEntryGrid';

interface SessionDetailViewProps {
  session: AssessmentSession;
  subjects?: SubjectHeader[];
  onBack: () => void;
  onStartGradeEntry: (subjectId?: string) => void;
  onViewResults: () => void;
}

export const SessionDetailView: React.FC<SessionDetailViewProps> = ({
  session,
  subjects = [
    { id: 'math', code: 'MATH', name: 'Mathématiques', maxScore: 20 },
    { id: 'fr', code: 'FR', name: 'Français (Lecture/Écriture)', maxScore: 20 },
    { id: 'hist_geo', code: 'HG', name: 'Histoire - Géographie', maxScore: 20 },
    { id: 'sciences', code: 'SCI', name: 'Sciences & Technologie', maxScore: 20 },
    { id: 'eps', code: 'EPS', name: 'Éducation Physique', maxScore: 20 },
  ],
  onBack,
  onStartGradeEntry,
  onViewResults,
}) => {
  const { results } = useAssessmentResults(session.id);

  const isOpen = !session.locked;
  const totalStudents = results.length || 28;

  // Icônes par matière
  const getSubjectIcon = (subId: string, subName: string) => {
    const name = subName.toLowerCase();
    if (name.includes('math')) return '📐';
    if (name.includes('fran')) return '📖';
    if (name.includes('hist') || name.includes('géo')) return '🌍';
    if (name.includes('sci')) return '🔬';
    if (name.includes('eps') || name.includes('phys')) return '🏃';
    return '📚';
  };

  // Calcul du nombre de notes saisies et statut par matière
  const subjectsStats = useMemo(() => {
    return subjects.map((sub, index) => {
      // Démo d'état réaliste par matière pour simulation UX fluide
      let enteredCount = 0;
      if (results && results.length > 0) {
        enteredCount = results.filter(
          (r) => r.scores.find((s) => s.subjectId === sub.id && s.score !== null && s.score !== undefined)
        ).length;
      } else {
        // Démo simulée pour la prévisualisation UX
        if (index === 0) enteredCount = 28; // Terminée
        else if (index === 1) enteredCount = 18; // En cours
        else enteredCount = 0; // Non commencée
      }

      const percent = totalStudents > 0 ? Math.round((enteredCount / totalStudents) * 100) : 0;
      
      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (percent === 100) status = 'completed';
      else if (percent > 0) status = 'in_progress';

      return {
        subject: sub,
        enteredCount,
        percent,
        status,
      };
    });
  }, [subjects, results, totalStudents]);

  // Statistiques de la carte de progression globale
  const globalStats = useMemo(() => {
    const totalSubjects = subjectsStats.length;
    const completedSubjects = subjectsStats.filter((s) => s.status === 'completed').length;
    const inProgressSubjects = subjectsStats.filter((s) => s.status === 'in_progress').length;
    const remainingSubjects = subjectsStats.filter((s) => s.status === 'not_started').length;

    const totalEntered = subjectsStats.reduce((acc, curr) => acc + curr.enteredCount, 0);
    const totalPossible = totalSubjects * totalStudents;
    const globalPercent = totalPossible > 0 ? Math.round((totalEntered / totalPossible) * 100) : 0;

    return {
      totalSubjects,
      completedSubjects,
      inProgressSubjects,
      remainingSubjects,
      globalPercent,
    };
  }, [subjectsStats, totalStudents]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* ── 1. EN-TÊTE ÉPURÉ SANS BOUTON BLEU ENCOMBRANT ───────────────────── */}
      <div
        className="card shadow-sm"
        style={{
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          padding: '22px 26px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="btn btn-outline-secondary btn-sm p-2"
            onClick={onBack}
            style={{ borderRadius: 10 }}
            title="Retour aux sessions"
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                Fiche de Session — {session.title}
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '3px 12px',
                  borderRadius: 999,
                  background: isOpen ? '#ecfdf5' : '#fef2f2',
                  color: isOpen ? '#047857' : '#dc2626',
                }}
              >
                {isOpen ? '🟢 Session Ouverte' : '🔴 Session Verrouillée'}
              </span>
            </div>
            <div style={{ fontSize: '0.84375rem', color: '#64748b', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span>🏫 Classe : <strong>{session.classroomName || 'CM2 A'}</strong></span>
              <span>•</span>
              <span>👥 Effectif : <strong>{totalStudents} élèves</strong></span>
              <span>•</span>
              <span>📅 Date : <strong>{session.startDate || '02 août 2026'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. CARTE DE PROGRESSION GLOBALE RÉSUMÉE ──────────────────────── */}
      <div
        className="card shadow-sm"
        style={{
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          padding: '22px 26px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#0f172a' }}>
              📊 Progression Globale de la Session
            </span>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>
              {globalStats.totalSubjects} matières au programme de cette évaluation
            </div>
          </div>

          {/* Synthèse visuelle des matières */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: '#f1f5f9', color: '#475569' }}>
              {globalStats.totalSubjects} matières
            </span>
            <span style={{ fontSize: '0.78125rem', fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: '#dcfce7', color: '#15803d' }}>
              🟢 {globalStats.completedSubjects} terminées
            </span>
            <span style={{ fontSize: '0.78125rem', fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: '#dbeafe', color: '#1d4ed8' }}>
              🟦 {globalStats.inProgressSubjects} en cours
            </span>
            <span style={{ fontSize: '0.78125rem', fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
              ⚪ {globalStats.remainingSubjects} restantes
            </span>
          </div>
        </div>

        {/* Jauge de progression visuelle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, height: 12, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${globalStats.globalPercent}%`,
                background: globalStats.globalPercent === 100 ? '#16a34a' : 'linear-gradient(90deg, #2563eb, #6366f1)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#2563eb', minWidth: 46 }}>
            {globalStats.globalPercent}%
          </span>
        </div>
      </div>

      {/* ── 2, 3, 4, 6, 7. CARTES DES MATIÈRES ENRICHIES ──────────────────── */}
      <div
        className="card shadow-sm"
        style={{
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          padding: 24,
        }}
      >
        <h3 style={{ margin: '0 0 18px', fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
          📚 Matières à Saisir
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {subjectsStats.map(({ subject: sub, enteredCount, percent, status }) => {
            const icon = getSubjectIcon(sub.id, sub.name);

            // Badges d'état et styles de boutons dynamiques
            let badgeComponent = null;
            let buttonText = '▶ Commencer';
            let buttonClass = 'btn-outline-primary';

            if (!isOpen) {
              badgeComponent = <span className="badge bg-secondary text-white">🔒 Verrouillée</span>;
              buttonText = '👁️ Voir';
              buttonClass = 'btn-outline-secondary';
            } else if (status === 'completed') {
              badgeComponent = <span className="badge bg-success text-white">🟢 Terminée</span>;
              buttonText = '👁️ Voir';
              buttonClass = 'btn-outline-success';
            } else if (status === 'in_progress') {
              badgeComponent = <span className="badge bg-primary text-white">🟦 En cours</span>;
              buttonText = '▶ Continuer';
              buttonClass = 'btn-primary';
            } else {
              badgeComponent = <span className="badge bg-light text-dark border">⚪ Non commencée</span>;
              buttonText = '▶ Commencer';
              buttonClass = 'btn-outline-primary';
            }

            return (
              <div
                key={sub.id}
                onClick={() => onStartGradeEntry(sub.id)}
                style={{
                  padding: '18px 22px',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                }}
              >
                {/* Icône & Nom de Matière */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 240 }}>
                  <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{icon}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 900, color: '#0f172a' }}>
                        {sub.name}
                      </h4>
                      {badgeComponent}
                    </div>
                    <div style={{ fontSize: '0.78125rem', color: '#64748b', marginTop: 4 }}>
                      Barème : <strong>/{sub.maxScore} pts</strong> · {totalStudents} élèves
                    </div>
                  </div>
                </div>

                {/* Progression Matière (%) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 900, color: '#0f172a' }}>
                      {enteredCount} / {totalStudents} notes
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                      Progression : <strong style={{ color: percent === 100 ? '#16a34a' : '#2563eb' }}>{percent}%</strong>
                    </div>
                  </div>

                  {/* Bouton d'action adapté automatiquement */}
                  <button
                    type="button"
                    className={`btn ${buttonClass} btn-sm fw-bold`}
                    style={{ borderRadius: 10, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {buttonText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
