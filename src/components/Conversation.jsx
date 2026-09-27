import { useCallback, useEffect, useRef, useState } from 'react'
import { Chargement, Message } from './ui.jsx'
import { supabase, messageErreur } from '../lib/supabase.js'
import { dateHeure } from '../lib/format.js'

/**
 * Fil de messages entre un patient et l'équipe médicale.
 * moi : 'medecin' ou 'patient' — détermine le côté des bulles et l'expéditeur des envois.
 */
export default function Conversation({ patientId, moi, medecinId = null, nomAutre, onLu }) {
  const [messages, setMessages] = useState(null)
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const bas = useRef(null)

  const charger = useCallback(async () => {
    if (!patientId) return
    const { data, error } = await supabase.from('messages').select('*').eq('patient_id', patientId).order('created_at')
    if (error) { setErreur(messageErreur(error)); return }
    setMessages(data || [])
    const nonLus = (data || []).some(m => m.expediteur !== moi && !m.lu)
    if (nonLus) { await supabase.rpc('marquer_messages_lus', { p_patient_id: patientId }); onLu?.() }
  }, [patientId, moi, onLu])

  useEffect(() => { setMessages(null); charger() }, [charger])
  // Nouveaux messages : on relit la conversation toutes les 30 s.
  useEffect(() => { const t = setInterval(charger, 30000); return () => clearInterval(t) }, [charger])
  useEffect(() => { bas.current?.scrollIntoView({ block: 'nearest' }) }, [messages])

  const envoyer = async e => {
    e.preventDefault()
    if (!texte.trim()) return
    setEnvoi(true)
    const { error } = await supabase.from('messages').insert({ patient_id: patientId, medecin_id: moi === 'medecin' ? medecinId : null, expediteur: moi, contenu: texte.trim() })
    setEnvoi(false)
    if (error) { setErreur(messageErreur(error)); return }
    setTexte(''); setErreur('')
    charger(); onLu?.()
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ background: '#fff', border: '1px solid var(--filet)', padding: 16, display: 'grid', gap: 10, maxHeight: 460, overflowY: 'auto' }}>
        {messages === null ? <Chargement /> : !messages.length ? (
          <p style={{ fontSize: 14.5, color: 'var(--gris)', textAlign: 'center', padding: 20 }}>Aucun message pour le moment. Écrivez le premier.</p>
        ) : messages.map(m => {
          const mien = m.expediteur === moi
          return (
            <div key={m.id} style={{ justifySelf: mien ? 'end' : 'start', maxWidth: '78%', display: 'grid', gap: 3 }}>
              <div style={{
                background: mien ? 'var(--bleu)' : 'var(--papier)', color: mien ? 'var(--papier)' : 'var(--encre)',
                border: mien ? 'none' : '1px solid var(--filet)', padding: '9px 12px', fontSize: 15, whiteSpace: 'pre-wrap', lineHeight: 1.4,
              }}>{m.contenu}</div>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--gris)', textAlign: mien ? 'right' : 'left' }}>
                {mien ? 'VOUS' : (nomAutre || '').toUpperCase()} · {dateHeure(m.created_at)}{mien && m.lu ? ' · LU' : ''}
              </span>
            </div>
          )
        })}
        <div ref={bas} />
      </div>
      <form onSubmit={envoyer} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label className="champ" style={{ flex: '1 1 280px' }}>
          <span>Votre message</span>
          <textarea className="saisie" rows={2} value={texte} onChange={e => setTexte(e.target.value)} placeholder={moi === 'patient' ? 'Posez votre question au médecin…' : 'Répondez au patient…'}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) envoyer(e) }} />
        </label>
        <button type="submit" className="btn btn-plein" disabled={envoi || !texte.trim()}>{envoi ? 'Envoi…' : 'Envoyer'}</button>
      </form>
      <Message type="alerte">{erreur}</Message>
    </div>
  )
}
