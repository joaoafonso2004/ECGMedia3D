'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

const AdminFilterContext = createContext(null);

export function AdminFilterProvider({ children }) {
  const [entidades,  setEntidades]  = useState([]);
  const [entidadeId, setEntidadeId] = useState('');
  const [programas,  setProgramas]  = useState([]);
  const [programaId, setProgramaId] = useState('');

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.from('entidade').select('id_entidade, nome').order('nome')
      .then(({ data }) => setEntidades(data || []));
  }, []);

  useEffect(() => {
    if (!entidadeId) { setProgramas([]); setProgramaId(''); return; }
    const supabase = createSupabaseBrowser();
    supabase
      .from('programa')
      .select('id_programa, nome, codigo')
      .eq('id_entidade', entidadeId)
      .order('codigo')
      .then(({ data }) => setProgramas(data || []));
  }, [entidadeId]);

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
    }}>
      {children}
    </AdminFilterContext.Provider>
  );
}

export function useAdminFilter() {
  return useContext(AdminFilterContext);
}
