// ─────────────────────────────────────────────────────────────────────────────
// GESCO — SessionSelector (src/components/academic/results/SessionSelector.tsx)
// Sélecteur ergonomique d'année, classe, type et session d'évaluation.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { Calendar, School, FileText, Filter, CheckCircle2 } from 'lucide-react';
import { useAcademicYears, useClassrooms } from '../../../hooks/academic';
import { useAssessmentSessions } from '../../../hooks/academic/sessions';
import { AssessmentSession } from '../../../services/academic/sessions';

interface SessionSelectorProps {
  onSessionSelect: (session: AssessmentSession | null, classroomId: string, levelCode: string) => void;
  selectedSessionId?: string;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  onSessionSelect,
  selectedSessionId,
}) => {
  const { academicYears } = useAcademicYears();
  const { classrooms } = useClassrooms();
  const { sessions, loading: loadingSessions } = useAssessmentSessions();

  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<AssessmentSession | null>(null);

  const yearsList = academicYears || [];
  const classroomsList = classrooms || [];
  const sessionsList = sessions || [];

  // Auto-sélection de l'année active par défaut
  useEffect(() => {
    if (yearsList.length > 0 && !selectedYearId) {
      const activeYear = yearsList.find((y) => y.status === 'ACTIVE') || yearsList[0];
      setSelectedYearId(activeYear.id);
    }
  }, [yearsList, selectedYearId]);

  // Auto-sélection de la première classe si aucune n'est sélectionnée
  useEffect(() => {
    if (classroomsList.length > 0 && !selectedClassroomId) {
      setSelectedClassroomId(classroomsList[0].id);
    }
  }, [classroomsList, selectedClassroomId]);

  // Filtrage des sessions selon les critères sélectionnés
  const filteredSessions = sessionsList.filter((s) => {
    const matchYear = !selectedYearId || s.academicYearId === selectedYearId;
    const matchClass = !selectedClassroomId || s.classroomId === selectedClassroomId;
    const matchType = selectedTypeId === 'all' || s.assessmentTypeId === selectedTypeId;
    return matchYear && matchClass && matchType;
  });

  // Gestion du changement de session
  const handleSessionChange = (sessionId: string) => {
    const session = sessionsList.find((s) => s.id === sessionId) || null;
    setSelectedSession(session);

    const classroom = classroomsList.find((c) => c.id === selectedClassroomId);
    const levelCode = classroom?.levelId || 'CP1';

    onSessionSelect(session, selectedClassroomId, levelCode);
  };

  useEffect(() => {
    if (selectedSessionId) {
      const session = sessionsList.find((s) => s.id === selectedSessionId) || null;
      setSelectedSession(session);
    }
  }, [selectedSessionId, sessionsList]);

  return (
    <div className="card shadow-sm mb-4" style={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
      <div className="card-body p-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Filter size={18} className="text-primary" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Sélection de la Session d'Évaluation</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* 1. Année Scolaire */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
              <Calendar size={14} style={{ marginRight: 4, display: 'inline' }} />
              Année Scolaire
            </label>
            <select
              className="form-select text-sm"
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
            >
              {yearsList.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.status === 'ACTIVE' ? '(En cours)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Classe */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
              <School size={14} style={{ marginRight: 4, display: 'inline' }} />
              Classe
            </label>
            <select
              className="form-select text-sm"
              value={selectedClassroomId}
              onChange={(e) => {
                setSelectedClassroomId(e.target.value);
                setSelectedSession(null);
                onSessionSelect(null, e.target.value, 'CP1');
              }}
            >
              {classroomsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Type d'évaluation */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
              <FileText size={14} style={{ marginRight: 4, display: 'inline' }} />
              Type d'Évaluation
            </label>
            <select
              className="form-select text-sm"
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
            >
              <option value="all">Tous les types</option>
              <option value="MONTHLY">Composition Mensuelle</option>
              <option value="IEP">IEP (Interrogation Écrite)</option>
              <option value="MOCK_EXAM">Examen Blanc</option>
              <option value="PRESCHOOL">Évaluation Préscolaire</option>
            </select>
          </div>

          {/* 4. Session d'évaluation */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--primary-color)' }}>
              <CheckCircle2 size={14} style={{ marginRight: 4, display: 'inline' }} />
              Session Ouverte
            </label>
            <select
              className="form-select text-sm fw-semibold"
              value={selectedSession?.id || ''}
              onChange={(e) => handleSessionChange(e.target.value)}
              disabled={loadingSessions || filteredSessions.length === 0}
            >
              <option value="">
                {loadingSessions
                  ? 'Chargement des sessions...'
                  : filteredSessions.length === 0
                  ? 'Aucune session disponible'
                  : '-- Choisir une session --'}
              </option>
              {filteredSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.status}) {s.locked ? '🔒' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSession && (
          <div className="mt-3 p-2 bg-light rounded text-xs d-flex align-items-center justify-content-between">
            <span>
              <strong>Période :</strong> {selectedSession.startDate} au {selectedSession.endDate}
            </span>
            <span>
              <strong>Statut :</strong>{' '}
              <span className={`badge ${selectedSession.locked ? 'bg-danger' : selectedSession.published ? 'bg-success' : 'bg-primary'}`}>
                {selectedSession.status} {selectedSession.locked ? '(Verrouillée)' : ''}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
