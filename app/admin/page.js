import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../lib/auth.js';
import { redirect } from 'next/navigation';
import AdminDashboard from './AdminDashboard';

export default async function AdminPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const user  = verifyToken(token);

  if (!user) redirect('/');   // not logged in → back to home (modal sign-in)

  return <AdminDashboard user={user} />;
}
