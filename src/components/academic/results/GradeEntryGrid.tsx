// ─────────────────────────────────────────────────────────────────────────────
// GESCO — GradeEntryGrid (src/components/academic/results/GradeEntryGrid.tsx)
// Grille tableur Excel haute performance pour la saisie des notes par les enseignants.
// Navigation clavier (Tab, Flèches, Entrée), auto-sauvegarde, copier/coller Excel,
// mode hors-ligne, annuler/rétablir et recalcul réactif via l'Academic Engine.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Save,
  RotateCcw,
  RotateCw,
  Clipboard,
  CheckCircle,
  AlertTriangle,
  Lock,
  Wifi,
  WifiOff,
  Search,
} from 'lucide-react';
import { AssessmentResult, ScoreInput, AbsenceStatus } from '../../../services/academic/results';

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
}

export const GradeEntryGrid: React.FC<GradeEntryGridProps> = ({
  sessionId,
  subjects,
  students: initialStudents,
  onSaveScores,
  isLocked = false,
  isPublished = false,
}) => {
  const [gridData, setGridData] = useState<StudentRowData[]>(initialStudents);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; subjectId: string } | null>(null);

  // Undo / Redo stacks
  const [history, setHistory] = useState<StudentRowData[][]>([]);
  const [future, setFuture] = useState<StudentRowData[][]>([]);

  // Auto-save & Status state
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Synchronisation avec les props initiales
  useEffect(() => {
    setGridData(initialStudents);
  }, [initialStudents]);

  // Détection du mode en ligne / hors-ligne
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Synchro données locales hors-ligne
  const syncOfflineData = useCallback(async () => {
    const offlineKey = `gesco_offline_results_${sessionId}`;
    const raw = localStorage.getItem(offlineKey);
    if (raw) {
      try {
        const offlineQueue = JSON.parse(raw);
        for (const item of offlineQueue) {
          await onSaveScores(item.studentId, item.scores);
        }
        localStorage.removeItem(offlineKey);
      } catch (err) {
        console.warn('Erreur de synchronisation hors-ligne:', err);
      }
    }
  }, [sessionId, onSaveScores]);

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

  // Modification d'une note avec validation et auto-save
  const handleScoreChange = useCallback(
    (studentId: string, subjectId: string, valStr: string, maxScore: number) => {
      pushHistory(gridData);

      let newScore: number | null = null;
      let errorMsg = '';

      if (valStr.trim() !== '') {
        const parsed = parseFloat(valStr);
        if (isNaN(parsed)) {
          errorMsg = 'Format invalide';
        } else if (parsed < 0) {
          errorMsg = 'Note négative interdite';
        } else if (parsed > maxScore) {
          errorMsg = `Dépasse le barème (${maxScore})`;
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

      // Mise à jour locale du state
      setGridData((prevData) =>
        prevData.map((s) => {
          if (s.studentId !== studentId) return s;
          const currentSubjectScore = s.scores[subjectId] || { score: null, absenceStatus: 'PRESENT' };
          return {
            ...s,
            scores: {
              ...s.scores,
              [subjectId]: {
                ...currentSubjectScore,
                score: errorMsg ? currentSubjectScore.score : newScore,
              },
            },
          };
        })
      );

      // Auto-sauvegarde avec le service si la valeur est valide
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

          if (!isOnline) {
            // Sauvegarde locale hors-ligne
            const offlineKey = `gesco_offline_results_${sessionId}`;
            const existingRaw = localStorage.getItem(offlineKey);
            const queue = existingRaw ? JSON.parse(existingRaw) : [];
            queue.push({ studentId, scores: updatedScoresInput });
            localStorage.setItem(offlineKey, JSON.stringify(queue));
            setSavingStatus('saved');
          } else {
            onSaveScores(studentId, updatedScoresInput).then((ok) => {
              setSavingStatus(ok ? 'saved' : 'error');
            });
          }
        }
      }
    },
    [gridData, pushHistory, subjects, isOnline, sessionId, onSaveScores]
  );

  // Modification du statut de présence (PRESENT, ABSENT, EXCUSED_ABSENT)
  const handleAbsenceToggle = useCallback(
    (studentId: string, subjectId: string, newAbsence: AbsenceStatus) => {
      pushHistory(gridData);
      setGridData((prevData) =>
        prevData.map((s) => {
          if (s.studentId !== studentId) return s;
          const current = s.scores[subjectId] || { score: null, absenceStatus: 'PRESENT' };
          return {
            ...s,
            scores: {
              ...s.scores,
              [subjectId]: {
                score: newAbsence !== 'PRESENT' ? null : current.score,
                absenceStatus: newAbsence,
              },
            },
          };
        })
      );
    },
    [gridData, pushHistory]
  );

  // Copier/Coller depuis Excel (parsing TAB \t et Newline \n)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent, startRowIndex: number, startSubjectIndex: number) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      if (!text) return;

      pushHistory(gridData);
      const rows = text.split(/\r?\n/).filter((r) => r.trim() !== '');

      setGridData((prevData) => {
        const nextData = [...prevData];
        rows.forEach((rowText, rOffset) => {
          const targetRowIndex = startRowIndex + rOffset;
          if (targetRowIndex >= nextData.length) return;

          const cells = rowText.split('\t');
          cells.forEach((cellVal, cOffset) => {
            const targetSubIndex = startSubjectIndex + cOffset;
            if (targetSubIndex >= subjects.length) return;

            const sub = subjects[targetSubIndex];
            const parsed = parseFloat(cellVal.replace(',', '.'));
            if (!isNaN(parsed) && parsed >= 0 && parsed <= sub.maxScore) {
              const student = nextData[targetRowIndex];
              const curSc = student.scores[sub.id] || { score: null, absenceStatus: 'PRESENT' };
              student.scores[sub.id] = { ...curSc, score: parsed };
            }
          });
        });
        return nextData;
      });
    },
    [gridData, pushHistory, subjects]
  );

  // Navigation au clavier (TAB, Flèches, Entrée)
  const handleKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    subjectIndex: number,
    subjectId: string
  ) => {
    // Shortcuts Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
      return;
    }

    let nextRow = rowIndex;
    let nextSub = subjectIndex;

    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      if (subjectIndex < subjects.length - 1) {
        nextSub = subjectIndex + 1;
      } else if (rowIndex < filteredStudents.length - 1) {
        nextRow = rowIndex + 1;
        nextSub = 0;
      }
    } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      if (subjectIndex > 0) {
        nextSub = subjectIndex - 1;
      } else if (rowIndex > 0) {
        nextRow = rowIndex - 1;
        nextSub = subjects.length - 1;
      }
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
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

    if (nextRow !== rowIndex || nextSub !== subjectIndex) {
      const nextSubId = subjects[nextSub].id;
      const refKey = `${nextRow}_${nextSubId}`;
      inputRefs.current[refKey]?.focus();
      inputRefs.current[refKey]?.select();
      setFocusedCell({ rowIndex: nextRow, subjectId: nextSubId });
    }
  };

  return (
    <div className="card shadow-sm mb-4" style={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
      {/* Barre d'outils et recherche */}
      <div className="card-header bg-light p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="input-group input-group-sm" style={{ width: '260px' }}>
            <span className="input-group-text"><Search size={14} /></span>
            <input
              type="text"
              className="form-control"
              placeholder="Rechercher un élève..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
            <button
              className="btn btn-outline-secondary btn-sm p-1 px-2"
              onClick={handleUndo}
              disabled={history.length === 0}
              title="Annuler (Ctrl+Z)"
            >
              <RotateCcw size={13} />
            </button>
            <button
              className="btn btn-outline-secondary btn-sm p-1 px-2"
              onClick={handleRedo}
              disabled={future.length === 0}
              title="Rétablir (Ctrl+Y)"
            >
              <RotateCw size={13} />
            </button>
          </div>
        </div>

        {/* Indicateurs d'état et Mode Hors-ligne */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8125rem' }}>
          <span className={`badge d-flex align-items-center gap-1 ${isOnline ? 'bg-success' : 'bg-danger'}`}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isOnline ? 'En ligne' : 'Hors-ligne (Stockage local)'}
          </span>

          {savingStatus === 'saving' && (
            <span className="text-warning d-flex align-items-center gap-1">
              <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
              Auto-sauvegarde...
            </span>
          )}
          {savingStatus === 'saved' && (
            <span className="text-success d-flex align-items-center gap-1">
              <CheckCircle size={14} /> Sauvegardé
            </span>
          )}
        </div>
      </div>

      {/* Grille tableur Excel (Table interactive) */}
      <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <table className="table table-bordered table-hover align-middle mb-0 text-sm" role="grid">
          <thead className="table-dark sticky-top" style={{ zIndex: 10 }}>
            <tr role="row">
              <th style={{ width: '90px' }} role="columnheader">Matricule</th>
              <th style={{ width: '200px' }} role="columnheader">Nom & Prénom</th>

              {/* Colonnes Matières Dynamiques */}
              {subjects.map((sub) => (
                <th key={sub.id} className="text-center" style={{ minWidth: '120px' }} role="columnheader">
                  <div>{sub.name}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 400 }}>
                    /{sub.maxScore} pts
                  </div>
                </th>
              ))}

              <th className="text-center" style={{ width: '80px' }} role="columnheader">Total</th>
              <th className="text-center" style={{ width: '80px' }} role="columnheader">Moyenne</th>
              <th style={{ width: '150px' }} role="columnheader">Appréciation</th>
              <th className="text-center" style={{ width: '110px' }} role="columnheader">Statut</th>
              <th className="text-center" style={{ width: '110px' }} role="columnheader">Décision</th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6 + subjects.length} className="text-center py-4 text-muted">
                  Aucun élève trouvé pour cette session.
                </td>
              </tr>
            ) : (
              filteredStudents.map((st, rIdx) => {
                const cellDisabled = isLocked || isPublished || st.isPublished;

                return (
                  <tr key={st.studentId} role="row">
                    {/* Matricule */}
                    <td className="fw-semibold text-muted" role="gridcell">{st.matricule}</td>

                    {/* Nom & Prénom */}
                    <td className="fw-medium" role="gridcell">
                      {st.lastName} {st.firstName}
                    </td>

                    {/* Cellules de notes par matière */}
                    {subjects.map((sub, sIdx) => {
                      const scoreData = st.scores[sub.id] || { score: null, absenceStatus: 'PRESENT' };
                      const refKey = `${rIdx}_${sub.id}`;
                      const errKey = `${st.studentId}_${sub.id}`;
                      const error = validationErrors[errKey];

                      return (
                        <td
                          key={sub.id}
                          className="p-1 text-center position-relative"
                          role="gridcell"
                          onPaste={(e) => handlePaste(e, rIdx, sIdx)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <input
                              ref={(el) => (inputRefs.current[refKey] = el)}
                              type="number"
                              step="0.25"
                              min="0"
                              max={sub.maxScore}
                              disabled={cellDisabled || scoreData.absenceStatus !== 'PRESENT'}
                              className={`form-control form-control-sm text-center fw-bold ${
                                error ? 'is-invalid border-danger' : ''
                              }`}
                              style={{
                                height: '32px',
                                backgroundColor: cellDisabled ? '#f1f5f9' : scoreData.absenceStatus !== 'PRESENT' ? '#fee2e2' : '#ffffff',
                              }}
                              value={scoreData.score !== null && scoreData.score !== undefined ? scoreData.score : ''}
                              onChange={(e) => handleScoreChange(st.studentId, sub.id, e.target.value, sub.maxScore)}
                              onKeyDown={(e) => handleKeyDown(e, rIdx, sIdx, sub.id)}
                              aria-label={`Note ${sub.name} pour ${st.lastName}`}
                            />

                            {/* Menu d'absence rapide */}
                            <select
                              className="form-select form-select-sm p-0 text-center"
                              style={{ width: '42px', height: '32px', fontSize: '0.65rem' }}
                              value={scoreData.absenceStatus}
                              disabled={cellDisabled}
                              onChange={(e) => handleAbsenceToggle(st.studentId, sub.id, e.target.value as AbsenceStatus)}
                            >
                              <option value="PRESENT">P</option>
                              <option value="ABSENT">A</option>
                              <option value="EXCUSED_ABSENT">AJ</option>
                            </select>
                          </div>

                          {error && (
                            <div className="text-danger" style={{ fontSize: '0.65rem', marginTop: 1 }}>
                              {error}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Total */}
                    <td className="text-center fw-bold" role="gridcell">
                      {st.total !== null && st.total !== undefined ? st.total.toFixed(2) : '—'}
                    </td>

                    {/* Moyenne */}
                    <td
                      className={`text-center fw-bold ${
                        st.average !== null && st.average >= 10 ? 'text-success' : 'text-danger'
                      }`}
                      role="gridcell"
                    >
                      {st.average !== null && st.average !== undefined ? st.average.toFixed(2) : '—'}
                    </td>

                    {/* Appréciation */}
                    <td className="text-muted text-truncate" style={{ maxWidth: '150px' }} role="gridcell">
                      {st.appreciation || '—'}
                    </td>

                    {/* Statut de correction */}
                    <td className="text-center" role="gridcell">
                      <span
                        className={`badge ${
                          st.status === 'PUBLISHED'
                            ? 'bg-success'
                            : st.status === 'VALIDATED'
                            ? 'bg-info'
                            : st.status === 'COMPLETED'
                            ? 'bg-primary'
                            : st.status === 'IN_PROGRESS'
                            ? 'bg-warning text-dark'
                            : 'bg-secondary'
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>

                    {/* Décision provisoire */}
                    <td className="text-center fw-semibold" role="gridcell">
                      <span
                        className={`badge ${
                          st.decision === 'ACQUIS' || st.decision === 'PASSE'
                            ? 'bg-success'
                            : st.decision === 'REDOUBLE'
                            ? 'bg-danger'
                            : 'bg-secondary'
                        }`}
                      >
                        {st.decision || 'EN_ATTENTE'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
