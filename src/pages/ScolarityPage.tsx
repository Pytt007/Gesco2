import React, { useState } from 'react';
import { useSchoolYear } from '../context/SchoolYearContext';
import { TuitionFeesConfigView } from '../components/finance/TuitionFeesConfigView';
import { FinancialEnrollmentView } from '../components/finance/FinancialEnrollmentView';
import { TuitionPaymentView } from '../components/finance/TuitionPaymentView';
import { FinancialTrackingView } from '../components/finance/FinancialTrackingView';

export default function ScolarityPage() {
  const { schoolYear } = useSchoolYear();
  const [activeTab, setActiveTab] = useState<'PAYMENT_RECORD' | 'ENROLLMENT' | 'CONFIG' | 'PAYMENTS'>('PAYMENT_RECORD');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Navigation par Onglets */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${activeTab === 'PAYMENT_RECORD' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('PAYMENT_RECORD')}
          style={{ fontWeight: 600, borderRadius: '8px' }}
        >
          Paiement de la scolarité
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'PAYMENTS' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('PAYMENTS')}
          style={{ fontWeight: 600, borderRadius: '8px' }}
        >
          Suivi des paiements
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'ENROLLMENT' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('ENROLLMENT')}
          style={{ fontWeight: 600, borderRadius: '8px' }}
        >
          Inscription financière d'un élève
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'CONFIG' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('CONFIG')}
          style={{ fontWeight: 600, borderRadius: '8px' }}
        >
          Configuration des frais de scolarité
        </button>
      </div>

      {activeTab === 'PAYMENT_RECORD' ? (
        <TuitionPaymentView />
      ) : activeTab === 'ENROLLMENT' ? (
        <FinancialEnrollmentView />
      ) : activeTab === 'CONFIG' ? (
        <TuitionFeesConfigView />
      ) : (
        <FinancialTrackingView />
      )}
    </div>
  );
}
