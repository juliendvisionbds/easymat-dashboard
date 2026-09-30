-- Journal des ventes Easymat : factures + historique des imports.

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  period_start date not null,
  period_end date not null,
  nb_factures integer not null,
  total_ht numeric(14, 2) not null,
  replaced_months text[] not null default '{}',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.factures (
  numero text primary key,
  client_code text not null,
  client_name text not null,
  date date not null,
  montant_ht numeric(14, 2) not null,
  montant_tva numeric(14, 2) not null default 0,
  montant_ttc numeric(14, 2) not null default 0,
  import_id uuid references public.imports (id) on delete set null
);

create index factures_date_idx on public.factures (date);
create index factures_client_idx on public.factures (client_code);

alter table public.imports enable row level security;
alter table public.factures enable row level security;

-- Accès unique : tout utilisateur connecté voit et modifie tout. Rien pour les anonymes.
create policy "imports_authenticated" on public.imports
  for all to authenticated using (true) with check (true);
create policy "factures_authenticated" on public.factures
  for all to authenticated using (true) with check (true);

-- Import atomique : écrase les mois indiqués puis insère les factures du fichier.
create or replace function public.apply_import(
  p_filename text,
  p_replaced_months text[],
  p_factures jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if jsonb_array_length(p_factures) = 0 then
    raise exception 'Import vide';
  end if;

  insert into imports (filename, period_start, period_end, nb_factures, total_ht, replaced_months)
  select p_filename, min(f.date), max(f.date), count(*), sum(f.ht), p_replaced_months
  from jsonb_to_recordset(p_factures) as f(date date, ht numeric)
  returning id into v_id;

  delete from factures where to_char(date, 'YYYY-MM') = any (p_replaced_months);

  insert into factures (numero, client_code, client_name, date, montant_ht, montant_tva, montant_ttc, import_id)
  select f.numero, f."clientCode", f."clientName", f.date, f.ht, f.tva, f.ttc, v_id
  from jsonb_to_recordset(p_factures) as f(
    numero text, "clientCode" text, "clientName" text, date date, ht numeric, tva numeric, ttc numeric
  )
  on conflict (numero) do update set
    client_code = excluded.client_code,
    client_name = excluded.client_name,
    date = excluded.date,
    montant_ht = excluded.montant_ht,
    montant_tva = excluded.montant_tva,
    montant_ttc = excluded.montant_ttc,
    import_id = excluded.import_id;

  return v_id;
end;
$$;

revoke execute on function public.apply_import(text, text[], jsonb) from public, anon;
grant execute on function public.apply_import(text, text[], jsonb) to authenticated;
