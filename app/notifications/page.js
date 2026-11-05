import Link from 'next/link';
import { ActionButton } from '@/components/actions';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  const unread = items.filter((n) => !n.read).length;
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Alerts and updates sent to you, newest first." actions={unread > 0 && <ActionButton url="/api/notifications" icon="check">Mark all as read</ActionButton>} />
      <Card>
        {items.length === 0 ? (
          <EmptyState title="No notifications" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li key={n.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {!n.read && <Badge tone="indigo">New</Badge>}
                  {n.link ? <Link href={n.link} className="text-sm font-semibold text-indigo-700 hover:underline">{n.title}</Link> : <p className="text-sm font-semibold text-slate-800">{n.title}</p>}
                  <span className="text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
