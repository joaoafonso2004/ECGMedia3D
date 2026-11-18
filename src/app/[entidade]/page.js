import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

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
  if (!entidade) return { title: 'ECGMedia3D' };
  return {
    title: `${entidade.nome} — ECGMedia3D`,
    description: entidade.descricao ?? `Programas de ${entidade.nome}`,
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
    <div className="min-h-screen bg-papel text-tinta">
      <SiteHeader />

      <main className="contentor">
        {/* ── Cabeçalho da entidade ──────────────────────────────── */}
        <section className="border-b border-linha pb-8 pt-7">
          <nav aria-label="Localização" className="flex flex-wrap gap-2 text-sm text-cinza">
            <Link href="/" className="hover:text-tinta hover:underline">Início</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-tinta">{entidade.nome}</span>
          </nav>

          {entidade.tipo && (
            <p className="mt-6 text-[13px] font-medium capitalize text-cinza">{entidade.tipo}</p>
          )}
          <h1 className="mt-2 text-[clamp(34px,4vw,60px)] font-semibold leading-[1.05] tracking-[-0.035em] text-balance">
            {entidade.nome}
          </h1>
          {entidade.descricao && (
            <p className="mt-4 max-w-[60ch] text-lg text-tinta-2">{entidade.descricao}</p>
          )}
          <p className="mt-4 text-sm text-cinza">
            {programas.length === 0
              ? 'Nenhum programa disponível'
              : `${programas.length} ${programas.length === 1 ? 'programa' : 'programas'}`}
          </p>
        </section>

        {/* ── Programas ──────────────────────────────────────────── */}
        <section className="pt-8">
          {programas.length === 0 ? (
            <div className="rounded-xl border border-linha bg-superficie py-16 text-center">
              <p className="text-sm text-cinza">Nenhum programa encontrado para esta instituição.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {programas.map(p => (
                <Link
                  key={p.id_programa ?? p.codigo}
                  href={`/${slug}/${(p.codigo ?? '').toLowerCase()}`}
                  className="group flex min-h-[200px] flex-col rounded-xl border border-linha bg-superficie p-6
                             transition hover:border-acao hover:ring-3 hover:ring-acao/10"
                >
                  {p.codigo && (
                    <span className="self-start rounded-md bg-mosaico px-2 py-1 font-mono text-xs font-medium text-tinta-2">
                      {p.codigo}
                    </span>
                  )}
                  <h2 className="mt-4 line-clamp-2 text-lg font-semibold leading-snug tracking-tight group-hover:text-acao">
                    {p.nome ?? p.codigo}
                  </h2>
                  {p.descricao && (
                    <p className="mt-2 line-clamp-2 text-[15px] text-tinta-2">{p.descricao}</p>
                  )}
                  <span className="mt-auto pt-5 text-[15px] font-medium text-acao">
                    Ver módulos{' '}
                    <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
