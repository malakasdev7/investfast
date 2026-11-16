alter table public.assets add column cdi_account_id uuid;
alter table public.assets add constraint assets_cdi_account_fk foreign key(user_id,cdi_account_id) references public.accounts(user_id,id);
create index assets_cdi_account_idx on public.assets(cdi_account_id);
grant insert(cdi_account_id),update(cdi_account_id) on public.assets to authenticated;
alter table public.asset_prices add column price_source text not null default 'manual' check(price_source in ('manual','cdi_estimate'));
create table public.cdi_daily_rates (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 rate_date date not null, daily_percent numeric(18,10) not null check(daily_percent>=0 and daily_percent<10),
 created_at timestamptz not null default now(), primary key(user_id,rate_date)
);
alter table public.cdi_daily_rates enable row level security;
create policy own_cdi_rates on public.cdi_daily_rates for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
revoke all on public.cdi_daily_rates from anon,authenticated;
grant select,insert,update,delete on public.cdi_daily_rates to authenticated;
drop function public.manage_cdi(text,uuid,text,text,numeric,uuid,numeric,date);
create function public.manage_cdi(p_action text,p_asset uuid default null,p_name text default null,p_institution text default null,p_percent numeric default null,p_portfolio uuid default null,p_amount numeric default null,p_date date default current_date,p_account uuid default null,p_fees numeric default 0) returns uuid
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); a public.assets%rowtype; q numeric; price numeric; result uuid; last_date date; cash public.accounts%rowtype;
begin
 if uid is null then raise exception 'Entre novamente para continuar.'; end if;
 if p_amount is null or p_amount<=0 or p_amount>999999999999 or p_amount<>round(p_amount,2) then raise exception 'Informe um valor positivo com até duas casas decimais.'; end if;
 if p_date is null or p_date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Data inválida ou futura.'; end if;
 if p_fees is null or p_fees<0 or p_fees<>round(p_fees,2) or (p_action<>'withdraw' and p_fees<>0) or p_fees>=p_amount then raise exception 'Confira os impostos e taxas do resgate.'; end if;
 if p_account is not null and p_action<>'balance' then
   select * into cash from public.accounts where id=p_account and user_id=uid and status='active' and type<>'credit' and currency='BRL' for update;
   if not found then raise exception 'Selecione uma conta ativa em reais, que não seja cartão de crédito.'; end if;
   if p_action in ('create','deposit') and cash.current_balance<p_amount then raise exception 'Saldo insuficiente na conta de origem.'; end if;
 end if;
 if p_action='create' then
   if nullif(trim(p_name),'') is null or length(p_name)>200 or nullif(trim(p_institution),'') is null or length(p_institution)>200 or p_percent is null or p_percent<=0 or p_percent>1000 then raise exception 'Confira nome, instituição e percentual do CDI.'; end if;
   insert into public.assets(ticker,name,asset_class,institution,cdi_percent,cdi_account_id,status) values('CDI-'||substr(gen_random_uuid()::text,1,8),trim(p_name),'cdi',trim(p_institution),p_percent,p_account,'active') returning * into a;
   insert into public.asset_prices(asset_id,price,price_date) values(a.id,1,p_date);
   insert into public.investment_transactions(asset_id,portfolio_id,account_id,type,quantity,unit_price,fees,operation_date,notes) values(a.id,p_portfolio,p_account,'deposit',p_amount,1,0,p_date,'Aplicação inicial CDI. Conta vinculada quando selecionada.');
   return a.id;
 end if;
 select * into a from public.assets where id=p_asset and user_id=uid and asset_class='cdi' for update;
 if not found then raise exception 'Aplicação CDI não encontrada.'; end if;
 select greatest((select max(operation_date) from public.investment_transactions where asset_id=a.id and user_id=uid),(select max(price_date) from public.asset_prices where asset_id=a.id and user_id=uid)) into last_date;
 if p_date<last_date then raise exception 'Use uma data igual ou posterior à última movimentação ou atualização de saldo.'; end if;
 if p_action='balance' then
   select sum(quantity) into q from public.holdings where asset_id=a.id and user_id=uid;
   if q is null or q<=0 then raise exception 'Registre um aporte antes de atualizar o saldo.'; end if;
   price:=round(p_amount/q,8);
   if price<=0 then raise exception 'Saldo muito pequeno para esta aplicação.'; end if;
   insert into public.asset_prices(asset_id,price,price_date) values(a.id,price,p_date) on conflict(user_id,asset_id,price_date) do update set price=excluded.price,price_source='manual';
   return a.id;
 elsif p_action in ('deposit','withdraw') then
   if a.status<>'active' then raise exception 'Reative a aplicação antes de movimentar.'; end if;
   price:=a.current_price;
   if price<=0 then raise exception 'Atualize o saldo ou o preço antes de movimentar.'; end if;
   q:=round(p_amount/price,8);
   if p_action='withdraw' then
     select quantity into q from public.holdings where asset_id=a.id and portfolio_id=p_portfolio and user_id=uid;
     if q is null or p_amount>round(q*price,2) then raise exception 'Resgate maior que o saldo desta carteira.'; end if;
     if p_amount<>round(q*price,2) then q:=round(p_amount/price,8); end if;
   end if;
   if q<=0 then raise exception 'Valor muito pequeno para esta aplicação.'; end if;
   insert into public.investment_transactions(asset_id,portfolio_id,account_id,type,quantity,unit_price,fees,operation_date,notes) values(a.id,p_portfolio,p_account,p_action,q,price,p_fees,p_date,'Movimentação CDI em reais. Conta vinculada quando selecionada.') returning id into result;
   return result;
 end if;
 raise exception 'Ação CDI inválida.';
end $$;
revoke all on function public.manage_cdi(text,uuid,text,text,numeric,uuid,numeric,date,uuid,numeric) from public,anon;
grant execute on function public.manage_cdi(text,uuid,text,text,numeric,uuid,numeric,date,uuid,numeric) to authenticated;

create function public.accrue_cdi(p_asset uuid,p_until date) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare a public.assets%rowtype; base public.asset_prices%rowtype; r record; factor numeric:=1; final_price numeric; last_rate date; valued date;
begin
 if auth.uid() is null or p_until>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Data ou usuário inválido.'; end if;
 select * into a from public.assets where id=p_asset and user_id=auth.uid() and asset_class='cdi' for update;
 if not found then raise exception 'Aplicação não encontrada.'; end if;
 select * into base from public.asset_prices where asset_id=a.id and user_id=auth.uid() order by price_date desc limit 1;
 if base.id is null or a.cdi_percent is null then return jsonb_build_object('source','manual'); end if;
 for r in select rate_date,daily_percent from public.cdi_daily_rates where user_id=auth.uid() and rate_date>=base.price_date and rate_date<p_until order by rate_date loop
  factor:=trunc(factor*(1+r.daily_percent*a.cdi_percent/10000),16); last_rate:=r.rate_date;
 end loop;
 if last_rate is not null then
   final_price:=round(base.price*factor,8);valued:=last_rate+1;
   insert into public.asset_prices(asset_id,price,price_date,price_source) values(a.id,final_price,valued,'cdi_estimate') on conflict(user_id,asset_id,price_date) do nothing;
   return jsonb_build_object('source','cdi_estimate','rate_date',last_rate,'price_date',valued,'price',final_price::text);
 end if;
 return jsonb_build_object('source',base.price_source,'rate_date',case when base.price_source='cdi_estimate' then base.price_date-1 else null end,'price_date',base.price_date,'price',base.price::text);
end $$;
revoke all on function public.accrue_cdi(uuid,date) from public,anon;
grant execute on function public.accrue_cdi(uuid,date) to authenticated;
