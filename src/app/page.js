import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import TypewriterText from '@/components/TypewriterText';

export const metadata = {
  title: 'media3d',
  description: 'Plataforma de visualização 3D de projetos académicos',
};

/* ─── Fetch ─────────────────────────────────────────────────────── */
async function getEntidades() {
  const { data, error } = await supabase
    .from('entidade')
    .select('id_entidade, nome, tipo, slug')
    .order('nome', { ascending: true });

  if (error) {
    console.error('[Supabase] Erro ao carregar entidades:', error.message);
    return { data: [], error: error.message };
  }
  return { data: data ?? [], error: null };
}

/* ─── Página ────────────────────────────────────────────────────── */
export default async function HomePage() {
  const { data: entidades, error } = await getEntidades();

  return (
    <main className="min-h-screen bg-[#0c0c0f] text-white">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0c0c0f]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <TypewriterText
              texto="media3d"
              velocidade={100}
              modo="once"
              className="text-lg font-bold tracking-tight text-white"
            />
          <a
            href="/admin/login"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs
                       font-medium text-white/50 transition hover:border-white/20 hover:text-white/80"
          >
            Entrar
          </a>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="px-6 pb-12 pt-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-6xl font-bold leading-none tracking-tight text-white">
            <TypewriterText
              texto="media3d"
              velocidade={100}
              modo="once"
              highlight={{ from: 5, className: 'text-[#4f9eff]' }}
            />
          </h1>
          <p className="mt-5 text-lg text-white/45 leading-relaxed max-w-xl mx-auto min-h-[1.75rem]">
            <TypewriterText
              frases={[
                'Plataforma de visualização 3D de projetos académicos.',
                'Explora modelos 3D animados de cada disciplina.',
                'Seleciona uma instituição para começar.',
              ]}
              velocidade={35}
              velocidadeApagar={20}
              pausaEntreFrases={2500}
              modo="loop"
            />
          </p>
        </div>
      </section>

      {/* ── Grid de entidades ──────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">

        {error && (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-semibold text-red-400 mb-1">⚠ Erro ao ligar ao Supabase</p>
            <p className="text-xs font-mono text-red-300/70 break-all">{error}</p>
          </div>
        )}

        {!error && entidades.length === 0 && (
          <p className="py-20 text-center text-sm text-white/25">
            Nenhuma instituição encontrada.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entidades.map(e => (
            <Link
              key={e.id_entidade ?? e.slug}
              href={`/${e.slug}`}
              className="block group"
            >
              <div
                className="relative rounded-2xl border border-white/8 bg-[#13131a] p-6 flex flex-col
                           cursor-pointer transition-all duration-300
                           hover:border-[#4f9eff]/40 hover:shadow-xl hover:shadow-[#4f9eff]/10
                           hover:-translate-y-1"
                style={{ height: '200px' }}
              >
                {/* Zona de badge — altura reservada mesmo quando vazio */}
                <div className="h-7 mb-3 flex items-center">
                  {e.tipo && (
                    <span className="inline-block rounded-full border border-[#4f9eff]/25
                                     bg-[#4f9eff]/10 px-3 py-0.5 text-xs font-semibold
                                     uppercase tracking-widest text-[#4f9eff]">
                      {e.tipo}
                    </span>
                  )}
                </div>

                {/* Nome */}
                <h2 className="text-lg font-semibold text-white leading-snug line-clamp-2
                               group-hover:text-[#4f9eff] transition-colors duration-200">
                  {e.nome}
                </h2>

                {/* Slug */}
                <p className="mt-1 text-xs font-mono text-white/20 uppercase tracking-widest">
                  {e.slug}
                </p>

                {/* CTA — empurrado para o fundo */}
                <div className="mt-auto flex items-center gap-1.5 text-xs font-medium
                                text-[#4f9eff]/50 group-hover:text-[#4f9eff] transition-colors duration-200">
                  <span>Ver cursos</span>
                  <svg
                    className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <span className="text-xs text-white/20">
            © {new Date().getFullYear()} media3d
          </span>
          <span className="text-xs text-white/15">Next.js · Supabase · Three.js</span>
        </div>
      </footer>

    </main>
  );
}
