-- Kabul inventory, scoped to 39 existing products. Changes roll back together on a definition mismatch.
begin;
set local lock_timeout='5s';
create table delivery_private.kabul_inventory (
  product_name text primary key,
  sort_order smallint unique not null,
  quantity integer not null default 0 check (quantity>=0),
  updated_at timestamptz not null default now()
);
alter table delivery_private.kabul_inventory enable row level security;
insert into delivery_private.kabul_inventory(sort_order,product_name) values
  (1,'کارټ فلس کپسول او تیل'),
  (2,'فلس کیئر کپسول'),
  (3,'سیون ايپیکټ چای بوتل والا'),
  (4,'سیون ايپیکټ چای پایکټ والا'),
  (5,'ریګل کپسول'),
  (6,'شوګرسټاپ کپسول'),
  (7,'ویګټ ګسن کپسول'),
  (8,'ظاهرشمپو اوتیل'),
  (9,'سټومچ کپسول'),
  (10,'معجون خاص'),
  (11,'معجون نیرو فورټ'),
  (12,'معجون ویټالټي'),
  (13,'معجون ویګټ ګین'),
  (14,'معجون استوکیر'),
  (15,'رومیکس کریم'),
  (16,'کارټ فلس کپسول'),
  (17,'کارټ فلس تیل'),
  (18,'ډیرمیکن سیرم'),
  (19,'فیس کیئرکیریم'),
  (20,'زارا 4n1 کریم'),
  (21,'فروفیشنل کریم فیس واش'),
  (22,'فیرفیکټ مین کپسول'),
  (23,'سوین ایپیکټ سیرم'),
  (24,'رومیکس فالش'),
  (25,'ظاهر دغاښو فوډر'),
  (26,'رومیکس دغاښو فوډر'),
  (27,'هارټ فلس کپسول'),
  (28,'سایډونیک سیرم او کریم'),
  (29,'کرسټل رنک'),
  (30,'فروفیشنل رنګ'),
  (31,'سیون ايپیکټ تیل'),
  (32,'ګسټرو کیئر کپسول'),
  (33,'ریلیر کیئر کپسول'),
  (34,'پیټ کیئر کپسول'),
  (35,'ریکیو کیئر کپسول'),
  (36,'ګین کیئر کپسول'),
  (37,'رینل کیئر کپسول'),
  (38,'لیویر کیئر کپسول'),
  (39,'شوګر کیئر کپسول')
on conflict (product_name) do nothing;

do $inventory_migration$
declare definition text; old_text text; new_text text;
begin
  select pg_get_functiondef('public.delivery_api(text,jsonb,text)'::regprocedure) into definition;
  old_text := $old$  if p_action='orders' then$old$;
  new_text := $new$  if p_action='kabul_inventory' then
    if u.role<>'admin' and not (u.role='dispatcher' and u.dispatch_branch='kabul') then raise exception 'اجازه نشته'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('product_name',product_name,'quantity',quantity) order by sort_order),'[]'::jsonb) into result
      from delivery_private.kabul_inventory;
    return jsonb_build_object('items',result);
  elsif p_action='kabul_stock_add' then
    if u.role<>'admin' then raise exception 'اجازه نشته'; end if;
    if coalesce(p_payload->>'quantity','') !~ '^[0-9]{1,7}$' then raise exception 'تعداد سم ولیکئ'; end if;
    qty := (p_payload->>'quantity')::integer;
    if qty<1 or qty>1000000 then raise exception 'تعداد سم ولیکئ'; end if;
    update delivery_private.kabul_inventory
      set quantity=quantity+qty,updated_at=now()
      where product_name=p_payload->>'product_name' and quantity<=2147483647-qty
      returning quantity into n;
    if not found then raise exception 'جنس یا تعداد سم نه دی'; end if;
    return jsonb_build_object('quantity',n);
  elsif p_action='orders' then$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text)<>1 then raise exception 'Unexpected RPC definition at inventory action'; end if;
  definition:=replace(definition,old_text,new_text);

  old_text := $old$    if order_row.id is null then raise exception 'آرډر مخکې پروسس شوی'; end if;
    return jsonb_build_object('status',order_row.status);$old$;
  new_text := $new$    if order_row.id is null then raise exception 'آرډر مخکې پروسس شوی'; end if;
    if order_row.dispatch_branch='kabul' and exists
      (select 1 from delivery_private.kabul_inventory where product_name=order_row.product_name) then
      update delivery_private.kabul_inventory
        set quantity=quantity-order_row.quantity,updated_at=now()
        where product_name=order_row.product_name and quantity>=order_row.quantity
        returning quantity into n;
      if not found then raise exception 'په کابل کې د دغه جنس موجودي کمه ده'; end if;
    end if;
    return jsonb_build_object('status',order_row.status);$new$;
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text)<>1 then raise exception 'Unexpected RPC definition at stock deduction'; end if;
  definition:=replace(definition,old_text,new_text);
  execute definition;
end;
$inventory_migration$;
commit;
