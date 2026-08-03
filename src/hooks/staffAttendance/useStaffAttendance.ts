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

  // Impression / PDF — Design Corporate Salford & Co / GESCO Premium
  const printSheet = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Présence du Personnel — ${selectedDate}</title>
  <style>
    @page {
      margin: 0;
      size: A4 portrait;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }

    /* 1. HEADER BANNER NAVY BLUE (#132644) */
    .header-banner {
      background-color: #132644 !important;
      color: #ffffff !important;
      padding: 28px 36px 20px 36px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-block {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo-crest {
      width: 42px;
      height: 42px;
      background-color: #f59e0b !important;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #132644 !important;
      font-weight: 900;
      font-size: 24px;
      font-family: 'Outfit', sans-serif;
    }
    .school-name {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff !important;
      letter-spacing: -0.3px;
    }
    .school-sub {
      font-size: 10px;
      color: #94a3b8 !important;
      margin-top: 2px;
    }
    .doc-header-right {
      text-align: right;
    }
    .document-main-title {
      font-size: 24px;
      font-weight: 900;
      color: #f59e0b !important;
      text-transform: uppercase;
      letter-spacing: 1px;
      line-height: 1;
      margin-bottom: 8px;
    }
    .doc-meta-row {
      font-size: 10px;
      color: #cbd5e1 !important;
      margin-top: 2px;
    }
    .doc-meta-row strong {
      color: #ffffff !important;
    }

    /* 2. GOLD ACCENT STRIP WITH SKEWED STRIPES */
    .accent-strip {
      background-color: #f59e0b !important;
      color: #132644 !important;
      padding: 10px 36px;
      font-weight: 800;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .strip-stripes {
      display: flex;
      gap: 4px;
    }
    .stripe-item {
      width: 8px;
      height: 22px;
      background-color: #ffffff !important;
      transform: skewX(-20deg);
      opacity: 0.9;
    }

    /* 3. CONTENT BODY */
    .content-body {
      padding: 24px 36px;
    }

    /* 4. SUMMARY KPIS GRID */
    .kpis-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 24px;
    }
    .kpi-box {
      background-color: #f8fafc !important;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
    }
    .kpi-title {
      font-size: 8px;
      font-weight: 800;
      color: #64748b !important;
      text-transform: uppercase;
    }
    .kpi-value {
      font-size: 15px;
      font-weight: 900;
      margin-top: 2px;
    }

    /* 5. DATA TABLE NAVY HEADER (#132644) */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    table.data-table th {
      background-color: #132644 !important;
      color: #ffffff !important;
      padding: 10px 12px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      text-align: left;
      letter-spacing: 0.5px;
      border: none;
    }
    table.data-table td {
      padding: 9px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
      color: #1e293b;
    }
    table.data-table tr:nth-child(even) td {
      background-color: #f8fafc !important;
    }

    /* 6. SIGNATURES AND STAMP */
    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 36px;
    }
    .sig-box {
      width: 220px;
      text-align: center;
      border-top: 1.5px solid #64748b;
      padding-top: 6px;
      font-size: 10px;
      font-weight: 700;
      color: #475569 !important;
    }

    /* 7. FOOTER CONTACT BAR WITH YELLOW BADGES */
    .footer-bar {
      margin-top: 40px;
      padding: 16px 36px;
      border-top: 2px solid #f59e0b;
      background-color: #ffffff !important;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #475569 !important;
      font-weight: 700;
    }
    .footer-contact-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .contact-badge {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background-color: #f59e0b !important;
      color: #132644 !important;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 900;
    }
  </style>
</head>
<body>

  <!-- 1. HEADER HERO BANNER NAVY BLUE -->
  <div class="header-banner">
    <div class="brand-block">
      <div class="brand-logo-crest">G</div>
      <div>
        <div class="school-name">ÉTABLISSEMENT EXCELLENCE GESCO</div>
        <div class="school-sub">Direction des Ressources Humaines</div>
      </div>
    </div>
    <div class="doc-header-right">
      <div class="document-main-title">PRÉSENCE DU PERSONNEL</div>
      <div class="doc-meta-row">DATE : <strong>${selectedDate}</strong></div>
      <div class="doc-meta-row">RÉF : <strong>RH-PRES-${selectedDate}</strong></div>
    </div>
  </div>

  <!-- 2. GOLD ACCENT STRIP -->
  <div class="accent-strip">
    <div>📍 ÉMARGEMENT ET POINTAGE DES ENSEIGNANTS & PERSONNEL ADMINISTRATIF</div>
    <div class="strip-stripes">
      <div class="stripe-item"></div>
      <div class="stripe-item"></div>
      <div class="stripe-item"></div>
    </div>
  </div>

  <!-- 3. CONTENT BODY -->
  <div class="content-body">
    <!-- KPIS SUMMARY -->
    <div class="kpis-grid">
      <div class="kpi-box">
        <div class="kpi-title">Total Staff</div>
        <div class="kpi-value" style="color: #132644">${stats.totalStaff}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-title">Présents</div>
        <div class="kpi-value" style="color: #16a34a">${stats.presentCount}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-title">Retards</div>
        <div class="kpi-value" style="color: #d97706">${stats.lateCount}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-title">Congés</div>
        <div class="kpi-value" style="color: #ea580c">${stats.leaveCount}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-title">Absents</div>
        <div class="kpi-value" style="color: #dc2626">${stats.absentCount}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-title">Arrêt Maladie</div>
        <div class="kpi-value" style="color: #475569">${stats.sickCount}</div>
      </div>
    </div>

    <!-- DATA TABLE -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 120px;">Matricule</th>
          <th>Nom & Prénom</th>
          <th>Fonction</th>
          <th style="width: 140px;">Statut</th>
          <th style="width: 110px;">Arrivée</th>
          <th>Observation</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (i) => `
          <tr>
            <td style="font-weight: 700; color: #64748b;">${i.matricule}</td>
            <td><strong>${i.lastName}</strong> ${i.firstName}</td>
            <td>${i.role}</td>
            <td style="font-weight: 800;">
              ${i.status === 'PRESENT' ? '<span style="color:#16a34a">● Présent</span>' : i.status === 'LATE' ? '<span style="color:#d97706">● Retard</span>' : i.status === 'ON_LEAVE' ? '<span style="color:#ea580c">● Congé</span>' : i.status === 'ABSENT' ? '<span style="color:#dc2626">● Absent</span>' : '<span style="color:#475569">● Maladie</span>'}
            </td>
            <td>${i.arrivalTime || '—'}</td>
            <td>${i.observation || '—'}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <!-- SIGNATURES BLOCK -->
    <div class="signatures-row">
      <div class="sig-box">Le Responsable RH</div>
      <div class="sig-box">La Direction Générale & Sceau</div>
    </div>
  </div>

  <!-- 4. FOOTER CONTACT BAR -->
  <div class="footer-bar">
    <div class="footer-contact-item">
      <span class="contact-badge">📞</span>
      <span>Support GESCO : +225 07 00 00 00 00</span>
    </div>
    <div class="footer-contact-item">
      <span class="contact-badge">🌐</span>
      <span>www.gesco.ci</span>
    </div>
    <div class="footer-contact-item">
      <span class="contact-badge">📍</span>
      <span>Abidjan, Côte d'Ivoire</span>
    </div>
  </div>

</body>
</html>`;

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
