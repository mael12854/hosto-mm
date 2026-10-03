-- Deux sites, mêmes services : Issy-les-Moulineaux et Igny.
-- Lits, séjours et rendez-vous indiquent leur site.
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  adresse text,
  code_postal text,
  ville text not null,
  telephone text,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.sites enable row level security;

-- Lecture pour tous (page d'accueil publique) ; modification réservée aux médecins.
drop policy if exists sites_select_tous on public.sites;
create policy sites_select_tous on public.sites for select to anon, authenticated using (true);
drop policy if exists sites_update_medecin on public.sites;
create policy sites_update_medecin on public.sites for update to authenticated using (public.est_medecin()) with check (public.est_medecin());

insert into public.sites (nom, adresse, code_postal, ville, ordre) values
  ('Issy-les-Moulineaux', '102 boulevard Gallieni', '92130', 'ISSY-LES-MOULINEAUX', 1),
  ('Igny', '28 bis avenue de la République', '91430', 'IGNY', 2)
on conflict (nom) do update set adresse = excluded.adresse, code_postal = excluded.code_postal, ville = excluded.ville;

alter table public.lits add column if not exists site_id uuid references public.sites(id);
alter table public.hospitalisations add column if not exists site_id uuid references public.sites(id);
alter table public.rendez_vous add column if not exists site_id uuid references public.sites(id);
create index if not exists lits_site_idx on public.lits(site_id);
create index if not exists hospitalisations_site_idx on public.hospitalisations(site_id);
create index if not exists rendez_vous_site_idx on public.rendez_vous(site_id);

-- Les données existantes sont rattachées au premier site.
update public.lits set site_id = (select id from public.sites where nom = 'Issy-les-Moulineaux') where site_id is null;
update public.hospitalisations set site_id = (select id from public.sites where nom = 'Issy-les-Moulineaux') where site_id is null;
update public.rendez_vous set site_id = (select id from public.sites where nom = 'Issy-les-Moulineaux') where site_id is null;

notify pgrst, 'reload schema';
