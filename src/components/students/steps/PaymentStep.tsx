import React, { useEffect } from 'react';
import { CreditCard, DollarSign, Calculator, FileCheck, ShieldAlert, Award, ArrowRight } from 'lucide-react';
import { tuitionFeesService } from '../../../services/finance/tuitionFeesService';
import { PaymentMode } from '../../../services/finance/types';

export interface PaymentStepData {
  registrationFee: number;
  tuitionFee: number;
  canteenFee: number;
  transportFee: number;
  otherFees: number;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  paidAmount: number;
  paymentMode: PaymentMode;
  paymentReference: string;
  remarks: string;
}

interface Props {
  data: PaymentStepData;
  onChange: (updates: Partial<PaymentStepData>) => void;
  levelCode?: string;
  schoolYear?: string;
  errors: Record<string, string>;
}

export const PaymentStep: React.FC<Props> = ({ data, onChange, levelCode = 'CP1', schoolYear = '2024-2025', errors }) => {
  // Chargement automatique de la grille tarifaire configurée
  useEffect(() => {
    tuitionFeesService.getSchedulesByYear(schoolYear).then((schedules) => {
      const match = schedules.find((s) => s.levelCode === levelCode);
      if (match) {
        onChange({
          registrationFee: match.registrationFee,
          tuitionFee: match.tuitionFee,
        });
      }
    });
  }, [levelCode, schoolYear]);

  // Calculs automatiques
  const grossTotal = data.registrationFee + data.tuitionFee + data.canteenFee + data.transportFee + data.otherFees;
  const discountAmount = data.discountType === 'FIXED'
    ? data.discountValue
    : Math.round((data.tuitionFee * data.discountValue) / 100);
  
  const netTotal = Math.max(0, grossTotal - discountAmount);
  const remainingBalance = Math.max(0, netTotal - data.paidAmount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* CARTE RECAPITULATIF FINANCIER DYNAMIQUE */}
      <div className="card p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', borderRadius: 16, border: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total Annuel Frais</span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.375rem', fontWeight: 900, color: '#ffffff' }}>
              {netTotal.toLocaleString('fr-FR')} FCFA
            </h3>
            {discountAmount > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>Remise déduite: -{discountAmount.toLocaleString('fr-FR')} FCFA</span>
            )}
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Montant Versé (Ce jour)</span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.375rem', fontWeight: 900, color: '#38bdf8' }}>
              {data.paidAmount.toLocaleString('fr-FR')} FCFA
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Règlement immédiat</span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Reste à Payer</span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.375rem', fontWeight: 900, color: remainingBalance === 0 ? '#4ade80' : '#f87171' }}>
              {remainingBalance.toLocaleString('fr-FR')} FCFA
            </h3>
            <span style={{ fontSize: '0.75rem', color: remainingBalance === 0 ? '#4ade80' : '#fca5a5' }}>
              {remainingBalance === 0 ? '✓ Intégralement réglé' : 'Échéances à venir'}
            </span>
          </div>
        </div>
      </div>

      {/* DÉTAIL DES FRAIS CONFIGURÉS */}
      <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <h5 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={18} color="#2563eb" /> Tarification Officielle ({levelCode})
        </h5>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Droit d'Inscription</label>
            <input
              type="number" className="form-input" value={data.registrationFee}
              onChange={(e) => onChange({ registrationFee: Math.max(0, Number(e.target.value)) })}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Frais de Scolarité</label>
            <input
              type="number" className="form-input" value={data.tuitionFee}
              onChange={(e) => onChange({ tuitionFee: Math.max(0, Number(e.target.value)) })}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Option Cantine (Trimester)</label>
            <input
              type="number" className="form-input" value={data.canteenFee}
              onChange={(e) => onChange({ canteenFee: Math.max(0, Number(e.target.value)) })}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Option Transport (Trimestre)</label>
            <input
              type="number" className="form-input" value={data.transportFee}
              onChange={(e) => onChange({ transportFee: Math.max(0, Number(e.target.value)) })}
            />
          </div>
        </div>
      </div>

      {/* REMISE & SAISIE DU PAIEMENT ENCAISSÉ */}
      <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <h5 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={18} color="#16a34a" /> Enregistrement du Versement Initial <span style={{ color: '#ef4444' }}>*</span>
        </h5>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Type de Remise / Bourse</label>
            <select
              className="form-select" value={data.discountType}
              onChange={(e) => onChange({ discountType: e.target.value as 'FIXED' | 'PERCENTAGE' })}
            >
              <option value="FIXED">Remise Fixe (FCFA)</option>
              <option value="PERCENTAGE">Pourcentage (%)</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Valeur de la Remise</label>
            <input
              type="number" className="form-input" value={data.discountValue}
              onChange={(e) => onChange({ discountValue: Math.max(0, Number(e.target.value)) })}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 700, color: '#16a34a' }}>
              Montant Encaisse Ce Jour <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="number"
              className={`form-input ${errors.paidAmount ? 'border-danger' : ''}`}
              style={{ fontWeight: 800, fontSize: '1rem', color: '#16a34a' }}
              placeholder="Ex: 85000"
              value={data.paidAmount || ''}
              onChange={(e) => onChange({ paidAmount: Math.max(0, Number(e.target.value)) })}
            />
            {errors.paidAmount && <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'block', marginTop: 2 }}>{errors.paidAmount}</span>}
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Mode de Règlement <span style={{ color: '#ef4444' }}>*</span></label>
            <select
              className="form-select" value={data.paymentMode}
              onChange={(e) => onChange({ paymentMode: e.target.value as PaymentMode })}
            >
              <option value="CASH">Espèces</option>
              <option value="ORANGE_MONEY">Orange Money</option>
              <option value="MTN_MONEY">MTN Money</option>
              <option value="WAVE">Wave</option>
              <option value="TRANSFER">Virement Bancaire</option>
              <option value="CHECK">Chèque</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="form-label" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>Référence Transaction / N° Chèque (Optionnel)</label>
          <input
            type="text" className="form-input" placeholder="Ex: TX-99882200 ou Chèque N° 004928"
            value={data.paymentReference} onChange={(e) => onChange({ paymentReference: e.target.value })}
          />
        </div>
      </div>

    </div>
  );
};
