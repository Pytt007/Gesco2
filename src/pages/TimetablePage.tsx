import React, { useState } from 'react';
import { useConfirm } from '../context/ConfirmContext';
import { useTimetable } from '../hooks/timetable/useTimetable';
import { useAcademicYears } from '../hooks/academic';
import { useSchoolYear } from '../context/SchoolYearContext';
import { documentEngineEnterprise } from '../services/documents/DocumentEngine/index';
import { TimePicker } from '../components/ui/time-picker';
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
  Building, GraduationCap,
} from 'lucide-react';

export default function TimetablePage() {
  const { schoolYear } = useSchoolYear();
  const confirm = useConfirm();
  const { academicYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear || 'ay-2026');

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
    const isConfirmed = await confirm({
      title: 'Supprimer ce cours',
      message: 'Voulez-vous supprimer ce cours du planning ?',
      confirmText: 'Oui, supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (isConfirmed) {
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

  // Impression / PDF — Génération via DocumentEngine Enterprise
  const handlePrintOrPDF = async () => {
    const selectedName = displayMode === 'BY_CLASS'
      ? classes.find((c) => c.id === selectedClassId)?.name || 'Classe'
      : teachers.find((t) => t.id === selectedTeacherId)?.name || 'Enseignant';

    const title = displayMode === 'BY_CLASS'
      ? `EMPLOI DU TEMPS — ${selectedName}`
      : `PLANNING ENSEIGNANT — ${selectedName}`;

    const tableHeaderHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 10px;">
        <thead>
          <tr style="background-color: #5B4E9E !important; color: #ffffff !important;">
            <th style="padding: 10px; width: 100px; text-transform: uppercase;">Horaire</th>
            ${DAYS_OF_WEEK.map((d) => `<th style="padding: 10px; text-transform: uppercase;">${d.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${STANDARD_TIME_SLOTS.map((ts, idx) => {
            const bg = idx % 2 === 1 ? 'background-color: #F5F4FA !important;' : 'background-color: #ffffff !important;';
            return `
            <tr>
              <td style="padding: 8px; font-weight: 800; color: #453D7A !important; border-bottom: 1px solid #D8D5E4; ${bg}">${ts.label}</td>
              ${DAYS_OF_WEEK.map((day) => {
                const matched = slots.filter(
                  (s) => s.dayOfWeek === day.key && s.startTime <= ts.startTime && s.endTime >= ts.endTime
                );
                return `
                  <td style="padding: 6px; border-bottom: 1px solid #D8D5E4; vertical-align: top; ${bg}">
                    ${matched
                      .map(
                        (m) => `
                      <div style="background: #ffffff; border-radius: 6px; padding: 6px; border: 1px solid #D8D5E4; border-left: 4px solid ${m.subjectColor || '#5B4E9E'}; margin-bottom: 4px; text-align: left;">
                        <div style="font-weight: 800; color: #5B4E9E !important; font-size: 10.5px;">${m.subjectName}</div>
                        <div style="font-size: 9.5px; color: #453D7A !important; margin-top: 2px;">${displayMode === 'BY_CLASS' ? m.teacherName : m.className}</div>
                        ${m.room ? `<div style="font-size: 8.5px; color: #6B6684 !important; margin-top: 1px;">📍 ${m.room}</div>` : ''}
                      </div>
                    `
                      )
                      .join('')}
                  </td>
                `;
              }).join('')}
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    `;

    const doc = await documentEngineEnterprise.compileDocument({
      documentType: 'EMPLOI_DU_TEMPS',
      title,
      subtitle: `PLANNING OFFICIEL COURS & SALLES — ANNEÉ ${selectedYearId}`,
      meta: {
        CIBLE: selectedName,
        MODE: displayMode === 'BY_CLASS' ? 'VUE CLASSE' : 'VUE ENSEIGNANT',
      },
      data: { selectedClassId, selectedTeacherId, slotsCount: slots.length },
      sectionsHtml: tableHeaderHtml,
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(doc.fullHtml);
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
          <div style={{ display: 'flex', gap: 6, background: 'var(--bg-surface-hover, #f1f5f9)', border: '1px solid var(--border)', padding: 4, borderRadius: 10 }}>
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
            {/* Badge Année Scolaire Active (Lecture seule) */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 700, color: '#047857' }}>
              <span>🟢</span>
              <span>Année active :</span>
              <span style={{ fontWeight: 900, color: '#065f46' }}>{schoolYear}</span>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', background: 'var(--color-primary-light, rgba(37,99,235,0.15))', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={20} color="var(--color-primary, #2563eb)" />
          <h5 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary, #1e3a5f)', fontSize: '1rem' }}>
            {displayMode === 'BY_CLASS'
              ? `Planning de la classe ${selectedClass?.name || ''}`
              : `Planning individuel de M./Mme ${selectedTeacher?.name || ''}`}
          </h5>
        </div>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-primary, #1d4ed8)', fontWeight: 600 }}>
          {slots.length} cours programmé{slots.length > 1 ? 's' : ''} cette semaine
        </span>
      </div>

      {/* GRILLE D'EMPLOI DU TEMPS */}
      <div className="card" style={{ borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-bordered mb-0" style={{ tableLayout: 'fixed', minWidth: 800 }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-hover, #f8fafc)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ width: 110, padding: '12px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-secondary, #475569)', fontWeight: 700 }}>
                  Horaire
                </th>
                {DAYS_OF_WEEK.map((day) => (
                  <th key={day.key} style={{ padding: '12px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-primary, #1e293b)', fontWeight: 700 }}>
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STANDARD_TIME_SLOTS.map((slotTime, slotIdx) => (
                <tr key={slotTime.id}>
                  {/* Colonne Horaire */}
                  <td style={{ background: 'var(--bg-surface-hover, #f8fafc)', textAlign: 'center', verticalAlign: 'middle', padding: '8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)', borderColor: 'var(--border)' }}>
                    {slotTime.label}
                  </td>

                  {/* 5 Colonnes Jours */}
                  {DAYS_OF_WEEK.map((day) => {
                    const isSameDay = (d1: string, d2: string) => {
                      const map: Record<string, string> = {
                        LUNDI: 'MONDAY', MARDI: 'TUESDAY', MERCREDI: 'WEDNESDAY', JEUDI: 'THURSDAY', VENDREDI: 'FRIDAY', SAMEDI: 'SATURDAY',
                        MONDAY: 'MONDAY', TUESDAY: 'TUESDAY', WEDNESDAY: 'WEDNESDAY', THURSDAY: 'THURSDAY', FRIDAY: 'FRIDAY', SATURDAY: 'SATURDAY',
                      };
                      return (map[d1?.toUpperCase()] || d1) === (map[d2?.toUpperCase()] || d2);
                    };

                    // 1. Vérifier si cette cellule est déjà couverte par un cours démarré au-dessus (rowSpan)
                    const isCoveredByPreviousRowSpan = slots.some((s) => {
                      if (!isSameDay(s.dayOfWeek, day.key)) return false;
                      return s.startTime < slotTime.startTime && s.endTime > slotTime.startTime;
                    });

                    // Si couverte par une ligne précédente, ne pas rendre de <td>
                    if (isCoveredByPreviousRowSpan) {
                      return null;
                    }

                    // 2. Trouver les cours qui DÉMARRENT dans ce créneau (ou avant le tout premier créneau)
                    const startingSlots = slots.filter((s) => {
                      if (!isSameDay(s.dayOfWeek, day.key)) return false;
                      if (slotIdx === 0 && s.startTime < slotTime.endTime) return true;
                      return s.startTime >= slotTime.startTime && s.startTime < slotTime.endTime;
                    });

                    // 3. Calculer le nombre de lignes (rowSpan) occupées par la durée du cours
                    let maxRowSpan = 1;
                    if (startingSlots.length > 0) {
                      const longestEndTime = startingSlots.reduce(
                        (max, s) => (s.endTime > max ? s.endTime : max),
                        startingSlots[0].endTime
                      );
                      let spanCount = 0;
                      for (let i = slotIdx; i < STANDARD_TIME_SLOTS.length; i++) {
                        if (longestEndTime > STANDARD_TIME_SLOTS[i].startTime) {
                          spanCount++;
                        } else {
                          break;
                        }
                      }
                      maxRowSpan = Math.max(1, spanCount);
                    }

                    return (
                      <td
                        key={day.key}
                        rowSpan={maxRowSpan > 1 ? maxRowSpan : undefined}
                        onClick={() => startingSlots.length === 0 && handleCellClick(day.key, slotTime.startTime, slotTime.endTime)}
                        style={{
                          height: maxRowSpan * 96,
                          verticalAlign: 'top',
                          padding: '6px',
                          background: startingSlots.length > 0 ? '#f8fafc' : 'transparent',
                          cursor: displayMode === 'BY_CLASS' && startingSlots.length === 0 ? 'pointer' : 'default',
                          transition: 'background 0.2s',
                        }}
                      >
                        {startingSlots.length > 0 ? (
                          startingSlots.map((s, idx) => {
                            // Alternance cartes vibrantes colorées & cartes blanches (comme le mockup fourni)
                            const isSolidCard = idx % 2 === 0;
                            const dotColor = idx % 3 === 0 ? '#10b981' : idx % 3 === 1 ? '#fbbf24' : '#ef4444';
                            const initials = (displayMode === 'BY_CLASS' ? s.teacherName : s.className)
                              ? (displayMode === 'BY_CLASS' ? s.teacherName : s.className)
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .substring(0, 2)
                                  .toUpperCase()
                              : 'TR';

                            if (isSolidCard) {
                              const solidBg = s.subjectColor
                                ? `linear-gradient(135deg, ${s.subjectColor} 0%, ${s.subjectColor}dd 100%)`
                                : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';

                              return (
                                <div
                                  key={s.id}
                                  onClick={(e) => handleEditSlot(s, e)}
                                  className="gesco-timetable-card-solid"
                                  style={{
                                    background: solidBg,
                                    color: '#ffffff',
                                    borderRadius: 14,
                                    padding: '10px 12px',
                                    height: '100%',
                                    minHeight: 84,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    cursor: displayMode === 'BY_CLASS' ? 'pointer' : 'default',
                                    position: 'relative',
                                    boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.35)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  }}
                                >
                                  {/* HAUT : MATIÈRE + PASTA DOT D'ÉTAT */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                                      {s.subjectName}
                                    </div>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, boxShadow: `0 0 6px ${dotColor}`, flexShrink: 0, marginTop: 2 }} />
                                  </div>

                                  {/* MILIEU : ENSEIGNANT OU CLASSE */}
                                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', marginTop: 2 }}>
                                    {displayMode === 'BY_CLASS' ? s.teacherName : s.className}
                                  </div>

                                  {/* BAS : AVATAR INITIALES + BADGES PILLULES VERRE */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 900, color: '#ffffff' }}>
                                        {initials}
                                      </div>
                                      {s.room && (
                                        <span style={{ background: 'rgba(255, 255, 255, 0.22)', backdropFilter: 'blur(4px)', color: '#ffffff', borderRadius: 12, padding: '2px 8px', fontSize: '0.625rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                          <MapPin size={9} /> {s.room}
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ background: 'rgba(255, 255, 255, 0.22)', backdropFilter: 'blur(4px)', color: '#ffffff', borderRadius: 12, padding: '2px 8px', fontSize: '0.625rem', fontWeight: 700 }}>
                                      {s.startTime}-{s.endTime}
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            // CARTE BLANCHE SURÉLEVÉE AVEC PASTILLE D'ÉTAT & BADGES COLORÉS
                            return (
                              <div
                                key={s.id}
                                onClick={(e) => handleEditSlot(s, e)}
                                className="gesco-timetable-card-white"
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 14,
                                  padding: '10px 12px',
                                  height: '100%',
                                  minHeight: 84,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  cursor: displayMode === 'BY_CLASS' ? 'pointer' : 'default',
                                  position: 'relative',
                                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              >
                                {/* HAUT : MATIÈRE + PASTILLE D'ÉTAT */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                                  <div style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#1e293b', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                                    {s.subjectName}
                                  </div>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, boxShadow: `0 0 6px ${dotColor}`, flexShrink: 0, marginTop: 2 }} />
                                </div>

                                {/* MILIEU : ENSEIGNANT OU CLASSE */}
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: 2 }}>
                                  {displayMode === 'BY_CLASS' ? s.teacherName : s.className}
                                </div>

                                {/* BAS : AVATAR INITIALES + BADGES PILLULES COLORÉES */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${s.subjectColor || '#2563eb'}20`, border: `1px solid ${s.subjectColor || '#2563eb'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 900, color: s.subjectColor || '#2563eb' }}>
                                      {initials}
                                    </div>
                                    {s.room && (
                                      <span style={{ background: `${s.subjectColor || '#2563eb'}12`, color: s.subjectColor || '#2563eb', borderRadius: 12, padding: '2px 8px', fontSize: '0.625rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                        <MapPin size={9} /> {s.room}
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 12, padding: '2px 8px', fontSize: '0.625rem', fontWeight: 700 }}>
                                    {s.startTime}-{s.endTime}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ height: '100%', minHeight: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                            {displayMode === 'BY_CLASS' && <Plus size={16} color="#94a3b8" />}
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
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#eff6ff', color: '#2563eb', borderRadius: 6 }}>
                        <Calendar size={13} />
                      </span>
                      Jour <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select className="form-select" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value as DayOfWeek })} required>
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#eff6ff', color: '#2563eb', borderRadius: 6 }}>
                        <Building size={13} />
                      </span>
                      Salle de classe
                    </label>
                    <input type="text" className="form-control" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Ex : Salle 102" />
                  </div>
                </div>

                {/* Horaire début / fin via TimePicker */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <TimePicker
                    label="Heure Début"
                    required
                    value={form.startTime}
                    onChange={(time) => setForm({ ...form, startTime: time })}
                  />
                  <TimePicker
                    label="Heure Fin"
                    required
                    value={form.endTime}
                    onChange={(time) => setForm({ ...form, endTime: time })}
                  />
                </div>

                {/* Matière */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#eff6ff', color: '#2563eb', borderRadius: 6 }}>
                      <BookOpen size={13} />
                    </span>
                    Matière <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select className="form-select" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Enseignant */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#eff6ff', color: '#2563eb', borderRadius: 6 }}>
                      <GraduationCap size={13} />
                    </span>
                    Enseignant <span style={{ color: '#ef4444' }}>*</span>
                  </label>
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
