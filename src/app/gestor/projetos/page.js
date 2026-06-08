'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

/* Helper para detetar se o URL aponta para um vídeo */
function isVideoUrl(url) {
  if (!url) return false;
  return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg');
}

/* ─── Modal genérico ────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-[#13131a] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

/* Nota: Cores ajustadas para o roxo do Gestor (#a78bfa) */
const inputCls = `w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#a78bfa]/50 focus:ring-1 focus:ring-[#a78bfa]/30 transition`;

/* ─── Galeria de Imagens e Vídeos do Projeto ────────────────────── */
function GaleriaProjeto({ id_projetos }) {
  const [media, setMedia]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const fetchMedia = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    const { data } = await supabase
      .from('media_items')
      .select('*')
      .eq('id_projetos', id_projetos)
      .in('tipo', ['imagem', 'video'])
      .order('id_media_items', { ascending: false });
      
    setMedia(data || []);
    setLoading(false);
  }, [id_projetos]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  async function handleUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    
    const supabase = createSupabaseBrowser();

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const json = await res.json();
        
        if (res.ok) {
          const tipo = file.type.startsWith('video/') ? 'video' : 'imagem';
          
          await supabase.from('media_items').insert([{
            id_projetos: id_projetos,
            url: json.url,
            tipo: tipo,
            titulo: file.name
          }]);
        }
      } catch (err) {
        console.error('Erro no upload da galeria:', err);
      }
    }
    
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    fetchMedia();
  }

  async function handleRemove(id) {
    const supabase = createSupabaseBrowser();
    await supabase.from('media_items').delete().eq('id_media_items', id);
    fetchMedia();
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className={`flex items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-6 transition
          ${uploading 
            ? 'border-white/5 bg-white/2 cursor-wait' 
            : 'border-white/10 hover:border-[#a78bfa]/40 hover:bg-[#a78bfa]/5 cursor-pointer'}`}
      >
        <span className="text-3xl">{uploading ? '⏳' : '📥'}</span>
        <div>
          <p className="text-sm font-medium text-white/80">
            {uploading ? 'A enviar ficheiros...' : 'Adicionar à Galeria'}
          </p>
          <p className="text-xs text-white/30 mt-0.5">
            Seleciona várias imagens (JPG/PNG) ou vídeos (MP4)
          </p>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/webm"
        className="hidden"
        onChange={handleUpload}
        disabled={uploading}
      />

      {loading ? (
        <div className="text-center py-4 text-xs text-white/30">A carregar galeria...</div>
      ) : media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {media.map(item => (
            <div key={item.id_media_items} className="relative group rounded-lg overflow-hidden border border-white/10 bg-[#0c0c0f] aspect-video">
              {item.tipo === 'video' ? (
                <video src={item.url} className="w-full h-full object-cover" muted loop playsInline />
              ) : (
                <img src={item.url} alt={item.titulo} className="w-full h-full object-cover" />
              )}
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <button
                  onClick={() => handleRemove(item.id_media_items)}
                  className="text-xs font-semibold text-red-400 bg-red-500/20 px-3 py-1.5 rounded-md hover:bg-red-500 hover:text-white transition"
                >
                  Remover
                </button>
              </div>
              
              <div className="absolute top-1.5 left-1.5 bg-black/50 text-white/70 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider backdrop-blur-md">
                {item.tipo}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Formulário de Projeto ─────────────────────────────────────── */
function ProjetoForm({ initial = {}, modulos = [], onSave, onCancel, saving, isNew = false }) {
  const [form, setForm] = useState({
    titulo:      initial.titulo      ?? '',
    descricao:   initial.descricao   ?? '',
    autores:     initial.autores     ?? '',
    id_modulo:   initial.id_modulo   ?? '',
    projeto_url: initial.projeto_url ?? '',
  });
  
  const [file, setFile] = useState(null);
  const fileRef = useRef();

  const [galleryFiles, setGalleryFiles] = useState([]);
  const galleryRef = useRef();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.titulo.trim()) { setError('O título é obrigatório.'); return; }
    if (!form.id_modulo)     { setError('A disciplina é obrigatória.'); return; }

    setUploading(true);
    setError('');

    let finalUrl = form.projeto_url;

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const res  = await fetch('/api/upload', { method: 'POST', body: formData });
        const json = await res.json();

        if (!res.ok) throw new Error(json.error ?? 'Erro no upload do ficheiro principal.');
        finalUrl = json.url;
      } catch (err) {
        setError(err.message);
        setUploading(false);
        return;
      }
    }

    await onSave({ ...form, id_modulo: Number(form.id_modulo), projeto_url: finalUrl, galleryFiles });
    setUploading(false);
  }

  const isBusy = saving || uploading;

  return (
    <div className="space-y-4">
      {/* Upload da Capa Principal */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Capa do Projeto (Opcional)</label>
        <div
          onClick={() => fileRef.current?.click()}
          className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 cursor-pointer transition
            ${file || form.projeto_url ? 'border-[#a78bfa]/40 bg-[#a78bfa]/5' : 'border-white/10 hover:border-white/20'}`}
        >
          <span className="text-2xl text-[#a78bfa]">
            {file || form.projeto_url ? (isVideoUrl(file?.name || form.projeto_url) ? '🎬' : '🖼️') : '📸'}
          </span>
          <div className="flex-1 min-w-0">
            {file ? (
              <>
                <p className="text-sm font-medium text-white/80 truncate">{file.name}</p>
                <p className="text-xs text-white/30">Novo recurso selecionado</p>
              </>
            ) : form.projeto_url ? (
              <p className="text-sm text-white/80 truncate">Recurso definido (Clica para alterar)</p>
            ) : (
              <p className="text-sm text-white/30">Clica para selecionar uma imagem ou vídeo</p>
            )}
          </div>
          {(file || form.projeto_url) && (
            <button
              onClick={e => { 
                e.stopPropagation(); 
                setFile(null); 
                set('projeto_url', ''); 
                if(fileRef.current) fileRef.current.value = ''; 
              }}
              className="text-white/25 hover:text-red-400 transition text-lg leading-none"
            >×</button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          className="hidden"
          onChange={e => { setFile(e.target.files[0] ?? null); setError(''); }}
        />
      </div>

      <Field label="Título do Projeto *">
        <input className={inputCls} value={form.titulo} onChange={e => set('titulo', e.target.value)} required />
      </Field>
      
      <div className="grid grid-cols-2 gap-3">
        <Field label="Autores">
          <input className={inputCls} value={form.autores} onChange={e => set('autores', e.target.value)} placeholder="Nomes separados por vírgula" />
        </Field>
        <Field label="Disciplina (Módulo) *">
          <select className={inputCls} value={form.id_modulo} onChange={e => set('id_modulo', e.target.value)} required>
            <option value="" disabled>Seleciona...</option>
            {modulos.map(m => (
              <option key={m.id_modulo} value={m.id_modulo}>{m.nome}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Descrição">
        <textarea className={inputCls + ' resize-none'} rows={3} value={form.descricao} onChange={e => set('descricao', e.target.value)} />
      </Field>

      {/* Secção da Galeria (apenas ao criar projeto novo) */}
      {isNew && (
        <div className="pt-2 border-t border-white/10 mt-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[#a78bfa]">Galeria do Projeto (Opcional)</h3>
            <p className="text-xs text-white/40 mt-0.5">Podes já adicionar imagens ou vídeos detalhados.</p>
          </div>
          <div
            onClick={() => galleryRef.current?.click()}
            className="flex items-center justify-center gap-3 rounded-lg border-2 border-dashed border-white/10 hover:border-[#a78bfa]/40 hover:bg-[#a78bfa]/5 px-4 py-6 cursor-pointer transition"
          >
             <span className="text-3xl">📥</span>
             <div>
               <p className="text-sm font-medium text-white/80">Selecionar Ficheiros</p>
               <p className="text-xs text-white/30 mt-0.5">Múltiplas imagens (JPG/PNG) ou vídeos (MP4)</p>
             </div>
          </div>
          <input
            ref={galleryRef}
            type="file"
            multiple
            accept="image/*,video/mp4,video/webm"
            className="hidden"
            onChange={e => setGalleryFiles(prev => [...prev, ...Array.from(e.target.files)])}
          />

          {galleryFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {galleryFiles.map((f, i) => {
                const isVid = f.type.startsWith('video/');
                const objUrl = URL.createObjectURL(f);
                return (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 bg-[#0c0c0f] aspect-video">
                    {isVid ? (
                      <video src={objUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={objUrl} alt={f.name} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <button
                        onClick={(e) => { e.stopPropagation(); setGalleryFiles(prev => prev.filter((_, idx) => idx !== i)); }}
                        className="text-xs font-semibold text-red-400 bg-red-500/20 px-3 py-1.5 rounded-md hover:bg-red-500 hover:text-white transition"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-2.5">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSave}
          disabled={isBusy}
          className="flex-1 rounded-lg bg-[#a78bfa] py-2.5 text-sm font-semibold text-white hover:bg-[#8b5cf6] transition disabled:opacity-50"
        >
          {uploading || saving ? 'A processar e guardar…' : 'Guardar Projeto'}
        </button>
        <button onClick={onCancel} disabled={isBusy} className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 transition">
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ─── Página Principal (Filtro por Gestor) ──────────────────────── */
export default function GestorProjetosPage() {
  const [projetos, setProjetos]           = useState([]);
  const [modulosList, setModulosList]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [modal, setModal]                 = useState(null); 
  const [saving, setSaving]               = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [toast, setToast]                 = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowser();
    
    // 1. Identificar o utilizador
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Procurar as permissões de módulos deste Gestor
    const { data: permissoes } = await supabase
      .from("tipo_utilizador")
      .select("id_modulo")
      .eq("id_utilizador", user.id)
      .not('id_modulo', 'is', null);

    const moduloIds = Array.from(new Set((permissoes || []).map(p => p.id_modulo)));

    if (moduloIds.length === 0) {
      setProjetos([]);
      setModulosList([]);
      setLoading(false);
      return;
    }

    // 3. Buscar Projetos pertencentes AOS MÓDULOS PERMITIDOS
    const { data: projData, error: projError } = await supabase
      .from('projetos')
      .select('id_projetos, titulo, descricao, autores, id_modulo, projeto_url, modulo:id_modulo(nome)')
      .in('id_modulo', moduloIds)
      .order('id_projetos', { ascending: false });

    if (!projError) setProjetos(projData ?? []);
    else showToast('Erro ao carregar projetos: ' + projError.message);

    // 4. Buscar Módulos (para o dropdown do formulário) AOS QUAIS TEM ACESSO
    const { data: modData } = await supabase
      .from('modulo')
      .select('id_modulo, nome, codigo')
      .in('id_modulo', moduloIds)
      .order('nome', { ascending: true });
      
    if (modData) setModulosList(modData);

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate(form) {
    setSaving(true);
    const supabase = createSupabaseBrowser();
    
    const payload = {
      titulo:      form.titulo.trim(),
      descricao:   form.descricao.trim() || null,
      autores:     form.autores.trim() || null,
      id_modulo:   form.id_modulo,
      projeto_url: form.projeto_url || null
    };

    const { data: novoProjeto, error } = await supabase.from('projetos').insert([payload]).select().single();

    if (error) {
      showToast('Erro ao criar projeto: ' + error.message);
      setSaving(false);
      return;
    }

    if (form.galleryFiles && form.galleryFiles.length > 0) {
      showToast('Projeto criado! A processar galeria...');
      for (const file of form.galleryFiles) {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const json = await res.json();
          if (res.ok) {
            const tipo = file.type.startsWith('video/') ? 'video' : 'imagem';
            await supabase.from('media_items').insert([{
              id_projetos: novoProjeto.id_projetos,
              url: json.url,
              tipo: tipo,
              titulo: file.name
            }]);
          }
        } catch (err) {
          console.error('Erro na galeria:', err);
        }
      }
    }

    showToast('Projeto criado com sucesso!');
    setModal(null);
    fetchData();
    setSaving(false);
  }

  async function handleEdit(form) {
    setSaving(true);
    const supabase = createSupabaseBrowser();
    const payload  = {
      titulo:      form.titulo.trim(),
      descricao:   form.descricao.trim() || null,
      autores:     form.autores.trim() || null,
      id_modulo:   form.id_modulo,
      projeto_url: form.projeto_url || null
    };

    const { error } = await supabase
      .from('projetos')
      .update(payload)
      .eq('id_projetos', modal.projeto.id_projetos);

    if (error) {
      showToast('Erro ao editar: ' + error.message);
    } else {
      showToast('Projeto atualizado com sucesso!');
      setModal(null);
      fetchData();
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createSupabaseBrowser();
    await supabase.from('projetos').delete().eq('id_projetos', confirmDelete);
    showToast('Projeto eliminado.');
    fetchData();
    setConfirmDelete(null);
    setDeleting(false);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg border border-white/10 bg-[#13131a] px-4 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projetos <span className="text-[#a78bfa] text-base">(Área do Gestor)</span></h1>
          <p className="text-sm text-white/35 mt-1">{loading ? '…' : `${projetos.length} projeto${projetos.length !== 1 ? 's' : ''} nas suas disciplinas`}</p>
        </div>
        <button
          onClick={() => setModal('novo')}
          className="flex items-center gap-2 rounded-lg bg-[#a78bfa] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8b5cf6] transition"
        >
          <span className="text-lg leading-none">+</span> Novo Projeto
        </button>
      </div>

      <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-white/25">A carregar…</div>
        ) : modulosList.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25 text-red-300/80">
            Ainda não lhe foi associada nenhuma disciplina. Fale com um Administrador.
          </div>
        ) : projetos.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25">Nenhum projeto associado às suas disciplinas. Crie o primeiro!</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/30 border-b border-white/5 bg-white/2">
                <th className="text-left px-5 py-3 font-medium w-16">Capa</th>
                <th className="text-left px-5 py-3 font-medium">Título do Projeto</th>
                <th className="text-left px-5 py-3 font-medium">Disciplina Associada</th>
                <th className="text-left px-5 py-3 font-medium">Autores</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {projetos.map((p, i) => (
                <tr key={p.id_projetos} className={`transition hover:bg-white/2 ${i !== projetos.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <td className="px-5 py-3.5">
                    {p.projeto_url ? (
                      <div className="h-10 w-10 overflow-hidden rounded-md border border-white/10 bg-[#0c0c0f]">
                        {isVideoUrl(p.projeto_url) ? (
                          <video src={p.projeto_url} className="h-full w-full object-cover" muted />
                        ) : (
                          <img src={p.projeto_url} alt="Capa" className="h-full w-full object-cover" />
                        )}
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/5 bg-white/5 text-[#a78bfa]/40 text-lg">📁</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-white/85">{p.titulo}</div>
                    {p.descricao && <div className="text-xs text-white/30 mt-0.5 truncate max-w-xs">{p.descricao}</div>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-md">{p.modulo?.nome || '—'}</span>
                  </td>
                  <td className="px-5 py-3.5 text-white/45 text-xs">{p.autores ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModal({ projeto: p })} className="rounded-md border border-[#a78bfa]/20 px-3 py-1.5 text-xs font-medium text-[#a78bfa]/60 hover:bg-[#a78bfa]/10 hover:text-[#a78bfa] transition">Gerir</button>
                      <button onClick={() => setConfirmDelete(p.id_projetos)} className="rounded-md border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal === 'novo' && (
        <Modal title="Novo Projeto" onClose={() => setModal(null)}>
          <ProjetoForm 
            modulos={modulosList} 
            onSave={handleCreate} 
            onCancel={() => setModal(null)} 
            saving={saving} 
            isNew={true} 
          />
        </Modal>
      )}

      {modal?.projeto && (
        <Modal title="Gerir Projeto" onClose={() => setModal(null)}>
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Informações e Recurso Principal</h3>
            <ProjetoForm 
              initial={modal.projeto} 
              modulos={modulosList} 
              onSave={handleEdit} 
              onCancel={() => setModal(null)} 
              saving={saving} 
            />
          </div>
          <hr className="border-white/5 mb-6" />
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#a78bfa]">Galeria do Projeto</h3>
              <p className="text-xs text-white/40 mt-0.5">Adiciona as imagens ou vídeos deste projeto.</p>
            </div>
            <GaleriaProjeto id_projetos={modal.projeto.id_projetos} />
          </div>
        </Modal>
      )}

      {confirmDelete !== null && (
        <Modal title="Confirmar eliminação" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-white/60 mb-6">Tens a certeza que queres eliminar este projeto?</p>
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={deleting} className="flex-1 rounded-lg bg-red-500/80 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition disabled:opacity-50">{deleting ? 'A eliminar…' : 'Eliminar'}</button>
            <button onClick={() => setConfirmDelete(null)} disabled={deleting} className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 transition">Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}