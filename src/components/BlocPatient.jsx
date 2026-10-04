import { useCallback, useEffect, useState } from 'react'
import { BadgeOp, Checklist, Horaires, Reveil, avancementChecklist } from './Operation.jsx'
import { Message } from './ui.jsx'
import { useAuth } from '../lib/auth.jsx'
import { useBloc } from '../lib/bloc.jsx'
import { useSites } from '../lib/sites.jsx'
import { supabase, journaliser, messageErreur } from '../lib/supabase.js'
import { dateHeure, heure, nomComplet, nomMedecin } from '../lib/format.js'
import { imprimerLivret } from '../lib/livret.js'
import { estMineur, imprimerDossierOperatoire } from '../lib/dossierOperatoire.js'

const ONGLETS = ['Check-list', 'Horaires', 'Réveil']

/** Espace infirmier : opération en cours ou proche (veille → J+2) du patient choisi. */
export default function BlocPatient({ patient }) {
  const { profil } = useAuth()
  const sites = useSites()
  const bloc = useBloc()
  const [op, setOp] = useState(null)
  const [onglet, setOnglet] = useState('Check-list')
  const [msg, setMsg] = useState({})
  const qui = profil.infirmier ? nomComplet(profil.infirmier) : nomMedecin(profil.medecin)

  const charger = useCallback(async () => {
    const debut = new Date(Date.now() - 24 * 3600e3).toISOString(), fin = new Date(Date.now() + 48 * 3600e3).toISOString()
    const { data } = await supabase.from('operations').select('*').eq('patient_id', patient.id).not('statut', 'in', '("annulée","terminée")')
      .gte('debut', debut).lt('debut', fin).order('debut').limit(1)
    setOp(data?.[0] || null); setMsg({})
  }, [patient.id])
  useEffect(() => { charger() }, [charger])

  if (!op) return null
  const enregistrer = async (champs, action) => {
    const { data, error } = await supabase.from('operations').update({ ...champs, updated_at: new Date().toISOString() }).eq('id', op.id).select().single()
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    setOp(data.statut === 'terminée' ? null : data); setMsg({ succes: `${action}.` })
    journaliser({ ...profil, role: profil.infirmier ? 'infirmier' : 'medecin' }, `${action} — ${op.intervention}`, { patient_id: op.patient_id, service_id: op.service_id })
  }
  const donnees = { op, patient, site: sites.parId(op.site_id), salle: bloc.salle(op.salle_id), chirurgien: bloc.chirurgien(op.chirurgien_id), mineur: estMineur(patient.date_naissance, op.debut) }

  return (
    <section style={{ border: '1px solid var(--filet)', borderTop: '3px solid var(--bleu)', background: '#fff', padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="etiquette">Bloc opératoire</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--encre)' }}>{op.intervention}{op.cote && op.cote !== 'Sans objet' ? ` · côté ${op.cote.toLowerCase()}` : ''}</div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--gris)' }}>{dateHeure(op.debut).toUpperCase()} – {heure(op.fin)} · {sites.nom(op.site_id).toUpperCase()} · {(bloc.salle(op.salle_id)?.nom || '').toUpperCase()} · CHECK-LIST {avancementChecklist(op.checklist)}</div>
        </div>
        <BadgeOp statut={op.statut} />
      </div>
      <div className="rangee-btn">
        <button type="button" className="btn" onClick={() => imprimerLivret(donnees)}>Livret « Mon opération »</button>
        <button type="button" className="btn" onClick={() => imprimerDossierOperatoire(donnees)}>Dossier opératoire</button>
      </div>
      <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ONGLETS.map(o => <button key={o} type="button" role="tab" aria-selected={o === onglet} className={'btn-puce' + (o === onglet ? ' actif' : '')} onClick={() => setOnglet(o)}>{o}</button>)}
      </div>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>
      {onglet === 'Check-list' && <Checklist op={op} qui={qui} enregistrer={enregistrer} />}
      {onglet === 'Horaires' && <Horaires op={op} enregistrer={enregistrer} />}
      {onglet === 'Réveil' && <Reveil op={op} enregistrer={enregistrer} />}
    </section>
  )
}
