-- Coordonnées du dossier patient (page « Nouveau patient »).
-- À exécuter une fois : Supabase → SQL Editor → coller ce fichier → Run.
alter table public.patients
  add column if not exists adresse text,
  add column if not exists complement_adresse text,
  add column if not exists code_postal text,
  add column if not exists ville text,
  add column if not exists telephone text,
  add column if not exists lieu_naissance text,
  add column if not exists contact_urgence_nom text,
  add column if not exists contact_urgence_lien text,
  add column if not exists contact_urgence_telephone text,
  add column if not exists medecin_traitant text,
  add column if not exists traitement_en_cours text;

-- Rafraîchit le cache de l'API pour que les nouvelles colonnes soient visibles tout de suite.
notify pgrst, 'reload schema';
