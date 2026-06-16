import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DisciplinasGrid from '@/components/DisciplinasGrid';
import LogoHero from '@/components/LogoHero';

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

async function getPrograma(idEntidade, codigoParam) {
  /* O código na URL pode ser lowercase ('ecgm'), na BD pode ser 'ECGM' → ilike */
  const { data, error } = await supabase
    .from('programa')
    .select('id_programa, nome, codigo, descricao, id_entidade')
    .eq('id_entidade', idEntidade)
    .ilike('codigo', codigoParam)
    .single();

  if (error || !data) return null;
  return data;
}

async function getLogo3D(idPrograma) {
  const { data } = await supabase
    .from('media_items')
    .select('url, escala, animacao_tipo, rotacao_x, rotacao_y, rotacao_z, posicao_x, offset_y')
    .eq('tipo', 'logo3d')
    .eq('id_programa', idPrograma)
    .maybeSingle();
  return data ?? null;
}

async function getModulos(idPrograma) {
  const { data, error } = await supabase
    .from('modulo')
    .select(`
      id_modulo, id_programa, nome, codigo, descricao, ano, semestre,
      modulo_media ( media_items ( tipo, url, escala, offset_y, animacao_tipo, loop, rotacao_x, rotacao_y, rotacao_z, posicao_x ) )
    `)
    .eq('id_programa', idPrograma)
    .order('ano',      { ascending: true })
    .order('semestre', { ascending: true })
    .order('nome',     { ascending: true });

  if (error) {
    console.error('[Supabase] Erro ao carregar módulos:', error.message);
    return { data: [], error: error.message };
  }
  return { data: data ?? [], error: null };
}

/* ─── Metadata dinâmico ────────────────────────────────────────── */
export async function generateMetadata({ params }) {
  const { entidade: entidadeSlug, programa: programaSlug } = await params;

  const entidade = await getEntidade(entidadeSlug);
  if (!entidade) return { title: 'media3d' };

  const idEntidade = entidade.id_entidade ?? entidade.id;
  const programa   = await getPrograma(idEntidade, programaSlug);

  const codigoCurso = programa?.codigo  ?? programaSlug.toUpperCase();
  const descricao   = programa?.descricao ?? `Disciplinas do programa ${codigoCurso}`;

  return {
    title: `media3d — ${codigoCurso}`,
    description: descricao,
  };
}

/* ─── Página ────────────────────────────────────────────────────── */
export default async function ProgramaPage({ params }) {
  const { entidade: entidadeSlug, programa: programaSlug } = await params;

  /* 1. Entidade */
  const entidade = await getEntidade(entidadeSlug);
  if (!entidade) notFound();

  const idEntidade = entidade.id_entidade ?? entidade.id;

  /* 2. Programa */
  const programa = await getPrograma(idEntidade, programaSlug);
  if (!programa) notFound();

  /* 3. Módulos + Logo 3D */
  const [{ data: modulos, error }, logo3d] = await Promise.all([
    getModulos(programa.id_programa ?? programa.id),
    getLogo3D(programa.id_programa ?? programa.id),
  ]);

  /* basePath usado pelos DisciplinaCards para construir os links */
  const basePath = `/${entidadeSlug}/${programaSlug}`;

  const codigoCurso = programa.codigo   ?? programaSlug.toUpperCase();
  const descricao   = programa.descricao ?? '';
  const nomeEscola  = entidade.nome     ?? '';

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
            <Link
              href={`/${entidadeSlug}`}
              className="text-sm font-medium text-white/40 hover:text-white/70
                         transition-colors tracking-wide"
            >
              {entidadeSlug}
            </Link>
            <span className="text-white/15 select-none">/</span>
            <span className="text-sm font-semibold text-[#4f9eff] tracking-wide">
              {codigoCurso}
            </span>
          </div>

          {/* Nome da escola + admin */}
          <div className="flex items-center gap-4">
            {nomeEscola && (
              <span className="text-xs text-white/25 hidden md:block">{nomeEscola}</span>
            )}
            <a
              href="/admin/login"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs
                         font-medium text-white/50 transition hover:border-white/20 hover:text-white/80"
            >
              Entrar
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="px-6 pb-10 pt-20 text-center">
        <div className="mx-auto max-w-2xl">

          {/* Pill com o nome da escola */}
          {nomeEscola && (
            <span className="mb-8 inline-block rounded-full border border-[#4f9eff]/25
                             bg-[#4f9eff]/10 px-4 py-1 text-xs font-semibold uppercase
                             tracking-widest text-[#4f9eff]">
              {nomeEscola}
            </span>
          )}

          {/* Título: logo 3D ou código do curso em texto */}
          {logo3d ? (
            <div className="mx-auto" style={{ width: 560, height: 560, marginTop: '-200px', marginBottom: '-200px' }}>
              <LogoHero
                url={logo3d.url}
                escala={logo3d.escala ?? 1.0}
                animacao={logo3d.animacao_tipo ?? 'rotation'}
                width={560}
                height={560}
                rotacaoX={logo3d.rotacao_x ?? 0}
                rotacaoY={logo3d.rotacao_y ?? 0}
                rotacaoZ={logo3d.rotacao_z ?? 0}
                posicaoX={logo3d.posicao_x ?? 0}
                posicaoY={logo3d.offset_y  ?? 0}
              />
            </div>
          ) : (
            <h1 className="mt-4 text-6xl font-bold leading-none tracking-tight text-white">
              <span className="text-[#4f9eff]">{codigoCurso}</span>
            </h1>
          )}

          {/* Descrição */}
          {descricao && (
            <p className="mt-5 text-lg text-white/45 leading-relaxed max-w-xl mx-auto">
              {descricao}
            </p>
          )}

        </div>
      </section>

      {/* ── Grelha de disciplinas ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">

        {error && (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-semibold text-red-400 mb-1">⚠ Erro ao ligar ao Supabase</p>
            <p className="text-xs font-mono text-red-300/70 break-all">{error}</p>
          </div>
        )}

        {!error && (
          <DisciplinasGrid modulos={modulos} basePath={basePath} />
        )}

      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <span className="text-xs text-white/20">
            © {new Date().getFullYear()} {nomeEscola || 'media3d'} — {codigoCurso}
          </span>
          <span className="text-xs text-white/15">Next.js · Supabase · Three.js</span>
        </div>
      </footer>

    </main>
  );
}
