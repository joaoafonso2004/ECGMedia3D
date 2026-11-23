import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Localizacao from '@/components/Localizacao';
import DisciplinasGrid from '@/components/DisciplinasGrid';
import LogoPrograma from '@/components/LogoPrograma';
import { getEntidade, getPrograma, getTermosDe, idDaEntidade } from '@/lib/publico';
import { maiuscula, minuscula, doTermo } from '@/lib/terminologia';

// Gerada a cada visita: módulos e modelos novos aparecem sem nova publicação
export const dynamic = 'force-dynamic';

/* ─── Fetches ───────────────────────────────────────────────────── */

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
  if (!entidade) return { title: 'ECGMedia3D' };

  const programa = await getPrograma(idDaEntidade(entidade), programaSlug);
  if (!programa) return { title: `${entidade.nome} — ECGMedia3D` };

  const termos = await getTermosDe(entidade);
  return {
    title: `${programa.nome ?? programa.codigo} — ECGMedia3D`,
    description: programa.descricao
      ?? `${maiuscula(termos.modulo.plural)} ${doTermo(termos.programa)} ${programa.codigo ?? programa.nome}`,
  };
}

/* ─── Página ────────────────────────────────────────────────────── */
export default async function ProgramaPage({ params }) {
  const { entidade: entidadeSlug, programa: programaSlug } = await params;

  const entidade = await getEntidade(entidadeSlug);
  if (!entidade) notFound();

  const programa = await getPrograma(idDaEntidade(entidade), programaSlug);
  if (!programa) notFound();

  const [{ data: modulos, error }, logo3d, termos] = await Promise.all([
    getModulos(programa.id_programa),
    getLogo3D(programa.id_programa),
    getTermosDe(entidade),
  ]);

  /* basePath usado pelos cartões para construir os links */
  const basePath = `/${entidadeSlug}/${programaSlug}`;
  const codigo = programa.codigo ?? programaSlug.toUpperCase();

  return (
    <div className="min-h-screen bg-papel text-tinta">
      <SiteHeader atual="instituicoes" />

      <main className="contentor">
        {/* ── Cabeçalho do programa ──────────────────────────────── */}
        <section
          className={`grid items-center gap-8 border-b border-linha pb-8 pt-7
                      ${logo3d ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]' : ''}`}
        >
          <div>
            <Localizacao
              itens={[
                { href: '/', label: 'Início' },
                { href: `/${entidadeSlug}`, label: entidade.nome },
                { label: codigo },
              ]}
            />

            <p className="mt-6 text-[13px] font-medium text-cinza">
              {termos.programa.singular} · {entidade.nome}
            </p>
            <h1 className="mt-2 text-[clamp(44px,6vw,84px)] font-semibold leading-none tracking-[-0.045em]">
              {codigo}
            </h1>
            {programa.nome && programa.nome !== codigo && (
              <p className="mt-3 text-[clamp(18px,1.6vw,22px)] font-medium tracking-tight text-balance">{programa.nome}</p>
            )}
            {programa.descricao && (
              <p className="mt-3 max-w-[60ch] text-[17px] text-tinta-2">{programa.descricao}</p>
            )}
          </div>

          {logo3d && <LogoPrograma logo={logo3d} />}
        </section>

        {/* ── Módulos ────────────────────────────────────────────── */}
        <section aria-label={maiuscula(termos.modulo.plural)} className="pt-8">
          {error ? (
            <div role="alert" className="rounded-xl border border-ecgm-r/30 bg-ecgm-r/5 p-4">
              <p className="text-sm font-semibold text-ecgm-r">
                Não foi possível carregar a lista de {minuscula(termos.modulo.plural)}.
              </p>
              <p className="mt-1 break-all font-mono text-xs text-tinta-2">{error}</p>
            </div>
          ) : (
            <DisciplinasGrid modulos={modulos} basePath={basePath} termos={termos} />
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
