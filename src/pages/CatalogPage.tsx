// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Page Catalogue Pédagogique (src/pages/CatalogPage.tsx)
// Référentiel des Matières, Catégories, Matières Composées et Programme par Niveau (PS à CM2)
// Architecture : UI -> Hooks -> Services -> Supabase -> Database
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import {
  useSubjectCategories,
  useSubjects,
  useSubjectComponents,
  useLevelSubjects,
} from '../hooks/academic/catalog';
import { useSchoolLevels } from '../hooks/academic';
import { SubjectCategory } from '../services/academic/catalog/subjectCategoriesService';
import { Subject } from '../services/academic/catalog/subjectsService';
import {
  BookOpen,
  FolderTree,
  GitMerge,
  GraduationCap,
  Search,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';

export default function CatalogPage() {
  const { addNotification } = useToast();
  const confirm = useConfirm();

  // Onglet courant du Catalogue : 'SUBJECTS' | 'CATEGORIES' | 'COMPOSITES' | 'LEVELS'
  const [activeTab, setActiveTab] = useState<'SUBJECTS' | 'CATEGORIES' | 'COMPOSITES' | 'LEVELS'>('SUBJECTS');

  // ─── HOOKS CATALOGUE PÉDAGOGIQUE ──────────────────────────────────────────
  const categoriesHook = useSubjectCategories();
  const subjectsHook = useSubjects({ pageSize: 12 });
  const levelsListHook = useSchoolLevels();

  // Sélection pour Matières Composées (Parent)
  const [selectedParentId, setSelectedParentId] = useState<string>('b0200000-0000-4000-b000-000000000008'); // EDM par défaut
  const componentsHook = useSubjectComponents(selectedParentId);

  // Sélection pour Programme par Niveau
  const [selectedLevelId, setSelectedLevelId] = useState<string>('00000000-0000-4000-a000-000000000104'); // CP1 par défaut
  const levelSubjectsHook = useLevelSubjects(selectedLevelId);

  // ─── ÉTATS MODAUX & FORMULAIRES ─────────────────────────────────────────

  // Modal Matière (Création / Édition)
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState<Partial<Subject>>({
    name: '',
    shortName: '',
    code: '',
    categoryId: '11111111-1111-4111-a111-111111111111',
    description: '',
    isComposite: false,
    isGraded: true,
    sortOrder: 1,
  });

  // Modal Catégorie (Création / Édition)
  const [showCatModal, setShowCatModal] = useState<boolean>(false);
  const [editingCat, setEditingCat] = useState<SubjectCategory | null>(null);
  const [catForm, setCatForm] = useState<Partial<SubjectCategory>>({
    name: '',
    code: '',
    description: '',
    sortOrder: 1,
  });

  // Modal Ajout Composant
  const [showAddComponentModal, setShowAddComponentModal] = useState<boolean>(false);
  const [childSubjectIdToAdd, setChildSubjectIdToAdd] = useState<string>('');
  const [componentSortOrder, setComponentSortOrder] = useState<number>(1);

  // Modal Affectation Matières par Niveau
  const [showAssignLevelModal, setShowAssignLevelModal] = useState<boolean>(false);
  const [levelSubjectIdToAdd, setLevelSubjectIdToAdd] = useState<string>('');
  const [levelIsRequired, setLevelIsRequired] = useState<boolean>(true);
  const [levelSortOrder, setLevelSortOrder] = useState<number>(1);

  // Filtre rapide type de matière pour l'onglet Matières
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MAIN' | 'COMPLEMENTARY' | 'PRESCHOOL'>('ALL');

  // ─── GESTION DES ACTIONS MATIÈRES ────────────────────────────────────────

  const openCreateSubjectModal = () => {
    setEditingSubject(null);
    const defaultCatId = categoriesHook.categories[0]?.id || '11111111-1111-4111-a111-111111111111';
    setSubjectForm({
      name: '',
      shortName: '',
      code: '',
      categoryId: defaultCatId,
      description: '',
      isComposite: false,
      isGraded: true,
      sortOrder: (subjectsHook.subjects.length || 0) + 1,
    });
    setShowSubjectModal(true);
  };

  const openEditSubjectModal = (subj: Subject) => {
    setEditingSubject(subj);
    setSubjectForm({
      name: subj.name,
      shortName: subj.shortName,
      code: subj.code,
      categoryId: subj.categoryId,
      description: subj.description || '',
      isComposite: subj.isComposite,
      isGraded: subj.isGraded,
      sortOrder: subj.sortOrder,
    });
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.name?.trim()) {
      addNotification('error', 'Le nom de la matière est obligatoire.');
      return;
    }

    if (editingSubject) {
      const ok = await subjectsHook.updateSubject(editingSubject.id, subjectForm);
      if (ok) {
        addNotification('success', 'Matière mise à jour avec succès.');
        setShowSubjectModal(false);
      } else if (subjectsHook.error) {
        addNotification('error', subjectsHook.error);
      }
    } else {
      const ok = await subjectsHook.createSubject(subjectForm);
      if (ok) {
        addNotification('success', 'Nouvelle matière ajoutée au catalogue.');
        setShowSubjectModal(false);
      } else if (subjectsHook.error) {
        addNotification('error', subjectsHook.error);
      }
    }
  };

  const handleToggleArchiveSubject = async (subj: Subject) => {
    if (subj.isActive) {
      const isConfirmed = await confirm({
        title: 'Désactivation de matière',
        message: `Désactiver la matière "${subj.name}" ?`,
        confirmText: 'Oui, désactiver',
        cancelText: 'Annuler',
        variant: 'warning',
      });
      if (isConfirmed) {
        const ok = await subjectsHook.archiveSubject(subj.id);
        if (ok) addNotification('info', 'Matière désactivée.');
      }
    } else {
      const ok = await subjectsHook.restoreSubject(subj.id);
      if (ok) addNotification('success', 'Matière restaurée.');
    }
  };

  // ─── GESTION DES ACTIONS CATÉGORIES ──────────────────────────────────────

  const openCreateCatModal = () => {
    setEditingCat(null);
    setCatForm({
      name: '',
      code: '',
      description: '',
      sortOrder: (categoriesHook.categories.length || 0) + 1,
    });
    setShowCatModal(true);
  };

  const openEditCatModal = (cat: SubjectCategory) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      code: cat.code,
      description: cat.description || '',
      sortOrder: cat.sortOrder,
    });
    setShowCatModal(true);
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name?.trim()) {
      addNotification('error', 'Le nom de la catégorie est obligatoire.');
      return;
    }

    if (editingCat) {
      const ok = await categoriesHook.updateCategory(editingCat.id, catForm);
      if (ok) {
        addNotification('success', 'Catégorie mise à jour.');
        setShowCatModal(false);
      }
    } else {
      const ok = await categoriesHook.createCategory(catForm);
      if (ok) {
        addNotification('success', 'Catégorie créée avec succès.');
        setShowCatModal(false);
      }
    }
  };

  // ─── GESTION COMPOSANTS MATIÈRES COMPOSÉES ──────────────────────────────

  const handleAddComponentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childSubjectIdToAdd) {
      addNotification('error', 'Veuillez sélectionner une sous-matière à ajouter.');
      return;
    }

    const ok = await componentsHook.addComponent(childSubjectIdToAdd, componentSortOrder);
    if (ok) {
      addNotification('success', 'Sous-matière ajoutée au composant.');
      setShowAddComponentModal(false);
      setChildSubjectIdToAdd('');
    } else if (componentsHook.error) {
      addNotification('error', componentsHook.error);
    }
  };

  const handleRemoveComponent = async (childId: string) => {
    const isConfirmed = await confirm({
      title: 'Retirer la sous-matière',
      message: 'Retirer cette sous-matière de la matière composée ?',
      confirmText: 'Oui, retirer',
      cancelText: 'Annuler',
      variant: 'warning',
    });
    if (isConfirmed) {
      const ok = await componentsHook.removeComponent(childId);
      if (ok) addNotification('info', 'Sous-matière retirée.');
    }
  };

  // ─── GESTION MATIÈRES PAR NIVEAU ──────────────────────────────────────────

  const handleAssignLevelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelSubjectIdToAdd) {
      addNotification('error', 'Veuillez sélectionner une matière.');
      return;
    }

    const ok = await levelSubjectsHook.assignSubject(levelSubjectIdToAdd, levelIsRequired, levelSortOrder);
    if (ok) {
      addNotification('success', 'Matière affectée au niveau scolaire.');
      setShowAssignLevelModal(false);
      setLevelSubjectIdToAdd('');
    } else if (levelSubjectsHook.error) {
      addNotification('error', levelSubjectsHook.error);
    }
  };

  const handleRemoveLevelSubject = async (subjId: string) => {
    const isConfirmed = await confirm({
      title: 'Retirer du programme',
      message: 'Retirer cette matière du programme de ce niveau ?',
      confirmText: 'Oui, retirer',
      cancelText: 'Annuler',
      variant: 'warning',
    });
    if (isConfirmed) {
      const ok = await levelSubjectsHook.removeSubject(subjId);
      if (ok) addNotification('info', 'Matière retirée du niveau.');
    }
  };

  // Matières éligibles pour devenir composants (exclure le parent actuel)
  const candidateChildSubjects = useMemo(() => {
    return subjectsHook.subjects.filter((s) => s.id !== selectedParentId && s.isActive);
  }, [subjectsHook.subjects, selectedParentId]);

  // Liste des matières composées (isComposite = true)
  const compositeSubjects = useMemo(() => {
    return subjectsHook.subjects.filter((s) => s.isComposite);
  }, [subjectsHook.subjects]);

  // Matière parente actuellement sélectionnée
  const currentParentSubject = useMemo(() => {
    return subjectsHook.subjects.find((s) => s.id === selectedParentId);
  }, [subjectsHook.subjects, selectedParentId]);

  return (
    <div className="page-container" style={{ padding: '1.5rem' }}>

      {/* En-tête de la page */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={24} style={{ color: 'var(--primary)' }} />
            Catalogue Pédagogique
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Référentiel unique des matières, catégories, matières composées et programmes par niveau (PS à CM2).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={() => {
              categoriesHook.refresh();
              subjectsHook.refresh();
              componentsHook.refresh();
              levelSubjectsHook.refresh();
              addNotification('info', 'Données du catalogue rafraîchies.');
            }}
            aria-label="Rafraîchir les données"
          >
            <RefreshCw size={16} className={(categoriesHook.loading || subjectsHook.loading) ? 'spin' : ''} />
            <span>Actualiser</span>
          </button>

          {activeTab === 'SUBJECTS' && (
            <button className="btn btn-primary" onClick={openCreateSubjectModal} aria-label="Créer une nouvelle matière">
              <Plus size={16} />
              <span>Nouvelle Matière</span>
            </button>
          )}

          {activeTab === 'CATEGORIES' && (
            <button className="btn btn-primary" onClick={openCreateCatModal} aria-label="Créer une catégorie">
              <Plus size={16} />
              <span>Nouvelle Catégorie</span>
            </button>
          )}
        </div>
      </div>

      {/* Onglets principaux */}
      <div className="tabs" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        <button
          className={`tab-item ${activeTab === 'SUBJECTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('SUBJECTS')}
          style={{ padding: '0.75rem 1.25rem', fontWeight: 600, borderBottom: activeTab === 'SUBJECTS' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'SUBJECTS' ? 'var(--primary)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <BookOpen size={18} />
          <span>Matières ({subjectsHook.totalCount})</span>
        </button>

        <button
          className={`tab-item ${activeTab === 'CATEGORIES' ? 'active' : ''}`}
          onClick={() => setActiveTab('CATEGORIES')}
          style={{ padding: '0.75rem 1.25rem', fontWeight: 600, borderBottom: activeTab === 'CATEGORIES' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'CATEGORIES' ? 'var(--primary)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FolderTree size={18} />
          <span>Catégories ({categoriesHook.categories.length})</span>
        </button>

        <button
          className={`tab-item ${activeTab === 'COMPOSITES' ? 'active' : ''}`}
          onClick={() => setActiveTab('COMPOSITES')}
          style={{ padding: '0.75rem 1.25rem', fontWeight: 600, borderBottom: activeTab === 'COMPOSITES' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'COMPOSITES' ? 'var(--primary)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <GitMerge size={18} />
          <span>Matières Composées</span>
        </button>

        <button
          className={`tab-item ${activeTab === 'LEVELS' ? 'active' : ''}`}
          onClick={() => setActiveTab('LEVELS')}
          style={{ padding: '0.75rem 1.25rem', fontWeight: 600, borderBottom: activeTab === 'LEVELS' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'LEVELS' ? 'var(--primary)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <GraduationCap size={18} />
          <span>Programme par Niveau</span>
        </button>
      </div>

      {/* ─── TAB 1 : MATIÈRES (CATALOGUE GÉNÉRAL) ───────────────────────────────── */}
      {activeTab === 'SUBJECTS' && (
        <div>
          {/* Barre de Filtres & Recherche */}
          <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>

              {/* Input Recherche */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Rechercher une matière..."
                  value={subjectsHook.filters.searchQuery || ''}
                  onChange={(e) => subjectsHook.setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.25rem', width: '100%' }}
                  aria-label="Rechercher une matière"
                />
              </div>

              {/* Filtre Catégorie */}
              <select
                className="form-select"
                value={subjectsHook.filters.categoryId || ''}
                onChange={(e) => subjectsHook.setFilters({ categoryId: e.target.value || undefined })}
                aria-label="Filtrer par catégorie"
              >
                <option value="">Toutes les catégories</option>
                {categoriesHook.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Filtre Type (Principale / Complémentaire / Préscolaire) */}
              <select
                className="form-select"
                value={typeFilter}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setTypeFilter(val);
                  if (val === 'MAIN') subjectsHook.setFilters({ categoryId: '11111111-1111-4111-a111-111111111111' });
                  else if (val === 'COMPLEMENTARY') subjectsHook.setFilters({ categoryId: '22222222-2222-4222-a222-222222222222' });
                  else if (val === 'PRESCHOOL') subjectsHook.setFilters({ categoryId: '33333333-3333-4333-a333-333333333333' });
                  else subjectsHook.setFilters({ categoryId: undefined });
                }}
                aria-label="Filtrer par type de matière"
              >
                <option value="ALL">Tous les domaines</option>
                <option value="MAIN">Matières Principales</option>
                <option value="COMPLEMENTARY">Matières Complémentaires</option>
                <option value="PRESCHOOL">Domaine Préscolaire</option>
              </select>

              {/* Statut Actif / Tout */}
              <select
                className="form-select"
                value={String(subjectsHook.filters.isActive)}
                onChange={(e) => subjectsHook.setFilters({ isActive: e.target.value === 'all' ? 'all' : e.target.value === 'true' })}
                aria-label="Filtrer par statut"
              >
                <option value="true">Actives uniquement</option>
                <option value="all">Toutes (inclut archivées)</option>
              </select>
            </div>
          </div>

          {/* Table / Grille des Matières */}
          {subjectsHook.loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <span className="spinner" style={{ width: 36, height: 36 }} />
              <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Chargement des matières...</p>
            </div>
          ) : subjectsHook.subjects.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.5 }} />
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Aucune matière trouvée</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Ajustez vos filtres ou créez une nouvelle matière.
              </p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={openCreateSubjectModal}>
                <Plus size={16} />
                <span>Créer une matière</span>
              </button>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Code & Nom</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Sigle</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Catégorie</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Propriétés</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Statut</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectsHook.subjects.map((subj) => (
                      <tr key={subj.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: subj.isActive ? 1 : 0.6 }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{subj.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{subj.code}</div>
                        </td>

                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className="badge badge-neutral">{subj.shortName || subj.code}</span>
                        </td>

                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className="badge badge-info">
                            {categoriesHook.categories.find((c) => c.id === subj.categoryId)?.name || 'Principale'}
                          </span>
                        </td>

                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {subj.isComposite && (
                              <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <GitMerge size={12} /> Composée
                              </span>
                            )}
                            {subj.isGraded ? (
                              <span className="badge badge-success">Notée</span>
                            ) : (
                              <span className="badge badge-neutral">Non notée</span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '0.75rem 1rem' }}>
                          {subj.isActive ? (
                            <span className="badge badge-success">Active</span>
                          ) : (
                            <span className="badge badge-warning">Archivée</span>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn-icon"
                              title="Modifier la matière"
                              onClick={() => openEditSubjectModal(subj)}
                              aria-label={`Modifier ${subj.name}`}
                            >
                              <Edit2 size={16} />
                            </button>

                            <button
                              className={`btn-icon ${subj.isActive ? 'text-danger' : 'text-success'}`}
                              title={subj.isActive ? 'Désactiver' : 'Restaurer'}
                              onClick={() => handleToggleArchiveSubject(subj)}
                              aria-label={subj.isActive ? `Archiver ${subj.name}` : `Restaurer ${subj.name}`}
                            >
                              {subj.isActive ? <Trash2 size={16} /> : <RotateCcw size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', background: 'var(--bg-app)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Affichage page {subjectsHook.page} sur {subjectsHook.totalPages} ({subjectsHook.totalCount} matières)
                </span>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={subjectsHook.page <= 1}
                    onClick={() => subjectsHook.setPage(subjectsHook.page - 1)}
                  >
                    Précédent
                  </button>

                  <button
                    className="btn btn-outline btn-sm"
                    disabled={subjectsHook.page >= subjectsHook.totalPages}
                    onClick={() => subjectsHook.setPage(subjectsHook.page + 1)}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2 : CATÉGORIES & DOMAINES ─────────────────────────────────────── */}
      {activeTab === 'CATEGORIES' && (
        <div>
          {categoriesHook.loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <span className="spinner" style={{ width: 36, height: 36 }} />
              <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Chargement des catégories...</p>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Ordre</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Code & Nom</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Description</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Statut</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriesHook.categories.map((cat) => (
                      <tr key={cat.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                          <span className="badge badge-neutral">{cat.sortOrder}</span>
                        </td>

                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600 }}>{cat.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{cat.code}</div>
                        </td>

                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                          {cat.description || '—'}
                        </td>

                        <td style={{ padding: '0.75rem 1rem' }}>
                          {cat.isActive ? (
                            <span className="badge badge-success">Active</span>
                          ) : (
                            <span className="badge badge-warning">Inactive</span>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn-icon"
                              title="Modifier la catégorie"
                              onClick={() => openEditCatModal(cat)}
                              aria-label={`Modifier ${cat.name}`}
                            >
                              <Edit2 size={16} />
                            </button>

                            <button
                              className="btn-icon text-danger"
                              title={cat.isActive ? 'Désactiver' : 'Restaurer'}
                              onClick={async () => {
                                if (cat.isActive) {
                                  const isConfirmed = await confirm({
                                    title: 'Désactiver la catégorie',
                                    message: `Désactiver la catégorie de matières "${cat.name}" ?`,
                                    confirmText: 'Oui, désactiver',
                                    cancelText: 'Annuler',
                                    variant: 'warning',
                                  });
                                  if (isConfirmed) categoriesHook.archiveCategory(cat.id);
                                } else {
                                  categoriesHook.restoreCategory(cat.id);
                                }
                              }}
                              aria-label={`Basculer statut ${cat.name}`}
                            >
                              {cat.isActive ? <Trash2 size={16} /> : <RotateCcw size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3 : MATIÈRES COMPOSÉES (SOUS-MATIÈRES) ────────────────────────── */}
      {activeTab === 'COMPOSITES' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

          {/* Sélecteur de Matière Parente */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GitMerge size={18} style={{ color: 'var(--primary)' }} />
              Sélectionner la Matière Parente
            </h3>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Matières Fusionnées / Composées</label>
              <select
                className="form-select"
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
              >
                {compositeSubjects.length === 0 ? (
                  <option value="b0200000-0000-4000-b000-000000000008">Étude du milieu (EDM)</option>
                ) : (
                  compositeSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))
                )}
              </select>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary)' }} />
                <span>
                  Une matière composée (ex: <strong>Étude du milieu</strong>) fusionne plusieurs sous-matières autonomes (ex: <em>Histoire</em>, <em>Géographie</em>, <em>Sciences</em>) lors des évaluations et bulletins.
                </span>
              </div>
            </div>
          </div>

          {/* Arborescence et Sous-Matières */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Composants de : <span style={{ color: 'var(--primary)' }}>{currentParentSubject?.name || 'Étude du milieu'}</span>
              </h3>

              <button className="btn btn-primary btn-sm" onClick={() => setShowAddComponentModal(true)}>
                <Plus size={14} />
                <span>Ajouter Composant</span>
              </button>
            </div>

            {/* Bannières d'erreurs métier */}
            {componentsHook.error && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>⚠️ {componentsHook.error}</span>
              </div>
            )}

            {componentsHook.loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <span className="spinner" style={{ width: 28, height: 28 }} />
              </div>
            ) : componentsHook.components.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Aucune sous-matière enregistrée pour cette matière composée.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {componentsHook.components.map((comp, idx) => {
                  const childSub = subjectsHook.subjects.find((s) => s.id === comp.childSubjectId);
                  return (
                    <div
                      key={comp.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.875rem 1rem',
                        background: 'var(--bg-app)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="badge badge-primary">{idx + 1}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{childSub?.name || `Sous-matière ${comp.childSubjectId.slice(0, 8)}`}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{childSub?.code || 'SUB'}</div>
                        </div>
                      </div>

                      <button
                        className="btn-icon text-danger"
                        title="Retirer la sous-matière"
                        onClick={() => handleRemoveComponent(comp.childSubjectId)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4 : PROGRAMME PAR NIVEAU (PS À CM2) ───────────────────────────── */}
      {activeTab === 'LEVELS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

          {/* Sélecteur de Niveau Scolaire (PS à CM2) */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={18} style={{ color: 'var(--primary)' }} />
              Sélectionner le Niveau Scolaire
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {levelsListHook.levels.map((lvl) => (
                <button
                  key={lvl.id}
                  className={`btn ${selectedLevelId === lvl.id ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSelectedLevelId(lvl.id)}
                  style={{ justifyContent: 'space-between', width: '100%', textAlign: 'left' }}
                >
                  <span>{lvl.name} ({lvl.code})</span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>Ordre {lvl.sortOrder}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Matières affectées au niveau sélectionné */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                  Programme officiel du Niveau
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Matières obligatoires et optionnelles du programme.
                </p>
              </div>

              <button className="btn btn-primary btn-sm" onClick={() => setShowAssignLevelModal(true)}>
                <Plus size={14} />
                <span>Affecter Matière</span>
              </button>
            </div>

            {levelSubjectsHook.loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <span className="spinner" style={{ width: 28, height: 28 }} />
              </div>
            ) : levelSubjectsHook.levelSubjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Aucune matière enregistrée pour ce niveau scolaire.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Matière</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Règle</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelSubjectsHook.levelSubjects.map((ls) => {
                      const subjObj = ls.subject || subjectsHook.subjects.find((s) => s.id === ls.subjectId);
                      return (
                        <tr key={ls.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 600 }}>{subjObj?.name || 'Matière'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subjObj?.code}</div>
                          </td>

                          <td style={{ padding: '0.75rem' }}>
                            {ls.isRequired ? (
                              <span className="badge badge-success">Obligatoire</span>
                            ) : (
                              <span className="badge badge-neutral">Optionnelle</span>
                            )}
                          </td>

                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            <button
                              className="btn-icon text-danger"
                              title="Retirer du niveau"
                              onClick={() => handleRemoveLevelSubject(ls.subjectId)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 1 : MATIÈRE (CRÉATION / ÉDITION) ────────────────────────────── */}
      {showSubjectModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', maxWidth: 500, width: '90%', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                {editingSubject ? 'Modifier la Matière' : 'Nouvelle Matière au Catalogue'}
              </h2>
              <button className="btn-icon" onClick={() => setShowSubjectModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveSubject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nom de la matière *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={subjectForm.name || ''}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="Ex: Mathématiques, Orthographe..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Sigle / Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={subjectForm.shortName || ''}
                    onChange={(e) => setSubjectForm({ ...subjectForm, shortName: e.target.value })}
                    placeholder="Ex: MATH, LECT"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Catégorie *</label>
                  <select
                    className="form-select"
                    value={subjectForm.categoryId || ''}
                    onChange={(e) => setSubjectForm({ ...subjectForm, categoryId: e.target.value })}
                  >
                    {categoriesHook.categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={subjectForm.isComposite || false}
                    onChange={(e) => setSubjectForm({ ...subjectForm, isComposite: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.875rem' }}>Matière composée (ex: EDM)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={subjectForm.isGraded ?? true}
                    onChange={(e) => setSubjectForm({ ...subjectForm, isGraded: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.875rem' }}>Matière notée</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowSubjectModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={subjectsHook.isCreating || subjectsHook.isUpdating}>
                  <Save size={16} />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2 : CATÉGORIE (CRÉATION / ÉDITION) ──────────────────────────── */}
      {showCatModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', maxWidth: 450, width: '90%', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                {editingCat ? 'Modifier la Catégorie' : 'Nouvelle Catégorie'}
              </h2>
              <button className="btn-icon" onClick={() => setShowCatModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveCat} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nom de la catégorie *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={catForm.name || ''}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={catForm.description || ''}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCatModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3 : AJOUT COMPOSANT MATIÈRE COMPOSÉE ─────────────────────── */}
      {showAddComponentModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', maxWidth: 450, width: '90%', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                Ajouter une Sous-matière
              </h2>
              <button className="btn-icon" onClick={() => setShowAddComponentModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleAddComponentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Sous-matière composante *</label>
                <select
                  className="form-select"
                  required
                  value={childSubjectIdToAdd}
                  onChange={(e) => setChildSubjectIdToAdd(e.target.value)}
                >
                  <option value="">-- Sélectionner une sous-matière --</option>
                  {candidateChildSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddComponentModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={componentsHook.isCreating}>
                  <Save size={16} />
                  <span>Ajouter au Composant</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4 : AFFECTATION MATIÈRE À UN NIVEAU ───────────────────────── */}
      {showAssignLevelModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', maxWidth: 450, width: '90%', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                Affecter une Matière au Niveau
              </h2>
              <button className="btn-icon" onClick={() => setShowAssignLevelModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleAssignLevelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Matière *</label>
                <select
                  className="form-select"
                  required
                  value={levelSubjectIdToAdd}
                  onChange={(e) => setLevelSubjectIdToAdd(e.target.value)}
                >
                  <option value="">-- Sélectionner la matière --</option>
                  {subjectsHook.subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={levelIsRequired}
                    onChange={(e) => setLevelIsRequired(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.875rem' }}>Matière obligatoire pour ce niveau</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAssignLevelModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={levelSubjectsHook.isCreating}>
                  <Save size={16} />
                  <span>Affecter au Niveau</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
