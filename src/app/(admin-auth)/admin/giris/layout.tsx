import React from 'react';

// Bu layout, admin giriş sayfasının ana admin layout'unu miras almasını engeller.
// Sadece sayfa içeriğini (children) render eder.
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>; // Sadece children'ı render et
} 