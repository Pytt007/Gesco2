import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface DatePickerProps {
  value: string; // Format YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  showInternalIcon?: boolean;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function DatePicker({ value, onChange, label, className = '', disabled = false, showInternalIcon = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Analyse de la date sélectionnée (ex: "2026-07-30")
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const [viewYear, setViewYear] = useState<number>(validDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(validDate.getMonth());

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Recalcul intelligent de la position du popover lors de l'ouverture
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 330;
    const popoverWidth = 310;

    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= popoverHeight ? rect.bottom + 6 : Math.max(10, rect.top - popoverHeight - 6);
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - popoverWidth - 10));

    setPopoverPos({ top, left });
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Fermer la modale si clic en dehors ou scroll
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      if (isOpen) updatePosition();
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Formatage lisible de la date sélectionnée (ex: "30 Juil 2026")
  const formattedDisplay = () => {
    if (!value) return 'Sélectionner une date';
    const d = new Date(value + 'T00:00:00');
    if (isNaN(d.getTime())) return value;
    const day = String(d.getDate()).padStart(2, '0');
    const monthStr = MONTH_NAMES[d.getMonth()].substring(0, 4);
    const year = d.getFullYear();
    return `${day} ${monthStr}. ${year}`;
  };

  // Navigation Mois Précédent / Suivant
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Sélection du jour aujourd'hui
  const handleSelectToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    onChange(dateStr);
    setViewYear(yyyy);
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Génération de la grille des jours du mois
  const generateDaysGrid = () => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const totalDays = lastDayOfMonth.getDate();
    const days = [];

    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        dateStr: '',
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    for (let day = 1; day <= totalDays; day++) {
      const mm = String(viewMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${viewYear}-${mm}-${dd}`;
      const isSelected = dateStr === value;
      const isToday = dateStr === todayStr;

      days.push({
        dayNumber: day,
        isCurrentMonth: true,
        dateStr,
        isSelected,
        isToday,
      });
    }

    return days;
  };

  const daysGrid = generateDaysGrid();

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} className={className}>
      
      {/* BOUTON DECLENCHEUR MODERNE */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          height: '42px',
          background: '#ffffff',
          border: isOpen ? '2px solid #2563eb' : '1px solid #cbd5e1',
          borderRadius: '10px',
          color: '#0f172a',
          fontWeight: 700,
          fontSize: '0.875rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {showInternalIcon && (
          <CalendarIcon size={15} color="#2563eb" />
        )}
        
        <span>{formattedDisplay()}</span>

        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '4px' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* POPOVER CALENDRIER SAAS VIA PORTAL DOCUMENT.BODY */}
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: popoverPos.top,
            left: popoverPos.left,
            zIndex: 999999,
            width: '310px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25)',
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* HEADER MOIS & ANNEE */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                width: 32, height: 32, borderRadius: '8px', border: '1px solid #e2e8f0',
                background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569'
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                width: 32, height: 32, borderRadius: '8px', border: '1px solid #e2e8f0',
                background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* EN-TÊTE DES JOURS DE LA SEMAINE */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '6px' }}>
            {DAY_NAMES.map((d) => (
              <span key={d} style={{ fontSize: '0.725rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                {d}
              </span>
            ))}
          </div>

          {/* GRILLE DES JOURS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
            {daysGrid.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return (
                  <div
                    key={`prev-${idx}`}
                    style={{ padding: '8px 0', fontSize: '0.8125rem', color: '#cbd5e1', cursor: 'default' }}
                  >
                    {item.dayNumber}
                  </div>
                );
              }

              return (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => {
                    onChange(item.dateStr);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 0',
                    fontSize: '0.8125rem',
                    fontWeight: item.isSelected || item.isToday ? 800 : 600,
                    borderRadius: '8px',
                    border: item.isToday && !item.isSelected ? '1.5px solid #2563eb' : 'none',
                    background: item.isSelected ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#ffffff',
                    color: item.isSelected ? '#ffffff' : item.isToday ? '#2563eb' : '#1e293b',
                    cursor: 'pointer',
                    boxShadow: item.isSelected ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                    transition: 'all 0.1s ease',
                  }}
                >
                  {item.dayNumber}
                </button>
              );
            })}
          </div>

          {/* PIED DU CALENDRIER — BOUTON AUJOURD'HUI */}
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleSelectToday}
              style={{
                background: 'none', border: 'none', color: '#2563eb', fontWeight: 700,
                fontSize: '0.775rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <RotateCcw size={12} /> Aujourd'hui
            </button>

            <span style={{ fontSize: '0.725rem', color: '#94a3b8', fontWeight: 600 }}>
              GESCO Calendar
            </span>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
