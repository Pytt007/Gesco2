// ─────────────────────────────────────────────────────────────────────────────
// GESCO — CorrectionProgressCard (src/components/academic/results/CorrectionProgressCard.tsx)
// Carte d'indicateurs et jauge de progression des corrections pour enseignants.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Users, CheckCircle, Clock, AlertCircle, Award, Lock, Send, Sparkles } from 'lucide-react';
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
      <div className="card shadow-sm mb-4 p-4 text-center" style={{ borderRadius: 16 }}>
        <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
        <span style={{ marginLeft: 8, fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Calcul de la progression des corrections...</span>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  const { totalStudents, completedCount, inProgressCount, notStartedCount, validatedCount, percentage } = progress;

  return (
    <div className="card shadow-sm mb-4" style={{ borderRadius: '16px', border: '1px solid #e2e8f0', background: '#ffffff', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px' }}>
        
        {/* TITRE ET ACTION EN-TÊTE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#2563eb" /> Avancement & Suivi de la Correction
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Statistiques réactives en temps réel et verrous de sécurité
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onValidateAll && !isPublished && (
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={onValidateAll}
                disabled={completedCount === 0 || isLocked}
                style={{ borderRadius: 10, fontWeight: 700 }}
                title="Valider toutes les copies corrigées"
              >
                <Award size={14} style={{ marginRight: 4 }} />
                Tout Valider ({completedCount})
              </button>
            )}
          </div>
        </div>

        {/* BARRE DE PROGRESSION AVEC POURCENTAGE */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px' }}>
            <span style={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taux de Complétion des Copies</span>
            <span style={{ color: percentage >= 80 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#2563eb' }}>{percentage}% Effectué</span>
          </div>
          <div style={{ height: 10, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #2563eb 0%, #10b981 100%)',
                borderRadius: 10,
                transition: 'width 0.5s ease-in-out',
              }}
            />
          </div>
        </div>

        {/* GRILLE DES KPI SAAS COLORÉS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          {/* TOTAL */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Élèves</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb', marginTop: 2 }}>{totalStudents}</div>
          </div>

          {/* TERMINÉES */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Corrigées</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a', marginTop: 2 }}>{completedCount}</div>
          </div>

          {/* EN COURS */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>En Cours</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#d97706', marginTop: 2 }}>{inProgressCount}</div>
          </div>

          {/* NON DÉMARRÉ */}
          <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Non Démarré</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626', marginTop: 2 }}>{notStartedCount}</div>
          </div>

          {/* VALIDÉES */}
          <div style={{ background: '#f3e8ff', border: '1px solid #e9d5ff', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Validées</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#9333ea', marginTop: 2 }}>{validatedCount}</div>
          </div>
        </div>

      </div>
    </div>
  );
};
