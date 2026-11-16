begin;
-- Os alertas são persistidos por usuário e atualizados pelo motor de regras.
alter table public.alerts add constraint alerts_user_title_key unique(user_id,title);
grant insert(title,description,severity),update(title,description,severity),delete on public.alerts to authenticated;

-- Um token antigo de uma conta excluída não deve criar arquivos órfãos.
drop policy own_files_insert on storage.objects;
create policy own_files_insert on storage.objects for insert to authenticated
with check(bucket_id='investfast-private' and (storage.foldername(name))[1]=(select auth.uid())::text
and exists(select 1 from public.profiles where user_id=(select auth.uid())));

-- Evita alterar categorias que já sustentam lançamentos incompatíveis.
create function private.protect_category_type() returns trigger language plpgsql set search_path='' as $$
begin
 if new.type<>old.type and (
  exists(select 1 from public.transactions where category_id=old.id and user_id=old.user_id)
  or exists(select 1 from public.recurring_transactions where category_id=old.id and user_id=old.user_id)
  or exists(select 1 from public.budgets where category_id=old.id and user_id=old.user_id)
 ) then raise exception 'Categoria vinculada: crie outra categoria para mudar o tipo'; end if;
 return new;
end $$;
create trigger protect_category_type before update of type on public.categories for each row execute function private.protect_category_type();
revoke all on function private.protect_category_type() from public,anon,authenticated;

create function private.validate_price_date() returns trigger language plpgsql set search_path='' as $$
begin if new.price_date>current_date then raise exception 'Cotação não pode estar no futuro'; end if; return new; end $$;
create trigger validate_price_date before insert or update on public.asset_prices for each row execute function private.validate_price_date();
revoke all on function private.validate_price_date() from public,anon,authenticated;
commit;
