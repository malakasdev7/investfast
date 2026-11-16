# CDI: caixinhas e cofrinhos

Na aba Investimentos, use Adicionar caixinha CDI. Informe instituição, percentual contratado, carteira, valor e data. Os atalhos Nubank e Mercado Pago preenchem apenas nome e instituição: confira a taxa do seu produto.

## Conta de origem e resgate

Selecione **Descontar aporte da conta** para retirar o valor do saldo disponível. **Não movimentar conta** serve para dinheiro já aplicado ou externo. A aplicação e o lançamento financeiro são salvos atomicamente; não é criada uma despesa duplicada. Contas devem estar ativas, em reais, sem ser cartão de crédito. Aportes superiores ao saldo disponível são recusados.

No resgate, selecione a conta de destino e informe o valor bruto e os impostos/taxas efetivamente retidos pelo banco. A conta recebe o valor líquido. O saldo da aplicação diminui pelo valor bruto. A conta escolhida na criação é sugerida nas movimentações seguintes, mas pode ser trocada.

## Rendimento automático

Ao carregar os dados, o servidor consulta a série diária CDI 12 do Banco Central e aplica o percentual contratado, apenas para datas com taxa publicada, desde a última avaliação (inclusive) até a data atual (exclusive). O cálculo usa capitalização composta diária; a posição é atualizada pelo preço da unidade, sem criar aportes ou receitas fictícias. O patrimônio soma caixa disponível e aplicações, sem contar duas vezes o aporte.

Os valores calculados são estimativas brutas, antes de IR e IOF. Não há conexão com o banco do usuário; regras específicas de cada produto, prazos de início de remuneração, limites promocionais e diferenças de arredondamento podem produzir outro saldo. Juros são atualizados quando o aplicativo carrega os dados, inclusive recuperando dias anteriores; não há processo agendado por usuário.

A BRAPI continua sendo a fonte de mercado dos ativos. Para CDI usa-se a [série oficial SGS 12 do BCB](https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json), que fornece taxa percentual diária. Selic não é usada como substituto do CDI.

Atualizar saldo do banco reconcilia a posição total, sem movimentar conta ou criar aporte. Em várias carteiras, informe a soma. O cálculo recomeça a partir desse saldo/data. A indisponibilidade do CDI preserva o último saldo e exibe aviso. Alterar o percentual preserva o rendimento já calculado; o novo percentual vale a partir da alteração. Não há projeção de rentabilidade futura garantida.

## Implementação e manutenção

Unidade inicial R$ 1; quantidade e preço com oito casas. Fator composto truncado a 16 casas a cada taxa. Resgate total elimina resíduos de quantidade. Movimentações aceitam datas iguais ou posteriores à última operação ou avaliação; ajustes anteriores exigem revisão do histórico. Estimativas não devem ser usadas como extrato fiscal.

RPCs manage_cdi e accrue_cdi usam SECURITY INVOKER, permissões autenticadas e RLS por proprietário. Taxas diárias ficam isoladas por usuário; consultas públicas ao BCB têm cache no servidor. Migrações 20261030205428 e 20261030210807. Endpoints em src/app/api/investments/cdi e src/app/api/data; cálculo em src/lib/cdi.

QA: teste transacional no banco para débito, crédito líquido, capitalização, repetição sem juros duplicados, saldo insuficiente com rollback e reconciliação sem alterar caixa. scripts/check-cdi.cjs cobre o fluxo publicado com usuário descartável e verifica 320/390/1440 px e controles em 390×460 px.

## Excluir caixinha
O botão Excluir caixinha em cada cartão abre uma confirmação. A exclusão remove o ativo, cotações e histórico de operações, desfazendo débitos e créditos das contas vinculadas. Para preservar histórico, use Resgatar. A RPC delete_cdi é atômica, SECURITY INVOKER e restrita ao dono; remove operações na ordem inversa para manter o replay válido. Testes: scripts/check-cdi-delete.cjs valida cancelar, confirmar em tela reduzida, persistência e restauração do saldo; teste transacional verifica isolamento entre usuários e preservação de outra caixinha.
