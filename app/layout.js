import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import { getNow } from '@/lib/engine';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/session';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata = {
  title: 'ConductGuard — Conduct Risk Observability',
  description: 'Conduct risk observability for retail banking.',
};

export default async function RootLayout({ children }) {
  const user = await getUser();
  const [unread, clock] = user ? await Promise.all([prisma.notification.count({ where: { userId: user.id, read: false } }), getNow(prisma)]) : [0, null];
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-slate-900 antialiased">
        {user ? (
          <div className="min-h-screen lg:flex">
            <Sidebar user={{ name: user.name, title: user.title, role: user.role }} unread={unread} clock={clock.toISOString()} />
            <div className="min-w-0 flex-1">
              <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</main>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
