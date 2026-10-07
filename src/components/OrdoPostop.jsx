import { useCallback, useEffect, useState } from 'react'
import { Message } from './ui.jsx'
import { supabase, journaliser, messageErreur } from '../lib/supabase.js'
import { dateHeure } from '../lib/format.js'
import { ordonnancePostop } from '../lib/interventions.js'
import { imprimerOrdoPostop, texteOrdoPostop } from '../lib/documentsOperation.js'

const ageAns = naissance => (naissance ? Math.floor((Date.now() - new Date(naissance + 'T12:00:00')) / 3.15576e10) : null)

/** Ordonnance post-opératoire : pré-remplie selon l'intervention, l'âge et le poids, modifiable, enregistrée au dossier. */
export default function OrdoPostop({ op, patient, site, medecin, profil, onEnregistre }) {
  const [versions, setVersions] = useState(null)
  const [poids, setPoids] = useState('')
  const [lignes, setLignes] = useState([])
  const [msg, setMsg] = useState({})
  const age = ageAns(patient.date_naissance)

  const charger = useCallback(async () => {
    const [o, c] = await Promise.all([
      supabase.from('prescriptions').select('*').eq('operation_id', op.id).order('created_at', { ascending: false }),
      supabase.from('constantes_vitales').select('poids, date_mesure').eq('patient_id', patient.id).not('poids', 'is', null).order('date_mesure', { ascending: false }).limit(1),
    ])
    const v = o.data || []
    const kg = c.data?.[0]?.poids ? String(c.data[0].poids) : ''
    setVersions(v); setPoids(p => p || kg)
    setLignes(v[0]?.lignes?.length ? v[0].lignes.map(l => ({ nom: l.nom, posologie: l.posologie || '', duree: l.duree || '' })) : ordonnancePostop(op.code_intervention, { age, poids: kg }))
  }, [op.id, op.code_intervention, patient.id, age])
  useEffect(() => { charger() }, [charger])

  const maj = (i, k) => v => setLignes(ls => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)))
  const enregistrer = async () => {
    const propres = lignes.filter(l => l.nom.trim())
    if (!propres.length) { setMsg({ alerte: 'Ajoutez au moins un médicament ou un soin.' }); return }
    const { error } = await supabase.from('prescriptions').insert({
      patient_id: patient.id, service_id: op.service_id, medecin_id: profil.userId, site_id: op.site_id, operation_id: op.id,
      hospitalisation_id: patient.sejour?.id || null, lignes: propres.map(l => ({ nom: l.nom.trim(), posologie: l.posologie.trim(), duree: l.duree.trim() })),
      contenu: texteOrdoPostop(op, propres),
    })
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser(profil, `Ordonnance post-opératoire — ${op.intervention}`, { patient_id: patient.id, service_id: op.service_id })
    setMsg({ succes: 'Ordonnance post-opératoire enregistrée au dossier : le patient la retrouve dans « Mon Hôpital M&M ».' })
    charger(); onEnregistre?.()
  }
  const imprimerVersion = (ls, le) => imprimerOrdoPostop({ op, lignes: ls, patient, site, medecin, le, poids })

  if (versions === null) return null
  return (
    <div className="carte-blanche" style={{ display: 'grid', gap: 14 }}>
      <p style={{ fontSize: 14, color: 'var(--texte)' }}>
        Proposition selon l'intervention{age != null ? `, l'âge (${age} an${age > 1 ? 's' : ''})` : ''} et le poids : à vérifier et adapter avant de signer.
        {age != null && age < 15 && !poids ? ' Indiquez le poids pour calculer les doses.' : ''}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <label className="champ" style={{ width: 150 }}><span>Poids (kg)</span>
          <input className="saisie mono" inputMode="decimal" value={poids} onChange={e => setPoids(e.target.value)} />
        </label>
        <button type="button" className="btn-lien bleu" style={{ paddingBottom: 12 }} onClick={() => setLignes(ordonnancePostop(op.code_intervention, { age, poids }))}>RECALCULER LA PROPOSITION</button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {lignes.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 8, border: '1px solid var(--filet)', padding: 10, alignItems: 'end' }}>
            <label className="champ"><span>{i + 1}. Médicament ou soin</span><input className="saisie" value={l.nom} onChange={e => maj(i, 'nom')(e.target.value)} /></label>
            <label className="champ" style={{ gridColumn: 'span 2' }}><span>Posologie</span><input className="saisie" value={l.posologie} onChange={e => maj(i, 'posologie')(e.target.value)} /></label>
            <label className="champ"><span>Durée</span><input className="saisie" value={l.duree} onChange={e => maj(i, 'duree')(e.target.value)} /></label>
            <button type="button" className="btn-lien" style={{ justifySelf: 'start', paddingBottom: 10 }} onClick={() => setLignes(ls => ls.filter((_, j) => j !== i))}>RETIRER</button>
          </div>
        ))}
        <button type="button" className="btn-lien bleu" style={{ justifySelf: 'start' }} onClick={() => setLignes(ls => [...ls, { nom: '', posologie: '', duree: '' }])}>+ AJOUTER UNE LIGNE</button>
      </div>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>
      <div className="rangee-btn">
        <button type="button" className="btn" onClick={enregistrer} disabled={!profil.medecin}>{versions.length ? 'Enregistrer une nouvelle version' : 'Enregistrer au dossier'}</button>
        <button type="button" className="btn" onClick={() => imprimerVersion(lignes)}>Imprimer</button>
      </div>
      {versions.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div className="etiquette">Enregistrées · {versions.length}</div>
          {versions.map(v => (
            <div key={v.id} className="ligne-liste">
              <span className="mono" style={{ fontSize: 13 }}>{dateHeure(v.created_at)} · {(v.lignes || []).length} ligne{(v.lignes || []).length > 1 ? 's' : ''}</span>
              <button type="button" className="btn-lien bleu" onClick={() => imprimerVersion(v.lignes || [], v.created_at)}>RÉIMPRIMER</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
