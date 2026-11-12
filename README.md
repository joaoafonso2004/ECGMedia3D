This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Base de dados (Supabase)

As alterações à base de dados estão em `supabase/migrations/`, por ordem de data. Para as aplicar, abrir o **SQL Editor** do projeto Supabase e correr cada ficheiro pela ordem do nome. Os scripts podem ser corridos mais do que uma vez sem problema.

| Ficheiro | O que faz |
|---|---|
| `20261108_notificacoes_tabela.sql` | Tabela `notificacoes`, índices e políticas RLS |
| `20261109_notificacoes_triggers.sql` | Trigger em `media_items` que cria as notificações e ativa o tempo real |
| `20261111_aprovacao_seguranca.sql` | Só o superadmin ou um gestor da disciplina pode aprovar/rejeitar (regra também na base de dados, não só na interface) |

## Notificações

Os gestores, administradores e alunos recebem avisos no painel (ícone do sino) sobre o fluxo de aprovação de conteúdos:

| Evento (`media_items.status`) | Quem recebe |
|---|---|
| Aluno pede aprovação (`pendente`) | Gestores da disciplina. Se a disciplina não tiver gestor, os superadmins |
| Pedido aprovado (`pendente → aprovado`) | Autor do conteúdo |
| Pedido rejeitado (`pendente → rejeitado`) | Autor do conteúdo |
| Removido da galeria (`aprovado → pessoal`) | Autor do conteúdo |

- As notificações são criadas na base de dados por um trigger, por isso funcionam qualquer que seja a página que altera o estado.
- Chegam em tempo real através do Supabase Realtime. Cada utilizador só recebe e vê as suas (RLS).
- Quando um gestor decide um pedido, o aviso desse pedido fica marcado como lido para os outros gestores da disciplina.
- Quando chega uma notificação aparece um aviso no canto do ecrã, o número no título do separador muda e a página de Aprovações atualiza-se sozinha.
- Se a ligação em tempo real falhar (rede instável, portátil suspenso), o sino passa a consultar a cada 30 segundos e volta ao tempo real quando a ligação regressa.
- O histórico completo está em `/admin/notificacoes`, `/gestor/notificacoes` e `/utilizador/notificacoes`.

## Testes

```bash
npm test
```

Corre as migrações de `supabase/migrations` num PostgreSQL em memória (PGlite), num ambiente semelhante ao do Supabase (roles `anon`/`authenticated`, `auth.uid()` e RLS), e verifica:

- quem recebe cada notificação, sem duplicados;
- que um aluno não consegue aprovar o próprio trabalho, nem um gestor de outra disciplina;
- que cada utilizador só vê e altera as suas notificações.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
