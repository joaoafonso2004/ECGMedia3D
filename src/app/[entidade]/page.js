import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';

/* ─── Fetches ───────────────────────────────────────────────────── */

async function getEntidade(slug) {
  const { data, error } = await supabase
    .from('entidade')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data;
}

async function getProgramas(idEntidade) {
  const { data, error } = await supabase
    .from('programa')
    .select('id_programa, nome, codigo, descricao')
    .eq('id_entidade', idEntidade)
    .order('nome', { ascending: true });

  if (error) {
    console.error('[Supabase] Erro ao carregar programas:', error.message);
    return [];
  }
  return data ?? [];
}

/* ─── Metadata dinâmico ────────────────────────────────────────── */
export async function generateMetadata({ params }) {
  const { entidade: slug } = await params;
  const entidade = await getEntidade(slug);
  if (!entidade) return { title: 'media3d' };
  return {
    title: `${entidade.nome} — media3d`,
    description: entidade.descricao ?? `Cursos de ${entidade.nome}`,
  };
}

/* ─── Página ────────────────────────────────────────────────────── */
export default async function EntidadePage({ params }) {
  const { entidade: slug } = await params;

  const entidade = await getEntidade(slug);
  if (!entidade) notFound();

  /* Usa id_entidade ou id — aceita ambas as convenções */
  const idEntidade = entidade.id_entidade ?? entidade.id;
  const programas  = await getProgramas(idEntidade);

  return (
    <main className="min-h-screen bg-[#0c0c0f] text-white">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0c0c0f]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-white/60
                         hover:text-white transition-colors"
            >
              media3d
            </Link>
            <span className="text-white/15 select-none">/</span>
            <span className="text-sm font-semibold text-[#4f9eff] tracking-wide">
              {entidade.slug}
            </span>
          </div>

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
      <section className="px-6 pb-12 pt-16 text-center">
        <div className="mx-auto max-w-2xl">

          {/* Badge tipo */}
          {entidade.tipo && (
            <span className="mb-5 inline-block rounded-full border border-[#4f9eff]/25
                             bg-[#4f9eff]/10 px-4 py-1 text-xs font-semibold uppercase
                             tracking-widest text-[#4f9eff]">
              {entidade.tipo}
            </span>
          )}

          <h1 className="mt-3 text-5xl font-bold leading-none tracking-tight text-white">
            {entidade.nome}
          </h1>

          {entidade.descricao && (
            <p className="mt-5 text-lg text-white/45 leading-relaxed max-w-xl mx-auto">
              {entidade.descricao}
            </p>
          )}

          <p className="mt-3 text-sm text-white/25">
            {programas.length === 0
              ? 'Nenhum programa disponível'
              : `${programas.length} ${programas.length === 1 ? 'programa' : 'programas'}`}
          </p>
        </div>
      </section>

      {/* ── Grid de programas ──────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">

        {programas.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-[#13131a] py-20 text-center">
            <p className="text-sm text-white/25">Nenhum programa encontrado para esta instituição.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programas.map(p => (
              <Link
                key={p.id_programa ?? p.codigo}
                href={`/${slug}/${p.codigo.toLowerCase()}`}
                className="block group"
              >
                <div
                  className="relative rounded-2xl border border-white/8 bg-[#13131a] p-6 flex flex-col
                             cursor-pointer transition-all duration-300
                             hover:border-[#4f9eff]/40 hover:shadow-xl hover:shadow-[#4f9eff]/10
                             hover:-translate-y-1"
                  style={{ height: '220px' }}
                >
                  {/* Zona de badge — altura reservada mesmo quando vazio */}
                  <div className="h-7 mb-3 flex items-center">
                    {p.codigo && (
                      <span className="inline-block rounded-full border border-[#4f9eff]/25
                                       bg-[#4f9eff]/10 px-3 py-0.5 text-xs font-semibold
                                       uppercase tracking-widest text-[#4f9eff]">
                        {p.codigo}
                      </span>
                    )}
                  </div>

                  {/* Nome */}
                  <h2 className="text-base font-semibold text-white leading-snug line-clamp-2
                                 group-hover:text-[#4f9eff] transition-colors duration-200">
                    {p.nome ?? p.codigo}
                  </h2>

                  {/* Descrição */}
                  {p.descricao && (
                    <p className="mt-2 text-sm text-white/40 leading-relaxed line-clamp-2">
                      {p.descricao}
                    </p>
                  )}

                  {/* CTA — empurrado para o fundo */}
                  <div className="mt-auto flex items-center gap-1.5 text-xs font-medium
                                  text-[#4f9eff]/50 group-hover:text-[#4f9eff]
                                  transition-colors duration-200">
                    <span>Ver disciplinas</span>
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
        )}

      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <span className="text-xs text-white/20">
            © {new Date().getFullYear()} {entidade.nome} — media3d
          </span>
          <span className="text-xs text-white/15">Next.js · Supabase · Three.js</span>
        </div>
      </footer>

    </main>
  );
}
