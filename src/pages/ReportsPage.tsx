import React, { useState } from 'react';
import { useReports } from '../hooks/reports/useReports';
import { REPORT_CATEGORIES, ReportCategory, ReportDefinition } from '../services/reports/types';
import { useAcademicYears } from '../hooks/academic';
import { useSchoolYear } from '../context/SchoolYearContext';
import {
  Search, Star, FileText, Download, Printer, Filter, X,
  Calendar, Users, BookOpen, Clock, CheckCircle2, ChevronRight,
  TrendingUp, RefreshCw, Award, Sparkles, SlidersHorizontal,
  FileBarChart, LayoutGrid,
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
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear || 'ay-2026');

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

      {/* ── BANNIÈRE HERO SAAS ─────────────────────────────────────────────── */}
      <div
        className="card shadow-lg"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #2563eb 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          border: 'none',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileBarChart size={26} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Centre des Rapports
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#93c5fd', fontWeight: 500 }}>
                Rapports administratifs, pédagogiques et financiers générés automatiquement
              </p>
            </div>
          </div>

          {/* Barre de recherche intégrée dans la bannière */}
          <div style={{ position: 'relative', width: 300 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher un rapport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', paddingLeft: 36, paddingRight: searchQuery ? 36 : 14,
                height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.12)', color: '#ffffff',
                fontSize: '0.875rem', fontFamily: 'inherit', fontWeight: 500,
                outline: 'none', backdropFilter: 'blur(4px)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BARRE DE FILTRES GLOBAUX AÉRÉE SAAS */}
      <div className="card shadow-sm" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px' }}>
          
          {/* Header des filtres */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>Filtres de génération de rapport</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Sélectionnez l'Année, la Classe, le Niveau, la Période ou le Type pour affiner les données</p>
            </div>
          </div>

          {/* Grille responsive aérée pour les filtres */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            
            {/* 1. ANNÉE SCOLAIRE ACTIVE */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#eff6ff', color: '#2563eb', borderRadius: 6 }}>
                  <Calendar size={13} />
                </span>
                Année Scolaire Active
              </label>
              <div style={{ height: '42px', borderRadius: '10px', fontWeight: 700, border: '1px solid #a7f3d0', fontSize: '0.875rem', width: '100%', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6 }}>
                <span>🟢</span> {schoolYear}
              </div>
            </div>

            {/* 2. CLASSE */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#e0e7ff', color: '#4f46e5', borderRadius: 6 }}>
                  <Users size={13} />
                </span>
                Classe
              </label>
              <select
                className="form-select"
                value={filters.classId}
                onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                style={{ height: '42px', borderRadius: '10px', fontWeight: 600, border: '1px solid #cbd5e1', fontSize: '0.875rem', width: '100%' }}
              >
                {MOCK_CLASSES.map((c) => (
                  <option key={c.id} value={c.id}>Classe {c.name}</option>
                ))}
              </select>
            </div>

            {/* 3. NIVEAU */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#f3e8ff', color: '#9333ea', borderRadius: 6 }}>
                  <BookOpen size={13} />
                </span>
                Niveau Éducatif
              </label>
              <select
                className="form-select"
                value={filters.levelCode}
                onChange={(e) => setFilters({ ...filters, levelCode: e.target.value })}
                style={{ height: '42px', borderRadius: '10px', fontWeight: 600, border: '1px solid #cbd5e1', fontSize: '0.875rem', width: '100%' }}
              >
                {MOCK_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            {/* 4. PÉRIODE */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#fef3c7', color: '#d97706', borderRadius: 6 }}>
                  <Clock size={13} />
                </span>
                Période
              </label>
              <select
                className="form-select"
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                style={{ height: '42px', borderRadius: '10px', fontWeight: 600, border: '1px solid #cbd5e1', fontSize: '0.875rem', width: '100%' }}
              >
                {MOCK_PERIODS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* 5. TYPE D'ÉVALUATION */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#d1fae5', color: '#059669', borderRadius: 6 }}>
                  <Award size={13} />
                </span>
                Type d'Évaluation
              </label>
              <select
                className="form-select"
                value={filters.assessmentType}
                onChange={(e) => setFilters({ ...filters, assessmentType: e.target.value })}
                style={{ height: '42px', borderRadius: '10px', fontWeight: 600, border: '1px solid #cbd5e1', fontSize: '0.875rem', width: '100%' }}
              >
                {MOCK_EVAL_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

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

      {/* SECTION 2 : ONGLETS CATÉGORIES — PILLS MODERNES */}
      <div style={{ display: 'flex', gap: 6, padding: '6px', background: '#f1f5f9', borderRadius: 14, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveCategory('ALL')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: activeCategory === 'ALL' ? '#2563eb' : 'transparent',
            color: activeCategory === 'ALL' ? '#ffffff' : '#475569',
            border: 'none', borderRadius: 10, fontFamily: 'inherit',
            fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: activeCategory === 'ALL' ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
            transition: 'all 0.18s ease', whiteSpace: 'nowrap',
          }}
        >
          <LayoutGrid size={14} /> Tous ({filteredReports.length})
        </button>

        {REPORT_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              background: activeCategory === cat.key ? cat.color || '#2563eb' : 'transparent',
              color: activeCategory === cat.key ? '#ffffff' : '#475569',
              border: 'none', borderRadius: 10, fontFamily: 'inherit',
              fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: activeCategory === cat.key ? `0 4px 12px ${cat.color || '#2563eb'}55` : 'none',
              transition: 'all 0.18s ease', whiteSpace: 'nowrap',
            }}
          >
            {cat.label}
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
                  justifyContent: 'space-between',
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
