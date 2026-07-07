'use client';

import { createSupabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false); 
  const [nome, setNome] = useState('');                 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Novo estado para controlar a visibilidade da password
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const supabase = createSupabaseBrowser();

    if (isRegister) {
      /* ─── FLUXO DE REGISTO ────────────────────────────────────────── */
      if (!nome.trim()) {
        setError('O nome é obrigatório para o registo.');
        setLoading(false);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      const authUser = signUpData?.user;
      if (!authUser) {
        setError('Ocorreu um erro ao criar as credenciais.');
        setLoading(false);
        return;
      }

      const { error: perfilError } = await supabase
        .from('utilizadores')
        .insert([{
          id_utilizadores: authUser.id,
          nome: nome.trim(),
          email: email.trim(),
          id_entidade: null 
        }]);

      if (perfilError) {
        setError('Conta criada, mas falhou ao gerar o perfil: ' + perfilError.message);
        setLoading(false);
        return;
      }

      const { error: roleError } = await supabase
        .from('tipo_utilizador')
        .insert([{
          id_utilizador: authUser.id,
          role: 'utilizador',
          id_modulo: null 
        }]);

      if (roleError) {
        setError('Conta criada, mas falhou ao atribuir permissões: ' + roleError.message);
        setLoading(false);
        return;
      }

      setSuccess('Conta criada com sucesso! Um email de confirmação foi enviado. Confirma e faz login depois.');
      
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);

    } else {
      /* ─── FLUXO DE LOGIN ───────────────────────────────────────────── */
      const { error: authError, data: authData } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifica o teu email e clica no link de confirmação.');
        } else {
          setError('Credenciais inválidas. Verifica o email e a password.');
        }
        setLoading(false);
        return;
      }

      if (!authData?.user) {
        setError('Não foi possível obter o utilizador autenticado.');
        setLoading(false);
        return;
      }

      const { data: tiposUtilizador, error: tipoError } = await supabase
        .from('tipo_utilizador')
        .select('role')
        .eq('id_utilizador', authData.user.id);

      if (tipoError) {
        setError('Erro ao buscar permissões: ' + tipoError.message);
        setLoading(false);
        return;
      }

      if (!tiposUtilizador || tiposUtilizador.length === 0) {
        setError('Não tens permissões configuradas na base de dados.');
        setLoading(false);
        return;
      }

      const isSuperAdmin = tiposUtilizador.some(t => t.role === 'superadmin');
      const isGestor     = tiposUtilizador.some(t => t.role === 'gestor' || t.role === 'gestor_disciplina');
      const isUtilizador = tiposUtilizador.some(t => t.role === 'utilizador');

      if (isSuperAdmin) {
        router.push('/admin/dashboard');
      } else if (isGestor) {
        router.push('/gestor/dashboard');
      } else if (isUtilizador) {
        router.push('/utilizador/dashboard');
      } else {
        setError('Tipo de utilizador sem nível de acesso configurado.');
        setLoading(false);
        return;
      }
      
      router.refresh();
    }
  }

  return (
    <div className="relative min-h-screen bg-[#0c0c0f] flex items-center justify-center px-4">
      
      <Link 
        href="/" 
        className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-sm font-medium text-white/40 hover:text-white transition-colors"
      >
        <span className="text-lg leading-none">&larr;</span> Voltar
      </Link>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold tracking-tight text-white hover:text-white/80 transition-colors">
            media3d
          </Link>
          <span className="text-[#4f9eff] mx-2 text-white/15">/</span>
          <span className="text-lg font-semibold text-[#4f9eff]">
            {isRegister ? 'registo' : 'login'}
          </span>
          <p className="mt-2 text-sm text-white/35">
            {isRegister ? 'Cria a tua conta na comunidade' : 'Acede à tua área de trabalho'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#13131a] p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="O teu nome"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-2.5">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-500/25 bg-green-500/10 px-4 py-2.5">
                <p className="text-xs text-green-400">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#4f9eff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d8aef] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'A processar…' : isRegister ? 'Criar Conta' : 'Entrar'}
            </button>

            <div className="pt-2 text-center border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                  setSuccess('');
                }}
                className="text-xs text-[#4f9eff]/70 hover:text-[#4f9eff] transition-colors"
              >
                {isRegister 
                  ? 'Já tens uma conta? Faz Login aqui' 
                  : 'Não tens conta? Regista-te na comunidade aqui'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}