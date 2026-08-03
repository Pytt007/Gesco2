// ─────────────────────────────────────────────────────────────────────────────
// GESCO — UsersManager / index.tsx
// Export centralisé du nouveau module Utilisateurs & Accès (Design Notion / Linear feel)
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { UsersAccessLayout } from './UsersAccessLayout';

export default function UsersManager() {
  return <UsersAccessLayout />;
}

export { UsersAccessLayout };
