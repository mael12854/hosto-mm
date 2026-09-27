import { useCallback, useEffect, useState } from 'react'
import Courbe from './Courbe.jsx'
import { Chargement, ChampDate, Message, Saisie, Vide } from './ui.jsx'
import { supabase, journaliser, messageErreur } from '../lib/supabase.js'
import { date, nombre, valeurDate } from '../lib/format.js'
import { imprimerCarnet } from '../lib/carnet.js'

// Calendrier vaccinal français (suggestions).
const VACCINS = [
  'DTCaP-Hib-HépB (hexavalent)', 'Pneumocoque', 'Méningocoque C', 'Méningocoque B', 'ROR (rougeole-oreillons-rubéole)',
  'Rotavirus', 'DTCaP (rappel)', 'dTcaP (rappel)', 'HPV (papillomavirus)', 'Grippe', 'COVID-19', 'Hépatite B', 'BCG', 'Tétanos (rappel)',
]
const num = v => (v === '' || v == null ? null : Number(String(v).replace(',', '.')))

function age(naissance, a = new Date()) {
  if (!naissance) return ''
  const n = new Date(naissance + 'T12:00:00')
  let mois = (a.getFullYear() - n.getFullYear()) * 12 + a.getMonth() - n.getMonth()
  if (a.getDate() < n.getDate()) mois--
  if (mois < 24) return `${mois} mois`
  return `${Math.floor(mois / 12)} ans`
}

/** Carnet de santé : croissance (taille, poids) et vaccinations. editable : saisie par le personnel. */
export default function CarnetSante({ patient, editable = false, profil }) {
  const [mesures, setMesures] = useState(null)
  const [vaccins, setVaccins] = useState([])
  const [m, setM] = useState({ date_mesure: valeurDate(), taille_cm: '', poids_kg: '', perimetre_cranien_cm: '' })
  const [v, setV] = useState({ vaccin: '', date_vaccination: valeurDate(), dose: '', lot: '' })
  const [msg, setMsg] = useState({})

  const charger = useCallback(async () => {
    if (!patient) return
    const [a, b] = await Promise.all([
      supabase.from('mesures_croissance').select('*').eq('patient_id', patient.id).order('date_mesure'),
      supabase.from('vaccinations').select('*').eq('patient_id', patient.id).order('date_vaccination', { ascending: false }),
    ])
    if (a.error) setMsg({ alerte: messageErreur(a.error) })
    setMesures(a.data || []); setVaccins(b.data || [])
  }, [patient])
  useEffect(() => { setMesures(null); charger() }, [charger])

  const ajouterMesure = async e => {
    e.preventDefault()
    const champs = { taille_cm: num(m.taille_cm), poids_kg: num(m.poids_kg), perimetre_cranien_cm: num(m.perimetre_cranien_cm) }
    if (Object.values(champs).every(x => x == null)) { setMsg({ alerte: 'Renseignez au moins la taille ou le poids.' }); return }
    if (Object.values(champs).some(x => x != null && isNaN(x))) { setMsg({ alerte: 'Saisissez des nombres (ex. 112,5).' }); return }
    const { error } = await supabase.from('mesures_croissance').insert({ ...champs, date_mesure: m.date_mesure, patient_id: patient.id, service_id: patient.service_id })
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser(profil, 'Mesure de croissance enregistrée', { patient_id: patient.id, service_id: patient.service_id })
    setM({ date_mesure: valeurDate(), taille_cm: '', poids_kg: '', perimetre_cranien_cm: '' })
    setMsg({ succes: 'Mesure ajoutée au carnet.' }); charger()
  }

  const ajouterVaccin = async e => {
    e.preventDefault()
    if (!v.vaccin.trim()) return
    const { error } = await supabase.from('vaccinations').insert({ vaccin: v.vaccin.trim(), date_vaccination: v.date_vaccination, dose: v.dose.trim() || null, lot: v.lot.trim() || null, patient_id: patient.id, service_id: patient.service_id })
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser(profil, `Vaccin : ${v.vaccin.trim()}`, { patient_id: patient.id, service_id: patient.service_id })
    setV({ vaccin: '', date_vaccination: valeurDate(), dose: '', lot: '' })
    setMsg({ succes: 'Vaccination ajoutée au carnet.' }); charger()
  }

  const supprimer = async (table, id) => {
    if (!window.confirm('Supprimer cette ligne du carnet ?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    charger()
  }

  if (mesures === null) return <Chargement />
  const derniere = [...mesures].reverse()
  const imc = (() => { const d = derniere.find(x => x.taille_cm && x.poids_kg); return d ? d.poids_kg / (d.taille_cm / 100) ** 2 : null })()

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="rangee-btn">
        <button type="button" className="btn" onClick={() => imprimerCarnet(patient)}>Imprimer le carnet de santé</button>
        <span style={{ fontSize: 13.5, color: 'var(--gris)', alignSelf: 'center' }}>Carnet type A5 à remplir à la main : seule l'identité du patient est pré-remplie.</span>
      </div>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 1, background: 'var(--filet)', border: '1px solid var(--filet)' }}>
        {[
          ['Âge', age(patient.date_naissance) || '—'],
          ['Taille', derniere.find(x => x.taille_cm) ? `${nombre(derniere.find(x => x.taille_cm).taille_cm)} cm` : '—'],
          ['Poids', derniere.find(x => x.poids_kg) ? `${nombre(derniere.find(x => x.poids_kg).poids_kg)} kg` : '—'],
          ['IMC', imc ? nombre(imc.toFixed(1)) : '—'],
          ['Vaccins', vaccins.length],
        ].map(([k, val]) => (
          <div key={k} style={{ background: 'var(--papier)', padding: '14px 16px' }}>
            <div className="etiquette">{k}</div>
            <div className="mono" style={{ fontSize: 20, color: 'var(--encre)' }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16 }}>
        <Courbe titre="Courbe de taille" unite="cm" jours decimales={1} series={[{ nom: 'Taille', points: mesures.map(x => ({ t: x.date_mesure + 'T12:00:00', v: x.taille_cm })) }]} />
        <Courbe titre="Courbe de poids" unite="kg" jours decimales={1} series={[{ nom: 'Poids', points: mesures.map(x => ({ t: x.date_mesure + 'T12:00:00', v: x.poids_kg })) }]} />
      </div>

      {editable && (
        <form onSubmit={ajouterMesure} className="carte-blanche" style={{ display: 'grid', gap: 12 }}>
          <div className="etiquette">Nouvelle mesure de croissance</div>
          <div className="grille-champs">
            <ChampDate label="Date" valeur={m.date_mesure} onChange={x => setM(y => ({ ...y, date_mesure: x }))} max={valeurDate()} required />
            <Saisie label="Taille (cm)" mono inputMode="decimal" valeur={m.taille_cm} onChange={x => setM(y => ({ ...y, taille_cm: x }))} />
            <Saisie label="Poids (kg)" mono inputMode="decimal" valeur={m.poids_kg} onChange={x => setM(y => ({ ...y, poids_kg: x }))} />
            <Saisie label="Périmètre crânien (cm)" mono inputMode="decimal" valeur={m.perimetre_cranien_cm} onChange={x => setM(y => ({ ...y, perimetre_cranien_cm: x }))} />
          </div>
          <div className="rangee-btn"><button type="submit" className="btn">Ajouter la mesure</button></div>
        </form>
      )}

      <section style={{ display: 'grid', gap: 10 }}>
        <div className="etiquette">Vaccinations · {vaccins.length}</div>
        {!vaccins.length ? <Vide>Aucune vaccination enregistrée.</Vide> : (
          <div className="defile-x">
            <table className="tableau">
              <thead><tr><th>Date</th><th>Vaccin</th><th>Dose</th><th>Lot</th>{editable && <th />}</tr></thead>
              <tbody>
                {vaccins.map(x => (
                  <tr key={x.id}>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>{date(x.date_vaccination)}</td>
                    <td>{x.vaccin}</td><td>{x.dose || '—'}</td><td className="mono">{x.lot || '—'}</td>
                    {editable && <td><button type="button" className="btn-lien" onClick={() => supprimer('vaccinations', x.id)}>RETIRER</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {editable && (
          <form onSubmit={ajouterVaccin} className="carte-blanche" style={{ display: 'grid', gap: 12 }}>
            <div className="etiquette">Nouvelle vaccination</div>
            <div className="grille-champs">
              <label className="champ" style={{ gridColumn: 'span 2' }}>
                <span>Vaccin</span>
                <input className="saisie" list="vaccins-fr" required value={v.vaccin} onChange={e => setV(y => ({ ...y, vaccin: e.target.value }))} placeholder="ROR, grippe, rappel tétanos…" />
                <datalist id="vaccins-fr">{VACCINS.map(x => <option key={x} value={x} />)}</datalist>
              </label>
              <ChampDate label="Date" valeur={v.date_vaccination} onChange={x => setV(y => ({ ...y, date_vaccination: x }))} max={valeurDate()} required />
              <Saisie label="Dose" placeholder="1re dose, rappel…" valeur={v.dose} onChange={x => setV(y => ({ ...y, dose: x }))} />
              <Saisie label="N° de lot" mono valeur={v.lot} onChange={x => setV(y => ({ ...y, lot: x }))} />
            </div>
            <div className="rangee-btn"><button type="submit" className="btn">Ajouter la vaccination</button></div>
          </form>
        )}
      </section>

      {editable && mesures.length > 0 && (
        <details>
          <summary className="etiquette" style={{ cursor: 'pointer' }}>Corriger les mesures enregistrées</summary>
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {derniere.map(x => (
              <div key={x.id} className="ligne-liste">
                <span className="mono" style={{ fontSize: 13 }}>{date(x.date_mesure)} · {x.taille_cm ? `${nombre(x.taille_cm)} cm` : '—'} · {x.poids_kg ? `${nombre(x.poids_kg)} kg` : '—'}</span>
                <button type="button" className="btn-lien" onClick={() => supprimer('mesures_croissance', x.id)}>RETIRER</button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
