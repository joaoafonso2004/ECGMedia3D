'use client';

import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { GestorFilterProvider, useGestorFilter } from './GestorFilterContext';
import { useEffect, useState } from 'react';
import PainelEstrutura, { PainelAviso } from '@/components/painel/PainelEstrutura';
import FiltroEntidade from '@/components/painel/FiltroEntidade';

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
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function IconCube() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}
function IconFolder() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" 
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
/* Novo ícone para as Aprovações (Clipboard com Check) */
function IconClipboardCheck() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

/* ─── Nav items ─────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { label: 'Dashboard',       href: '/gestor/dashboard',    Icon: IconGrid           },
  { label: 'Módulos',     href: '/gestor/disciplinas',  Icon: IconBook           },
  { label: 'Projetos',        href: '/gestor/projetos',     Icon: IconFolder         },
  { label: 'Modelos 3D',      href: '/gestor/modelos',      Icon: IconCube           },
  { label: 'Vídeos de Fundo', href: '/gestor/videos',       Icon: IconVideo          },
  { label: 'Alunos',          href: '/gestor/utilizadores', Icon: IconUsers          },
  { label: 'Aprovações',      href: '/gestor/aprovacoes',   Icon: IconClipboardCheck },
];

/* ─── Filtro de entidade e programa (no topo) ───────────────────── */
function FiltroGestor() {
  return <FiltroEntidade {...useGestorFilter()} />;
}

/* ─── Layout ────────────────────────────────────────────────────── */
export default function GestorLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function checkRole() {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/admin/login');
        return;
      }

      const { data: tiposUtilizador } = await supabase
        .from('tipo_utilizador')
        .select('role')
        .eq('id_utilizador', user.id);

      const isGestor = tiposUtilizador?.some(t => t.role === 'gestor' || t.role === 'gestor_disciplina');
      const isSuperAdmin = tiposUtilizador?.some(t => t.role === 'superadmin');

      if (isGestor || isSuperAdmin) {
        setHasAccess(true);
        setLoading(false);
      } else {
        router.push('/utilizador/dashboard');
      }
    }

    checkRole();
  }, [router]);

  if (loading) return <PainelAviso>A verificar permissões…</PainelAviso>;
  if (!hasAccess) return <PainelAviso>A redirecionar…</PainelAviso>;

  return (
    <GestorFilterProvider>
      <PainelEstrutura
        area="Gestão"
        itens={NAV_ITEMS}
        hrefNotificacoes="/gestor/notificacoes"
        barra={<FiltroGestor />}
      >
        {children}
      </PainelEstrutura>
    </GestorFilterProvider>
  );
}
