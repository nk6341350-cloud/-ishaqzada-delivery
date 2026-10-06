-- Branch routing only. Existing users and orders default to Kandahar.
-- Transaction rolls back entirely if the installed RPC differs unexpectedly.
begin;
set local lock_timeout = '5s';
alter table delivery_private.users add column if not exists dispatch_branch text not null default 'kandahar' check (dispatch_branch in ('kandahar','kabul'));
alter table delivery_private.orders add column if not exists dispatch_branch text not null default 'kandahar' check (dispatch_branch in ('kandahar','kabul'));
do $branch_migration$
declare
  definition text;
  old_text text;
  new_text text;
begin
  select pg_get_functiondef('public.delivery_api(text,jsonb,text)'::regprocedure) into definition;
  if position('dispatch_branch' in definition)>0 then
    raise exception 'Branch routing already present: inspect before applying';
  end if;
  old_text := $old$'role',u.role,'status'$old$;
  new_text := $new$'role',u.role,'dispatch_branch',u.dispatch_branch,'status'$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 1)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$where u.role<>'agent' or created_by=u.id;$old$;
  new_text := $new$where (u.role='admin' or (u.role='agent' and created_by=u.id) or (u.role='dispatcher' and dispatch_branch=u.dispatch_branch));$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 2)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$where u.role<>'agent' or o.created_by=u.id$old$;
  new_text := $new$where (u.role='admin' or (u.role='agent' and o.created_by=u.id) or (u.role='dispatcher' and o.dispatch_branch=u.dispatch_branch))$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 3)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$qty := (p_payload->>'quantity')::integer;$old$;
  new_text := $new$if p_payload ? 'dispatch_branch' and coalesce(p_payload->>'dispatch_branch','') not in ('kandahar','kabul') then raise exception 'لېږدونکی سم انتخاب کړئ'; end if;
    qty := (p_payload->>'quantity')::integer;$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 4)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$province=p_payload->>'province',quantity=qty,address=trim(p_payload->>'address'),price=amt$old$;
  new_text := $new$province=p_payload->>'province',quantity=qty,address=trim(p_payload->>'address'),price=amt,
        dispatch_branch=coalesce(p_payload->>'dispatch_branch',dispatch_branch)$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 5)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$orders(product_name,customer_phone,province,quantity,address,price,created_by)$old$;
  new_text := $new$orders(product_name,customer_phone,province,quantity,address,price,created_by,dispatch_branch)$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 6)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$p_payload->>'province',qty,trim(p_payload->>'address'),amt,u.id);$old$;
  new_text := $new$p_payload->>'province',qty,trim(p_payload->>'address'),amt,u.id,coalesce(p_payload->>'dispatch_branch','kandahar'));$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 7)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$where id=(p_payload->>'id')::uuid and status='registered' returning * into order_row;$old$;
  new_text := $new$where id=(p_payload->>'id')::uuid and status='registered' and dispatch_branch=u.dispatch_branch returning * into order_row;$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 8)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$province='کندهار'$old$;
  new_text := $new$province=(case dispatch_branch when 'kabul' then 'کابل' else 'کندهار' end)$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 5 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 9)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$province<>'کندهار'$old$;
  new_text := $new$province<>(case dispatch_branch when 'kabul' then 'کابل' else 'کندهار' end)$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 4 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 10)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$(u.role<>'agent' or created_by=u.id)$old$;
  new_text := $new$(u.role='admin' or (u.role='agent' and created_by=u.id) or (u.role='dispatcher' and dispatch_branch=u.dispatch_branch))$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 2 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 11)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$select id,full_name,phone,role,status,created_at,null::text$old$;
  new_text := $new$select id,full_name,phone,role,dispatch_branch,status,created_at,null::text$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 12)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$not in ('agent','dispatcher','reject')$old$;
  new_text := $new$not in ('agent','dispatcher','dispatcher_kandahar','dispatcher_kabul','reject')$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 13)';
  end if;
  definition := replace(definition,old_text,new_text);
  old_text := $old$set role=case when p_payload->>'action'='reject' then 'agent' else p_payload->>'action' end,$old$;
  new_text := $new$set role=case when p_payload->>'action'='reject' then 'agent' when p_payload->>'action' in ('dispatcher_kandahar','dispatcher_kabul') then 'dispatcher' else p_payload->>'action' end,
      dispatch_branch=case p_payload->>'action' when 'dispatcher_kabul' then 'kabul' when 'dispatcher_kandahar' then 'kandahar' else dispatch_branch end,$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'Unexpected delivery_api definition; no changes applied (step 14)';
  end if;
  definition := replace(definition,old_text,new_text);
  execute definition;
end;
$branch_migration$;
create index if not exists delivery_orders_branch_created on delivery_private.orders(dispatch_branch,created_at desc);
commit;
