import { useCallback, useEffect, useMemo, useState } from 'react'
import { Chargement, EnTeteOutil, Message, SelecteurPatient, Vide } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase, journaliser, messageErreur } from '../../lib/supabase.js'
import { dateHeure } from '../../lib/format.js'

const SUGGESTIONS = [
  'Prise de sang — NFS', 'Prise de sang — CRP', 'Prise de sang — ionogramme', 'Bilan hépatique', 'Glycémie',
  'Radiographie du thorax', 'Radiographie du bras', 'Radiographie du coude', 'Radiographie de la jambe', 'Radiographie de la cheville',
  'Échographie abdominale', 'Scanner', 'IRM', 'Électrocardiogramme (ECG)', 'Test COVID / grippe', 'Examen des urines (ECBU)',
]
const COLONNES = [
  ['demandé', 'Demandés', 'var(--ambre)'],
  ['en_cours', 'En cours', 'var(--bleu)'],
  ['disponible', 'Résultats disponibles', 'var(--vert)'],
]

export default function Examens() {
  const { profil } = useAuth()
  const { patients, patient } = usePatients()
  const [liste, setListe] = useState(null)
  const [type, setType] = useState('')
  const [tous, setTous] = useState(false)
  const [resultats, setResultats] = useState({})
  const [msg, setMsg] = useState({})
  const role = profil.medecin ? 'medecin' : 'infirmier'

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('examens_laboratoire').select('*').order('date_demande', { ascending: false })
    if (error) setMsg({ alerte: messageErreur(error) })
    setListe(data || [])
  }, [])
  useEffect(() => { charger() }, [charger])

  const noms = useMemo(() => Object.fromEntries(patients.map(p => [p.id, p.nomComplet])), [patients])
  const visibles = (liste || []).filter(x => tous || x.patient_id === patient?.id)

  const demander = async e => {
    e.preventDefault()
    if (!patient || !type.trim()) return
    const { error } = await supabase.from('examens_laboratoire').insert({
      patient_id: patient.id, service_id: patient.service_id, medecin_id: profil.medecin ? profil.userId : null,
      type_examen: type.trim(), statut: 'demandé',
    })
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser({ ...profil, role }, `Examen demandé : ${type.trim()}`, { patient_id: patient.id, service_id: patient.service_id })
    setMsg({ succes: `Examen « ${type.trim()} » demandé pour ${patient.nomComplet}.` })
    setType('')
    charger()
  }

  const commencer = async x => {
    const { error } = await supabase.from('examens_laboratoire').update({ statut: 'en_cours' }).eq('id', x.id)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser({ ...profil, role }, `Examen en cours : ${x.type_examen}`, { patient_id: x.patient_id, service_id: x.service_id })
    charger()
  }

  const rendre = async x => {
    const r = (resultats[x.id] || '').trim()
    if (!r) { setMsg({ alerte: 'Saisissez le résultat avant de le rendre disponible.' }); return }
    const { error } = await supabase.from('examens_laboratoire').update({ statut: 'disponible', resultat: r, date_resultat: new Date().toISOString() }).eq('id', x.id)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser({ ...profil, role }, `Résultat disponible : ${x.type_examen}`, { patient_id: x.patient_id, service_id: x.service_id })
    setMsg({ succes: `Résultat de « ${x.type_examen} » enregistré. Le patient le voit dans son espace.` })
    setResultats(v => ({ ...v, [x.id]: '' }))
    charger()
  }

  return (
    <>
      <EnTeteOutil titre="Examens">
        Demandez un examen (prise de sang, radiographie, échographie…), suivez son avancement et saisissez le résultat. Le patient ne voit que les résultats disponibles.
      </EnTeteOutil>
      <SelecteurPatient />

      <form onSubmit={demander} className="carte-blanche" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <label className="champ" style={{ flex: '1 1 320px' }}>
          <span>Nouvel examen pour {patient?.nomComplet || '—'}</span>
          <input className="saisie" list="examens-suggestions" required value={type} onChange={e => setType(e.target.value)} placeholder="Radiographie du coude, prise de sang…" />
          <datalist id="examens-suggestions">{SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
        </label>
        <button type="submit" className="btn btn-plein" disabled={!patient}>Demander l'examen</button>
      </form>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>

      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className={'btn-puce' + (!tous ? ' actif' : '')} onClick={() => setTous(false)}>Ce patient</button>
        <button type="button" className={'btn-puce' + (tous ? ' actif' : '')} onClick={() => setTous(true)}>Tous mes patients</button>
      </div>

      {liste === null ? <Chargement /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16, alignItems: 'start' }}>
          {COLONNES.map(([statut, titre, couleur]) => {
            const items = visibles.filter(x => x.statut === statut)
            return (
              <section key={statut} style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `3px solid ${couleur}`, paddingBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--encre)' }}>{titre}</span>
                  <span className="etiquette">{items.length}</span>
                </div>
                {!items.length ? <Vide>Aucun examen.</Vide> : items.map(x => (
                  <article key={x.id} className="carte-blanche" style={{ padding: 14, display: 'grid', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--encre)' }}>{x.type_examen}</div>
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--gris)' }}>
                        {(tous ? `${noms[x.patient_id] || 'Patient'} · ` : '')}DEMANDÉ LE {dateHeure(x.date_demande)}
                      </div>
                    </div>
                    {statut === 'demandé' && <button type="button" className="btn" onClick={() => commencer(x)}>Prélèvement fait — en cours</button>}
                    {statut === 'en_cours' && (
                      <>
                        <textarea className="saisie" rows={3} placeholder="Résultat : valeurs, conclusion du radiologue…" value={resultats[x.id] || ''} onChange={e => setResultats(v => ({ ...v, [x.id]: e.target.value }))} aria-label={`Résultat de ${x.type_examen}`} />
                        <button type="button" className="btn" onClick={() => rendre(x)}>Rendre le résultat disponible</button>
                      </>
                    )}
                    {statut === 'disponible' && (
                      <>
                        <p style={{ fontSize: 14.5, color: 'var(--encre)', whiteSpace: 'pre-wrap', borderLeft: '3px solid var(--vert)', paddingLeft: 10 }}>{x.resultat}</p>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--gris)' }}>RÉSULTAT DU {dateHeure(x.date_resultat)}</span>
                      </>
                    )}
                  </article>
                ))}
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
