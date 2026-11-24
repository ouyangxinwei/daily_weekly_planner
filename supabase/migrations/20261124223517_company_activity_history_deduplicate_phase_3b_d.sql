begin;
create or replace function public.company_log_record_activity() returns trigger language plpgsql security definer set search_path=''
as $f$
declare v_fields text[]:='{}'; v_key text;
begin
 if TG_OP='INSERT' then
  if NEW.record_type in ('customer','project','task','follow_up') then insert into public.company_record_activity_history(owner_username,record_id,record_type,record_title,action,changed_fields,occurred_at) values(NEW.owner_username,NEW.id,NEW.record_type,NEW.title,'created','{}',clock_timestamp()); end if; return NEW;
 elsif TG_OP='DELETE' then
  if OLD.record_type in ('customer','project','task','follow_up') then insert into public.company_record_activity_history(owner_username,record_id,record_type,record_title,action,changed_fields,occurred_at) values(OLD.owner_username,OLD.id,OLD.record_type,OLD.title,'deleted','{}',clock_timestamp()); end if; return OLD;
 end if;
 if NEW.record_type not in ('customer','project','task','follow_up') or OLD.record_type is distinct from NEW.record_type then return NEW; end if;
 if OLD.title is distinct from NEW.title then v_fields:=array_append(v_fields,'title'); end if;
 if OLD.business_type is distinct from NEW.business_type then v_fields:=array_append(v_fields,'business_type'); end if;
 if OLD.parent_record_id is distinct from NEW.parent_record_id then v_fields:=array_append(v_fields,'parent_record_id'); end if;
 if OLD.related_record_ids is distinct from NEW.related_record_ids then v_fields:=array_append(v_fields,'related_record_ids'); end if;
 if OLD.record_date is distinct from NEW.record_date then v_fields:=array_append(v_fields,'record_date'); end if;
 if OLD.due_date is distinct from NEW.due_date then v_fields:=array_append(v_fields,'due_date'); end if;
 if OLD.amount is distinct from NEW.amount then v_fields:=array_append(v_fields,'amount'); end if;
 if OLD.currency is distinct from NEW.currency then v_fields:=array_append(v_fields,'currency'); end if;
 for v_key in select k from (select jsonb_object_keys(coalesce(OLD.data,'{}'::jsonb)) k union select jsonb_object_keys(coalesce(NEW.data,'{}'::jsonb)) k) x where k<>'progress_percent' and (coalesce(OLD.data,'{}'::jsonb)->k) is distinct from (coalesce(NEW.data,'{}'::jsonb)->k) order by k loop v_fields:=array_append(v_fields,'data.'||v_key); end loop;
 if cardinality(v_fields)>0 then insert into public.company_record_activity_history(owner_username,record_id,record_type,record_title,action,changed_fields,occurred_at) values(NEW.owner_username,NEW.id,NEW.record_type,NEW.title,'updated',v_fields,clock_timestamp()); end if;
 return NEW;
end;$f$;
drop table if exists public.company_record_activity;
commit;