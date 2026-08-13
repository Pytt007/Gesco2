import React, { useState, useEffect } from 'react';
import { X, BookOpen, Plus, Calendar, Check, Sparkles, School } from 'lucide-react';
import { useSchoolYear } from '../../../context/SchoolYearContext';
import { useClassrooms } from '../../../hooks/academic';
import { useAssessmentSessions } from '../../../hooks/academic/sessions';

interface CreateAssessmentSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultClassroomId?: string;
}

export default function CreateAssessmentSessionModal({
  isOpen,
  onClose,
  onSuccess,
  defaultClassroomId,
}: CreateAssessmentSessionModalProps) {
  const { schoolYear } = useSchoolYear();
  const { classrooms } = useClassrooms();
  const { create: createSessionAction } = useAssessmentSessions();

  const [title, setTitle] = useState('Composition Mensuelle — Novembre 2026');
  const [assessmentTypeId, setAssessmentTypeId] = useState('MONTHLY');
  const [classroomId, setClassroomId] = useState<string>(defaultClassroomId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!classroomId && classrooms && classrooms.length > 0) {
      setClassroomId(defaultClassroomId || classrooms[0].id);
    }
  }, [classrooms, defaultClassroomId, classroomId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeClassId = classroomId || defaultClassroomId || classrooms?.[0]?.id || '';
    if (!title.trim() || !activeClassId) return;

    setSaving(true);
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const ok = await createSessionAction({
      title: title.trim(),
      academicYearId: schoolYear || '',
      classroomId: activeClassId,
      assessmentTypeId,
      startDate: now.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      locked: false,
      published: false,
    });
    setSaving(false);

    onSuccess();
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="modal shadow-lg"
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          animation: 'scaleUp 0.2s ease-out',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '22px 26px',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
              }}
            >
              <BookOpen size={24} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1875rem', fontWeight: 900, color: '#ffffff' }}>
                Ouvrir une Évaluation
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#93c5fd' }}>
                Direction Pédagogique · Année active : {schoolYear || '2025-2026'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.8125rem' }}>
                Classe Cible *
              </label>
              <select
                className="form-select"
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
                required
                style={{ borderRadius: 10, fontSize: '0.875rem' }}
              >
                {classrooms?.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    🏫 {cls.name || cls.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.8125rem' }}>
                Titre de l'Évaluation *
              </label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Composition Mensuelle — Novembre 2026"
                required
                style={{ borderRadius: 10, fontSize: '0.875rem' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.8125rem' }}>
                Type d'Évaluation
              </label>
              <select
                className="form-select"
                value={assessmentTypeId}
                onChange={(e) => setAssessmentTypeId(e.target.value)}
                style={{ borderRadius: 10, fontSize: '0.875rem' }}
              >
                <option value="MONTHLY">📘 Composition Mensuelle</option>
                <option value="IEP">📗 Composition IEP (Trimestrielle)</option>
                <option value="BLANK_EXAM">📕 Examen Blanc</option>
                <option value="CONTROLE">📙 Contrôle Continu</option>
              </select>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.78125rem', color: '#15803d', fontWeight: 700 }}>
              💡 L'ouverture de cette évaluation permettra immédiatement aux enseignants de cette classe de saisir les notes.
            </div>

          </div>

          {/* Footer Modal */}
          <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving} style={{ borderRadius: 10 }}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={saving} style={{ borderRadius: 10, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> {saving ? 'Ouverture...' : 'Ouvrir l\'Évaluation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
