'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

export default function UtilizadorPerfil() {
  const [user, setUser] = useState({ nome: '', email: '' });
  const [loading, setLoading] = useState(true);

  // Estados de edição
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ nome: '', email: '', currentPassword: '', newPassword: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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

      const loadedUser = { email: authUser.email, nome: userData?.nome || '' };
      setUser(loadedUser);
      setFormData({ nome: loadedUser.nome, email: loadedUser.email, currentPassword: '', newPassword: '' });
      setLoading(false);
    }
    loadUser();
  }, []);

  function handleCancel() {
    setFormData({ nome: user.nome, email: user.email, currentPassword: '', newPassword: '' });
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  }

  async function handleSave(e) {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    const supabase = createSupabaseBrowser();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    try {
      // 1. Atualizar Nome
      if (formData.nome !== user.nome) {
        if (!formData.nome.trim()) throw new Error("O nome não pode estar vazio.");
        const { error: profileError } = await supabase
          .from('utilizadores')
          .update({ nome: formData.nome.trim() })
          .eq('id_utilizadores', authUser.id);
        if (profileError) throw new Error("Erro ao atualizar o nome: " + profileError.message);
      }

      let authUpdates = {};
      
      // 2. Verificar e preparar alteração de Password
      if (formData.newPassword) {
        if (!formData.currentPassword) {
          throw new Error("Para alterares a password, tens de introduzir a password atual primeiro.");
        }

        // Tentar autenticar com a password atual para garantir que é válida
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: formData.currentPassword,
        });

        if (signInError) {
          throw new Error("A password atual está incorreta.");
        }

        authUpdates.password = formData.newPassword;
      } else if (formData.currentPassword) {
        throw new Error("Introduziste a password atual, mas esqueceste-te de colocar a nova password.");
      }

      // 3. Preparar alteração de Email
      if (formData.email !== user.email) {
        authUpdates.email = formData.email.trim();
      }

      // 4. Aplicar atualizações de Autenticação (Email e/ou Password)
      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) throw new Error("Erro ao atualizar credenciais: " + authError.message);
      }

      // Atualizar o estado local com os novos dados guardados
      setUser({ nome: formData.nome, email: formData.email });
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '' })); 
      setIsEditing(false);
      
      // Dispara o evento para a Sidebar atualizar automaticamente o nome/email!
      window.dispatchEvent(new Event('profileUpdated'));
      
      if (authUpdates.email) {
        setMessage({ type: 'success', text: 'Perfil atualizado! Por favor, verifica as tuas caixas de correio para confirmar o novo email.' });
      } else {
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      
      {/* ── Cabeçalho ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">O teu Perfil</h1>
        <p className="text-sm text-white/35 mt-1">
          Gere as tuas credenciais e informações pessoais.
        </p>
      </div>

      {/* ── Mensagens de Notificação ── */}
      {message.text && (
        <div className={`mb-6 max-w-2xl rounded-lg border px-4 py-3 text-sm flex items-start gap-3 shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
          message.type === 'error' 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : 'bg-green-500/10 border-green-500/20 text-green-400'
        }`}>
          <div className="mt-0.5">{message.type === 'error' ? '⚠️' : '✓'}</div>
          <p className="leading-relaxed">{message.text}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-white/30 text-sm">
          A carregar informações do perfil...
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden max-w-2xl shadow-xl">
          
          {/* Header do Card com Avatar e Botão Editar */}
          <div className="flex items-center justify-between p-8 bg-gradient-to-r from-white/5 to-transparent border-b border-white/5">
            <div className="flex items-center gap-5">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#4f9eff] to-[#3d8aef] shadow-[0_0_20px_rgba(79,158,255,0.3)] text-white text-xl font-bold">
                {user.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">{user.nome}</h3>
                <p className="text-sm text-[#4f9eff] font-medium mt-0.5">Aluno</p>
              </div>
            </div>
            
            {!isEditing && (
              <button
                onClick={() => { setIsEditing(true); setMessage({type: '', text: ''}); }}
                className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-sm"
              >
                <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
                Editar
              </button>
            )}
          </div>

          {/* Corpo do Card */}
          <div className="p-8">
            {!isEditing ? (
              // MODO VISUALIZAÇÃO
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-medium text-white/30 uppercase tracking-wider mb-1.5">Nome Completo</p>
                  <p className="text-base font-medium text-white/90">{user.nome}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-white/30 uppercase tracking-wider mb-1.5">Email de Registo</p>
                  <p className="text-base font-medium text-white/90">{user.email}</p>
                </div>
              </div>
            ) : (
              // MODO EDIÇÃO
              <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30 transition"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Email de Registo</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30 transition"
                    />
                    <p className="text-[10px] text-yellow-500/70 mt-2 flex items-center gap-1.5">
                      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Se alterares o email, terás de confirmar nos links enviados para ambos os emails (novo e antigo).
                    </p>
                  </div>

                  {/* Bloco de Alteração de Password (Opcional) */}
                  <div className="p-5 mt-2 rounded-lg border border-white/5 bg-white/[0.02] space-y-4">
                    <p className="text-xs font-medium text-[#4f9eff]/80 uppercase tracking-wider mb-2">Alterar Password</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-white/40 mb-1.5">Password Atual</label>
                        <input 
                          type="password" 
                          placeholder="••••••••"
                          value={formData.currentPassword}
                          onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                          className="w-full rounded-lg bg-[#0c0c0f] border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30 transition placeholder-white/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-white/40 mb-1.5">Nova Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••"
                          value={formData.newPassword}
                          onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                          className="w-full rounded-lg bg-[#0c0c0f] border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30 transition placeholder-white/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 mt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-lg border border-white/10 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d8aef] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'A guardar alterações...' : 'Guardar Alterações'}
                  </button>
                </div>
              </form>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}