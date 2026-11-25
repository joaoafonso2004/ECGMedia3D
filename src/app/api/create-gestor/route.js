import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const erro = (mensagem, estado) =>
  NextResponse.json({ success: false, error: mensagem }, { status: estado });

/* Quem fez o pedido: lê a sessão dos cookies (como o proxy) e valida-a no Supabase */
async function utilizadorDoPedido() {
  const loja = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => loja.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request) {
  // Cliente com a chave de serviço (ignora o RLS): só depois de confirmar que é um superadmin
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  // 1. Só o superadmin pode criar gestores
  const quem = await utilizadorDoPedido();
  if (!quem) return erro('É preciso iniciar sessão.', 401);

  const { data: papeis, error: papelError } = await supabaseAdmin
    .from('tipo_utilizador')
    .select('id_tipo_utilizador')
    .eq('id_utilizador', quem.id)
    .eq('role', 'superadmin')
    .limit(1);
  if (papelError) return erro('Erro ao verificar permissões.', 500);
  if (!papeis?.length) return erro('Só o administrador pode criar gestores.', 403);

  // 2. Dados do formulário
  let body;
  try {
    body = await request.json();
  } catch {
    return erro('Pedido inválido.', 400);
  }
  const { nome, email, password, id_entidade, id_programa, disciplinas } = body ?? {};
  if (!nome?.trim() || !email?.trim() || !password) {
    return erro('Nome, email e palavra-passe são obrigatórios.', 400);
  }

  let userId = null;
  try {
    // 3. Conta no Supabase Auth, já confirmada
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });
    if (authError) throw new Error('Erro no Auth: ' + authError.message);
    userId = authUser.user.id;

    // 4. Perfil na tabela 'utilizadores'
    const { error: userError } = await supabaseAdmin.from('utilizadores').insert([
      { id_utilizadores: userId, nome: nome.trim(), email: email.trim(), id_entidade },
    ]);
    if (userError) throw new Error('Erro na tabela utilizadores: ' + userError.message);

    // 5. Role 'gestor' genérica
    const { error: roleError } = await supabaseAdmin.from('tipo_utilizador').insert([
      { id_utilizador: userId, id_entidade, role: 'gestor' },
    ]);
    if (roleError) throw new Error('Erro na role gestor: ' + roleError.message);

    // 6. Uma linha por disciplina
    if (Array.isArray(disciplinas) && disciplinas.length > 0) {
      const { error: discError } = await supabaseAdmin.from('tipo_utilizador').insert(
        disciplinas.map(id_modulo => ({
          id_utilizador: userId,
          id_entidade,
          id_programa,
          id_modulo: Number(id_modulo),
          role: 'gestor_disciplina',
        })),
      );
      if (discError) throw new Error('Erro ao associar disciplinas: ' + discError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API create-gestor:', error);
    // Não deixa contas a meio: se algum passo falhou, apaga a conta criada
    if (userId) {
      await supabaseAdmin.from('tipo_utilizador').delete().eq('id_utilizador', userId);
      await supabaseAdmin.from('utilizadores').delete().eq('id_utilizadores', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
    return erro(error.message, 400);
  }
}
