'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';

/* ─── Card de estatística (Estilo Admin) ───────────────────────── */
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

export default function UtilizadorDashboard() {
  const [stats, setStats] = useState({ disciplinas: null, publicacoes: null });
  const [recentes, setRecentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        { count: cDisc },
        { count: cPub },
        { data: ult },
      ] = await Promise.all([
        // 1. Contar disciplinas a que está associado
        supabase
          .from('tipo_utilizador')
          .select('*', { count: 'exact', head: true })
          .eq('id_utilizador', user.id)
          .eq('role', 'utilizador')
          .not('id_modulo', 'is', null),
        
        // 2. Contar publicações feitas por ele
        supabase
          .from('media_items')
          .select('*', { count: 'exact', head: true })
          .eq('id_autor', user.id),
        
        // 3. Buscar as últimas disciplinas inscritas para a tabela
        supabase
          .from('tipo_utilizador')
          .select(`
            id_modulo,
            modulo:id_modulo (nome, codigo, ano, semestre)
          `)
          .eq('id_utilizador', user.id)
          .eq('role', 'utilizador')
          .not('id_modulo', 'is', null)
          .limit(5)
      ]);

      setStats({ 
        disciplinas: cDisc ?? 0, 
        publicacoes: cPub ?? 0 
      });
      setRecentes(ult ?? []);
      setLoading(false);
    }

    fetchData();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      
      {/* ── Cabeçalho ── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-white/35 mt-1">O teu resumo e progresso na plataforma</p>
        </div>
      </div>

      {/* ── Cards de Estatísticas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <StatCard
          label="Módulos Inscritos"
          value={loading ? null : stats.disciplinas}
          icon="🎓"
          color="#4f9eff"
        />
        <StatCard
          label="As tuas Publicações"
          value={loading ? null : stats.publicacoes}
          icon="📤"
          color="#a78bfa"
        />
      </div>

      {/* ── Tabela de Últimas Disciplinas (Estilo Admin) ── */}
      <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Os teus módulos recentes</h2>
          <Link href="/utilizador/biblioteca" className="text-xs text-[#4f9eff]/70 hover:text-[#4f9eff] transition">
            Ver todas →
          </Link>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-white/25">A carregar…</div>
        ) : recentes.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-white/25">
            Ainda não estás inscrito em nenhuma disciplina.
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
              {recentes.map((d, i) => {
                // Acesso seguro ao objeto modulo que vem do Join do Supabase
                const mod = d.modulo;
                if (!mod) return null;
                
                return (
                  <tr
                    key={d.id_modulo}
                    className={`transition hover:bg-white/3 ${i !== recentes.length - 1 ? 'border-b border-white/5' : ''}`}
                  >
                    <td className="px-5 py-3 text-white/80 font-medium">{mod.nome}</td>
                    <td className="px-5 py-3 font-mono text-xs text-white/35">{mod.codigo ?? '—'}</td>
                    <td className="px-5 py-3 text-white/45">{mod.ano != null ? `${mod.ano}º Ano` : '—'}</td>
                    <td className="px-5 py-3 text-white/45">{mod.semestre != null ? `${mod.semestre}º Sem` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}