/**
 * GESCO — Service Emploi du Temps
 */

import {
  ScheduleSlotRecord,
  ScheduleSlotInput,
  DayOfWeek,
  ClassItem,
  TeacherItem,
  SubjectItem,
} from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

// ─── Données de démonstration ────────────────────────────────────────────────

const MOCK_CLASSES: ClassItem[] = [
  { id: 'cls-cp1a', name: 'CP1 A', level: 'CP1' },
  { id: 'cls-ce1a', name: 'CE1 A', level: 'CE1' },
  { id: 'cls-ce2b', name: 'CE2 B', level: 'CE2' },
  { id: 'cls-cm2a', name: 'CM2 A', level: 'CM2' },
  { id: 'cls-6a',   name: '6ème A', level: '6ème' },
];

const MOCK_TEACHERS: TeacherItem[] = [
  { id: 'tch-001', name: 'KOUASSI Philippe', subjectName: 'Mathématiques' },
  { id: 'tch-002', name: 'DOUAMBA Marie-Claire', subjectName: 'Français' },
  { id: 'tch-003', name: 'YAO Kouamé', subjectName: 'Sciences' },
  { id: 'tch-004', name: 'KONAN Brou', subjectName: 'Histoire-Géo' },
  { id: 'tch-005', name: 'TANO Eugénie', subjectName: 'Anglais' },
  { id: 'tch-006', name: 'BEDI Charles', subjectName: 'Éducation Physique' },
];

const MOCK_SUBJECTS: SubjectItem[] = [
  { id: 'sbj-math', name: 'Mathématiques', color: '#2563eb' },
  { id: 'sbj-fr',   name: 'Français', color: '#dc2626' },
  { id: 'sbj-sn',   name: 'Sciences', color: '#16a34a' },
  { id: 'sbj-hg',   name: 'Histoire-Géographie', color: '#d97706' },
  { id: 'sbj-ang',  name: 'Anglais', color: '#9333ea' },
  { id: 'sbj-eps',  name: 'Éducation Physique', color: '#0ea5e9' },
  { id: 'sbj-arts', name: 'Arts Plastiques', color: '#ec4899' },
];

// ─── Stockage Local ─────────────────────────────────────────────────────────

const scheduleStore: Map<string, ScheduleSlotRecord> = new Map();

function initDemoSchedule() {
  if (scheduleStore.size > 0) return;

  const demos: ScheduleSlotRecord[] = [
    // Lundi CP1 A
    {
      id: 'slot-101',
      academicYearId: 'ay-2026',
      classId: 'cls-cp1a', className: 'CP1 A',
      subjectId: 'sbj-fr', subjectName: 'Français', subjectColor: '#dc2626',
      teacherId: 'tch-002', teacherName: 'DOUAMBA Marie-Claire',
      room: 'Salle 101',
      dayOfWeek: 'LUNDI',
      startTime: '07:30', endTime: '08:30',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'slot-102',
      academicYearId: 'ay-2026',
      classId: 'cls-cp1a', className: 'CP1 A',
      subjectId: 'sbj-math', subjectName: 'Mathématiques', subjectColor: '#2563eb',
      teacherId: 'tch-001', teacherName: 'KOUASSI Philippe',
      room: 'Salle 101',
      dayOfWeek: 'LUNDI',
      startTime: '08:30', endTime: '09:30',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'slot-103',
      academicYearId: 'ay-2026',
      classId: 'cls-cp1a', className: 'CP1 A',
      subjectId: 'sbj-sn', subjectName: 'Sciences', subjectColor: '#16a34a',
      teacherId: 'tch-003', teacherName: 'YAO Kouamé',
      room: 'Salle 101',
      dayOfWeek: 'LUNDI',
      startTime: '10:30', endTime: '11:30',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    },

    // Mardi CP1 A
    {
      id: 'slot-104',
      academicYearId: 'ay-2026',
      classId: 'cls-cp1a', className: 'CP1 A',
      subjectId: 'sbj-math', subjectName: 'Mathématiques', subjectColor: '#2563eb',
      teacherId: 'tch-001', teacherName: 'KOUASSI Philippe',
      room: 'Salle 101',
      dayOfWeek: 'MARDI',
      startTime: '07:30', endTime: '08:30',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'slot-105',
      academicYearId: 'ay-2026',
      classId: 'cls-cp1a', className: 'CP1 A',
      subjectId: 'sbj-ang', subjectName: 'Anglais', subjectColor: '#9333ea',
      teacherId: 'tch-005', teacherName: 'TANO Eugénie',
      room: 'Salle 101',
      dayOfWeek: 'MARDI',
      startTime: '08:30', endTime: '09:30',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    },

    // Mercredi CP1 A
    {
      id: 'slot-106',
      academicYearId: 'ay-2026',
      classId: 'cls-cp1a', className: 'CP1 A',
      subjectId: 'sbj-eps', subjectName: 'Éducation Physique', subjectColor: '#0ea5e9',
      teacherId: 'tch-006', teacherName: 'BEDI Charles',
      room: 'Terrain de sport',
      dayOfWeek: 'MERCREDI',
      startTime: '08:30', endTime: '10:30',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  demos.forEach((d) => scheduleStore.set(d.id, d));
}

// Helper pour convertir "HH:mm" en minutes depuis minuit
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Vérifie si 2 intervalles [start1, end1] et [start2, end2] se chevauchent
function intervalsOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return Math.max(s1, s2) < Math.min(e1, e2);
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const timetableService = {

  getClasses(): ClassItem[] { return MOCK_CLASSES; },
  getTeachers(): TeacherItem[] { return MOCK_TEACHERS; },
  getSubjects(): SubjectItem[] { return MOCK_SUBJECTS; },

  /**
   * Récupère l'emploi du temps par classe
   */
  async getScheduleByClass(classId: string, academicYearId: string = 'ay-2026'): Promise<ScheduleSlotRecord[]> {
    initDemoSchedule();
    return Array.from(scheduleStore.values()).filter(
      (s) => s.classId === classId && s.academicYearId === academicYearId
    );
  },

  /**
   * Récupère l'emploi du temps par enseignant
   */
  async getScheduleByTeacher(teacherId: string, academicYearId: string = 'ay-2026'): Promise<ScheduleSlotRecord[]> {
    initDemoSchedule();
    return Array.from(scheduleStore.values()).filter(
      (s) => s.teacherId === teacherId && s.academicYearId === academicYearId
    );
  },

  /**
   * Ajoute un créneau de cours avec contrôles de conflit stricts
   */
  async addSlot(input: ScheduleSlotInput): Promise<ServiceResponse<ScheduleSlotRecord>> {
    initDemoSchedule();

    const startMins = timeToMinutes(input.startTime);
    const endMins = timeToMinutes(input.endTime);

    // 1. Validation de l'heure
    if (endMins <= startMins) {
      return { success: false, error: 'L\'heure de fin doit être postérieure à l\'heure de début.' };
    }

    // 2. Horaires d'ouverture de l'école (07h00 - 18h00)
    if (startMins < timeToMinutes('07:00') || endMins > timeToMinutes('18:00')) {
      return { success: false, error: 'Le créneau doit être compris entre 07h00 et 18h00 (heures d\'ouverture).' };
    }

    const allSlots = Array.from(scheduleStore.values()).filter(
      (s) => s.academicYearId === input.academicYearId && s.dayOfWeek === input.dayOfWeek
    );

    // 3. Conflit de Classe : Deux cours en même temps dans la même classe
    const classConflict = allSlots.find(
      (s) => s.classId === input.classId && intervalsOverlap(s.startTime, s.endTime, input.startTime, input.endTime)
    );
    if (classConflict) {
      return {
        success: false,
        error: `Conflit de classe : la classe a déjà le cours de "${classConflict.subjectName}" sur ce créneau (${classConflict.startTime} - ${classConflict.endTime}).`,
      };
    }

    // 4. Conflit d'Enseignant : Un enseignant affecté à deux classes en même temps
    const teacherConflict = allSlots.find(
      (s) => s.teacherId === input.teacherId && intervalsOverlap(s.startTime, s.endTime, input.startTime, input.endTime)
    );
    if (teacherConflict) {
      return {
        success: false,
        error: `Conflit d'enseignant : ${teacherConflict.teacherName} est déjà en cours dans la classe ${teacherConflict.className} sur ce créneau (${teacherConflict.startTime} - ${teacherConflict.endTime}).`,
      };
    }

    // Extraction métadonnées
    const cls = MOCK_CLASSES.find((c) => c.id === input.classId);
    const sbj = MOCK_SUBJECTS.find((s) => s.id === input.subjectId);
    const tch = MOCK_TEACHERS.find((t) => t.id === input.teacherId);

    if (!cls || !sbj || !tch) {
      return { success: false, error: 'Classe, matière ou enseignant introuvable.' };
    }

    const id = `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const record: ScheduleSlotRecord = {
      id,
      academicYearId: input.academicYearId,
      classId: input.classId,
      className: cls.name,
      subjectId: input.subjectId,
      subjectName: sbj.name,
      subjectColor: sbj.color,
      teacherId: input.teacherId,
      teacherName: tch.name,
      room: input.room?.trim() || undefined,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    scheduleStore.set(id, record);
    return { success: true, data: record, message: 'Cours ajouté avec succès.' };
  },

  /**
   * Modifier un créneau
   */
  async updateSlot(id: string, input: ScheduleSlotInput): Promise<ServiceResponse<ScheduleSlotRecord>> {
    initDemoSchedule();
    const existing = scheduleStore.get(id);
    if (!existing) return { success: false, error: 'Créneau introuvable.' };

    const startMins = timeToMinutes(input.startTime);
    const endMins = timeToMinutes(input.endTime);

    if (endMins <= startMins) {
      return { success: false, error: 'L\'heure de fin doit être postérieure à l\'heure de début.' };
    }

    if (startMins < timeToMinutes('07:00') || endMins > timeToMinutes('18:00')) {
      return { success: false, error: 'Créneau en dehors des heures d\'ouverture (07h00 - 18h00).' };
    }

    const otherSlots = Array.from(scheduleStore.values()).filter(
      (s) => s.id !== id && s.academicYearId === input.academicYearId && s.dayOfWeek === input.dayOfWeek
    );

    const classConflict = otherSlots.find(
      (s) => s.classId === input.classId && intervalsOverlap(s.startTime, s.endTime, input.startTime, input.endTime)
    );
    if (classConflict) {
      return { success: false, error: `Conflit de classe : la classe a déjà le cours de "${classConflict.subjectName}" sur ce créneau.` };
    }

    const teacherConflict = otherSlots.find(
      (s) => s.teacherId === input.teacherId && intervalsOverlap(s.startTime, s.endTime, input.startTime, input.endTime)
    );
    if (teacherConflict) {
      return { success: false, error: `Conflit d'enseignant : ${teacherConflict.teacherName} est déjà affecté à ${teacherConflict.className}.` };
    }

    const cls = MOCK_CLASSES.find((c) => c.id === input.classId);
    const sbj = MOCK_SUBJECTS.find((s) => s.id === input.subjectId);
    const tch = MOCK_TEACHERS.find((t) => t.id === input.teacherId);

    if (!cls || !sbj || !tch) return { success: false, error: 'Information manquante.' };

    existing.classId = input.classId;
    existing.className = cls.name;
    existing.subjectId = input.subjectId;
    existing.subjectName = sbj.name;
    existing.subjectColor = sbj.color;
    existing.teacherId = input.teacherId;
    existing.teacherName = tch.name;
    existing.room = input.room?.trim() || undefined;
    existing.dayOfWeek = input.dayOfWeek;
    existing.startTime = input.startTime;
    existing.endTime = input.endTime;
    existing.updatedAt = new Date().toISOString();

    scheduleStore.set(id, existing);
    return { success: true, data: existing, message: 'Créneau mis à jour.' };
  },

  /**
   * Supprimer un créneau
   */
  async deleteSlot(id: string): Promise<ServiceResponse<boolean>> {
    initDemoSchedule();
    if (!scheduleStore.has(id)) return { success: false, error: 'Créneau introuvable.' };
    scheduleStore.delete(id);
    return { success: true, data: true, message: 'Créneau supprimé.' };
  },

  /**
   * Copier le planning d'une classe vers une autre
   */
  async copyClassSchedule(
    sourceClassId: string,
    targetClassId: string,
    academicYearId: string = 'ay-2026'
  ): Promise<ServiceResponse<number>> {
    initDemoSchedule();

    if (sourceClassId === targetClassId) {
      return { success: false, error: 'La classe source et la classe cible doivent être différentes.' };
    }

    const sourceSlots = Array.from(scheduleStore.values()).filter(
      (s) => s.classId === sourceClassId && s.academicYearId === academicYearId
    );

    if (sourceSlots.length === 0) {
      return { success: false, error: 'Aucun cours dans la classe source à copier.' };
    }

    const targetClass = MOCK_CLASSES.find((c) => c.id === targetClassId);
    if (!targetClass) return { success: false, error: 'Classe cible introuvable.' };

    let copiedCount = 0;
    const errors: string[] = [];

    for (const slot of sourceSlots) {
      const result = await this.addSlot({
        academicYearId,
        classId: targetClassId,
        subjectId: slot.subjectId,
        teacherId: slot.teacherId,
        room: slot.room,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });

      if (result.success) {
        copiedCount++;
      } else {
        errors.push(`${slot.dayOfWeek} ${slot.startTime}-${slot.endTime} : ${result.error}`);
      }
    }

    if (copiedCount === 0) {
      return { success: false, error: `Impossible de copier le planning : ${errors.join(' | ')}` };
    }

    return {
      success: true,
      data: copiedCount,
      message: `${copiedCount} créneau(x) copié(s) avec succès vers la classe ${targetClass.name}.` +
        (errors.length > 0 ? ` (${errors.length} conflit(s) ignoré(s))` : ''),
    };
  },
};
