'use client';

import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PainelEstrutura, { PainelAviso } from '@/components/painel/PainelEstrutura';

/* ─── Ícones ────────────────────────────────────────────────────── */
function IconGrid() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function IconVideo() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 9.75v9A2.25 2.25 0 004.5 18.75z" />
    </svg>
  );
}
function IconPerson() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a8.25 8.25 0 0115 0" />
    </svg>
  );
}

/* ─── Nav items ─────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { label: 'Dashboard',     href: '/utilizador/dashboard',     Icon: IconGrid },
  { label: 'Biblioteca',    href: '/utilizador/biblioteca',    Icon: IconBook },
  { label: 'Criador Video', href: '/utilizador/video-creator', Icon: IconVideo },
  { label: 'Perfil',        href: '/utilizador/perfil',        Icon: IconPerson },
];

/* ─── Layout ────────────────────────────────────────────────────── */
export default function UtilizadorLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // O nome no topo é atualizado pela PainelEstrutura (também quando o Perfil muda)
  useEffect(() => {
    async function checkRole() {
      const supabase = createSupabaseBrowser();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/admin/login');
        return;
      }

      const { data: tiposUtilizador } = await supabase
        .from('tipo_utilizador')
        .select('role')
        .eq('id_utilizador', authUser.id);

      const isUtilizador = tiposUtilizador?.some(t => t.role === 'utilizador');

      if (!isUtilizador) {
        const isSuperAdmin = tiposUtilizador?.some(t => t.role === 'superadmin');
        const isGestor = tiposUtilizador?.some(t => t.role === 'gestor' || t.role === 'gestor_disciplina');
        router.push(isSuperAdmin || isGestor ? '/admin/dashboard' : '/admin/login');
        return;
      }

      setHasAccess(true);
      setLoading(false);
    }

    checkRole();
  }, [router]);

  if (loading) return <PainelAviso>A carregar o painel…</PainelAviso>;
  if (!hasAccess) return <PainelAviso>A redirecionar…</PainelAviso>;

  return (
    <PainelEstrutura
      area="Área pessoal"
      itens={NAV_ITEMS}
      hrefNotificacoes="/utilizador/notificacoes"
      hrefSair="/"
    >
      {children}
    </PainelEstrutura>
  );
}
