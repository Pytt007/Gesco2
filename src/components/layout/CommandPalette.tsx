// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Command Palette (src/components/layout/CommandPalette.tsx)
// Recherche globale ultra-rapide accessible via CTRL+K ou CMD+K
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, X, LayoutDashboard, Users, UserCheck, GraduationCap,
  Briefcase, UtensilsCrossed, Bus, Trophy, ClipboardList, TrendingDown,
  FileBarChart, BarChart2, History, Settings, BookOpen, Calendar,
  ArrowRight, Sparkles, Command
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboard/dashboardService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Module' | 'Élève' | 'Parent' | 'Classe' | 'Action' | 'Paramètre';
  icon: React.ReactNode;
  targetView: string;
}

const ALL_MODULE_COMMANDS: CommandItem[] = [
  { id: 'cmd-dashboard', title: 'Tableau de bord', subtitle: 'Vue synthétique & KPIs', category: 'Module', icon: <LayoutDashboard size={16} />, targetView: 'DASHBOARD' },
  { id: 'cmd-students', title: 'Gestion des Élèves', subtitle: 'Inscriptions & Dossiers', category: 'Module', icon: <Users size={16} />, targetView: 'STUDENTS' },
  { id: 'cmd-parents', title: 'Parents & Responsables', subtitle: 'Contacts & Tutorat', category: 'Module', icon: <UserCheck size={16} />, targetView: 'PARENTS' },
  { id: 'cmd-classes', title: 'Classes & Salles', subtitle: 'Niveaux & Effectifs', category: 'Module', icon: <GraduationCap size={16} />, targetView: 'CLASSES' },
  { id: 'cmd-staff', title: 'Personnel & Enseignants', subtitle: 'RH & Titulaires', category: 'Module', icon: <Briefcase size={16} />, targetView: 'STAFF' },
  { id: 'cmd-scolarity', title: 'Frais de Scolarité', subtitle: 'Encaissements & Récépissés', category: 'Module', icon: <ClipboardList size={16} />, targetView: 'SCOLARITY' },
  { id: 'cmd-canteen', title: 'Cantine Scolaire', subtitle: 'Abonnés & Repas', category: 'Module', icon: <UtensilsCrossed size={16} />, targetView: 'CANTEEN' },
  { id: 'cmd-transport', title: 'Transport Scolaire', subtitle: 'Lignes & Circuit', category: 'Module', icon: <Bus size={16} />, targetView: 'TRANSPORT' },
  { id: 'cmd-expenses', title: 'Dépenses & Budget', subtitle: 'Achats & Charges', category: 'Module', icon: <TrendingDown size={16} />, targetView: 'EXPENSES' },
  { id: 'cmd-notes', title: 'Saisie des Notes', subtitle: 'Évaluations & Devoirs', category: 'Module', icon: <BookOpen size={16} />, targetView: 'NOTES' },
  { id: 'cmd-reports', title: 'Centre de Rapports', subtitle: 'Bulletins & Exports PDF/Excel', category: 'Module', icon: <FileBarChart size={16} />, targetView: 'REPORTS' },
  { id: 'cmd-settings', title: 'Paramètres du Système', subtitle: 'Configurations & Rôles', category: 'Module', icon: <Settings size={16} />, targetView: 'SETTINGS' },
];

export default function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const { canAccess } = useAuth();
  const [query, setQuery] = useState('');
  const [dynamicResults, setDynamicResults] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Recherche globale dynamique avec backend fallback
  useEffect(() => {
    if (!query.trim()) {
      setDynamicResults([]);
      return;
    }

    let active = true;
    dashboardService.globalSearch(query).then((res) => {
      if (!active) return;
      const mapped: CommandItem[] = res.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        category: r.category as any,
        icon: <Sparkles size={16} color="#4f46e5" />,
        targetView: r.targetView,
      }));
      setDynamicResults(mapped);
    });

    return () => { active = false; };
  }, [query]);

  // Filtrage des modules statiques
  const filteredModules = ALL_MODULE_COMMANDS.filter(
    (cmd) =>
      canAccess(cmd.targetView) &&
      (cmd.title.toLowerCase().includes(query.toLowerCase()) ||
        cmd.subtitle?.toLowerCase().includes(query.toLowerCase()))
  );

  const combinedResults = query.trim()
    ? [...dynamicResults, ...filteredModules]
    : filteredModules;

  // Raccourcis clavier (Flèches Haut/Bas, Entrée, Echap)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % combinedResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + combinedResults.length) % combinedResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (combinedResults[selectedIndex]) {
        handleSelect(combinedResults[selectedIndex].targetView);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (view: string) => {
    onClose();
    onNavigate(view);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'slideUp 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* En-tête avec Champ de recherche */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #e2e8f0', gap: '12px' }}>
          <Search size={20} color="#6366f1" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un module, élève, parent, classe, rapport... (CTRL + K)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              color: '#0f172a',
              background: 'transparent',
            }}
          />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 7px', background: '#f1f5f9', color: '#64748b', borderRadius: '6px' }}>
            ESC
          </span>
        </div>

        {/* Liste des résultats */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px 0' }}>
          {combinedResults.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              Aucun résultat trouvé pour « {query} ».
            </div>
          ) : (
            combinedResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => handleSelect(item.targetView)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 18px',
                    border: 'none',
                    background: isSelected ? '#eef2ff' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        background: isSelected ? '#4f46e5' : '#f8fafc',
                        color: isSelected ? '#ffffff' : '#4f46e5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? '#312e81' : '#0f172a' }}>
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.subtitle}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                      {item.category}
                    </span>
                    <ArrowRight size={14} color={isSelected ? '#4f46e5' : '#cbd5e1'} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Raccourcis Clavier */}
        <div
          style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            padding: '10px 18px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            fontSize: '0.75rem',
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', gap: '12px' }}>
            <span>↑↓ Déplacer</span>
            <span>↵ Sélectionner</span>
          </div>
          <span>GESCO Command Palette v2.0</span>
        </div>
      </div>
    </div>
  );
}
