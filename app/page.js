import { redirect } from 'next/navigation';
import { HOME_BY_ROLE, getUser } from '@/lib/session';

export default async function Home() {
  const user = await getUser();
  redirect(user ? HOME_BY_ROLE[user.role] : '/login');
}
