import React, { useState } from 'react';
import { useTimetable } from '../hooks/timetable/useTimetable';
import { useAcademicYears } from '../hooks/academic';
import { useSchoolYear } from '../context/SchoolYearContext';
import {
  DAYS_OF_WEEK,
  STANDARD_TIME_SLOTS,
  DayOfWeek,
  ScheduleSlotRecord,
  ScheduleSlotInput,
} from '../services/timetable/types';
import {
  Calendar, Clock, Plus, Printer, Copy, Users, UserCheck,
  BookOpen, MapPin, X, Trash2, Edit2, CheckCircle2, AlertCircle, FileText,
} from 'lucide-react';

export default function TimetablePage() {
  const { schoolYear } = useSchoolYear();
  const { academicYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear?.id || 'ay-2026');

  const {
    displayMode,
    setDisplayMode,
    classes = [],
    teachers = [],
    subjects = [],
    selectedClassId,
    setSelectedClassId,
    selectedTeacherId,
    setSelectedTeacherId,
    slots = [],
    loading,
    addSlot,
    updateSlot,
    deleteSlot,
    copySchedule,
  } = useTimetable(selectedYearId);

  // Modales
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlotRecord | null>(null);

  // Formulaire créneau
  const [form, setForm] = useState<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    subjectId: string;
    teacherId: string;
    room: string;
  }>({
    dayOfWeek: 'LUNDI',
    startTime: '07:30',
    endTime: '08:30',
    subjectId: '',
    teacherId: '',
    room: '',
  });

  // Formulaire copie de classe
  const [sourceClassId, setSourceClassId] = useState('');
  const [savingCopy, setSavingCopy] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);

  // Ouvrir modal ajout sur une case spécifique de la grille
  const handleCellClick = (day: DayOfWeek, startTime: string, endTime: string) => {
    if (displayMode === 'BY_TEACHER') return; // En mode enseignant, lecture seule intuitive
    setEditingSlot(null);
    setForm({
      dayOfWeek: day,
      startTime,
      endTime,
      subjectId: subjects[0]?.id || '',
      teacherId: teachers[0]?.id || '',
      room: '',
    });
    setShowSlotModal(true);
  };

  // Ouvrir modal d'édition
  const handleEditSlot = (slot: ScheduleSlotRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayMode === 'BY_TEACHER') return;
    setEditingSlot(slot);
    setForm({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectId: slot.subjectId,
      teacherId: slot.teacherId,
      room: slot.room || '',
    });
    setShowSlotModal(true);
  };

  // Soumission Formulaire Créneau
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSlot(true);

    const input: ScheduleSlotInput = {
      academicYearId: selectedYearId,
      classId: selectedClassId,
      subjectId: form.subjectId || (subjects[0]?.id ?? ''),
      teacherId: form.teacherId || (teachers[0]?.id ?? ''),
      room: form.room,
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
    };

    if (editingSlot) {
      const res = await updateSlot(editingSlot.id, input);
      if (res.success) setShowSlotModal(false);
    } else {
      const res = await addSlot(input);
      if (res.success) setShowSlotModal(false);
    }
    setSavingSlot(false);
  };

  // Supprimer créneau
  const handleDeleteSlot = async (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Voulez-vous supprimer ce cours du planning ?')) {
      await deleteSlot(slotId);
      setShowSlotModal(false);
    }
  };

  // Copier planning d'une classe
  const handleCopySchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceClassId || !selectedClassId) return;
    setSavingCopy(true);
    const res = await copySchedule(sourceClassId, selectedClassId);
    setSavingCopy(false);
    if (res.success) setShowCopyModal(false);
  };

  // Impression / PDF
  const handlePrintOrPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const selectedName = displayMode === 'BY_CLASS'
      ? classes.find((c) => c.id === selectedClassId)?.name || 'Classe'
      : teachers.find((t) => t.id === selectedTeacherId)?.name || 'Enseignant';

    const title = displayMode === 'BY_CLASS'
      ? `Emploi du Temps — ${selectedName}`
      : `Planning Enseignant — ${selectedName}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #0f172a; }
            h1 { font-size: 18px; color: #1e3a5f; margin-bottom: 4px; text-align: center; }
            p.sub { font-size: 11px; color: #64748b; margin-top: 0; text-align: center; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 11px; vertical-align: top; }
            th { background-color: #f1f5f9; font-weight: bold; height: 28px; }
            .time-col { width: 90px; background-color: #f8fafc; font-weight: bold; }
            .slot-card { background: #eff6ff; border-radius: 4px; padding: 4px; margin-bottom: 4px; border: 1px solid #bfdbfe; }
            .subject { font-weight: bold; color: #1d4ed8; font-size: 11px; }
            .info { font-size: 9px; color: #475569; margin-top: 2px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p class="sub">École Privée GESCO · Année Scolaire ${selectedYearId} · Édité le ${new Date().toLocaleDateString('fr-FR')}</p>
          <table>
            <thead>
              <tr>
                <th className="time-col">Horaire</th>
                ${DAYS_OF_WEEK.map((d) => `<th>${d.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${STANDARD_TIME_SLOTS.map((ts) => `
                <tr>
                  <td class="time-col">${ts.label}</td>
                  ${DAYS_OF_WEEK.map((day) => {
                    const matched = slots.filter(
                      (s) => s.dayOfWeek === day.key && s.startTime <= ts.startTime && s.endTime >= ts.endTime
                    );
                    return `
                      <td>
                        ${matched
                          .map(
                            (m) => `
                          <div class="slot-card" style="border-left: 3px solid ${m.subjectColor}">
                            <div class="subject">${m.subjectName}</div>
                            <div class="info">${displayMode === 'BY_CLASS' ? m.teacherName : m.className}</div>
                            ${m.room ? `<div class="info">📌 ${m.room}</div>` : ''}
                          </div>
                        `
                          )
                          .join('')}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* En-tête de page */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Emploi du Temps
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Gestion de l'emploi du temps par classe et consultation par enseignant.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline-secondary text-sm fw-semibold"
            onClick={handlePrintOrPDF}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
          >
            <Printer size={15} /> Imprimer / PDF
          </button>

          {displayMode === 'BY_CLASS' && (
            <>
              <button
                className="btn btn-outline-primary text-sm fw-semibold"
                onClick={() => {
                  setSourceClassId(classes.find((c) => c.id !== selectedClassId)?.id || '');
                  setShowCopyModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
              >
                <Copy size={15} /> Copier d'une classe
              </button>
              <button
                className="btn btn-primary text-sm fw-semibold"
                onClick={() => handleCellClick('LUNDI', '07:30', '08:30')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
              >
                <Plus size={15} /> Ajouter un cours
              </button>
            </>
          )}
        </div>
      </div>

      {/* BARRE DE SÉLECTION & MODE D'AFFICHAGE */}
      <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <div className="card-body p-3" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
            <button
              className={`btn btn-sm ${displayMode === 'BY_CLASS' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDisplayMode('BY_CLASS')}
              style={{ fontWeight: 600, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Users size={15} /> Par classe
            </button>
            <button
              className={`btn btn-sm ${displayMode === 'BY_TEACHER' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDisplayMode('BY_TEACHER')}
              style={{ fontWeight: 600, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <UserCheck size={15} /> Par enseignant
            </button>
          </div>

          {/* Sélecteurs */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Sélecteur Année Scolaire */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={15} color="#2563eb" />
              <select
                className="form-select form-select-sm fw-semibold"
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                style={{ minWidth: 140 }}
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>{ay.name} {ay.isCurrent ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>

            {/* Sélecteur Classe ou Enseignant */}
            {displayMode === 'BY_CLASS' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={15} color="#2563eb" />
                <select
                  className="form-select form-select-sm fw-semibold"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  style={{ minWidth: 160 }}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>Classe : {c.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserCheck size={15} color="#2563eb" />
                <select
                  className="form-select form-select-sm fw-semibold"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  style={{ minWidth: 200 }}
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.subjectName || 'Enseignant'})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TITRE ET INFORMATIONS CONTEXTUELLES */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={20} color="#2563eb" />
          <h5 style={{ margin: 0, fontWeight: 700, color: '#1e3a5f', fontSize: '1rem' }}>
            {displayMode === 'BY_CLASS'
              ? `Planning de la classe ${selectedClass?.name || ''}`
              : `Planning individuel de M./Mme ${selectedTeacher?.name || ''}`}
          </h5>
        </div>
        <span style={{ fontSize: '0.8125rem', color: '#1d4ed8', fontWeight: 600 }}>
          {slots.length} cours programmé{slots.length > 1 ? 's' : ''} cette semaine
        </span>
      </div>

      {/* GRILLE D'EMPLOI DU TEMPS */}
      <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-bordered mb-0" style={{ tableLayout: 'fixed', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ width: 110, padding: '12px', textAlign: 'center', fontSize: '0.8125rem', color: '#475569', fontWeight: 700 }}>
                  Horaire
                </th>
                {DAYS_OF_WEEK.map((day) => (
                  <th key={day.key} style={{ padding: '12px', textAlign: 'center', fontSize: '0.875rem', color: '#1e293b', fontWeight: 700 }}>
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STANDARD_TIME_SLOTS.map((slotTime) => (
                <tr key={slotTime.id}>
                  {/* Colonne Horaire */}
                  <td style={{ background: '#f8fafc', textAlign: 'center', verticalAlign: 'middle', padding: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                    {slotTime.label}
                  </td>

                  {/* 5 Colonnes Jours */}
                  {DAYS_OF_WEEK.map((day) => {
                    // Trouver les cours qui chevauchent ce créneau
                    const matchedSlots = slots.filter(
                      (s) => s.dayOfWeek === day.key && s.startTime <= slotTime.startTime && s.endTime >= slotTime.endTime
                    );

                    return (
                      <td
                        key={day.key}
                        onClick={() => matchedSlots.length === 0 && handleCellClick(day.key, slotTime.startTime, slotTime.endTime)}
                        style={{
                          height: 72,
                          verticalAlign: 'top',
                          padding: '6px',
                          background: matchedSlots.length > 0 ? '#ffffff' : 'transparent',
                          cursor: displayMode === 'BY_CLASS' && matchedSlots.length === 0 ? 'pointer' : 'default',
                          transition: 'background 0.2s',
                        }}
                      >
                        {matchedSlots.length > 0 ? (
                          matchedSlots.map((s) => (
                            <div
                              key={s.id}
                              onClick={(e) => handleEditSlot(s, e)}
                              style={{
                                background: `${s.subjectColor}12`,
                                borderLeft: `4px solid ${s.subjectColor}`,
                                borderRadius: 8,
                                padding: '6px 8px',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                cursor: displayMode === 'BY_CLASS' ? 'pointer' : 'default',
                                position: 'relative',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: s.subjectColor, display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{s.subjectName}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, marginTop: 2 }}>
                                  {displayMode === 'BY_CLASS' ? s.teacherName : s.className}
                                </div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: '#64748b', marginTop: 4 }}>
                                {s.room && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <MapPin size={10} /> {s.room}
                                  </span>
                                )}
                                <span style={{ fontWeight: 600 }}>
                                  {s.startTime}-{s.endTime}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                            {displayMode === 'BY_CLASS' && <Plus size={14} color="#94a3b8" />}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉNEAU (Saisie / Modification d'un cours) */}
      {showSlotModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', padding: 16 }}>
          <div className="card shadow-lg" style={{ width: '100%', maxWidth: 480, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BookOpen size={20} color="white" />
                <h5 style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: '1.0625rem' }}>
                  {editingSlot ? 'Modifier le cours' : 'Ajouter un cours au planning'}
                </h5>
              </div>
              <button onClick={() => setShowSlotModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, width: 30, height: 30, cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSlot}>
              <div style={{ padding: 24, display: 'grid', gap: 16 }}>
                {/* Jour & Salle */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label fw-semibold text-sm">Jour *</label>
                    <select className="form-select" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value as DayOfWeek })} required>
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label fw-semibold text-sm">Salle de classe</label>
                    <input type="text" className="form-control" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Ex : Salle 102" />
                  </div>
                </div>

                {/* Horaire début / fin */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label fw-semibold text-sm">Heure début *</label>
                    <input type="time" className="form-control" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label fw-semibold text-sm">Heure fin *</label>
                    <input type="time" className="form-control" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
                  </div>
                </div>

                {/* Matière */}
                <div>
                  <label className="form-label fw-semibold text-sm">Matière *</label>
                  <select className="form-select" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Enseignant */}
                <div>
                  <label className="form-label fw-semibold text-sm">Enseignant *</label>
                  <select className="form-select" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} required>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.subjectName || 'Général'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'space-between', background: '#f8fafc' }}>
                {editingSlot ? (
                  <button type="button" className="btn btn-outline-danger" onClick={(e) => handleDeleteSlot(editingSlot.id, e)}>
                    <Trash2 size={15} className="me-1" /> Supprimer
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowSlotModal(false)} disabled={savingSlot}>Annuler</button>
                  <button type="submit" className="btn btn-primary fw-semibold" disabled={savingSlot}>
                    {savingSlot ? 'Enregistrement...' : <><CheckCircle2 size={15} className="me-1" /> Valider</>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COPIER L'EMPLOI DU TEMPS D'UNE CLASSE */}
      {showCopyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', padding: 16 }}>
          <div className="card shadow-lg" style={{ width: '100%', maxWidth: 440, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Copy size={18} color="white" />
                <h6 style={{ margin: 0, fontWeight: 700, color: 'white' }}>Copier le planning d'une classe</h6>
              </div>
              <button onClick={() => setShowCopyModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 6, cursor: 'pointer', padding: '4px 8px' }}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleCopySchedule}>
              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569' }}>
                  Dupliquer tous les créneaux d'une autre classe vers la classe <strong>{selectedClass?.name}</strong>.
                </p>
                <div>
                  <label className="form-label fw-semibold text-sm">Classe source à copier *</label>
                  <select className="form-select" value={sourceClassId} onChange={(e) => setSourceClassId(e.target.value)} required>
                    <option value="">— Sélectionner —</option>
                    {classes.filter((c) => c.id !== selectedClassId).map((c) => (
                      <option key={c.id} value={c.id}>Classe {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#f8fafc' }}>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowCopyModal(false)} disabled={savingCopy}>Annuler</button>
                <button type="submit" className="btn btn-primary btn-sm fw-semibold" disabled={savingCopy}>
                  {savingCopy ? 'Copie en cours...' : 'Copier le planning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
