import { useEffect, useRef, useState } from 'react'
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
  const [codeEnvoye, setCodeEnvoye] = useState(false)
  const [code, setCode] = useState('')
  // Connecté par le code de réinitialisation : on va choisir le mot de passe, pas dans l'espace.
  const versMdp = useRef(false)

  useEffect(() => { if (session && pret && !versMdp.current) nav(espaceDe(profil), { replace: true }) }, [session, pret, profil, nav])

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
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    setCodeEnvoye(true)
    setMsg({ succes: 'E-mail envoyé. Cliquez sur le lien reçu, ou saisissez ci-dessus le code à 6 chiffres.' })
  }

  const validerCode = async e => {
    e.preventDefault()
    setEnvoi(true); setMsg({})
    versMdp.current = true
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ''), type: 'recovery' })
    setEnvoi(false)
    if (error) { versMdp.current = false; setMsg({ alerte: /token|otp|expired|invalid/i.test(error.message) ? 'Code incorrect ou expiré. Vérifiez-le ou demandez un nouvel e-mail.' : messageErreur(error) }); return }
    nav('/nouveau-mot-de-passe', { replace: true })
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
      {codeEnvoye && (
        <form onSubmit={validerCode} style={{ display: 'grid', gap: 14, borderTop: '1px solid var(--filet)', paddingTop: 18 }}>
          <Champ label="Code reçu par e-mail">
            <input className="saisie mono" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9 ]{6,10}" maxLength={10}
              placeholder="000000" value={code} onChange={e => setCode(e.target.value)} style={{ fontSize: 22, letterSpacing: '0.3em' }} />
          </Champ>
          <button type="submit" className="btn btn-bloc" disabled={envoi}>{envoi ? 'Vérification…' : 'Valider le code'}</button>
        </form>
      )}
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>
    </CadreAcces>
  )
}
