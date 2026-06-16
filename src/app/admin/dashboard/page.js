'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

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

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/35 mt-1">Visão geral da plataforma media3d</p>
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
