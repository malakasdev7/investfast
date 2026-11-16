# Publicação do InvestFast na Vercel

O código está preparado para Vercel. Nenhum deploy foi criado nesta entrega. O banco Supabase já está ativo; não reaplique o schema inicial nesse projeto.

## 1. Validar o projeto

Use Node.js 22 ou 24 e execute na raiz:

```powershell
npm ci
npm test
npm run lint
npm run typecheck
npm run build
```

As dependências estão fixadas no `package.json` e no `package-lock.json`. Não inclua `.env.local`, `.env.qa.local` ou `node_modules` no Git.

## 2. Importar na Vercel

1. Crie um repositório privado contendo o código e o lockfile.
2. Em Vercel, escolha **Add New → Project**, importe esse repositório e selecione o framework **Next.js**.
3. Use a raiz do repositório como Root Directory, `npm ci` como Install Command e `npm run build` como Build Command. Mantenha o Output Directory padrão do Next.js.
4. Selecione Node.js 24 ou 22 e, quando disponível no plano, a região de funções próxima ao banco em São Paulo.
5. Configure as variáveis abaixo para o ambiente desejado.

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Origem HTTPS exata do aplicativo, sem caminho nem barra final. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jjvqcylnerfqbkpcrmxu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave **publishable** do projeto InvestFast, disponível no painel Supabase. |

Não configure service role como variável pública. A aplicação não precisa dessa chave. Variáveis `NEXT_PUBLIC_*` são incorporadas ao bundle durante o build; faça novo deploy ao alterá-las. `NEXT_PUBLIC_APP_URL` também controla a verificação de origem dos POST/PATCH/DELETE, portanto precisa corresponder à URL usada no navegador.

Para testar previews, use uma URL estável de preview com suas próprias variáveis e, de preferência, um projeto Supabase separado. Evite apontar previews de código não revisado para dados reais de produção.

## 3. Configurar e-mails e redirects no Supabase

Em **Authentication → URL Configuration**:

- Site URL: a origem HTTPS do InvestFast.
- Redirect URLs: a URL completa `/auth/callback?next=/dashboard`, `/auth/callback?next=/atualizar-senha` e `/auth/callback?next=/configuracoes`, cada uma precedida pela origem do aplicativo.
- Para desenvolvimento, registre também essas três URLs com `http://localhost:3000`.

Mantenha a confirmação de e-mail habilitada. Configure SMTP próprio em **Authentication → Email/SMTP** antes do lançamento, com remetente da marca InvestFast. O provedor padrão do Supabase possui limitações de envio; um cadastro com resposta positiva não comprova entrega do e-mail.

Os templates padrão com `ConfirmationURL` funcionam com o callback PKCE. O link deve ser aberto no navegador que iniciou a solicitação. Caso configure templates com token hash para acesso entre dispositivos, utilize `/auth/confirm?token_hash={{ .TokenHash }}&type=email` para confirmação e `type=recovery` para recuperação, precedidos pela origem do aplicativo. A rota também aceita `type=email_change`.

## 4. Banco e agendamento

O projeto atual já recebeu o schema e os ajustes de integridade pelo conector. As migrações locais documentam a reprodução em um banco vazio. Como a CLI não tinha uma sessão autenticada, o histórico de migrações remoto não foi sincronizado por `db pull`. Não execute `db push` neste projeto existente antes de revisar e reconciliar o histórico com `supabase migration repair` conforme a ajuda da versão instalada.

Para um novo projeto: aplique os arquivos de `supabase/migrations` em ordem e execute `supabase/schedule.sql` uma vez no SQL Editor. O job `investfast-recurring` roda diariamente às 06:00 UTC, equivalente a 03:00 em São Paulo. Também há geração idempotente ao carregar dados, para que o usuário receba lançamentos atualizados mesmo se o job tiver atrasado.

O cron roda no Supabase; não é necessário configurar Vercel Cron nem expor um endpoint administrativo.

## 5. Publicar e verificar

Depois de configurar domínio, variáveis e redirects, execute o deploy pelo painel ou pela integração Git da Vercel. A alternativa via CLI autenticada é `vercel deploy` para preview e `vercel deploy --prod` para produção, a partir da raiz e do projeto corretamente vinculado.

Verifique no domínio final:

1. `/api/health` responde com `status: ok`.
2. `/dashboard` redireciona visitantes para `/login`.
3. Cadastro, recebimento e confirmação de e-mail funcionam.
4. Login e recuperação de senha retornam ao domínio correto.
5. Criar, editar e excluir conta/transação atualiza o saldo após recarregar a página.
6. Outro usuário não visualiza esses registros.
7. Upload e download de anexo exigem sessão; links de download expiram em 60 segundos.
8. Logout e exclusão de conta impedem acesso aos dados.

Guarde uma cópia de segurança antes de futuras migrações com dados reais. Registre erros no painel da Vercel e acompanhe os advisors do Supabase. Para reverter o aplicativo, use o rollback da Vercel; isso não reverte automaticamente o banco.

Referências: [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [variáveis de ambiente](https://vercel.com/docs/environment-variables), [redirects do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).
