import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CadreAcces from '../components/CadreAcces.jsx'
import { Champ, ChampDate, Message } from '../components/ui.jsx'
import { useAuth } from '../lib/auth.jsx'
import { supabase, messageErreur } from '../lib/supabase.js'
import { valeurDate } from '../lib/format.js'

export default function LierDossier() {
  const { recharger, deconnexion } = useAuth()
  const nav = useNavigate()
  const [num, setNum] = useState('')
  const [naissance, setNaissance] = useState('')
  const [msg, setMsg] = useState({})

  const lier = async e => {
    e.preventDefault()
    const { data, error } = await supabase.rpc('lier_compte_patient', { p_numero_dossier: num.trim(), p_date_naissance: naissance })
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    if (!data) { setMsg({ alerte: 'Dossier introuvable ou déjà lié à un compte. Vérifiez le numéro indiqué sur votre bracelet.' }); return }
    await recharger()
    nav('/patient')
  }

  return (
    <CadreAcces titre="Lier mon dossier" intro="Saisissez le numéro de dossier inscrit sur votre bracelet et votre date de naissance."
      pied={<button type="button" className="btn-lien bleu" onClick={async () => { await deconnexion(); nav('/') }}>DÉCONNEXION</button>}>
      <form onSubmit={lier} style={{ display: 'grid', gap: 14 }}>
        <Champ label="N° de dossier"><input className="saisie mono" required placeholder="2026-0001" value={num} onChange={e => setNum(e.target.value)} /></Champ>
        <ChampDate label="Date de naissance" required valeur={naissance} onChange={setNaissance} max={valeurDate()} />
        <button type="submit" className="btn btn-plein btn-bloc">Lier mon dossier</button>
      </form>
      <Message type="alerte">{msg.alerte}</Message>
    </CadreAcces>
  )
}
