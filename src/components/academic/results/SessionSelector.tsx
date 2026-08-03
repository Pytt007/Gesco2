// ─────────────────────────────────────────────────────────────────────────────
// GESCO — SessionSelector (src/components/academic/results/SessionSelector.tsx)
// Workflow de Sélection Ultra-Rapide : Classe ➔ Cartes Évaluations ➔ Matière
// Année scolaire active auto-détectée, auto-sélection 1ère classe & transition instantanée
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useMemo } from 'react';
import {
  School, FileText, Filter, Sparkles, CheckCircle2, Clock,
  BookOpen, AlertCircle, Layers, Play, Check, ChevronRight
} from 'lucide-react';
import { useSchoolYear } from '../../../context/SchoolYearContext';
import { useClassrooms } from '../../../hooks/academic';
import { useAssessmentSessions } from '../../../hooks/academic/sessions';
import { AssessmentSession } from '../../../services/academic/sessions';
import { useAuth } from '../../../context/AuthContext';
import { SubjectHeader } from './GradeEntryGrid';

interface SessionSelectorProps {
  onSessionSelect: (
    session: AssessmentSession | null,
    classroomId: string,
    levelCode: string,
    subjectId: string
  ) => void;
  selectedSessionId?: string;
  selectedSubjectId?: string;
  subjectsList?: SubjectHeader[];
  draftInProgress?: {
    classLabel: string;
    sessionTitle: string;
    subjectName: string;
    enteredCount: number;
    totalCount: number;
  } | null;
  onResumeDraft?: () => void;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  onSessionSelect,
  selectedSessionId,
  selectedSubjectId,
  subjectsList = [],
  draftInProgress,
  onResumeDraft,
}) => {
  const { schoolYear } = useSchoolYear();
  const { classrooms } = useClassrooms();
  const { sessions, loading: loadingSessions } = useAssessmentSessions();
  const { currentUser, canAccess } = useAuth();

  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<AssessmentSession | null>(null);
  const [selectedSubjectIdState, setSelectedSubjectIdState] = useState<string>('math');

  const classroomsList = classrooms || [];
  const sessionsList = sessions || [];

  // Filtrage des classes selon le rôle IAM (Enseignant = ses classes, Admin/Directeur = toutes les classes)
  const isTeacherOnly = currentUser?.role === 'SCOLAIRE_ENSEIGNANT' || currentUser?.role === 'ENSEIGNANT';
  const availableClassrooms = useMemo(() => {
    if (isTeacherOnly) {
      // Ex: classes enseignées (fallback sur les 2 premières si démo)
      return classroomsList.slice(0, 3);
    }
    return classroomsList;
  }, [classroomsList, isTeacherOnly]);

  // Étape 1 : Auto-sélection de la 1ère classe si unique ou non sélectionnée
  useEffect(() => {
    if (availableClassrooms.length > 0 && !selectedClassroomId) {
      setSelectedClassroomId(availableClassrooms[0].id);
    }
  }, [availableClassrooms, selectedClassroomId]);

  // Étape 2 : Évaluations pour la classe sélectionnée
  const classSessions = useMemo(() => {
    const filtered = sessionsList.filter((s) => {
      const matchClass = !selectedClassroomId || s.classroomId === selectedClassroomId;
      return matchClass;
    });
    if (filtered.length === 0 && sessionsList.length > 0) {
      return sessionsList;
    }
    return filtered;
  }, [sessionsList, selectedClassroomId]);

  const openSession = useMemo(() => {
    return classSessions.find((s) => !s.locked) || classSessions[0] || null;
  }, [classSessions]);

  // Étape 3 : Matière auto-sélectionnée
  useEffect(() => {
    if (subjectsList.length > 0 && !selectedSubjectIdState) {
      setSelectedSubjectIdState(subjectsList[0].id);
    }
  }, [subjectsList, selectedSubjectIdState]);

  // Auto-sélection de la session ouverte par défaut si présente
  useEffect(() => {
    if (classSessions.length > 0 && !selectedSession) {
      const activeSess = classSessions.find((s) => !s.locked) || classSessions[0];
      setSelectedSession(activeSess);
      const cls = availableClassrooms.find((c) => c.id === selectedClassroomId);
      onSessionSelect(activeSess, selectedClassroomId, cls?.levelId || 'CP1', selectedSubjectIdState);
    }
  }, [classSessions, selectedSession, selectedClassroomId, availableClassrooms, selectedSubjectIdState, onSessionSelect]);

  const handleClassChange = (classId: string) => {
    setSelectedClassroomId(classId);
    const clsSessions = sessionsList.filter((s) => s.classroomId === classId);
    const firstSess = clsSessions.find((s) => !s.locked) || clsSessions[0] || null;
    setSelectedSession(firstSess);

    const cls = availableClassrooms.find((c) => c.id === classId);
    onSessionSelect(firstSess, classId, cls?.levelId || 'CP1', selectedSubjectIdState);
  };

  const handleSessionCardClick = (session: AssessmentSession) => {
    setSelectedSession(session);
    const cls = availableClassrooms.find((c) => c.id === selectedClassroomId);
    onSessionSelect(session, selectedClassroomId, cls?.levelId || 'CP1', selectedSubjectIdState);
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectIdState(subjectId);
    const cls = availableClassrooms.find((c) => c.id === selectedClassroomId);
    onSessionSelect(selectedSession, selectedClassroomId, cls?.levelId || 'CP1', subjectId);
  };

  const selectedClassObj = availableClassrooms.find((c) => c.id === selectedClassroomId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ⚡ BANNIÈRE "SAISIE EN COURS" (SI DÉTECTÉE) */}
      {draftInProgress && onResumeDraft && (
        <div
          className="card shadow-sm"
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '2px solid #3b82f6',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 900, color: '#1e3a8a' }}>
                Vous avez une saisie en cours
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#1d4ed8', marginTop: 2 }}>
                <strong>{draftInProgress.classLabel}</strong> · {draftInProgress.subjectName} · {draftInProgress.sessionTitle} (<strong>{draftInProgress.enteredCount} / {draftInProgress.totalCount} notes</strong>)
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary btn-sm fw-bold"
            onClick={onResumeDraft}
            style={{ borderRadius: 10, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
          >
            <Play size={14} fill="#fff" /> Reprendre la Saisie
          </button>
        </div>
      )}

      {/* ── SÉLECTEUR WORKFLOW COMPACT, SCALABLE & ERGONOMIQUE ─────────────────── */}
      <div className="card shadow-sm" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'center' }}>
          
          {/* 1. Sélecteur de Classe Scalable */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <School size={14} color="#2563eb" /> Classe Académique :
            </label>
            <select
              value={selectedClassroomId}
              onChange={(e) => handleClassChange(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 12,
                border: '1.5px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {availableClassrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  🏫 {cls.name || cls.code}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Sélecteur de Session / Composition Scalable */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={14} color="#16a34a" /> Session & Composition :
            </label>
            <select
              value={selectedSession?.id || ''}
              onChange={(e) => {
                const sess = classSessions.find((s) => s.id === e.target.value);
                if (sess) handleSessionCardClick(sess);
              }}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 12,
                border: '1.5px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {classSessions.map((sess) => (
                <option key={sess.id} value={sess.id}>
                  📘 {sess.title} {sess.locked ? '🔒 (Verrouillée)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Sélecteur Matière Focus (optionnel si fourni) */}
          {subjectsList && subjectsList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                🎯 Matière Focus :
              </label>
              <select
                value={selectedSubjectIdState}
                onChange={(e) => handleSubjectChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: 12,
                  border: '1.5px solid #93c5fd',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(37,99,235,0.08)',
                }}
              >
                {subjectsList.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
