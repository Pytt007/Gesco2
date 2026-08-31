import React, { useState, Suspense, lazy, useEffect, Component, ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PermissionProvider } from './context/PermissionContext';
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

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const ParentsPage = lazy(() => import('./pages/ParentsPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const ScolarityPage = lazy(() => import('./pages/ScolarityPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AcademicPage = lazy(() => import('./pages/AcademicPage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const GradeEntryPage = lazy(() => import('./pages/GradeEntryPage'));
const ReportCardsPage = lazy(() => import('./pages/ReportCardsPage'));
const CanteenPage = lazy(() => import('./pages/CanteenPage'));
const TransportPage = lazy(() => import('./pages/TransportPage'));
const TimetablePage = lazy(() => import('./pages/TimetablePage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const StaffAttendancePage = lazy(() => import('./pages/StaffAttendancePage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const AuditHistoryPage = lazy(() => import('./pages/AuditHistoryPage'));
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage'));

// ⚠️  DEV ONLY — importé uniquement en développement, ne jamais supprimer la guard ci-dessous
const DevPortalPage = import.meta.env.DEV
  ? lazy(() => import('./pages/DevPortalPage'))
  : null;

import ErrorBoundary from './components/common/ErrorBoundary';
import PwaUpdatePrompt from './components/common/PwaUpdatePrompt';

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
          justifyContent: 'center',
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('gesco_sidebar_collapsed') === 'true';
  });
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState<boolean>(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('gesco_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('gesco-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Écouteur global CTRL + K (Palette) & CTRL + ALT + D (Dev Portal en DEV uniquement)
  useEffect(() => {
    // Si l'URL de départ est /dev en environnement de dev, ouvrir le Dev Portal
    if (import.meta.env.DEV && window.location.pathname === '/dev') {
      setCurrentView('DEV_PORTAL');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Raccourci développeur secrète CTRL + ALT + D (uniquement en DEV)
      if (import.meta.env.DEV && (e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setCurrentView((prev) => (prev === 'DEV_PORTAL' ? 'DASHBOARD' : 'DEV_PORTAL'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (currentUser && !canAccess(currentView)) {
      const firstAllowed = [
        'DASHBOARD', 'STUDENTS', 'PARENTS', 'CLASSES', 'STAFF', 'ATTENDANCE', 'TIMETABLE', 'NOTES',
        'FINANCE_PAYMENTS', 'FINANCE_TRACKING',
        'CANTEEN', 'TRANSPORT', 'EXPENSES',
        'REPORTS', 'STATISTICS', 'HISTORY',
        'SETTINGS',
        // rétrocompat
        'SCOLARITY', 'ACTIVITIES',
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
        justifyContent: 'center',
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
            justifyContent: 'center',
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
      case 'CLASSES':          return <AcademicPage />;
      case 'STAFF':            return <StaffPage />;
      case 'STAFF_ATTENDANCE': return <StaffAttendancePage />;
      case 'TIMETABLE':        return <TimetablePage />;
      case 'ATTENDANCE':       return <AttendancePage />;
      case 'NOTES':            return <GradeEntryPage />;
      case 'BULLETINS':        return <ReportCardsPage />;
      case 'REPORT_CARDS':     return <ReportCardsPage />;

      // 💰 FINANCE
      case 'FINANCE_PAYMENTS': return <ScolarityPage defaultTab="PAYMENT_RECORD" />;
      case 'FINANCE_TRACKING': return <ScolarityPage defaultTab="PAYMENTS" />;
      case 'SCOLARITY':        return <ScolarityPage />; // rétrocompat

      // 🏢 GESTION
      case 'CANTEEN':          return <CanteenPage />;
      case 'TRANSPORT':        return <TransportPage />;
      case 'EXPENSES':         return <ExpensesPage />;

      // 📊 ANALYSES
      case 'REPORTS':          return <ReportsPage />;
      case 'STATISTICS':       return <StatisticsPage />;
      case 'HISTORY':          return <AuditHistoryPage />;

      // ⚙️ PARAMÈTRES
      case 'SETTINGS':         return <SettingsPage />;

      // Autres
      case 'ACTIVITIES':       return <PlaceholderPage title="Activités" icon="⚽" />;
      // ⚠️  DEV PORTAL — uniquement en mode développement
      case 'DEV_PORTAL':
        if (!import.meta.env.DEV || !DevPortalPage) return <AccessDenied />;
        return <DevPortalPage />;

      default:                 return <DashboardPage onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className={`gesco-layout ${isSidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isMobileOpen={isSidebarMobileOpen}
        onCloseMobile={() => setIsSidebarMobileOpen(false)}
      />
      <main className={`gesco-main ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <Header
          currentView={currentView}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((d) => !d)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onToggleMobileMenu={() => setIsSidebarMobileOpen((prev) => !prev)}
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
      <PwaUpdatePrompt />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <PermissionProvider>
              <SchoolYearProvider>
                <AppContent />
              </SchoolYearProvider>
            </PermissionProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
