'use client';

import { createSupabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GestorFilterProvider, useGestorFilter } from './GestorFilterContext';
import { useEffect, useState } from 'react';

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
  { label: 'Dashboard',       href: '/gestor/dashboard',    Icon: IconGrid           },
  { label: 'Disciplinas',     href: '/gestor/disciplinas',  Icon: IconBook           },
  { label: 'Projetos',        href: '/gestor/projetos',     Icon: IconFolder         },
  { label: 'Modelos 3D',      href: '/gestor/modelos',      Icon: IconCube           },
  { label: 'Vídeos de Fundo', href: '/gestor/videos',       Icon: IconVideo          },
  { label: 'Alunos',          href: '/gestor/utilizadores', Icon: IconUsers          },
  { label: 'Aprovações',      href: '/gestor/aprovacoes',   Icon: IconClipboardCheck },
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
          <span className="text-sm font-semibold text-[#a78bfa]">gestor</span>
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
                  ? 'bg-[#a78bfa]/12 text-[#a78bfa] border border-[#a78bfa]/20'
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
  const { entidades, entidadeId, selectEntidade, programas, programaId, setProgramaId } = useGestorFilter();

  const entidadeNome = entidades.find(e => e.id_entidade == entidadeId)?.nome ?? '';
  const programaNome = programas.find(p => p.id_programa == programaId)?.nome ?? '';
  const filtroAtivo  = !!(entidadeId || programaId);

  const selectCls = `bg-[#13131a] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white/65
    focus:outline-none focus:border-[#a78bfa]/50 transition cursor-pointer
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
          <span className="inline-flex items-center text-xs font-semibold text-[#a78bfa]
                           bg-[#a78bfa]/10 border border-[#a78bfa]/20 px-3 py-1 rounded-full">
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
    <GestorFilterProvider>
      <div className="flex min-h-screen bg-[#0c0c0f]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <FilterBar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </GestorFilterProvider>
  );
}