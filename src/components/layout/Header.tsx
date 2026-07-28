import React, { useState } from 'react';
import { useSchoolYear } from '../../context/SchoolYearContext';
import { useAuth } from '../../context/AuthContext';
import { CalendarRange, Moon, Sun, ChevronDown } from 'lucide-react';

import { VIEW_LABELS } from '../../constants/routes';

interface HeaderProps {
  currentView: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Header({ currentView, isDarkMode, onToggleDarkMode }: HeaderProps) {
  const { schoolYear, schoolYears, setSchoolYear } = useSchoolYear();
  const { currentUser } = useAuth();
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  const handleYearChange = async (year: string) => {
    await setSchoolYear(year);
    setYearDropdownOpen(false);
  };

  return (
    <header className="header">
      <div>
        <h1 className="header-title">{VIEW_LABELS[currentView] || currentView}</h1>
        {currentUser && (
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>
            Connecté en tant que {currentUser.fullName}
          </p>
        )}
      </div>

      <div className="header-actions">
        {/* Sélecteur d'Année Scolaire */}
        <div style={{ position: 'relative' }}>
          <button
            id="btn-year-selector"
            className="year-selector"
            onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
            aria-expanded={yearDropdownOpen}
            aria-haspopup="listbox"
          >
            <CalendarRange size={15} style={{ color: 'var(--color-primary)' }} />
            {schoolYear}
            <ChevronDown
              size={13}
              style={{
                color: 'var(--text-muted)',
                transform: yearDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>

          {yearDropdownOpen && (
            <>
              {/* Overlay pour fermer le dropdown */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                onClick={() => setYearDropdownOpen(false)}
              />
              <div
                role="listbox"
                aria-label="Sélectionner l'année scolaire"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 50,
                  minWidth: '160px',
                  overflow: 'hidden',
                  animation: 'slideUp 0.15s ease',
                }}
              >
                {schoolYears.map((year) => (
                  <button
                    key={year}
                    role="option"
                    aria-selected={year === schoolYear}
                    onClick={() => handleYearChange(year)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.6rem 1rem',
                      fontSize: '0.8125rem',
                      fontWeight: year === schoolYear ? 700 : 500,
                      color: year === schoolYear ? 'var(--color-primary)' : 'var(--text-primary)',
                      background: year === schoolYear ? 'var(--color-primary-light)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (year !== schoolYear) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (year !== schoolYear) (e.currentTarget as HTMLButtonElement).style.background = 'none';
                    }}
                  >
                    {year} {year === schoolYear ? '✓' : ''}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bouton Mode Sombre/Clair */}
        <button
          id="btn-toggle-theme"
          className="btn btn-ghost btn-sm"
          onClick={onToggleDarkMode}
          aria-label={isDarkMode ? 'Passer au mode clair' : 'Passer au mode sombre'}
          title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)' }}
        >
          {isDarkMode
            ? <Sun size={17} style={{ color: '#f59e0b' }} />
            : <Moon size={17} />
          }
        </button>
      </div>
    </header>
  );
}
