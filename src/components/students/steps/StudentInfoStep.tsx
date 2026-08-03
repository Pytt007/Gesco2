import React from 'react';
import { User, Calendar, MapPin, Globe, AlertCircle, FileText, Image, Shield } from 'lucide-react';

export interface StudentInfoData {
  firstName: string;
  lastName: string;
  gender: 'Masculin' | 'Féminin';
  birthDate: string;
  birthPlace: string;
  nationality: string;
  photo: string;
  address: string;
  specialSituation: string;
  documents: string[];
}

interface Props {
  data: StudentInfoData;
  onChange: (updates: Partial<StudentInfoData>) => void;
  errors: Record<string, string>;
}

export const AVATAR_BOY = 'https://api.dicebear.com/7.x/adventurer/svg?seed=girl&skinColor=8d5524,6c4524,4c3019&hairColor=000000,2c1b18,1a1a1a&backgroundColor=ffffff';
export const AVATAR_GIRL = 'https://api.dicebear.com/7.x/adventurer/svg?seed=boy&skinColor=8d5524,6c4524,4c3019&hairColor=000000,2c1b18,1a1a1a&backgroundColor=ffffff';

export const StudentInfoStep: React.FC<Props> = ({ data, onChange, errors }) => {
  const isCustomUpload = data.photo && (data.photo.startsWith('data:') || (data.photo.startsWith('http') && !data.photo.includes('api.dicebear.com')));
  const currentDefaultAvatar = data.gender === 'Féminin' ? AVATAR_GIRL : AVATAR_BOY;
  const displayPhoto = data.photo || currentDefaultAvatar;

  const handleGenderChange = (gender: 'Masculin' | 'Féminin') => {
    // Si aucune photo personnalisée n'est chargée, changer l'avatar automatiquement
    if (!isCustomUpload) {
      const avatar = gender === 'Féminin' ? AVATAR_GIRL : AVATAR_BOY;
      onChange({ gender, photo: avatar });
    } else {
      onChange({ gender });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        onChange({ photo: ev.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetPhoto = () => {
    onChange({ photo: currentDefaultAvatar });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* SECTION PHOTO / AVATAR AVEC FOND BLANC ET UPLOAD */}
      <div className="card p-4" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 12 }}>
          Photo / Avatar de l'Élève (Fond Blanc Stricte)
        </label>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          {/* APERÇU SUR FOND BLANC */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: '#ffffff',
              border: '3px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
            }}>
              <img
                src={displayPhoto}
                alt="Avatar Élève"
                style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#ffffff' }}
              />
            </div>
            {isCustomUpload && (
              <button
                type="button"
                title="Supprimer la photo uploadée et réinitialiser"
                onClick={handleResetPhoto}
                style={{
                  position: 'absolute', top: 0, right: 0, width: 22, height: 22,
                  borderRadius: '50%', background: '#ef4444', border: 'none', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  fontSize: 12, fontWeight: 900
                }}
              >
                ×
              </button>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 240 }}>
            {/* TOGGLE GARÇON / FILLE */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => handleGenderChange('Masculin')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: data.gender === 'Masculin' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: data.gender === 'Masculin' ? '#eff6ff' : '#ffffff',
                  color: data.gender === 'Masculin' ? '#1d4ed8' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                👦 Garçon
              </button>

              <button
                type="button"
                onClick={() => handleGenderChange('Féminin')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: data.gender === 'Féminin' ? '2px solid #ec4899' : '1px solid #cbd5e1',
                  background: data.gender === 'Féminin' ? '#fdf2f8' : '#ffffff',
                  color: data.gender === 'Féminin' ? '#be185d' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                👧 Fille
              </button>
            </div>

            {/* UPLOAD FICHIER EN LIGNE (PNG, JPG, SVG) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1.5px dashed #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  color: '#475569',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
              >
                <Image size={16} color="#2563eb" />
                {isCustomUpload ? '📷 Modifier la photo uploadée...' : '📂 Uploader une vraie photo / image (PNG, JPG, SVG)'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            
            {isCustomUpload ? (
              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                ✓ Photo personnalisée chargée avec succès
              </span>
            ) : (
              <span style={{ fontSize: '0.71875rem', color: '#64748b' }}>
                Si aucune photo n'est uploadée, l'avatar automatique (fond blanc) sera attribué.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form Grid : Nom, Prénom, Sexe */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div>
          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
            Nom de famille <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            className={`form-input ${errors.lastName ? 'border-danger' : ''}`}
            placeholder="Ex: KOUASSI"
            value={data.lastName}
            onChange={(e) => onChange({ lastName: e.target.value.toUpperCase() })}
          />
          {errors.lastName && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2, display: 'block' }}>{errors.lastName}</span>}
        </div>

        <div>
          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
            Prénom(s) <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            className={`form-input ${errors.firstName ? 'border-danger' : ''}`}
            placeholder="Ex: Jean-Philippe"
            value={data.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
          />
          {errors.firstName && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2, display: 'block' }}>{errors.firstName}</span>}
        </div>

        <div>
          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
            Sexe / Genre <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            className="form-select"
            value={data.gender}
            onChange={(e) => handleGenderChange(e.target.value as 'Masculin' | 'Féminin')}
          >
            <option value="Masculin">Masculin (Garçon)</option>
            <option value="Féminin">Féminin (Fille)</option>
          </select>
        </div>
      </div>

      {/* Date & Lieu de naissance, Nationalité */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div>
          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
            Date de Naissance <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="date"
            className={`form-input ${errors.birthDate ? 'border-danger' : ''}`}
            value={data.birthDate}
            onChange={(e) => onChange({ birthDate: e.target.value })}
          />
          {errors.birthDate && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2, display: 'block' }}>{errors.birthDate}</span>}
        </div>

        <div>
          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
            Lieu de Naissance <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            className={`form-input ${errors.birthPlace ? 'border-danger' : ''}`}
            placeholder="Ex: Abidjan Cocody"
            value={data.birthPlace}
            onChange={(e) => onChange({ birthPlace: e.target.value })}
          />
          {errors.birthPlace && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2, display: 'block' }}>{errors.birthPlace}</span>}
        </div>

        <div>
          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
            Nationalité
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: Ivoirienne"
            value={data.nationality}
            onChange={(e) => onChange({ nationality: e.target.value })}
          />
        </div>
      </div>

      {/* Adresse Résidence & Situation Particulière */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
            Adresse de Résidence Habituelle <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            className={`form-input ${errors.address ? 'border-danger' : ''}`}
            rows={2}
            placeholder="Quartier, Rue, Commune, Ville..."
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
          {errors.address && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2, display: 'block' }}>{errors.address}</span>}
        </div>

        <div>
          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
            Situation Particulière ou Médicale (Optionnel)
          </label>
          <textarea
            className="form-input"
            rows={2}
            placeholder="Allergies, traitement médical, aménagements particuliers..."
            value={data.specialSituation}
            onChange={(e) => onChange({ specialSituation: e.target.value })}
          />
        </div>
      </div>

    </div>
  );
};
