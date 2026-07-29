import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, UserCheck, GraduationCap,
  Briefcase, UtensilsCrossed, Bus, Trophy, ClipboardList, TrendingDown,
  FileBarChart, Settings, BookOpen, Sparkles, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboard/dashboardService';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '../ui/command';
import { Badge } from '../ui/badge';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

interface CommandItemData {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Module' | 'Élève' | 'Parent' | 'Classe' | 'Action' | 'Paramètre';
  icon: React.ReactNode;
  targetView: string;
}

const ALL_MODULE_COMMANDS: CommandItemData[] = [
  { id: 'cmd-dashboard', title: 'Tableau de bord', subtitle: 'Vue synthétique & KPIs', category: 'Module', icon: <LayoutDashboard className="h-4 w-4 text-purple-600" />, targetView: 'DASHBOARD' },
  { id: 'cmd-students', title: 'Gestion des Élèves', subtitle: 'Inscriptions & Dossiers', category: 'Module', icon: <Users className="h-4 w-4 text-purple-600" />, targetView: 'STUDENTS' },
  { id: 'cmd-parents', title: 'Parents & Responsables', subtitle: 'Contacts & Tutorat', category: 'Module', icon: <UserCheck className="h-4 w-4 text-purple-600" />, targetView: 'PARENTS' },
  { id: 'cmd-classes', title: 'Classes & Salles', subtitle: 'Niveaux & Effectifs', category: 'Module', icon: <GraduationCap className="h-4 w-4 text-purple-600" />, targetView: 'CLASSES' },
  { id: 'cmd-staff', title: 'Personnel & Enseignants', subtitle: 'RH & Titulaires', category: 'Module', icon: <Briefcase className="h-4 w-4 text-purple-600" />, targetView: 'STAFF' },
  { id: 'cmd-scolarity', title: 'Frais de Scolarité', subtitle: 'Encaissements & Récépissés', category: 'Module', icon: <ClipboardList className="h-4 w-4 text-purple-600" />, targetView: 'SCOLARITY' },
  { id: 'cmd-canteen', title: 'Cantine Scolaire', subtitle: 'Abonnés & Repas', category: 'Module', icon: <UtensilsCrossed className="h-4 w-4 text-purple-600" />, targetView: 'CANTEEN' },
  { id: 'cmd-transport', title: 'Transport Scolaire', subtitle: 'Lignes & Circuit', category: 'Module', icon: <Bus className="h-4 w-4 text-purple-600" />, targetView: 'TRANSPORT' },
  { id: 'cmd-expenses', title: 'Dépenses & Budget', subtitle: 'Achats & Charges', category: 'Module', icon: <TrendingDown className="h-4 w-4 text-purple-600" />, targetView: 'EXPENSES' },
  { id: 'cmd-notes', title: 'Saisie des Notes', subtitle: 'Évaluations & Devoirs', category: 'Module', icon: <BookOpen className="h-4 w-4 text-purple-600" />, targetView: 'NOTES' },
  { id: 'cmd-reports', title: 'Centre de Rapports', subtitle: 'Bulletins & Exports PDF/Excel', category: 'Module', icon: <FileBarChart className="h-4 w-4 text-purple-600" />, targetView: 'REPORTS' },
  { id: 'cmd-settings', title: 'Paramètres du Système', subtitle: 'Configurations & Rôles', category: 'Module', icon: <Settings className="h-4 w-4 text-purple-600" />, targetView: 'SETTINGS' },
];

export default function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const { canAccess } = useAuth();
  const [query, setQuery] = useState('');
  const [dynamicResults, setDynamicResults] = useState<CommandItemData[]>([]);

  // Recherche globale dynamique avec backend fallback
  useEffect(() => {
    if (!query.trim()) {
      setDynamicResults([]);
      return;
    }

    let active = true;
    dashboardService.globalSearch(query).then((res) => {
      if (!active) return;
      const mapped: CommandItemData[] = res.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        category: r.category as any,
        icon: <Sparkles className="h-4 w-4 text-purple-600" />,
        targetView: r.targetView,
      }));
      setDynamicResults(mapped);
    });

    return () => { active = false; };
  }, [query]);

  const handleSelect = (viewId: string) => {
    onNavigate(viewId);
    onClose();
  };

  const filteredModules = ALL_MODULE_COMMANDS.filter(
    (cmd) => canAccess(cmd.targetView)
  );

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <CommandInput
        placeholder="Rechercher un module, un élève, un reçu... (⌘K)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé pour « {query} ».</CommandEmpty>

        {dynamicResults.length > 0 && (
          <CommandGroup heading="Résultats Dynamiques">
            {dynamicResults.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => handleSelect(item.targetView)}
                className="justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{item.title}</div>
                    {item.subtitle && <div className="text-xs text-slate-500">{item.subtitle}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{item.category}</Badge>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Modules & Navigation">
          {filteredModules.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={() => handleSelect(item.targetView)}
              className="justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  {item.icon}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{item.title}</div>
                  {item.subtitle && <div className="text-xs text-slate-500">{item.subtitle}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="neutral">{item.category}</Badge>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
