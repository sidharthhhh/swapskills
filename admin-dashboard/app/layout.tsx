import type { Metadata } from 'next';
import QueryProvider from '@/components/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkillSwap Admin',
  description: 'Admin dashboard for the SkillSwap platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
