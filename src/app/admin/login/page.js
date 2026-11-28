'use client';

import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { MarcaRGB } from '@/components/SiteHeader';
import BotaoTema from '@/components/BotaoTema';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const CAMPO =
  'h-11 w-full rounded-[10px] border border-linha-2 bg-superficie px-3.5 text-[15px] text-tinta ' +
  'placeholder:text-cinza focus:border-acao focus:outline-none focus:ring-3 focus:ring-acao/15';

const ROTULO = 'mb-1.5 block text-[13px] font-medium text-tinta-2';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function mudarModo(registo) {
    setIsRegister(registo);
    setError('');
    setSuccess('');
  }

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

      setSuccess('Conta criada. Enviámos um email de confirmação: confirma-o e depois entra.');

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
          setError('Email não confirmado. Abre o email que te enviámos e clica no link de confirmação.');
        } else {
          setError('Email ou palavra-passe incorretos.');
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
        setError('Esta conta ainda não tem permissões. Fala com o administrador.');
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

  const titulo = isRegister ? 'Criar conta' : 'Entrar';

  return (
    <div className="flex min-h-dvh flex-col bg-papel text-tinta">
      <div className="contentor flex w-full items-center justify-between pt-5 md:pt-7">
        <Link href="/" className="inline-flex items-center gap-2 text-[15px] font-medium text-tinta-2 hover:text-tinta">
          <span aria-hidden="true">←</span> Voltar ao site
        </Link>
        <BotaoTema />
      </div>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:items-center sm:pt-0">
        <div className="w-full max-w-[400px] rounded-2xl border border-linha bg-superficie p-6 shadow-[0_1px_2px_rgb(11_9_4/0.04),0_12px_32px_-12px_rgb(11_9_4/0.12)] sm:p-8">
          <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-tinta">
            <MarcaRGB />
            ECGMedia3D
          </Link>

          <h1 className="mt-5 text-[28px] font-semibold leading-tight tracking-tight">{titulo}</h1>
          <p className="mt-1 text-[15px] text-tinta-2">
            {isRegister
              ? 'As contas novas são de aluno. Os gestores são criados pelo administrador.'
              : 'Entra para submeteres trabalhos ou gerires a tua disciplina.'}
          </p>

          <div role="group" aria-label="Escolher entre entrar e criar conta"
               className="mt-6 grid grid-cols-2 gap-1 rounded-[10px] border border-linha-2 bg-papel p-1">
            {[[false, 'Entrar'], [true, 'Criar conta']].map(([registo, rotulo]) => (
              <button
                key={rotulo}
                type="button"
                onClick={() => mudarModo(registo)}
                aria-pressed={isRegister === registo}
                className="h-9 rounded-[7px] text-[14.5px] font-medium text-tinta-2 transition-colors hover:text-tinta
                           aria-pressed:bg-tinta aria-pressed:text-white"
              >
                {rotulo}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="login-nome" className={ROTULO}>Nome</label>
                <input
                  id="login-nome"
                  type="text"
                  required
                  autoComplete="name"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="O teu nome completo"
                  className={CAMPO}
                />
              </div>
            )}

            <div>
              <label htmlFor="login-email" className={ROTULO}>Email</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@email.pt"
                className={CAMPO}
              />
            </div>

            <div>
              <label htmlFor="login-password" className={ROTULO}>Palavra-passe</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={isRegister ? 8 : undefined}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Palavra-passe"
                  aria-describedby={isRegister ? 'login-password-dica' : undefined}
                  className={`${CAMPO} pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-pressed={showPassword}
                  aria-controls="login-password"
                  className="absolute inset-y-1 right-1 rounded-[7px] px-3 text-[13px] font-medium text-tinta-2 hover:bg-papel hover:text-tinta"
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              {isRegister && (
                <p id="login-password-dica" className="mt-1.5 text-[13px] text-cinza">Mínimo de 8 caracteres.</p>
              )}
            </div>

            {error && (
              <div role="alert" className="flex gap-2.5 rounded-[10px] border border-ecgm-r/35 bg-ecgm-r/5 px-3.5 py-3 text-[14px] text-tinta">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                     className="mt-px shrink-0 text-ecgm-r">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div role="status" className="flex gap-2.5 rounded-[10px] border border-ecgm-g/35 bg-ecgm-g/5 px-3.5 py-3 text-[14px] text-tinta">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                     className="mt-px shrink-0 text-ecgm-g">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                <p>{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-[10px] bg-acao text-[15px] font-medium text-white transition-colors
                         hover:bg-acao-escuro disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (isRegister ? 'A criar conta…' : 'A entrar…') : titulo}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
