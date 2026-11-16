# Verificação da entrega

## Evidências obtidas

- Build de produção do Next.js compilou todas as rotas; TypeScript foi validado.
- ESLint executado; avisos de importação não utilizada e `watch` do React Hook Form foram corrigidos com remoção do import e `useWatch`.
- Seis testes TypeScript cobrem ordem de operações, preço médio, custo transferido, lucro realizado, decimais fracionários, venda acima da posição, fluxo sem transferências/faturas, intervalo personalizado, entradas inválidas e CSV seguro.
- `supabase/tests.sql` executado em transação com rollback: RLS entre dois usuários, FK entre usuários, saldos após edição/exclusão, proventos, desdobramento, agrupamento, bonificação, transferência de custo, cotação, metas, recorrência e serialização decimal.
- Teste HTTP real com uma conta temporária: login, rejeição de origem externa, criação/edição/exclusão, transferência e pendência, orçamento, upload/download/exclusão de anexo privado, compra/venda/proventos, atualização de preço, metas, recorrência, perfil e exclusão da conta.
- Rodada final HTTP também confirmou alertas de orçamento persistidos e tema salvo no perfil.
- A conta temporária e seus arquivos foram removidos. Consulta posterior confirmou zero usuários temporários remanescentes.
- Consulta de infraestrutura confirmou **17 tabelas com RLS habilitado** e o job diário `investfast-recurring` ativo.

## Limites da verificação

- A ferramenta de navegador não respondeu em duas tentativas após a retomada. Não há aprovação visual, teste de responsividade em dispositivos nem verificação de interações reais pelo navegador nesta entrega. O fluxo HTTP/API e o build foram verificados.
- Entrega de e-mail, confirmação e recuperação via caixa de entrada não foram testadas. Os handlers estão implementados; SMTP, templates e redirects de produção dependem da configuração do serviço.
- O Supabase CLI não estava autenticado. A configuração remota de Auth não pôde ser lida/alterada pela CLI. Não foram extraídos tokens de outras aplicações.
- A aplicação não foi publicada na Vercel; o procedimento completo está em `DEPLOY.md`.

## Advisors do Supabase

Não foram identificadas tabelas públicas sem RLS. Há dois avisos esperados sobre funções `SECURITY DEFINER` executáveis por usuários autenticados:

- `generate_recurring()`: não aceita identificador de usuário; usa exclusivamente `auth.uid()` e chama uma implementação privada revogada para clientes.
- `delete_own_account(confirmation)`: exige identidade, texto exato de confirmação e token recente; remove apenas o usuário autenticado. O endpoint da aplicação também exige a senha atual e confirmação dupla na interface.

Essas permissões são intencionais e necessárias para as operações restritas. Revisar esse desenho ao alterar as funções. [Explicação do advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Os advisors de performance reportaram índices ainda não utilizados em um banco novo. Eles foram mantidos por cobrirem filtros e foreign keys previstos. [Índices não utilizados](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Repetir os testes

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npm run check:supabase
```

Execute `supabase/tests.sql` pelo SQL Editor ou conector em ambiente de testes; o arquivo termina em rollback. Para o teste HTTP, inicie `npm start`, provisione uma conta temporária confirmada com domínio `investfast.invalid` e coloque somente as credenciais dessa conta em `.env.qa.local`, usando `IF_QA_EMAIL` e `IF_QA_PASSWORD`. `npm run test:api` apaga essa conta ao terminar com sucesso. Nunca use credenciais de uma conta real nesse teste.
