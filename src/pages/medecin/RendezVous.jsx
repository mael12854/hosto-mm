import { useCallback, useEffect, useMemo, useState } from 'react'
import { Chargement, ChampDate, EnTeteOutil, Message, SelecteurPatient, Vide } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase, journaliser, messageErreur } from '../../lib/supabase.js'
import { dateHeure, nomMedecin, valeurDateHeure } from '../../lib/format.js'
import { envoyerParEmail } from '../../lib/impression.js'

const STATUTS = { 'prévu': ['bleu', 'Prévu'], 'terminé': ['stable', 'Terminé'], 'annulé': ['sorti', 'Annulé'] }

/** Prochain créneau rond : maintenant + 1 h, minutes à 0. */
function creneauParDefaut() {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return valeurDateHeure(d)
}

const jourLong = d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const majuscule = t => t.charAt(0).toUpperCase() + t.slice(1)
const heure = d => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function RendezVous() {
  const { profil } = useAuth()
  const { patients, patient } = usePatients()
  const [quand, setQuand] = useState(creneauParDefaut)
  const [motif, setMotif] = useState('')
  const [liste, setListe] = useState(null)
  const [voirPasses, setVoirPasses] = useState(false)
  const [msg, setMsg] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const medecin = nomMedecin(profil?.medecin)

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('rendez_vous').select('*').order('date_heure')
    if (error) setMsg({ alerte: messageErreur(error) })
    setListe(data || [])
  }, [])
  useEffect(() => { charger() }, [charger])

  const nomPatient = useMemo(() => Object.fromEntries(patients.map(p => [p.id, p])), [patients])
  const debutJour = new Date(); debutJour.setHours(0, 0, 0, 0)
  const aVenir = (liste || []).filter(r => r.statut === 'prévu' && new Date(r.date_heure) >= debutJour)
  const autres = (liste || []).filter(r => !aVenir.includes(r)).reverse()
  const parJour = aVenir.reduce((acc, r) => { const j = jourLong(r.date_heure); (acc[j] = acc[j] || []).push(r); return acc }, {})

  const programmer = async e => {
    e.preventDefault()
    if (!patient) return
    const x = new Date(quand)
    if (!quand || isNaN(x)) { setMsg({ alerte: "Indiquez la date et l'heure du rendez-vous." }); return }
    if (x < new Date()) { setMsg({ alerte: 'Le rendez-vous doit être dans le futur.' }); return }
    setEnvoi(true)
    const { error } = await supabase.from('rendez_vous').insert({
      patient_id: patient.id, service_id: patient.service_id, medecin_id: profil.userId,
      date_heure: x.toISOString(), motif: motif.trim() || null, statut: 'prévu',
    })
    setEnvoi(false)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser(profil, `Rendez-vous programmé le ${dateHeure(x)}`, { patient_id: patient.id, service_id: patient.service_id })
    setMsg({ succes: `Rendez-vous programmé pour ${patient.nomComplet} le ${jourLong(x)} à ${heure(x)}.` })
    setMotif(''); setQuand(creneauParDefaut())
    charger()
  }

  const changerStatut = async (r, statut) => {
    const { error } = await supabase.from('rendez_vous').update({ statut }).eq('id', r.id)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser(profil, `Rendez-vous ${statut} (${dateHeure(r.date_heure)})`, { patient_id: r.patient_id, service_id: r.service_id })
    setMsg({ succes: statut === 'annulé' ? 'Rendez-vous annulé.' : 'Rendez-vous marqué comme terminé.' })
    charger()
  }

  const convoquer = r => {
    const p = nomPatient[r.patient_id]
    envoyerParEmail({
      destinataire: p?.email || '',
      sujet: `Votre rendez-vous du ${jourLong(r.date_heure)} à ${heure(r.date_heure)} — Hôpital M&M`,
      texte: `RENDEZ-VOUS\n\nPatient : ${p?.nomComplet || ''}\nDate : ${jourLong(r.date_heure)}\nHeure : ${heure(r.date_heure)}\nService : ${p?.service || ''}\nMédecin : ${medecin}${r.motif ? `\nMotif : ${r.motif}` : ''}\n\nMerci de vous présenter 5 minutes avant l'heure. En cas d'empêchement, prévenez l'Hôpital M&M.`,
    })
  }

  const Ligne = ({ r }) => {
    const p = nomPatient[r.patient_id]
    const [cle, libelle] = STATUTS[r.statut] || ['sorti', r.statut]
    return (
      <div className="ligne-liste" style={{ flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', minWidth: 0, flex: '1 1 260px' }}>
          <span className="mono" style={{ fontSize: 18, color: 'var(--encre)', flex: 'none' }}>{heure(r.date_heure)}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--encre)' }}>{p?.nomComplet || 'Patient'}</div>
            <div style={{ fontSize: 14, color: 'var(--texte)' }}>{r.motif || 'Consultation'}{p?.service ? ` · ${p.service}` : ''}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {r.statut !== 'prévu' && <span className={'badge ' + cle}>{libelle}</span>}
          {r.statut === 'prévu' && <>
            <button type="button" className="btn-lien bleu" onClick={() => convoquer(r)}>ENVOYER PAR EMAIL</button>
            <button type="button" className="btn-lien bleu" onClick={() => changerStatut(r, 'terminé')}>TERMINÉ</button>
            <button type="button" className="btn-lien" onClick={() => changerStatut(r, 'annulé')}>ANNULER</button>
          </>}
        </div>
      </div>
    )
  }

  return (
    <>
      <EnTeteOutil titre="Rendez-vous">
        Programmez les consultations et contrôles : date, heure et motif. Le patient retrouve ses prochains rendez-vous dans « Mon Hôpital M&amp;M ».
      </EnTeteOutil>

      <SelecteurPatient />

      <form onSubmit={programmer} className="carte-blanche" style={{ display: 'grid', gap: 14 }}>
        <div className="etiquette">Nouveau rendez-vous</div>
        <div className="grille-champs large">
          <ChampDate type="datetime-local" label="Date et heure" valeur={quand} onChange={setQuand} min={valeurDateHeure()} required />
          <label className="champ" style={{ gridColumn: 'span 2' }}>
            <span>Motif</span>
            <input className="saisie" value={motif} onChange={e => setMotif(e.target.value)} placeholder="Contrôle, pansement, retrait du plâtre…" />
          </label>
        </div>
        <div className="rangee-btn">
          <button type="submit" className="btn btn-plein" disabled={!patient || envoi}>{envoi ? 'Enregistrement…' : 'Programmer le rendez-vous'}</button>
        </div>
      </form>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>

      <div style={{ display: 'grid', gap: 16 }}>
        <div className="etiquette">Prochains rendez-vous · {aVenir.length}</div>
        {liste === null ? <Chargement /> : !aVenir.length ? <Vide>Aucun rendez-vous prévu.</Vide> : Object.entries(parJour).map(([jour, rdv]) => (
          <div key={jour} style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--bleu)' }}>{majuscule(jour)}</div>
            {rdv.map(r => <Ligne key={r.id} r={r} />)}
          </div>
        ))}
      </div>

      {autres.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <button type="button" className="btn-lien bleu" style={{ justifySelf: 'start' }} onClick={() => setVoirPasses(v => !v)}>
            {voirPasses ? 'MASQUER' : 'AFFICHER'} LES RENDEZ-VOUS PASSÉS ET ANNULÉS ({autres.length})
          </button>
          {voirPasses && autres.map(r => (
            <div key={r.id} style={{ display: 'grid', gap: 4 }}>
              <span className="etiquette">{jourLong(r.date_heure)}</span>
              <Ligne r={r} />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
