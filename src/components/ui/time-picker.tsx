// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Custom TimePicker UI Component (Design SaaS Premium)
// Composant personnalisé de sélection d'heure avec Popover interactif
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Check } from 'lucide-react';

export interface TimePickerProps {
  value: string; // Format "HH:mm" ex: "07:30"
  onChange: (time: string) => void;
  label?: string;
  placeholder?: string;
  icon?: string;
  required?: boolean;
}

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 7; // De 07h à 18h
  return h < 10 ? `0${h}` : `${h}`;
});

const MINUTES = ['00', '15', '30', '45'];

export function TimePicker({
  value,
  onChange,
  label,
  placeholder = 'Sélectionner une heure',
  icon = '🕒',
  required = false,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number; openUpwards: boolean }>({
    top: 0,
    left: 0,
    width: 260,
    openUpwards: false,
  });

  const [selectedHour, selectedMinute] = value ? value.split(':') : ['07', '30'];

  const availableMinutes = selectedHour === '18' ? ['00', '15', '30'] : MINUTES;

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < 280;

    setPopoverPos({
      top: openUpwards ? rect.top - 280 : rect.bottom + 6,
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 276)),
      width: Math.max(rect.width, 260),
      openUpwards,
    });
  };

  const handleToggle = () => {
    if (!isOpen) updatePosition();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest('.gesco-timepicker-popover')
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectTime = (h: string, m: string) => {
    onChange(`${h}:${m}`);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '0.375rem',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              background: '#eff6ff',
              color: '#2563eb',
              borderRadius: '6px',
            }}
          >
            <Clock size={13} />
          </span>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      {/* BOUTON DECLENCHEUR DU TIME PICKER */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        style={{
          width: '100%',
          height: '42px',
          padding: '0 14px',
          background: '#ffffff',
          border: isOpen ? '2px solid #2563eb' : '1px solid #cbd5e1',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: value ? '#0f172a' : '#94a3b8',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <span>{value ? `${value.replace(':', ' : ')}` : placeholder}</span>
        <Clock size={16} color="#64748b" />
      </button>

      {/* POPOVER VIA PORTAL */}
      {isOpen &&
        createPortal(
          <div
            className="gesco-timepicker-popover card shadow-2xl"
            style={{
              position: 'fixed',
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              width: `${popoverPos.width}px`,
              zIndex: 99999,
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '16px',
              boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.25)',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⏰ Sélection de l'Heure
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 900, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 6 }}>
                {selectedHour} : {selectedMinute}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* COLONNE HEURES */}
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>Heures</div>
                <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
                  {HOURS.map((h) => {
                    const isSelected = h === selectedHour;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleSelectTime(h, selectedMinute)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: isSelected ? '#2563eb' : '#f8fafc',
                          color: isSelected ? '#ffffff' : '#1e293b',
                          fontWeight: isSelected ? 800 : 500,
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{h} h</span>
                        {isSelected && <Check size={12} color="#ffffff" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* COLONNE MINUTES */}
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>Minutes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {availableMinutes.map((m) => {
                    const isSelected = m === selectedMinute;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectTime(selectedHour, m)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#2563eb' : '#1e293b',
                          fontWeight: isSelected ? 800 : 500,
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        : {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
