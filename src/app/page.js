import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'ECGMedia3D',
  description: 'Plataforma de visualização 3D dos projetos dos alunos de Engenharia da Computação Gráfica e Multimédia',
};

/* ─── Fetch ─────────────────────────────────────────────────────── */
async function getEntidades() {
  // Tenta trazer o número de programas de cada entidade na mesma consulta
  const comContagem = await supabase
    .from('entidade')
    .select('id_entidade, nome, tipo, slug, programa(count)')
    .order('nome', { ascending: true });
  if (!comContagem.error) return { data: comContagem.data ?? [], error: null };

  const { data, error } = await supabase
    .from('entidade')
    .select('id_entidade, nome, tipo, slug')
    .order('nome', { ascending: true });

  if (error) {
    console.error('[Supabase] Erro ao carregar entidades:', error.message);
    return { data: [], error: error.message };
  }
  return { data: data ?? [], error: null };
}

async function contar(tabela) {
  const { count, error } = await supabase.from(tabela).select('*', { count: 'exact', head: true });
  return error ? null : count;
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const numProgramas = e => e.programa?.[0]?.count;
const sigla = e => (e.slug ?? e.nome ?? '').toUpperCase().slice(0, 6);

const PASSOS = [
  {
    titulo: 'Explorar',
    texto: 'A navegação segue a estrutura da instituição: entidade, programa, módulo e projeto.',
  },
  {
    titulo: 'Ver em 3D',
    texto: 'Cada módulo tem o seu modelo 3D, que anima quando se passa o rato por cima do cartão.',
  },
  {
    titulo: 'Publicar',
    texto: 'O aluno submete o trabalho e o gestor do módulo aprova ou rejeita. Os dois recebem uma notificação em tempo real e só os trabalhos aprovados aparecem no site público.',
  },
];

/* ─── Página ────────────────────────────────────────────────────── */
export default async function HomePage() {
  const [{ data: entidades, error }, programas, modulos, projetos] = await Promise.all([
    getEntidades(), contar('programa'), contar('modulo'), contar('projetos'),
  ]);

  const numeros = [
    [error ? null : entidades.length, 'instituições'],
    [programas, 'programas'],
    [modulos, 'módulos'],
    [projetos, 'projetos publicados'],
  ].filter(([n]) => typeof n === 'number');

  return (
    <div className="min-h-screen bg-papel text-tinta">
      <SiteHeader atual="inicio" />

      <main className="contentor">
        {/* ── Apresentação ───────────────────────────────────────── */}
        <section className="max-w-3xl pt-12 md:pt-20">
          <p className="text-[13px] font-medium text-cinza">UNIPVC · Escola Superior de Tecnologia e Gestão</p>
          <h1 className="mt-4 text-[clamp(36px,4.6vw,70px)] font-semibold leading-[1.03] tracking-[-0.035em] text-balance">
            Projetos dos alunos de Engenharia da Computação Gráfica e Multimédia
          </h1>
          <p className="mt-5 max-w-[54ch] text-[clamp(17px,1.25vw,19px)] text-tinta-2">
            Modelos 3D, animações e trabalhos multimédia, organizados por instituição, programa e módulo.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <a href="#instituicoes" className="botao-acao">Ver instituições</a>
            <a href="#como-funciona" className="botao">Como funciona</a>
          </div>
        </section>

        {/* ── Números ────────────────────────────────────────────── */}
        {numeros.length > 0 && (
          <section aria-label="Números da plataforma" className="mt-14 grid grid-cols-2 rounded-xl border border-linha bg-superficie md:grid-cols-4">
            {numeros.map(([n, legenda], i) => (
              <div
                key={legenda}
                className={`border-linha px-6 py-5 ${i % 2 === 1 ? 'border-l' : ''} ${i === 2 ? 'md:border-l' : ''} ${i >= 2 ? 'border-t md:border-t-0' : ''}`}
              >
                <b className="block text-3xl font-semibold tracking-tight tabular-nums">{n}</b>
                <span className="text-sm text-cinza">{legenda}</span>
              </div>
            ))}
          </section>
        )}

        {/* ── Instituições ───────────────────────────────────────── */}
        <section id="instituicoes" className="scroll-mt-24 pt-16 md:pt-24">
          <div className="mb-6">
            <h2 className="text-[clamp(24px,2.4vw,34px)] font-semibold tracking-[-0.028em]">Instituições</h2>
            <p className="mt-1.5 text-cinza">Escolha uma entidade para ver os seus programas.</p>
          </div>

          {error && (
            <div role="alert" className="mb-6 rounded-xl border border-ecgm-r/30 bg-ecgm-r/5 p-4">
              <p className="text-sm font-semibold text-ecgm-r">Não foi possível carregar as instituições.</p>
              <p className="mt-1 break-all font-mono text-xs text-tinta-2">{error}</p>
            </div>
          )}

          {!error && entidades.length === 0 && (
            <p className="rounded-xl border border-linha bg-superficie py-16 text-center text-sm text-cinza">
              Ainda não há instituições.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entidades.map(e => (
              <Link
                key={e.id_entidade ?? e.slug}
                href={`/${e.slug}`}
                className="group flex items-center gap-4 rounded-xl border border-linha bg-superficie p-3
                           transition hover:border-acao hover:ring-3 hover:ring-acao/10"
              >
                <span aria-hidden="true" className="grid size-20 shrink-0 place-items-center rounded-lg bg-mosaico font-mono text-sm font-medium text-tinta-2">
                  {sigla(e)}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-snug tracking-tight group-hover:text-acao">{e.nome}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-cinza">
                    {e.tipo && (
                      <span className="rounded-full bg-acao/10 px-2 py-0.5 text-xs font-medium capitalize text-acao">{e.tipo}</span>
                    )}
                    {typeof numProgramas(e) === 'number' && plural(numProgramas(e), 'programa', 'programas')}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Como funciona ──────────────────────────────────────── */}
        <section id="como-funciona" className="scroll-mt-24 pt-16 md:pt-24">
          <h2 className="text-[clamp(24px,2.4vw,34px)] font-semibold tracking-[-0.028em]">Como funciona</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="rounded-xl border border-linha bg-superficie p-6">
                <span className="mb-4 grid size-8 place-items-center rounded-full bg-acao text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="text-lg font-semibold tracking-tight">{p.titulo}</h3>
                <p className="mt-2 text-[15px] text-tinta-2">{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Área reservada ─────────────────────────────────────── */}
        <section className="mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl bg-tinta p-7 text-white md:mt-24 md:flex-row md:items-center md:p-11">
          <div>
            <h2 className="text-[clamp(24px,2.4vw,34px)] font-semibold tracking-[-0.028em]">Área de alunos e gestores</h2>
            <p className="mt-2 max-w-[60ch] text-white/70">
              Os alunos entram com a conta criada pelo gestor do módulo, carregam o modelo GLB e pedem aprovação.
              O projeto fica público depois de aprovado.
            </p>
          </div>
          <Link href="/admin/login" className="botao">Entrar na plataforma</Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
