'use client';

/**
 * Filtro global do painel: entidade e programa.
 * Recebe o estado do contexto de cada área (useAdminFilter / useGestorFilter),
 * que têm a mesma forma.
 */

const SELECT =
  'h-9 max-w-[220px] truncate rounded-[10px] border border-linha-2 bg-superficie pl-3 pr-8 text-[14px] text-tinta ' +
  'focus:border-acao focus:outline-none focus:ring-3 focus:ring-acao/15 disabled:cursor-not-allowed disabled:opacity-50';

export default function FiltroEntidade({ entidades, entidadeId, selectEntidade, programas, programaId, setProgramaId }) {
  const filtroAtivo = !!(entidadeId || programaId);

  return (
    <>
      <label className="sr-only" htmlFor="filtro-entidade">Entidade</label>
      <select
        id="filtro-entidade"
        className={SELECT}
        value={entidadeId ?? ''}
        onChange={e => selectEntidade(e.target.value)}
      >
        <option value="">Todas as entidades</option>
        {entidades.map(ent => (
          <option key={ent.id_entidade} value={ent.id_entidade}>{ent.nome}</option>
        ))}
      </select>

      <span aria-hidden="true" className="text-cinza">›</span>

      <label className="sr-only" htmlFor="filtro-programa">Programa</label>
      <select
        id="filtro-programa"
        className={SELECT}
        value={programaId ?? ''}
        onChange={e => setProgramaId(e.target.value)}
        disabled={!entidadeId}
      >
        <option value="">
          {entidadeId ? (programas.length === 0 ? 'Sem programas' : 'Todos os programas') : 'Escolhe uma entidade'}
        </option>
        {programas.map(p => (
          <option key={p.id_programa} value={p.id_programa}>
            {p.codigo ? `${p.codigo} — ${p.nome}` : p.nome}
          </option>
        ))}
      </select>

      {filtroAtivo && (
        <button
          type="button"
          onClick={() => selectEntidade('')}
          className="h-9 shrink-0 rounded-[10px] px-2.5 text-[13.5px] text-tinta-2 hover:bg-superficie hover:text-tinta"
        >
          Limpar
        </button>
      )}
    </>
  );
}
