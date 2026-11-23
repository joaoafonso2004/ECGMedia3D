import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Localizacao from '@/components/Localizacao';
import PalcoProjeto from '@/components/PalcoProjeto';
import FicheirosProjeto from '@/components/FicheirosProjeto';
import { getEntidade, getPrograma, getModulo, getTermosDe, idDaEntidade } from '@/lib/publico';
import { anoSemestre } from '@/lib/rotulos';
import { tipoDoUrl, tipoMedia } from '@/lib/media';
import { aoTermo } from '@/lib/terminologia';

export const dynamic = 'force-dynamic';

/* ─── Fetches ───────────────────────────────────────────────────── */

async function getProjeto(idProjeto) {
  const id = Number(idProjeto);
  if (!Number.isFinite(id)) return null;
  const { data } = await supabase.from('projetos').select('*').eq('id_projetos', id).maybeSingle();
  return data;
}

/* Modelos 3D, imagens e vídeos anexados ao projeto */
async function getGaleriaProjeto(idProjeto) {
  const { data } = await supabase
    .from('media_items')
    .select('id_media_items, titulo, tipo, url')
    .eq('id_projetos', idProjeto)
    .order('id_media_items', { ascending: false });
  return data || [];
}

/* ─── Metadata ──────────────────────────────────────────────────── */
export async function generateMetadata({ params }) {
  const { projeto: projetoId } = await params;
  const projeto = await getProjeto(projetoId);

  if (!projeto) return { title: 'Projeto não encontrado — ECGMedia3D' };
  return { title: `${projeto.titulo} — ECGMedia3D`, description: projeto.descricao };
}

/* ─── Página ────────────────────────────────────────────────────── */
export default async function ProjetoPage({ params }) {
  const { entidade: entidadeSlug, programa: programaSlug, modulo: moduloSlug, projeto: projetoId } = await params;

  /* Validações em cadeia: o projeto tem de pertencer ao módulo do URL */
  const entidade = await getEntidade(entidadeSlug);
  if (!entidade) notFound();

  const programa = await getPrograma(idDaEntidade(entidade), programaSlug);
  if (!programa) notFound();

  const modulo = await getModulo(programa.id_programa, moduloSlug);
  if (!modulo) notFound();

  const projeto = await getProjeto(projetoId);
  if (!projeto || projeto.id_modulo !== modulo.id_modulo) notFound();

  const [galeria, termos] = await Promise.all([
    getGaleriaProjeto(projeto.id_projetos),
    getTermosDe(entidade),
  ]);

  const itens = galeria.map(i => ({ id: i.id_media_items, url: i.url, tipo: i.tipo, titulo: i.titulo }));

  /* Modelo principal: o do próprio projeto, ou o primeiro modelo 3D anexado */
  const modelo = tipoDoUrl(projeto.projeto_url) === 'modelo'
    ? projeto.projeto_url
    : itens.find(i => tipoMedia(i) === 'modelo')?.url ?? null;

  const caminhoModulo = `/${entidadeSlug}/${programaSlug}/${moduloSlug}`;
  const contexto = [modulo.nome, anoSemestre(modulo.ano, modulo.semestre)].filter(Boolean).join(' · ');

  const voltar = (
    <Link href={caminhoModulo} className="botao h-11 px-5">
      <span aria-hidden="true">←</span> Voltar {aoTermo(termos.modulo)}
    </Link>
  );

  return (
    <div className="min-h-screen bg-papel text-tinta">
      <SiteHeader atual="instituicoes" />

      <main className="contentor pt-7">
        <Localizacao
          voltar
          itens={[
            { href: '/', label: 'Início' },
            { href: `/${entidadeSlug}`, label: entidade.nome },
            { href: `/${entidadeSlug}/${programaSlug}`, label: programa.codigo ?? programa.nome },
            { href: caminhoModulo, label: modulo.nome },
            { label: projeto.titulo },
          ]}
        />

        {/* ── Projeto ────────────────────────────────────────────── */}
        <section className="mt-4 grid gap-8 sm:mt-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12">
          {/* No telemóvel, o visualizador ocupa a largura toda */}
          <div className="-mx-4 sm:mx-0">
            <PalcoProjeto modelo={modelo} capa={projeto.projeto_url} titulo={projeto.titulo} />
          </div>

          <div className="lg:pt-2">
            <p className="text-[13px] font-medium text-cinza">{contexto}</p>
            <h1 className="mt-2 text-[clamp(32px,3.6vw,52px)] font-semibold leading-[1.05] tracking-[-0.04em] text-balance">
              {projeto.titulo}
            </h1>

            {projeto.autores && (
              <p className="mt-4 inline-flex flex-wrap items-baseline gap-x-2 rounded-full border border-linha-2 bg-superficie px-3.5 py-1.5 text-sm">
                <span className="text-[11px] font-medium uppercase tracking-wide text-cinza">Autores</span>
                {projeto.autores}
              </p>
            )}

            {projeto.descricao ? (
              <p className="mt-5 max-w-[60ch] whitespace-pre-line text-[17px] leading-relaxed text-tinta-2">{projeto.descricao}</p>
            ) : (
              <p className="mt-5 text-sm text-cinza">Sem descrição.</p>
            )}

            <div className="mt-8 hidden lg:block">{voltar}</div>
          </div>
        </section>

        <FicheirosProjeto itens={itens} termos={termos} />

        <div className="mt-10 lg:hidden [&>a]:w-full sm:[&>a]:w-auto">{voltar}</div>
      </main>

      <SiteFooter />
    </div>
  );
}
