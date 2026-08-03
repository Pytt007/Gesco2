/**
 * GESCO — Hook Custom Centre des Rapports
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReportDefinition,
  ReportCategory,
  ReportFilterState,
  GeneratedReportContent,
} from '../../services/reports/types';
import { reportService } from '../../services/reports/reportService';
import { downloadExcel } from '../../utils/exportUtils';
import { useToast } from '../../context/ToastContext';
import { documentEngineEnterprise } from '../../services/documents/DocumentEngine/index';

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

  // Impression / PDF du rapport généré via DocumentEngine Enterprise
  const printReport = useCallback(async () => {
    if (!generatedReport) return;

    const summaryCardsHtml = (generatedReport.summaryCards || []).length > 0 ? `
      <div style="display: grid; grid-template-columns: repeat(${Math.min((generatedReport.summaryCards || []).length, 4)}, 1fr); gap: 10px; margin-bottom: 24px;">
        ${(generatedReport.summaryCards || []).map((c) => `
          <div style="background-color: #F5F4FA !important; border: 1px solid #D8D5E4; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 9px; font-weight: 800; color: #6B6684 !important; text-transform: uppercase;">${c.label}</div>
            <div style="font-size: 16px; font-weight: 900; color: ${c.color || '#5B4E9E'} !important; margin-top: 2px;">${c.value}</div>
          </div>
        `).join('')}
      </div>
    ` : '';

    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 10px; background: #ffffff !important;">
        <thead>
          <tr style="background-color: #5B4E9E !important; color: #ffffff !important;">
            ${(generatedReport.headers || []).map((h) => `<th style="padding: 8px 12px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${(generatedReport.rows || []).map((row, idx) => {
            const bg = idx % 2 === 1 ? 'background-color: #F5F4FA !important;' : 'background-color: #ffffff !important;';
            return `
            <tr>
              ${(row || []).map((cell) => `<td style="padding: 9px 12px; border-bottom: 1px solid #D8D5E4; ${bg}">${cell}</td>`).join('')}
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    `;

    const doc = await documentEngineEnterprise.compileDocument({
      documentType: 'RAPPORT',
      title: generatedReport.title.toUpperCase(),
      subtitle: generatedReport.subtitle,
      meta: {
        ÉDITION: generatedReport.generatedAt,
      },
      data: generatedReport,
      sectionsHtml: summaryCardsHtml + tableHtml,
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(doc.fullHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }, [generatedReport]);

  return {
    reports: reports || [],
    filteredReports: filteredReports || [],
    favoriteReports: favoriteReports || [],
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
