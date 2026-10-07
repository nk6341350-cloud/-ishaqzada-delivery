-- Admin-only branch filter for orders, daily totals and reports. No data changes.
begin;
set local lock_timeout='5s';
do $admin_filter$
declare definition text; old_text text; new_text text;
begin
select pg_get_functiondef('public.delivery_api(text,jsonb,text)'::regprocedure) into definition;
old_text := $old$(u.role='admin' or (u.role='agent' and created_by=u.id) or (u.role='dispatcher' and dispatch_branch=u.dispatch_branch))$old$;
new_text := $new$((u.role='admin' and (coalesce(p_payload->>'admin_branch','all')='all' or dispatch_branch=p_payload->>'admin_branch')) or (u.role='agent' and created_by=u.id) or (u.role='dispatcher' and dispatch_branch=u.dispatch_branch))$new$;
if (length(definition)-length(replace(definition,old_text,'')))/length(old_text)<>3 then raise exception 'Unexpected RPC definition at admin filter step 1'; end if;
definition:=replace(definition,old_text,new_text);
old_text := $old$(u.role='admin' or (u.role='agent' and o.created_by=u.id) or (u.role='dispatcher' and o.dispatch_branch=u.dispatch_branch))$old$;
new_text := $new$((u.role='admin' and (coalesce(p_payload->>'admin_branch','all')='all' or o.dispatch_branch=p_payload->>'admin_branch')) or (u.role='agent' and o.created_by=u.id) or (u.role='dispatcher' and o.dispatch_branch=u.dispatch_branch))$new$;
if (length(definition)-length(replace(definition,old_text,'')))/length(old_text)<>1 then raise exception 'Unexpected RPC definition at admin filter step 2'; end if;
definition:=replace(definition,old_text,new_text);
execute definition;
end;
$admin_filter$;
commit;
