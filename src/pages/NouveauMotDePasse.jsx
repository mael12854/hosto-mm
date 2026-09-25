import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CadreAcces from '../components/CadreAcces.jsx'
import { Champ, Chargement, Message } from '../components/ui.jsx'
import { useAuth, espaceDe } from '../lib/auth.jsx'
import { supabase, messageErreur } from '../lib/supabase.js'

/** Page ouverte depuis l'e-mail « Réinitialisez votre mot de passe ». */
export default function NouveauMotDePasse() {
  const { session, profil, pret } = useAuth()
  const nav = useNavigate()
  const [mdp, setMdp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [msg, setMsg] = useState({})
  const [envoi, setEnvoi] = useState(false)

  const valider = async e => {
    e.preventDefault()
    if (mdp.length < 6) { setMsg({ alerte: 'Le mot de passe doit contenir au moins 6 caractères.' }); return }
    if (mdp !== confirmation) { setMsg({ alerte: 'Les deux mots de passe ne sont pas identiques.' }); return }
    setEnvoi(true)
    const { error } = await supabase.auth.updateUser({ password: mdp })
    setEnvoi(false)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    setMsg({ succes: 'Mot de passe modifié. Redirection vers votre espace…' })
    setTimeout(() => nav(espaceDe(profil), { replace: true }), 1500)
  }

  if (session === undefined || (session && !pret)) return <div className="page"><Chargement /></div>

  if (!session) {
    return (
      <CadreAcces titre="Lien expiré" intro="Ce lien de réinitialisation n'est plus valable. Demandez-en un nouveau depuis la page de connexion.">
        <Link to="/connexion" className="btn btn-plein btn-bloc">Retour à la connexion</Link>
      </CadreAcces>
    )
  }

  return (
    <CadreAcces titre="Nouveau mot de passe" intro={`Choisissez un nouveau mot de passe pour ${session.user.email}.`}>
      <form onSubmit={valider} style={{ display: 'grid', gap: 14 }}>
        <Champ label="Nouveau mot de passe (6 caractères min.)"><input type="password" className="saisie" autoComplete="new-password" minLength={6} required value={mdp} onChange={e => setMdp(e.target.value)} /></Champ>
        <Champ label="Confirmer le mot de passe"><input type="password" className="saisie" autoComplete="new-password" minLength={6} required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></Champ>
        <button type="submit" className="btn btn-plein btn-bloc" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer le mot de passe'}</button>
      </form>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>
    </CadreAcces>
  )
}
