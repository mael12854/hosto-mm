import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreneauOp } from '../../components/Operation.jsx'
import { Champ, EnTeteOutil, Message, Saisie, SelecteurPatient, ZoneTexte } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useBloc } from '../../lib/bloc.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { useSites } from '../../lib/sites.jsx'
import { supabase, journaliser, messageErreur } from '../../lib/supabase.js'
import { dateHeure, heure, valeurDateHeure } from '../../lib/format.js'
import { ANESTHESIES, COTES, INTERVENTIONS, SEJOURS, ficheIntervention } from '../../lib/interventions.js'
import { imprimerLivret } from '../../lib/livret.js'

/** Prochain créneau : demain 8 h 30. */
function creneauParDefaut() {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 30, 0, 0)
  return valeurDateHeure(d)
}

export default function ProgrammerOperation() {
  const { profil } = useAuth()
  const { patient } = usePatients()
  const sites = useSites()
  const bloc = useBloc()
  const nav = useNavigate()
  const [f, setF] = useState(() => {
    const x = ficheIntervention('appendicectomie')
    return { code: x.code, intervention: x.nom, cote: x.cote ? '' : 'Sans objet', anesthesie: x.anesthesie, sejour: x.sejour, duree: x.duree, debut: creneauParDefaut(), site_id: '', salle_id: '', chirurgien_id: profil.userId, anesthesiste: '', equipe: '', consignes_preop: '' }
  })
  const [occupe, setOccupe] = useState([])
  const [msg, setMsg] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const maj = k => v => setF(x => ({ ...x, [k]: v }))
  const fiche = ficheIntervention(f.code)

  const siteId = f.site_id || sites.parDefaut?.id || ''
  const sallesSite = bloc.salles.filter(s => s.site_id === siteId)
  const salleId = sallesSite.some(s => s.id === f.salle_id) ? f.salle_id : sallesSite[0]?.id || ''
  const debut = new Date(f.debut)
  const fin = new Date(debut.getTime() + Number(f.duree || 0) * 60000)

  // Choisir une intervention du catalogue remplit les valeurs par défaut.
  const choisirIntervention = code => {
    const x = ficheIntervention(code)
    setF(y => ({ ...y, code, intervention: code === 'autre' ? '' : x.nom, anesthesie: x.anesthesie, sejour: x.sejour, duree: x.duree, cote: x.cote ? '' : 'Sans objet' }))
  }

  // Opérations déjà prévues ce jour-là dans la salle (pour repérer un chevauchement).
  useEffect(() => {
    if (!salleId || isNaN(debut)) return
    const j = new Date(debut); j.setHours(0, 0, 0, 0)
    const k = new Date(j); k.setDate(k.getDate() + 1)
    supabase.from('operations').select('id, debut, fin, intervention, statut').eq('salle_id', salleId).neq('statut', 'annulée')
      .gte('debut', j.toISOString()).lt('debut', k.toISOString()).order('debut').then(({ data }) => setOccupe(data || []))
  }, [salleId, f.debut]) // eslint-disable-line react-hooks/exhaustive-deps
  const conflit = useMemo(() => occupe.find(o => new Date(o.debut) < fin && new Date(o.fin) > debut), [occupe, f.debut, f.duree]) // eslint-disable-line react-hooks/exhaustive-deps

  const brouillon = () => ({ intervention: f.intervention || fiche.nom, code_intervention: f.code, cote: f.cote, anesthesie: f.anesthesie, sejour: f.sejour, debut: debut.toISOString(), fin: fin.toISOString(), consignes_preop: f.consignes_preop })

  const programmer = async e => {
    e.preventDefault()
    setMsg({})
    if (!patient) { setMsg({ alerte: 'Choisissez le patient.' }); return }
    if (!f.intervention.trim()) { setMsg({ alerte: "Indiquez l'intervention." }); return }
    if (fiche.cote && !f.cote) { setMsg({ alerte: 'Indiquez le côté à opérer.' }); return }
    if (isNaN(debut) || !(Number(f.duree) > 0)) { setMsg({ alerte: "Indiquez le début et la durée." }); return }
    if (!salleId) { setMsg({ alerte: 'Aucune salle de bloc sur ce site.' }); return }
    if (conflit) { setMsg({ alerte: `La salle est déjà prise de ${heure(conflit.debut)} à ${heure(conflit.fin)} (${conflit.intervention}).` }); return }
    setEnvoi(true)
    const { data, error } = await supabase.from('operations').insert({
      patient_id: patient.id, service_id: patient.service_id, site_id: siteId, salle_id: salleId,
      chirurgien_id: f.chirurgien_id || null, anesthesiste: f.anesthesiste.trim() || null, equipe: f.equipe.trim() || null,
      intervention: f.intervention.trim(), code_intervention: f.code, cote: f.cote || null, anesthesie: f.anesthesie, sejour: f.sejour,
      debut: debut.toISOString(), fin: fin.toISOString(), consignes_preop: f.consignes_preop.trim() || null, cree_par: profil.userId,
    }).select().single()
    setEnvoi(false)
    if (error) {
      setMsg({ alerte: error.code === '23P01' ? 'La salle est déjà occupée sur ce créneau. Choisissez une autre heure.' : messageErreur(error) })
      return
    }
    journaliser(profil, `Opération programmée : ${data.intervention} le ${dateHeure(data.debut)} (${sites.nom(siteId)})`, { patient_id: patient.id, service_id: patient.service_id })
    nav(`/medecin/bloc/${data.id}`)
  }

  return (
    <>
      <EnTeteOutil titre="Programmer une opération">
        Choisissez l'intervention dans la liste : anesthésie, durée et séjour se remplissent, et le livret « Mon opération » du patient s'adapte tout seul.
      </EnTeteOutil>
      <SelecteurPatient />

      <form onSubmit={programmer} className="carte-blanche" style={{ display: 'grid', gap: 18 }} noValidate>
        <section className="section-form" style={{ borderTop: 0, paddingTop: 0 }}>
          <h2>Intervention</h2>
          <div className="grille-champs">
            <Champ label="Liste des interventions" obligatoire>
              <select className="saisie" value={f.code} onChange={e => choisirIntervention(e.target.value)}>
                {INTERVENTIONS.map(i => <option key={i.code} value={i.code}>{i.nom}</option>)}
              </select>
            </Champ>
            <Saisie label="Libellé sur les documents" obligatoire valeur={f.intervention} onChange={maj('intervention')} placeholder="Nom précis de l'intervention" />
          </div>
          <p style={{ fontSize: 14, color: 'var(--texte)', maxWidth: '70ch' }}>{fiche.description}</p>
          <div className="grille-champs">
            <Champ label="Côté" obligatoire={fiche.cote}>
              <select className="saisie" value={f.cote} onChange={e => maj('cote')(e.target.value)}>
                <option value="">—</option>{COTES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Champ>
            <Champ label="Anesthésie">
              <select className="saisie" value={f.anesthesie} onChange={e => maj('anesthesie')(e.target.value)}>{ANESTHESIES.map(a => <option key={a}>{a}</option>)}</select>
            </Champ>
            <Champ label="Séjour">
              <select className="saisie" value={f.sejour} onChange={e => maj('sejour')(e.target.value)}>{SEJOURS.map(s => <option key={s}>{s}</option>)}</select>
            </Champ>
          </div>
        </section>

        <section className="section-form">
          <h2>Créneau et salle</h2>
          <div className="grille-champs">
            <CreneauOp debut={f.debut} duree={f.duree} setDebut={maj('debut')} setDuree={maj('duree')} />
            <Champ label="Site">
              <select className="saisie" value={siteId} onChange={e => setF(x => ({ ...x, site_id: e.target.value, salle_id: '' }))}>
                {sites.sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </Champ>
            <Champ label="Salle">
              <select className="saisie" value={salleId} onChange={e => maj('salle_id')(e.target.value)}>
                {!sallesSite.length && <option value="">Aucune salle</option>}
                {sallesSite.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </Champ>
          </div>
          {!isNaN(debut) && <div className="etiquette">Fin prévue {heure(fin)} · {occupe.length ? `déjà ${occupe.length} opération${occupe.length > 1 ? 's' : ''} ce jour dans cette salle : ${occupe.map(o => `${heure(o.debut)}–${heure(o.fin)}`).join(', ')}` : 'salle libre toute la journée'}</div>}
          <Message type="alerte">{conflit && `Chevauchement avec « ${conflit.intervention} » de ${heure(conflit.debut)} à ${heure(conflit.fin)}.`}</Message>
        </section>

        <section className="section-form">
          <h2>Équipe</h2>
          <div className="grille-champs">
            <Champ label="Chirurgien">
              <select className="saisie" value={f.chirurgien_id} onChange={e => maj('chirurgien_id')(e.target.value)}>
                {bloc.medecins.map(m => <option key={m.id} value={m.id}>{bloc.chirurgien(m.id)}</option>)}
              </select>
            </Champ>
            <Saisie label="Anesthésiste" placeholder="Dr …" valeur={f.anesthesiste} onChange={maj('anesthesiste')} />
            <Saisie label="Aides, IBODE, IADE" placeholder="Marin (infirmier), …" valeur={f.equipe} onChange={maj('equipe')} />
          </div>
        </section>

        <section className="section-form">
          <h2>Consignes pour le patient</h2>
          <ZoneTexte label="Consignes particulières avant l'opération (ajoutées au livret)" rows={3} valeur={f.consignes_preop} onChange={maj('consignes_preop')}
            placeholder="Arrêter tel médicament, apporter les radios, venir avec les deux parents…" />
        </section>

        <Message type="alerte">{msg.alerte}</Message>
        <div className="rangee-btn">
          <button type="submit" className="btn btn-plein" disabled={envoi || !patient}>{envoi ? 'Enregistrement…' : "Programmer l'opération"}</button>
          <button type="button" className="btn" disabled={!patient || isNaN(debut)} onClick={() => imprimerLivret({ op: brouillon(), patient, site: sites.parId(siteId), chirurgien: bloc.chirurgien(f.chirurgien_id) })}>Aperçu du livret</button>
        </div>
      </form>
    </>
  )
}
