# InvestFast

Aplicativo de finanças pessoais e investimentos em português do Brasil, com Next.js e Supabase. Os dados financeiros são persistidos no PostgreSQL e isolados por usuário com RLS.

## Executar localmente

Requer Node.js 22 ou superior (24 recomendado).

```powershell
npm ci
npm run check:supabase
npm run dev
```

Abra http://localhost:3000. O arquivo .env.local desta máquina já contém a URL e a chave publicável do projeto InvestFast. Em outra máquina, copie .env.example para .env.local e preencha as variáveis. Nunca use service role em variáveis NEXT_PUBLIC_.

Para servir o build de produção:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

## Módulos implementados

- Cadastro, login, logout, confirmação, recuperação e atualização de senha via Supabase Auth.
- Páginas privadas, sessão por cookies e autenticação também em cada endpoint.
- Dashboard com patrimônio, saldo, posições, resultados realizados/não realizados, proventos, fluxo por período, gráficos e alertas.
- Contas com extrato, categorias, orçamentos, transações, transferências e pagamento de cartão sem duplicar despesas.
- Recorrências semanais, mensais, trimestrais e anuais, geradas como pendentes com antecedência de três meses.
- Carteiras, 15 classes de ativos, operações, cotações manuais e histórico de preços.
- Compras/vendas, aportes/resgates, proventos, bonificações, desdobramentos, agrupamentos e transferência de custo entre carteiras.
- Metas e aportes com progresso, prazo e valor mensal necessário.
- Relatórios, filtros, CSV com proteção contra fórmulas e análises por regras sem API paga.
- Perfil, avatar por URL HTTPS, tema salvo no perfil, alteração de e-mail e exclusão de conta com confirmação dupla.
- Anexos privados, links temporários de download e auditoria de alterações.

## Arquitetura e cálculos

A stack usa Next.js 16.4.3/App Router, TypeScript, Tailwind, componentes no padrão shadcn/ui, Supabase Auth/PostgreSQL, Zod, React Hook Form, TanStack Query, Recharts, Lucide e date-fns. Decimal.js fornece aritmética decimal. TypeScript 6.0.3 foi fixado por compatibilidade com o analisador de lint.

O banco mantém 17 tabelas com user_id e RLS, FKs compostas que impedem vínculos entre usuários e permissões restritas para campos derivados. Saldos e posições são recalculados após alterações. Operações usam data e sequência estável; transferências de carteira preservam custo sem gerar resultado. A API de leitura serializa NUMERIC como strings antes de chegar ao JavaScript.

Saldo da conta = saldo inicial + movimentos pagos + liquidações de investimentos vinculadas. Transferências e pagamento de fatura não entram no fluxo de receitas/despesas. Aportes em metas apenas acompanham objetivos; não movimentam novamente as contas. Dividendos não alteram quantidade. Custos de compra incluem taxas; vendas descontam taxas e usam o custo médio remanescente.

Retorno da posição = (valor atual - custo remanescente) / custo remanescente. Resultado total soma valorização, lucro realizado e proventos. A anualização simples é mostrada apenas a partir de 30 dias, com uma única compra/aporte e sem vendas ou transferências. Não é XIRR. Posições históricas sem cotação usam o custo como estimativa, informado na interface. Ativos sem preço atual exibem valor zero e alerta para cadastrar a cotação.

Os formulários compartilham esquemas Zod com a API. TanStack Query usa cache em memória; nenhum registro financeiro depende de localStorage. Logout limpa o cache. O tema é persistido no perfil e espelhado localmente para renderização.

## Banco e ambiente

Projeto Supabase: InvestFast, referência jjvqcylnerfqbkpcrmxu, região São Paulo. O schema já foi aplicado neste projeto; não o reaplique. Para outro banco vazio, use as migrações e o agendamento em supabase/schedule.sql. O job de recorrências já está ativo no projeto atual.

A aplicação está implementada e validada por build, testes de cálculo, SQL e HTTP. A publicação na Vercel, a entrega real de e-mails e a revisão visual não foram verificadas. A ferramenta de navegador expirou; a CLI Supabase não tinha autenticação para configurar os redirects remotos. Consulte os passos exatos abaixo antes do lançamento.

## Documentação

- [Mapa e explicação de cada arquivo](docs/ARQUIVOS.md)
- [Banco, segurança e configuração de Auth](docs/SUPABASE.md)
- [Deploy completo na Vercel](docs/DEPLOY.md)
- [Verificações realizadas e limitações](docs/VERIFICACAO.md)
- [Melhorias futuras](docs/MELHORIAS.md)

## Testes

npm test executa os testes TypeScript. supabase/tests.sql usa dados temporários com rollback. scripts/test-api.mjs testa o servidor real com uma conta temporária e a exclui ao final. Consulte VERIFICACAO.md antes de executá-lo.

