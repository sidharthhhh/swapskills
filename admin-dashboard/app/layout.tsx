import { Outfit } from 'next/font/google';
import type { Metadata } from 'next';
import QueryProvider from '@/components/providers/QueryProvider';
import './globals.css';

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit', 
});

export const metadata: Metadata = {
  title: 'SkillSwap Admin | Premium Dashboard',
  description: 'Enterprise-grade admin dashboard for the SkillSwap platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="font-sans antialiased text-slate-900 bg-slate-50 dark:bg-slate-950 dark:text-slate-50">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
