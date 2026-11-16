# Publicação e verificação móvel

URL de produção: https://investfast-malakas.vercel.app

Design atualizado: azul profundo, ciano e violeta, navegação inferior no celular, tabelas em cartões, formulários com alvos de toque maiores e respeito à área segura da tela.

Verificação em produção: login por usuário funcionou; dashboard, contas, transações, categorias, investimentos e configurações verificados em larguras de 320, 390, 768 e 1440 pixels, sem transbordamento horizontal. Modal de nova conta e menu móvel abriram e fecharam corretamente. Nenhum erro JavaScript capturado pelo navegador. Nenhum dado financeiro foi criado durante essa verificação.

Lint, TypeScript, seis testes automatizados e build local passaram. Deploy Vercel em produção com funções em São Paulo. Capturas de tela em docs/qa.

O manifesto permite adicionar um atalho à tela inicial; o aplicativo requer internet. O login usa Supabase Auth e as credenciais não fazem parte do código publicado.
