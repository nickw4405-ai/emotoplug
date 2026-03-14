import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../lib/auth.js';
import AdminDashboard from './AdminDashboard';
import AdminLogin from './AdminLogin';

export default async function AdminPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const user  = verifyToken(token);

  if (!user) return <AdminLogin />;

  return <AdminDashboard user={user} />;
}
