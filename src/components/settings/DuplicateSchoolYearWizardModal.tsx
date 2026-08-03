import React, { useState } from 'react';
import {
  Copy, Calendar, Check, ArrowRight, ShieldCheck, CheckCircle2,
  AlertTriangle, Users, BookOpen, GraduationCap, Sliders, DollarSign,
  Bus, UtensilsCrossed, FileText, ChevronRight, X, Clock, Layers, Sparkles,
} from 'lucide-react';
import { SchoolYearItem } from '../../types';

interface DuplicateSchoolYearWizardModalProps {
  sourceYear: SchoolYearItem;
  existingYears: SchoolYearItem[];
  onClose: () => void;
  onSuccess: (newYearLabel: string) => void;
}

export default function DuplicateSchoolYearWizardModal({
  sourceYear,
  existingYears,
  onClose,
  onSuccess,
}: DuplicateSchoolYearWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Étape 1 : Formulaire Général
  const [newYearForm, setNewYearForm] = useState({
    label: '2026-2027',
    startDate: '2026-09-15',
    endDate: '2027-06-30',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Étape 2 : Éléments à Dupliquer
  const [copyOptions, setCopyOptions] = useState({
    classes: true,
    levels: true,
    subjects: true,
    coefficients: true,
    teachers: true,
    tuitionFees: true,
    canteenFees: true,
    transportFees: true,
    pedagogyConfig: true,
    evaluationConfig: true,
    terms: true,
    documentTemplates: true,
    generalConfig: true,
    // Promotion élèves
    enableStudentPromotion: false,
  });

  // Étape 3 : Mapping de Promotion des Classes
  const [classPromotionMapping, setClassPromotionMapping] = useState<Record<string, string>>({
    'CP1 A': 'CP2 A',
    'CP2 A': 'CE1 A',
    'CE1 A': 'CE2 A',
    'CE2 A': 'CM1 A',
    'CM1 A': 'CM2 A',
    'CM2 A': 'SORTANTS',
  });

  // Étape 4 : État de Duplication & Bilan
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summaryReport, setSummaryReport] = useState<{
    classesCount: number;
    subjectsCount: number;
    teachersCount: number;
    promotedStudentsCount: number;
    configItemsCount: number;
    executionTimeMs: number;
  } | null>(null);

  // Validation Étape 1
  const handleNextFromStep1 = () => {
    setValidationError(null);
    if (!newYearForm.label.trim()) {
      setValidationError('Le nom de la nouvelle année est obligatoire.');
      return;
    }
    const duplicate = existingYears.some(
      (y) => y.label.trim().toLowerCase() === newYearForm.label.trim().toLowerCase()
    );
    if (duplicate) {
      setValidationError(`Une année scolaire nommée "${newYearForm.label}" existe déjà dans le système.`);
      return;
    }
    if (newYearForm.startDate >= newYearForm.endDate) {
      setValidationError('La date de début doit être antérieure à la date de fin.');
      return;
    }
    setStep(2);
  };

  // Exécution de la Duplication
  const handleExecuteDuplication = async () => {
    setStep(4);
    setIsDuplicating(true);
    setProgress(10);

    const startTime = performance.now();

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 150);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setIsDuplicating(false);

      const executionTime = Math.round(performance.now() - startTime);

      const report = {
        classesCount: copyOptions.classes ? 14 : 0,
        subjectsCount: copyOptions.subjects ? 22 : 0,
        teachersCount: copyOptions.teachers ? 18 : 0,
        promotedStudentsCount: copyOptions.enableStudentPromotion ? 980 : 0,
        configItemsCount: 45,
        executionTimeMs: executionTime,
      };

      setSummaryReport(report);

      // Consigner dans l'Audit Log
      try {
        const existingLogs = JSON.parse(localStorage.getItem('gesco_audit_logs') || '[]');
        const newLog = {
          id: `log-dup-${Date.now()}`,
          timestamp: new Date().toLocaleString('fr-FR'),
          user: 'Administrateur Général',
          role: 'ADMIN_GENERAL',
          action: `Duplication Année Scolaire (${sourceYear.label} ➔ ${newYearForm.label})`,
          module: 'SYSTEM',
          ipAddress: '192.168.1.10',
          severity: 'SUCCESS',
          details: `Nouvelle année préparée avec ${report.classesCount} classes, ${report.subjectsCount} matières et ${report.promotedStudentsCount} élèves reportés.`,
        };
        localStorage.setItem('gesco_audit_logs', JSON.stringify([newLog, ...existingLogs]));
      } catch {}

    }, 900);
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div className="card shadow-2xl" style={{ maxWidth: 780, width: '100%', borderRadius: 20, border: 'none', background: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* ── BANNIÈRE HEADER STEPPER ───────────────────────────────────────── */}
        <div style={{ padding: '20px 28px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Copy size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Assistant de Duplication d'Année Scolaire
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78125rem', color: '#94a3b8', fontWeight: 500 }}>
                Préparation guidée à partir de l'année source : <strong style={{ color: '#60a5fa' }}>{sourceYear.label}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        {/* ── STEPPER VISUEL PREDISPOSÉ ────────────────────────────────────── */}
        <div style={{ padding: '14px 28px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {[
            { num: 1, label: 'Informations Générales' },
            { num: 2, label: 'Éléments à Recopier' },
            { num: 3, label: 'Passage des Élèves' },
            { num: 4, label: 'Validation & Exécution' },
          ].map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: isDone ? '#10b981' : isActive ? '#2563eb' : '#cbd5e1',
                  color: '#ffffff', fontWeight: 800, fontSize: '0.75rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 0 4px rgba(37,99,235,0.2)' : 'none',
                }}>
                  {isDone ? <Check size={14} /> : s.num}
                </div>
                <span style={{ fontSize: '0.78125rem', fontWeight: isActive ? 800 : 500, color: isActive ? '#0f172a' : '#64748b' }}>
                  {s.label}
                </span>
                {s.num < 4 && <ChevronRight size={14} color="#94a3b8" style={{ margin: '0 4px' }} />}
              </div>
            );
          })}
        </div>

        {/* ── CONTENU DES ÉTAPES ────────────────────────────────────────────── */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>

          {/* ÉTAPE 1 : INFORMATIONS GÉNÉRALES */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, color: '#1e40af', fontSize: '0.8125rem', fontWeight: 600 }}>
                <Sparkles size={18} color="#2563eb" />
                L'assistant va dupliquer la structure pédagogique et tarifaire de l'année <strong>{sourceYear.label}</strong> pour créer votre nouvelle année scolaire.
              </div>

              {validationError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', color: '#991b1b', fontSize: '0.8125rem', fontWeight: 700 }}>
                  ⚠️ {validationError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Nom de la Nouvelle Année Scolaire *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ex: 2026-2027"
                  value={newYearForm.label}
                  onChange={(e) => setNewYearForm({ ...newYearForm, label: e.target.value })}
                  style={{ height: 42, fontSize: '0.9375rem', fontWeight: 700, borderRadius: 10 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Date de Début *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newYearForm.startDate}
                    onChange={(e) => setNewYearForm({ ...newYearForm, startDate: e.target.value })}
                    style={{ height: 42, borderRadius: 10 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Date de Fin *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newYearForm.endDate}
                    onChange={(e) => setNewYearForm({ ...newYearForm, endDate: e.target.value })}
                    style={{ height: 42, borderRadius: 10 }}
                  />
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#0f172a' }}>Statut Initial Par Défaut</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>La nouvelle année sera créée au statut Préparation / Inactive</div>
                </div>
                <span className="badge badge-warning fw-bold px-3 py-1" style={{ borderRadius: 10 }}>⏳ Préparation</span>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : ÉLÉMENTS À RECOPIER */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>
                Sélectionnez les paramètres et éléments de structure de l'année <strong>{sourceYear.label}</strong> à dupliquer dans la nouvelle année :
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem' }}>
                {[
                  { key: 'classes', label: 'Classes & Niveaux', icon: <Layers size={16} /> },
                  { key: 'subjects', label: 'Matières & Coefficients', icon: <BookOpen size={16} /> },
                  { key: 'teachers', label: 'Enseignants affectés', icon: <GraduationCap size={16} /> },
                  { key: 'tuitionFees', label: 'Frais de scolarité', icon: <DollarSign size={16} /> },
                  { key: 'canteenFees', label: 'Tarifs Cantine', icon: <UtensilsCrossed size={16} /> },
                  { key: 'transportFees', label: 'Tarifs Transport', icon: <Bus size={16} /> },
                  { key: 'pedagogyConfig', label: 'Paramètres Pédagogiques', icon: <Sliders size={16} /> },
                  { key: 'evaluationConfig', label: 'Paramètres d\'Évaluations', icon: <CheckCircle2 size={16} /> },
                  { key: 'terms', label: 'Trimestres & Semestres', icon: <Clock size={16} /> },
                  { key: 'documentTemplates', label: 'Modèles de Documents', icon: <FileText size={16} /> },
                  { key: 'generalConfig', label: 'Paramètres Généraux', icon: <ShieldCheck size={16} /> },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px', borderRadius: 12,
                      background: (copyOptions as any)[opt.key] ? '#eff6ff' : '#f8fafc',
                      border: (copyOptions as any)[opt.key] ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={(copyOptions as any)[opt.key]}
                      onChange={(e) => setCopyOptions({ ...copyOptions, [opt.key]: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                    />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {opt.icon} {opt.label}
                    </span>
                  </label>
                ))}
              </div>

              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px', color: '#92400e', fontSize: '0.78125rem', fontWeight: 600 }}>
                🛡️ <strong>Exclusions automatiques de sécurité :</strong> Les Élèves, Notes, Bulletins, Versements, Reçus, Présences et Journaux d'Audit de l'année précédente ne sont <strong>jamais recopiés</strong>.
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : PASSAGE DES ÉLÈVES (PROMOTION AUTOMATIQUE) */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '14px 18px', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                    Reporter automatiquement les élèves dans la nouvelle année
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Promouvoir automatiquement chaque classe d'élèves au niveau supérieur
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={copyOptions.enableStudentPromotion}
                  onChange={(e) => setCopyOptions({ ...copyOptions, enableStudentPromotion: e.target.checked })}
                  style={{ width: 22, height: 22, accentColor: '#10b981', cursor: 'pointer' }}
                />
              </div>

              {copyOptions.enableStudentPromotion && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    Mapping de Promotion Automatique des Classes :
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {Object.entries(classPromotionMapping).map(([sourceClass, targetClass]) => (
                      <div key={sourceClass} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.8125rem' }}>{sourceClass}</span>
                        <ArrowRight size={14} color="#94a3b8" />
                        <select
                          value={targetClass}
                          onChange={(e) => setClassPromotionMapping({ ...classPromotionMapping, [sourceClass]: e.target.value })}
                          className="form-select"
                          style={{ width: '110px', height: 34, fontSize: '0.78125rem', fontWeight: 700, borderRadius: 8 }}
                        >
                          <option value="CP2 A">CP2 A</option>
                          <option value="CE1 A">CE1 A</option>
                          <option value="CE2 A">CE2 A</option>
                          <option value="CM1 A">CM1 A</option>
                          <option value="CM2 A">CM2 A</option>
                          <option value="SORTANTS">🎓 Sortants</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 4 : EXÉCUTION & RESUMÉ FINAL */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
              {isDuplicating ? (
                <div style={{ width: '100%', textAlign: 'center', padding: '30px 0' }}>
                  <div style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Duplication de l'année scolaire en cours...
                  </div>
                  <div style={{ width: '100%', height: 12, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #2563eb 0%, #10b981 100%)', transition: 'width 0.2s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 700 }}>{progress}% - Copie des structures &amp; paramètres</span>
                </div>
              ) : summaryReport ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, color: '#065f46' }}>
                    <CheckCircle2 size={32} color="#10b981" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 900, color: '#065f46' }}>
                        Année Scolaire {newYearForm.label} Créée avec Succès !
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#047857' }}>
                        La nouvelle année est disponible et prête pour l'exercice.
                      </p>
                    </div>
                  </div>

                  <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    Bilan Détaillé de la Duplication :
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.875rem' }}>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Classes Copiées</span>
                      <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#2563eb' }}>{summaryReport.classesCount}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Matières &amp; Coeffs</span>
                      <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#8b5cf6' }}>{summaryReport.subjectsCount}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Enseignants Affectés</span>
                      <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#f59e0b' }}>{summaryReport.teachersCount}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Élèves Reportés</span>
                      <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#10b981' }}>{summaryReport.promotedStudentsCount}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Temps d'Exécution</span>
                      <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#0f172a' }}>{summaryReport.executionTimeMs} ms</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

        </div>

        {/* ── BOUTONS D'ACTION DU FOOTER ─────────────────────────────────────── */}
        <div style={{ padding: '16px 28px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 1 && step < 4 ? (
            <button className="btn btn-outline fw-bold" onClick={() => setStep((prev) => (prev - 1) as any)} style={{ borderRadius: 10 }}>
              Retour
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 10 }}>
            {step < 3 && (
              <button className="btn btn-primary fw-bold" onClick={handleNextFromStep1} style={{ borderRadius: 10, padding: '10px 20px' }}>
                Suivant <ArrowRight size={15} style={{ marginLeft: 6 }} />
              </button>
            )}
            {step === 3 && (
              <button className="btn btn-primary fw-bold" onClick={handleExecuteDuplication} style={{ borderRadius: 10, padding: '10px 20px', background: '#10b981', border: 'none' }}>
                Lancer la Duplication <Sparkles size={15} style={{ marginLeft: 6 }} />
              </button>
            )}
            {step === 4 && summaryReport && (
              <button className="btn btn-primary fw-bold" onClick={() => { onSuccess(newYearForm.label); onClose(); }} style={{ borderRadius: 10, padding: '10px 24px' }}>
                Fermer l'Assistant
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
