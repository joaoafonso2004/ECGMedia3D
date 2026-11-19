'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import {
  NIVEIS, resolverTermos,
  contar, novo, nenhum, ver, publicados,
} from '@/lib/terminologia';

/* ─── Auxiliares de interface ───────────────────────────────────── */

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = `w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
  placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1
  focus:ring-[#4f9eff]/30 transition`;

/* ─── Constantes ────────────────────────────────────────────────── */

const NOMES_NIVEL = {
  entidade: { titulo: 'Entidade', exemplo: 'ex.: Escola / Empresa' },
  programa: { titulo: 'Programa', exemplo: 'ex.: Curso / Departamento' },
  modulo:   { titulo: 'Módulo',   exemplo: 'ex.: Disciplina / Serviço' },
  projeto:  { titulo: 'Projeto',  exemplo: 'ex.: Projeto / Obra' },
};

const GENEROS = [
  { valor: 'm', texto: 'm · masculino' },
  { valor: 'f', texto: 'f · feminino' },
];

const COLUNAS = 'tipo_entidade, id_entidade, idioma, nivel, singular, plural, genero';

/* ─── Funções auxiliares ────────────────────────────────────────── */

const normalizarTipo = t => (t ? String(t).trim().toLowerCase() : '');

function capitalizar(texto = '') {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function plural(n, sing, plur) {
  return `${n} ${n === 1 ? sing : plur}`;
}

// A tabela ainda não existe na base de dados (migração por aplicar)
function tabelaEmFalta(error) {
  return !!error && (error.code === 'PGRST205' || /terminologia/i.test(error.message || ''));
}

/* ─── Página ────────────────────────────────────────────────────── */

export default function TerminologiaPage() {
  const [linhas,    setLinhas]    = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [semTabela, setSemTabela] = useState(false);
  const [erroCarga, setErroCarga] = useState('');

  const [modo,        setModo]        = useState('predefinicao'); // 'predefinicao' | 'tipo' | 'entidade'
  const [tipo,        setTipo]        = useState('');
  const [idEntidade,  setIdEntidade]  = useState('');
  const [idioma,      setIdioma]      = useState('pt');
  const [tiposNovos,  setTiposNovos]  = useState([]);
  const [novoAberto,  setNovoAberto]  = useState(false);
  const [novoTexto,   setNovoTexto]   = useState('');
  const [novoErro,    setNovoErro]    = useState('');

  // Alterações ainda não guardadas, por alvo + idioma: { chave: { nivel: { campo: valor } } }
  const [edicoes,  setEdicoes]  = useState({});
  const [erroForm, setErroForm] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    if (!isError) setTimeout(() => setToast(null), 3000);
  }

  const carregar = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    const [resLinhas, resEnt] = await Promise.all([
      supabase.from('terminologia').select(COLUNAS),
      supabase.from('entidade').select('id_entidade, nome, tipo').order('nome'),
    ]);
    return { resLinhas, resEnt };
  }, []);

  const aplicar = useCallback(({ resLinhas, resEnt }) => {

    if (resLinhas.error) {
      if (tabelaEmFalta(resLinhas.error)) {
        setSemTabela(true);
        setErroCarga('');
      } else {
        setSemTabela(false);
        setErroCarga(resLinhas.error.message);
      }
      setLinhas([]);
    } else {
      setSemTabela(false);
      setErroCarga('');
      setLinhas(resLinhas.data ?? []);
    }
    setEntidades(resEnt.data ?? []);
    setLoading(false);
  }, []);

  const fetchData = useCallback(async () => aplicar(await carregar()), [aplicar, carregar]);

  useEffect(() => { carregar().then(aplicar); }, [carregar, aplicar]);

  /* ─── Tipos de entidade disponíveis ───────────────────────────── */

  const tipos = useMemo(() => {
    const conjunto = new Set();
    entidades.forEach(e => { const t = normalizarTipo(e.tipo); if (t) conjunto.add(t); });
    linhas.forEach(l => { const t = normalizarTipo(l.tipo_entidade); if (t) conjunto.add(t); });
    tiposNovos.forEach(t => conjunto.add(t));
    return [...conjunto].sort((a, b) => a.localeCompare(b, 'pt'));
  }, [entidades, linhas, tiposNovos]);

  const contagemPorTipo = useMemo(() => {
    const c = {};
    entidades.forEach(e => { const t = normalizarTipo(e.tipo); if (t) c[t] = (c[t] || 0) + 1; });
    return c;
  }, [entidades]);

  /* ─── Alvo selecionado ────────────────────────────────────────── */

  const entidadeSel = useMemo(
    () => entidades.find(e => String(e.id_entidade) === String(idEntidade)) ?? null,
    [entidades, idEntidade]
  );

  const alvoValido =
    modo === 'predefinicao' ||
    (modo === 'tipo' && !!tipo) ||
    (modo === 'entidade' && !!entidadeSel);

  const chave = modo === 'predefinicao' ? 'p'
    : modo === 'tipo' ? `t:${tipo}`
    : `e:${idEntidade}`;
  const chaveEdicao = `${chave}|${idioma}`;

  const nomeAlvo = modo === 'predefinicao' ? 'Predefinição'
    : modo === 'tipo' ? capitalizar(tipo)
    : (entidadeSel ? `${entidadeSel.nome}${entidadeSel.tipo ? ` · ${normalizarTipo(entidadeSel.tipo)}` : ''}` : '');

  // Linhas que existem para este alvo + idioma
  const linhasAlvo = useMemo(() => linhas.filter(l =>
    l.idioma === idioma && (
      modo === 'predefinicao' ? (l.tipo_entidade == null && l.id_entidade == null)
      : modo === 'tipo' ? (normalizarTipo(l.tipo_entidade) === tipo && l.id_entidade == null)
      : (l.id_entidade != null && String(l.id_entidade) === String(idEntidade))
    )
  ), [linhas, idioma, modo, tipo, idEntidade]);

  const definidos = useMemo(() => new Set(linhasAlvo.map(l => l.nivel)), [linhasAlvo]);

  // Valores que se aplicam ao alvo (os próprios ou os herdados)
  const base = useMemo(() => {
    if (modo === 'predefinicao') return resolverTermos(linhas, null, idioma);
    if (modo === 'tipo')         return resolverTermos(linhas, { tipo }, idioma);
    return resolverTermos(linhas, entidadeSel, idioma);
  }, [linhas, modo, tipo, entidadeSel, idioma]);

  const campos = useMemo(() => {
    const ed = edicoes[chaveEdicao] ?? {};
    return Object.fromEntries(NIVEIS.map(n => [n, {
      singular: base[n].singular,
      plural:   base[n].plural,
      genero:   base[n].genero,
      ...(ed[n] ?? {}),
    }]));
  }, [base, edicoes, chaveEdicao]);

  const sujo = !!edicoes[chaveEdicao] && NIVEIS.some(n => {
    const ed = edicoes[chaveEdicao][n];
    return ed && Object.keys(ed).some(k => ed[k] !== base[n][k]);
  });

  // De onde vem o valor de um nível que não está definido para este alvo
  function origemHerdada(nivel) {
    const existe = (t, id) => linhas.some(l =>
      l.idioma === idioma && l.nivel === nivel &&
      (l.id_entidade ?? null) === id && normalizarTipo(l.tipo_entidade) === t
    );
    if (modo === 'entidade') {
      const t = normalizarTipo(entidadeSel?.tipo);
      if (t && existe(t, null)) return `herdado do tipo «${t}»`;
    }
    if (modo !== 'predefinicao' && existe('', null)) return 'herdado da predefinição';
    return 'valor incorporado';
  }

  function editar(nivel, campo, valor) {
    setEdicoes(prev => ({
      ...prev,
      [chaveEdicao]: {
        ...(prev[chaveEdicao] ?? {}),
        [nivel]: { ...((prev[chaveEdicao] ?? {})[nivel] ?? {}), [campo]: valor },
      },
    }));
    if (erroForm) setErroForm('');
  }

  function limparEdicoes() {
    setEdicoes(prev => {
      const copia = { ...prev };
      delete copia[chaveEdicao];
      return copia;
    });
  }

  /* ─── Escolha do alvo ─────────────────────────────────────────── */

  function escolherModo(novoModo) {
    setModo(novoModo);
    setErroForm('');
    setNovoAberto(false);
  }

  function escolherTipo(t) {
    setModo('tipo');
    setTipo(t);
    setErroForm('');
    setNovoAberto(false);
  }

  function adicionarTipo() {
    const t = novoTexto.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!t) { setNovoErro('Indica o nome do tipo.'); return; }
    if (!/^[\p{L}]+(?:[\s-][\p{L}]+)*$/u.test(t)) {
      setNovoErro('Usa apenas letras, espaços e hífenes.');
      return;
    }
    if (!tipos.includes(t)) setTiposNovos(prev => [...prev, t]);
    setNovoTexto('');
    setNovoErro('');
    escolherTipo(t);
  }

  /* ─── Guardar / Repor ─────────────────────────────────────────── */

  async function handleGuardar() {
    if (!alvoValido) return;

    const invalido = NIVEIS.some(n => !campos[n].singular.trim() || !campos[n].plural.trim());
    if (invalido) {
      setErroForm('Preenche o singular e o plural de todos os níveis.');
      return;
    }

    setSaving(true);
    setErroForm('');
    const supabase = createSupabaseBrowser();
    const rows = NIVEIS.map(n => ({
      tipo_entidade: modo === 'tipo' ? tipo : null,
      id_entidade:   modo === 'entidade' ? Number(idEntidade) : null,
      idioma,
      nivel:         n,
      singular:      campos[n].singular.trim(),
      plural:        campos[n].plural.trim(),
      genero:        campos[n].genero === 'f' ? 'f' : 'm',
    }));

    const { data, error } = await supabase
      .from('terminologia')
      .upsert(rows, { onConflict: 'tipo_entidade,id_entidade,idioma,nivel' })
      .select('id_terminologia');

    if (error) {
      if (tabelaEmFalta(error)) setSemTabela(true);
      else setErroForm(error.message);
    } else if (!data || data.length === 0) {
      setErroForm('Nada foi guardado. Só o superadministrador pode alterar a terminologia.');
    } else {
      showToast('Terminologia guardada!');
      limparEdicoes();
      await fetchData();
    }
    setSaving(false);
  }

  async function handleRepor() {
    if (!alvoValido || modo === 'predefinicao' || linhasAlvo.length === 0) return;
    const alvoTexto = modo === 'tipo' ? `ao tipo «${tipo}»` : `a ${entidadeSel?.nome ?? 'esta entidade'}`;
    const herda = modo === 'tipo' ? 'a predefinição' : 'o tipo de entidade (ou a predefinição)';
    const ok = window.confirm(
      `Repor os termos em ${idioma.toUpperCase()} ${alvoTexto}?\n\n` +
      `Os termos próprios são eliminados e passam a valer ${herda}.`
    );
    if (!ok) return;

    setSaving(true);
    setErroForm('');
    const supabase = createSupabaseBrowser();
    let q = supabase.from('terminologia').delete().eq('idioma', idioma);
    q = modo === 'tipo'
      ? q.eq('tipo_entidade', tipo).is('id_entidade', null)
      : q.eq('id_entidade', Number(idEntidade));
    const { data, error } = await q.select('id_terminologia');

    if (error) {
      if (tabelaEmFalta(error)) setSemTabela(true);
      else showToast('Erro ao repor: ' + error.message, true);
    } else if (!data || data.length === 0) {
      showToast('Nada foi reposto. Só o superadministrador pode alterar a terminologia.', true);
    } else {
      showToast('Termos repostos.');
      limparEdicoes();
      await fetchData();
    }
    setSaving(false);
  }

  /* ─── Pré-visualização ────────────────────────────────────────── */

  const termos = useMemo(() => Object.fromEntries(NIVEIS.map(n => [n, {
    singular: campos[n].singular.trim() || '…',
    plural:   campos[n].plural.trim() || '…',
    genero:   campos[n].genero === 'f' ? 'f' : 'm',
    idioma,
  }])), [campos, idioma]);

  /* ─── Estilos ─────────────────────────────────────────────────── */

  const pillCls = ativo =>
    `rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
      ativo
        ? 'border-[#4f9eff]/30 bg-[#4f9eff]/12 text-[#4f9eff]'
        : 'border-white/10 text-white/50 hover:bg-white/5 hover:text-white/80'
    }`;

  const vazio = (v) => !v.trim();

  /* ─── Render ──────────────────────────────────────────────────── */

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm text-white shadow-xl
          ${toast.isError ? 'border-red-500/30 bg-red-950/80' : 'border-white/10 bg-[#13131a]'}`}>
          <span>{toast.msg}</span>
          {toast.isError && (
            <button onClick={() => setToast(null)} className="text-white/40 hover:text-white transition text-lg leading-none">×</button>
          )}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Terminologia</h1>
        <p className="text-sm text-white/35 mt-1">
          Define como se chamam os níveis da hierarquia em cada tipo de entidade.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/8 bg-[#13131a] py-12 text-center text-sm text-white/25">
          A carregar…
        </div>
      ) : semTabela ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-5 py-4 text-sm text-amber-200/80 leading-relaxed">
          <p className="font-semibold text-amber-200">A tabela de terminologia ainda não existe na base de dados.</p>
          <p className="mt-1 text-xs text-amber-200/70">
            Aplica a migração <span className="font-mono">20261119_terminologia.sql</span> no Supabase e recarrega esta página.
            Enquanto isso, o site usa os termos predefinidos.
          </p>
        </div>
      ) : erroCarga ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-5 py-4 text-sm text-red-300/80">
          <p>Não foi possível carregar a terminologia: {erroCarga}</p>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10 transition"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">

          {/* ─── Coluna principal ─── */}
          <div className="min-w-0 space-y-6">

            {/* Alvo */}
            <div className="rounded-xl border border-white/8 bg-[#13131a] p-5">
              <p className="text-xs font-medium text-white/50 mb-3">Aplicar a</p>
              <div className="flex flex-wrap gap-2">
                <button className={pillCls(modo === 'predefinicao')} onClick={() => escolherModo('predefinicao')}>
                  Predefinição
                </button>
                {tipos.map(t => (
                  <button key={t} className={pillCls(modo === 'tipo' && tipo === t)} onClick={() => escolherTipo(t)}>
                    {capitalizar(t)} · {plural(contagemPorTipo[t] || 0, 'entidade', 'entidades')}
                  </button>
                ))}
                <button className={pillCls(novoAberto)} onClick={() => { setNovoAberto(o => !o); setNovoErro(''); }}>
                  + Novo tipo
                </button>
                <button className={pillCls(modo === 'entidade')} onClick={() => escolherModo('entidade')}>
                  Entidade específica
                </button>
              </div>

              {novoAberto && (
                <div className="mt-4 max-w-md">
                  <Field label="Nome do novo tipo">
                    <div className="flex gap-2">
                      <input
                        className={inputCls}
                        value={novoTexto}
                        maxLength={40}
                        placeholder="ex.: associação"
                        onChange={e => { setNovoTexto(e.target.value); if (novoErro) setNovoErro(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') adicionarTipo(); }}
                      />
                      <button
                        onClick={adicionarTipo}
                        className="shrink-0 rounded-lg bg-[#4f9eff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3d8aef] transition"
                      >
                        Adicionar
                      </button>
                    </div>
                  </Field>
                  {novoErro && <p className="mt-2 text-xs text-red-400">{novoErro}</p>}
                </div>
              )}

              {modo === 'entidade' && (
                <div className="mt-4 max-w-md">
                  <Field label="Entidade">
                    <select
                      className={inputCls + ' appearance-none'}
                      value={idEntidade}
                      onChange={e => { setIdEntidade(e.target.value); setErroForm(''); }}
                    >
                      <option value="">Selecionar entidade…</option>
                      {entidades.map(e => (
                        <option key={e.id_entidade} value={e.id_entidade}>
                          {e.nome}{e.tipo ? ` (${normalizarTipo(e.tipo)})` : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <p className="mt-2 text-xs text-white/30">
                    Os termos guardados aqui valem só para esta entidade e substituem os do tipo.
                  </p>
                </div>
              )}
            </div>

            {!alvoValido ? (
              <div className="rounded-xl border border-white/8 bg-[#13131a] py-12 text-center text-sm text-white/25">
                {modo === 'entidade' ? 'Seleciona uma entidade para editar os seus termos.' : 'Seleciona um tipo de entidade.'}
              </div>
            ) : (
              <div className="rounded-xl border border-white/8 bg-[#13131a] p-5">

                {/* Idioma */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-sm font-semibold text-white">{nomeAlvo}</h2>
                    {sujo && <p className="text-xs text-[#4f9eff]/80 mt-0.5">Alterações por guardar</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">Idioma dos nomes</span>
                    {['pt', 'en'].map(i => (
                      <button key={i} className={pillCls(idioma === i)} onClick={() => { setIdioma(i); setErroForm(''); }}>
                        {i.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cabeçalho da tabela (só em ecrãs largos) */}
                <div className="hidden md:grid grid-cols-[1.1fr_1fr_1fr_8.5rem] gap-3 px-1 pb-2 text-xs font-medium text-white/30 border-b border-white/5">
                  <span>Nível</span>
                  <span>Singular</span>
                  <span>Plural</span>
                  <span>Género</span>
                </div>

                {NIVEIS.map((n, i) => {
                  const c = campos[n];
                  const proprio = definidos.has(n);
                  return (
                    <div
                      key={n}
                      className={`grid gap-3 py-4 md:grid-cols-[1.1fr_1fr_1fr_8.5rem] md:items-start
                        ${i !== NIVEIS.length - 1 ? 'border-b border-white/5' : ''}`}
                    >
                      <div className="px-1">
                        <div className="text-sm font-medium text-white/85">{NOMES_NIVEL[n].titulo}</div>
                        <div className="text-xs text-white/30 mt-0.5">{NOMES_NIVEL[n].exemplo}</div>
                        <div className={`text-[11px] mt-1 ${proprio ? 'text-[#4f9eff]/80' : 'text-white/30'}`}>
                          {proprio ? 'definido para este alvo' : origemHerdada(n)}
                        </div>
                      </div>

                      <div>
                        <label className="md:hidden block text-xs font-medium text-white/50 mb-1.5">Singular</label>
                        <input
                          className={inputCls + (vazio(c.singular) ? ' !border-red-500/40' : '')}
                          value={c.singular}
                          maxLength={60}
                          onChange={e => editar(n, 'singular', e.target.value)}
                          aria-label={`${NOMES_NIVEL[n].titulo}: singular`}
                        />
                      </div>

                      <div>
                        <label className="md:hidden block text-xs font-medium text-white/50 mb-1.5">Plural</label>
                        <input
                          className={inputCls + (vazio(c.plural) ? ' !border-red-500/40' : '')}
                          value={c.plural}
                          maxLength={60}
                          onChange={e => editar(n, 'plural', e.target.value)}
                          aria-label={`${NOMES_NIVEL[n].titulo}: plural`}
                        />
                      </div>

                      <div>
                        <label className="md:hidden block text-xs font-medium text-white/50 mb-1.5">Género</label>
                        <select
                          className={inputCls + ' appearance-none'}
                          value={c.genero}
                          onChange={e => editar(n, 'genero', e.target.value)}
                          aria-label={`${NOMES_NIVEL[n].titulo}: género`}
                        >
                          {GENEROS.map(g => <option key={g.valor} value={g.valor}>{g.texto}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}

                <p className="text-xs text-white/30 mt-1">
                  O género define a concordância: «Nova disciplina», «Novo projeto».
                </p>

                {erroForm && <p className="mt-4 text-xs text-red-400">{erroForm}</p>}

                <div className="flex flex-wrap gap-3 mt-5">
                  <button
                    onClick={handleGuardar}
                    disabled={saving}
                    className="rounded-lg bg-[#4f9eff] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'A guardar…' : 'Guardar'}
                  </button>
                  {modo !== 'predefinicao' && (
                    <button
                      onClick={handleRepor}
                      disabled={saving || linhasAlvo.length === 0}
                      title={linhasAlvo.length === 0 ? 'Não há termos próprios para repor.' : undefined}
                      className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Repor
                    </button>
                  )}
                </div>
                {modo === 'predefinicao' && (
                  <p className="text-xs text-white/30 mt-3">
                    A predefinição não se repõe: tem de existir sempre, pois é usada por todos os tipos sem termos próprios.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ─── Pré-visualização ─── */}
          {alvoValido && (
            <aside className="rounded-xl border border-white/8 bg-[#13131a] p-5 lg:sticky lg:top-6">
              <h2 className="text-sm font-semibold text-white">Pré-visualização</h2>
              <p className="text-xs text-white/35 mt-0.5 mb-4">Atualiza ao escrever, antes de guardar.</p>

              <p className="text-xs font-medium text-white/50 mb-2">{nomeAlvo}</p>

              <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-white/45 mb-3 break-words">
                Início / {termos.entidade.singular} / {termos.programa.singular} / {termos.modulo.singular}
              </div>

              <div className="space-y-2">
                {[
                  novo(termos.modulo),
                  contar(termos.programa, 1),
                  contar(termos.programa, 3),
                  nenhum(termos.projeto),
                  `${ver(termos.modulo)} →`,
                  publicados(termos.projeto),
                ].map((frase, i) => (
                  <div key={i} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 break-words">
                    {frase}
                  </div>
                ))}
              </div>

              <p className="text-xs text-white/30 mt-4 leading-relaxed">
                Estes termos aparecem nas páginas públicas: entidade, programa/curso, disciplina e projeto.
                Sem tradução em EN, o site usa o texto em PT.
              </p>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
