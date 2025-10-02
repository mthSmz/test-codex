import React from 'react';

export const metadata = { title: 'Poème du jour' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{background:'#0a0a0a', color:'#eee', fontFamily:'system-ui, sans-serif'}}>{children}</body>
    </html>
  );
}
