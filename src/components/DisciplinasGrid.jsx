'use client';

import { useState, useMemo } from 'react';
import DisciplinaCard from './DisciplinaCard';

/* ─── Helpers ──────────────────────────────────────────────────── */

/** Mostra "1º Sem" se numérico, ou o texto directo se for string */
function semestreLabel(s) {
  if (s == null) return '—';
  return isNaN(Number(s)) ? String(s) : `${s}º Sem`;
}

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

/* ─── Pill reutilizável ───────────────────────────────────────── */
function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium border transition-all duration-150 cursor-pointer whitespace-nowrap
        ${active
          ? 'bg-[#4f9eff] text-white border-[#4f9eff] shadow-sm shadow-[#4f9eff]/30'
          : 'bg-white/5 text-white/45 border-white/10 hover:border-white/20 hover:text-white/70'
        }`}
    >
      {children}
    </button>
  );
}

/* ─── Componente principal ────────────────────────────────────── */
export default function DisciplinasGrid({ modulos, basePath = '' }) {
  const [pesquisa,   setPesquisa]   = useState('');
  const [anoFilter,  setAnoFilter]  = useState(null); // null = todos
  const [semFilter,  setSemFilter]  = useState(null);
  const [ordem,      setOrdem]      = useState(null); // null = natural

  /* Valores únicos para os pills de filtro */
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
      const q = pesquisa.toLowerCase();
      r = r.filter(m => m.nome?.toLowerCase().includes(q));
    }
    if (anoFilter != null) r = r.filter(m => m.ano === anoFilter);
    if (semFilter != null) r = r.filter(m => m.semestre === semFilter);

    return sortModulos(r, ordem);
  }, [modulos, pesquisa, anoFilter, semFilter, ordem]);

  const filtrosActivos = pesquisa || anoFilter != null || semFilter != null || ordem != null;

  function limparTudo() {
    setPesquisa(''); setAnoFilter(null); setSemFilter(null); setOrdem(null);
  }

  return (
    <div>

      {/* ── Barra de pesquisa ──────────────────────────────────── */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Pesquisar disciplina..."
          value={pesquisa}
          onChange={e => setPesquisa(e.target.value)}
          className="w-full rounded-xl border border-white/8 bg-[#13131a]
                     py-2.5 pl-10 pr-9 text-sm text-white placeholder-white/25
                     focus:border-[#4f9eff]/40 focus:outline-none focus:ring-1 focus:ring-[#4f9eff]/20
                     transition-colors duration-150"
        />
        {pesquisa && (
          <button
            onClick={() => setPesquisa('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30
                       hover:text-white/60 transition-colors text-sm leading-none"
            aria-label="Limpar pesquisa"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Linha de filtros ───────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 mb-6
                      pb-5 border-b border-white/5">

        {/* Ano */}
        {anos.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/25 font-medium shrink-0">Ano</span>
            {anos.map(a => (
              <Pill
                key={a}
                active={anoFilter === a}
                onClick={() => setAnoFilter(anoFilter === a ? null : a)}
              >
                {a}º Ano
              </Pill>
            ))}
          </div>
        )}

        {/* Semestre */}
        {semestres.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/25 font-medium shrink-0">Semestre</span>
            {semestres.map(s => (
              <Pill
                key={s}
                active={semFilter === s}
                onClick={() => setSemFilter(semFilter === s ? null : s)}
              >
                {semestreLabel(s)}
              </Pill>
            ))}
          </div>
        )}

        {/* Ordem */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/25 font-medium shrink-0">Ordem</span>
          <Pill active={ordem === 'az'} onClick={() => setOrdem(ordem === 'az' ? null : 'az')}>
            A → Z
          </Pill>
          <Pill active={ordem === 'za'} onClick={() => setOrdem(ordem === 'za' ? null : 'za')}>
            Z → A
          </Pill>
        </div>

        {/* Limpar filtros */}
        {filtrosActivos && (
          <button
            onClick={limparTudo}
            className="ml-auto text-xs text-white/30 hover:text-[#4f9eff]/70
                       transition-colors underline underline-offset-2 self-center"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Contador de resultados ─────────────────────────────── */}
      <p className="mb-5 text-xs text-white/20">
        {visiveis.length === modulos.length
          ? `${modulos.length} ${modulos.length === 1 ? 'disciplina' : 'disciplinas'}`
          : `${visiveis.length} de ${modulos.length} disciplinas`
        }
      </p>

      {/* ── Grid ou estado vazio ───────────────────────────────── */}
      {visiveis.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl
                        border border-white/5 bg-[#13131a] py-24 text-center">
          <p className="text-sm text-white/30">Nenhum módulo encontrado.</p>
          {filtrosActivos && (
            <button
              onClick={limparTudo}
              className="mt-3 text-xs text-[#4f9eff]/60 hover:text-[#4f9eff] transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map(m => (
            <DisciplinaCard key={m.id_modulo} disciplina={m} basePath={basePath} />
          ))}
        </div>
      )}

    </div>
  );
}
