import Decimal from 'decimal.js';
import { FinancialDecimal as D } from './decimal';
import { type Row,type Snapshot,text,today,labels } from '@/lib/domain';
import { differenceInCalendarMonths,parseISO,subMonths,format,endOfMonth } from 'date-fns';
export const num=(v:unknown)=>new D(typeof v==='string'||typeof v==='number'?v:0);
export const sum=(rows:Row[],field:string)=>rows.reduce((total,row)=>total.plus(num(row[field])),new D(0));
export type Position={assetId:string;portfolioId:string;quantity:Decimal;cost:Decimal;realized:Decimal;income:Decimal;first:string};
export function replay(operations:Row[],until=today()){
  const positions=new Map<string,Position>();
  const get=(assetId:string,portfolioId:string)=>{
    const key=`${assetId}:${portfolioId}`;
    if(!positions.has(key))positions.set(key,{assetId,portfolioId,quantity:new D(0),cost:new D(0),realized:new D(0),income:new D(0),first:''});
    return positions.get(key)!;
  };
  for(const op of [...operations].filter(o=>text(o.operation_date)<=until).sort((a,b)=>text(a.operation_date).localeCompare(text(b.operation_date))||num(a.operation_sequence).cmp(num(b.operation_sequence)))){
    const p=get(text(op.asset_id),text(op.portfolio_id)),q=num(op.quantity),total=num(op.total_amount);
    if(['buy','deposit'].includes(text(op.type))){p.quantity=p.quantity.plus(q);p.cost=p.cost.plus(total);p.first||=text(op.operation_date);}
    else if(['sell','withdraw','transfer'].includes(text(op.type))){
      if(q.gt(p.quantity))throw new Error('Histórico inconsistente: venda/transferência supera a posição.');
      const basis=q.eq(p.quantity)?p.cost:p.cost.mul(q).div(p.quantity);
      p.quantity=p.quantity.minus(q);p.cost=p.cost.minus(basis);
      if(op.type==='transfer'){const destination=get(text(op.asset_id),text(op.destination_portfolio_id));destination.quantity=destination.quantity.plus(q);destination.cost=destination.cost.plus(basis);destination.first=destination.first&&destination.first<p.first?destination.first:p.first;}
      else p.realized=p.realized.plus(total).minus(basis);
    }else if(['dividend','jcp','interest'].includes(text(op.type)))p.income=p.income.plus(total);
    else if(op.type==='bonus'){p.quantity=p.quantity.plus(q);p.first||=text(op.operation_date);}
    else if(op.type==='split')p.quantity=p.quantity.mul(q);
    else if(op.type==='reverse_split')p.quantity=p.quantity.div(q).toDecimalPlaces(8);
  }
  return [...positions.values()];
}
export function positions(data:Snapshot){
  return (data.holdings??[]).map(h=>{
    const asset=(data.assets??[]).find(a=>a.id===h.asset_id);
    const value=num(h.quantity).mul(num(asset?.current_price)),cost=num(h.cost),profit=value.minus(cost);
    const rate=cost.gt(0)?profit.div(cost).mul(100):new D(0);
    return {row:h,asset,value,cost,profit,rate,income:num(h.income),realized:num(h.realized_profit)};
  });
}
export function overview(data:Snapshot){
  const p=positions(data),cash=sum(data.accounts??[],'current_balance'),value=p.reduce((s,h)=>s.plus(h.value),new D(0)),cost=p.reduce((s,h)=>s.plus(h.cost),new D(0));
  const realized=p.reduce((s,h)=>s.plus(h.realized),new D(0)),income=p.reduce((s,h)=>s.plus(h.income),new D(0));
  return {cash,value,cost,wealth:cash.plus(value),unrealized:value.minus(cost),realized,income,result:value.minus(cost).plus(realized).plus(income),rate:cost.gt(0)?value.minus(cost).div(cost).mul(100):new D(0)};
}
export function flow(data:Snapshot,start:string,end:string){
  const rows=(data.transactions??[]).filter(t=>t.status==='paid'&&text(t.transaction_date)>=start&&text(t.transaction_date)<=end);
  const income=sum(rows.filter(t=>t.type==='income'),'amount'),expense=sum(rows.filter(t=>t.type==='expense'),'amount');
  return {rows,income,expense,balance:income.minus(expense)};
}
export function budgetUsage(data:Snapshot,month=today().slice(0,7)){
  return (data.budgets??[]).filter(b=>text(b.month).startsWith(month)).map(b=>{
    const spent=sum((data.transactions??[]).filter(t=>t.type==='expense'&&t.status==='paid'&&t.category_id===b.category_id&&text(t.transaction_date).startsWith(month)),'amount');
    const limit=num(b.amount);return {row:b,spent,limit,remaining:limit.minus(spent),percent:spent.div(limit).mul(100).toNumber(),name:text(data.categories?.find(c=>c.id===b.category_id)?.name)};
  });
}
export function goalProgress(goal:Row){
  const target=num(goal.target_amount),saved=num(goal.accumulated_amount),remaining=Decimal.max(0,target.minus(saved));
  const months=Math.max(1,differenceInCalendarMonths(parseISO(text(goal.deadline)),parseISO(today()))+1);
  return {target,saved,remaining,percent:saved.div(target).mul(100).toNumber(),monthly:remaining.div(months),overdue:text(goal.deadline)<today()};
}
export function categoriesSpending(data:Snapshot,start:string,end:string){
  const f=flow(data,start,end);
  const result=new Map<string,Decimal>();
  f.rows.filter(t=>t.type==='expense').forEach(t=>{const key=text(t.category_id);result.set(key,(result.get(key)??new D(0)).plus(num(t.amount)));});
  return [...result].map(([id,value])=>({name:text(data.categories?.find(c=>c.id===id)?.name)||'Sem categoria',value:value.toNumber(),amount:value.toFixed(),color:text(data.categories?.find(c=>c.id===id)?.color)||'#94a3b8'})).sort((a,b)=>b.value-a.value);
}
export function allocation(data:Snapshot){
  const result=new Map<string,Decimal>();positions(data).forEach(p=>{const key=text(p.asset?.asset_class);result.set(key,(result.get(key)??new D(0)).plus(p.value));});
  return [...result].filter(([,v])=>v.gt(0)).map(([key,v],i)=>({name:labels[key]||key,value:v.toNumber(),color:['#7056ed','#28b6a0','#f5b64a','#62a2f5','#ed7ba8','#8893ad'][i%6]}));
}
export function historical(data:Snapshot,start:string,end:string){
  const dates:string[]=[];let cursor=parseISO(start);const finish=parseISO(end);let count=0;
  while(cursor<=finish&&count++<120){const last=format(endOfMonth(cursor),'yyyy-MM-dd');dates.push(last>end?end:last);cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);}
  return dates.map(date=>{
    let cash=(data.accounts??[]).filter(a=>text(a.created_at).slice(0,10)<=date).reduce((s,a)=>s.plus(num(a.initial_balance)),new D(0));
    (data.transactions??[]).filter(t=>t.status==='paid'&&text(t.transaction_date)<=date).forEach(t=>{if(t.type==='income')cash=cash.plus(num(t.amount));if(t.type==='expense')cash=cash.minus(num(t.amount));});
    (data.investment_transactions??[]).filter(o=>o.account_id&&text(o.operation_date)<=date).forEach(o=>{if(['buy','deposit'].includes(text(o.type)))cash=cash.minus(num(o.total_amount));if(['sell','withdraw','dividend','jcp','interest'].includes(text(o.type)))cash=cash.plus(num(o.total_amount));});
    const ps=replay(data.investment_transactions??[],date);let estimated=false;
    const portfolios:Record<string,number>={};
    const investments=ps.reduce((s,p)=>{const price=(data.asset_prices??[]).filter(r=>r.asset_id===p.assetId&&text(r.price_date)<=date).sort((a,b)=>text(b.price_date).localeCompare(text(a.price_date)))[0];if(!price&&p.quantity.gt(0))estimated=true;const value=price?p.quantity.mul(num(price.price)):p.cost;portfolios[p.portfolioId]=(portfolios[p.portfolioId]??0)+value.toNumber();return s.plus(value);},new D(0));
    const monthStart=date.slice(0,7)+'-01';
    const f=flow(data,monthStart<start?start:monthStart,date);
    return {date,label:date.slice(5,7)+'/'+date.slice(2,4),wealth:cash.plus(investments).toNumber(),investments:investments.toNumber(),income:f.income.toNumber(),expense:f.expense.toNumber(),estimated,...portfolios};
  });
}
export function insights(data:Snapshot,start:string,end:string){
  const current=flow(data,start,end),previousStart=format(subMonths(parseISO(start),1),'yyyy-MM-dd'),previousEnd=format(subMonths(parseISO(end),1),'yyyy-MM-dd'),previous=flow(data,previousStart,previousEnd),total=overview(data);
  const alerts:{title:string;description:string;severity:'info'|'warning'|'danger'}[]=[];
  budgetUsage(data,end.slice(0,7)).filter(b=>b.percent>=80).forEach(b=>alerts.push({title:`${b.name}: ${Math.round(b.percent)}% do orçamento`,description:b.percent>=100?'O limite foi ultrapassado. Revise os próximos gastos desta categoria.':'Você já utilizou pelo menos 80% do limite mensal.',severity:b.percent>=100?'danger':'warning'}));
  if(previous.expense.gt(0)){const change=current.expense.minus(previous.expense).div(previous.expense).mul(100);alerts.push({title:`Despesas ${change.gte(0)?'subiram':'caíram'} ${change.abs().toFixed(1)}%`,description:'Comparação com o mesmo intervalo deslocado um mês para trás. Transferências e faturas não entram como despesas.',severity:change.gt(0)?'warning':'info'});}
  const byAsset=new Map<string,Decimal>();positions(data).forEach(p=>byAsset.set(text(p.asset?.ticker),(byAsset.get(text(p.asset?.ticker))??new D(0)).plus(p.value)));
  if(total.value.gt(0))for(const [ticker,value]of byAsset){const share=value.div(total.value).mul(100);if(share.gt(20))alerts.push({title:`Concentração em ${ticker}`,description:`Este ativo representa ${share.toFixed(1)}% dos investimentos (limite de alerta: 20%). Avalie sua exposição ao risco.`,severity:'warning'});}
  allocation(data).forEach(c=>{if(total.value.gt(0)&&num(c.value).div(total.value).gt(.6))alerts.push({title:`Maior exposição: ${c.name}`,description:'Mais de 60% do valor está nesta classe. Considere avaliar outras classes de acordo com seus objetivos e tolerância a risco.',severity:'warning'});});
  const historyStart=format(subMonths(parseISO(end),3),'yyyy-MM-dd');const expenseAverage=flow(data,historyStart,end).expense.div(3),reserve=sum((data.goals??[]).filter(g=>g.type==='emergency'&&g.status!=='cancelled'),'accumulated_amount');
  if(expenseAverage.gt(0)&&reserve.lt(expenseAverage.mul(6)))alerts.push({title:'Sua reserva merece atenção',description:`A meta de reserva está abaixo de seis meses da média de despesas registradas nos últimos três meses. Referência educativa; ajuste à estabilidade da sua renda.`,severity:'warning'});
  if((data.assets??[]).some(a=>!a.price_updated_at))alerts.push({title:'Ativos sem cotação',description:'Atualize os preços para que o patrimônio investido reflita a posição atual. Ativos sem preço aparecem com valor zero.',severity:'warning'});
  return alerts;
}
