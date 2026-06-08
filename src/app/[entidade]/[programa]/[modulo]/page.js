import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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
  const { data, error } = await supabase
    .from('programa')
    .select('id_programa, nome, codigo, descricao, id_entidade')
    .eq('id_entidade', idEntidade)
    .ilike('codigo', codigoParam)
    .single();

  if (error || !data) return null;
  return data;
}

async function getModulo(idPrograma, moduloParam) {
  const moduloId = Number(moduloParam);

  const query = supabase
    .from('modulo')
    .select('*')
    .eq('id_programa', idPrograma);

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

  if (error) {
    console.error('[Supabase] Erro ao carregar projetos do módulo:', error.message);
    return [];
  }
  
  return data || [];
}

/* ─── Metadata dinâmico ────────────────────────────────────────── */
export async function generateMetadata({ params }) {
  const { entidade: entidadeSlug, programa: programaSlug, modulo: moduloSlug } = await params;

  const entidade = await getEntidade(entidadeSlug);
  if (!entidade) return { title: 'media3d' };

  const idEntidade = entidade.id_entidade ?? entidade.id;
  const programa   = await getPrograma(idEntidade, programaSlug);
  if (!programa) return { title: `media3d — ${entidadeSlug}` };

  const modulo = await getModulo(programa.id_programa ?? programa.id, moduloSlug);
  
  const nomeModulo = modulo?.nome ?? moduloSlug.toUpperCase();

  return {
    title: `media3d — ${nomeModulo}`,
    description: modulo?.descricao ?? `Projetos da disciplina ${nomeModulo}`,
  };
}

/* ─── Página ────────────────────────────────────────────────────── */
export default async function ModuloPage({ params }) {
  const { entidade: entitySlug, programa: progSlug, modulo: moduloSlug } = await params;

  /* 1. Valida Entidade */
  const entidade = await getEntidade(entitySlug);
  if (!entidade) notFound();
  const idEntidade = entidade.id_entidade ?? entidade.id;

  /* 2. Valida Programa */
  const programa = await getPrograma(idEntidade, progSlug);
  if (!programa) notFound();

  /* 3. Valida Módulo (Disciplina) */
  const modulo = await getModulo(programa.id_programa ?? programa.id, moduloSlug);
  if (!modulo) notFound();

  /* 4. Carrega Projetos associados à disciplina */
  const projetos = await getProjetosDaDisciplina(modulo.id_modulo);

  const codigoCurso = programa.codigo ?? progSlug.toUpperCase();
  const codigoMod   = modulo.codigo   ?? moduloSlug.toUpperCase();
  const nomeEscola  = entidade.nome   ?? '';

  return (
    <main className="min-h-screen bg-[#0c0c0f] text-white">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0c0c0f]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
            <Link href="/" className="text-lg font-bold tracking-tight text-white/60 hover:text-white transition-colors">
              media3d
            </Link>
            <span className="text-white/15 select-none">/</span>
            <Link href={`/${entitySlug}`} className="text-sm font-medium text-white/40 hover:text-white/70 transition-colors tracking-wide">
              {entitySlug}
            </Link>
            <span className="text-white/15 select-none">/</span>
            <Link href={`/${entitySlug}/${progSlug}`} className="text-sm font-medium text-white/40 hover:text-white/70 transition-colors tracking-wide">
              {codigoCurso}
            </Link>
            <span className="text-white/15 select-none">/</span>
            <span className="text-sm font-semibold text-[#4f9eff] tracking-wide">
              {codigoMod}
            </span>
          </div>

          {/* Nome da escola + admin */}
          <div className="flex items-center gap-4 shrink-0">
            {nomeEscola && (
              <span className="text-xs text-white/25 hidden md:block">{nomeEscola}</span>
            )}
            <a
              href="/admin/login"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs
                         font-medium text-white/50 transition hover:border-white/20 hover:text-white/80"
            >
              Área Admin
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="px-6 pb-16 pt-20 text-center">
        <div className="mx-auto max-w-3xl">

          {/* Ano e Semestre da Disciplina */}
          {(modulo.ano != null || modulo.semestre != null) && (
            <span className="mb-6 inline-block rounded-full border border-[#4f9eff]/25
                             bg-[#4f9eff]/10 px-4 py-1 text-xs font-semibold uppercase
                             tracking-widest text-[#4f9eff]">
              {modulo.ano ? `${modulo.ano}º Ano` : ''} 
              {modulo.ano && modulo.semestre ? ' • ' : ''} 
              {modulo.semestre ? `${modulo.semestre}º Semestre` : ''}
            </span>
          )}

          {/* Nome da Disciplina */}
          <h1 className="mt-2 text-5xl md:text-6xl font-bold leading-tight tracking-tight text-white">
            {modulo.nome}
          </h1>

          {/* Descrição */}
          {modulo.descricao && (
            <p className="mt-6 text-lg text-white/45 leading-relaxed max-w-2xl mx-auto">
              {modulo.descricao}
            </p>
          )}

        </div>
      </section>

      {/* ── Grelha de Projetos ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
          <h2 className="text-xl font-semibold text-white/90">Projetos Publicados</h2>
          <span className="text-sm font-mono text-white/30 bg-white/5 px-3 py-1 rounded-md">
            {projetos.length} {projetos.length === 1 ? 'projeto' : 'projetos'}
          </span>
        </div>

        {projetos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 py-20 text-center">
            <span className="text-4xl block mb-4 opacity-30">📁</span>
            <p className="text-white/40 text-sm">Ainda não foram publicados projetos nesta disciplina.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projetos.map((projeto) => (
              <Link 
                href={`/${entitySlug}/${progSlug}/${moduloSlug}/${projeto.id_projetos}`}
                key={projeto.id_projetos}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#13131a] transition-all hover:border-[#4f9eff]/40 hover:bg-[#181820] cursor-pointer"
              >
                {/* Contentor de Capa Visual (Proporção 16:9) ── Suporta Imagem e Vídeo */}
                <div className="relative aspect-video w-full overflow-hidden bg-white/2 border-b border-white/5">
                  {projeto.projeto_url ? (
                    projeto.projeto_url.endsWith('.mp4') || projeto.projeto_url.endsWith('.webm') ? (
                      <video 
                        src={projeto.projeto_url} 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        muted 
                        loop 
                        playsInline 
                        autoPlay 
                      />
                    ) : (
                      <img 
                        src={projeto.projeto_url} 
                        alt={projeto.titulo} 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/15 text-3xl bg-gradient-to-br from-white/3 to-transparent">
                      📁
                    </div>
                  )}
                </div>

                {/* Dados de Texto do Projeto */}
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white/90 group-hover:text-white transition-colors line-clamp-1">
                      {projeto.titulo}
                    </h3>
                    {projeto.descricao && (
                      <p className="mt-2 text-sm text-white/40 line-clamp-3 leading-relaxed">
                        {projeto.descricao}
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-6 flex flex-col gap-3 border-t border-white/5 pt-4">
                    {projeto.autores && (
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-white/20 pt-0.5">Autores</span>
                        <p className="text-xs font-medium text-white/60 leading-tight line-clamp-2">
                          {projeto.autores}
                        </p>
                      </div>
                    )}
                    
                    {/* O antigo link foi transformado numa span porque a caixa inteira agora é o Link */}
                    <span className="mt-1 text-xs font-semibold text-[#4f9eff]/80 group-hover:text-[#4f9eff] transition-colors self-start">
                      Ver Projeto →
                    </span>
                  </div>
                </div>

              </Link>
            ))}
          </div>
        )}

      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-6 mt-auto">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <span className="text-xs text-white/20">
            © {new Date().getFullYear()} {nomeEscola || 'media3d'} — {codigoMod}
          </span>
          <span className="text-xs text-white/15">Next.js · Supabase · Three.js</span>
        </div>
      </footer>

    </main>
  );
}