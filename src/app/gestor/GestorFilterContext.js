'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

const GestorFilterContext = createContext({});

export function GestorFilterProvider({ children }) {
  const [entidades,  setEntidades]  = useState([]);
  const [entidadeId, setEntidadeId] = useState('');
  const [programas,  setProgramas]  = useState([]);
  const [programaId, setProgramaId] = useState('');

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.from('entidade').select('id_entidade, nome').then(({ data }) => {
      setEntidades(data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!entidadeId) { setProgramas([]); return; }
    const supabase = createSupabaseBrowser();
    supabase
      .from('programa')
      .select('id_programa, nome, codigo')
      .eq('id_entidade', entidadeId)
      .then(({ data }) => { setProgramas(data ?? []); });
  }, [entidadeId]);

  function selectEntidade(id) { setEntidadeId(id); setProgramaId(''); }

  return (
    <GestorFilterContext.Provider value={{ entidades, entidadeId, selectEntidade, programas, programaId, setProgramaId }}>
      {children}
    </GestorFilterContext.Provider>
  );
}

export function useGestorFilter() { return useContext(GestorFilterContext); }
