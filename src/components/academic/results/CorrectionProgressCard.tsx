// ─────────────────────────────────────────────────────────────────────────────
// GESCO — CorrectionProgressCard (src/components/academic/results/CorrectionProgressCard.tsx)
// Carte d'indicateurs et jauge de progression des corrections pour enseignants.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Users, CheckCircle, Clock, AlertCircle, Award, Lock, Send } from 'lucide-react';
import { CorrectionProgress } from '../../../services/academic/results';

interface CorrectionProgressCardProps {
  progress: CorrectionProgress | null;
  loading?: boolean;
  onPublishAll?: () => void;
  onValidateAll?: () => void;
  isLocked?: boolean;
  isPublished?: boolean;
}

export const CorrectionProgressCard: React.FC<CorrectionProgressCardProps> = ({
  progress,
  loading = false,
  onPublishAll,
  onValidateAll,
  isLocked = false,
  isPublished = false,
}) => {
  if (loading) {
    return (
      <div className="card shadow-sm mb-4 p-4 text-center">
        <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
        <span style={{ marginLeft: 8, fontSize: '0.875rem' }}>Calcul de la progression des corrections...</span>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  const { totalStudents, completedCount, inProgressCount, notStartedCount, validatedCount, percentage } = progress;

  // Calcul couleur de la jauge
  let progressColor = '#ef4444'; // rouge < 50%
  if (percentage >= 80) progressColor = '#10b981'; // vert
  else if (percentage >= 50) progressColor = '#f59e0b'; // orange

  return (
    <div className="card shadow-sm mb-4" style={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
      <div className="card-body p-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Avancement de la Saisie des Notes
            </h4>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Suivi en temps réel de la correction et validation des copies
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onValidateAll && !isPublished && (
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={onValidateAll}
                disabled={completedCount === 0 || isLocked}
                title="Valider toutes les copies corrigées"
              >
                <Award size={14} style={{ marginRight: 4 }} />
                Tout Valider ({completedCount})
              </button>
            )}

            {onPublishAll && (
              <button
                className={`btn btn-sm ${isPublished ? 'btn-success' : 'btn-primary'}`}
                onClick={onPublishAll}
                disabled={isPublished || isLocked || validatedCount < totalStudents}
                title={validatedCount < totalStudents ? 'Toutes les copies doivent être validées avant la publication' : 'Publier la session'}
              >
                {isPublished ? (
                  <>
                    <CheckCircle size={14} style={{ marginRight: 4 }} />
                    Session Publiée
                  </>
                ) : (
                  <>
                    <Send size={14} style={{ marginRight: 4 }} />
                    Publier les Résultats
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Grille d'indicateurs clefs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
          <div className="p-3 bg-light rounded text-center">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>
              <Users size={14} style={{ display: 'inline', marginRight: 4 }} />
              Total Élèves
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{totalStudents}</div>
          </div>

          <div className="p-3 bg-success-light rounded text-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <div style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: 2 }}>
              <CheckCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
              Copies Corrigées
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{completedCount}</div>
          </div>

          <div className="p-3 bg-warning-light rounded text-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginBottom: 2 }}>
              <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
              En Cours
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{inProgressCount}</div>
          </div>

          <div className="p-3 bg-danger-light rounded text-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <div style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: 2 }}>
              <AlertCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
              Non Commencés
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>{notStartedCount}</div>
          </div>

          <div className="p-3 bg-info-light rounded text-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: 2 }}>
              <Award size={14} style={{ display: 'inline', marginRight: 4 }} />
              Copies Validées
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6' }}>{validatedCount}</div>
          </div>
        </div>

        {/* Barre de progression visuelle (%) */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>
            <span>Progression Globale</span>
            <span style={{ color: progressColor }}>{percentage} % Terminé</span>
          </div>
          <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                backgroundColor: progressColor,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
