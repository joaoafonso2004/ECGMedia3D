'use client';

import { createSupabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
function IconLogout() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/* ─── Nav items ─────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { label: 'Dashboard',     href: '/admin/dashboard',     Icon: IconGrid     },
  { label: 'Disciplinas',   href: '/admin/disciplinas',   Icon: IconBook     },
  { label: 'Projetos',      href: '/admin/projetos',      Icon: IconFolder   },
  { label: 'Modelos 3D',    href: '/admin/modelos',       Icon: IconCube     },
  { label: 'Logo',          href: '/admin/logo',          Icon: IconLogo     },
  { label: 'Gestores',      href: '/admin/gestores',      Icon: IconPerson   },
  { label: 'Alunos',        href: '/admin/utilizadores',  Icon: IconUsers  }, // <-- Ícone atualizado aqui
  { label: 'Criador Video', href: '/admin/video-creator', Icon: IconVideo    },
  { divider: true },
  { label: 'Entidades',     href: '/admin/entidades',     Icon: IconBuilding },
  { label: 'Programas',     href: '/admin/programas',     Icon: IconAcademic },
];

/* ─── TopNavBar ─────────────────────────────────────────────────── */
function TopNavBar() {
  const { entidades, entidadeId, selectEntidade, programas, programaId, setProgramaId } = useAdminFilter();
  const [entOpen,  setEntOpen]  = useState(false);
  const [progOpen, setProgOpen] = useState(false);
  const entRef  = useRef(null);
  const progRef = useRef(null);

  const filtroAtivo  = !!(entidadeId || programaId);
  const entidadeNome = entidades.find(e => String(e.id_entidade) === String(entidadeId))?.nome ?? 'Todas as entidades';
  const programaNome = programaId
    ? (programas.find(p => String(p.id_programa) === String(programaId))?.nome ?? 'Todos os programas')
    : 'Todos os programas';

  useEffect(() => {
    function onMouseDown(e) {
      if (entRef.current  && !entRef.current.contains(e.target))  setEntOpen(false);
      if (progRef.current && !progRef.current.contains(e.target)) setProgOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const dropdownCls =
    'absolute top-full left-0 mt-1.5 min-w-[200px] rounded-xl ' +
    'border border-white/10 bg-[#13131a] shadow-2xl shadow-black/50 py-1 z-50';

  function itemCls(active) {
    return (
      'w-full px-3.5 py-2 text-left text-sm transition-colors hover:bg-white/[0.05] ' +
      (active ? 'text-[#4f9eff]' : 'text-white/65')
    );
  }

  return (
    <div className="flex items-center h-[57px] px-5 border-b border-white/[0.06] bg-[#0c0c0f] shrink-0">

      {/* Logo — always visible, links to dashboard */}
      <Link
        href="/admin/dashboard"
        className="text-base font-bold tracking-tight text-white hover:text-white/80 transition-colors shrink-0"
      >
        media3d
      </Link>

      {/* "/admin" — collapses smoothly when a filter is active */}
      <div
        className="flex items-center overflow-hidden"
        style={{
          maxWidth: filtroAtivo ? '0px' : '90px',
          opacity:  filtroAtivo ? 0 : 1,
          transition: 'max-width 200ms ease, opacity 150ms ease',
        }}
      >
        <span className="mx-2 text-white/15 select-none whitespace-nowrap">/</span>
        <span className="text-sm font-semibold text-white whitespace-nowrap">admin</span>
      </div>

      {/* Separator before entity */}
      <span className="mx-2 text-white/15 select-none shrink-0">/</span>

      {/* ── Entity dropdown ── */}
      <div ref={entRef} className="relative shrink-0">
        <button
          onClick={() => { setEntOpen(o => !o); setProgOpen(false); }}
          className={[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all',
            entidadeId
              ? 'text-[#4f9eff] border border-[#4f9eff]/25'
              : 'text-white/50 border border-transparent hover:text-white/70 hover:border-white/10',
          ].join(' ')}
          style={entidadeId ? { background: 'rgba(79,158,255,0.08)' } : undefined}
        >
          <span className="whitespace-nowrap">{entidadeNome}</span>
          <IconChevronDown />
        </button>

        {entOpen && (
          <div className={dropdownCls}>
            <button
              className={itemCls(!entidadeId)}
              onClick={() => { selectEntidade(''); setEntOpen(false); }}
            >
              Todas as entidades
            </button>
            {entidades.map(ent => (
              <button
                key={ent.id_entidade}
                className={itemCls(String(ent.id_entidade) === String(entidadeId))}
                onClick={() => { selectEntidade(ent.id_entidade); setEntOpen(false); }}
              >
                {ent.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator before program */}
      <span className="mx-2 text-white/15 select-none shrink-0">›</span>

      {/* ── Program dropdown ── */}
      <div ref={progRef} className="relative shrink-0">
        <button
          onClick={() => { if (entidadeId) { setProgOpen(o => !o); setEntOpen(false); } }}
          className={[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all',
            programaId
              ? 'text-[#4f9eff] border border-[#4f9eff]/25'
              : 'text-white/50 border border-transparent',
            !entidadeId ? 'opacity-40 cursor-default' : 'hover:text-white/70 hover:border-white/10',
          ].join(' ')}
          style={programaId ? { background: 'rgba(79,158,255,0.08)' } : undefined}
        >
          <span className="whitespace-nowrap">{programaNome}</span>
          <IconChevronDown />
        </button>

        {progOpen && entidadeId && (
          <div className={dropdownCls}>
            <button
              className={itemCls(!programaId)}
              onClick={() => { setProgramaId(''); setProgOpen(false); }}
            >
              Todos os programas
            </button>
            {programas.map(p => (
              <button
                key={p.id_programa}
                className={itemCls(String(p.id_programa) === String(programaId))}
                onClick={() => { setProgramaId(p.id_programa); setProgOpen(false); }}
              >
                {p.codigo} — {p.nome}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
    <aside className="flex flex-col w-56 min-h-full bg-[#13131a] border-r border-white/5 shrink-0">
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item, idx) => {
          if (item.divider) {
            return <div key={idx} className="my-2 border-t border-white/5" />;
          }
          const { label, href, Icon } = item;
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
      <div className="flex flex-col min-h-screen bg-[#0c0c0f]">
        <TopNavBar />
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminFilterProvider>
  );
}