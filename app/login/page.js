import { redirect } from 'next/navigation';
import Icon from '@/components/Icon';
import LoginPanel from '@/components/LoginPanel';
import { prisma } from '@/lib/prisma';
import { HOME_BY_ROLE, getUser } from '@/lib/session';

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect(HOME_BY_ROLE[user.role]);
  const accounts = await prisma.user.findMany({ select: { email: true, name: true, title: true, role: true }, orderBy: { email: 'asc' } });
  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto mb-10 max-w-5xl">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <Icon name="eye" className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">ConductGuard</h1>
            <p className="text-sm text-slate-500">Sign in to monitor conduct risk across employees, managers and targets.</p>
          </div>
        </div>
      </div>
      <LoginPanel accounts={accounts} />
    </div>
  );
}
