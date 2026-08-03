// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Étape 2 : CreateSessionWizardModal (src/components/academic/results/CreateSessionWizardModal.tsx)
// Reproduction FIDELE 1:1 du Wireframe Validé
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { useSchoolYear } from '../../../context/SchoolYearContext';
import { useClassrooms } from '../../../hooks/academic';
import { useAssessmentSessions } from '../../../hooks/academic/sessions';
import { DatePicker } from '../../ui/date-picker';

interface CreateSessionWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdSessionId?: string) => void;
}

export const CreateSessionWizardModal: React.FC<CreateSessionWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { schoolYear } = useSchoolYear();
  const { classrooms } = useClassrooms();
  const { create: createSessionAction } = useAssessmentSessions();

  const listClassrooms = classrooms || [];

  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  
  // Dates "Du ... au ..."
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultEndStr = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(defaultEndStr);
  const [saving, setSaving] = useState(false);

  // 1. Auto-sélection de la première classe au chargement
  useEffect(() => {
    if (listClassrooms.length > 0 && !selectedClassroomId) {
      setSelectedClassroomId(listClassrooms[0].id);
    }
  }, [listClassrooms, selectedClassroomId]);

  // 2. Détection automatique du niveau selon la classe choisie
  const selectedClassObj = useMemo(() => {
    return listClassrooms.find((c) => c.id === selectedClassroomId) || listClassrooms[0];
  }, [listClassrooms, selectedClassroomId]);

  const levelCode = useMemo(() => {
    if (!selectedClassObj) return 'CM2';
    const code = selectedClassObj.levelId || selectedClassObj.code || 'CM2';
    if (code.toUpperCase().includes('PRES') || code.toUpperCase().includes('MAT') || code.toUpperCase().includes('PTE')) {
      return 'PRESCOLAIRE';
    }
    if (code.toUpperCase().includes('CP')) return 'CP';
    if (code.toUpperCase().includes('CE')) return 'CE';
    return 'CM2';
  }, [selectedClassObj]);

  // 3. Types d'évaluations autorisés selon le niveau
  const allowedTypes = useMemo(() => {
    if (levelCode === 'PRESCOLAIRE') {
      return [{ id: 'PRESCHOOL_EVAL', title: 'Évaluation Préscolaire' }];
    }
    if (levelCode === 'CP') {
      return [
        { id: 'MONTHLY', title: 'Composition Mensuelle' },
        { id: 'IEP', title: 'Composition IEP' },
      ];
    }
    // CM / CE
    return [
      { id: 'MONTHLY', title: 'Composition Mensuelle' },
      { id: 'IEP', title: 'Composition IEP' },
      { id: 'BLANK_EXAM', title: 'Examen Blanc' },
    ];
  }, [levelCode]);

  // Sélection automatique du 1er type d'évaluation autorisé
  useEffect(() => {
    if (allowedTypes.length > 0) {
      setSelectedTypeId(allowedTypes[0].id);
    }
  }, [allowedTypes]);

  // 4. Titre auto-généré dynamiquement (Aucune saisie manuelle utilisateur)
  const generatedTitle = useMemo(() => {
    const typeObj = allowedTypes.find((t) => t.id === selectedTypeId) || allowedTypes[0];
    if (!typeObj) return 'Évaluation 1';

    if (typeObj.id === 'PRESCHOOL_EVAL') {
      return 'Évaluation Préscolaire 1';
    }
    if (typeObj.id === 'BLANK_EXAM') {
      return 'Examen Blanc N°1';
    }
    if (typeObj.id === 'IEP') {
      return 'Composition IEP 1';
    }
    return 'Composition Mensuelle Novembre';
  }, [allowedTypes, selectedTypeId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassroomId) return;

    setSaving(true);
    const ok = await createSessionAction({
      title: generatedTitle,
      academicYearId: 'ay-2025-2026',
      classroomId: selectedClassroomId,
      assessmentTypeId: selectedTypeId || 'MONTHLY',
      startDate: startDate,
      endDate: endDate,
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
        background: 'rgba(15, 23, 42, 0.6)',
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
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* En-tête Modal Wireframe 1:1 */}
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
              }}
            >
              <Plus size={24} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1875rem', fontWeight: 900, color: '#ffffff' }}>
                ➕ Nouvelle session d'évaluation
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#93c5fd' }}>
                Année active : {schoolYear || '2025-2026'}
              </p>
            </div>
          </div>

          <button
            type="button"
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
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulaire Guidé Wireframe 1:1 */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* 1. CLASSE */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#334155', textTransform: 'uppercase' }}>
                1. CLASSE
              </label>
              <select
                className="form-select"
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                style={{ borderRadius: 10, fontSize: '0.875rem', fontWeight: 700 }}
              >
                {listClassrooms.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name || cls.code} ({cls.capacity || 28} élèves)
                  </option>
                ))}
              </select>
            </div>

            {/* 🎓 NIVEAU DÉTECTÉ */}
            <div
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                background: '#fdf2f8',
                border: '1px solid #fbcfe8',
                color: '#db2777',
                fontSize: '0.8125rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>🎓 NIVEAU DÉTECTÉ :</span>
              <strong style={{ fontSize: '0.9375rem' }}>{levelCode}</strong>
            </div>

            {/* 2. TYPE D'ÉVALUATION (Autorisé pour ce niveau) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#334155', textTransform: 'uppercase' }}>
                2. TYPE D'ÉVALUATION (Autorisé pour ce niveau)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allowedTypes.map((typeObj) => {
                  const isSelected = selectedTypeId === typeObj.id;
                  return (
                    <button
                      key={typeObj.id}
                      type="button"
                      onClick={() => setSelectedTypeId(typeObj.id)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: isSelected ? '#2563eb' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#334155',
                        fontWeight: isSelected ? 900 : 700,
                        fontSize: '0.875rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{isSelected ? '•' : '( )'} {typeObj.title}</span>
                      {isSelected && <Check size={16} color="#ffffff" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. DATES DE LA SESSION (Du ... au ...) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                3. DATES DE LA SESSION
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Du :</span>
                  <DatePicker value={startDate} onChange={setStartDate} showInternalIcon />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Au :</span>
                  <DatePicker value={endDate} onChange={setEndDate} showInternalIcon />
                </div>
              </div>
            </div>

            {/* 📝 TITRE AUTO-GÉNÉRÉ */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                📝 TITRE AUTO-GÉNÉRÉ :
              </span>
              <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                {generatedTitle}
              </div>
            </div>

          </div>

          {/* Footer Modal Wireframe 1:1 */}
          <div
            style={{
              padding: '16px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={saving}
              style={{ borderRadius: 10 }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm fw-bold"
              disabled={saving}
              style={{ borderRadius: 10, padding: '8px 24px' }}
            >
              {saving ? 'Création...' : 'Créer la session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
