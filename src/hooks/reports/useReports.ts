/**
 * GESCO — Hook Custom Centre des Rapports
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReportDefinition,
  ReportCategory,
  ReportFilterState,
  GeneratedReportContent,
} from '../../services/reports/types';
import { reportService } from '../../services/reports/reportService';
import { downloadExcel } from '../../utils/exportUtils';
import { useToast } from '../../context/ToastContext';

export function useReports(initialYearId: string = 'ay-2026') {
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  
  // Filtres UI
  const [activeCategory, setActiveCategory] = useState<ReportCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtres de génération
  const [filters, setFilters] = useState<ReportFilterState>({
    academicYearId: initialYearId,
    classId: 'cls-1',
    levelCode: 'CP1',
    period: 'Trimestre 1',
    assessmentType: 'Composition Mensuelle',
  });

  // Modal aperçu / génération
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReportContent | null>(null);
  const [generating, setGenerating] = useState(false);

  const { showToast } = useToast();

  const loadCatalog = useCallback(() => {
    const list = reportService.getAllReports();
    const favs = reportService.getFavoriteIds();
    setReports(list);
    setFavoriteIds(favs);
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Basculer un favori
  const toggleFavorite = useCallback((reportId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedFavs = reportService.toggleFavorite(reportId);
    setFavoriteIds(updatedFavs);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, isFavorite: updatedFavs.includes(reportId) } : r))
    );
    showToast(
      updatedFavs.includes(reportId) ? 'Rapport ajouté aux favoris ⭐' : 'Rapport retiré des favoris',
      'info'
    );
  }, [showToast]);

  // Générer le rapport
  const generateReport = useCallback(async (report: ReportDefinition) => {
    setSelectedReport(report);
    setGenerating(true);
    try {
      const result = await reportService.generateReport(report.id, filters);
      setGeneratedReport(result);
    } catch {
      showToast('Erreur lors de la génération du rapport.', 'error');
    } finally {
      setGenerating(false);
    }
  }, [filters, showToast]);

  // Rapports filtrés par catégorie et recherche
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (activeCategory !== 'ALL' && r.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [reports, activeCategory, searchQuery]);

  // Rapports favoris pour la section du haut
  const favoriteReports = useMemo(() => {
    return reports.filter((r) => favoriteIds.includes(r.id));
  }, [reports, favoriteIds]);

  // Export Excel du rapport généré
  const exportExcel = useCallback(() => {
    if (!generatedReport) return;
    const excelData = generatedReport.rows.map((row) => {
      const obj: Record<string, string | number> = {};
      generatedReport.headers.forEach((h, i) => {
        obj[h] = row[i] ?? '—';
      });
      return obj;
    });
    downloadExcel(excelData, 'Rapport', `${generatedReport.title.toLowerCase().replace(/\s+/g, '_')}_${generatedReport.academicYear}`);
    showToast('Export Excel téléchargé avec succès.', 'success');
  }, [generatedReport, showToast]);

  // Impression / PDF du rapport généré
  const printReport = useCallback(() => {
    if (!generatedReport) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${generatedReport.title} — GESCO</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #1e293b; }
            h1 { font-size: 20px; color: #1e3a5f; margin-bottom: 4px; }
            p.sub { font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 20px; }
            .kpis { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
            .kpi-card { border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 6px; background: #f8fafc; flex: 1; min-width: 150px; }
            .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .kpi-val { font-size: 15px; font-weight: bold; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${generatedReport.title}</h1>
          <p class="sub">${generatedReport.subtitle} · Édité le ${generatedReport.generatedAt}</p>

          ${generatedReport.summaryCards.length > 0 ? `
            <div class="kpis">
              ${generatedReport.summaryCards.map((c) => `
                <div class="kpi-card">
                  <div class="kpi-label">${c.label}</div>
                  <div class="kpi-val" style="color: ${c.color || '#1e293b'}">${c.value}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                ${generatedReport.headers.map((h) => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${generatedReport.rows.map((row) => `
                <tr>
                  ${row.map((cell) => `<td>${cell}</td>`).join('')}
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
  }, [generatedReport]);

  return {
    reports,
    filteredReports,
    favoriteReports,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    selectedReport,
    setSelectedReport,
    generatedReport,
    generating,
    toggleFavorite,
    generateReport,
    exportExcel,
    printReport,
  };
}
