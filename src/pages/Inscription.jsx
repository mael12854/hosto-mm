import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CadreAcces from '../components/CadreAcces.jsx'
import { Champ, Message } from '../components/ui.jsx'
import { supabase, messageErreur } from '../lib/supabase.js'

/** Création d'un compte patient. Le compte est ensuite lié au dossier (n° + date de naissance). */
export default function Inscription() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [msg, setMsg] = useState({})
  const [envoi, setEnvoi] = useState(false)

  const inscrire = async e => {
    e.preventDefault()
    setEnvoi(true); setMsg({})
    // Aucune métadonnée : le compte n'est ni médecin ni infirmier.
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: mdp, options: { emailRedirectTo: window.location.origin + '/patient/lier' } })
    setEnvoi(false)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    if (data.session) nav('/patient/lier')
    else setMsg({ succes: 'Compte créé. Ouvrez le lien reçu par e-mail pour confirmer votre adresse, puis connectez-vous.' })
  }

  return (
    <CadreAcces titre="Créer un compte patient" intro="Vous aurez besoin ensuite de votre numéro de dossier et de votre date de naissance."
      pied={<>Déjà un compte ? <Link to="/connexion">Se connecter</Link></>}>
      <form onSubmit={inscrire} style={{ display: 'grid', gap: 14 }}>
        <Champ label="Adresse e-mail"><input type="email" className="saisie" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></Champ>
        <Champ label="Mot de passe (6 caractères min.)"><input type="password" className="saisie" autoComplete="new-password" minLength={6} required value={mdp} onChange={e => setMdp(e.target.value)} /></Champ>
        <button type="submit" className="btn btn-plein btn-bloc" disabled={envoi}>{envoi ? 'Création…' : 'Créer mon compte'}</button>
      </form>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>
    </CadreAcces>
  )
}
