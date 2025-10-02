import type { ReactNode } from 'react';

export const metadata = {
  title: 'Poème du jour',
  description: 'Un nouveau poème quotidien généré automatiquement.',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8f8f8' }}>
        {children}
      </body>
    </html>
  );
}
