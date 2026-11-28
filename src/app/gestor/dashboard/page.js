"use client";

import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useEffect, useState } from "react";

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-linha bg-superficie px-6 py-5">
      <b className="block text-3xl font-semibold tracking-tight tabular-nums text-tinta">{value === null ? '…' : value}</b>
      <span className="text-sm text-cinza">{label}</span>
    </div>
  );
}

export default function GestorDashboardPage() {
  const [stats, setStats] = useState({ programas: null, modulos: null });
  const [recentes, setRecentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createSupabaseBrowser();
      
      // 1. Obter o ID do utilizador autenticado (UUID)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }
      
      const userId = user.id;

      // 2. Buscar as permissões específicas deste gestor
      const { data: permissoes } = await supabase
        .from("tipo_utilizador")
        .select("id_programa, id_modulo")
        .eq("id_utilizador", userId)
        .eq("role", "gestor_disciplina");

      // Extrair IDs únicos de programas e módulos
      const programaIds = Array.from(new Set((permissoes || []).map(p => p.id_programa).filter(Boolean)));
      const moduloIds = Array.from(new Set((permissoes || []).map(p => p.id_modulo).filter(Boolean)));

      // 3. Buscar os detalhes dos módulos (apenas aqueles a que ele tem acesso)
      const { data: modulos } = moduloIds.length > 0 
        ? await supabase
            .from("modulo")
            .select("id_modulo, nome, codigo, ano, semestre, id_programa")
            .in("id_modulo", moduloIds)
        : { data: [] };

      setStats({
        programas: programaIds.length,
        modulos: (modulos || []).length,
      });
      
      setRecentes((modulos || []).slice(0, 5));
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-tinta">Dashboard Gestor</h1>
        <p className="text-sm text-cinza mt-1">Visão restrita de acordo com os seus programas e módulos</p>
      </div>
      
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <StatCard label="Programas" value={loading ? null : stats.programas} />
        <StatCard label="Módulos" value={loading ? null : stats.modulos} />
      </div>
      
      {/* Últimos módulos */}
      <div className="rounded-xl border border-linha bg-superficie overflow-hidden">
        <div className="px-5 py-4 border-b border-linha flex items-center justify-between">
          <h2 className="text-sm font-semibold text-tinta">Últimos módulos associados</h2>
        </div>
        
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-cinza/80">A carregar…</div>
        ) : recentes.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-cinza/80">Nenhum módulo encontrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-cinza/80 border-b border-linha">
                <th className="text-left px-5 py-2.5 font-medium">Nome</th>
                <th className="text-left px-5 py-2.5 font-medium">Código</th>
                <th className="text-left px-5 py-2.5 font-medium">Ano</th>
                <th className="text-left px-5 py-2.5 font-medium">Semestre</th>
              </tr>
            </thead>
            <tbody>
              {recentes.map((d, i) => (
                <tr key={d.id_modulo} className={`transition hover:bg-papel ${i !== recentes.length - 1 ? "border-b border-linha" : ""}`}>
                  <td className="px-5 py-3 text-tinta font-medium">{d.nome}</td>
                  <td className="px-5 py-3 font-mono text-xs text-cinza">{d.codigo ?? "—"}</td>
                  <td className="px-5 py-3 text-cinza">{d.ano != null ? `${d.ano}º Ano` : "—"}</td>
                  <td className="px-5 py-3 text-cinza">{d.semestre != null ? `${d.semestre}º Sem` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}