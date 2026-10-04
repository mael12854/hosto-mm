-- Module Opérations : salles de bloc (une par site), opérations, accès patient limité.
create extension if not exists btree_gist with schema extensions;

create table if not exists public.salles_operation (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id),
  nom text not null,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  unique (site_id, nom)
);
alter table public.salles_operation enable row level security;
create policy salles_select_personnel on public.salles_operation for select to authenticated using (public.est_medecin() or public.est_infirmier());
create policy salles_ecriture_medecin on public.salles_operation for all to authenticated using (public.est_medecin()) with check (public.est_medecin());
insert into public.salles_operation (site_id, nom, ordre) select id, 'Bloc 1', 1 from public.sites on conflict do nothing;

create table if not exists public.operations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  service_id uuid not null references public.services(id),
  site_id uuid not null references public.sites(id),
  salle_id uuid not null references public.salles_operation(id),
  chirurgien_id uuid references public.medecins(id),
  anesthesiste text,
  equipe text,
  intervention text not null,
  code_intervention text,          -- clé du catalogue (src/lib/interventions.js)
  cote text,
  anesthesie text,
  sejour text,
  debut timestamptz not null,
  fin timestamptz not null,
  statut text not null default 'prévue',
  consult_anesthesie_le date,
  asa smallint,
  consentement_signe boolean not null default false,
  consentement_anesthesie boolean not null default false,
  jeun_verifie boolean not null default false,
  consignes_preop text,
  checklist jsonb not null default '{}'::jsonb,   -- check-list HAS : { cle: { ok, par, le } }
  heures jsonb not null default '{}'::jsonb,      -- entree_bloc, induction, incision, fin_intervention, sortie_bloc, entree_reveil, sortie_reveil
  compte_rendu jsonb,
  compte_rendu_signe_le timestamptz,
  reveil jsonb not null default '{}'::jsonb,      -- aldrete, eva, nausees, notes
  consignes_sortie text,
  notes text,
  cree_par uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_fin_apres_debut check (fin > debut),
  constraint operations_statut check (statut in ('prévue','prête','au_bloc','réveil','terminée','annulée')),
  constraint operations_asa check (asa is null or asa between 1 and 6)
);
-- Une salle ne peut pas accueillir deux opérations en même temps.
alter table public.operations add constraint operations_salle_libre
  exclude using gist (salle_id with =, tstzrange(debut, fin) with &&) where (statut <> 'annulée');
create index if not exists operations_patient_idx on public.operations(patient_id);
create index if not exists operations_debut_idx on public.operations(debut);

alter table public.operations enable row level security;
create policy operations_select_personnel on public.operations for select to authenticated using (public.personnel_rattache_au_service(service_id));
create policy operations_update_personnel on public.operations for update to authenticated using (public.personnel_rattache_au_service(service_id)) with check (public.personnel_rattache_au_service(service_id));
create policy operations_insert_medecin on public.operations for insert to authenticated with check (public.medecin_rattache_au_service(service_id));
create policy operations_delete_medecin on public.operations for delete to authenticated using (public.medecin_rattache_au_service(service_id));

-- Le patient ne lit que ce qui le concerne (pas le compte-rendu ni la check-list).
create or replace function public.mes_operations()
returns table (id uuid, intervention text, code_intervention text, cote text, anesthesie text, sejour text,
  debut timestamptz, fin timestamptz, statut text, consignes_preop text, consignes_sortie text, site_id uuid, chirurgien text)
language sql stable security definer set search_path = public as $$
  select o.id, o.intervention, o.code_intervention, o.cote, o.anesthesie, o.sejour, o.debut, o.fin, o.statut,
         o.consignes_preop, o.consignes_sortie, o.site_id,
         nullif(trim(concat('Dr ', m.prenom, ' ', upper(m.nom))), 'Dr')
  from operations o
  join patients p on p.id = o.patient_id
  left join medecins m on m.id = o.chirurgien_id
  where p.auth_id = auth.uid() and o.statut <> 'annulée'
  order by o.debut desc;
$$;
revoke execute on function public.mes_operations() from public, anon;
grant execute on function public.mes_operations() to authenticated;

notify pgrst, 'reload schema';
