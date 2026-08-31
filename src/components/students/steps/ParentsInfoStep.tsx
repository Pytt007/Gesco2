import React from 'react';
import { Users, Phone, Mail, Briefcase, ShieldCheck, HeartPulse, User } from 'lucide-react';

export interface ParentDetailData {
  firstName: string;
  lastName: string;
  profession: string;
  phone: string;
  email: string;
  address: string;
}

export interface ParentsStepData {
  father: ParentDetailData;
  mother: ParentDetailData;
  guardian: ParentDetailData & { relationshipType: string };
  emergencyContact: { name: string; phone: string; relationship: string };
  financialPayer: 'FATHER' | 'MOTHER' | 'GUARDIAN';
}

interface Props {
  data: ParentsStepData;
  onChange: (updates: Partial<ParentsStepData>) => void;
  errors: Record<string, string>;
}

export const ParentsInfoStep: React.FC<Props> = ({ data, onChange, errors }) => {
  const updateFather = (fields: Partial<ParentDetailData>) => {
    onChange({ father: { ...data.father, ...fields } });
  };

  const updateMother = (fields: Partial<ParentDetailData>) => {
    onChange({ mother: { ...data.mother, ...fields } });
  };

  const updateGuardian = (fields: Partial<ParentDetailData & { relationshipType: string }>) => {
    onChange({ guardian: { ...data.guardian, ...fields } });
  };

  const updateEmergency = (fields: Partial<ParentsStepData['emergencyContact']>) => {
    onChange({ emergencyContact: { ...data.emergencyContact, ...fields } });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* BLOC RESPONSABLE FINANCIER */}
      <div className="card p-3" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={22} color="#2563eb" />
            <div>
              <h5 style={{ margin: 0, fontWeight: 800, color: '#1e3a5f', fontSize: '0.9375rem' }}>
                Désignation du Responsable Financier
              </h5>
              <span style={{ fontSize: '0.78125rem', color: '#3b82f6' }}>
                Personne recevant les factures et reçus de scolarité
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`btn btn-sm ${data.financialPayer === 'FATHER' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => onChange({ financialPayer: 'FATHER' })}
              style={{ borderRadius: 8, fontWeight: 700 }}
            >
              👨 Père
            </button>
            <button
              type="button"
              className={`btn btn-sm ${data.financialPayer === 'MOTHER' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => onChange({ financialPayer: 'MOTHER' })}
              style={{ borderRadius: 8, fontWeight: 700 }}
            >
              👩 Mère
            </button>
            <button
              type="button"
              className={`btn btn-sm ${data.financialPayer === 'GUARDIAN' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => onChange({ financialPayer: 'GUARDIAN' })}
              style={{ borderRadius: 8, fontWeight: 700 }}
            >
              👤 Tuteur
            </button>
          </div>
        </div>
      </div>

      {/* SECTION PÈRE */}
      <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <h5 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>👨</span> Informations du Père {data.financialPayer === 'FATHER' && <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>Payeur Principal</span>}
        </h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Nom de famille</label>
            <input
              type="text" className="form-input" placeholder="Ex: KOUASSI"
              value={data.father.lastName} onChange={(e) => updateFather({ lastName: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Prénom(s)</label>
            <input
              type="text" className="form-input" placeholder="Ex: Marc"
              value={data.father.firstName} onChange={(e) => updateFather({ firstName: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Téléphone Principal</label>
            <input
              type="tel" className={`form-input ${errors.fatherPhone ? 'border-danger' : ''}`} placeholder="Ex: 0708091011"
              value={data.father.phone} onChange={(e) => updateFather({ phone: e.target.value })}
            />
            {errors.fatherPhone && <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'block', marginTop: 2 }}>{errors.fatherPhone}</span>}
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Profession</label>
            <input
              type="text" className="form-input" placeholder="Ex: Ingénieur BTP"
              value={data.father.profession} onChange={(e) => updateFather({ profession: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* SECTION MÈRE */}
      <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <h5 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>👩</span> Informations de la Mère {data.financialPayer === 'MOTHER' && <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>Payeur Principal</span>}
        </h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Nom de jeune fille / Nom</label>
            <input
              type="text" className="form-input" placeholder="Ex: YA"
              value={data.mother.lastName} onChange={(e) => updateMother({ lastName: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Prénom(s)</label>
            <input
              type="text" className="form-input" placeholder="Ex: Marie"
              value={data.mother.firstName} onChange={(e) => updateMother({ firstName: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Téléphone Principal</label>
            <input
              type="tel" className={`form-input ${errors.motherPhone ? 'border-danger' : ''}`} placeholder="Ex: 0506070809"
              value={data.mother.phone} onChange={(e) => updateMother({ phone: e.target.value })}
            />
            {errors.motherPhone && <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'block', marginTop: 2 }}>{errors.motherPhone}</span>}
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Profession</label>
            <input
              type="text" className="form-input" placeholder="Ex: Commerçante"
              value={data.mother.profession} onChange={(e) => updateMother({ profession: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* SECTION TUTEUR (OPTIONNEL) */}
      <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#fafafa' }}>
        <h5 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>👤</span> Tuteur Légal / Autre Responsable (Optionnel) {data.financialPayer === 'GUARDIAN' && <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>Payeur Principal</span>}
        </h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Lien de parenté</label>
            <input
              type="text" className="form-input" placeholder="Ex: Oncle, Grand-Mère..."
              value={data.guardian.relationshipType} onChange={(e) => updateGuardian({ relationshipType: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Nom & Prénoms Tuteur</label>
            <input
              type="text" className="form-input" placeholder="Ex: KOUADIO Brou"
              value={data.guardian.lastName} onChange={(e) => updateGuardian({ lastName: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Téléphone Tuteur {data.financialPayer === 'GUARDIAN' && <span style={{ color: '#ef4444' }}>*</span>}</label>
            <input
              type="tel" className={`form-input ${errors.guardianPhone ? 'border-danger' : ''}`} placeholder="Ex: 0102030405"
              value={data.guardian.phone} onChange={(e) => updateGuardian({ phone: e.target.value })}
            />
            {errors.guardianPhone && <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'block', marginTop: 2 }}>{errors.guardianPhone}</span>}
          </div>
        </div>
      </div>

    </div>
  );
};
