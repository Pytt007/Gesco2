// ─────────────────────────────────────────────────────────────────────────────
// GESCO — GradeEntryGrid (src/components/academic/results/GradeEntryGrid.tsx)
// Polish Ergonomique Tableur Google Sheets / Excel pour la Saisie des Notes
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  RotateCcw,
  RotateCw,
  Search,
  Wifi,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import { AbsenceStatus, ScoreInput } from '../../../services/academic/results';

export interface SubjectHeader {
  id: string;
  code: string;
  name: string;
  maxScore: number;
}

export interface StudentRowData {
  studentId: string;
  matricule: string;
  firstName: string;
  lastName: string;
  scores: Record<string, { score: number | null; absenceStatus: AbsenceStatus }>;
  total: number | null;
  average: number | null;
  appreciation: string | null;
  status: string;
  decision: string | null;
  isPublished?: boolean;
}

interface GradeEntryGridProps {
  sessionId: string;
  subjects: SubjectHeader[];
  students: StudentRowData[];
  onSaveScores: (studentId: string, scores: ScoreInput[]) => Promise<boolean>;
  isLocked?: boolean;
  isPublished?: boolean;
  selectedSubjectId?: string;
}

export const GradeEntryGrid: React.FC<GradeEntryGridProps> = ({
  sessionId,
  subjects,
  students: initialStudents,
  onSaveScores,
  isLocked = false,
  isPublished = false,
  selectedSubjectId = subjects[0]?.id || 'math',
}) => {
  const [gridData, setGridData] = useState<StudentRowData[]>(initialStudents);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(0);

  // Undo / Redo stacks
  const [history, setHistory] = useState<StudentRowData[][]>([]);
  const [future, setFuture] = useState<StudentRowData[][]>([]);

  // Auto-save & Status state
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Matière courante du tableur
  const currentSubjectObj = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  }, [subjects, selectedSubjectId]);

  // Synchronisation avec les props initiales
  useEffect(() => {
    setGridData(initialStudents);
  }, [initialStudents]);

  // Auto-focus sur la première cellule au chargement
  useEffect(() => {
    if (gridData.length > 0 && currentSubjectObj) {
      const firstRefKey = `0_${currentSubjectObj.id}`;
      setTimeout(() => {
        if (inputRefs.current[firstRefKey]) {
          inputRefs.current[firstRefKey]?.focus();
          inputRefs.current[firstRefKey]?.select();
        }
      }, 100);
    }
  }, [selectedSubjectId]);

  // Détection du mode en ligne / hors-ligne
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filtrage des élèves par recherche
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return gridData;
    const q = searchQuery.toLowerCase();
    return gridData.filter(
      (s) =>
        s.lastName.toLowerCase().includes(q) ||
        s.firstName.toLowerCase().includes(q) ||
        s.matricule.toLowerCase().includes(q)
    );
  }, [gridData, searchQuery]);

  // Enregistrement d'un instantané pour Undo
  const pushHistory = useCallback((currentData: StudentRowData[]) => {
    setHistory((prev) => [...prev.slice(-20), JSON.parse(JSON.stringify(currentData))]);
    setFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture((prev) => [JSON.parse(JSON.stringify(gridData)), ...prev]);
    setGridData(previous);
    setHistory((prev) => prev.slice(0, prev.length - 1));
  }, [history, gridData]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(gridData))]);
    setGridData(next);
    setFuture((prev) => prev.slice(1));
  }, [future, gridData]);

  // Helper de calcul d'appréciation automatique en direct
  const getAutoAppreciation = (score: number | null, absenceStatus: AbsenceStatus): string => {
    if (absenceStatus === 'ABSENT') return 'Absent';
    if (absenceStatus === 'EXCUSED_ABSENT') return 'Absent justifié';
    if (absenceStatus === 'DISPENSED') return 'Dispensé';
    if (score === null || score === undefined) return '—';
    if (score >= 16) return 'Très bon travail';
    if (score >= 14) return 'Bon travail';
    if (score >= 12) return 'Satisfaisant';
    if (score >= 10) return 'Passable';
    return 'Insuffisant';
  };

  // Modification d'une note avec validation et auto-save silencieux
  const handleScoreChange = useCallback(
    (studentId: string, subjectId: string, valStr: string, maxScore: number) => {
      pushHistory(gridData);

      let newScore: number | null = null;
      let errorMsg = '';

      if (valStr.trim() !== '') {
        const parsed = parseFloat(valStr.replace(',', '.'));
        if (isNaN(parsed)) {
          errorMsg = 'Format invalide';
        } else if (parsed < 0) {
          errorMsg = 'Note négative interdite';
        } else if (parsed > maxScore) {
          errorMsg = `Dépasse /${maxScore}`;
        } else {
          newScore = parsed;
        }
      }

      // Mise à jour des erreurs de validation
      const errKey = `${studentId}_${subjectId}`;
      setValidationErrors((prev) => {
        const next = { ...prev };
        if (errorMsg) next[errKey] = errorMsg;
        else delete next[errKey];
        return next;
      });

      // Mise à jour locale du state + recalcul appréciation
      setGridData((prevData) =>
        prevData.map((s) => {
          if (s.studentId !== studentId) return s;
          const currentSubjectScore = s.scores[subjectId] || { score: null, absenceStatus: 'PRESENT' };
          const updatedScoreVal = errorMsg ? currentSubjectScore.score : newScore;
          const updatedAppreciation = getAutoAppreciation(updatedScoreVal, currentSubjectScore.absenceStatus);

          return {
            ...s,
            appreciation: updatedAppreciation,
            scores: {
              ...s.scores,
              [subjectId]: {
                ...currentSubjectScore,
                score: updatedScoreVal,
              },
            },
          };
        })
      );

      // Auto-sauvegarde transparente
      if (!errorMsg) {
        setSavingStatus('saving');
        const targetStudent = gridData.find((s) => s.studentId === studentId);
        if (targetStudent) {
          const updatedScoresInput: ScoreInput[] = subjects.map((sub) => {
            const sc = sub.id === subjectId
              ? { score: newScore, absenceStatus: targetStudent.scores[sub.id]?.absenceStatus || 'PRESENT' }
              : targetStudent.scores[sub.id] || { score: null, absenceStatus: 'PRESENT' };
            return {
              subjectId: sub.id,
              score: sc.score,
              absenceStatus: sc.absenceStatus,
              maxScore: sub.maxScore,
            };
          });

          onSaveScores(studentId, updatedScoresInput).then((ok) => {
            setSavingStatus(ok ? 'saved' : 'error');
          });
        }
      }
    },
    [gridData, pushHistory, subjects, onSaveScores]
  );

  // Modification du statut de présence réactif (PRESENT, ABSENT, EXCUSED_ABSENT, DISPENSED)
  const handleAbsenceToggle = useCallback(
    (studentId: string, subjectId: string, newAbsence: AbsenceStatus) => {
      pushHistory(gridData);
      setGridData((prevData) =>
        prevData.map((s) => {
          if (s.studentId !== studentId) return s;
          const current = s.scores[subjectId] || { score: null, absenceStatus: 'PRESENT' };
          const updatedScore = newAbsence !== 'PRESENT' ? null : current.score;
          const updatedAppreciation = getAutoAppreciation(updatedScore, newAbsence);

          return {
            ...s,
            appreciation: updatedAppreciation,
            scores: {
              ...s.scores,
              [subjectId]: {
                score: updatedScore,
                absenceStatus: newAbsence,
              },
            },
          };
        })
      );
    },
    [gridData, pushHistory]
  );

  // Copier/Coller multi-lignes depuis Excel
  const handlePaste = useCallback(
    (e: React.ClipboardEvent, startRowIndex: number) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      if (!text || !currentSubjectObj) return;

      pushHistory(gridData);
      const rows = text.split(/\r?\n/).filter((r) => r.trim() !== '');

      setGridData((prevData) => {
        const nextData = [...prevData];
        rows.forEach((rowText, rOffset) => {
          const targetRowIndex = startRowIndex + rOffset;
          if (targetRowIndex >= nextData.length) return;

          const parsed = parseFloat(rowText.trim().replace(',', '.'));
          if (!isNaN(parsed) && parsed >= 0 && parsed <= currentSubjectObj.maxScore) {
            const student = nextData[targetRowIndex];
            const curSc = student.scores[currentSubjectObj.id] || { score: null, absenceStatus: 'PRESENT' };
            student.scores[currentSubjectObj.id] = { ...curSc, score: parsed };
            student.appreciation = getAutoAppreciation(parsed, curSc.absenceStatus);
          }
        });
        return nextData;
      });
    },
    [gridData, pushHistory, currentSubjectObj]
  );

  // Navigation au clavier type Excel (Entrée = Bas, Tab = Droite, Shift+Tab = Gauche, Flèches)
  const handleKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number
  ) => {
    // Raccourcis Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
      return;
    }

    let nextRow = rowIndex;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < filteredStudents.length - 1) {
        nextRow = rowIndex + 1;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        nextRow = rowIndex - 1;
      }
    }

    if (nextRow !== rowIndex) {
      const refKey = `${nextRow}_${currentSubjectObj.id}`;
      setActiveRowIndex(nextRow);
      inputRefs.current[refKey]?.focus();
      inputRefs.current[refKey]?.select();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>
      
      {/* ── 1. BARRE D'OUTILS SIMPLIFIÉE & ÉPURÉE ───────────────────────── */}
      <div
        style={{
          padding: '10px 16px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Recherche Élève */}
        <div className="input-group input-group-sm" style={{ width: 260 }}>
          <span className="input-group-text bg-light border-end-0" style={{ borderRadius: '8px 0 0 8px' }}>
            <Search size={14} className="text-muted" />
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Rechercher un élève..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ borderRadius: '0 8px 8px 0', fontSize: '0.8125rem' }}
          />
        </div>

        {/* Annuler / Rétablir & Statut En ligne */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn btn-outline-secondary btn-sm p-1 px-2"
              onClick={handleUndo}
              disabled={history.length === 0}
              title="Annuler (Ctrl+Z)"
              style={{ borderRadius: 6 }}
            >
              <RotateCcw size={13} />
            </button>
            <button
              className="btn btn-outline-secondary btn-sm p-1 px-2"
              onClick={handleRedo}
              disabled={future.length === 0}
              title="Rétablir (Ctrl+Y)"
              style={{ borderRadius: 6 }}
            >
              <RotateCw size={13} />
            </button>
          </div>

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 999,
              background: isOnline ? '#ecfdf5' : '#fef2f2',
              color: isOnline ? '#047857' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isOnline ? 'En ligne' : 'Hors-ligne'}
          </span>
        </div>
      </div>

      {/* ── 3. HAUTEUR DE LIGNE RÉDUITE DE 20% & TABLEUR GOOGLE SHEETS ─────── */}
      <div className="table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
        <table className="table table-bordered align-middle mb-0" style={{ fontSize: '0.84375rem', borderCollapse: 'collapse' }}>
          <thead className="sticky-top" style={{ zIndex: 10, background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
            <tr style={{ height: 36 }}>
              <th style={{ width: 100, padding: '6px 12px', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                MATRICULE
              </th>
              <th style={{ minWidth: 220, padding: '6px 12px', fontSize: '0.8125rem', color: '#0f172a', fontWeight: 500 }}>
                NOM &amp; PRÉNOM
              </th>
              
              {/* Colonne Note Matière — Libellé purifié sans doublon */}
              <th className="text-center" style={{ width: 140, padding: '6px 12px', background: '#eff6ff' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  NOTE
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#3b82f6', fontWeight: 400 }}>
                  SUR /{currentSubjectObj?.maxScore || 20} PTS
                </div>
              </th>

              {/* Statut Présence */}
              <th className="text-center" style={{ width: 110, padding: '6px 12px', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                PRÉSENCE
              </th>

              {/* Appréciation Automatique */}
              <th style={{ minWidth: 180, padding: '6px 12px', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                APPRÉCIATION AUTOMATIQUE
              </th>

              {/* Statut de Saisie Français */}
              <th className="text-center" style={{ width: 100, padding: '6px 12px', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                STATUT
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.map((st, rIdx) => {
              const cellDisabled = isLocked || isPublished || st.isPublished;
              const scoreData = st.scores[currentSubjectObj?.id || 'math'] || { score: null, absenceStatus: 'PRESENT' };
              const refKey = `${rIdx}_${currentSubjectObj?.id || 'math'}`;
              const errKey = `${st.studentId}_${currentSubjectObj?.id || 'math'}`;
              const error = validationErrors[errKey];

              const isActiveRow = activeRowIndex === rIdx;
              const isEntered = scoreData.score !== null && scoreData.score !== undefined;

              return (
                <tr
                  key={st.studentId}
                  style={{
                    height: 38, // Hauteur compacte réduite de 20%
                    backgroundColor: isActiveRow ? '#f0f7ff' : rIdx % 2 === 0 ? '#ffffff' : '#fafafa',
                    transition: 'background-color 0.15s ease',
                  }}
                  onClick={() => setActiveRowIndex(rIdx)}
                >
                  {/* 4. Matricule Allégé */}
                  <td style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>
                    {st.matricule}
                  </td>

                  {/* Nom & Prénom Dominant */}
                  <td style={{ padding: '6px 12px', fontWeight: 800, color: '#0f172a' }}>
                    {st.lastName} {st.firstName}
                  </td>

                  {/* 2. Cellule Note Style Google Sheets */}
                  <td
                    style={{ padding: '4px 8px', textAlign: 'center', position: 'relative' }}
                    onPaste={(e) => handlePaste(e, rIdx)}
                  >
                    <input
                      ref={(el) => (inputRefs.current[refKey] = el)}
                      type="number"
                      step="0.25"
                      min="0"
                      max={currentSubjectObj?.maxScore || 20}
                      disabled={cellDisabled || scoreData.absenceStatus !== 'PRESENT'}
                      className={`form-control form-control-sm text-center fw-bold ${error ? 'is-invalid' : ''}`}
                      style={{
                        width: '90px',
                        height: '30px',
                        margin: '0 auto',
                        fontSize: '0.9375rem',
                        borderRadius: '6px',
                        border: error ? '2px solid #dc2626' : '1px solid #cbd5e1',
                        backgroundColor: cellDisabled
                          ? '#f1f5f9'
                          : scoreData.absenceStatus !== 'PRESENT'
                          ? '#fee2e2'
                          : '#ffffff',
                        color: scoreData.absenceStatus !== 'PRESENT' ? '#991b1b' : '#0f172a',
                        boxShadow: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onFocus={(e) => {
                        setActiveRowIndex(rIdx);
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.backgroundColor = '#eff6ff';
                        e.target.select();
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = error ? '#dc2626' : '#cbd5e1';
                        e.target.style.backgroundColor = scoreData.absenceStatus !== 'PRESENT' ? '#fee2e2' : '#ffffff';
                      }}
                      value={scoreData.score !== null && scoreData.score !== undefined ? scoreData.score : ''}
                      onChange={(e) => handleScoreChange(st.studentId, currentSubjectObj.id, e.target.value, currentSubjectObj.maxScore)}
                      onKeyDown={(e) => handleKeyDown(e, rIdx)}
                    />
                    {error && (
                      <div className="text-danger" style={{ fontSize: '0.625rem', marginTop: 2 }}>
                        {error}
                      </div>
                    )}
                  </td>

                  {/* 7. Sélecteur Absence Discret en Ligne */}
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                    <select
                      className="form-select form-select-sm p-0 text-center fw-bold"
                      style={{
                        width: '58px',
                        height: '30px',
                        margin: '0 auto',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        borderColor: '#cbd5e1',
                      }}
                      value={scoreData.absenceStatus}
                      disabled={cellDisabled}
                      onChange={(e) => handleAbsenceToggle(st.studentId, currentSubjectObj.id, e.target.value as AbsenceStatus)}
                    >
                      <option value="PRESENT">P</option>
                      <option value="ABSENT">ABS</option>
                      <option value="EXCUSED_ABSENT">AJ</option>
                      <option value="DISPENSED">DISP</option>
                    </select>
                  </td>

                  {/* 4. Appréciation Automatique */}
                  <td style={{ padding: '6px 12px', fontSize: '0.8125rem', color: '#64748b' }}>
                    {getAutoAppreciation(scoreData.score, scoreData.absenceStatus)}
                  </td>

                  {/* 4. Statut Français Allégé (✔ Saisi, 🟡 En cours, ⚪ À saisir) */}
                  <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                    {isEntered ? (
                      <span className="badge bg-success" style={{ fontSize: '0.6875rem' }}>✔ Saisi</span>
                    ) : scoreData.absenceStatus !== 'PRESENT' ? (
                      <span className="badge bg-warning text-dark" style={{ fontSize: '0.6875rem' }}>🟡 Absence</span>
                    ) : (
                      <span className="badge bg-light text-dark border" style={{ fontSize: '0.6875rem' }}>⚪ À saisir</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
