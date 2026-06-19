'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

const AdminFilterContext = createContext(null);

export function AdminFilterProvider({ children }) {
  const [entidades,  setEntidades]  = useState([]);
  const [entidadeId, setEntidadeId] = useState('');
  const [programas,  setProgramas]  = useState([]);
  const [programaId, setProgramaId] = useState('');

  const refreshEntidades = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    const { data } = await supabase.from('entidade').select('id_entidade, nome').order('nome');
    setEntidades(data || []);
  }, []);

  const refreshProgramas = useCallback(async () => {
    if (!entidadeId) { setProgramas([]); return; }
    const supabase = createSupabaseBrowser();
    const { data } = await supabase
      .from('programa')
      .select('id_programa, nome, codigo')
      .eq('id_entidade', entidadeId)
      .order('codigo');
    setProgramas(data || []);
  }, [entidadeId]);

  useEffect(() => { refreshEntidades(); }, [refreshEntidades]);

  useEffect(() => {
    if (!entidadeId) { setProgramas([]); setProgramaId(''); return; }
    refreshProgramas();
  }, [entidadeId, refreshProgramas]);

  function selectEntidade(id) {
    setEntidadeId(id);
    setProgramaId('');
  }

  return (
    <AdminFilterContext.Provider value={{
      entidades,
      entidadeId,
      selectEntidade,
      programas,
      programaId,
      setProgramaId,
      refreshEntidades,
      refreshProgramas,
    }}>
      {children}
    </AdminFilterContext.Provider>
  );
}

export function useAdminFilter() {
  return useContext(AdminFilterContext);
}

/* ─── Linha de contexto do filtro ativo ─────────────────────────── */
export function FilterContextLine() {
  const { entidades, entidadeId, programas, programaId } = useContext(AdminFilterContext);

  if (!entidadeId && !programaId) return null;

  const entidade = entidades.find(e => String(e.id_entidade) === String(entidadeId));
  const programa = programas.find(p => String(p.id_programa) === String(programaId));

  return (
    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
      A mostrar dados de{' '}
      {programa
        ? <span style={{ color: '#4f9eff' }}>{programa.codigo} — {programa.nome}</span>
        : 'Todos os programas'
      }
      {entidade && <> — {entidade.nome}</>}
    </p>
  );
}
