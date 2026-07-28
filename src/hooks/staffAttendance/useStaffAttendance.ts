/**
 * GESCO — Hook Custom Présence du Personnel
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StaffAttendanceSheet,
  StaffAttendanceItem,
  StaffAttendanceStatus,
  StaffAttendanceStats,
} from '../../services/staffAttendance/types';
import { staffAttendanceService } from '../../services/staffAttendance/staffAttendanceService';
import { downloadExcel } from '../../utils/exportUtils';
import { useToast } from '../../context/ToastContext';

export function useStaffAttendance(academicYearId: string = 'ay-2026') {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [items, setItems] = useState<StaffAttendanceItem[]>([]);
  const [history, setHistory] = useState<StaffAttendanceSheet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  const loadSheet = useCallback(async () => {
    setLoading(true);
    try {
      const sheet = await staffAttendanceService.getStaffAttendanceSheet(selectedDate, academicYearId);
      setItems(sheet.items);
    } catch {
      showToast('Erreur lors du chargement de la feuille du personnel.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, academicYearId, showToast]);

  const loadHistory = useCallback(async () => {
    try {
      const hist = await staffAttendanceService.getStaffAttendanceHistory({ date: selectedDate });
      setHistory(hist);
    } catch { /* Fallback */ }
  }, [selectedDate]);

  useEffect(() => {
    loadSheet();
    loadHistory();
  }, [loadSheet, loadHistory]);

  const markAllPresent = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, status: 'PRESENT', arrivalTime: undefined })));
    showToast('Tout le personnel a été marqué "Présent".', 'info');
  }, [showToast]);

  const setStatus = useCallback((staffId: string, status: StaffAttendanceStatus) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.staffId !== staffId) return item;
        const arrivalTime = status === 'LATE' ? (item.arrivalTime || '08:15') : undefined;
        return { ...item, status, arrivalTime };
      })
    );
  }, []);

  const setArrivalTime = useCallback((staffId: string, arrivalTime: string) => {
    setItems((prev) =>
      prev.map((item) => (item.staffId === staffId ? { ...item, arrivalTime } : item))
    );
  }, []);

  const setObservation = useCallback((staffId: string, observation: string) => {
    setItems((prev) =>
      prev.map((item) => (item.staffId === staffId ? { ...item, observation } : item))
    );
  }, []);

  const saveSheet = useCallback(async () => {
    setSaving(true);
    const res = await staffAttendanceService.saveStaffAttendanceSheet({
      academicYearId,
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
  }, [academicYearId, selectedDate, items, loadHistory, showToast]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (selectedRole !== 'ALL' && i.role !== selectedRole) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          i.firstName.toLowerCase().includes(q) ||
          i.lastName.toLowerCase().includes(q) ||
          i.role.toLowerCase().includes(q) ||
          i.matricule.toLowerCase().includes(q) ||
          i.phone.includes(q)
        );
      }
      return true;
    });
  }, [items, selectedRole, searchQuery]);

  const stats: StaffAttendanceStats = useMemo(() => {
    return staffAttendanceService.calculateStats(items);
  }, [items]);

  const exportExcel = useCallback(() => {
    const data = items.map((i) => ({
      Matricule: i.matricule,
      Nom: i.lastName,
      Prénom: i.firstName,
      Fonction: i.role,
      Téléphone: i.phone,
      Statut: i.status === 'PRESENT' ? 'Présent' : i.status === 'LATE' ? `Retard (${i.arrivalTime || ''})` : i.status === 'ON_LEAVE' ? 'Congé' : i.status === 'ABSENT' ? 'Absent' : 'Arrêt maladie',
      Observation: i.observation || '—',
    }));
    downloadExcel(data, 'Présence Personnel', `presence_personnel_${selectedDate}`);
    showToast('Feuille d\'appel personnel exportée en Excel.', 'success');
  }, [items, selectedDate, showToast]);

  const printSheet = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Présence du Personnel — ${selectedDate}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #1e293b; }
            h1 { font-size: 18px; color: #1e3a5f; margin-bottom: 4px; }
            p.sub { font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 16px; }
            .kpis { display: flex; gap: 12px; margin-bottom: 20px; }
            .kpi-card { border: 1px solid #cbd5e1; padding: 8px; border-radius: 6px; flex: 1; text-align: center; }
            .kpi-title { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .kpi-val { font-size: 13px; font-weight: bold; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Feuille de Présence du Personnel</h1>
          <p class="sub">Date : ${selectedDate} · Édité le ${new Date().toLocaleDateString('fr-FR')}</p>

          <div class="kpis">
            <div class="kpi-card"><div class="kpi-title">Total Personnel</div><div class="kpi-val">${stats.totalStaff}</div></div>
            <div class="kpi-card"><div class="kpi-title">Présents 🟢</div><div class="kpi-val" style="color:#16a34a">${stats.presentCount}</div></div>
            <div class="kpi-card"><div class="kpi-title">Retards 🟡</div><div class="kpi-val" style="color:#d97706">${stats.lateCount}</div></div>
            <div class="kpi-card"><div class="kpi-title">Congés 🟠</div><div class="kpi-val" style="color:#ea580c">${stats.leaveCount}</div></div>
            <div class="kpi-card"><div class="kpi-title">Absents 🔴</div><div class="kpi-val" style="color:#dc2626">${stats.absentCount}</div></div>
            <div class="kpi-card"><div class="kpi-title">Arrêt Maladie ⚫</div><div class="kpi-val" style="color:#475569">${stats.sickCount}</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Nom & Prénom</th>
                <th>Fonction</th>
                <th>Téléphone</th>
                <th>Statut</th>
                <th>Heure d'arrivée</th>
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
                  <td>${i.role}</td>
                  <td>${i.phone}</td>
                  <td>
                    ${i.status === 'PRESENT' ? '🟢 Présent' : i.status === 'LATE' ? '🟡 Retard' : i.status === 'ON_LEAVE' ? '🟠 Congé' : i.status === 'ABSENT' ? '🔴 Absent' : '⚫ Arrêt maladie'}
                  </td>
                  <td>${i.arrivalTime || '—'}</td>
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
  }, [items, selectedDate, stats]);

  return {
    selectedDate,
    setSelectedDate,
    items,
    filteredItems,
    history,
    stats,
    searchQuery,
    setSearchQuery,
    selectedRole,
    setSelectedRole,
    loading,
    saving,
    markAllPresent,
    setStatus,
    setArrivalTime,
    setObservation,
    saveSheet,
    exportExcel,
    printSheet,
  };
}
