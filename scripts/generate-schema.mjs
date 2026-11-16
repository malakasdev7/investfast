import { writeFileSync } from 'node:fs';

const definitions = {
  profiles: `name text not null default '', email text not null default '', avatar_url text, currency text not null default 'BRL' check(currency='BRL'), theme text not null default 'system' check(theme in ('system','light','dark')), unique(user_id)`,
  accounts: `name text not null, type text not null check(type in ('checking','savings','wallet','credit','cash','broker','other')), initial_balance numeric(20,8) not null default 0, current_balance numeric(20,8) not null default 0, currency text not null default 'BRL' check(currency='BRL'), color text not null default '#7056ed', icon text not null default 'wallet', notes text, status text not null default 'active' check(status in ('active','archived'))`,
  categories: `name text not null, type text not null check(type in ('income','expense')), color text not null default '#7056ed', icon text not null default 'tag', status text not null default 'active' check(status in ('active','archived')), unique(user_id,name,type)`,
  portfolios: `name text not null, description text, color text not null default '#7056ed', icon text not null default 'briefcase', status text not null default 'active' check(status in ('active','archived'))`,
  assets: `ticker text not null, name text not null, asset_class text not null check(asset_class in ('stock','fii','etf','bdr','treasury','cdb','lci','lca','cri','cra','debenture','fund','crypto','pension','other')), subclass text, institution text, current_price numeric(20,8) not null default 0 check(current_price>=0), price_updated_at timestamptz, notes text, status text not null default 'active' check(status in ('active','closed')), unique(user_id,ticker)`,
  recurring_transactions: `description text not null, amount numeric(20,8) not null check(amount>0), type text not null check(type in ('income','expense','transfer','card_payment')), account_id uuid not null, destination_account_id uuid, category_id uuid, frequency text not null check(frequency in ('weekly','monthly','quarterly','yearly')), start_date date not null, end_date date, next_date date not null, anchor_day integer not null check(anchor_day between 1 and 31), active boolean not null default true, notes text, check(end_date is null or end_date>=start_date), check((type in ('transfer','card_payment') and destination_account_id is not null and destination_account_id<>account_id) or (type in ('income','expense') and destination_account_id is null))`,
  transactions: `description text not null, amount numeric(20,8) not null check(amount>0), type text not null check(type in ('income','expense','transfer','card_payment')), account_id uuid not null, destination_account_id uuid, category_id uuid, transaction_date date not null, status text not null default 'paid' check(status in ('paid','pending')), notes text, recurring_id uuid, unique(user_id,recurring_id,transaction_date), check((type in ('transfer','card_payment') and destination_account_id is not null and destination_account_id<>account_id) or (type in ('income','expense') and destination_account_id is null))`,
  budgets: `category_id uuid not null, month date not null check(extract(day from month)=1), amount numeric(20,8) not null check(amount>0), unique(user_id,category_id,month)`,
  goals: `name text not null, description text, target_amount numeric(20,8) not null check(target_amount>0), accumulated_amount numeric(20,8) not null default 0, deadline date not null, type text not null default 'other' check(type in ('emergency','travel','car','home','retirement','education','other')), color text not null default '#7056ed', status text not null default 'active' check(status in ('active','completed','cancelled'))`,
  investment_transactions: `operation_sequence bigint generated always as identity, asset_id uuid not null, portfolio_id uuid not null, destination_portfolio_id uuid, account_id uuid, type text not null check(type in ('buy','sell','deposit','withdraw','dividend','jcp','interest','bonus','split','reverse_split','transfer')), quantity numeric(20,8) not null default 0 check(quantity>=0), unit_price numeric(20,8) not null default 0 check(unit_price>=0), fees numeric(20,8) not null default 0 check(fees>=0), total_amount numeric(20,8) not null default 0, operation_date date not null, notes text, check((type='transfer' and destination_portfolio_id is not null and destination_portfolio_id<>portfolio_id) or (type<>'transfer' and destination_portfolio_id is null)), check(type in ('dividend','jcp','interest') or quantity>0), check(type not in ('split','reverse_split','bonus','transfer') or (unit_price=0 and fees=0)), check(type not in ('sell','withdraw','dividend','jcp','interest') or quantity*unit_price>=fees)`,
  holdings: `asset_id uuid not null, portfolio_id uuid not null, quantity numeric(20,8) not null default 0 check(quantity>=0), average_price numeric not null default 0, cost numeric not null default 0 check(cost>=0), realized_profit numeric not null default 0, income numeric not null default 0, first_purchase date, unique(user_id,asset_id,portfolio_id)`,
  asset_prices: `asset_id uuid not null, price numeric(20,8) not null check(price>=0), price_date date not null, unique(user_id,asset_id,price_date)`,
  dividends: `asset_id uuid not null, portfolio_id uuid not null, investment_transaction_id uuid not null, amount numeric(20,8) not null check(amount>=0), payment_date date not null, type text not null, unique(user_id,investment_transaction_id)`,
  goal_contributions: `goal_id uuid not null, amount numeric(20,8) not null check(amount>0), contribution_date date not null, transaction_id uuid, investment_transaction_id uuid, notes text, check(transaction_id is null or investment_transaction_id is null)`,
  alerts: `title text not null, description text not null, severity text not null default 'info' check(severity in ('info','warning','danger')), read boolean not null default false`,
  attachments: `transaction_id uuid not null, name text not null, path text not null unique, mime_type text not null, size_bytes bigint not null check(size_bytes>0 and size_bytes<=5242880), check(path like user_id::text || '/%')`,
  audit_logs: `entity text not null, record_id uuid not null, action text not null, old_data jsonb, new_data jsonb`,
};
const relations = {
  recurring_transactions: { account_id:'accounts', destination_account_id:'accounts', category_id:'categories' },
  transactions: { account_id:'accounts', destination_account_id:'accounts', category_id:'categories', recurring_id:'recurring_transactions' },
  budgets: { category_id:'categories' },
  investment_transactions: { asset_id:'assets', portfolio_id:'portfolios', destination_portfolio_id:'portfolios', account_id:'accounts' },
  holdings: { asset_id:'assets', portfolio_id:'portfolios' },
  asset_prices: { asset_id:'assets' },
  dividends: { asset_id:'assets', portfolio_id:'portfolios', investment_transaction_id:'investment_transactions' },
  goal_contributions: { goal_id:'goals', transaction_id:'transactions', investment_transaction_id:'investment_transactions' },
  attachments: { transaction_id:'transactions' },
};
let sql = `-- InvestFast. Gerado por scripts/generate-schema.mjs.\nbegin;\ncreate schema if not exists private;\nrevoke all on schema private from public;\n`;
for (const [name, fields] of Object.entries(definitions)) {
  sql += `create table public.${name} (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, ${fields}, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id));\n`;
  sql += `alter table public.${name} enable row level security;\ncreate index ${name}_user_created_idx on public.${name}(user_id,created_at);\n`;
  for (const action of ['select','insert','update','delete']) {
    sql += `create policy own_${action} on public.${name} for ${action} to authenticated ${action==='insert'?'':`using ((select auth.uid())=user_id)`} ${['insert','update'].includes(action)?'with check ((select auth.uid())=user_id)':''};\n`;
  }
  sql += `revoke all on public.${name} from anon, authenticated;\ngrant select on public.${name} to authenticated;\n`;
  if (!['holdings','dividends','audit_logs','alerts'].includes(name)) sql += `grant insert,update,delete on public.${name} to authenticated;\n`;
}
for (const [table, refs] of Object.entries(relations)) {
  for (const [column, target] of Object.entries(refs)) {
    const cascade = ['holdings','dividends'].includes(table) || (table==='goal_contributions' && column==='goal_id') || table==='attachments' || table==='asset_prices';
    sql += `alter table public.${table} add foreign key(user_id,${column}) references public.${target}(user_id,id) on delete ${cascade?'cascade':'no action deferrable initially deferred'};\ncreate index ${table}_${column}_idx on public.${table}(user_id,${column});\n`;
  }
}
sql += `
create index transactions_date_idx on public.transactions(user_id,transaction_date);
create index investments_date_idx on public.investment_transactions(user_id,operation_date,created_at,id);
create index prices_date_idx on public.asset_prices(user_id,price_date);
create index recurring_next_idx on public.recurring_transactions(next_date) where active;

-- Campos derivados não podem ser fornecidos por clientes, nem diretamente pela API REST.
revoke insert,update on public.accounts,public.assets,public.goals,public.profiles,public.investment_transactions from authenticated;
grant insert(name,type,initial_balance,currency,color,icon,notes,status),update(name,type,initial_balance,currency,color,icon,notes,status) on public.accounts to authenticated;
grant insert(ticker,name,asset_class,subclass,institution,notes,status),update(ticker,name,asset_class,subclass,institution,notes,status) on public.assets to authenticated;
grant insert(name,description,target_amount,deadline,type,color,status),update(name,description,target_amount,deadline,type,color,status) on public.goals to authenticated;
revoke delete on public.profiles from authenticated;
grant update(name,avatar_url,currency,theme) on public.profiles to authenticated;
grant insert(asset_id,portfolio_id,destination_portfolio_id,account_id,type,quantity,unit_price,fees,operation_date,notes),update(asset_id,portfolio_id,destination_portfolio_id,account_id,type,quantity,unit_price,fees,operation_date,notes) on public.investment_transactions to authenticated;
grant update(read) on public.alerts to authenticated;

create function private.touch() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;

create function private.lock_owner() returns trigger language plpgsql security definer set search_path='' as $$
declare uid uuid := coalesce(new.user_id,old.user_id);
begin
 if auth.uid() is not null and auth.uid()<>uid then raise exception 'Acesso negado'; end if;
 perform 1 from public.profiles where user_id=uid for update;
 if tg_op='DELETE' then return old; end if;
 if tg_op='UPDATE' and (new.user_id<>old.user_id or new.id<>old.id) then raise exception 'Proprietário e identificador são imutáveis'; end if;
 return new;
end $$;

create function private.seed_user() returns trigger language plpgsql security definer set search_path='' as $$
declare n text;
begin
 insert into public.profiles(id,user_id,name,email) values(new.id,new.id,coalesce(new.raw_user_meta_data->>'name',''),coalesce(new.email,''));
 foreach n in array array['Salário','Freelance','Dividendos','Juros','Vendas','Outros'] loop
  insert into public.categories(user_id,name,type,color) values(new.id,n,'income','#10b981');
 end loop;
 foreach n in array array['Moradia','Alimentação','Transporte','Saúde','Educação','Lazer','Assinaturas','Compras','Impostos','Investimentos','Outros'] loop
  insert into public.categories(user_id,name,type,color) values(new.id,n,'expense','#f97373');
 end loop;
 insert into public.portfolios(user_id,name,description) values(new.id,'Minha carteira','Carteira inicial');
 return new;
end $$;
create trigger seed_user after insert on auth.users for each row execute function private.seed_user();

create function private.sync_email() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.profiles set email=coalesce(new.email,'') where user_id=new.id; return new; end $$;
create trigger sync_email after update of email on auth.users for each row execute function private.sync_email();

create function private.check_entry() returns trigger language plpgsql set search_path='' as $$
declare ct text;
begin
 if new.category_id is not null then
  select type into ct from public.categories where id=new.category_id and user_id=new.user_id;
  if tg_table_name='budgets' then
   if ct<>'expense' then raise exception 'Orçamento exige categoria de despesa'; end if;
  elsif new.type in ('income','expense') and ct<>new.type then raise exception 'Categoria incompatível com o lançamento';
  elsif new.type in ('transfer','card_payment') then raise exception 'Transferências não têm categoria';
  end if;
 end if;
 if tg_table_name<>'budgets' then
  if new.type='card_payment' and not exists(select 1 from public.accounts where id=new.destination_account_id and user_id=new.user_id and type='credit') then raise exception 'Destino deve ser cartão de crédito'; end if;
 end if;
 return new;
end $$;
create trigger validate_entry before insert or update on public.transactions for each row execute function private.check_entry();
create trigger validate_entry before insert or update on public.recurring_transactions for each row execute function private.check_entry();
create trigger validate_entry before insert or update on public.budgets for each row execute function private.check_entry();

create function private.operation_total() returns trigger language plpgsql set search_path='' as $$
begin
 new.total_amount=case when new.type in ('buy','deposit') then new.quantity*new.unit_price+new.fees when new.type in ('sell','withdraw','dividend','jcp','interest') then new.quantity*new.unit_price-new.fees else 0 end;
 if new.operation_date>current_date then raise exception 'Operações de investimento não podem estar no futuro'; end if;
 return new;
end $$;
create trigger operation_total before insert or update on public.investment_transactions for each row execute function private.operation_total();

create function private.rebuild_investments(uid uuid) returns void language plpgsql security definer set search_path='' as $$
declare op record; pos record; moved numeric;
begin
 if auth.uid() is not null and auth.uid()<>uid then raise exception 'Acesso negado'; end if;
 delete from public.holdings where user_id=uid;
 delete from public.dividends where user_id=uid;
 for op in select * from public.investment_transactions where user_id=uid order by operation_date,operation_sequence loop
  insert into public.holdings(user_id,asset_id,portfolio_id) values(uid,op.asset_id,op.portfolio_id) on conflict(user_id,asset_id,portfolio_id) do nothing;
  select * into pos from public.holdings where user_id=uid and asset_id=op.asset_id and portfolio_id=op.portfolio_id;
  if op.type in ('buy','deposit') then
   update public.holdings set quantity=quantity+op.quantity,cost=cost+op.total_amount,first_purchase=coalesce(first_purchase,op.operation_date) where id=pos.id;
  elsif op.type in ('sell','withdraw','transfer') then
   if op.quantity>pos.quantity then raise exception 'Quantidade insuficiente no ativo/carteira na data da operação'; end if;
   moved=case when op.quantity=pos.quantity then pos.cost else pos.cost*op.quantity/pos.quantity end;
   update public.holdings set quantity=quantity-op.quantity,cost=cost-moved,realized_profit=realized_profit+case when op.type='transfer' then 0 else op.total_amount-moved end where id=pos.id;
   if op.type='transfer' then
    insert into public.holdings(user_id,asset_id,portfolio_id,quantity,cost,first_purchase) values(uid,op.asset_id,op.destination_portfolio_id,op.quantity,moved,pos.first_purchase)
    on conflict(user_id,asset_id,portfolio_id) do update set quantity=public.holdings.quantity+excluded.quantity,cost=public.holdings.cost+excluded.cost,first_purchase=least(public.holdings.first_purchase,excluded.first_purchase);
   end if;
  elsif op.type in ('dividend','jcp','interest') then
   update public.holdings set income=income+op.total_amount where id=pos.id;
   insert into public.dividends(user_id,asset_id,portfolio_id,investment_transaction_id,amount,payment_date,type) values(uid,op.asset_id,op.portfolio_id,op.id,op.total_amount,op.operation_date,op.type);
  elsif op.type='bonus' then
   update public.holdings set quantity=quantity+op.quantity,first_purchase=coalesce(first_purchase,op.operation_date) where id=pos.id;
  elsif op.type='split' then
   if pos.quantity=0 or op.quantity<=1 then raise exception 'Desdobramento exige posição e fator maior que 1'; end if;
   update public.holdings set quantity=quantity*op.quantity where id=pos.id;
  elsif op.type='reverse_split' then
   if pos.quantity=0 or op.quantity<=1 then raise exception 'Agrupamento exige posição e fator maior que 1'; end if;
   if pos.quantity/op.quantity<0.00000001 then raise exception 'Quantidade abaixo da precisão suportada'; end if;
   update public.holdings set quantity=quantity/op.quantity where id=pos.id;
  end if;
 end loop;
 update public.holdings set average_price=case when quantity>0 then cost/quantity else 0 end where user_id=uid;
end $$;

create function private.rebuild_balances(uid uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and auth.uid()<>uid then raise exception 'Acesso negado'; end if;
 update public.accounts a set current_balance=a.initial_balance+
 coalesce((select sum(case when t.type='income' then t.amount else -t.amount end) from public.transactions t where t.user_id=uid and t.account_id=a.id and t.status='paid'),0)+
 coalesce((select sum(t.amount) from public.transactions t where t.user_id=uid and t.destination_account_id=a.id and t.status='paid'),0)+
 coalesce((select sum(case when i.type in ('buy','deposit') then -i.total_amount when i.type in ('sell','withdraw','dividend','jcp','interest') then i.total_amount else 0 end) from public.investment_transactions i where i.user_id=uid and i.account_id=a.id),0)
 where a.user_id=uid;
end $$;

create function private.changed() returns trigger language plpgsql security definer set search_path='' as $$
declare uid uuid := coalesce(new.user_id,old.user_id);
begin
 if not exists(select 1 from public.profiles where user_id=uid) then return null; end if;
 if tg_table_name='investment_transactions' then perform private.rebuild_investments(uid); end if;
 if tg_table_name in ('transactions','investment_transactions','accounts') then perform private.rebuild_balances(uid); end if;
 if tg_table_name='goal_contributions' then
  update public.goals g set accumulated_amount=coalesce((select sum(amount) from public.goal_contributions c where c.user_id=uid and c.goal_id=g.id),0) where g.user_id=uid;
 end if;
 if tg_table_name='asset_prices' then
  update public.assets a set current_price=coalesce((select price from public.asset_prices p where p.user_id=uid and p.asset_id=a.id order by price_date desc limit 1),0),price_updated_at=(select max(price_date)::timestamptz from public.asset_prices p where p.user_id=uid and p.asset_id=a.id) where a.user_id=uid;
 end if;
 return null;
end $$;
create trigger refresh_balance after insert or update of initial_balance on public.accounts for each row execute function private.changed();
create trigger refresh_balance after insert or update or delete on public.transactions for each row execute function private.changed();
create trigger refresh_positions after insert or update or delete on public.investment_transactions for each row execute function private.changed();
create trigger refresh_goal after insert or update or delete on public.goal_contributions for each row execute function private.changed();
create trigger refresh_price after insert or update or delete on public.asset_prices for each row execute function private.changed();

create function private.audit() returns trigger language plpgsql security definer set search_path='' as $$
declare uid uuid := coalesce(new.user_id,old.user_id);
begin
 if exists(select 1 from public.profiles where user_id=uid) then
  insert into public.audit_logs(user_id,entity,record_id,action,old_data,new_data) values(uid,tg_table_name,coalesce(new.id,old.id),tg_op,to_jsonb(old),to_jsonb(new));
 end if; return null;
end $$;
`;
for (const name of Object.keys(definitions)) {
  sql += `create trigger touch before update on public.${name} for each row execute function private.touch();\n`;
  if (!['holdings','dividends','audit_logs','alerts','profiles'].includes(name)) {
    sql += `create trigger a_lock_owner before insert or update or delete on public.${name} for each row execute function private.lock_owner();\n`;
    sql += `create trigger audit after insert or update or delete on public.${name} for each row execute function private.audit();\n`;
  }
}
sql += `
-- Recorrência idempotente, com dia âncora (31/01 -> 28/02 -> 31/03).
create function private.generate_recurring(uid uuid) returns integer language plpgsql security definer set search_path='' as $$
declare r record; d date; base date; horizon date := (current_date+interval '3 months')::date; generated integer:=0; count_insert integer;
begin
 if auth.uid() is not null and auth.uid()<>uid then raise exception 'Acesso negado'; end if;
 perform 1 from public.profiles where user_id=uid for update;
 for r in select * from public.recurring_transactions where user_id=uid and active and next_date<=horizon for update loop
  d=r.next_date;
  while d<=horizon and (r.end_date is null or d<=r.end_date) loop
   insert into public.transactions(user_id,description,amount,type,account_id,destination_account_id,category_id,transaction_date,status,notes,recurring_id)
    values(uid,r.description,r.amount,r.type,r.account_id,r.destination_account_id,r.category_id,d,'pending',r.notes,r.id) on conflict(user_id,recurring_id,transaction_date) do nothing;
   get diagnostics count_insert=row_count; generated=generated+count_insert;
   if r.frequency='weekly' then d=d+7;
   else
    base=(date_trunc('month',d)+case r.frequency when 'monthly' then interval '1 month' when 'quarterly' then interval '3 months' else interval '1 year' end)::date;
    d=base+(least(r.anchor_day,extract(day from base+interval '1 month - 1 day')::integer)-1);
   end if;
  end loop;
  update public.recurring_transactions set next_date=d,active=(r.end_date is null or d<=r.end_date) where id=r.id;
 end loop; return generated;
end $$;
create function public.generate_recurring() returns integer language plpgsql security definer set search_path='' as $$
begin if auth.uid() is null then raise exception 'Autenticação necessária'; end if; return private.generate_recurring(auth.uid()); end $$;
revoke all on function public.generate_recurring() from public,anon;
grant execute on function public.generate_recurring() to authenticated;

create function private.recurring_job() returns void language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin for uid in select distinct user_id from public.recurring_transactions where active loop perform private.generate_recurring(uid); end loop; end $$;

-- Conversão no PostgreSQL, antes de JSON chegar ao JavaScript.
create function public.decimal_json(v jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb; k text; val jsonb;
begin
 if jsonb_typeof(v)='number' then return to_jsonb(v#>>'{}'); end if;
 if jsonb_typeof(v)='object' then result='{}'; for k,val in select * from jsonb_each(v) loop result=result||jsonb_build_object(k,public.decimal_json(val)); end loop; return result; end if;
 if jsonb_typeof(v)='array' then select coalesce(jsonb_agg(public.decimal_json(value)),'[]') into result from jsonb_array_elements(v); return result; end if;
 return v;
end $$;
revoke all on function public.decimal_json(jsonb) from public,anon;
grant execute on function public.decimal_json(jsonb) to authenticated;

create function public.app_snapshot() returns jsonb language plpgsql security invoker set search_path='' as $$
declare t text; rows jsonb; result jsonb:='{}';
begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 foreach t in array array[${Object.keys(definitions).map(x=>`'${x}'`).join(',')}] loop
  execute format('select coalesce(jsonb_agg(public.decimal_json(to_jsonb(r))), ''[]''::jsonb) from (select * from public.%I where user_id=auth.uid() order by created_at desc %s) r',t,case when t='audit_logs' then 'limit 100' else '' end) into rows;
  result=result||jsonb_build_object(t,rows);
 end loop; return result;
end $$;
revoke all on function public.app_snapshot() from public,anon;
grant execute on function public.app_snapshot() to authenticated;

-- A exclusão exige sessão recente e confirmação no app; nenhum segredo administrativo no navegador.
create function public.delete_own_account(confirmation text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or confirmation<>'EXCLUIR MINHA CONTA' then raise exception 'Confirmação inválida'; end if;
 if coalesce((auth.jwt()->>'iat')::bigint,0)<extract(epoch from now()-interval '5 minutes') then raise exception 'Entre novamente para excluir a conta'; end if;
 if exists(select 1 from storage.objects where bucket_id='investfast-private' and owner_id=uid::text) then raise exception 'Remova os anexos antes de excluir a conta'; end if;
 delete from auth.sessions where user_id=uid;
 delete from auth.users where id=uid;
end $$;
revoke all on function public.delete_own_account(text) from public,anon;
grant execute on function public.delete_own_account(text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('investfast-private','investfast-private',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
create policy own_files_select on storage.objects for select to authenticated using(bucket_id='investfast-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy own_files_insert on storage.objects for insert to authenticated with check(bucket_id='investfast-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy own_files_update on storage.objects for update to authenticated using(bucket_id='investfast-private' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='investfast-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy own_files_delete on storage.objects for delete to authenticated using(bucket_id='investfast-private' and (storage.foldername(name))[1]=(select auth.uid())::text);

revoke all on all functions in schema private from public,anon,authenticated;
commit;
`;
writeFileSync('supabase/schema.sql',sql);
console.log('Schema gerado: 17 tabelas com RLS e funções financeiras.');

