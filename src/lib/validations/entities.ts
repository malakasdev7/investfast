import { z } from 'zod';
import { entities, today } from '@/lib/domain';
import Decimal from 'decimal.js';

const decimal = z.string().regex(/^-?\d{1,12}(\.\d{1,8})?$/, 'Use até 12 dígitos inteiros e 8 decimais, separados por ponto.');
const positive = decimal.refine(v=>decimal.safeParse(v).success&&new Decimal(v).gt(0),'Informe um valor maior que zero.');
const nonnegative = decimal.refine(v=>decimal.safeParse(v).success&&new Decimal(v).gte(0),'O valor não pode ser negativo.');
const date = z.iso.date('Informe uma data válida.');
export function entitySchema(entity:string) {
  const config=entities[entity];
  if(!config) throw new Error('Módulo inválido.');
  const shape:Record<string,z.ZodType>={};
  for(const f of config.fields){
    let s:z.ZodType=z.string().trim().max(f.kind==='textarea'?2000:200);
    if(f.required) s=z.string().trim().min(1,'Campo obrigatório.').max(f.kind==='textarea'?2000:200);
    if(f.kind==='decimal') s=f.key==='initial_balance'?decimal:['amount','target_amount'].includes(f.key)?positive:nonnegative;
    if(f.kind==='date') s=date;
    if(f.kind==='lookup') s=z.uuid('Selecione um registro.');
    if(f.kind==='select') s=z.enum(Object.keys(f.options??{}) as [string,...string[]]);
    if(f.kind==='color') s=z.string().regex(/^#[0-9a-f]{6}$/i,'Cor inválida.');
    if(f.kind==='checkbox') s=z.union([z.boolean(),z.enum(['true','false'])]).transform(v=>v===true||v==='true');
    if(f.key==='avatar_url') s=z.url().refine(v=>v.startsWith('https://'),'Use uma URL HTTPS.');
    if(!f.required && f.kind!=='checkbox') s=z.preprocess(v=>v===''||v===undefined?null:v,s.nullable());
    shape[f.key]=s;
  }
  return z.object(shape).strict().superRefine((v,ctx)=>{
    if(config.fields.some(f=>f.kind==='decimal'&&v[f.key]!=null&&!decimal.safeParse(v[f.key]).success)) return;
    const issue=(key:string,message:string)=>ctx.addIssue({code:'custom',path:[key],message});
    if(entity==='assets'&&v.asset_class==='cdi'&&(!v.cdi_percent||Number(v.cdi_percent)<=0||Number(v.cdi_percent)>1000)) issue('cdi_percent','Informe um percentual do CDI maior que zero e até 1000.');
    if(entity==='transactions'||entity==='recurring_transactions'){
      const transfer=['transfer','card_payment'].includes(String(v.type));
      if(transfer && (!v.destination_account_id||v.destination_account_id===v.account_id)) issue('destination_account_id','Selecione outra conta de destino.');
      if(!transfer && v.destination_account_id) issue('destination_account_id','Somente transferências e faturas usam conta de destino.');
      if(transfer && v.category_id) issue('category_id','Transferências não têm categoria.');
    }
    if(entity==='investment_transactions'){
      if(v.operation_date && String(v.operation_date)>today()) issue('operation_date','Não registre operações futuras.');
      if(!new Decimal(String(v.quantity)).gt(0)) issue('quantity','Quantidade deve ser maior que zero.');
      if(['split','reverse_split'].includes(String(v.type)) && !new Decimal(String(v.quantity)).gt(1)) issue('quantity','O fator deve ser maior que 1.');
      if(['split','reverse_split','bonus','transfer'].includes(String(v.type)) && (!new Decimal(String(v.unit_price)).isZero()||!new Decimal(String(v.fees)).isZero())) issue('unit_price','Este evento não tem preço nem taxas.');
      if(v.type==='transfer' && (!v.destination_portfolio_id||v.destination_portfolio_id===v.portfolio_id)) issue('destination_portfolio_id','Selecione outra carteira.');
      if(v.type!=='transfer' && v.destination_portfolio_id) issue('destination_portfolio_id','Destino é exclusivo de transferência.');
      if(['sell','withdraw','dividend','jcp','interest'].includes(String(v.type)) && new Decimal(String(v.quantity)).mul(String(v.unit_price)).lt(String(v.fees))) issue('fees','Taxas maiores que o valor bruto.');
    }
    if(entity==='asset_prices' && String(v.price_date)>today()) issue('price_date','Não informe uma cotação futura.');
    if(entity==='budgets' && !String(v.month).endsWith('-01')) issue('month','Selecione o primeiro dia do mês.');
    if(entity==='goal_contributions'&&v.transaction_id&&v.investment_transaction_id) issue('transaction_id','Vincule apenas uma origem.');
    if(entity==='recurring_transactions'&&v.end_date&&String(v.end_date)<String(v.start_date)) issue('end_date','A data final deve ser posterior à inicial.');
  });
}
export const authSchema=z.object({email:z.email('E-mail inválido.'),password:z.string().min(8,'Use pelo menos 8 caracteres.').max(128),name:z.string().trim().min(2,'Informe seu nome.').max(100).optional()});
export const loginSchema=authSchema.omit({name:true}).extend({
  email:z.string().trim().min(3,'Informe seu e-mail ou usuário.').max(254).refine(value=>z.email().safeParse(value).success||/^[a-zA-Z0-9._-]{3,64}$/.test(value),'Informe um e-mail ou usuário válido.'),
});
