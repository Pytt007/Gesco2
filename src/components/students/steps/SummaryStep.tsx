import React from 'react';
import { User, Users, CreditCard, BookOpen, CheckCircle2, ShieldCheck, FileText, AlertCircle } from 'lucide-react';
import { StudentInfoData } from './StudentInfoStep';
import { ParentsStepData } from './ParentsInfoStep';
import { FinancialConfigStepData } from './FinancialConfigStep';
import { ClassAssignmentStepData } from './ClassAssignmentStep';

interface Props {
  student: StudentInfoData;
  parents: ParentsStepData;
  payment: FinancialConfigStepData;
  assignment: ClassAssignmentStepData;
  isSubmitting: boolean;
  onValidate: () => void;
}

export const SummaryStep: React.FC<Props> = ({
  student,
  parents,
  payment,
  assignment,
  isSubmitting,
  onValidate,
}) => {
  const grossTotal = payment.registrationFee + payment.tuitionFee + payment.canteenFee + payment.transportFee + payment.otherFees;
  const discountAmount = payment.discountType === 'FIXED'
    ? payment.discountValue
    : Math.round((payment.tuitionFee * payment.discountValue) / 100);
  const netTotal = Math.max(0, grossTotal - discountAmount);
  const remainingBalance = Math.max(0, netTotal - payment.paidAmount);

  let payerName = 'Non spécifié';
  let payerPhone = '';
  if (parents.financialPayer === 'FATHER' && parents.father.lastName) {
    payerName = `${parents.father.lastName} ${parents.father.firstName} (Père)`;
    payerPhone = parents.father.phone;
  } else if (parents.financialPayer === 'MOTHER' && parents.mother.lastName) {
    payerName = `${parents.mother.lastName} ${parents.mother.firstName} (Mère)`;
    payerPhone = parents.mother.phone;
  } else if (parents.guardian.lastName) {
    payerName = `${parents.guardian.lastName} ${parents.guardian.firstName} (Tuteur)`;
    payerPhone = parents.guardian.phone;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* BANNIÈRE DE VALIDATION FINALE */}
      <div className="card p-3" style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#ffffff', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 size={24} color="#ffffff" />
            <div>
              <h5 style={{ margin: 0, fontWeight: 900, color: '#ffffff', fontSize: '1rem' }}>
                Récapitulatif & Validation Transactionnelle
              </h5>
              <span style={{ fontSize: '0.78125rem', color: '#bbf7d0' }}>
                Vérifiez l'ensemble des informations avant d'officialiser l'inscription dans GESCO
              </span>
            </div>
          </div>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', fontSize: '0.75rem' }}>
            Atomic Transaction
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* RECAP ÉLÈVE */}
        <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <h5 style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', fontWeight: 800, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} color="#2563eb" /> Identité de l'Élève
          </h5>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {student.photo ? <img src={student.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={24} color="#2563eb" />}
            </div>
            <div>
              <h6 style={{ margin: 0, fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a' }}>
                {student.lastName} {student.firstName}
              </h6>
              <span style={{ fontSize: '0.78125rem', color: '#64748b' }}>
                {student.gender} • Nés le {student.birthDate ? new Date(student.birthDate).toLocaleDateString('fr-FR') : '—'} ({student.birthPlace || '—'})
              </span>
            </div>
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6 }}>
            <div><strong>Adresse :</strong> {student.address || 'Non spécifiée'}</div>
            <div><strong>Nationalité :</strong> {student.nationality || 'Ivoirienne'}</div>
          </div>
        </div>

        {/* RECAP PARENTS */}
        <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <h5 style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', fontWeight: 800, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="#2563eb" /> Responsable Financier
          </h5>
          <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a', marginBottom: 4 }}>
              {payerName}
            </div>
            <div><strong>Téléphone :</strong> {payerPhone || 'Non spécifié'}</div>
            {parents.father.lastName && <div><strong>Père :</strong> {parents.father.lastName} {parents.father.firstName} ({parents.father.phone})</div>}
            {parents.mother.lastName && <div><strong>Mère :</strong> {parents.mother.lastName} {parents.mother.firstName} ({parents.mother.phone})</div>}
          </div>
        </div>

        {/* RECAP AFFECTATION CLASSE */}
        <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <h5 style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', fontWeight: 800, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={16} color="#2563eb" /> Classe & Session
          </h5>
          <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6 }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: assignment.className && assignment.className !== 'Non affecté' ? '#2563eb' : '#6366f1', marginBottom: 4 }}>
              Classe : {assignment.className && assignment.className !== 'Non affecté' ? assignment.className : 'Non affecté (Affectation ultérieure)'}
            </div>
            <div><strong>Année Scolaire :</strong> {assignment.schoolYear}</div>
            <div><strong>Statut :</strong> <span className="badge badge-success">Inscription Officielle Active</span></div>
          </div>
        </div>

        {/* RECAP PAIEMENT */}
        <div className="card p-4" style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <h5 style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', fontWeight: 800, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={16} color="#16a34a" /> Versement & Reçu
          </h5>
          <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6 }}>
            <div><strong>Total Frais Net :</strong> {netTotal.toLocaleString('fr-FR')} FCFA</div>
            <div style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.9375rem', marginTop: 2 }}>
              Versement Effectué : {payment.paidAmount.toLocaleString('fr-FR')} FCFA ({payment.paymentMode})
            </div>
            <div style={{ color: remainingBalance === 0 ? '#16a34a' : '#dc2626', fontWeight: 700, marginTop: 2 }}>
              Solde Restant : {remainingBalance.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
        </div>

      </div>

      {/* BOUTON SOUMISSION FINALE */}
      <div style={{ marginTop: 12, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onValidate}
          className="btn btn-primary"
          style={{
            padding: '12px 28px', borderRadius: 12, fontWeight: 900, fontSize: '0.9375rem',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)', cursor: 'pointer',
          }}
        >
          {isSubmitting ? 'Validation transactionnelle en cours...' : '⚡ Finaliser l\'inscription'}
        </button>
      </div>

    </div>
  );
};
