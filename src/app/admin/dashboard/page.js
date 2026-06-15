'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useAdminFilter } from '../AdminFilterContext';

const inputCls = `w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
  placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1
  focus:ring-[#4f9eff]/30 transition`;

/* ─── Card de estatística ───────────────────────────────────────── */
function StatCard({ label, value, icon, color = '#4f9eff' }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#13131a] p-5 flex items-center gap-4">
      <div
        className="flex items-center justify-center w-11 h-11 rounded-lg text-xl"
        style={{ background: `${color}18`, color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">
          {value === null ? '…' : value}
        </p>
        <p className="text-xs text-white/40 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { entidades, entidadeId, selectEntidade, programas, programaId, setProgramaId } = useAdminFilter();

  const [stats, setStats]       = useState({ disciplinas: null, modelos: null, relacoes: null });
  const [recentes, setRecentes] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createSupabaseBrowser();

      const [
        { count: cDisc },
        { count: cMod },
        { count: cRel },
        { data: ult },
      ] = await Promise.all([
        supabase.from('modulo').select('*', { count: 'exact', head: true }),
        supabase.from('media_items').select('*', { count: 'exact', head: true }),
        supabase.from('modulo_media').select('*', { count: 'exact', head: true }),
        supabase
          .from('modulo')
          .select('id_modulo, nome, codigo, ano, semestre')
          .order('id_modulo', { ascending: false })
          .limit(5),
      ]);

      setStats({ disciplinas: cDisc ?? 0, modelos: cMod ?? 0, relacoes: cRel ?? 0 });
      setRecentes(ult ?? []);
      setLoading(false);
    }

    fetchData();
  }, []);

  const entidadeNome  = entidades.find(e => e.id_entidade == entidadeId)?.nome;
  const programaNome  = programas.find(p => p.id_programa == programaId)?.nome;
  const filtroAtivo   = entidadeId || programaId;

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/35 mt-1">Visão geral da plataforma media3d</p>
      </div>

      {/* ─── Filtro Global ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/8 bg-[#13131a] p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          {filtroAtivo && (
            <button
              onClick={() => selectEntidade('')}
              className="text-xs text-white/40 hover:text-white/70 border border-white/10
                         hover:border-white/20 px-3 py-1.5 rounded-lg transition"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Entidade</label>
            <select
              className={inputCls}
              value={entidadeId}
              onChange={e => selectEntidade(e.target.value)}
            >
              <option value="">Todas as entidades</option>
              {entidades.map(ent => (
                <option key={ent.id_entidade} value={ent.id_entidade}>{ent.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Programa</label>
            <select
              className={inputCls}
              value={programaId}
              onChange={e => setProgramaId(e.target.value)}
              disabled={!entidadeId}
            >
              <option value="">
                {entidadeId
                  ? programas.length === 0 ? 'Sem programas' : 'Todos os programas'
                  : 'Seleciona primeiro a entidade'}
              </option>
              {programas.map(p => (
                <option key={p.id_programa} value={p.id_programa}>
                  {p.codigo} — {p.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtroAtivo && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-white/30">A mostrar:</span>
            <span className="text-xs font-medium text-[#4f9eff] bg-[#4f9eff]/10 border border-[#4f9eff]/20 px-2 py-0.5 rounded-full">
              {programaId ? `${programaNome}` : `Tudo de ${entidadeNome}`}
            </span>
          </div>
        )}
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard
          label="Disciplinas"
          value={loading ? null : stats.disciplinas}
          icon="🎓"
          color="#4f9eff"
        />
        <StatCard
          label="Modelos 3D"
          value={loading ? null : stats.modelos}
          icon="🧊"
          color="#a78bfa"
        />
        <StatCard
          label="Associações"
          value={loading ? null : stats.relacoes}
          icon="🔗"
          color="#34d399"
        />
      </div>

      {/* Últimas disciplinas */}
      <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Últimas disciplinas adicionadas</h2>
          <a href="/admin/disciplinas" className="text-xs text-[#4f9eff]/70 hover:text-[#4f9eff] transition">
            Ver todas →
          </a>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-white/25">A carregar…</div>
        ) : recentes.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-white/25">
            Nenhuma disciplina encontrada.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/30 border-b border-white/5">
                <th className="text-left px-5 py-2.5 font-medium">Nome</th>
                <th className="text-left px-5 py-2.5 font-medium">Código</th>
                <th className="text-left px-5 py-2.5 font-medium">Ano</th>
                <th className="text-left px-5 py-2.5 font-medium">Semestre</th>
              </tr>
            </thead>
            <tbody>
              {recentes.map((d, i) => (
                <tr
                  key={d.id_modulo}
                  className={`transition hover:bg-white/3 ${i !== recentes.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <td className="px-5 py-3 text-white/80 font-medium">{d.nome}</td>
                  <td className="px-5 py-3 font-mono text-xs text-white/35">{d.codigo ?? '—'}</td>
                  <td className="px-5 py-3 text-white/45">{d.ano != null ? `${d.ano}º Ano` : '—'}</td>
                  <td className="px-5 py-3 text-white/45">{d.semestre != null ? `${d.semestre}º Sem` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
