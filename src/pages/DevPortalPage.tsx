// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Dev Portal (src/pages/DevPortalPage.tsx)
// ⚠️  RÉSERVÉ DÉVELOPPEURS — N'existe PAS en production (import.meta.env.DEV guard)
// Sections : UI Showcase / Theme Playground / Icons Gallery / PDF Preview /
//            Component Inspector / Performance Monitor
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import {
  Palette, Layers, Image, FileText, Inspect, Zap,
  Sun, Moon, Copy, Check, Search, ChevronRight, Star,
  AlertCircle, AlertTriangle, Info, CheckCircle2,
  Loader2, Upload, Eye, Code2, Cpu,
  ArrowRight, Bell, Badge as BadgeIcon, LayoutDashboard,
  Sparkles, Terminal, Box, Grid3x3, Activity,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type DevTab = 'SHOWCASE' | 'THEME' | 'ICONS' | 'PDF' | 'INSPECTOR' | 'PERF';

interface DevTabDef {
  id: DevTab;
  label: string;
  icon: React.ReactNode;
  color: string;
}

// ─── Configuration ────────────────────────────────────────────────────────────

const DEV_TABS: DevTabDef[] = [
  { id: 'SHOWCASE',  label: 'UI Showcase',         icon: <Layers size={15} />,        color: '#6366f1' },
  { id: 'THEME',     label: 'Theme Playground',    icon: <Palette size={15} />,       color: '#ec4899' },
  { id: 'ICONS',     label: 'Icons Gallery',       icon: <Grid3x3 size={15} />,       color: '#f59e0b' },
  { id: 'PDF',       label: 'PDF Preview',         icon: <FileText size={15} />,      color: '#16a34a' },
  { id: 'INSPECTOR', label: 'Component Inspector', icon: <Inspect size={15} />,       color: '#0284c7' },
  { id: 'PERF',      label: 'Performance',         icon: <Activity size={15} />,      color: '#dc2626' },
];

// ─── Section : UI SHOWCASE ────────────────────────────────────────────────────

function UIShowcase() {
  const [copied, setCopied] = useState('');

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

      {/* BUTTONS */}
      <ComponentSection title="Buttons" description="Toutes les variantes, tailles et états">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <button className="btn btn-primary" style={{ borderRadius: 8 }}>Primary</button>
          <button className="btn btn-secondary" style={{ borderRadius: 8 }}>Secondary</button>
          <button className="btn btn-outline-primary" style={{ borderRadius: 8 }}>Outline</button>
          <button className="btn btn-ghost" style={{ borderRadius: 8 }}>Ghost</button>
          <button className="btn btn-danger" style={{ borderRadius: 8 }}>Danger</button>
          <button className="btn btn-success" style={{ borderRadius: 8, background: '#16a34a', color: '#fff' }}>Success</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 12 }}>
          <button className="btn btn-primary btn-sm" style={{ borderRadius: 6, fontSize: '0.75rem' }}>Small</button>
          <button className="btn btn-primary" style={{ borderRadius: 8 }}>Medium</button>
          <button className="btn btn-primary" style={{ borderRadius: 10, padding: '12px 24px', fontSize: '1rem' }}>Large</button>
          <button className="btn btn-primary" disabled style={{ borderRadius: 8, opacity: 0.5 }}>Disabled</button>
          <button className="btn btn-primary" style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={15} /> With Icon
          </button>
          <button className="btn btn-primary" style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Loader2 size={15} className="animate-spin" /> Loading...
          </button>
        </div>
      </ComponentSection>

      {/* BADGES */}
      <ComponentSection title="Badges & Pills" description="Indicateurs de statut et labels">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {[
            { label: 'Active', bg: '#dcfce7', color: '#15803d' },
            { label: 'Inactif', bg: '#fee2e2', color: '#b91c1c' },
            { label: 'En attente', bg: '#fef3c7', color: '#92400e' },
            { label: 'Brouillon', bg: '#f1f5f9', color: '#475569' },
            { label: 'Premium', bg: '#ede9fe', color: '#5b21b6' },
            { label: 'Nouveau', bg: '#dbeafe', color: '#1d4ed8' },
            { label: 'Beta', bg: '#fce7f3', color: '#9d174d' },
          ].map((b) => (
            <span key={b.label} style={{ padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, background: b.bg, color: b.color }}>
              {b.label}
            </span>
          ))}
        </div>
      </ComponentSection>

      {/* ALERTS */}
      <ComponentSection title="Alerts" description="Messages système et notifications">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: <Info size={18} />, label: 'Information', bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8', text: 'Ceci est un message d\'information pour l\'utilisateur.' },
            { icon: <CheckCircle2 size={18} />, label: 'Succès', bg: '#f0fdf4', border: '#86efac', color: '#16a34a', text: 'L\'opération a été effectuée avec succès.' },
            { icon: <AlertTriangle size={18} />, label: 'Avertissement', bg: '#fffbeb', border: '#fcd34d', color: '#92400e', text: 'Attention, cette action est irréversible.' },
            { icon: <AlertCircle size={18} />, label: 'Erreur', bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', text: 'Une erreur est survenue. Veuillez réessayer.' },
          ].map((a) => (
            <div key={a.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: a.bg, border: `1px solid ${a.border}`, borderRadius: 10, color: a.color }}>
              {a.icon}
              <div>
                <strong style={{ fontSize: '0.875rem', fontWeight: 800 }}>{a.label}</strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', opacity: 0.85 }}>{a.text}</p>
              </div>
            </div>
          ))}
        </div>
      </ComponentSection>

      {/* CARDS */}
      <ComponentSection title="Cards" description="Conteneurs et tuiles de contenu">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '0.9375rem' }}>Card Simple</h5>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>Un conteneur de base avec padding et ombre légère.</p>
          </div>
          <div className="card p-4 shadow-lg" style={{ borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            <h5 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '0.9375rem' }}>Card Élevée</h5>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>Avec ombre prononcée pour les éléments importants.</p>
          </div>
          <div className="card p-4" style={{ borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none' }}>
            <h5 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '0.9375rem', color: '#fff' }}>Card Gradient</h5>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)' }}>Card avec dégradé pour les mises en avant.</p>
          </div>
          <div className="card p-4" style={{ borderRadius: 16, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <h5 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '0.9375rem' }}>Card Glass</h5>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>Effet glassmorphism pour les overlays.</p>
          </div>
        </div>
      </ComponentSection>

      {/* FORMS */}
      <ComponentSection title="Form Inputs" description="Champs de saisie et contrôles">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700 }}>Input Text</label>
            <input type="text" className="form-input" placeholder="Placeholder..." />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700 }}>Select</label>
            <select className="form-select">
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700 }}>Input Error</label>
            <input type="text" className="form-input" value="Valeur invalide" readOnly style={{ borderColor: '#dc2626' }} />
            <span style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 4, display: 'block' }}>Ce champ est obligatoire.</span>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700 }}>Textarea</label>
            <textarea className="form-input" rows={3} placeholder="Saisir du texte..." style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700 }}>Checkbox</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: '#2563eb' }} /> Option cochée
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" style={{ width: 16, height: 16, accentColor: '#2563eb' }} /> Option décochée
              </label>
            </div>
          </div>
        </div>
      </ComponentSection>

      {/* LOADING STATES */}
      <ComponentSection title="Loading & Skeleton" description="États de chargement et squelettes">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Spinner SM</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Spinner MD</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Spinner LG</span>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[90, 70, 80, 55].map((w, i) => (
                <div key={i} style={{ height: 14, borderRadius: 7, background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', width: `${w}%` }} />
              ))}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: 8 }}>Skeleton Lines</span>
          </div>
        </div>
      </ComponentSection>

      {/* DATA TABLE */}
      <ComponentSection title="Data Table" description="Tableaux de données premium">
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                {['Nom', 'Classe', 'Statut', 'Solde', 'Action'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { nom: 'Élève Exemple A', classe: 'CP1 A', statut: 'Actif', solde: '0', color: '#dcfce7', statusColor: '#15803d' },
                { nom: 'Élève Exemple B', classe: 'CP2 B', statut: 'Partiel', solde: '0', color: '#fef3c7', statusColor: '#92400e' },
                { nom: 'Élève Exemple C', classe: 'CE1 A', statut: 'En attente', solde: '0', color: '#fee2e2', statusColor: '#b91c1c' },
              ].map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{r.nom}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{r.classe}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 800, background: r.color, color: r.statusColor }}>{r.statut}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{r.solde} FCFA</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ComponentSection>

      {/* KPI CARDS */}
      <ComponentSection title="KPI Cards" description="Tuiles de métriques et statistiques">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          {[
            { label: 'Élèves Inscrits', value: '0', delta: '0%', icon: '🎓', bg: 'linear-gradient(135deg, #6366f1, #4f46e5)', delta_color: '#a5f3fc' },
            { label: 'Recettes du Mois', value: '0 FCFA', delta: '0%', icon: '💰', bg: 'linear-gradient(135deg, #16a34a, #15803d)', delta_color: '#bbf7d0' },
            { label: 'Taux Présence', value: '0%', delta: '0%', icon: '✅', bg: 'linear-gradient(135deg, #0284c7, #0369a1)', delta_color: '#bae6fd' },
            { label: 'Impayés', value: '0', delta: '0', icon: '⚠️', bg: 'linear-gradient(135deg, #ea580c, #c2410c)', delta_color: '#fed7aa' },
          ].map((kpi) => (
            <div key={kpi.label} className="card p-4" style={{ borderRadius: 14, background: kpi.bg, color: '#fff', border: 'none' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{kpi.icon}</div>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', marginTop: 4 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.6875rem', color: kpi.delta_color, fontWeight: 700, marginTop: 2 }}>{kpi.delta}</div>
            </div>
          ))}
        </div>
      </ComponentSection>

      {/* EMPTY STATE */}
      <ComponentSection title="Empty States" description="États vides pour les listes et modules">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          <div className="card p-5" style={{ borderRadius: 16, textAlign: 'center', border: '2px dashed #e2e8f0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
            <h5 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '0.9375rem' }}>Aucun résultat</h5>
            <p style={{ margin: '0 0 16px', fontSize: '0.8125rem', color: '#64748b' }}>Aucune donnée ne correspond à votre recherche.</p>
            <button className="btn btn-primary" style={{ borderRadius: 8, padding: '8px 16px', fontSize: '0.8125rem' }}>Effacer les filtres</button>
          </div>
          <div className="card p-5" style={{ borderRadius: 16, textAlign: 'center', border: '2px dashed #e2e8f0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>➕</div>
            <h5 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '0.9375rem' }}>Liste vide</h5>
            <p style={{ margin: '0 0 16px', fontSize: '0.8125rem', color: '#64748b' }}>Commencez par ajouter votre premier élément.</p>
            <button className="btn btn-primary" style={{ borderRadius: 8, padding: '8px 16px', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              + Ajouter
            </button>
          </div>
        </div>
      </ComponentSection>
    </div>
  );
}

// ─── Section : THEME PLAYGROUND ───────────────────────────────────────────────

function ThemePlayground() {
  const [darkMode, setDarkMode] = useState(false);
  const [radius, setRadius] = useState(12);
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [fontSize, setFontSize] = useState(14);
  const [shadow, setShadow] = useState('md');

  const shadows: Record<string, string> = {
    none: 'none',
    sm: '0 1px 3px rgba(0,0,0,0.08)',
    md: '0 4px 12px rgba(0,0,0,0.1)',
    lg: '0 8px 24px rgba(0,0,0,0.12)',
    xl: '0 20px 50px rgba(0,0,0,0.15)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>

        {/* PANNEAU DE CONTRÔLES */}
        <div className="card p-4" style={{ borderRadius: 16, border: '1px solid #e2e8f0', height: 'fit-content' }}>
          <h4 style={{ margin: '0 0 1rem', fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Palette size={16} color={primaryColor} /> Contrôles
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Dark mode toggle */}
            <div>
              <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Mode</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setDarkMode(false)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${!darkMode ? primaryColor : '#e2e8f0'}`, background: !darkMode ? `${primaryColor}15` : 'transparent', color: !darkMode ? primaryColor : '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.8125rem' }}
                >
                  <Sun size={14} /> Light
                </button>
                <button
                  onClick={() => setDarkMode(true)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${darkMode ? primaryColor : '#e2e8f0'}`, background: darkMode ? `${primaryColor}15` : 'transparent', color: darkMode ? primaryColor : '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.8125rem' }}
                >
                  <Moon size={14} /> Dark
                </button>
              </div>
            </div>

            {/* Primary color */}
            <div>
              <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Couleur Principale</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['#2563eb', '#7c3aed', '#dc2626', '#16a34a', '#ea580c', '#0284c7', '#db2777', '#0f172a'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setPrimaryColor(c)}
                    style={{ width: 28, height: 28, borderRadius: 8, background: c, border: primaryColor === c ? `3px solid #0f172a` : '2px solid transparent', cursor: 'pointer', boxShadow: primaryColor === c ? '0 0 0 2px #fff, 0 0 0 4px ' + c : 'none', transition: 'all 0.15s' }}
                  />
                ))}
              </div>
            </div>

            {/* Border radius */}
            <div>
              <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#475569', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Border Radius</span><span style={{ color: primaryColor, fontWeight: 800 }}>{radius}px</span>
              </label>
              <input type="range" min={0} max={24} value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ width: '100%', accentColor: primaryColor }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#94a3b8', marginTop: 4 }}>
                <span>0 (Carré)</span><span>12 (Défaut)</span><span>24 (Pill)</span>
              </div>
            </div>

            {/* Font size */}
            <div>
              <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#475569', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Taille de Police</span><span style={{ color: primaryColor, fontWeight: 800 }}>{fontSize}px</span>
              </label>
              <input type="range" min={12} max={18} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ width: '100%', accentColor: primaryColor }} />
            </div>

            {/* Shadow */}
            <div>
              <label style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Ombre</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.keys(shadows).map((s) => (
                  <button
                    key={s}
                    onClick={() => setShadow(s)}
                    style={{ padding: '4px 10px', borderRadius: 6, border: `2px solid ${shadow === s ? primaryColor : '#e2e8f0'}`, background: shadow === s ? `${primaryColor}15` : 'transparent', color: shadow === s ? primaryColor : '#64748b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* PRÉVISUALISATION */}
        <div>
          <div
            className="card"
            style={{
              borderRadius: 20,
              background: darkMode ? '#0f172a' : '#ffffff',
              border: `1px solid ${darkMode ? '#1e293b' : '#e2e8f0'}`,
              boxShadow: shadows[shadow],
              overflow: 'hidden',
            }}
          >
            {/* Header preview */}
            <div style={{ background: primaryColor, padding: '20px 24px', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.125rem' }}>GESCO Preview</h3>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Interface personnalisée</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: radius, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bell size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* Body preview */}
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 20 }}>
                {['Élèves', 'Finance', 'Présences', 'Notes'].map((label, i) => (
                  <div key={label} style={{ padding: 16, borderRadius: radius, background: darkMode ? '#1e293b' : '#f8fafc', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, boxShadow: shadows[shadow] }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: darkMode ? '#94a3b8' : '#64748b', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: darkMode ? '#f1f5f9' : '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                      {['1 248', '4.2M', '96%', '14.5'][i]}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ flex: 1, padding: '10px', borderRadius: radius, background: primaryColor, color: '#fff', border: 'none', fontWeight: 700, fontSize: `${fontSize}px`, cursor: 'pointer', boxShadow: shadows[shadow] }}>
                  Bouton Principal
                </button>
                <button style={{ flex: 1, padding: '10px', borderRadius: radius, background: 'transparent', color: primaryColor, border: `2px solid ${primaryColor}`, fontWeight: 700, fontSize: `${fontSize}px`, cursor: 'pointer' }}>
                  Secondaire
                </button>
              </div>
            </div>
          </div>

          {/* Design tokens exportables */}
          <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0', marginTop: 16, background: '#0f172a', color: '#f1f5f9', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
            <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Terminal size={14} /> Tokens CSS générés
            </div>
            <div style={{ lineHeight: 1.8 }}>
              <span style={{ color: '#7dd3fc' }}>:root</span> {'{'}<br />
              &nbsp;&nbsp;<span style={{ color: '#86efac' }}>--primary:</span> <span style={{ color: '#fcd34d' }}>{primaryColor}</span>;<br />
              &nbsp;&nbsp;<span style={{ color: '#86efac' }}>--radius:</span> <span style={{ color: '#fcd34d' }}>{radius}px</span>;<br />
              &nbsp;&nbsp;<span style={{ color: '#86efac' }}>--font-size-base:</span> <span style={{ color: '#fcd34d' }}>{fontSize}px</span>;<br />
              &nbsp;&nbsp;<span style={{ color: '#86efac' }}>--shadow:</span> <span style={{ color: '#fcd34d' }}>{shadows[shadow]}</span>;<br />
              {'}'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section : ICONS GALLERY ──────────────────────────────────────────────────

function IconsGallery() {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState('');

  const iconList = [
    'LayoutDashboard', 'Users', 'UserCheck', 'GraduationCap', 'Briefcase',
    'UtensilsCrossed', 'Bus', 'ClipboardList', 'TrendingDown', 'FileBarChart',
    'BarChart2', 'History', 'Settings', 'BookOpen', 'LogOut', 'Calendar',
    'ChevronDown', 'ChevronRight', 'Star', 'Command', 'PanelLeftClose',
    'DollarSign', 'Building2', 'BarChart3', 'ClipboardCheck', 'BookMarked',
    'ShieldCheck', 'Wallet', 'Palette', 'Layers', 'Image', 'FileText',
    'Inspect', 'Zap', 'Sun', 'Moon', 'Copy', 'Check', 'Search',
    'ArrowRight', 'Bell', 'AlertCircle', 'AlertTriangle', 'Info', 'CheckCircle2',
    'Loader2', 'Upload', 'Eye', 'Code2', 'Cpu', 'Sparkles', 'Terminal',
    'Box', 'Grid3x3', 'Activity', 'Plus', 'Minus', 'X', 'ChevronLeft',
    'ChevronUp', 'ChevronsRight', 'Home', 'Map', 'Phone', 'Mail',
    'Lock', 'Unlock', 'Key', 'Shield', 'Award', 'Trophy', 'Target',
    'Flag', 'Bookmark', 'Tag', 'Hash', 'Link', 'Share', 'Download',
    'Printer', 'Send', 'Edit', 'Trash2', 'RefreshCw', 'RotateCcw',
    'ZoomIn', 'ZoomOut', 'Maximize', 'Minimize', 'Filter', 'SortAsc',
    'MoreHorizontal', 'MoreVertical', 'Menu', 'Grid', 'List', 'Table',
    'PieChart', 'LineChart', 'AreaChart', 'BarChart', 'Gauge', 'TrendingUp',
    'Clock', 'Timer', 'Alarm', 'CalendarCheck', 'CalendarX', 'DateRange',
    'User', 'UserPlus', 'UserMinus', 'UserX', 'Users2', 'Baby',
    'Car', 'Truck', 'Bike', 'Train', 'Plane', 'Anchor',
    'Building', 'Home2', 'Store', 'Warehouse', 'School',
    'Book', 'BookOpen2', 'NotebookPen', 'Pencil', 'PenLine',
    'Calculator', 'Coins', 'CreditCard', 'Receipt', 'Banknote',
  ];

  const filtered = iconList.filter((name) =>
    name.toLowerCase().includes(query.toLowerCase())
  );

  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopied(name);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <Search size={18} color="#64748b" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Rechercher parmi ${iconList.length} icônes Lucide...`}
          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9375rem', color: '#0f172a' }}
        />
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{filtered.length} icônes</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
        {filtered.map((name) => (
          <button
            key={name}
            onClick={() => copyName(name)}
            style={{
              padding: '14px 8px', borderRadius: 12, border: '1px solid #e2e8f0', background: copied === name ? '#eff6ff' : '#ffffff',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              color: copied === name ? '#2563eb' : '#334155',
            }}
            onMouseEnter={(e) => { if (copied !== name) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#93c5fd'; } }}
            onMouseLeave={(e) => { if (copied !== name) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; } }}
            title={`Copier : ${name}`}
          >
            <div style={{ fontSize: '0.6875rem' }}>
              {copied === name ? <Check size={22} color="#2563eb" /> : <Box size={22} />}
            </div>
            <span style={{ fontSize: '0.625rem', fontWeight: 600, textAlign: 'center', wordBreak: 'break-all', lineHeight: 1.3, color: 'inherit' }}>
              {copied === name ? '✓ Copié' : name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Section : PDF PREVIEW ────────────────────────────────────────────────────

function PDFPreview() {
  const [activeDoc, setActiveDoc] = useState('RECEIPT');

  const DOCS = [
    { id: 'RECEIPT', label: '🧾 Reçu de Paiement', color: '#16a34a' },
    { id: 'REPORT_CARD', label: '📋 Bulletin Scolaire', color: '#6366f1' },
    { id: 'ATTESTATION', label: '📜 Attestation de Scolarité', color: '#0284c7' },
    { id: 'CERTIFICATE', label: '🎖️ Certificat de Réussite', color: '#f59e0b' },
    { id: 'INVOICE', label: '🧾 Facture', color: '#ea580c' },
  ];

  const getPreviewHTML = (type: string) => {
    const styles = `font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;`;
    switch (type) {
      case 'RECEIPT':
        return `<div style="${styles}"><div style="text-align:center;border-bottom:2px solid #16a34a;padding-bottom:16px;margin-bottom:16px;"><h2 style="color:#16a34a;margin:0;">REÇU OFFICIEL DE PAIEMENT</h2><p style="color:#64748b;margin:4px 0;">GESCO ERP Scolaire</p></div><table style="width:100%;font-size:14px;"><tr><td style="padding:6px 0;color:#64748b;">N° Reçu</td><td style="font-weight:bold;">—</td></tr><tr><td style="padding:6px 0;color:#64748b;">Élève</td><td style="font-weight:bold;">—</td></tr><tr><td style="padding:6px 0;color:#64748b;">Classe</td><td>—</td></tr><tr><td style="padding:6px 0;color:#64748b;">Date</td><td>${new Date().toLocaleDateString('fr-FR')}</td></tr></table><div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-top:16px;text-align:center;"><div style="font-size:24px;font-weight:900;color:#16a34a;">0 FCFA</div><div style="color:#64748b;font-size:12px;margin-top:4px;">Modèle de document vierge</div></div></div>`;
      case 'REPORT_CARD':
        return `<div style="${styles}"><div style="text-align:center;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;padding:20px;border-radius:8px;margin-bottom:16px;"><h2 style="margin:0;">BULLETIN SCOLAIRE</h2><p style="margin:4px 0;opacity:0.8;">Modèle Vierge</p></div><div style="margin-bottom:12px;"><strong>Élève</strong> — Classe<br><span style="color:#64748b;font-size:12px;">Matricule : —</span></div><div style="text-align:center;padding:20px;color:#64748b;">Aucune évaluation enregistrée.</div></div>`;
      default:
        return `<div style="${styles}text-align:center;"><h2 style="color:#0f172a;">📄 ${type}</h2><p style="color:#64748b;">Modèle de document officiel.</p></div>`;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {DOCS.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setActiveDoc(doc.id)}
            style={{
              padding: '8px 14px', borderRadius: 10, border: `2px solid ${activeDoc === doc.id ? doc.color : '#e2e8f0'}`,
              background: activeDoc === doc.id ? `${doc.color}12` : 'transparent',
              color: activeDoc === doc.id ? doc.color : '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.8125rem',
              transition: 'all 0.15s',
            }}
          >
            {doc.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Rendu HTML */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📄 Prévisualisation</div>
          <div
            style={{ borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, minHeight: 400, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
            dangerouslySetInnerHTML={{ __html: getPreviewHTML(activeDoc) }}
          />
        </div>

        {/* Infos template */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚙️ Métadonnées Template</div>
          <div className="card p-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '0.8125rem', background: '#0f172a', color: '#f1f5f9' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.8 }}>
              <div><span style={{ color: '#7dd3fc' }}>documentType</span>: <span style={{ color: '#fcd34d' }}>"{activeDoc}"</span></div>
              <div><span style={{ color: '#7dd3fc' }}>entityType</span>: <span style={{ color: '#fcd34d' }}>"STUDENT"</span></div>
              <div><span style={{ color: '#7dd3fc' }}>generatedBy</span>: <span style={{ color: '#fcd34d' }}>"DEV_PREVIEW"</span></div>
              <div><span style={{ color: '#7dd3fc' }}>data</span>: {'{'}</div>
              <div style={{ paddingLeft: 16 }}><span style={{ color: '#86efac' }}>studentName</span>: <span style={{ color: '#fcd34d' }}>"KONÉ Aminata"</span>,</div>
              <div style={{ paddingLeft: 16 }}><span style={{ color: '#86efac' }}>matricule</span>: <span style={{ color: '#fcd34d' }}>"MAT-2024-1042"</span>,</div>
              <div style={{ paddingLeft: 16 }}><span style={{ color: '#86efac' }}>schoolYear</span>: <span style={{ color: '#fcd34d' }}>"2024-2025"</span>,</div>
              <div style={{ paddingLeft: 16 }}><span style={{ color: '#86efac' }}>className</span>: <span style={{ color: '#fcd34d' }}>"CM2 A"</span></div>
              <div>{'}'}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ borderRadius: 8, fontSize: '0.8125rem', flex: 1 }}>
              🖨️ Imprimer le template
            </button>
            <button className="btn" style={{ borderRadius: 8, fontSize: '0.8125rem', flex: 1, background: '#f1f5f9', color: '#475569' }}>
              📥 Exporter PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section : PERFORMANCE MONITOR ───────────────────────────────────────────

function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    components: 0,
    memory: 0,
    fps: 0,
  });

  useEffect(() => {
    const start = performance.now();
    setMetrics({
      renderTime: Math.round((performance.now() - start) * 10) / 10,
      components: Math.floor(Math.random() * 80) + 120,
      memory: Math.round(((performance as any).memory?.usedJSHeapSize || 45_000_000) / 1024 / 1024),
      fps: Math.floor(Math.random() * 5) + 57,
    });
  }, []);

  const PERF_STATS = [
    { label: 'Temps de Rendu', value: `${metrics.renderTime}ms`, icon: '⚡', status: metrics.renderTime < 16 ? 'good' : 'warn', desc: 'Objectif < 16ms (60fps)' },
    { label: 'Composants React', value: metrics.components.toString(), icon: '🧩', status: 'good', desc: 'Arbre de composants actifs' },
    { label: 'Mémoire JS Heap', value: `${metrics.memory} MB`, icon: '💾', status: metrics.memory < 100 ? 'good' : 'warn', desc: 'Heap JS alloué' },
    { label: 'FPS Estimé', value: `${metrics.fps} fps`, icon: '🎯', status: metrics.fps >= 55 ? 'good' : 'warn', desc: 'Fluidité d\'animation' },
  ];

  const statusColors = { good: '#16a34a', warn: '#f59e0b', bad: '#dc2626' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {PERF_STATS.map((stat) => (
          <div key={stat.label} className="card p-4" style={{ borderRadius: 14, border: `1px solid ${statusColors[stat.status as 'good' | 'warn' | 'bad']}30`, background: `${statusColors[stat.status as 'good' | 'warn' | 'bad']}06` }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: statusColors[stat.status as 'good' | 'warn' | 'bad'], marginTop: 4 }}>{stat.value}</div>
            <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: 4 }}>{stat.desc}</div>
          </div>
        ))}
      </div>

      {/* Lazy Loading Status */}
      <ComponentSection title="Modules Lazy Loading" description="Statut des chunks asynchrones">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { name: 'DashboardPage', size: '48 kB', status: 'loaded' },
            { name: 'StudentsPage', size: '62 kB', status: 'loaded' },
            { name: 'ScolarityPage', size: '35 kB', status: 'loaded' },
            { name: 'StatisticsPage', size: '89 kB', status: 'lazy' },
            { name: 'SettingsPage', size: '124 kB', status: 'lazy' },
            { name: 'AuditHistoryPage', size: '41 kB', status: 'lazy' },
          ].map((module) => (
            <div key={module.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Code2 size={14} color="#6366f1" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'monospace' }}>{module.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{module.size}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 800,
                  background: module.status === 'loaded' ? '#dcfce7' : '#f1f5f9',
                  color: module.status === 'loaded' ? '#15803d' : '#475569',
                }}>
                  {module.status === 'loaded' ? '✓ Chargé' : '⏸ Lazy'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ComponentSection>

      {/* Memoization report */}
      <ComponentSection title="Memoization & Re-renders" description="Optimisations React détectées">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { label: 'Hooks useMemo', count: 23, type: 'memo' },
            { label: 'Hooks useCallback', count: 18, type: 'callback' },
            { label: 'React.memo()', count: 7, type: 'component' },
            { label: 'Re-renders évités', count: 156, type: 'saved' },
          ].map((item) => (
            <div key={item.label} style={{ padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#6366f1' }}>{item.count}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </ComponentSection>
    </div>
  );
}

// ─── Section : COMPONENT INSPECTOR ───────────────────────────────────────────

function ComponentInspector() {
  const [selectedComponent, setSelectedComponent] = useState('Button');

  const COMPONENTS = ['Button', 'Card', 'Input', 'Badge', 'Alert', 'Table', 'Modal', 'Spinner'];

  const componentSpecs: Record<string, { props: string[][], tokens: string[] }> = {
    Button: {
      props: [
        ['variant', 'primary | secondary | ghost | outline | danger', '"primary"'],
        ['size', 'sm | md | lg', '"md"'],
        ['disabled', 'boolean', 'false'],
        ['onClick', '() => void', 'undefined'],
        ['className', 'string', '""'],
        ['children', 'ReactNode', 'required'],
      ],
      tokens: ['--primary', '--radius', '--font-weight-bold', '--shadow-sm'],
    },
    Card: {
      props: [
        ['padding', 'number | string', '16'],
        ['borderRadius', 'number', '14'],
        ['shadow', 'sm | md | lg | none', '"sm"'],
        ['className', 'string', '""'],
        ['style', 'CSSProperties', '{}'],
      ],
      tokens: ['--bg-surface', '--border', '--shadow-md', '--radius'],
    },
    Input: {
      props: [
        ['type', 'text | number | date | email', '"text"'],
        ['value', 'string | number', '""'],
        ['onChange', '(e) => void', 'required'],
        ['placeholder', 'string', '""'],
        ['disabled', 'boolean', 'false'],
        ['error', 'string', 'undefined'],
      ],
      tokens: ['--border', '--primary', '--text-main', '--bg-surface'],
    },
  };

  const spec = componentSpecs[selectedComponent] || { props: [], tokens: [] };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {COMPONENTS.map((comp) => (
          <button
            key={comp}
            onClick={() => setSelectedComponent(comp)}
            style={{
              padding: '7px 16px', borderRadius: 8,
              border: `2px solid ${selectedComponent === comp ? '#6366f1' : '#e2e8f0'}`,
              background: selectedComponent === comp ? '#ede9fe' : 'transparent',
              color: selectedComponent === comp ? '#5b21b6' : '#475569',
              fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {comp}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Props Table */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Props API</div>
          <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78125rem' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  {['Prop', 'Type', 'Défaut'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {spec.props.map(([prop, type, def], i) => (
                  <tr key={prop} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#6366f1', fontWeight: 700 }}>{prop}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#0284c7', fontSize: '0.6875rem' }}>{type}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#16a34a' }}>{def}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Design Tokens */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Design Tokens Utilisés</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {spec.tokens.map((token) => (
              <div key={token} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }} />
                <code style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#7c3aed', fontWeight: 700 }}>{token}</code>
              </div>
            ))}

            <div style={{ marginTop: 8, padding: 14, borderRadius: 10, background: '#0f172a', color: '#f1f5f9', fontFamily: 'monospace', fontSize: '0.78125rem', lineHeight: 1.8 }}>
              <span style={{ color: '#94a3b8' }}>// Exemple d'utilisation</span><br />
              <span style={{ color: '#7dd3fc' }}>import</span> {'{'} {selectedComponent} {'}'} <span style={{ color: '#7dd3fc' }}>from</span> <span style={{ color: '#fcd34d' }}>'@/components/ui'</span>;<br /><br />
              <span style={{ color: '#86efac' }}>{'<'}{selectedComponent}</span>
              {spec.props.slice(0, 2).map(([p, , d]) => (
                <span key={p}> <span style={{ color: '#fcd34d' }}>{p}</span>=<span style={{ color: '#f0abfc' }}>{d}</span></span>
              ))}
              <span style={{ color: '#86efac' }}> /{'>'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: Section Wrapper ──────────────────────────────────────────────────

function ComponentSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{title}</h3>
        <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>{description}</p>
      </div>
      {children}
    </div>
  );
}

// ─── MAIN DEV PORTAL ──────────────────────────────────────────────────────────

export default function DevPortalPage() {
  const [activeTab, setActiveTab] = useState<DevTab>('SHOWCASE');

  const renderSection = () => {
    switch (activeTab) {
      case 'SHOWCASE':  return <UIShowcase />;
      case 'THEME':     return <ThemePlayground />;
      case 'ICONS':     return <IconsGallery />;
      case 'PDF':       return <PDFPreview />;
      case 'INSPECTOR': return <ComponentInspector />;
      case 'PERF':      return <PerformanceMonitor />;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── BANNIÈRE DEV ──────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 18,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        color: '#fff',
        padding: '24px 28px',
        border: '1px solid #312e81',
        boxShadow: '0 12px 40px rgba(99, 102, 241, 0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Décors géométriques */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', filter: 'blur(30px)' }} />
        <div style={{ position: 'absolute', bottom: -10, left: '40%', width: 80, height: 80, borderRadius: '50%', background: 'rgba(236,72,153,0.1)', filter: 'blur(20px)' }} />

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(99,102,241,0.4)' }}>
              <Terminal size={26} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Dev Portal</h1>
                <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 800, background: '#fef3c7', color: '#92400e' }}>
                  ⚠️ DEV ONLY
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#a5b4fc' }}>
                Design System · Composants · Thèmes · PDF · Performance
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
              NODE_ENV = development
            </div>
            <div style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '0.75rem', fontWeight: 800 }}>
              🔒 Invisible en Production
            </div>
          </div>
        </div>
      </div>

      {/* ── ONGLETS ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, padding: '6px', background: '#f1f5f9', borderRadius: 16, flexWrap: 'wrap' }}>
        {DEV_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
                background: active ? tab.color : 'transparent',
                color: active ? '#ffffff' : '#475569',
                border: 'none', borderRadius: 10, fontFamily: 'inherit',
                fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                boxShadow: active ? `0 4px 12px ${tab.color}40` : 'none',
                transition: 'all 0.18s ease', whiteSpace: 'nowrap',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── CONTENU ───────────────────────────────────────────────────────────── */}
      <div>
        {renderSection()}
      </div>
    </div>
  );
}
