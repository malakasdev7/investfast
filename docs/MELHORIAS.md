# Próximas melhorias

1. Verificação visual e testes Playwright em desktop/mobile, incluindo navegação por teclado, leitores de tela e falhas de rede.
2. Integração de cotações mediante provedor contratado ou autorizado. O contrato `QuoteProvider` já separa o recebimento da cotação de seu armazenamento.
3. Rentabilidade ponderada por tempo e dinheiro (TWR/XIRR) para carteiras com múltiplos fluxos. A anualização simples atual só aparece para uma compra/aporte sem vendas ou transferências.
4. Paginação e agregações SQL incrementais para grandes históricos. Atualmente o snapshot carrega os registros do usuário; auditoria é limitada aos 100 eventos mais recentes.
5. Cache/valoração histórica diária e data efetiva do saldo inicial. O gráfico atual reconstrói posições e usa custo quando falta uma cotação histórica.
6. Motor de recorrência com prévia das próximas datas, edição em lote da série e histórico de mudanças. As ocorrências já geradas são registros independentes.
7. Importação CSV/OFX com prévia e detecção de duplicações; conciliação e Open Finance mediante consentimento e provedor adequado.
8. Multimoeda e câmbio. O MVP usa BRL para evitar somar moedas incompatíveis.
9. Gestão de fatura com fechamento/vencimento, parcelamento, estornos e conciliação do cartão. Hoje o cartão é uma conta e o pagamento é uma transferência sem nova despesa.
10. Upload de avatar, além da URL HTTPS atualmente suportada; antivírus/quarentena de anexos e limpeza automática de arquivos órfãos de falhas de rede.
11. SMTP próprio, domínio, observabilidade, alertas de falhas no cron, backups e teste de restauração antes de lançamento público.
12. Provedor opcional de IA por trás de `AnalysisProvider`, com consentimento, minimização de dados e controle de custo. O motor atual funciona sem API paga.
13. MFA e reforço da reautenticação para ações sensíveis; trilha de auditoria com retenção configurável.
14. Exportação contábil/fiscal validada por especialistas. Os relatórios atuais são de acompanhamento financeiro, sem apuração tributária.
