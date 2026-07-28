import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastNotification, NotificationType } from '../types';

interface ToastContextValue {
  notifications: ToastNotification[];
  addNotification: (type: NotificationType, message: string) => void;
  showToast: (message: string, type?: NotificationType) => void;
  removeNotification: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  }, []);

  const showToast = useCallback((message: string, type: NotificationType = 'info') => {
    addNotification(type, message);
  }, [addNotification]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ notifications, addNotification, showToast, removeNotification }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
