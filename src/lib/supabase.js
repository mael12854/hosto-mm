import { createClient } from '@supabase/supabase-js'

// Clé publiable : prévue pour le navigateur, les données sont protégées par la RLS.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://cdkktcwpzucdqmmvkoeh.supabase.co'
const cle = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nt5Q22LEEuRNt3RvUufqdA_oiLzHLOK'

export const supabase = createClient(url, cle)

export const BUCKET_PJ = 'pieces-jointes'

/** Trace une action dans le journal d'activité (sans bloquer l'interface si ça échoue). */
export async function journaliser(profil, action, { patient_id = null, service_id = null, details = null } = {}) {
  if (!profil?.userId || !['medecin', 'infirmier'].includes(profil.role)) return
  await supabase.from('journal_activite').insert({
    auteur_id: profil.userId, role_auteur: profil.role, action, details, patient_id, service_id,
  })
}

/** Traduit les erreurs Supabase courantes en français. */
export function messageErreur(err) {
  if (!err) return ''
  const m = err.message || String(err)
  if (/Invalid login credentials/i.test(m)) return 'Adresse e-mail ou mot de passe incorrect.'
  if (/Email not confirmed/i.test(m)) return 'Adresse e-mail non confirmée. Ouvrez le lien reçu par e-mail.'
  if (/User already registered/i.test(m)) return 'Un compte existe déjà avec cette adresse e-mail.'
  if (/Password should be at least/i.test(m)) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (/should be different from the old password/i.test(m)) return "Le nouveau mot de passe doit être différent de l'ancien."
  if (/rate limit|too many requests|For security purposes/i.test(m)) return 'Trop de demandes rapprochées. Patientez une minute avant de réessayer.'
  if (/expired|invalid.*(token|link)/i.test(m)) return 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau depuis la page de connexion.'
  if (/row-level security|permission denied/i.test(m)) return "Action refusée : vous n'êtes pas rattaché au service de ce patient."
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Connexion impossible. Vérifiez votre accès à Internet.'
  return m
}
