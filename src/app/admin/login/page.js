'use client';

import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link'; // <-- Adicionada a importação do Link

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createSupabaseBrowser();
    
    // 1. Fazer o Login no sistema nativo do Supabase Auth
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Credenciais inválidas. Verifica o email e a password.');
      setLoading(false);
      return;
    }

    // 2. Buscar o ID oficial gerado (UUID)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Não foi possível obter o utilizador autenticado.');
      setLoading(false);
      return;
    }

    // 3. Buscar TODAS as permissões deste utilizador
    const { data: tiposUtilizador, error: tipoError } = await supabase
      .from('tipo_utilizador')
      .select('role')
      .eq('id_utilizador', user.id);

    if (tipoError || !tiposUtilizador || tiposUtilizador.length === 0) {
      setError('Não foi possível obter as permissões do utilizador.');
      setLoading(false);
      return;
    }

    // 4. Analisar os papéis (roles) dentro do array devolvido
    const isSuperAdmin = tiposUtilizador.some(t => t.role === 'superadmin');
    const isGestor = tiposUtilizador.some(t => t.role === 'gestor' || t.role === 'gestor_disciplina');

    // 5. Redirecionar para o painel correto
    if (isSuperAdmin) {
      router.push('/admin/dashboard');
    } else if (isGestor) {
      router.push('/gestor/dashboard');
    } else {
      setError('Tipo de utilizador sem acesso ao painel.');
      setLoading(false);
      return;
    }
    
    router.refresh();
  }

  return (
    <div className="relative min-h-screen bg-[#0c0c0f] flex items-center justify-center px-4">
      
      {/* Botão de Voltar à página inicial no canto superior esquerdo */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-sm font-medium text-white/40 hover:text-white transition-colors"
      >
        <span className="text-lg leading-none">&larr;</span> Voltar ao site
      </Link>

      <div className="w-full max-w-sm">

        {/* Logo / Título */}
        <div className="text-center mb-8">
          {/* Logo agora é clicável */}
          <Link href="/" className="text-2xl font-bold tracking-tight text-white hover:text-white/80 transition-colors">
            media3d
          </Link>
          <span className="text-[#4f9eff] mx-2 text-white/15">/</span>
          <span className="text-lg font-semibold text-[#4f9eff]">admin</span>
          <p className="mt-2 text-sm text-white/35">Acede ao painel de administração</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-[#13131a] p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@exemplo.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5
                           text-sm text-white placeholder-white/20
                           focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30
                           transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5
                           text-sm text-white placeholder-white/20
                           focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30
                           transition"
              />
            </div>

            {/* Erro */}
            {error && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-2.5">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#4f9eff] px-4 py-2.5 text-sm font-semibold
                         text-white transition hover:bg-[#3d8aef] active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'A entrar…' : 'Entrar'}
            </button>

          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/20">
          media3d — Painel de Administração
        </p>
      </div>
    </div>
  );
}