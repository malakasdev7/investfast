alter table public.assets drop constraint assets_asset_class_check;
alter table public.assets add constraint assets_asset_class_check check(asset_class in ('stock','fii','etf','bdr','treasury','cdb','lci','lca','cri','cra','debenture','fund','crypto','pension','other','cdi'));
alter table public.assets add column cdi_percent numeric(10,4) check(cdi_percent>0 and cdi_percent<=1000);
grant insert(cdi_percent),update(cdi_percent) on public.assets to authenticated;

-- Atomic creation and cash-based movements; existing financial triggers remain authoritative.
create function public.manage_cdi(p_action text,p_asset uuid default null,p_name text default null,p_institution text default null,p_percent numeric default null,p_portfolio uuid default null,p_amount numeric default null,p_date date default current_date) returns uuid
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); a public.assets%rowtype; q numeric; price numeric; result uuid; last_date date;
begin
 if uid is null then raise exception 'Entre novamente para continuar.'; end if;
 if p_amount is null or p_amount<=0 or p_amount>999999999999 or p_amount<>round(p_amount,2) then raise exception 'Informe um valor positivo com até duas casas decimais.'; end if;
 if p_date is null or p_date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Data inválida ou futura.'; end if;
 if p_action='create' then
   if nullif(trim(p_name),'') is null or length(p_name)>200 or nullif(trim(p_institution),'') is null or length(p_institution)>200 or p_percent is null or p_percent<=0 or p_percent>1000 then raise exception 'Confira nome, instituição e percentual do CDI.'; end if;
   insert into public.assets(ticker,name,asset_class,institution,cdi_percent,status) values('CDI-'||substr(gen_random_uuid()::text,1,8),trim(p_name),'cdi',trim(p_institution),p_percent,'active') returning * into a;
   insert into public.asset_prices(asset_id,price,price_date) values(a.id,1,p_date);
   insert into public.investment_transactions(asset_id,portfolio_id,type,quantity,unit_price,fees,operation_date,notes) values(a.id,p_portfolio,'deposit',p_amount,1,0,p_date,'Aplicação inicial CDI. Sem movimentação automática de conta.');
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
   insert into public.asset_prices(asset_id,price,price_date) values(a.id,price,p_date) on conflict(user_id,asset_id,price_date) do update set price=excluded.price;
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
   insert into public.investment_transactions(asset_id,portfolio_id,type,quantity,unit_price,fees,operation_date,notes) values(a.id,p_portfolio,p_action,q,price,0,p_date,'Movimentação CDI em reais. Sem movimentação automática de conta.') returning id into result;
   return result;
 end if;
 raise exception 'Ação CDI inválida.';
end $$;
revoke all on function public.manage_cdi(text,uuid,text,text,numeric,uuid,numeric,date) from public,anon;
grant execute on function public.manage_cdi(text,uuid,text,text,numeric,uuid,numeric,date) to authenticated;
