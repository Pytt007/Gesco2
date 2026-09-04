import React, { useEffect, useState } from 'react';
import { BookOpen, Users, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Building } from 'lucide-react';
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

export const ClassAssignmentStep: React.FC<Props> = ({ data, onChange, errors }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setLoadingClasses(true);
    getClassrooms({ academicYearId: data.schoolYear }).then((res) => {
      if (res.success && res.data) {
        setClassrooms(res.data);
        if (res.data.length > 0 && !data.classId) {
          const first = res.data[0];
          onChange({
            classId: first.id,
            className: first.name,
            levelId: first.levelId,
          });
        }
      }
      setLoadingClasses(false);
    });

    // Compter les élèves par classe
    listStudents({ schoolYear: data.schoolYear, pageSize: 500 }).then((res) => {
      if (res.data?.students) {
        const counts: Record<string, number> = {};
        res.data.students.forEach((s) => {
          counts[s.grade] = (counts[s.grade] || 0) + 1;
        });
        setClassCounts(counts);
      }
    });
  }, [data.schoolYear]);

  const selectedClassroom = classrooms.find((c) => c.id === data.classId);
  const currentCount = selectedClassroom ? (classCounts[selectedClassroom.name] || 0) : 0;
  const capacity = selectedClassroom?.capacity || 35;
  const remainingPlaces = Math.max(0, capacity - currentCount);
  const isFull = currentCount >= capacity;
  const fillPercentage = Math.min(100, Math.round((currentCount / capacity) * 100));

  const isUnassigned = !data.classId || data.className === 'Non affecté';

  const handleSelectClass = (cls: Classroom) => {
    if (data.classId === cls.id) {
      // Désélectionner si déjà cliqué
      onChange({
        classId: '',
        className: 'Non affecté',
        levelId: '',
      });
    } else {
      onChange({
        classId: cls.id,
        className: cls.name,
        levelId: cls.levelId,
      });
    }
  };

  const handleSelectUnassigned = () => {
    onChange({
      classId: '',
      className: 'Non affecté',
      levelId: '',
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
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Session Académique Active</span>
              <h5 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '0.9375rem' }}>Année Scolaire {data.schoolYear}</h5>
            </div>
          </div>
          <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>Affectation Optionnelle</span>
        </div>
      </div>

      {/* SELECTION CLASSE PAR CARTE / DROPDOWN */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Choisir la Classe d'Affectation (Optionnel)
          </label>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Vous pouvez passer cette étape et affecter l'élève plus tard
          </span>
        </div>

        {loadingClasses ? (
          <div className="p-4 text-center text-muted" style={{ fontSize: '0.875rem' }}>Chargement de la liste des classes...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {/* OPTION : SANS AFFECTATION IMMÉDIATE */}
            <div
              onClick={handleSelectUnassigned}
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                border: isUnassigned ? '2px solid #6366f1' : '1px dashed #cbd5e1',
                background: isUnassigned ? '#f5f3ff' : '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isUnassigned ? '0 4px 14px rgba(99,102,241,0.15)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: isUnassigned ? '#4f46e5' : '#475569' }}>
                  ⏳ Sans affectation
                </span>
                <span className="badge" style={{ background: isUnassigned ? '#ede9fe' : '#e2e8f0', color: isUnassigned ? '#6d28d9' : '#64748b', fontSize: '0.65rem' }}>
                  Optionnel
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                Inscrire l'élève maintenant et lui attribuer une classe ultérieurement.
              </p>
            </div>

            {/* CARTES DES CLASSES EXISTANTES */}
            {classrooms.map((cls) => {
              const count = classCounts[cls.name] || 0;
              const isSelected = cls.id === data.classId;
              const isClassFull = count >= cls.capacity;
              const percent = Math.min(100, Math.round((count / cls.capacity) * 100));

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
                    boxShadow: isSelected ? '0 4px 14px rgba(37,99,235,0.15)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                      {cls.name}
                    </span>
                    {isClassFull ? (
                      <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Complet</span>
                    ) : (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Disponible</span>
                    )}
                  </div>

                  {/* Jauge de remplissage */}
                  <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', margin: '8px 0' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: isClassFull ? '#ef4444' : percent > 85 ? '#f59e0b' : '#3b82f6', borderRadius: 3 }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    <span>Effectif: {count} / {cls.capacity}</span>
                    <span>{Math.max(0, cls.capacity - count)} place(s)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {errors.classId && <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'block', marginTop: 6 }}>{errors.classId}</span>}
      </div>

      {/* INFORMATION SI SANS CLASSE */}
      {isUnassigned && (
        <div className="card p-3" style={{ borderRadius: 14, border: '1px solid #e0e7ff', background: '#eef2ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={20} color="#6366f1" />
            <div style={{ fontSize: '0.8125rem', color: '#4338ca' }}>
              <strong>Inscription sans classe immédiate :</strong> L'élève sera enregistré sous le statut <em>« Non affecté »</em>. Vous pourrez à tout moment lui affecter une classe depuis la fiche élève ou la gestion des classes.
            </div>
          </div>
        </div>
      )}

      {/* APERÇU DE LA CAPACITE DE LA CLASSE SELECTIONNEE */}
      {selectedClassroom && (
        <div className="card p-4" style={{ borderRadius: 14, border: isFull ? '1px solid #fca5a5' : '1px solid #bfdbfe', background: isFull ? '#fff5f5' : '#f0f9ff' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {isFull ? <AlertTriangle size={24} color="#ef4444" /> : <CheckCircle2 size={24} color="#16a34a" />}
            <div style={{ flex: 1 }}>
              <h5 style={{ margin: 0, fontWeight: 800, color: isFull ? '#991b1b' : '#1e3a5f', fontSize: '0.9375rem' }}>
                Situation de la Classe : {selectedClassroom.name}
              </h5>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: isFull ? '#7f1d1d' : '#3b82f6' }}>
                {isFull
                  ? `La classe a atteint sa capacité maximale de ${capacity} élèves.`
                  : `Il reste ${remainingPlaces} place(s) disponible(s) sur ${capacity} places dans cette classe.`}
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
      )}

    </div>
  );
};
