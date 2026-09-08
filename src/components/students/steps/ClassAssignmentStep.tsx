import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, Users, AlertTriangle, CheckCircle2, Building, Search, Sparkles, Check, School, Filter, X } from 'lucide-react';
import { getClassrooms, Classroom } from '../../../services/academic/classroomsService';
import { listStudents } from '../../../services/students/studentsService';

export interface ClassAssignmentStepData {
  schoolYear: string;
  levelId: string;
  classId: string;
  className: string;
  allowCapacityOverflow: boolean;
}

interface Props {
  data: ClassAssignmentStepData;
  onChange: (updates: Partial<ClassAssignmentStepData>) => void;
  errors: Record<string, string>;
}

// Fonction de correspondance intelligente entre le niveau choisi en étape 3 et la classe
function matchesLevel(cls: Classroom, targetLevelId: string): boolean {
  if (!targetLevelId) return false;
  const cleanTarget = targetLevelId.toLowerCase().replace(/^lvl-/, '').replace(/^level-/, '').trim();
  const cleanClsLevel = (cls.levelId || '').toLowerCase().replace(/^lvl-/, '').replace(/^level-/, '').trim();
  const cleanName = (cls.name || '').toLowerCase().trim();

  if (cls.levelId && cls.levelId.toLowerCase() === targetLevelId.toLowerCase()) return true;
  if (cleanClsLevel && cleanClsLevel === cleanTarget) return true;

  if (cleanTarget === 'garderie' && cleanName.includes('garderie')) return true;
  if (cleanTarget === 'ps' && (cleanName.includes('pte') || cleanName.includes('petite') || cleanName.includes('ps'))) return true;
  if (cleanTarget === 'ms' && (cleanName.includes('moy') || cleanName.includes('ms'))) return true;
  if (cleanTarget === 'gs' && (cleanName.includes('grd') || cleanName.includes('grande') || cleanName.includes('gs'))) return true;
  if (cleanTarget.length >= 3 && cleanName.includes(cleanTarget)) return true;

  return false;
}

export const ClassAssignmentStep: React.FC<Props> = ({ data, onChange, errors }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'recommended' | 'all' | 'maternelle' | 'primaire'>('recommended');

  // Chargement des classes
  useEffect(() => {
    setLoadingClasses(true);
    getClassrooms({ academicYearId: data.schoolYear }).then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        const loadedClasses = res.data;
        setClassrooms(loadedClasses);

        // Si aucune classe n'est sélectionnée pour le moment, présélectionner intelligemment
        if (!data.classId) {
          const matched = loadedClasses.find((c) => matchesLevel(c, data.levelId));
          const toSelect = matched || loadedClasses[0];
          if (toSelect) {
            onChange({
              classId: toSelect.id,
              className: toSelect.name,
              levelId: toSelect.levelId || data.levelId,
            });
          }
        }
      } else {
        // En cas d'absence de résultat avec filtre strict, recharger sans restriction
        getClassrooms({}).then((allRes) => {
          if (allRes.success && allRes.data) {
            setClassrooms(allRes.data);
            if (!data.classId && allRes.data.length > 0) {
              const matched = allRes.data.find((c) => matchesLevel(c, data.levelId));
              const toSelect = matched || allRes.data[0];
              if (toSelect) {
                onChange({
                  classId: toSelect.id,
                  className: toSelect.name,
                  levelId: toSelect.levelId || data.levelId,
                });
              }
            }
          }
        });
      }
      setLoadingClasses(false);
    });

    // Compter les effectifs réels par classe
    listStudents({ schoolYear: data.schoolYear, pageSize: 500 }).then((res) => {
      if (res.data?.students) {
        const counts: Record<string, number> = {};
        res.data.students.forEach((s) => {
          counts[s.grade] = (counts[s.grade] || 0) + 1;
        });
        setClassCounts(counts);
      }
    });
  }, [data.schoolYear, data.levelId]);

  // Classes recommandées pour le niveau de l'élève
  const recommendedClasses = useMemo(() => {
    return classrooms.filter((c) => matchesLevel(c, data.levelId));
  }, [classrooms, data.levelId]);

  // Ajustement du filtre par défaut si aucune classe recommandée n'existe
  useEffect(() => {
    if (!loadingClasses && recommendedClasses.length === 0 && filterMode === 'recommended') {
      setFilterMode('all');
    }
  }, [loadingClasses, recommendedClasses.length, filterMode]);

  // Filtrage selon onglet et recherche textuelle
  const displayedClassrooms = useMemo(() => {
    let list = classrooms;

    if (filterMode === 'recommended' && recommendedClasses.length > 0) {
      list = recommendedClasses;
    } else if (filterMode === 'maternelle') {
      list = classrooms.filter((c) => {
        const n = (c.name + ' ' + (c.levelId || '')).toLowerCase();
        return n.includes('section') || n.includes('garderie') || n.includes('ps') || n.includes('ms') || n.includes('gs');
      });
    } else if (filterMode === 'primaire') {
      list = classrooms.filter((c) => {
        const n = (c.name + ' ' + (c.levelId || '')).toLowerCase();
        return n.includes('cp') || n.includes('ce') || n.includes('cm');
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.roomName && c.roomName.toLowerCase().includes(q)));
    }

    return list;
  }, [classrooms, recommendedClasses, filterMode, searchQuery]);

  const selectedClassroom = classrooms.find((c) => c.id === data.classId);
  const currentCount = selectedClassroom ? (classCounts[selectedClassroom.name] || 0) : 0;
  const capacity = selectedClassroom?.capacity || 35;
  const remainingPlaces = Math.max(0, capacity - currentCount);
  const isFull = currentCount >= capacity;

  const handleSelectClass = (cls: Classroom) => {
    onChange({
      classId: cls.id,
      className: cls.name,
      levelId: cls.levelId || data.levelId,
    });
  };

  const handleUnassign = () => {
    onChange({
      classId: '',
      className: '',
      allowCapacityOverflow: false,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* SÉLECTION ANNÉE SCOLAIRE */}
      <div className="card p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building size={20} color="#2563eb" />
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Session Académique Active
              </span>
              <h5 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '0.9375rem' }}>
                Année Scolaire {data.schoolYear}
              </h5>
            </div>
          </div>
          <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
            Affectation Officielle
          </span>
        </div>
      </div>

      {/* BARRE D'OUTILS ET FILTRES DE SÉLECTION */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'block' }}>
              Choisir la Classe d'Affectation (Optionnel)
            </label>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Sélectionnez la classe d'accueil pour cet élève. Vous pouvez aussi différer cette affectation.
            </span>
          </div>

          {/* Bouton pour ne pas affecter immédiatement */}
          <button
            type="button"
            onClick={handleUnassign}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: !data.classId ? '2px solid #64748b' : '1px solid #cbd5e1',
              background: !data.classId ? '#f1f5f9' : '#ffffff',
              color: !data.classId ? '#0f172a' : '#64748b',
              transition: 'all 0.2s',
            }}
          >
            {!data.classId ? '✓ Sans affectation immédiate' : 'Laisser non assigné'}
          </button>
        </div>

        {/* ONGLETS & RECHERCHE */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {recommendedClasses.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterMode('recommended')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: '0.78125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: filterMode === 'recommended' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: filterMode === 'recommended' ? '#eff6ff' : '#ffffff',
                  color: filterMode === 'recommended' ? '#1d4ed8' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Sparkles size={14} color={filterMode === 'recommended' ? '#2563eb' : '#64748b'} />
                Recommandées ({recommendedClasses.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.78125rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterMode === 'all' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: filterMode === 'all' ? '#eff6ff' : '#ffffff',
                color: filterMode === 'all' ? '#1d4ed8' : '#475569',
              }}
            >
              Toutes les classes ({classrooms.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('maternelle')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.78125rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterMode === 'maternelle' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: filterMode === 'maternelle' ? '#eff6ff' : '#ffffff',
                color: filterMode === 'maternelle' ? '#1d4ed8' : '#475569',
              }}
            >
              Maternelle
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('primaire')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.78125rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterMode === 'primaire' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: filterMode === 'primaire' ? '#eff6ff' : '#ffffff',
                color: filterMode === 'primaire' ? '#1d4ed8' : '#475569',
              }}
            >
              Primaire
            </button>
          </div>

          {/* Champ recherche */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher classe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 28px 6px 30px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: '0.78125rem',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* GRILLE DES CLASSES */}
        {loadingClasses ? (
          <div className="p-4 text-center text-muted" style={{ fontSize: '0.875rem' }}>
            <div className="spinner-border spinner-border-sm text-primary mb-2" role="status" />
            <div>Chargement de la liste des classes en cours...</div>
          </div>
        ) : displayedClassrooms.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 14, border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              Aucune classe ne correspond au filtre actif.
            </p>
            <button
              type="button"
              onClick={() => { setFilterMode('all'); setSearchQuery(''); }}
              style={{ marginTop: 8, background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}
            >
              Afficher toutes les classes ({classrooms.length})
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
            {displayedClassrooms.map((cls) => {
              const count = classCounts[cls.name] || 0;
              const isSelected = cls.id === data.classId;
              const clsCapacity = cls.capacity || 35;
              const isClassFull = count >= clsCapacity;
              const percent = Math.min(100, Math.round((count / clsCapacity) * 100));
              const isRecommended = matchesLevel(cls, data.levelId);

              return (
                <div
                  key={cls.id}
                  onClick={() => handleSelectClass(cls)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 14px rgba(37,99,235,0.18)' : '0 1px 3px rgba(0,0,0,0.05)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                          {cls.name}
                        </span>
                        {isRecommended && (
                          <span
                            title="Niveau recommandé pour l'élève"
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 800,
                              background: '#fef3c7',
                              color: '#b45309',
                              padding: '1px 6px',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            ★ Recommandé
                          </span>
                        )}
                      </div>
                      {cls.roomName && (
                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Salle : {cls.roomName}</div>
                      )}
                    </div>

                    {isClassFull ? (
                      <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 6 }}>Complet</span>
                    ) : (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 6 }}>Disponible</span>
                    )}
                  </div>

                  {/* Jauge de remplissage */}
                  <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', margin: '10px 0 6px' }}>
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        background: isClassFull ? '#ef4444' : percent > 85 ? '#f59e0b' : '#3b82f6',
                        borderRadius: 3,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    <span>Effectif : {count} / {clsCapacity}</span>
                    <span>{Math.max(0, clsCapacity - count)} place(s)</span>
                  </div>

                  {/* Indicateur de sélection */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        background: '#2563eb',
                        color: '#ffffff',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(37,99,235,0.4)',
                      }}
                    >
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {errors.classId && <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'block', marginTop: 6 }}>{errors.classId}</span>}
      </div>

      {/* APERÇU DE LA SITUATION DE LA CLASSE SÉLECTIONNÉE */}
      {selectedClassroom ? (
        <div className="card p-4" style={{ borderRadius: 14, border: isFull ? '1px solid #fca5a5' : '1px solid #bfdbfe', background: isFull ? '#fff5f5' : '#f0f9ff' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {isFull ? <AlertTriangle size={24} color="#ef4444" /> : <CheckCircle2 size={24} color="#16a34a" />}
            <div style={{ flex: 1 }}>
              <h5 style={{ margin: 0, fontWeight: 800, color: isFull ? '#991b1b' : '#1e3a5f', fontSize: '0.9375rem' }}>
                Classe sélectionnée : {selectedClassroom.name}
              </h5>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: isFull ? '#7f1d1d' : '#1e40af' }}>
                {isFull
                  ? `La classe a atteint sa capacité maximale de ${capacity} élèves.`
                  : `Il reste ${remainingPlaces} place(s) disponible(s) sur ${capacity} places autorisées.`}
              </p>

              {isFull && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="chk-overflow"
                    checked={data.allowCapacityOverflow}
                    onChange={(e) => onChange({ allowCapacityOverflow: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="chk-overflow" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#991b1b', cursor: 'pointer' }}>
                    Autoriser exceptionnellement le dépassement de capacité pour cet élève (Dérogation Admin)
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-3" style={{ borderRadius: 14, border: '1px dashed #cbd5e1', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <School size={20} color="#64748b" />
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Aucune classe sélectionnée pour le moment. L'élève pourra être affecté ultérieurement depuis le module Scolarité.
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
