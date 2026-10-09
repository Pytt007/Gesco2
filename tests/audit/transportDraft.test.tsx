import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('../../src/components/transport/TransportLinesView', () => ({ TransportLinesView: () => <input aria-label="Brouillon véhicule" defaultValue="" /> }));
vi.mock('../../src/components/transport/TransportEnrollmentView', () => ({ TransportEnrollmentView: () => null }));
vi.mock('../../src/components/transport/TransportPaymentView', () => ({ TransportPaymentView: () => null }));
vi.mock('../../src/components/transport/TransportTrackingView', () => ({ TransportTrackingView: () => null }));
import TransportPage from '../../src/pages/TransportPage';
import { broadcastDataChange } from '../../src/services/common/realtimeSyncService';
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('preserves an unsaved form across refresh intervals and data notifications', () => {
  vi.useFakeTimers();
  render(<TransportPage />);
  fireEvent.change(screen.getByLabelText('Brouillon véhicule'), { target: { value: 'En cours de saisie' } });
  act(() => {
    vi.advanceTimersByTime(31000);
    broadcastDataChange('school_settings');
  });
  expect(screen.getByLabelText('Brouillon véhicule')).toHaveValue('En cours de saisie');
});
