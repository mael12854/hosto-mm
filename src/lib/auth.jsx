import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const AuthCtx = createContext(null)

async function chargerProfil(user) {
  if (!user) return null
  const [med, inf, pat] = await Promise.all([
    supabase.from('medecins').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('infirmiers').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('patients').select('*, services(nom)').eq('auth_id', user.id).maybeSingle(),
  ])
  const medecin = med.data || null
  const infirmier = inf.data || null
  const patient = pat.data || null
  const role = medecin ? 'medecin' : infirmier ? 'infirmier' : patient ? 'patient' : null
  return { userId: user.id, email: user.email, role, medecin, infirmier, patient }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profil, setProfil] = useState(null)
  const [pret, setPret] = useState(false)

  const rafraichir = useCallback(async (s) => {
    setProfil(await chargerProfil(s?.user))
    setPret(true)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); rafraichir(data.session) })
    const { data } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s)
      if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT' || evt === 'USER_UPDATED') { setPret(false); setTimeout(() => rafraichir(s), 0) }
    })
    return () => data.subscription.unsubscribe()
  }, [rafraichir])

  const valeur = {
    session, profil, pret,
    recharger: () => rafraichir(session),
    deconnexion: () => supabase.auth.signOut(),
  }
  return <AuthCtx.Provider value={valeur}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)

/** Espace d'accueil selon le rôle. */
export function espaceDe(profil) {
  if (!profil) return '/connexion'
  if (profil.role === 'medecin') return '/medecin'
  if (profil.role === 'infirmier') return '/infirmier'
  if (profil.role === 'patient') return '/patient'
  return '/patient/lier'
}
