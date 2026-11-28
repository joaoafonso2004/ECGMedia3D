'use client';

import { useEffect, useState, useRef } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import LogoModelo3D from '@/components/LogoModelo3D';
import { useAdminFilter, FilterContextLine } from '../AdminFilterContext';

import { IconeCubo, IconeCarregar } from '@/components/Icones';
function SliderRow({ label, value, onChange, min, max, step, format }) {
  const display = format ? format(value) : value;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-cinza">{label}</span>
        <span className="text-xs font-mono text-acao">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-acao cursor-pointer"
      />
    </div>
  );
}

const ANIM_OPTS = [
  { value: 'none',     label: 'Sem Animação' },
  { value: 'rotation', label: 'Rotação'      },
  { value: 'float',    label: 'Flutuação'    },
];

function AnimPicker({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {ANIM_OPTS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition
            ${value === opt.value
              ? 'border-acao bg-acao/10 text-acao'
              : 'border-linha text-cinza hover:border-linha-2 hover:text-tinta-2'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function LogoPage() {
  const { entidadeId, entidades, programaId, programas } = useAdminFilter();

  const [logoExistente, setLogoExistente] = useState(null);
  const [status,        setStatus]        = useState('idle');
  const [toggle,        setToggle]        = useState(false);
  const [file,          setFile]          = useState(null);
  const [fileUrl,       setFileUrl]       = useState('');
  const [escala,        setEscala]        = useState(1.0);
  const [animacao,      setAnimacao]      = useState('rotation');
  const [editAnimacao,  setEditAnimacao]  = useState('rotation');
  const [editEscala,    setEditEscala]    = useState(1.0);
  const [editRotacaoX,  setEditRotacaoX]  = useState(0);
  const [editRotacaoY,  setEditRotacaoY]  = useState(0);
  const [editRotacaoZ,  setEditRotacaoZ]  = useState(0);
  const [editPosicaoX,  setEditPosicaoX]  = useState(0);
  const [editPosicaoY,  setEditPosicaoY]  = useState(0);
  const [savingAnim,    setSavingAnim]    = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [toast,         setToast]         = useState('');
  const fileRef = useRef();

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  /* ─── Carregar logo3d ao mudar programa (via contexto) ───────── */
  useEffect(() => {
    if (!programaId) { setLogoExistente(null); setStatus('idle'); return; }
    setStatus('loading');
    const supabase = createSupabaseBrowser();
    supabase
      .from('media_items')
      .select('*')
      .eq('tipo', 'logo3d')
      .eq('id_programa', programaId)
      .maybeSingle()
      .then(({ data }) => {
        setLogoExistente(data ?? null);
        setEditAnimacao(data?.animacao_tipo ?? 'rotation');
        setEditEscala(data?.escala ?? 1.0);
        setEditRotacaoX(data?.rotacao_x ?? 0);
        setEditRotacaoY(data?.rotacao_y ?? 0);
        setEditRotacaoZ(data?.rotacao_z ?? 0);
        setEditPosicaoX(data?.posicao_x ?? 0);
        setEditPosicaoY(data?.offset_y  ?? 0);
        setStatus('loaded');
      });
  }, [programaId]);

  function handleFileChange(e) {
    const f = e.target.files[0] ?? null;
    setFile(f);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(f ? URL.createObjectURL(f) : '');
  }

  async function handleSalvarAlteracoes() {
    if (!logoExistente) return;
    setSavingAnim(true);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase
      .from('media_items')
      .update({
        animacao_tipo: editAnimacao,
        escala:        editEscala,
        rotacao_x:     editRotacaoX,
        rotacao_y:     editRotacaoY,
        rotacao_z:     editRotacaoZ,
        posicao_x:     editPosicaoX,
        offset_y:      editPosicaoY,
      })
      .eq('id_media_items', logoExistente.id_media_items);
    if (error) {
      showToast('Erro ao guardar: ' + error.message);
    } else {
      showToast('Alterações guardadas!');
      setLogoExistente({ ...logoExistente, animacao_tipo: editAnimacao, escala: editEscala, rotacao_x: editRotacaoX, rotacao_y: editRotacaoY, rotacao_z: editRotacaoZ, posicao_x: editPosicaoX, offset_y: editPosicaoY });
    }
    setSavingAnim(false);
  }

  function resetForm() {
    setFile(null);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl('');
    setEscala(1.0);
    setToggle(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleGuardar() {
    if (!file || !programaId) return;
    setSaving(true);

    const formData = new FormData();
    formData.append('file', file);
    const res  = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = await res.json();

    if (!res.ok) {
      showToast('Erro no upload: ' + (json.error ?? res.statusText));
      setSaving(false);
      return;
    }

    const supabase = createSupabaseBrowser();
    const { error } = await supabase.from('media_items').insert([{
      tipo:         'logo3d',
      url:          json.url,
      escala,
      animacao_tipo: animacao,
      id_programa:  Number(programaId),
    }]);

    if (error) {
      showToast('Erro ao guardar logo: ' + error.message);
    } else {
      showToast('Logo guardado com sucesso!');
      resetForm();
      setStatus('loading');
      const { data } = await supabase
        .from('media_items')
        .select('*')
        .eq('tipo', 'logo3d')
        .eq('id_programa', programaId)
        .maybeSingle();
      setLogoExistente(data ?? null);
      setEditAnimacao(data?.animacao_tipo ?? 'rotation');
      setEditEscala(data?.escala ?? 1.0);
      setEditRotacaoX(data?.rotacao_x ?? 0);
      setEditRotacaoY(data?.rotacao_y ?? 0);
      setEditRotacaoZ(data?.rotacao_z ?? 0);
      setEditPosicaoX(data?.posicao_x ?? 0);
      setEditPosicaoY(data?.offset_y  ?? 0);
      setStatus('loaded');
    }
    setSaving(false);
  }

  async function handleEliminar() {
    if (!logoExistente) return;
    setDeleting(true);

    if (logoExistente.url) {
      const res = await fetch('/api/delete-model', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: logoExistente.url }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast('Erro ao apagar ficheiro: ' + (json.error ?? res.statusText));
        setDeleting(false);
        return;
      }
    }

    const supabase = createSupabaseBrowser();
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id_media_items', logoExistente.id_media_items);

    if (error) {
      showToast('Erro ao apagar no Supabase: ' + error.message);
    } else {
      showToast('Logo eliminado.');
      setLogoExistente(null);
    }
    setDeleting(false);
  }

  const entidadeNome = entidades.find(e => e.id_entidade == entidadeId)?.nome;
  const programaNome = programas.find(p => p.id_programa == programaId)?.nome;

  return (
    <div className="p-8 max-w-3xl mx-auto">

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg border border-linha bg-superficie
                        px-4 py-2.5 text-sm text-tinta shadow-xl">
          {toast}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-tinta">Logo do Programa</h1>
        <p className="text-sm text-cinza mt-1">
          Associa um modelo 3D como logótipo de um programa. Substitui o texto do código no hero da página pública.
        </p>
        <FilterContextLine />
      </div>

      {/* Indicador do filtro ativo */}
      {!entidadeId && (
        <div className="rounded-xl border border-linha bg-superficie p-5 mb-6">
          <p className="text-sm text-cinza text-center">
            Seleciona uma entidade e um programa no{' '}
            <a href="/admin/dashboard" className="text-acao hover:text-acao transition">
              Dashboard
            </a>{' '}
            para gerir o logo 3D.
          </p>
        </div>
      )}

      {entidadeId && !programaId && (
        <div className="rounded-xl border border-linha bg-superficie p-5 mb-6">
          <div className="flex items-center gap-2 justify-center">
            <span className="text-sm text-cinza">Entidade:</span>
            <span className="text-sm font-medium text-acao">{entidadeNome}</span>
            <span className="text-cinza/70 mx-1">·</span>
            <span className="text-sm text-cinza">
              Seleciona um programa no{' '}
              <a href="/admin/dashboard" className="text-acao hover:text-acao transition">
                Dashboard
              </a>{' '}
              para gerir o logo.
            </span>
          </div>
        </div>
      )}

      {/* Card principal — só visível quando há programa selecionado */}
      {programaId && (
        <>
          {/* Breadcrumb do filtro ativo */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs text-cinza/80">Entidade:</span>
            <span className="text-xs font-medium text-tinta-2">{entidadeNome}</span>
            <span className="text-cinza/60 text-xs">›</span>
            <span className="text-xs text-cinza/80">Programa:</span>
            <span className="text-xs font-medium text-acao">{programaNome}</span>
          </div>

          <div className="rounded-xl border border-linha bg-superficie p-6 space-y-6">

            {/* A carregar */}
            {status === 'loading' && (
              <p className="text-xs text-cinza/80 text-center py-6">A carregar…</p>
            )}

            {/* Logo existente */}
            {status === 'loaded' && logoExistente && (
              <div className="space-y-4">
                <div className="flex items-start gap-6 p-4 rounded-lg border border-linha bg-papel">
                  <div
                    className="rounded-lg border border-linha bg-papel overflow-hidden flex-shrink-0"
                    style={{ width: 350, height: 350 }}
                  >
                    <LogoModelo3D
                      url={logoExistente.url}
                      escala={editEscala}
                      animacao={editAnimacao}
                      width={350}
                      height={350}
                      rotacaoX={editRotacaoX}
                      rotacaoY={editRotacaoY}
                      rotacaoZ={editRotacaoZ}
                      posicaoX={editPosicaoX}
                      posicaoY={editPosicaoY}
                    />
                  </div>
                  <div className="flex-1 space-y-4 pt-1">
                    <div>
                      <p className="text-xs text-cinza mb-1">URL do ficheiro</p>
                      <a
                        href={logoExistente.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-acao hover:text-acao break-all transition"
                      >
                        {logoExistente.url}
                      </a>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-cinza">Escala (Multiplicador)</p>
                        <span className="text-xs font-mono text-acao">{editEscala.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range" min={0.1} max={5} step={0.1}
                        value={editEscala}
                        onChange={e => setEditEscala(parseFloat(e.target.value))}
                        className="w-full accent-acao cursor-pointer"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-cinza mb-2">Animação</p>
                      <AnimPicker value={editAnimacao} onChange={setEditAnimacao} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-cinza">Posição e Rotação</p>
                        <button
                          type="button"
                          onClick={() => { setEditRotacaoX(0); setEditRotacaoY(0); setEditRotacaoZ(0); setEditPosicaoX(0); setEditPosicaoY(0); }}
                          className="text-xs text-cinza/80 hover:text-cinza transition"
                        >
                          Repor
                        </button>
                      </div>
                      <div className="space-y-2">
                        <SliderRow label="Rot. X" value={editRotacaoX} onChange={setEditRotacaoX} min={-180} max={180} step={1} format={v => `${v}°`} />
                        <SliderRow label="Rot. Y" value={editRotacaoY} onChange={setEditRotacaoY} min={-180} max={180} step={1} format={v => `${v}°`} />
                        <SliderRow label="Rot. Z" value={editRotacaoZ} onChange={setEditRotacaoZ} min={-180} max={180} step={1} format={v => `${v}°`} />
                        <SliderRow label="Pos. X" value={editPosicaoX} onChange={setEditPosicaoX} min={-2} max={2} step={0.05} format={v => v.toFixed(2)} />
                        <SliderRow label="Pos. Y" value={editPosicaoY} onChange={setEditPosicaoY} min={-2} max={2} step={0.05} format={v => v.toFixed(2)} />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSalvarAlteracoes}
                        disabled={savingAnim}
                        className="rounded-lg bg-acao px-4 py-2 text-xs font-semibold text-white
                                   hover:bg-acao-escuro transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {savingAnim ? 'A guardar…' : 'Guardar alterações'}
                      </button>
                      <button
                        onClick={handleEliminar}
                        disabled={deleting}
                        className="rounded-lg border border-ecgm-r/30 px-4 py-2 text-xs font-medium
                                   text-ecgm-r hover:bg-ecgm-r/10 hover:text-ecgm-r transition
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting ? 'A eliminar…' : 'Eliminar logo'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sem logo */}
            {status === 'loaded' && !logoExistente && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setToggle(v => { if (v) resetForm(); return !v; })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition
                      ${toggle ? 'bg-acao' : 'bg-mosaico'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition
                      ${toggle ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-cinza">Usar modelo 3D como logo</span>
                </div>

                {toggle && (
                  <div className="space-y-5 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-cinza mb-1.5">Ficheiro GLB *</label>
                      <div
                        onClick={() => fileRef.current?.click()}
                        className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 cursor-pointer transition
                          ${file ? 'border-acao/60 bg-acao/5' : 'border-linha hover:border-linha-2'}`}
                      >
                        <span className="text-cinza">{file ? <IconeCubo tamanho={24} /> : <IconeCarregar tamanho={24} />}</span>
                        <div className="flex-1 min-w-0">
                          {file ? (
                            <>
                              <p className="text-sm font-medium text-tinta truncate">{file.name}</p>
                              <p className="text-xs text-cinza/80">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </>
                          ) : (
                            <p className="text-sm text-cinza/80">Clica para selecionar um ficheiro .glb</p>
                          )}
                        </div>
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".glb"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>

                    {fileUrl && (
                      <div className="flex items-start gap-6">
                        <div
                          className="rounded-lg border border-linha bg-papel overflow-hidden flex-shrink-0"
                          style={{ width: 200, height: 200 }}
                        >
                          <LogoModelo3D url={fileUrl} escala={escala} width={200} height={200} />
                        </div>
                        <div className="flex-1 pt-2">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-cinza">Escala (Multiplicador)</label>
                            <span className="text-xs font-mono text-acao">{escala.toFixed(1)}x</span>
                          </div>
                          <input
                            type="range" min={0.1} max={5} step={0.1}
                            value={escala}
                            onChange={e => setEscala(parseFloat(e.target.value))}
                            className="w-full accent-acao cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-cinza mb-2">Animação</label>
                      <AnimPicker value={animacao} onChange={setAnimacao} />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleGuardar}
                        disabled={saving || !file}
                        className="rounded-lg bg-acao px-5 py-2.5 text-sm font-semibold text-white
                                   hover:bg-acao-escuro transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'A guardar…' : 'Guardar Logo'}
                      </button>
                      <button
                        onClick={resetForm}
                        disabled={saving}
                        className="rounded-lg border border-linha px-5 py-2.5 text-sm font-medium
                                   text-cinza hover:bg-papel hover:text-tinta transition"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}
