'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

export default function UtilizadorPerfil() {
  const [user, setUser] = useState({ nome: '', email: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const supabase = createSupabaseBrowser();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: userData } = await supabase
        .from('utilizadores')
        .select('nome')
        .eq('id_utilizadores', authUser.id)
        .single();

      setUser({ email: authUser.email, nome: userData?.nome || '' });
      setLoading(false);
    }
    loadUser();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      
      {/* ── Cabeçalho (Estilo Admin) ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">O teu Perfil</h1>
        <p className="text-sm text-white/35 mt-1">
          Consulta as tuas informações pessoais.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-white/30 text-sm">
          A carregar informações do perfil...
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 bg-[#13131a] p-8 max-w-2xl shadow-sm">
          
          {/* Avatar e Identificação */}
          <div className="flex items-center gap-5 mb-8 pb-8 border-b border-white/5">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#4f9eff]/10 text-[#4f9eff]">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{user.nome}</h3>
              <p className="text-sm text-white/40">Conta de Utilizador (Aluno)</p>
            </div>
          </div>

          {/* Campos de Informação */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-white/40 mb-2">Nome Completo</label>
              <input 
                type="text" 
                disabled 
                value={user.nome}
                className="w-full rounded-lg border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/60 cursor-not-allowed focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/40 mb-2">Email de Registo</label>
              <input 
                type="email" 
                disabled 
                value={user.email}
                className="w-full rounded-lg border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/60 cursor-not-allowed focus:outline-none"
              />
              <p className="text-[10px] text-white/30 mt-2 flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                O email não pode ser alterado por questões de segurança.
              </p>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}