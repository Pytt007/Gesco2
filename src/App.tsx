import React, { useState, Suspense, lazy, useEffect, Component, ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchoolYearProvider } from './context/SchoolYearContext';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/common/ToastContainer';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import CommandPalette from './components/layout/CommandPalette';
import LoginPage from './pages/LoginPage';
import './index.css';

// Lazy loading des pages
const DashboardPage       = lazy(() => import('./pages/DashboardPage'));
const StudentsPage        = lazy(() => import('./pages/StudentsPage'));
const ParentsPage         = lazy(() => import('./pages/ParentsPage'));
const StaffPage           = lazy(() => import('./pages/StaffPage'));
const ScolarityPage       = lazy(() => import('./pages/ScolarityPage'));
const ExpensesPage        = lazy(() => import('./pages/ExpensesPage'));
const SettingsPage        = lazy(() => import('./pages/SettingsPage'));
const AcademicPage        = lazy(() => import('./pages/AcademicPage'));
const CatalogPage         = lazy(() => import('./pages/CatalogPage'));
const GradeEntryPage       = lazy(() => import('./pages/GradeEntryPage'));
const ReportCardsPage      = lazy(() => import('./pages/ReportCardsPage'));
const CanteenPage         = lazy(() => import('./pages/CanteenPage'));
const TransportPage       = lazy(() => import('./pages/TransportPage'));
const TimetablePage       = lazy(() => import('./pages/TimetablePage'));
const AttendancePage       = lazy(() => import('./pages/AttendancePage'));
const StaffAttendancePage  = lazy(() => import('./pages/StaffAttendancePage'));
const ReportsPage          = lazy(() => import('./pages/ReportsPage'));
const PlaceholderPage     = lazy(() => import('./pages/PlaceholderPage'));

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
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          background: '#0f172a',
          color: 'white',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: 480,
            background: '#1e293b',
            padding: '2rem',
            borderRadius: 16,
            border: '1px solid #334155',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#f8fafc' }}>
              Une erreur est survenue lors de l'affichage
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
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

// ─── COMPOSANTS AUXILIAIRES ─────────────────────────────────────────────────

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Chargement du module...</p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="card" style={{ maxWidth: 400, textAlign: 'center', borderRadius: 14 }}>
        <div className="card-body p-4">
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Accès Restreint</h2>
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
        background: 'var(--bg-app, #f8fafc)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>
            GESCO — Chargement...
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
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <SchoolYearProvider>
            <AppContent />
          </SchoolYearProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
