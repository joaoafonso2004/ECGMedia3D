import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Localizacao from '@/components/Localizacao';
import GaleriaDisciplina from '@/components/GaleriaDisciplina';
import { getEntidade, getPrograma, getModulo, getTermosDe, idDaEntidade } from '@/lib/publico';
import { anoSemestre } from '@/lib/rotulos';
import { maiuscula, doTermo } from '@/lib/terminologia';

export const dynamic = 'force-dynamic'; // Força a atualização em tempo real sem cache estática

/* ─── Fetches ───────────────────────────────────────────────────── */

async function getProjetosDaDisciplina(idModulo) {
  const { data, error } = await supabase
    .from('projetos')
    .select('id_projetos, titulo, descricao, autores, projeto_url')
    .eq('id_modulo', idModulo)
    .order('id_projetos', { ascending: false });

  if (error) return [];
  return data || [];
}

/* Biblioteca da comunidade: só os trabalhos aprovados pelo gestor */
async function getBibliotecaComunidade(idModulo) {
  const { data } = await supabase
    .from('media_items')
    .select(`
      id_media_items,
      titulo,
      tipo,
      url,
      autor:id_autor (nome)
    `)
    .eq('id_modulo', idModulo)
    .eq('status', 'aprovado')
    .order('id_media_items', { ascending: false });
  return data || [];
}

/* ─── Metadata dinâmico ────────────────────────────────────────── */
export async function generateMetadata({ params }) {
  const { entidade: entidadeSlug, programa: programaSlug, modulo: moduloSlug } = await params;

  const entidade = await getEntidade(entidadeSlug);
  if (!entidade) return { title: 'ECGMedia3D' };

  const programa = await getPrograma(idDaEntidade(entidade), programaSlug);
  if (!programa) return { title: `${entidade.nome} — ECGMedia3D` };

  const [modulo, termos] = await Promise.all([
    getModulo(programa.id_programa, moduloSlug),
    getTermosDe(entidade),
  ]);
  if (!modulo) return { title: `${programa.nome ?? programa.codigo} — ECGMedia3D` };

  return {
    title: `${modulo.nome} — ECGMedia3D`,
    description: modulo.descricao ?? `${maiuscula(termos.projeto.plural)} ${doTermo(termos.modulo)} ${modulo.nome}`,
  };
}

/* ─── Página ────────────────────────────────────────────────────── */
export default async function ModuloPage({ params, searchParams }) {
  const { entidade: entidadeSlug, programa: programaSlug, modulo: moduloSlug } = await params;
  const { ver } = await searchParams; // ?ver=<id>: abre esse trabalho (links da pesquisa)

  const entidade = await getEntidade(entidadeSlug);
  if (!entidade) notFound();

  const programa = await getPrograma(idDaEntidade(entidade), programaSlug);
  if (!programa) notFound();

  const modulo = await getModulo(programa.id_programa, moduloSlug);
  if (!modulo) notFound();

  const [projetos, comunidade, termos] = await Promise.all([
    getProjetosDaDisciplina(modulo.id_modulo),
    getBibliotecaComunidade(modulo.id_modulo),
    getTermosDe(entidade),
  ]);

  const caminhoPrograma = `/${entidadeSlug}/${programaSlug}`;
  const periodo = anoSemestre(modulo.ano, modulo.semestre);

  return (
    <div className="min-h-screen bg-papel text-tinta">
      <SiteHeader atual="instituicoes" />

      <main className="contentor">
        {/* ── Cabeçalho do módulo ────────────────────────────────── */}
        <section className="border-b border-linha pb-8 pt-7">
          <Localizacao
            itens={[
              { href: '/', label: 'Início' },
              { href: `/${entidadeSlug}`, label: entidade.nome },
              { href: caminhoPrograma, label: programa.codigo ?? programa.nome },
              { label: modulo.nome },
            ]}
          />

          <div className="mt-6 flex flex-wrap items-center gap-2 text-[13px] font-medium text-cinza">
            {modulo.codigo && (
              <span className="rounded-md bg-mosaico px-2 py-0.5 font-mono text-xs text-tinta-2">{modulo.codigo}</span>
            )}
            {periodo && <span>{periodo}</span>}
          </div>
          <h1 className="mt-3 text-[clamp(34px,4.4vw,64px)] font-semibold leading-[1.04] tracking-[-0.04em] text-balance">
            {modulo.nome}
          </h1>
          {modulo.descricao && (
            <p className="mt-4 max-w-[62ch] text-[17px] text-tinta-2">{modulo.descricao}</p>
          )}
        </section>

        {/* ── Projetos e biblioteca ──────────────────────────────── */}
        <GaleriaDisciplina
          projetos={projetos}
          comunidade={comunidade}
          base={`${caminhoPrograma}/${moduloSlug}`}
          abrirId={ver}
          termos={termos}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
