'use client';

import { createSupabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminFilterProvider, useAdminFilter } from './AdminFilterContext';

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
function IconPerson() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a8.25 8.25 0 0115 0" />
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
function IconLogout() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}

/* ─── Nav items ─────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { label: 'Dashboard',     href: '/admin/dashboard',     Icon: IconGrid   },
  { label: 'Disciplinas',   href: '/admin/disciplinas',   Icon: IconBook   },
  { label: 'Projetos',      href: '/admin/projetos',      Icon: IconFolder },
  { label: 'Modelos 3D',    href: '/admin/modelos',       Icon: IconCube   },
  { label: 'Logo',          href: '/admin/logo',          Icon: IconLogo   },
  { label: 'Gestores',      href: '/admin/gestores',      Icon: IconPerson },
  { label: 'Criador Video', href: '/admin/video-creator', Icon: IconVideo  },
];

/* ─── Sidebar ───────────────────────────────────────────────────── */
function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-[#13131a] border-r border-white/5 shrink-0">
      <div className="px-5 py-5 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-base font-bold tracking-tight text-white group-hover:text-white/80 transition">
            media3d
          </span>
          <span className="text-white/15">/</span>
          <span className="text-sm font-semibold text-[#4f9eff]">admin</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active
                  ? 'bg-[#4f9eff]/12 text-[#4f9eff] border border-[#4f9eff]/20'
                  : 'text-white/45 hover:bg-white/5 hover:text-white/80 border border-transparent'
                }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                     font-medium text-white/35 hover:bg-red-500/10 hover:text-red-400
                     border border-transparent transition-all"
        >
          <IconLogout />
          Terminar sessão
        </button>
      </div>
    </aside>
  );
}

/* ─── Barra de filtro global ────────────────────────────────────── */
function FilterBar() {
  const { entidades, entidadeId, selectEntidade, programas, programaId, setProgramaId } = useAdminFilter();

  const entidadeNome = entidades.find(e => e.id_entidade == entidadeId)?.nome ?? '';
  const programaNome = programas.find(p => p.id_programa == programaId)?.nome ?? '';
  const filtroAtivo  = !!(entidadeId || programaId);

  const selectCls = `bg-[#13131a] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white/65
    focus:outline-none focus:border-[#4f9eff]/50 transition cursor-pointer
    disabled:opacity-35 disabled:cursor-not-allowed`;

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-white/5 bg-[#0c0c0f] shrink-0">
      <svg className="w-4 h-4 text-white/25 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
      </svg>

      <select
        className={selectCls}
        value={entidadeId}
        onChange={e => selectEntidade(e.target.value)}
      >
        <option value="">Todas as entidades</option>
        {entidades.map(ent => (
          <option key={ent.id_entidade} value={ent.id_entidade}>{ent.nome}</option>
        ))}
      </select>

      <svg className="w-3.5 h-3.5 text-white/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>

      <select
        className={selectCls}
        value={programaId}
        onChange={e => setProgramaId(e.target.value)}
        disabled={!entidadeId}
      >
        <option value="">
          {entidadeId
            ? (programas.length === 0 ? 'Sem programas' : 'Todos os programas')
            : '← seleciona uma entidade'}
        </option>
        {programas.map(p => (
          <option key={p.id_programa} value={p.id_programa}>{p.codigo} — {p.nome}</option>
        ))}
      </select>

      {filtroAtivo && (
        <div className="flex items-center gap-2 ml-1">
          <span className="inline-flex items-center text-xs font-semibold text-[#4f9eff]
                           bg-[#4f9eff]/10 border border-[#4f9eff]/20 px-3 py-1 rounded-full">
            {programaId ? programaNome : `Tudo de ${entidadeNome}`}
          </span>
          <button
            onClick={() => selectEntidade('')}
            className="w-5 h-5 flex items-center justify-center rounded-full text-white/25
                       hover:text-white/70 hover:bg-white/8 transition text-sm leading-none"
            title="Limpar filtros"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
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

  // Página de login: sem sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0f] text-white/30 text-sm">
        A verificar permissões...
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0f] text-white/30 text-sm">
        A redirecionar...
      </div>
    );
  }

  return (
    <AdminFilterProvider>
      <div className="flex min-h-screen bg-[#0c0c0f]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <FilterBar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminFilterProvider>
  );
}
