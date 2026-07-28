import React, { useState } from 'react';
import { useReports } from '../hooks/reports/useReports';
import { REPORT_CATEGORIES, ReportCategory, ReportDefinition } from '../services/reports/types';
import { useAcademicYears } from '../hooks/academic';
import { useSchoolYear } from '../context/SchoolYearContext';
import {
  Search, Star, FileText, Download, Printer, Filter, X,
  Calendar, Users, BookOpen, Clock, CheckCircle2, ChevronRight,
  TrendingUp, RefreshCw, Award, Sparkles, SlidersHorizontal,
} from 'lucide-react';

const MOCK_CLASSES = [
  { id: 'cls-1', name: 'CP1 A' },
  { id: 'cls-2', name: 'CE1 A' },
  { id: 'cls-3', name: 'CE2 B' },
  { id: 'cls-4', name: 'CM2 A' },
  { id: 'cls-5', name: '6ème A' },
];

const MOCK_LEVELS = ['Tous', 'Maternelle', 'Primaire', 'Collège'];
const MOCK_PERIODS = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3', 'Semestre 1', 'Semestre 2'];
const MOCK_EVAL_TYPES = ['Composition Mensuelle', 'Devoir Surveillé', 'Examen Blanc', 'Évaluation Continue'];

export default function ReportsPage() {
  const { schoolYear } = useSchoolYear();
  const { academicYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear?.id || 'ay-2026');

  const {
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
  } = useReports(selectedYearId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* En-tête de page */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Centre des Rapports
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Tous les rapports administratifs, pédagogiques et financiers générés automatiquement.
          </p>
        </div>

        {/* Barre de recherche rapide */}
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Rechercher un rapport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 36, borderRadius: 10, fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* BARRE DE FILTRES GLOBAUX */}
      <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div className="card-body p-3" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontWeight: 600, fontSize: '0.8125rem' }}>
            <SlidersHorizontal size={16} color="#2563eb" /> Filtres de génération :
          </div>

          {/* Année */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} color="#2563eb" />
            <select
              className="form-select form-select-sm fw-semibold"
              value={filters.academicYearId}
              onChange={(e) => setFilters({ ...filters, academicYearId: e.target.value })}
              style={{ width: 140 }}
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>{ay.name} {ay.isCurrent ? '(Active)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Classe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} color="#2563eb" />
            <select
              className="form-select form-select-sm"
              value={filters.classId}
              onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
              style={{ width: 130 }}
            >
              {MOCK_CLASSES.map((c) => (
                <option key={c.id} value={c.id}>Classe {c.name}</option>
              ))}
            </select>
          </div>

          {/* Niveau */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={14} color="#2563eb" />
            <select
              className="form-select form-select-sm"
              value={filters.levelCode}
              onChange={(e) => setFilters({ ...filters, levelCode: e.target.value })}
              style={{ width: 130 }}
            >
              {MOCK_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          {/* Période */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color="#2563eb" />
            <select
              className="form-select form-select-sm"
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              style={{ width: 140 }}
            >
              {MOCK_PERIODS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Type d'évaluation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Award size={14} color="#2563eb" />
            <select
              className="form-select form-select-sm"
              value={filters.assessmentType}
              onChange={(e) => setFilters({ ...filters, assessmentType: e.target.value })}
              style={{ width: 170 }}
            >
              {MOCK_EVAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 1 : FAVORIS ÉPINGLÉS (si existants et sans recherche) */}
      {!searchQuery.trim() && favoriteReports.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 700, color: '#d97706' }}>
            <Star size={16} fill="#d97706" color="#d97706" /> Rapports favoris épinglés
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
            {favoriteReports.map((rpt) => (
              <div
                key={`fav-${rpt.id}`}
                className="card"
                onClick={() => generateReport(rpt)}
                style={{
                  borderRadius: 12,
                  border: '1px solid #fde68a',
                  background: 'linear-gradient(135deg,#fffdf5,#fffbeb)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div className="card-body p-3">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.25rem' }}>{rpt.icon}</span>
                      <h6 style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>{rpt.title}</h6>
                    </div>
                    <button
                      onClick={(e) => toggleFavorite(rpt.id, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    >
                      <Star size={15} fill="#d97706" color="#d97706" />
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.3 }}>{rpt.description}</p>
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      Générer <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2 : ONGLETS PAR CATÉGORIE */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', paddingBottom: 8, flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${activeCategory === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveCategory('ALL')}
          style={{ fontWeight: 600, borderRadius: 8 }}
        >
          Tous les rapports ({filteredReports.length})
        </button>

        {REPORT_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`btn btn-sm ${activeCategory === cat.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setActiveCategory(cat.key)}
            style={{ fontWeight: 600, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>{cat.emoji}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* SECTION 3 : GRILLE DES RAPPORTS DISPONIBLES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {filteredReports.length === 0 ? (
          <div style={{ gridColumn: '1/-1', background: '#f8fafc', borderRadius: 16, padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={44} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Aucun rapport trouvé pour ce filtre.</p>
          </div>
        ) : (
          filteredReports.map((rpt) => {
            const catDef = REPORT_CATEGORIES.find((c) => c.key === rpt.category);
            return (
              <div
                key={rpt.id}
                className="card card-hover"
                onClick={() => generateReport(rpt)}
                style={{
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                }}
              >
                <div style={{ height: 4, background: catDef?.color || '#2563eb' }} />
                <div className="card-body p-4">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${catDef?.color || '#2563eb'}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                        {rpt.icon}
                      </div>
                      <div>
                        <h6 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem' }}>{rpt.title}</h6>
                        <span style={{ fontSize: '0.7rem', color: catDef?.color || '#2563eb', fontWeight: 600 }}>
                          {catDef?.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => toggleFavorite(rpt.id, e)}
                      title={rpt.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <Star size={16} fill={rpt.isFavorite ? '#d97706' : 'none'} color={rpt.isFavorite ? '#d97706' : '#cbd5e1'} />
                    </button>
                  </div>

                  <p style={{ margin: '8px 0 16px', fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.4 }}>
                    {rpt.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Prêt à générer</span>
                    <button className="btn btn-sm btn-outline-primary fw-semibold" style={{ borderRadius: 8, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Générer <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL APERÇU / GÉNÉRATION DU RAPPORT SÉLECTIONNÉ */}
      {(selectedReport || generating) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1080, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.7)', padding: 16 }}>
          <div className="card shadow-lg" style={{ width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto', borderRadius: 16 }}>
            
            {/* Header Modal */}
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px 16px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.5rem' }}>{selectedReport?.icon}</span>
                <div>
                  <h5 style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: '1.0625rem' }}>{selectedReport?.title}</h5>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>
                    Année scolaire : {filters.academicYearId} · Édité le {new Date().toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Modal */}
            <div style={{ padding: 24 }}>
              {generating ? (
                <div className="text-center py-5">
                  <span className="spinner-border spinner-border-sm text-primary mb-3" style={{ width: 32, height: 32 }} />
                  <p style={{ margin: 0, color: '#64748b', fontWeight: 600 }}>Génération automatique du rapport en cours...</p>
                </div>
              ) : generatedReport ? (
                <>
                  {/* Cartes de synthèse KPI du rapport */}
                  {generatedReport.summaryCards.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                      {generatedReport.summaryCards.map((sc, i) => (
                        <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{sc.label}</p>
                          <p style={{ margin: '4px 0 0', fontWeight: 800, fontSize: '1.125rem', color: sc.color || '#1e293b' }}>{sc.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tableau des données */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.8125rem' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <tr>
                            {generatedReport.headers.map((h, i) => (
                              <th key={i} style={{ padding: '10px 12px', fontWeight: 600, color: '#475569' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {generatedReport.rows.map((row, idx) => (
                            <tr key={idx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} style={{ padding: '10px 12px' }}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer Modal : Boutons d'exportation */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: 12, justifyContent: 'space-between', borderRadius: '0 0 16px 16px' }}>
              <button className="btn btn-outline-secondary" onClick={() => setSelectedReport(null)}>Fermer</button>
              
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline-secondary text-sm fw-semibold" onClick={printReport} disabled={!generatedReport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Printer size={15} /> Imprimer
                </button>
                <button className="btn btn-outline-primary text-sm fw-semibold" onClick={printReport} disabled={!generatedReport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} /> Télécharger PDF
                </button>
                <button className="btn btn-success text-sm fw-semibold" onClick={exportExcel} disabled={!generatedReport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={15} /> Exporter Excel
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
