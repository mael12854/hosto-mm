-- Site d'émission des ordonnances (en-tête à la réimpression).
alter table public.prescriptions add column if not exists site_id uuid references public.sites(id);

-- Reprise des données existantes (5 octobre 2026) : tout est à Igny,
-- sauf le dernier rendez-vous et l'ordonnance d'Adeline DOMENECH (Issy-les-Moulineaux).
update public.lits set site_id = (select id from public.sites where nom = 'Igny');
update public.hospitalisations set site_id = (select id from public.sites where nom = 'Igny');
update public.rendez_vous set site_id = (select id from public.sites where nom = 'Igny') where id <> 'd6249dcf-fdb2-4ca4-8f05-958cc9870ab0';
update public.prescriptions set site_id = (select id from public.sites where nom = 'Igny');
update public.prescriptions pr set site_id = (select s.id from public.sites s where s.nom = 'Issy-les-Moulineaux') where pr.id = '90685d0b-8e10-4369-a7b5-5d10bc7a7859';

notify pgrst, 'reload schema';
