'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

export default function UtilizadorBiblioteca() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDisciplinas() {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar os registos de tipo_utilizador que tenham um módulo associado
      // e fazer o "join" para ir buscar o nome da disciplina à tabela 'modulo'
      const { data, error } = await supabase
        .from('tipo_utilizador')
        .select(`
          id_modulo,
          modulo:id_modulo (nome, codigo)
        `)
        .eq('id_utilizador', user.id)
        .eq('role', 'utilizador')
        .not('id_modulo', 'is', null);

      if (!error && data) {
        setDisciplinas(data);
      }
      setLoading(false);
    }
    loadDisciplinas();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      
      {/* ── Cabeçalho (Estilo Admin) ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Biblioteca Comunitária</h1>
        <p className="text-sm text-white/35 mt-1">
          Seleciona uma disciplina abaixo para explorar ou contribuir com fotografias e vídeos.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30 text-sm">
          A carregar a tua biblioteca...
        </div>
      ) : disciplinas.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-[#13131a] py-20 text-center flex flex-col items-center justify-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 text-white/40 mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Nenhuma disciplina associada</h3>
          <p className="text-sm text-white/40 max-w-sm mt-2 leading-relaxed">
            Quando um administrador ou gestor associar-te a um módulo, as tuas disciplinas aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        /* ── Grelha de Disciplinas ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {disciplinas.map((d, i) => {
            const mod = d.modulo;
            if (!mod) return null;

            return (
              // Nota: Futuramente podes envolver este div num <Link href={`/utilizador/biblioteca/${d.id_modulo}`}>
              <div 
                key={i} 
                className="group relative rounded-xl border border-white/8 bg-[#13131a] p-6 transition-all duration-200 hover:border-white/20 hover:bg-white/5 cursor-pointer flex flex-col justify-between h-44 shadow-sm hover:shadow-xl"
              >
                <div>
                  <span className="inline-flex items-center rounded-md bg-[#4f9eff]/10 px-2.5 py-1 text-xs font-semibold text-[#4f9eff] ring-1 ring-inset ring-[#4f9eff]/20">
                    {mod.codigo || 'MÓDULO'}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-4 line-clamp-2 group-hover:text-[#4f9eff] transition-colors">
                    {mod.nome}
                  </h2>
                </div>
                
                <div className="flex items-center justify-end mt-4">
                  <span className="flex items-center text-xs font-medium text-white/30 group-hover:text-white transition-colors">
                    Abrir Galeria
                    <svg className="ml-1.5 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}