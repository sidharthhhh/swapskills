import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import SessionProvider from '@/components/providers/SessionProvider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { name, role } = session.user;

  return (
    <SessionProvider>
      <div className="flex min-h-screen relative overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
        {/* Decorative Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-400/10 dark:bg-primary-600/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-400/10 dark:bg-purple-600/10 blur-[120px]" />
        </div>

        <Sidebar role={role} />
        <div className="flex-1 flex flex-col min-w-0 z-10">
          <Topbar name={name} role={role} />
          <main className="flex-1 p-6 overflow-auto animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
