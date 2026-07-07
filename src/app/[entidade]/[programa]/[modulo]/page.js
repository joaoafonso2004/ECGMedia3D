import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import GaleriaProjeto from './[projeto]/galeriaProjeto';

export const dynamic = 'force-dynamic'; // Força a atualização em tempo real sem cache estática

/* ─── Fetches ───────────────────────────────────────────────────── */

async function getEntidade(slug) {
  const { data, error } = await supabase.from('entidade').select('*').eq('slug', slug).single();
  if (error || !data) return null;
  return data;
}

async function getPrograma(idEntidade, codigoParam) {
  const { data, error } = await supabase
    .from('programa')
    .select('id_programa, nome, codigo, descricao, id_entidade') // CORRIGIDO: de description para descricao
    .eq('id_entidade', idEntidade)
    .ilike('codigo', codigoParam)
    .single();

  if (error || !data) return null;
  return data;
}

async function getModulo(idPrograma, moduloParam) {
  const moduloId = Number(moduloParam);
  const query = supabase.from('modulo').select('*').eq('id_programa', idPrograma);

  const { data, error } = Number.isFinite(moduloId)
    ? await query.eq('id_modulo', moduloId).single()
    : await query.ilike('codigo', moduloParam).single();

  if (error || !data) return null;
  return data;
}

async function getProjetosDaDisciplina(idModulo) {
  const { data, error } = await supabase
    .from('projetos')
    .select('id_projetos, titulo, descricao, autores, projeto_url')
    .eq('id_modulo', idModulo)
    .order('id_projetos', { ascending: false });

  if (error) return [];
  return data || [];
}

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
  if (!entidade) return { title: 'ECGMedia3d' };

  const idEntidade = entidade.id_entidade ?? entidade.id; // CORRIGIDO: de entity.id para entidade.id
  const programa   = await getPrograma(idEntidade, programaSlug);
  if (!programa) return { title: `ECGMedia3d — ${entidadeSlug}` };

  const modulo = await getModulo(programa.id_programa ?? programa.id, moduloSlug);
  const nomeModulo = modulo?.nome ?? moduloSlug.toUpperCase();

  return {
    title: `ECGMedia3d — ${nomeModulo}`,
    description: modulo?.descricao ?? `Projetos da disciplina ${nomeModulo}`,
  };
}

/* ─── Página ────────────────────────────────────────────────────── */
export default async function ModuloPage({ params }) {
  const { entidade: entitySlug, programa: progSlug, modulo: moduloSlug } = await params;

  const entidade = await getEntidade(entitySlug);
  if (!entidade) notFound();
  const idEntidade = entidade.id_entidade ?? entidade.id;

  const programa = await getPrograma(idEntidade, progSlug);
  if (!programa) notFound();

  const modulo = await getModulo(programa.id_programa ?? programa.id, moduloSlug);
  if (!modulo) notFound();

  // Chamadas concorrentes às tabelas do Supabase
  const projetos = await getProjetosDaDisciplina(modulo.id_modulo);
  const comunidade = await getBibliotecaComunidade(modulo.id_modulo);

  const codigoCurso = programa.codigo ?? progSlug.toUpperCase();
  const codigoMod   = modulo.codigo   ?? moduloSlug.toUpperCase();
  const nomeEscola  = entidade.nome   ?? '';

  return (
    <main className="min-h-screen bg-[#0c0c0f] text-white flex flex-col">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0c0c0f]/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
            <Link href="/" className="text-lg font-bold tracking-tight text-white/60 hover:text-white transition-colors">ECGMedia3d</Link>
            <span className="text-white/15 select-none">/</span>
            <Link href={`/${entitySlug}`} className="text-sm font-medium text-white/40 hover:text-white/70 transition-colors tracking-wide">{entitySlug}</Link>
            <span className="text-white/15 select-none">/</span>
            <Link href={`/${entitySlug}/${progSlug}`} className="text-sm font-medium text-white/40 hover:text-white/70 transition-colors tracking-wide">{codigoCurso}</Link>
            <span className="text-white/15 select-none">/</span>
            <span className="text-sm font-semibold text-[#4f9eff] tracking-wide">{codigoMod}</span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {nomeEscola && <span className="text-xs text-white/25 hidden md:block">{nomeEscola}</span>}
            <a href="/admin/login" className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/50 transition hover:border-white/20 hover:text-white/80">Entrar</a>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="px-6 pb-12 pt-20 text-center">
        <div className="mx-auto max-w-3xl">
          {(modulo.ano != null || modulo.semestre != null) && (
            <span className="mb-6 inline-block rounded-full border border-[#4f9eff]/25 bg-[#4f9eff]/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#4f9eff]">
              {modulo.ano ? `${modulo.ano}º Ano` : ''} 
              {modulo.ano && modulo.semestre ? ' • ' : ''} 
              {modulo.semestre ? `${modulo.semestre}º Semestre` : ''}
            </span>
          )}
          <h1 className="mt-2 text-5xl md:text-6xl font-bold leading-tight tracking-tight text-white">{modulo.nome}</h1>
          {modulo.descricao && <p className="mt-6 text-lg text-white/45 leading-relaxed max-w-2xl mx-auto">{modulo.descricao}</p>}
        </div>
      </section>

      {/* ── Galeria Interativa com Abas (Controla a exibição de Projetos e Comunidade) ── */}
      <GaleriaProjeto 
        galeria={[]} 
        comunidade={comunidade} 
        projetos={projetos} 
        isPaginaDisciplina={true}
        entitySlug={entitySlug}
        progSlug={progSlug}
        moduloSlug={moduloSlug}
      />

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-6 mt-auto">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <span className="text-xs text-white/20">© {new Date().getFullYear()} {nomeEscola || 'ECGMedia3d'} — {codigoMod}</span>
          <span className="text-xs text-white/15">Next.js · Supabase · Three.js</span>
        </div>
      </footer>

    </main>
  );
}