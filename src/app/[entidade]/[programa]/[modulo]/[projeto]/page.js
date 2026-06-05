import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

/* ─── Fetches ───────────────────────────────────────────────────── */

async function getEntidade(slug) {
  const { data } = await supabase.from('entidade').select('*').eq('slug', slug).single();
  return data;
}

async function getPrograma(idEntidade, codigoParam) {
  const { data } = await supabase.from('programa').select('*').eq('id_entidade', idEntidade).ilike('codigo', codigoParam).single();
  return data;
}

async function getModulo(idPrograma, moduloParam) {
  const query = supabase.from('modulo').select('*').eq('id_programa', idPrograma);
  const { data } = Number.isFinite(Number(moduloParam))
    ? await query.eq('id_modulo', Number(moduloParam)).single()
    : await query.ilike('codigo', moduloParam).single();
  return data;
}

async function getProjeto(idProjeto) {
  const { data } = await supabase.from('projetos').select('*').eq('id_projetos', idProjeto).single();
  return data;
}

async function getGaleriaProjeto(idProjeto) {
  const { data } = await supabase
    .from('media_items')
    .select('*')
    .eq('id_projetos', idProjeto)
    .order('id_media_items', { ascending: false });
  return data || [];
}

/* ─── Helper: Detetar vídeos ────────────────────────────────────── */
function isVideoUrl(url) {
  if (!url) return false;
  return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg');
}

/* ─── Metadata ──────────────────────────────────────────────────── */
export async function generateMetadata({ params }) {
  const { projeto: projetoId } = await params;
  const projeto = await getProjeto(projetoId);
  
  if (!projeto) return { title: 'Projeto não encontrado' };
  return { title: `media3d — ${projeto.titulo}`, description: projeto.descricao };
}

/* ─── Página ────────────────────────────────────────────────────── */
export default async function ProjetoPage({ params }) {
  const { entidade: entitySlug, programa: progSlug, modulo: moduloSlug, projeto: projetoId } = await params;

  /* Validações em cadeia */
  const entidade = await getEntidade(entitySlug);
  if (!entidade) notFound();
  
  const idEntidade = entidade.id_entidade ?? entidade.id;
  const programa = await getPrograma(idEntidade, progSlug);
  if (!programa) notFound();

  const modulo = await getModulo(programa.id_programa ?? programa.id, moduloSlug);
  if (!modulo) notFound();

  const projeto = await getProjeto(projetoId);
  if (!projeto || projeto.id_modulo !== modulo.id_modulo) notFound();

  /* Carrega a galeria (Modelos 3D, Imagens e Vídeos extra) */
  const galeria = await getGaleriaProjeto(projeto.id_projetos);

  const codigoCurso = programa.codigo ?? progSlug.toUpperCase();
  const codigoMod   = modulo.codigo   ?? moduloSlug.toUpperCase();
  const nomeEscola  = entidade.nome   ?? '';

  return (
    <main className="min-h-screen bg-[#0c0c0f] text-white">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0c0c0f]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
            <Link href="/" className="text-lg font-bold tracking-tight text-white/60 hover:text-white transition-colors">media3d</Link>
            <span className="text-white/15 select-none">/</span>
            <Link href={`/${entitySlug}`} className="text-sm font-medium text-white/40 hover:text-white/70 transition-colors tracking-wide">{entitySlug}</Link>
            <span className="text-white/15 select-none">/</span>
            <Link href={`/${entitySlug}/${progSlug}`} className="text-sm font-medium text-white/40 hover:text-white/70 transition-colors tracking-wide">{codigoCurso}</Link>
            <span className="text-white/15 select-none">/</span>
            <Link href={`/${entitySlug}/${progSlug}/${moduloSlug}`} className="text-sm font-medium text-white/40 hover:text-white/70 transition-colors tracking-wide">{codigoMod}</Link>
            <span className="text-white/15 select-none">/</span>
            <span className="text-sm font-semibold text-[#4f9eff] tracking-wide truncate max-w-[150px]">{projeto.titulo}</span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {nomeEscola && <span className="text-xs text-white/25 hidden md:block">{nomeEscola}</span>}
            <Link href="/admin/login" className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/50 transition hover:border-white/20 hover:text-white/80">Área Admin</Link>
          </div>
        </div>
      </header>

      {/* ── Detalhes do Projeto ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Esquerda: Recurso Principal */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/2 aspect-video flex items-center justify-center relative shadow-2xl">
              {projeto.projeto_url ? (
                isVideoUrl(projeto.projeto_url) ? (
                  <video src={projeto.projeto_url} className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
                ) : (
                  <img src={projeto.projeto_url} alt={projeto.titulo} className="w-full h-full object-cover" />
                )
              ) : (
                <span className="text-white/20 text-6xl">📁</span>
              )}
            </div>
          </div>

          {/* Direita: Informações */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
              {projeto.titulo}
            </h1>
            
            {projeto.autores && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#4f9eff]/10 px-4 py-2 border border-[#4f9eff]/20">
                <span className="text-xs uppercase font-bold tracking-wider text-[#4f9eff]">Autores</span>
                <span className="text-sm font-medium text-white/80">{projeto.autores}</span>
              </div>
            )}

            {projeto.descricao ? (
              <p className="text-lg text-white/50 leading-relaxed">
                {projeto.descricao}
              </p>
            ) : (
              <p className="text-sm text-white/30 italic">Nenhuma descrição disponível.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Galeria (Imagens, Vídeos, Modelos 3D) ───────────────── */}
      {galeria.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-24 border-t border-white/5 pt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold text-white/90">Galeria do Projeto</h2>
            <span className="text-sm font-mono text-white/30 bg-white/5 px-3 py-1 rounded-md">{galeria.length} itens</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galeria.map((item) => (
              <div key={item.id_media_items} className="group relative rounded-xl border border-white/10 bg-[#13131a] overflow-hidden aspect-video">
                
                {/* Imagem / Video */}
                {item.tipo === 'imagem' && (
                  <img src={item.url} alt={item.titulo || 'Imagem do projeto'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                {item.tipo === 'video' && (
                  <video src={item.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" muted loop playsInline autoPlay />
                )}
                
                {/* Modelo 3D (Placeholder simples por agora, até teres o visualizador 3D) */}
                {item.tipo === 'modelo3d' && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#4f9eff]/10 to-transparent">
                    <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🧊</span>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-4 py-2 bg-[#4f9eff] hover:bg-[#3d8aef] text-white text-xs font-semibold rounded-lg transition"
                    >
                      Abrir Modelo 3D
                    </a>
                  </div>
                )}

                {/* Etiqueta de Tipo */}
                <div className="absolute top-3 left-3 bg-black/60 text-white px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider backdrop-blur-md border border-white/10">
                  {item.tipo}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </main>
  );
}