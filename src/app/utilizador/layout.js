'use client';

import { createSupabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

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
function IconLogout() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
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

/* ─── Sidebar ───────────────────────────────────────────────────── */
function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-[#13131a] border-r border-white/5 shrink-0 transition-all">
      <div className="px-5 py-5 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-base font-bold tracking-tight text-white group-hover:text-white/80 transition">
            ECGMedia3d
          </span>
          <span className="text-white/15">/</span>
          <span className="text-sm font-semibold text-[#4f9eff]">Utilizador</span>
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
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate transition-all duration-300">{user?.nome}</p>
          <p className="text-xs text-white/40 truncate transition-all duration-300">{user?.email}</p>
        </div>

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
export default function UtilizadorLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Função isolada para podermos chamá-la no início e quando o evento disparar
  const fetchUser = useCallback(async () => {
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
      
      if (isSuperAdmin || isGestor) {
        router.push('/admin/dashboard');
      } else {
        router.push('/admin/login');
      }
      return;
    }

    const { data: userData } = await supabase
      .from('utilizadores')
      .select('nome')
      .eq('id_utilizadores', authUser.id)
      .single();

    setUser({ ...authUser, nome: userData?.nome });
    setHasAccess(true);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchUser();

    // Escuta o evento customizado emitido pela página de Perfil
    window.addEventListener('profileUpdated', fetchUser);
    
    // Limpa o listener se o componente for desmontado
    return () => window.removeEventListener('profileUpdated', fetchUser);
  }, [fetchUser]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c0f] text-white/30 text-sm">
        A carregar painel...
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
    <div className="flex min-h-screen bg-[#0c0c0f]">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-h-0">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}