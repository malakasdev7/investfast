# Módulo Mercado — InvestFast

Acesso: `/mercado`. Abas: Ações (inclui filtro para ETFs e BDRs), FIIs, Criptomoedas, Índices e Favoritos. Busca consulta o catálogo e, com chave, o provedor. O grid mostra até 40 resultados por consulta; refine a busca para outros ativos.

## Arquivos e ordem de implementação

Todos os caminhos abaixo são relativos a `C:\Users\Gustavo\Desktop\Gustavo\investfast` e já estão salvos.

1. `supabase/migrations/20261029164509_investfast_market.sql`: cria somente market_assets, market_prices e user_favorite_assets, índices, chaves estrangeiras compostas e RLS. Migração aplicada ao projeto InvestFast. Não altera tabelas financeiras.
2. `src/lib/market/types.ts`: tipos, períodos, validação de valores e rotas.
3. `src/lib/market/catalog.ts`: catálogo inicial sem preços fictícios.
4. `src/lib/market/http.ts`: requests no servidor, cache Next.js de 60 segundos, deduplicação simultânea, timeout, backoff e cooldown para 429/erros temporários.
5. `src/lib/market/providers.ts`: brapi v2, descoberta de ativos, CoinGecko Demo em BRL, histórico e dividendos (inclusive endpoint próprio de FIIs).
6. `src/lib/market/service.ts`: persistência no Supabase, favoritos por usuário, fallback para preços salvos/manuais e paginação do histórico.
7. `src/app/api/market/route.ts`: consulta autenticada e ações de favorito, preço manual e preparação de operação. Usa a proteção de origem existente.
8. `src/components/market/market.tsx`: grid responsivo, busca, ordenação, skeleton, erros, gráfico, detalhes e integração com formulários existentes.
9. `src/app/(dashboard)/mercado/page.tsx` e `src/app/(dashboard)/mercado/[type]/[ticker]/page.tsx`: páginas do módulo.
10. Alterações pontuais: `src/components/layout/app-shell.tsx` adiciona Mercado; `src/components/forms/record-form.tsx` aceita valores iniciais opcionais, sem mudar o comportamento dos formulários existentes.
11. `tests/market.test.ts`, `tests/market-provider.check.ts` e `scripts/check-market.cjs`: validação e testes do novo módulo.

## Chaves de API

No arquivo local ignorado pelo Git `C:\Users\Gustavo\Desktop\Gustavo\investfast\.env.local`, adicione os valores reais:

```env
BRAPI_API_KEY=seu_token_brapi
COINGECKO_API_KEY=sua_chave_demo_coingecko
```

Reinicie o servidor local após salvar. Nenhuma chave deve ter prefixo NEXT_PUBLIC_. O template `.env.example` contém apenas nomes vazios.

Em produção, abra https://vercel.com/gustaff154-9928s-projects/investfast/settings/environment-variables e adicione BRAPI_API_KEY e COINGECKO_API_KEY como Secret, no ambiente Production. Para testar previews, configure valores próprios em Preview. Depois execute um novo deploy: alterações de variáveis não atualizam deploys antigos.

A chave CoinGecko esperada é Demo (`x-cg-demo-api-key`, host api.coingecko.com). Chaves Pro usam outro host e não são intercambiáveis. A brapi usa Authorization Bearer, sem token na URL. Todas as chamadas externas acontecem no servidor.

As chaves não estavam configuradas no ambiente local nem no projeto Vercel durante a implementação. Sem elas, o módulo mantém favoritos, histórico e preços manuais, mostra aviso discreto e não inventa cotações.

## Integração e isolamento

As três tabelas são privadas por usuário. A permissão de leitura pública era opcional; o isolamento impede que preços manuais de uma conta sejam apresentados a outra. Não é necessário adicionar uma chave administrativa Supabase.

Consultar Mercado nunca atualiza carteira, saldo ou posição. Preparar operação cria apenas o cadastro do ativo quando necessário e abre o formulário. O ativo novo recebe uma cotação inicial disponível; um ativo existente não tem seu preço sobrescrito. A operação exige o botão Salvar operação. Cancelar pode deixar o cadastro do ativo criado, mas não gera operação. Índices são referenciais e não geram operações; utilize um ETF negociável.

Atualizar preço manualmente nos detalhes grava apenas em market_prices. O módulo também lê cotações manuais existentes de Investimentos como fallback; não modifica essas cotações.

## Histórico e limites

O polling ocorre a cada 60 segundos com a página ativa. O cache externo não contém sessões nem dados pessoais. As respostas autenticadas usam private, no-store. Após falhas, os timestamps originais são preservados; a hora de uma nova tentativa não é apresentada como hora da cotação.

CoinGecko Demo limita consultas externas a 365 dias. Máximo disponível inclui também o histórico já persistido. brapi limita períodos, intervalos e dividendos conforme o plano. Os gráficos carregam até os 20 mil pontos mais recentes do intervalo e amostram no máximo aproximadamente 1.500 para renderização; o banco conserva todos os pontos. Não há coleta contínua com a página fechada.

Referências verificadas: https://brapi.dev/openapi.json, https://brapi.dev/docs/acoes, https://docs.coingecko.com/demo/reference/coins-id-market-chart, https://supabase.com/docs/guides/database/postgres/row-level-security.

## Validação

- `npm run check`
- `npm test`
- `node --conditions=react-server --import tsx tests/market-provider.check.ts`
- `npm run build`

As políticas foram testadas com transações revertidas: leitura entre usuários bloqueada, favoritos e preços cruzados rejeitados por FK composta, troca de proprietário rejeitada por RLS e precisão NUMERIC preservada. Os advisors não apontaram problemas novos nas tabelas Mercado; avisos preexistentes de autenticação/funções ficaram fora deste escopo.

Validação em produção concluída em 29/10/2026: grid em 320, 390 e 1440 pixels sem transbordamento horizontal; preço manual e gráfico persistidos após recarregar; favorito persistido; preparação e cancelamento sem operação; confirmação registrou operação e posição corretas; nenhum erro JavaScript. Conta QA, sessões e dados removidos após os testes. Os provedores foram testados com respostas controladas, pois as chaves reais ainda não foram configuradas.


Atualização: BRAPI_API_KEY configurada como Secret em Production a partir do .env.local autorizado. CoinGecko permanece sem chave; criptomoedas usam preços manuais. Cotação e histórico brapi de PETR4 validados diretamente com resposta HTTP 200.

