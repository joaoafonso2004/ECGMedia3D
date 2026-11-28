'use client';

import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminFilterProvider, useAdminFilter } from './AdminFilterContext';
import PainelEstrutura, { PainelAviso } from '@/components/painel/PainelEstrutura';
import FiltroEntidade from '@/components/painel/FiltroEntidade';

/* ─── Ícones ────────────────────────────────────────────────────── */
function IconGrid() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
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
function IconLogo() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
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
function IconBuilding() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3h15l-.75 18H5.25L4.5 3zm3.75 4.5h.008v.008H8.25V7.5zm0 3h.008v.008H8.25v-3zm0 3h.008v.008H8.25v-3zm3-6h.008v.008H11.25V7.5zm0 3h.008v.008H11.25v-3zm0 3h.008v.008H11.25v-3zm3-6h.008v.008H14.25V7.5zm0 3h.008v.008H14.25v-3zm0 3h.008v.008H14.25v-3z" />
    </svg>
  );
}
function IconAcademic() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
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
/* Novo ícone para os Alunos (Grupo de Pessoas) */
function IconUsers() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" 
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
  { label: 'Dashboard',       href: '/admin/dashboard',     Icon: IconGrid     },
  { label: 'Módulos',     href: '/admin/disciplinas',   Icon: IconBook     },
  { label: 'Projetos',        href: '/admin/projetos',      Icon: IconFolder   },
  { label: 'Modelos 3D',      href: '/admin/modelos',       Icon: IconCube     },
  { label: 'Vídeos de Fundo', href: '/admin/videos',        Icon: IconVideo    },
  { label: 'Logo',            href: '/admin/logo',          Icon: IconLogo     },
  { label: 'Gestores',        href: '/admin/gestores',      Icon: IconPerson   },
  { label: 'Alunos',          href: '/admin/utilizadores',  Icon: IconUsers    },
  { label: 'Criador Video',   href: '/admin/video-creator', Icon: IconVideo    },
  { divider: true },
  { label: 'Entidades',       href: '/admin/entidades',     Icon: IconBuilding },
  { label: 'Programas',       href: '/admin/programas',     Icon: IconAcademic },
  { label: 'Terminologia',    href: '/admin/terminologia',  Icon: IconBook     },
];

/* ─── Filtro de entidade e programa (no topo) ───────────────────── */
function FiltroAdmin() {
  return <FiltroEntidade {...useAdminFilter()} />;
}

/* ─── Layout ────────────────────────────────────────────────────── */
export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function checkRole() {
      // Página de login: sem proteção
      if (pathname === '/admin/login') {
        setLoading(false);
        return;
      }

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

      const isSuperAdmin = tiposUtilizador?.some(t => t.role === 'superadmin');
      const isGestor = tiposUtilizador?.some(t => t.role === 'gestor' || t.role === 'gestor_disciplina');

      if (isSuperAdmin || isGestor) {
        setHasAccess(true);
        setLoading(false);
      } else {
        router.push('/utilizador/dashboard');
      }
    }

    checkRole();
  }, [pathname, router]);

  // Página de login: sem menu
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) return <PainelAviso>A verificar permissões…</PainelAviso>;
  if (!hasAccess) return <PainelAviso>A redirecionar…</PainelAviso>;

  return (
    <AdminFilterProvider>
      <PainelEstrutura
        area="Administração"
        itens={NAV_ITEMS}
        hrefNotificacoes="/admin/notificacoes"
        barra={<FiltroAdmin />}
      >
        {children}
      </PainelEstrutura>
    </AdminFilterProvider>
  );
}
