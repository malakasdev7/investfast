create function public.delete_cdi(p_asset uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); op record;
begin
 if uid is null then raise exception 'Entre novamente para continuar.'; end if;
 perform id from public.assets where id=p_asset and user_id=uid and asset_class='cdi' for update;
 if not found then raise exception 'Caixinha não encontrada.'; end if;
 -- Reverse replay order keeps remaining operations valid after each trigger.
 for op in select id from public.investment_transactions where user_id=uid and asset_id=p_asset order by operation_date desc,operation_sequence desc loop
  delete from public.investment_transactions where id=op.id and user_id=uid;
 end loop;
 delete from public.assets where id=p_asset and user_id=uid and asset_class='cdi';
end $$;
revoke all on function public.delete_cdi(uuid) from public,anon;
grant execute on function public.delete_cdi(uuid) to authenticated;
