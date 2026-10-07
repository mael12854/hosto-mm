-- Domaines d'urgence : « generale » = Urgences, pas encore orienté ; puis pediatrie, orl, ophtalmo,
-- trauma, cardio, gyneco, dentaire, psy (liste dans src/lib/urgences.js). Le service reste « Urgences ».
alter table public.hospitalisations add column if not exists filiere_urgence text;
comment on column public.hospitalisations.filiere_urgence is 'Domaine d''urgence (src/lib/urgences.js) : generale = Urgences, pas encore orienté';
update public.hospitalisations set filiere_urgence = 'generale'
  where filiere_urgence is null and service_id = (select id from public.services where nom = 'Urgences');
notify pgrst, 'reload schema';
