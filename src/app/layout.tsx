import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hex editor',
  description: 'Hex editor',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

