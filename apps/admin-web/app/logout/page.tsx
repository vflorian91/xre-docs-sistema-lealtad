'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { clearAdminSession } from '../lib/adminApi';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    clearAdminSession();
    router.replace('/');
  }, [router]);

  return (
    <main className="admin-auth-shell">
      <section className="admin-login loading-card" style={{ gap: 12, textAlign: 'center' }}>
        <strong>Cerrando sesion...</strong>
        <p>Serás redirigido al inicio de sesion.</p>
      </section>
    </main>
  );
}
