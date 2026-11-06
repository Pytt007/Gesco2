import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const state = vi.hoisted(() => ({ user: null as null | { id: string }, loading: true, reads: 0 }));
vi.mock('../../src/context/AuthContext', () => ({ useAuth: () => ({ currentUser: state.user, loading: state.loading }) }));
vi.mock('../../src/services/common/schoolYearService', () => ({
  fetchSchoolYearSetting: async () => ({ id: null, currentSchoolYear: '' }),
  persistSchoolYearSetting: async () => null,
}));
vi.mock('../../src/services/settings/settingsService', () => ({
  fetchSchoolYearsList: async () => { state.reads++; return [{ id: 'year-1', label: '2026-2027', startDate: '2026-09-14', endDate: '', isActive: true }]; },
}));

import { SchoolYearProvider, useSchoolYear } from '../../src/context/SchoolYearContext';

function Label() {
  const { schoolYear } = useSchoolYear();
  return <span>{schoolYear || 'Aucune année'}</span>;
}

describe('School year after authentication', () => {
  beforeEach(() => { state.user = null; state.loading = true; state.reads = 0; });

  it('waits for the signed-in user before loading the active Neon year', async () => {
    const view = render(<SchoolYearProvider><Label /></SchoolYearProvider>);
    expect(screen.getByText('Aucune année')).toBeInTheDocument();
    expect(state.reads).toBe(0);
    state.loading = false;
    state.user = { id: 'admin-1' };
    view.rerender(<SchoolYearProvider><Label /></SchoolYearProvider>);
    await waitFor(() => expect(screen.getByText('2026-2027')).toBeInTheDocument());
    expect(state.reads).toBe(1);
  });
});
