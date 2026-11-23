'use client';

import { useState, useMemo } from 'react';
import DisciplinaCard from './DisciplinaCard';
import { IconePesquisa, IconeFechar } from './Icones';
import { resolverTermos, contar, procurar, nenhumEncontrado } from '@/lib/terminologia';
import { rotuloAno, rotuloSemestre, rotuloSemestreCurto } from '@/lib/rotulos';

/* ─── Helpers ──────────────────────────────────────────────────── */

/** Pesquisa sem acentos nem maiúsculas ("animacao" encontra "Animação") */
const normalizar = texto =>
  String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Ordena a lista:
 *  - null  → natural: ano ↑ · semestre ↑ · nome ↑
 *  - 'az'  → nome ↑ (global)
 *  - 'za'  → nome ↓ (global)
 */
function sortModulos(list, ordem) {
  return [...list].sort((a, b) => {
    if (ordem === 'az')
      return a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' });
    if (ordem === 'za')
      return b.nome.localeCompare(a.nome, 'pt', { sensitivity: 'base' });

    // Natural
    const dAno = (Number(a.ano) || 0) - (Number(b.ano) || 0);
    if (dAno !== 0) return dAno;

    const sa = isNaN(Number(a.semestre)) ? a.semestre : Number(a.semestre);
    const sb = isNaN(Number(b.semestre)) ? b.semestre : Number(b.semestre);
    if (sa !== sb) {
      if (typeof sa === 'number' && typeof sb === 'number') return sa - sb;
      return String(sa).localeCompare(String(sb));
    }

    return a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' });
  });
}

/** Lista já ordenada → [{ ano, total, semestres: [{ semestre, modulos }] }] */
function agrupar(lista) {
  const grupos = [];
  for (const m of lista) {
    const ano = m.ano ?? null;
    const semestre = m.semestre ?? null;
    let g = grupos.at(-1);
    if (!g || g.ano !== ano) {
      g = { ano, total: 0, semestres: [] };
      grupos.push(g);
    }
    let s = g.semestres.at(-1);
    if (!s || s.semestre !== semestre) {
      s = { semestre, modulos: [] };
      g.semestres.push(s);
    }
    s.modulos.push(m);
    g.total += 1;
  }
  return grupos;
}

/* ─── Botão de filtro (liga/desliga) ──────────────────────────── */
function Filtro({ ativo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`h-9 shrink-0 rounded-full border px-3.5 text-sm transition-colors
        ${ativo
          ? 'border-tinta bg-tinta font-medium text-papel'
          : 'border-linha-2 bg-superficie text-tinta-2 hover:border-tinta hover:text-tinta'}`}
    >
      {children}
    </button>
  );
}

function GrupoFiltros({ titulo, children }) {
  return (
    <div role="group" aria-label={titulo} className="flex shrink-0 items-center gap-2 sm:flex-wrap">
      <span className="mr-1 text-sm font-medium text-tinta">{titulo}</span>
      {children}
    </div>
  );
}

/* ─── Componente principal ────────────────────────────────────── */
export default function DisciplinasGrid({ modulos, basePath = '', termos = null }) {
  const t = termos ?? resolverTermos();
  const [pesquisa,   setPesquisa]   = useState('');
  const [anoFilter,  setAnoFilter]  = useState(null); // null = todos
  const [semFilter,  setSemFilter]  = useState(null);
  const [ordem,      setOrdem]      = useState(null); // null = natural, agrupado por ano e semestre

  /* Valores únicos para os filtros */
  const anos = useMemo(() =>
    [...new Set(modulos.map(m => m.ano).filter(v => v != null))]
      .sort((a, b) => Number(a) - Number(b)),
    [modulos]
  );

  const semestres = useMemo(() =>
    [...new Set(modulos.map(m => m.semestre).filter(v => v != null))]
      .sort((a, b) => {
        const na = Number(a), nb = Number(b);
        return (!isNaN(na) && !isNaN(nb)) ? na - nb : String(a).localeCompare(String(b));
      }),
    [modulos]
  );

  /* Filtrar + ordenar (só no cliente, sem novas chamadas à BD) */
  const visiveis = useMemo(() => {
    let r = modulos;

    if (pesquisa.trim()) {
      const q = normalizar(pesquisa.trim());
      r = r.filter(m => normalizar(m.nome).includes(q) || normalizar(m.codigo).includes(q));
    }
    if (anoFilter != null) r = r.filter(m => m.ano === anoFilter);
    if (semFilter != null) r = r.filter(m => m.semestre === semFilter);

    return sortModulos(r, ordem);
  }, [modulos, pesquisa, anoFilter, semFilter, ordem]);

  /* Agrupa por ano e semestre só na ordem natural e se houver anos ou semestres */
  const temPeriodos = anos.length > 0 || semestres.length > 0;
  const grupos = ordem == null && temPeriodos ? agrupar(visiveis) : null;

  const filtrosActivos = pesquisa || anoFilter != null || semFilter != null || ordem != null;

  function limparTudo() {
    setPesquisa(''); setAnoFilter(null); setSemFilter(null); setOrdem(null);
  }

  const cartoes = lista => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {lista.map(m => (
        <DisciplinaCard key={m.id_modulo} disciplina={m} basePath={basePath} termos={t} />
      ))}
    </div>
  );

  return (
    <div>
      {/* ── Pesquisa dentro do programa ────────────────────────── */}
      <div className="relative">
        <label htmlFor="pesquisa-modulos" className="sr-only">{procurar(t.modulo)}</label>
        <IconePesquisa tamanho={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cinza" />
        <input
          id="pesquisa-modulos"
          type="search"
          autoComplete="off"
          placeholder={`${procurar(t.modulo)}…`}
          value={pesquisa}
          onChange={e => setPesquisa(e.target.value)}
          className="h-12 w-full rounded-[10px] border border-linha-2 bg-superficie pl-10 pr-11 text-base text-tinta
                     placeholder:text-cinza focus:border-acao focus:outline-none focus:ring-3 focus:ring-acao/15
                     [&::-webkit-search-cancel-button]:hidden"
        />
        {pesquisa && (
          <button
            type="button"
            onClick={() => setPesquisa('')}
            aria-label="Limpar pesquisa"
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-cinza hover:text-tinta"
          >
            <IconeFechar tamanho={16} />
          </button>
        )}
      </div>

      {/* ── Filtros (no telemóvel, uma só linha com scroll horizontal) ── */}
      <div
        className="-mx-4 mt-4 flex items-center gap-x-7 gap-y-3 overflow-x-auto border-b border-linha px-4 pb-5
                   [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {anos.length > 0 && (
          <GrupoFiltros titulo="Ano">
            {anos.map(a => (
              <Filtro key={a} ativo={anoFilter === a} onClick={() => setAnoFilter(anoFilter === a ? null : a)}>
                {rotuloAno(a)}
              </Filtro>
            ))}
          </GrupoFiltros>
        )}

        {semestres.length > 0 && (
          <GrupoFiltros titulo="Semestre">
            {semestres.map(s => (
              <Filtro key={s} ativo={semFilter === s} onClick={() => setSemFilter(semFilter === s ? null : s)}>
                {rotuloSemestreCurto(s)}
              </Filtro>
            ))}
          </GrupoFiltros>
        )}

        <GrupoFiltros titulo="Ordem">
          <Filtro ativo={ordem === 'az'} onClick={() => setOrdem(ordem === 'az' ? null : 'az')}>A → Z</Filtro>
          <Filtro ativo={ordem === 'za'} onClick={() => setOrdem(ordem === 'za' ? null : 'za')}>Z → A</Filtro>
        </GrupoFiltros>

        {filtrosActivos && (
          <button type="button" onClick={limparTudo} className="shrink-0 text-sm font-medium text-acao hover:underline sm:ml-auto">
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Contador ───────────────────────────────────────────── */}
      <p role="status" className="mt-4 text-sm text-cinza">
        {visiveis.length === modulos.length
          ? contar(t.modulo, modulos.length)
          : `${visiveis.length} de ${contar(t.modulo, modulos.length)}`}
      </p>

      {/* ── Cartões ────────────────────────────────────────────── */}
      {visiveis.length === 0 ? (
        <div className="mt-5 rounded-xl border border-linha bg-superficie py-16 text-center">
          <p className="text-sm text-cinza">{nenhumEncontrado(t.modulo)}.</p>
          {filtrosActivos && (
            <button type="button" onClick={limparTudo} className="mt-3 text-sm font-medium text-acao hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      ) : grupos ? (
        grupos.map(g => (
          <section key={g.ano ?? 'sem-ano'} aria-label={rotuloAno(g.ano)} className="mt-8">
            <h2 className="flex items-baseline gap-3 border-b border-linha pb-3 text-[clamp(20px,1.8vw,26px)] font-semibold tracking-[-0.02em]">
              {rotuloAno(g.ano)}
              <span className="text-sm font-normal tracking-normal text-cinza">{contar(t.modulo, g.total)}</span>
            </h2>

            {g.semestres.map(s => {
              const semRotulo = s.semestre == null && g.semestres.length === 1;
              return (
                <div
                  key={s.semestre ?? 'sem-semestre'}
                  className={`pt-6 ${semRotulo ? '' : 'grid gap-4 lg:grid-cols-[170px_minmax(0,1fr)] lg:gap-6'}`}
                >
                  {!semRotulo && (
                    <div className="flex items-baseline gap-2 lg:block">
                      <h3 className="font-semibold">{rotuloSemestre(s.semestre)}</h3>
                      <p className="text-sm text-cinza">{contar(t.modulo, s.modulos.length)}</p>
                    </div>
                  )}
                  {cartoes(s.modulos)}
                </div>
              );
            })}
          </section>
        ))
      ) : (
        <div className="mt-5">{cartoes(visiveis)}</div>
      )}
    </div>
  );
}
