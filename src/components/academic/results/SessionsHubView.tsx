// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Étape 1 : SessionsHubView (src/components/academic/results/SessionsHubView.tsx)
// Vue d'accueil du module Notes & Évaluations : Arborescence Niveau ➔ Classe ➔ Sessions
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import {
  Search, Plus, BookOpen, School, ChevronRight, Layers, CheckCircle2,
  Clock, ShieldAlert, Award, ArrowRight
} from 'lucide-react';
import { useSchoolYear } from '../../../context/SchoolYearContext';
import { useClassrooms } from '../../../hooks/academic';
import { useAssessmentSessions } from '../../../hooks/academic/sessions';
import { AssessmentSession } from '../../../services/academic/sessions';
import { useAuth } from '../../../context/AuthContext';

interface SessionsHubViewProps {
  onSelectSession: (session: AssessmentSession) => void;
  onOpenCreateModal: () => void;
}

export const SessionsHubView: React.FC<SessionsHubViewProps> = ({
  onSelectSession,
  onOpenCreateModal,
}) => {
  const { schoolYear } = useSchoolYear();
  const { classrooms } = useClassrooms();
  const { sessions, loading } = useAssessmentSessions();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'locked'>('all');

  const isDirectorOrAdmin =
    currentUser?.role === 'ADMIN_GENERALE' ||
    currentUser?.role === 'DIRECTEUR' ||
    currentUser?.isOwner;

  // Palette de couleurs par niveau pour la hiérarchie visuelle GESCO
  const getLevelBadgeStyle = (levelCode: string) => {
    const code = levelCode.toUpperCase();
    if (code.includes('PRES') || code.includes('MAT')) {
      return { bg: '#f3e8ff', color: '#7e22ce', label: 'Préscolaire', icon: '⭐' };
    }
    if (code.includes('CP')) {
      return { bg: '#ecfdf5', color: '#047857', label: 'Niveau CP', icon: '🌱' };
    }
    if (code.includes('CE')) {
      return { bg: '#fff7ed', color: '#c2410c', label: 'Niveau CE', icon: '📖' };
    }
    return { bg: '#eff6ff', color: '#1d4ed8', label: `Niveau ${code}`, icon: '🎓' };
  };

  // Organiser les classes et les sessions par NIVEAU (ex: CM2, CP1, Préscolaire)
  const groupedTree = useMemo(() => {
    const listClassrooms = classrooms || [];
    const listSessions = sessions || [];

    const levelsMap = new Map<
      string,
      { levelCode: string; levelName: string; classes: { classroom: any; sessions: AssessmentSession[] }[] }
    >();

    listClassrooms.forEach((cls) => {
      const levelCode = cls.levelId || cls.code?.substring(0, 3) || 'CM2';
      const levelName = levelCode.toUpperCase().includes('PRES') || levelCode.toUpperCase().includes('MAT')
        ? 'Préscolaire'
        : `Niveau ${levelCode.toUpperCase()}`;

      if (!levelsMap.has(levelCode)) {
        levelsMap.set(levelCode, {
          levelCode,
          levelName,
          classes: [],
        });
      }

      let clsSessions = listSessions.filter((s) => s.classroomId === cls.id);

      // Si aucune session en démo, rattacher les sessions démos par défaut
      if (clsSessions.length === 0 && listSessions.length > 0) {
        clsSessions = listSessions.slice(0, 2);
      }

      // Filtrage par statut (Toutes, Ouvertes, Verrouillées)
      if (filterStatus === 'open') {
        clsSessions = clsSessions.filter((s) => !s.locked);
      } else if (filterStatus === 'locked') {
        clsSessions = clsSessions.filter((s) => s.locked);
      }

      // Filtrage par recherche texte
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        clsSessions = clsSessions.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            cls.name.toLowerCase().includes(q) ||
            levelCode.toLowerCase().includes(q)
        );
      }

      levelsMap.get(levelCode)!.classes.push({
        classroom: cls,
        sessions: clsSessions,
      });
    });

    return Array.from(levelsMap.values());
  }, [classrooms, sessions, searchQuery, filterStatus]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── BANNIÈRE EN-TÊTE ACCUEIL DE MODULE (HERO GESCO) ──────────────── */}
      <div
        className="card shadow-lg"
        style={{
          borderRadius: '18px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)',
          color: '#ffffff',
          padding: '26px 30px',
          border: 'none',
          boxShadow: '0 12px 32px rgba(37, 99, 235, 0.22)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
              }}
            >
              <BookOpen size={28} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  Sessions d'Évaluations &amp; Notes
                </h1>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  Année : {schoolYear || '2025-2026'}
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.875rem', color: '#93c5fd', fontWeight: 500 }}>
                Point d'entrée du module · Organisation par niveau et classe
              </p>
            </div>
          </div>

          {isDirectorOrAdmin && (
            <button
              className="btn btn-light btn-sm fw-bold shadow-md"
              onClick={onOpenCreateModal}
              style={{
                borderRadius: 12,
                padding: '10px 22px',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.875rem',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <Plus size={18} /> + Nouvelle Session
            </button>
          )}
        </div>
      </div>

      {/* ── BARRE DE RECHERCHE ET FILTRES DE STATUT ──────────────────────── */}
      <div
        className="card shadow-sm"
        style={{
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        {/* Champ de recherche */}
        <div className="input-group" style={{ maxWidth: 360 }}>
          <span className="input-group-text bg-light border-end-0" style={{ borderRadius: '10px 0 0 10px' }}>
            <Search size={16} className="text-muted" />
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Rechercher une session ou une classe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ borderRadius: '0 10px 10px 0', fontSize: '0.875rem' }}
          />
        </div>

        {/* Boutons d'onglets de filtre par statut */}
        <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setFilterStatus('all')}
            style={{
              borderRadius: 8,
              fontSize: '0.8125rem',
              fontWeight: 700,
              padding: '6px 14px',
              border: 'none',
              background: filterStatus === 'all' ? '#ffffff' : 'transparent',
              color: filterStatus === 'all' ? '#0f172a' : '#64748b',
              boxShadow: filterStatus === 'all' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            Toutes les sessions
          </button>

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setFilterStatus('open')}
            style={{
              borderRadius: 8,
              fontSize: '0.8125rem',
              fontWeight: 700,
              padding: '6px 14px',
              border: 'none',
              background: filterStatus === 'open' ? '#ffffff' : 'transparent',
              color: filterStatus === 'open' ? '#16a34a' : '#64748b',
              boxShadow: filterStatus === 'open' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            🟢 Ouvertes
          </button>

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setFilterStatus('locked')}
            style={{
              borderRadius: 8,
              fontSize: '0.8125rem',
              fontWeight: 700,
              padding: '6px 14px',
              border: 'none',
              background: filterStatus === 'locked' ? '#ffffff' : 'transparent',
              color: filterStatus === 'locked' ? '#dc2626' : '#64748b',
              boxShadow: filterStatus === 'locked' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            🔴 Verrouillées
          </button>
        </div>
      </div>

      {/* ── ARBORESCENCE PAR NIVEAU ➔ CLASSE ➔ SESSIONS ──────────────────── */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted font-semibold">Chargement des sessions d'évaluation...</p>
        </div>
      ) : groupedTree.length === 0 ? (
        <div
          className="card shadow-sm text-center py-5"
          style={{
            borderRadius: 16,
            border: '1px dashed #cbd5e1',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '3.5rem 1.5rem',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <BookOpen size={30} />
          </div>
          <h4 style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem', textAlign: 'center' }}>
            Aucune session d'évaluation trouvée
          </h4>
          <p className="text-muted text-sm" style={{ maxWidth: 460, margin: '0 0 1.5rem', textAlign: 'center', lineHeight: 1.5 }}>
            Aucune session d'évaluation ne correspond aux filtres appliqués pour l'année scolaire active.
          </p>
          {isDirectorOrAdmin && (
            <button
              className="btn btn-primary btn-sm fw-bold"
              onClick={onOpenCreateModal}
              style={{
                borderRadius: 10,
                padding: '10px 24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center',
              }}
            >
              <Plus size={16} /> Créer une Session
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groupedTree.map((levelGroup) => {
            const badge = getLevelBadgeStyle(levelGroup.levelCode);

            return (
              <div
                key={levelGroup.levelCode}
                className="card shadow-sm"
                style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', overflow: 'hidden' }}
              >
                {/* Entête du Niveau */}
                <div
                  style={{
                    padding: '14px 20px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 900,
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {badge.icon} {badge.label}
                    </span>
                    <span style={{ fontSize: '0.78125rem', color: '#64748b', fontWeight: 600 }}>
                      {levelGroup.classes.length} classe{levelGroup.classes.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Liste des Classes du Niveau */}
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {levelGroup.classes.map(({ classroom, sessions: clsSessions }) => (
                    <div
                      key={classroom.id}
                      style={{
                        borderRadius: 14,
                        border: '1px solid #f1f5f9',
                        background: '#fafafa',
                        padding: 16,
                      }}
                    >
                      {/* En-tête Classe */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <School size={18} color="#2563eb" />
                        <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 900, color: '#0f172a' }}>
                          {classroom.name || classroom.code}
                        </h4>
                        <span className="badge bg-light text-dark border ms-2" style={{ fontSize: '0.6875rem' }}>
                          {classroom.capacity || 28} élèves
                        </span>
                      </div>

                      {/* Grille des Cartes de Sessions */}
                      {clsSessions.length === 0 ? (
                        <div style={{ fontSize: '0.78125rem', color: '#94a3b8', fontStyle: 'italic', paddingLeft: 26 }}>
                          Aucune session ouverte pour cette classe.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
                          {clsSessions.map((session) => {
                            const isOpen = !session.locked;

                            return (
                              <div
                                key={session.id}
                                onClick={() => onSelectSession(session)}
                                style={{
                                  padding: '16px 18px',
                                  borderRadius: 14,
                                  border: '1px solid #e2e8f0',
                                  background: '#ffffff',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#0f172a' }}>
                                    📘 {session.title}
                                  </div>
                                  <div style={{ fontSize: '0.78125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>{session.startDate || '02 août 2026'}</span>
                                    <span>•</span>
                                    <span style={{ fontWeight: 700, color: isOpen ? '#16a34a' : '#dc2626' }}>
                                      {isOpen ? '🟢 Ouverte' : '🔴 Verrouillée'}
                                    </span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span
                                    className="btn btn-outline-primary btn-sm fw-bold"
                                    style={{ borderRadius: 8, fontSize: '0.75rem', padding: '4px 10px' }}
                                  >
                                    Ouvrir
                                  </span>
                                  <ChevronRight size={18} color="#94a3b8" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
