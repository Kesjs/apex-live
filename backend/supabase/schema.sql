-- Apex : tables à créer dans Supabase (éditeur SQL → coller → Run).
-- Le back-end écrit avec la clé « service_role » ; le navigateur n'accède jamais directement à ces tables.

create table if not exists public.fiches (
  match_id   text primary key,
  jour       date not null,
  date_heure timestamptz not null,
  fiche      jsonb not null,          -- la fiche telle que le front la reçoit (voir API-CONTRACT.md)
  interne    jsonb,                   -- clés techniques servant à corriger la fiche après le match
  evalue     boolean not null default false,
  maj_le     timestamptz not null default now()
);

create index if not exists fiches_jour_idx on public.fiches (jour);
create index if not exists fiches_a_evaluer_idx on public.fiches (date_heure) where evalue = false;

-- Sécurité : RLS activée sans aucune politique = aucun accès avec les clés publiques (anon / authenticated).
alter table public.fiches enable row level security;
revoke all on table public.fiches from anon, authenticated;

-- Ajoute ou rafraîchit une fiche, SAUF si elle a déjà été évaluée (un résultat déjà jugé n'est jamais écrasé).
create or replace function public.enregistrer_fiche(
  p_match_id text, p_jour date, p_date_heure timestamptz, p_fiche jsonb, p_interne jsonb
) returns void
language sql
as $$
  insert into public.fiches (match_id, jour, date_heure, fiche, interne)
  values (p_match_id, p_jour, p_date_heure, p_fiche, p_interne)
  on conflict (match_id) do update
    set jour = excluded.jour,
        date_heure = excluded.date_heure,
        fiche = excluded.fiche,
        interne = excluded.interne,
        maj_le = now()
    where public.fiches.evalue = false;
$$;

-- Les fonctions du schéma public sont appelables par tout le monde via l'API : on les réserve au back-end.
revoke all on function public.enregistrer_fiche(text, date, timestamptz, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.enregistrer_fiche(text, date, timestamptz, jsonb, jsonb) to service_role;
