import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '../src/context/AuthContext';
import { PermissionProvider } from '../src/context/PermissionContext';
import { SchoolYearProvider } from '../src/context/SchoolYearContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

export function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <PermissionProvider>
            <SchoolYearProvider>
              {children}
            </SchoolYearProvider>
          </PermissionProvider>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export function customRender(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}
