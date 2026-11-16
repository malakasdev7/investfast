# Supabase do InvestFast

Projeto ativo: **InvestFast**, referência `jjvqcylnerfqbkpcrmxu`, região `sa-east-1` (São Paulo), PostgreSQL 17.

[Abra o painel do projeto](https://supabase.com/dashboard/project/jjvqcylnerfqbkpcrmxu).

## Schema aplicado

As 17 tabelas solicitadas estão criadas: profiles, accounts, categories, transactions, recurring_transactions, budgets, goals, goal_contributions, portfolios, assets, holdings, investment_transactions, asset_prices, dividends, alerts, attachments e audit_logs.

Todas possuem UUID, user_id vinculado a auth.users e políticas RLS de SELECT/INSERT/UPDATE/DELETE. Os privilégios concedidos aos clientes são ainda mais restritos: posições, proventos derivados e auditoria são somente leitura; saldo, preço atual e acumulado das metas não podem ser manipulados diretamente. FKs compostas (user_id, id) impedem vincular registros de donos diferentes.

O cadastro dispara a criação do perfil, 17 categorias e uma carteira inicial. Não há dados financeiros globais nem registros de demonstração.

## Fontes e migrações

- scripts/generate-schema.mjs: definições e geração do SQL inicial.
- supabase/schema.sql: SQL completo inicial, legível e executável em banco vazio.
- supabase/hardening.sql: persistência de alertas, proteção de categorias vinculadas e cotação futura, vínculo de uploads a perfil existente.
- supabase/migrations: cópias versionadas geradas com a CLI, em ordem de aplicação.
- supabase/schedule.sql: agendamento idempotente do job de recorrências.
- supabase/tests.sql: testes transacionais de isolamento e cálculos, terminando em rollback.

No projeto atual, o schema foi aplicado diretamente pelo conector e verificado por SQL. A CLI não tinha acesso autenticado para gerar um db pull e sincronizar o histórico remoto. Não executar db push no banco atual sem reconciliar o histórico; as migrações locais são a reprodução para um banco vazio.

## Cálculos e concorrência

As escritas de lançamentos bloqueiam a linha do perfil do dono, serializando o recálculo por usuário. Operações de investimento são reprocessadas por data e operation_sequence, inclusive quando editadas ou excluídas. Vendas acima da posição são rejeitadas. Transferências carregam o custo proporcional sem lucro ou prejuízo. A quantidade respeita NUMERIC(20,8); custo e preço médio derivados usam NUMERIC com precisão interna adicional.

Saldos de contas incluem lançamentos pagos e liquidações de operações vinculadas a uma conta. Compras/aportes debitam e vendas/resgates/proventos creditam. Operações sem conta vinculada afetam somente a carteira. Metas são acompanhamento e não duplicam caixa.

A função app_snapshot executa como o usuário, respeita RLS e converte números do PostgreSQL em strings JSON. Isso evita que valores financeiros atravessem a API como float do JavaScript. Os tipos gerados em src/types/database.ts refletem a API REST padrão; o frontend utiliza o contrato Snapshot com strings retornado pela RPC.

## Recorrências

O job investfast-recurring está ativo: 0 6 * * * em UTC (03:00 de São Paulo). Gera ocorrências pendentes até três meses adiante. A combinação usuário + regra + data é única, e a regra preserva o dia âncora ao atravessar meses mais curtos. A API também chama a função idempotente ao carregar dados.

Ocorrências geradas são transações independentes: editar uma regra não reescreve os lançamentos já existentes. Para encerrar uma série, desative a regra; remova separadamente ocorrências futuras que não deseja manter.

## Autenticação e arquivos

Clientes SSR usam cookies e chave publicável, sem service role. Proxy, layouts e endpoints validam usuário com getUser. Mutações HTTP verificam a origem e validam dados com Zod. Todos os dados permanecem no banco; o cache do navegador é transitório.

O bucket investfast-private é privado, limita arquivos a 5 MB e permite PDF, JPEG, PNG e WebP. Caminhos começam pelo UUID do dono. Download usa URL assinada válida por 60 segundos. O aplicativo exige confirmação antes de exclusões; a conta exige confirmação dupla, senha atual e remove arquivos antes da exclusão do usuário.

## Configurações de e-mail pendentes de ambiente

E-mail e confirmação obrigatória foram verificados pelo endpoint Auth público. As rotas /auth/callback e /auth/confirm estão implementadas, assim como cadastro e recuperação por e-mail. O envio real não foi validado em uma caixa de entrada.

A CLI retornou AccessTokenRequiredError ao tentar ler a configuração remota; não houve alteração nas URLs de Auth por esse caminho. Configure Site URL, redirects exatos e SMTP conforme [DEPLOY.md](DEPLOY.md). Isso é necessário antes da publicação e para testar os e-mails ponta a ponta.

## Advisors

Veja [VERIFICACAO.md](VERIFICACAO.md) para os dois avisos intencionais de funções privilegiadas limitadas ao usuário autenticado e os índices ainda não utilizados em um banco novo.

