'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';
import { LEVEL_DOTS, NAV_BY_ROLE } from '@/components/nav';
import { formatClock, ROLE_LABELS } from '@/lib/format';

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
        <Icon name="eye" className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-slate-900">ConductGuard</span>
        <span className="block text-[11px] text-slate-500">Conduct risk observability</span>
      </span>
    </Link>
  );
}

async function logOut() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

export default function Sidebar({ user, clock }) {
  const pathname = usePathname();
  const nav = NAV_BY_ROLE[user.role] || [];
  // An exact match must win over a shorter prefix (e.g. /me/data over /me).
  const hrefs = nav.flatMap((g) => g.items.map((i) => i.href));
  const activeHref = hrefs.filter((h) => isActive(pathname, h)).sort((a, b) => b.length - a.length)[0];

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white lg:flex">
        <div className="px-5 pb-4 pt-6">
          <Brand />
        </div>
        <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          {nav.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span className={`h-1.5 w-1.5 rounded-full ${LEVEL_DOTS[group.level]}`} />
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.href === activeHref;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition ${
                          active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Icon name={item.icon} className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        <span className="flex-1 font-medium">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-5 py-4 text-[12px] text-slate-500">
          <p className="truncate font-semibold text-slate-800">{user.name}</p>
          <p className="truncate">{user.title}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{ROLE_LABELS[user.role]}</p>
          <button type="button" onClick={logOut} className="mt-2 font-medium text-indigo-600 hover:underline">
            Switch user
          </button>
          <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
            Demo clock {formatClock(clock)}
          </p>
        </div>
      </aside>

      <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand />
          <button type="button" onClick={logOut} className="text-[13px] font-medium text-indigo-600">
            Switch user
          </button>
        </div>
        <nav className="scroll-thin flex gap-1.5 overflow-x-auto px-4 pb-3">
          {nav.flatMap((g) => g.items).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                item.href === activeHref ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
