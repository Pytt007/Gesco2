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

export function useAttendance(academicYearId: string = 'ay-2026') {
  const [selectedClassId, setSelectedClassId] = useState<string>('cls-1');
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

  // Impression / PDF
  const printSheet = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Feuille de Présence — ${selectedDate}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #1e293b; }
            h1 { font-size: 18px; color: #1e3a5f; margin-bottom: 4px; }
            p.sub { font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 16px; }
            .kpis { display: flex; gap: 15px; margin-bottom: 20px; }
            .kpi-card { border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; flex: 1; text-align: center; }
            .kpi-title { font-size: 10px; color: #64748b; text-transform: uppercase; }
            .kpi-val { font-size: 14px; font-weight: bold; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .status-present { color: #16a34a; font-weight: bold; }
            .status-justified { color: #d97706; font-weight: bold; }
            .status-absent { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Feuille de Présence Quotidienne</h1>
          <p class="sub">Classe : ${selectedClassId} · Date : ${selectedDate} · Édité le ${new Date().toLocaleDateString('fr-FR')}</p>

          <div class="kpis">
            <div class="kpi-card"><div class="kpi-title">Total Élèves</div><div class="kpi-val">${stats.totalStudents}</div></div>
            <div class="kpi-card"><div class="kpi-title">Présents</div><div class="kpi-val" style="color:#16a34a">${stats.presentCount}</div></div>
            <div class="kpi-card"><div class="kpi-title">Absents Justifiés</div><div class="kpi-val" style="color:#d97706">${stats.justifiedCount}</div></div>
            <div class="kpi-card"><div class="kpi-title">Absents</div><div class="kpi-val" style="color:#dc2626">${stats.absentCount}</div></div>
            <div class="kpi-card"><div class="kpi-title">Taux de présence</div><div class="kpi-val" style="color:#2563eb">${stats.presenceRate}%</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Nom & Prénom</th>
                <th>Statut</th>
                <th>Observation</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (i) => `
                <tr>
                  <td>${i.matricule}</td>
                  <td><strong>${i.lastName}</strong> ${i.firstName}</td>
                  <td class="${i.status === 'PRESENT' ? 'status-present' : i.status === 'ABSENT_JUSTIFIED' ? 'status-justified' : 'status-absent'}">
                    ${i.status === 'PRESENT' ? '🟢 Présent' : i.status === 'ABSENT_JUSTIFIED' ? '🟡 Absent justifié' : '🔴 Absent'}
                  </td>
                  <td>${i.observation || '—'}</td>
                </tr>
              `
                )
                .join('')}
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
