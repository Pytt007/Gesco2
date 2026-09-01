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
import { getClassrooms, getClassroom } from '../academic/classroomsService';
import { listStaff } from '../staff/staffService';
import { getSubjects } from '../academic/catalog/subjectsService';

// ─── Stockage Local ─────────────────────────────────────────────────────────

const scheduleStore: Map<string, ScheduleSlotRecord> = new Map();

export function clearTimetableStore(): void {
  scheduleStore.clear();
}

export function normalizeDayKey(day: string): DayOfWeek {
  if (!day) return 'MONDAY';
  const u = day.toUpperCase();
  if (u === 'LUNDI' || u === 'MONDAY') return 'MONDAY';
  if (u === 'MARDI' || u === 'TUESDAY') return 'TUESDAY';
  if (u === 'MERCREDI' || u === 'WEDNESDAY') return 'WEDNESDAY';
  if (u === 'JEUDI' || u === 'THURSDAY') return 'THURSDAY';
  if (u === 'VENDREDI' || u === 'FRIDAY') return 'FRIDAY';
  if (u === 'SAMEDI' || u === 'SATURDAY') return 'SATURDAY';
  return 'MONDAY';
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

  getClasses(): ClassItem[] {
    return [];
  },

  getTeachers(): TeacherItem[] {
    return [];
  },

  getSubjects(): SubjectItem[] {
    return [];
  },

  async fetchClasses(): Promise<ClassItem[]> {
    try {
      const res = await getClassrooms({ pageSize: 500 });
      return (res.data || []).map((c) => ({ id: c.id, name: c.name, level: c.levelCode || 'Général' }));
    } catch {
      return [];
    }
  },

  async fetchTeachers(): Promise<TeacherItem[]> {
    try {
      const res = await listStaff({ pageSize: 500 });
      return (res.data?.staffMembers || [])
        .filter((s) => s.role === 'Enseignant' || (s as any).role === 'TEACHER')
        .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, specialty: s.jobTitle || 'Enseignant', phone: s.phonePrimary }));
    } catch {
      return [];
    }
  },

  async fetchSubjects(): Promise<SubjectItem[]> {
    try {
      const res = await getSubjects();
      return (res.data || []).map((s) => ({ id: s.id, name: s.name, color: '#2563eb' }));
    } catch {
      return [];
    }
  },

  /**
   * Récupère l'emploi du temps par classe
   */
  async getScheduleByClass(classId: string, academicYearId: string = 'ay-2026'): Promise<ScheduleSlotRecord[]> {
    return Array.from(scheduleStore.values()).filter(
      (s) => s.classId === classId && s.academicYearId === academicYearId
    );
  },

  /**
   * Récupère l'emploi du temps par enseignant
   */
  async getScheduleByTeacher(teacherId: string, academicYearId: string = 'ay-2026'): Promise<ScheduleSlotRecord[]> {
    return Array.from(scheduleStore.values()).filter(
      (s) => s.teacherId === teacherId && s.academicYearId === academicYearId
    );
  },

  /**
   * Ajoute un créneau de cours avec contrôles de conflit stricts
   */
  async addSlot(input: ScheduleSlotInput): Promise<ServiceResponse<ScheduleSlotRecord>> {
    const startMins = timeToMinutes(input.startTime);
    const endMins = timeToMinutes(input.endTime);

    // 1. Validation de l'heure
    if (endMins <= startMins) {
      return { success: false, error: 'L\'heure de fin doit être postérieure à l\'heure de début.' };
    }

    const normalizedDay = normalizeDayKey(input.dayOfWeek);

    // 2. Horaires d'ouverture de l'école (06h00 - 22h00)
    if (startMins < timeToMinutes('06:00') || endMins > timeToMinutes('22:00')) {
      return { success: false, error: 'Le créneau doit être compris entre 06h00 et 22h00.' };
    }

    const allSlots = Array.from(scheduleStore.values()).filter(
      (s) => s.academicYearId === input.academicYearId && normalizeDayKey(s.dayOfWeek) === normalizedDay
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

    // 5. Conflit de Salle : Deux classes affectées à la même salle sur le même créneau
    if (input.room && input.room.trim()) {
      const trimmedRoom = input.room.trim().toLowerCase();
      const roomConflict = allSlots.find(
        (s) => s.room && s.room.trim().toLowerCase() === trimmedRoom && intervalsOverlap(s.startTime, s.endTime, input.startTime, input.endTime)
      );
      if (roomConflict) {
        return {
          success: false,
          error: `Conflit de salle : la salle "${input.room.trim()}" est déjà occupée par la classe ${roomConflict.className} sur ce créneau (${roomConflict.startTime} - ${roomConflict.endTime}).`,
        };
      }
    }

    // Extraction métadonnées dynamiques
    let className = 'Classe';
    try {
      const clsRes = await getClassroom(input.classId);
      if (clsRes.success && clsRes.data) className = clsRes.data.name;
    } catch { /* Fallback */ }

    let teacherName = 'Enseignant';
    try {
      const staffRes = await listStaff({ pageSize: 500 });
      const foundTeacher = staffRes.data?.staffMembers?.find((s) => s.id === input.teacherId);
      if (foundTeacher) teacherName = `${foundTeacher.firstName} ${foundTeacher.lastName}`;
    } catch { /* Fallback */ }

    let subjectName = 'Matière';
    let subjectColor = '#2563eb';
    try {
      const subRes = await getSubjects();
      const foundSub = subRes.data?.find((s) => s.id === input.subjectId);
      if (foundSub) subjectName = foundSub.name;
    } catch { /* Fallback */ }

    const id = `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const record: ScheduleSlotRecord = {
      id,
      academicYearId: input.academicYearId,
      classId: input.classId,
      className,
      subjectId: input.subjectId,
      subjectName,
      subjectColor,
      teacherId: input.teacherId,
      teacherName,
      room: input.room?.trim() || undefined,
      dayOfWeek: normalizedDay,
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
    const existing = scheduleStore.get(id);
    if (!existing) return { success: false, error: 'Créneau introuvable.' };

    const startMins = timeToMinutes(input.startTime);
    const endMins = timeToMinutes(input.endTime);

    if (endMins <= startMins) {
      return { success: false, error: 'L\'heure de fin doit être postérieure à l\'heure de début.' };
    }

    if (startMins < timeToMinutes('06:00') || endMins > timeToMinutes('22:00')) {
      return { success: false, error: 'Le créneau doit être compris entre 06h00 et 22h00.' };
    }

    const normalizedDay = normalizeDayKey(input.dayOfWeek);

    const otherSlots = Array.from(scheduleStore.values()).filter(
      (s) => s.id !== id && s.academicYearId === input.academicYearId && normalizeDayKey(s.dayOfWeek) === normalizedDay
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

    if (input.room && input.room.trim()) {
      const trimmedRoom = input.room.trim().toLowerCase();
      const roomConflict = otherSlots.find(
        (s) => s.room && s.room.trim().toLowerCase() === trimmedRoom && intervalsOverlap(s.startTime, s.endTime, input.startTime, input.endTime)
      );
      if (roomConflict) {
        return {
          success: false,
          error: `Conflit de salle : la salle "${input.room.trim()}" est déjà occupée par la classe ${roomConflict.className} sur ce créneau.`,
        };
      }
    }

    existing.classId = input.classId;
    existing.subjectId = input.subjectId;
    existing.teacherId = input.teacherId;
    existing.room = input.room?.trim() || undefined;
    existing.dayOfWeek = normalizedDay;
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
    if (sourceClassId === targetClassId) {
      return { success: false, error: 'La classe source et la classe cible doivent être différentes.' };
    }

    const sourceSlots = Array.from(scheduleStore.values()).filter(
      (s) => s.classId === sourceClassId && s.academicYearId === academicYearId
    );

    if (sourceSlots.length === 0) {
      return { success: false, error: 'Aucun cours dans la classe source à copier.' };
    }

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
      message: `${copiedCount} créneau(x) copié(s) avec succès.` +
        (errors.length > 0 ? ` (${errors.length} conflit(s) ignoré(s))` : ''),
    };
  },
};
