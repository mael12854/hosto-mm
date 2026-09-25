import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CadreAcces from '../components/CadreAcces.jsx'
import { Champ, Message } from '../components/ui.jsx'
import { useAuth, espaceDe } from '../lib/auth.jsx'
import { supabase, messageErreur } from '../lib/supabase.js'

export default function Connexion() {
  const { session, profil, pret } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [msg, setMsg] = useState({})
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => { if (session && pret) nav(espaceDe(profil), { replace: true }) }, [session, pret, profil, nav])

  const connecter = async e => {
    e.preventDefault()
    setEnvoi(true); setMsg({})
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp })
    setEnvoi(false)
    if (error) setMsg({ alerte: messageErreur(error) })
  }

  const oubli = async () => {
    if (!email.trim()) { setMsg({ alerte: 'Saisissez d\'abord votre adresse e-mail.' }); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/nouveau-mot-de-passe' })
    setMsg(error ? { alerte: messageErreur(error) } : { succes: 'Un e-mail de réinitialisation vient de vous être envoyé.' })
  }

  return (
    <CadreAcces titre="Connexion" intro="Personnel soignant et patients : connectez-vous pour accéder à votre espace."
      pied={<>Patient sans compte ? <Link to="/inscription">Créer un compte patient</Link></>}>
      <form onSubmit={connecter} style={{ display: 'grid', gap: 14 }}>
        <Champ label="Adresse e-mail"><input type="email" className="saisie" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></Champ>
        <Champ label="Mot de passe"><input type="password" className="saisie" autoComplete="current-password" required value={mdp} onChange={e => setMdp(e.target.value)} /></Champ>
        <button type="submit" className="btn btn-plein btn-bloc" disabled={envoi}>{envoi ? 'Connexion…' : 'Se connecter'}</button>
        <button type="button" className="btn-lien bleu" style={{ justifySelf: 'start' }} onClick={oubli}>MOT DE PASSE OUBLIÉ</button>
      </form>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>
    </CadreAcces>
  )
}
