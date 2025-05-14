'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';

// Tip tanımını ekleyelim
interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  // SessionProvider session prop'unu alabilir, ama client'da
  // otomatik olarak session'ı alacağı için genellikle gerekmez.
  return <SessionProvider>{children}</SessionProvider>;
} 