import React, { useState, Suspense, lazy, useEffect, Component, ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchoolYearProvider } from './context/SchoolYearContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import ToastContainer from './components/common/ToastContainer';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import CommandPalette from './components/layout/CommandPalette';
import LoginPage from './pages/LoginPage';
import { Toaster } from './components/ui/toaster';
import './index.css';

import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import ParentsPage from './pages/ParentsPage';
import StaffPage from './pages/StaffPage';
import ScolarityPage from './pages/ScolarityPage';
import ExpensesPage from './pages/ExpensesPage';
import SettingsPage from './pages/SettingsPage';
import AcademicPage from './pages/AcademicPage';
import CatalogPage from './pages/CatalogPage';
import GradeEntryPage from './pages/GradeEntryPage';
import ReportCardsPage from './pages/ReportCardsPage';
import CanteenPage from './pages/CanteenPage';
import TransportPage from './pages/TransportPage';
import TimetablePage from './pages/TimetablePage';
import AttendancePage from './pages/AttendancePage';
import StaffAttendancePage from './pages/StaffAttendancePage';
import ReportsPage from './pages/ReportsPage';
import PlaceholderPage from './pages/PlaceholderPage';

// ─── ERROR BOUNDARY ──────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[GESCO ErrorBoundary] Erreur de rendu interceptée:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          boxSizing: 'border-box',
        }}>
          <div style={{
            width: '100%',
            maxWidth: 480,
            background: 'var(--bg-surface, #ffffff)',
            color: 'var(--text-main, #0f172a)',
            padding: '2.5rem 2rem',
            borderRadius: 16,
            border: '1px solid var(--border, #e2e8f0)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-main, #0f172a)' }}>
              Une erreur est survenue lors de l'affichage
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748b)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              L'application a rencontré un problème inattendu ({this.state.error?.message || 'Erreur inconnue'}).
            </p>
            <button
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{ padding: '0.625rem 1.25rem', borderRadius: 8, fontWeight: 700 }}
            >
              🔄 Recharger l'application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── COMPOSANTS AUXILIAIRES PREMIUM ─────────────────────────────────────────

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          fontWeight: 900,
          fontSize: '1.25rem',
          margin: '0 auto 12px',
          boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)',
        }}>
          G
        </div>
        <span className="spinner" style={{ width: 26, height: 26, borderWidth: 3 }} />
        <p style={{ marginTop: '12px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          Chargement du module...
        </p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="card shadow-sm" style={{ maxWidth: 400, textAlign: 'center', borderRadius: 16 }}>
        <div className="card-body p-4">
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 800 }}>Accès Restreint</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── APPLICATION PRINCIPALE ──────────────────────────────────────────────────

function AppContent() {
  const { currentUser, loading, canAccess } = useAuth();
  const [currentView, setCurrentView] = useState('DASHBOARD');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('gesco-theme') === 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('gesco-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Écouteur global CTRL + K / CMD + K pour ouvrir la Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (currentUser && !canAccess(currentView)) {
      const firstAllowed = [
        'DASHBOARD', 'STUDENTS', 'PARENTS', 'CLASSES', 'STAFF', 'CANTEEN', 'TRANSPORT',
        'ACTIVITIES', 'SCOLARITY', 'EXPENSES', 'REPORTS', 'NOTES',
        'STATISTICS', 'HISTORY', 'SETTINGS',
      ].find((v) => canAccess(v));
      if (firstAllowed) setCurrentView(firstAllowed);
    }
  }, [currentUser, currentView, canAccess]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        background: '#0f172a',
      }}>
        <div style={{ textAlign: 'center', color: '#ffffff' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            fontWeight: 900,
            fontSize: '1.75rem',
            margin: '0 auto 16px',
            boxShadow: '0 12px 30px rgba(79, 70, 229, 0.4)',
          }}>
            G
          </div>
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.7)', fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
            GESCO ERP — Chargement de l'Établissement...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <LoginPage />;

  const renderPage = () => {
    if (!canAccess(currentView)) return <AccessDenied />;

    switch (currentView) {
      case 'DASHBOARD':        return <DashboardPage onNavigate={setCurrentView} />;
      case 'STUDENTS':         return <StudentsPage />;
      case 'PARENTS':          return <ParentsPage onNavigate={setCurrentView} />;
      case 'SCOLARITY':        return <ScolarityPage />;
      case 'EXPENSES':         return <ExpensesPage />;
      case 'SETTINGS':         return <SettingsPage />;
      case 'CLASSES':          return <AcademicPage />;
      case 'STAFF':            return <StaffPage />;
      case 'STAFF_ATTENDANCE': return <StaffAttendancePage />;
      case 'TIMETABLE':        return <TimetablePage />;
      case 'ATTENDANCE':       return <AttendancePage />;
      case 'CANTEEN':          return <CanteenPage />;
      case 'TRANSPORT':        return <TransportPage />;
      case 'ACTIVITIES':       return <PlaceholderPage title="Activités" icon="⚽" />;
      case 'NOTES':            return <GradeEntryPage />;
      case 'BULLETINS':        return <ReportCardsPage />;
      case 'REPORT_CARDS':     return <ReportCardsPage />;
      case 'REPORTS':          return <ReportsPage />;
      case 'STATISTICS':       return <PlaceholderPage title="Statistiques" icon="📈" />;
      case 'HISTORY':          return <PlaceholderPage title="Journal d'Audit" icon="📜" />;
      default:                 return <DashboardPage onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="gesco-layout">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />
      <main className="gesco-main">
        <Header
          currentView={currentView}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((d) => !d)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
        <div className="gesco-content">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              {renderPage()}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setCurrentView}
      />
      <ToastContainer />
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <SchoolYearProvider>
              <AppContent />
            </SchoolYearProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
