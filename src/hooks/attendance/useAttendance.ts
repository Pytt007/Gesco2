/**
 * GESCO — Hook Custom Présences des élèves
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AttendanceSheet,
  AttendanceRecordItem,
  AttendanceStatus,
  AttendanceStats,
} from '../../services/attendance/types';
import { attendanceService } from '../../services/attendance/attendanceService';
import { downloadExcel } from '../../utils/exportUtils';
import { useToast } from '../../context/ToastContext';
import { generateAttendanceDocument } from '../../services/documents/DocumentEngine/index';
import { safePrintHtml } from '../../services/documents/safePrintService';

export function useAttendance(academicYearId: string = '') {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [items, setItems] = useState<AttendanceRecordItem[]>([]);
  const [history, setHistory] = useState<AttendanceSheet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  // Charger la feuille du jour / classe sélectionnée
  const loadSheet = useCallback(async () => {
    setLoading(true);
    try {
      const sheet = await attendanceService.getAttendanceSheet(selectedClassId, selectedDate, academicYearId);
      setItems(sheet.items);
    } catch {
      showToast('Erreur lors du chargement de la feuille de présence.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedDate, academicYearId, showToast]);

  // Charger l'historique
  const loadHistory = useCallback(async () => {
    try {
      const hist = await attendanceService.getAttendanceHistory({ academicYearId, classId: selectedClassId });
      setHistory(hist);
    } catch { /* Fallback */ }
  }, [academicYearId, selectedClassId]);

  useEffect(() => {
    loadSheet();
    loadHistory();
  }, [loadSheet, loadHistory]);

  // Actions de statut
  const markAllPresent = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, status: 'PRESENT' })));
    showToast('Tous les élèves ont été marqués "Présent".', 'info');
  }, [showToast]);

  const markAllAbsent = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, status: 'ABSENT' })));
    showToast('Tous les élèves ont été marqués "Absent".', 'info');
  }, [showToast]);

  const setStudentStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    setItems((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, status } : item))
    );
  }, []);

  const setStudentObservation = useCallback((studentId: string, observation: string) => {
    setItems((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, observation } : item))
    );
  }, []);

  // Sauvegarder la feuille
  const saveSheet = useCallback(async () => {
    setSaving(true);
    const res = await attendanceService.saveAttendanceSheet({
      academicYearId,
      classId: selectedClassId,
      date: selectedDate,
      items,
    });
    setSaving(false);

    if (res.success) {
      showToast(res.message || 'Feuille de présence enregistrée !', 'success');
      await loadHistory();
    } else {
      showToast(res.error || 'Erreur lors de l\'enregistrement.', 'error');
    }
    return res;
  }, [academicYearId, selectedClassId, selectedDate, items, loadHistory, showToast]);

  // Filtrage instantané
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (i) =>
        i.firstName.toLowerCase().includes(q) ||
        i.lastName.toLowerCase().includes(q) ||
        i.matricule.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Statistiques dérivées
  const stats: AttendanceStats = useMemo(() => {
    return attendanceService.calculateStats(items);
  }, [items]);

  // Export Excel
  const exportExcel = useCallback(() => {
    const data = items.map((i) => ({
      Matricule: i.matricule,
      Nom: i.lastName,
      Prénom: i.firstName,
      Statut: i.status === 'PRESENT' ? 'Présent' : i.status === 'ABSENT_JUSTIFIED' ? 'Absent Justifié' : 'Absent',
      Observation: i.observation || '—',
    }));
    downloadExcel(data, 'Présences', `presences_${selectedClassId}_${selectedDate}`);
    showToast('Feuille de présence exportée en Excel.', 'success');
  }, [items, selectedClassId, selectedDate, showToast]);

  // Impression / PDF — Génération via le DocumentEngine Enterprise (Design ReportLab)
  const printSheet = useCallback(async () => {
    const doc = await generateAttendanceDocument({
      title: 'FEUILLE DE PRÉSENCE',
      classId: selectedClassId,
      date: selectedDate,
      stats,
      items,
    });

    safePrintHtml(doc.fullHtml, `Feuille d'Appel - ${selectedDate}`);
  }, [items, selectedClassId, selectedDate, stats]);

  return {
    selectedClassId,
    setSelectedClassId,
    selectedDate,
    setSelectedDate,
    items: items || [],
    filteredItems: filteredItems || [],
    history: history || [],
    stats,
    searchQuery,
    setSearchQuery,
    loading,
    saving,
    markAllPresent,
    markAllAbsent,
    setStudentStatus,
    setStudentObservation,
    saveSheet,
    exportExcel,
    printSheet,
    reload: loadSheet,
  };
}
