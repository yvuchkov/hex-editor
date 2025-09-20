import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KUR ZA VAS SAMO AZ',
  description: 'KUR ZA VAS SAMO AZ',
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

