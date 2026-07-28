import React, { useState } from 'react';
import { CanteenConfigView } from '../components/canteen/CanteenConfigView';
import { CanteenEnrollmentView } from '../components/canteen/CanteenEnrollmentView';
import { CanteenPaymentView } from '../components/canteen/CanteenPaymentView';
import { MealListView } from '../components/canteen/MealListView';
import { CanteenTrackingView } from '../components/canteen/CanteenTrackingView';

type CanteenTab = 'PAYMENT' | 'MEAL_LIST' | 'TRACKING' | 'ENROLLMENT' | 'CONFIG';

const TABS: { id: CanteenTab; label: string }[] = [
  { id: 'PAYMENT', label: 'Paiement Cantine' },
  { id: 'MEAL_LIST', label: 'Liste des repas du jour' },
  { id: 'TRACKING', label: 'Suivi cantine' },
  { id: 'ENROLLMENT', label: 'Inscription à la cantine' },
  { id: 'CONFIG', label: 'Configuration de la cantine' },
];

export default function CanteenPage() {
  const [activeTab, setActiveTab] = useState<CanteenTab>('PAYMENT');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Navigation par onglets */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ fontWeight: 600, borderRadius: '8px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu de l'onglet actif */}
      {activeTab === 'PAYMENT' && <CanteenPaymentView />}
      {activeTab === 'MEAL_LIST' && <MealListView />}
      {activeTab === 'TRACKING' && <CanteenTrackingView />}
      {activeTab === 'ENROLLMENT' && <CanteenEnrollmentView />}
      {activeTab === 'CONFIG' && <CanteenConfigView />}
    </div>
  );
}
