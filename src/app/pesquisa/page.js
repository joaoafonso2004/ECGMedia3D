import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CampoPesquisa from '@/components/CampoPesquisa';

export const dynamic = 'force-dynamic';

/* Tipos de resultado da função pesquisar() agrupados como aparecem na página.
   As cores do curso (R, G, B) distinguem projetos, disciplinas e autores. */
const GRUPOS = [
  { chave: 'projetos',    titulo: 'Projetos',    tipos: ['projeto', 'trabalho'], resumo: 6, cor: 'bg-ecgm-r' },
  { chave: 'disciplinas', titulo: 'Disciplinas', tipos: ['disciplina'],          resumo: 5, cor: 'bg-ecgm-g' },
  { chave: 'autores',     titulo: 'Autores',     tipos: ['autor'],               resumo: 4, cor: 'bg-ecgm-b' },
  { chave: 'programas',   titulo: 'Programas',   tipos: ['programa'],            resumo: 3, cor: 'bg-tinta'  },
];

const primeiro = v => (Array.isArray(v) ? v[0] : v) ?? '';
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/* ─── Fetch ─────────────────────────────────────────────────────── */
async function pesquisar(termo) {
  if (termo.length < 2) return { resultados: [], erro: null };
  const { data, error } = await supabase.rpc('pesquisar', { termo, limite: 30 });
  if (error) {
    console.error('[Supabase] Erro na pesquisa:', error.message);
    return { resultados: [], erro: error.message };
  }
  return { resultados: data ?? [], erro: null };
}

async function getSugestoes() {
  const { data } = await supabase.from('modulo').select('nome').order('nome').limit(6);
  return (data ?? []).map(m => m.nome).filter(Boolean);
}

/* ─── Metadata ──────────────────────────────────────────────────── */
export async function generateMetadata({ searchParams }) {
  const termo = primeiro((await searchParams).q).trim();
  return { title: termo ? `${termo} — Pesquisa — ECGMedia3D` : 'Pesquisa — ECGMedia3D' };
}

/* ─── Destaque do termo no texto (ignora acentos e maiúsculas) ─── */
const semAcentos = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function Destaque({ texto, termo }) {
  if (!texto) return null;
  const t = semAcentos(termo);
  if (t.length < 2) return texto;

  // Texto normalizado + posição de cada carácter no texto original
  let norm = '';
  const origem = [];
  for (let i = 0; i < texto.length; i++) {
    for (const c of semAcentos(texto[i])) { norm += c; origem.push(i); }
  }

  const partes = [];
  let desde = 0;
  for (let pos = norm.indexOf(t); pos !== -1; pos = norm.indexOf(t, pos + t.length)) {
    const ini = origem[pos];
    const fim = origem[pos + t.length - 1] + 1;
    if (ini > desde) partes.push(texto.slice(desde, ini));
    partes.push(<mark key={ini} className="rounded-sm bg-acao/15 px-0.5 text-inherit">{texto.slice(ini, fim)}</mark>);
    desde = fim;
  }
  if (desde < texto.length) partes.push(texto.slice(desde));
  return partes;
}

/* ─── Resultados ────────────────────────────────────────────────── */
function CartaoProjeto({ r, termo }) {
  return (
    <Link
      href={r.caminho}
      className="group flex flex-col overflow-hidden rounded-xl border border-linha bg-superficie transition
                 hover:border-acao hover:ring-3 hover:ring-acao/10"
    >
      <span className="relative block aspect-video bg-mosaico">
        {r.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.imagem} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-full place-items-center font-mono text-3xl font-medium text-tinta-2/40">
            {(r.titulo ?? '?').slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-md bg-superficie/90 px-2 py-0.5 text-xs font-medium text-tinta-2 backdrop-blur">
          {r.tipo === 'trabalho' ? 'Trabalho de aluno' : 'Projeto'}
        </span>
      </span>
      <span className="flex flex-1 flex-col p-4">
        <span className="font-semibold leading-snug tracking-tight group-hover:text-acao">
          <Destaque texto={r.titulo} termo={termo} />
        </span>
        {r.autores && (
          <span className="mt-1 line-clamp-1 text-sm text-tinta-2">
            por <Destaque texto={r.autores} termo={termo} />
          </span>
        )}
        {r.detalhe && <span className="mt-auto pt-3 text-[13px] text-cinza">{r.detalhe}</span>}
      </span>
    </Link>
  );
}

function LinhaResultado({ r, termo, cor }) {
  return (
    <Link
      href={r.caminho}
      className="group flex items-center gap-4 rounded-xl border border-linha bg-superficie px-4 py-3.5 transition
                 hover:border-acao hover:ring-3 hover:ring-acao/10"
    >
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${cor}`} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug tracking-tight group-hover:text-acao">
          <Destaque texto={r.titulo} termo={termo} />
        </span>
        {r.detalhe && <span className="mt-0.5 block text-sm text-cinza">{r.detalhe}</span>}
      </span>
      <span aria-hidden="true" className="text-acao transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}

function CartaoAutor({ r, termo }) {
  const trabalhos = r.trabalhos ?? [];
  const mostrados = trabalhos.slice(0, 4);
  return (
    <div className="flex gap-4 rounded-xl border border-linha bg-superficie p-4">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-ecgm-b/10 font-semibold text-ecgm-b">
        {(r.titulo ?? '?').slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug tracking-tight"><Destaque texto={r.titulo} termo={termo} /></p>
        <p className="text-sm text-cinza">{r.detalhe}</p>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {mostrados.map((t, i) => (
            <li key={`${t.caminho}-${i}`}>
              <Link
                href={t.caminho}
                className="inline-flex max-w-full rounded-md border border-linha bg-papel px-2 py-1 text-[13px] text-tinta-2
                           hover:border-acao hover:text-acao"
              >
                <span className="truncate">{t.titulo}</span>
              </Link>
            </li>
          ))}
          {trabalhos.length > mostrados.length && (
            <li className="px-1 py-1 text-[13px] text-cinza">e mais {trabalhos.length - mostrados.length}</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Grupo({ grupo, itens, termo, completo }) {
  const visiveis = completo ? itens : itens.slice(0, grupo.resumo);
  const lista = grupo.chave === 'projetos'
    ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
    : grupo.chave === 'autores' ? 'grid gap-3 md:grid-cols-2' : 'grid gap-2.5';

  return (
    <section aria-labelledby={`grupo-${grupo.chave}`} className="pt-10">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id={`grupo-${grupo.chave}`} className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <span aria-hidden="true" className={`size-2.5 rounded-full ${grupo.cor}`} />
          {grupo.titulo}
          <span className="text-base font-normal text-cinza">{itens.length}</span>
        </h2>
        {!completo && itens.length > visiveis.length && (
          <Link
            href={`/pesquisa?q=${encodeURIComponent(termo)}&tipo=${grupo.chave}`}
            className="text-[15px] font-medium text-acao hover:underline"
          >
            Ver {itens.length}
          </Link>
        )}
      </div>
      <div className={lista}>
        {visiveis.map((r, i) => {
          const chave = `${r.tipo}-${r.caminho ?? r.titulo}-${i}`;
          if (grupo.chave === 'projetos') return <CartaoProjeto key={chave} r={r} termo={termo} />;
          if (grupo.chave === 'autores')  return <CartaoAutor key={chave} r={r} termo={termo} />;
          return <LinhaResultado key={chave} r={r} termo={termo} cor={grupo.cor} />;
        })}
      </div>
    </section>
  );
}

/* ─── Página ────────────────────────────────────────────────────── */
export default async function PesquisaPage({ searchParams }) {
  const params = await searchParams;
  const termo = primeiro(params.q).trim().slice(0, 100);
  const filtro = GRUPOS.find(g => g.chave === primeiro(params.tipo)) ?? null;

  const [{ resultados, erro }, sugestoes] = await Promise.all([
    pesquisar(termo),
    termo ? [] : getSugestoes(),
  ]);

  const grupos = GRUPOS
    .map(g => ({ grupo: g, itens: resultados.filter(r => g.tipos.includes(r.tipo)) }))
    .filter(({ itens }) => itens.length > 0);
  const total = grupos.reduce((n, { itens }) => n + itens.length, 0);
  const mostrados = filtro ? grupos.filter(({ grupo }) => grupo === filtro) : grupos;

  const filtroLink = chave =>
    `/pesquisa?q=${encodeURIComponent(termo)}${chave ? `&tipo=${chave}` : ''}`;

  return (
    <div className="min-h-screen bg-papel text-tinta">
      <SiteHeader atual="pesquisa" />

      <main className="contentor">
        <section className="max-w-3xl pt-10 md:pt-14">
          <h1 className="text-[clamp(30px,3.4vw,48px)] font-semibold leading-[1.05] tracking-[-0.035em]">Pesquisa</h1>
          <p className="mt-2 text-tinta-2">Procura em todas as instituições: projetos, trabalhos dos alunos, disciplinas, autores e programas.</p>
          <div className="mt-6">
            <CampoPesquisa termoInicial={termo} />
          </div>
        </section>

        {/* Filtros por tipo */}
        {total > 0 && (
          <nav aria-label="Tipo de resultado" className="mt-6 flex flex-wrap gap-2">
            {[{ chave: '', titulo: 'Tudo', n: total }, ...grupos.map(({ grupo, itens }) => ({ ...grupo, n: itens.length }))]
              .map(f => {
                const ativo = (filtro?.chave ?? '') === f.chave;
                return (
                  <Link
                    key={f.chave || 'tudo'}
                    href={filtroLink(f.chave)}
                    scroll={false}
                    aria-current={ativo ? 'page' : undefined}
                    className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[14.5px] font-medium transition-colors
                      ${ativo ? 'border-tinta bg-tinta text-white' : 'border-linha-2 bg-superficie text-tinta-2 hover:border-tinta hover:text-tinta'}`}
                  >
                    {f.titulo}
                    <span className={ativo ? 'text-white/60' : 'text-cinza'}>{f.n}</span>
                  </Link>
                );
              })}
          </nav>
        )}

        {erro && (
          <div role="alert" className="mt-8 rounded-xl border border-ecgm-r/30 bg-ecgm-r/5 p-4">
            <p className="text-sm font-semibold text-ecgm-r">Não foi possível pesquisar.</p>
            <p className="mt-1 break-all font-mono text-xs text-tinta-2">{erro}</p>
          </div>
        )}

        {/* Sem termo: sugestões */}
        {!termo && sugestoes.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[13px] font-medium text-cinza">Experimente</h2>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {sugestoes.map(s => (
                <li key={s}>
                  <Link href={`/pesquisa?q=${encodeURIComponent(s)}`} className="botao">{s}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {termo.length === 1 && (
          <p className="mt-8 text-cinza">Escreva pelo menos 2 letras.</p>
        )}

        {termo.length >= 2 && !erro && total === 0 && (
          <div className="mt-8 rounded-xl border border-linha bg-superficie px-6 py-14 text-center">
            <p className="font-semibold">Sem resultados para “{termo}”.</p>
            <p className="mt-1.5 text-sm text-cinza">Experimente outra palavra, o nome de uma disciplina ou de um autor.</p>
          </div>
        )}

        {termo.length >= 2 && total > 0 && (
          <p className="sr-only" role="status">{plural(total, 'resultado', 'resultados')} para {termo}</p>
        )}

        {mostrados.map(({ grupo, itens }) => (
          <Grupo key={grupo.chave} grupo={grupo} itens={itens} termo={termo} completo={!!filtro} />
        ))}
      </main>

      <SiteFooter />
    </div>
  );
}
