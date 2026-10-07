-- Filter only the agent's report by dispatcher branch. No stored data changes.
begin;
set local lock_timeout='5s';
do $agent_report$
declare definition text; report_part text; updated_part text; old_text text; new_text text; start_pos integer; end_pos integer;
begin
  select pg_get_functiondef('public.delivery_api(text,jsonb,text)'::regprocedure) into definition;
  start_pos:=strpos(definition,'elsif p_action=''report'' then');
  end_pos:=strpos(substr(definition,start_pos), 'group by 1 order by 1 desc limit 365');
  if start_pos=0 or end_pos=0 then raise exception 'Report section not found'; end if;
  report_part:=substr(definition,start_pos,end_pos+length('group by 1 order by 1 desc limit 365')-1);
  old_text:='(u.role=''agent'' and created_by=u.id)';
  new_text:='(u.role=''agent'' and created_by=u.id and (coalesce(p_payload->>''report_branch'',''all'')=''all'' or dispatch_branch=p_payload->>''report_branch''))';
  if (length(report_part)-length(replace(report_part,old_text,'')))/length(old_text)<>1 then raise exception 'Unexpected agent report definition'; end if;
  updated_part:=replace(report_part,old_text,new_text);
  definition:=replace(definition,report_part,updated_part);
  execute definition;
end;
$agent_report$;
commit;
