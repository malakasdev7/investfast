import test from 'node:test';
import assert from 'node:assert/strict';
import { replay,flow,historical,num } from '../src/lib/calculations/finance';
import { analyzeFinances } from '../src/lib/calculations/analytics';
import { evaluatePurchase } from '../src/lib/calculations/can-i-buy';
import {
  calculateCompoundInterest,
  calculateFinancialGoal,
  calculateFinancialIndependence,
  calculateRealReturn,
  calculateFixedIncomeAndComparator,
  calculatePortfolioRebalance,
  calculateDebtPayoff,
  calculateStocksFiisSnowball,
  calculateCryptoScenarios,
} from '../src/lib/calculations/calculators';
import { entitySchema } from '../src/lib/validations/entities';
import { csvCell } from '../src/lib/csv';
import type { Row,Snapshot } from '../src/lib/domain';

const op=(sequence:number,type:string,quantity:string,total:string,extra:Partial<Row>={}):Row=>({id:String(sequence),user_id:'u',created_at:'2026-01-01',asset_id:'a',portfolio_id:'p',operation_date:'2026-01-01',operation_sequence:String(sequence),type,quantity,total_amount:total,...extra});

test('same-day order is deterministic; selling and transferring preserve cost',()=>{
  const data=[op(1,'buy','10','102'),op(2,'buy','10','200'),op(3,'sell','5','124'),op(4,'dividend','15','15'),op(5,'split','2','0'),op(6,'reverse_split','2','0'),op(7,'bonus','5','0'),op(8,'transfer','10','0',{destination_portfolio_id:'p2'})];
  const result=replay(data.toReversed(),'2026-01-31');
  assert.equal(result.find(p=>p.portfolioId==='p')?.quantity.toFixed(),'10');
  assert.equal(result.reduce((s,p)=>s.plus(p.cost),num(0)).toFixed(),'226.5');
  assert.equal(result.reduce((s,p)=>s.plus(p.realized),num(0)).toFixed(),'48.5');
  assert.equal(result[0].income.toFixed(),'15');
});

test('fractional decimal cost is preserved and overselling is rejected',()=>{
  const p=replay([op(1,'buy','0.1','0.01'),op(2,'buy','0.2','0.02')],'2026-01-31')[0];
  assert.equal(p.quantity.toFixed(),'0.3');assert.equal(p.cost.toFixed(),'0.03');
  assert.throws(()=>replay([op(1,'buy','1','10'),op(2,'sell','2','20')],'2026-01-31'));
});

test('cash flow excludes transfers, card payments and pending transactions',()=>{
  const row=(id:string,type:string,amount:string,status='paid'):Row=>({id,user_id:'u',created_at:'2026-01-01',transaction_date:'2026-01-15',type,amount,status});
  const data:Snapshot={transactions:[row('1','income','100'),row('2','expense','20'),row('3','transfer','80'),row('4','card_payment','80'),row('5','expense','80','pending')]};
  const result=flow(data,'2026-01-01','2026-01-31');assert.equal(result.income.toFixed(),'100');assert.equal(result.expense.toFixed(),'20');assert.equal(result.balance.toFixed(),'80');
});

test('custom period chart does not include earlier expenses in the same month',()=>{
  const data:Snapshot={transactions:[{id:'1',user_id:'u',created_at:'2026-01-01',transaction_date:'2026-01-02',type:'expense',amount:'50',status:'paid'},{id:'2',user_id:'u',created_at:'2026-01-01',transaction_date:'2026-01-20',type:'expense',amount:'10',status:'paid'}]};
  assert.equal(historical(data,'2026-01-15','2026-01-31')[0].expense,10);
});

test('invalid decimal inputs return validation errors without throwing',()=>{
  const schema=entitySchema('investment_transactions');
  const values={asset_id:'10000000-0000-4000-8000-000000000001',portfolio_id:'10000000-0000-4000-8000-000000000002',destination_portfolio_id:null,account_id:null,type:'sell',quantity:'abc',unit_price:'2',fees:'0',operation_date:'2026-01-01',notes:null};
  assert.doesNotThrow(()=>schema.safeParse(values));assert.equal(schema.safeParse(values).success,false);
});

test('CSV escapes quotes and formula injection',()=>{
  assert.equal(csvCell('=HYPERLINK("url")'),'"\'=HYPERLINK(""url"")"');
  assert.equal(csvCell('normal;value'),'"normal;value"');
});

test('daily usage workflow: salary, expenses, credit card payment, stock & FII operations, dividends, and emergency goal',()=>{
  const txSchema=entitySchema('transactions');
  const opSchema=entitySchema('investment_transactions');
  const budgetSchema=entitySchema('budgets');
  const goalSchema=entitySchema('goals');

  const accChecking='10000000-0000-4000-8000-000000000010';
  const accCredit='10000000-0000-4000-8000-000000000011';
  const catSalary='10000000-0000-4000-8000-000000000020';
  const catFood='10000000-0000-4000-8000-000000000021';
  const assetPetr='10000000-0000-4000-8000-000000000030';
  const portfolioMain='10000000-0000-4000-8000-000000000040';

  assert.equal(txSchema.safeParse({
    description:'Salário Mensal',
    amount:'8500.00',
    type:'income',
    account_id:accChecking,
    destination_account_id:null,
    category_id:catSalary,
    transaction_date:'2026-01-05',
    status:'paid',
    notes:null,
  }).success,true);

  assert.equal(txSchema.safeParse({
    description:'Pagamento fatura Nubank',
    amount:'1250.50',
    type:'card_payment',
    account_id:accChecking,
    destination_account_id:accCredit,
    category_id:null,
    transaction_date:'2026-01-10',
    status:'paid',
    notes:null,
  }).success,true);

  assert.equal(budgetSchema.safeParse({
    category_id:catFood,
    month:'2026-01-01',
    amount:'1500',
  }).success,true);

  assert.equal(goalSchema.safeParse({
    name:'Reserva de Emergência',
    description:'6 meses de custo fixo',
    target_amount:'30000',
    deadline:'2026-12-31',
    type:'emergency',
    color:'#10b981',
    status:'active',
  }).success,true);

  assert.equal(opSchema.safeParse({
    asset_id:assetPetr,
    portfolio_id:portfolioMain,
    destination_portfolio_id:null,
    account_id:accChecking,
    type:'buy',
    quantity:'100',
    unit_price:'36.50',
    fees:'4.90',
    operation_date:'2026-01-12',
    notes:'Primeiro aporte mensal',
  }).success,true);
});

test('investment calculators compute compound interest, goals, FI, real return, fixed income, rebalance, debts, FIIs and crypto',()=>{
  const ci=calculateCompoundInterest({
    initialAmount:10000,
    monthlyContribution:1000,
    annualRatePct:12,
    annualInflationPct:4.5,
    months:24,
  });
  assert.equal(ci.totalInvested,34000);
  assert.equal(ci.finalTotal>34000,true);
  assert.equal(ci.realFinalTotal<ci.finalTotal,true);

  const goal=calculateFinancialGoal({
    targetAmount:50000,
    currentAmount:10000,
    annualRatePct:10,
    months:24,
  });
  assert.equal(goal.requiredMonthlyContribution>0,true);

  const fi=calculateFinancialIndependence({
    desiredMonthlyIncome:5000,
    currentPatrimony:50000,
    monthlyContribution:2000,
    annualNominalReturnPct:11,
    annualInflationPct:4.5,
    safeWithdrawalRateAnnualPct:4,
  });
  assert.equal(fi.requiredPatrimony,1500000);
  assert.equal(fi.monthsToIndependence>0,true);

  const rr=calculateRealReturn({
    nominalAnnualPct:12,
    inflationAnnualPct:4.5,
    taxRatePct:15,
    amount:10000,
    years:5,
  });
  assert.equal(rr.realAnnualPct>0,true);
  assert.equal(rr.realPurchasingPower>10000,true);

  const comp=calculateFixedIncomeAndComparator({
    amount:10000,
    monthlyContribution:500,
    months:24,
    cdiAnnualPct:11.25,
    ipcaAnnualPct:4.5,
    cdbPctOfCdi:110,
    lciLcaPctOfCdi:95,
    tesouroIpcaSpreadPct:6.5,
  });
  assert.equal(comp.irRatePct,17.5);
  assert.equal(comp.options.length,7);

  const reb=calculatePortfolioRebalance({
    slices:[
      {name:'Renda Fixa',currentValue:6000,targetPct:50},
      {name:'FIIs',currentValue:4000,targetPct:50},
    ],
    newContribution:2000,
  });
  assert.equal(reb.items.find(i=>i.name==='FIIs')?.suggestedFromContribution,2000);

  const debt=calculateDebtPayoff({
    principal:20000,
    monthlyRatePct:1.5,
    months:24,
    extraMonthlyPayment:500,
  });
  assert.equal(debt.monthsSaved>0,true);
  assert.equal(debt.interestSavedWithExtra>0,true);

  const fii=calculateStocksFiisSnowball({
    sharePrice:10,
    monthlyDividendPerShare:0.1,
    initialShares:100,
    monthlyNewShares:10,
    annualPriceAppreciationPct:4,
    months:24,
    reinvestDividends:true,
  });
  assert.equal(fii.magicNumberShares,100);
  assert.equal(fii.finalShares>340,true);

  const crypto=calculateCryptoScenarios({
    currentPriceBrl:400000,
    initialInvestmentBrl:1000,
    monthlyDcaBrl:200,
    months:12,
    bearChangePct:-30,
    baseChangePct:40,
    bullChangePct:120,
    totalPortfolioBrl:50000,
  });
  assert.equal(crypto.totalInvested,3400);
  assert.equal(crypto.scenarios.length,3);
});

test('analyzeFinances and evaluatePurchase ("Posso comprar?") return accurate diagnostics and verdicts',()=>{
  const snapshot:Snapshot={
    accounts:[
      {id:'a1',user_id:'u',created_at:'2026-01-01',name:'Conta Corrente',type:'checking',initial_balance:'25000',current_balance:'25000',status:'active'},
    ],
    transactions:[
      {id:'t1',user_id:'u',created_at:'2026-01-05',description:'Salário',type:'income',amount:'10000',status:'paid',transaction_date:'2026-11-05',account_id:'a1'},
      {id:'t2',user_id:'u',created_at:'2026-01-10',description:'Custo de vida',type:'expense',amount:'3000',status:'paid',transaction_date:'2026-11-10',account_id:'a1'},
    ],
    goals:[
      {id:'g1',user_id:'u',created_at:'2026-01-01',name:'Reserva',type:'emergency',target_amount:'18000',accumulated_amount:'20000',deadline:'2027-12-31',status:'active'},
    ],
    assets:[
      {id:'as1',user_id:'u',created_at:'2026-01-01',ticker:'TESOURO',name:'Tesouro Selic',asset_class:'treasury',current_price:'100',price_updated_at:'2026-11-01',status:'active'},
    ],
    holdings:[
      {id:'h1',user_id:'u',created_at:'2026-01-01',asset_id:'as1',portfolio_id:'p1',quantity:'200',cost:'19000',income:'0',realized_profit:'0'},
    ],
  };

  const report=analyzeFinances(snapshot,'2026-11-01','2026-11-30');
  assert.equal(report.summary.wealth,45000);
  assert.equal(report.emergency.status,'adequada');

  const okEval=evaluatePurchase(snapshot,{
    ticker:'HGLG11',
    name:'Pátria Log',
    assetClass:'fii',
    amount:1500,
    horizon:'long',
    riskProfile:'moderate',
  });
  assert.equal(okEval.verdict,'Pode considerar');

  const blockedEval=evaluatePurchase(snapshot,{
    ticker:'BTC',
    name:'Bitcoin',
    assetClass:'crypto',
    amount:50000,
    horizon:'short',
    riskProfile:'conservative',
  });
  assert.equal(blockedEval.verdict,'Não recomendado agora');

  const missingEval=evaluatePurchase({},{
    ticker:'PETR4',
    name:'Petrobras',
    assetClass:'stock',
    amount:1000,
    horizon:'medium',
    riskProfile:'moderate',
  });
  assert.equal(missingEval.verdict,'Preciso de mais informações');
});
