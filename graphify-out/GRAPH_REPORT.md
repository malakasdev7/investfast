# Graph Report - investfast  (2026-11-15)

## Corpus Check
- 148 files · ~86,729 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: (none) 22, .css 1)

## Summary
- 718 nodes · 2181 edges · 27 communities (20 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dabd32ac`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- next
- investment-calculator.tsx
- record-page.tsx
- market.tsx
- dashboard.tsx
- Supabase do InvestFast
- createClient
- domain.ts
- check-cdi.cjs
- compilerOptions
- components.json
- devDependencies
- dependencies
- package.json
- test-api.mjs
- document-files.mjs
- scripts
- app/layout.tsx
- Módulo Mercado — InvestFast
- CDI: caixinhas e cofrinhos
- AGENTS.md
- publicacao-mobile.md
- @tailwindcss/postcss@4.3.3
- postcss.config.mjs
- money.ts

## God Nodes (most connected - your core abstractions)
1. `RecordPage()` - 49 edges
2. `Button()` - 49 edges
3. `text()` - 46 edges
4. `cn()` - 45 edges
5. `today()` - 41 edges
6. `next` - 40 edges
7. `authenticated()` - 40 edges
8. `apiError()` - 39 edges
9. `Reports()` - 34 edges
10. `formatCurrency()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `Próximas melhorias` --references--> `AnalysisProvider`  [INFERRED]
  docs/MELHORIAS.md → src/lib/analysis/provider.ts
- `Próximas melhorias` --references--> `QuoteProvider`  [INFERRED]
  docs/MELHORIAS.md → src/lib/quotes/provider.ts
- `submit()` --calls--> `api()`  [EXTRACTED]
  src/components/forms/auth-form.tsx → src/hooks/use-finances.ts
- `main()` --calls--> `providerJSON()`  [EXTRACTED]
  tests/market-provider.check.ts → src/lib/market/http.ts
- `main()` --calls--> `quote()`  [EXTRACTED]
  tests/market-provider.check.ts → src/lib/market/providers.ts

## Import Cycles
- None detected.

## Communities (27 total, 7 thin omitted)

### Community 0 - "next"
Cohesion: 0.06
Nodes (86): nextConfig, securityHeaders, server-only@0.0.1, next, server-only, zod, DELETE(), GET() (+78 more)

### Community 1 - "investment-calculator.tsx"
Cohesion: 0.05
Nodes (84): decimal.js@10.6.0, date-fns, decimal.js, Page(), InvestmentCalculator(), handleExportCsv(), handleSaveSimulation(), prefillFromUserSnapshot() (+76 more)

### Community 2 - "record-page.tsx"
Cohesion: 0.07
Nodes (64): lucide-react, react, react-hook-form, sonner, @tanstack/react-query, AuthLayout(), Page(), Page() (+56 more)

### Community 3 - "market.tsx"
Cohesion: 0.08
Nodes (56): GET(), identity, maxDuration, POST(), Page(), Page(), Change(), MarketDetail() (+48 more)

### Community 4 - "dashboard.tsx"
Cohesion: 0.09
Nodes (48): Page(), Page(), Page(), Page(), Page(), Page(), Page(), Page() (+40 more)

### Community 5 - "Supabase do InvestFast"
Cohesion: 0.05
Nodes (32): Mapa de arquivos, 1. Validar o projeto, 2. Importar na Vercel, 3. Configurar e-mails e redirects no Supabase, 4. Banco e agendamento, 5. Publicar e verificar, Publicação do InvestFast na Vercel, Próximas melhorias (+24 more)

### Community 6 - "createClient"
Cohesion: 0.10
Nodes (21): @supabase/ssr, Page(), Page(), destinations, GET(), GET(), Page(), Page() (+13 more)

### Community 7 - "domain.ts"
Cohesion: 0.11
Nodes (15): AnalysisProvider, RulesAnalysisProvider, color, description, Entity, Field, fieldLabels, name (+7 more)

### Community 8 - "check-cdi.cjs"
Cohesion: 0.11
Nodes (12): assert, {chromium}, assert, {chromium}, fs, assert, {chromium}, assert (+4 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 11 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, eslint@10.13.0, eslint-config-next@16.4.3, tailwindcss@4.3.3, tsx@4.23.15, @types/node@26.6.5, @types/react@19.3.0, @types/react-dom@19.3.0 (+9 more)

### Community 12 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, date-fns@4.4.0, @hookform/resolvers@6.0.1, lucide-react@1.62.0, next@16.4.3, react@19.3.1, react-dom@19.3.1, react-hook-form@7.91.0 (+10 more)

### Community 13 - "package.json"
Cohesion: 0.14
Nodes (13): class-variance-authority@0.7.1, clsx@2.1.1, @radix-ui/react-slot@1.5.0, @supabase/supabase-js@2.118.0, engines, node, name, private (+5 more)

### Community 14 - "test-api.mjs"
Cohesion: 0.19
Nodes (13): account, cookies, create(), expenseCategory, form, holding, op, patch() (+5 more)

### Community 15 - "document-files.mjs"
Cohesion: 0.15
Nodes (8): files, known, root, rows, walk(), routes, definitions, relations

### Community 16 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check, check:supabase, dev, lint, start, test (+2 more)

### Community 17 - "app/layout.tsx"
Cohesion: 0.28
Nodes (6): next-themes@0.4.6, next-themes, metadata, RootLayout(), viewport, Providers()

### Community 18 - "Módulo Mercado — InvestFast"
Cohesion: 0.29
Nodes (6): Arquivos e ordem de implementação, Chaves de API, Histórico e limites, Integração e isolamento, Módulo Mercado — InvestFast, Validação

### Community 19 - "CDI: caixinhas e cofrinhos"
Cohesion: 0.33
Nodes (5): CDI: caixinhas e cofrinhos, Conta de origem e resgate, Excluir caixinha, Implementação e manutenção, Rendimento automático

## Knowledge Gaps
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `investment-calculator.tsx`, `record-page.tsx`, `market.tsx`, `dashboard.tsx`, `createClient`, `dependencies`, `package.json`, `app/layout.tsx`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.05911949685534591 - nodes in this community are weakly interconnected._
- **Why does `Próximas melhorias` connect `Supabase do InvestFast` to `domain.ts`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Should `investment-calculator.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05390893470790378 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `next` to `record-page.tsx`, `market.tsx`, `Supabase do InvestFast`, `createClient`, `dependencies`, `package.json`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `record-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06980240549828179 - nodes in this community are weakly interconnected._
- **Should `market.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07511737089201878 - nodes in this community are weakly interconnected._