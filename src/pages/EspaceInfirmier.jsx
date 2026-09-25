import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EnTeteEspace from '../components/EnTeteEspace.jsx'
import { BadgeSejour, Champ, ChampDate, Message, SelecteurPatient, Vide } from '../components/ui.jsx'
import { useAuth } from '../lib/auth.jsx'
import { PatientsProvider, usePatients } from '../lib/patients.jsx'
import { supabase, journaliser, messageErreur } from '../lib/supabase.js'
import { dateHeure, nombre, nomComplet, valeurDateHeure } from '../lib/format.js'

const VIDE = { temperature: '', pouls: '', tension_systolique: '', tension_diastolique: '', saturation: '', poids: '', notes: '' }
const num = v => (v === '' ? null : Number(String(v).replace(',', '.')))

/** Heure saisie → ISO, refusée si vide ou dans le futur (5 min de marge). */
function horodatage(v) {
  const x = new Date(v)
  if (!v || isNaN(x)) return { erreur: "Indiquez la date et l'heure." }
  if (x.getTime() > Date.now() + 5 * 60 * 1000) return { erreur: "L'heure ne peut pas être dans le futur." }
  return { iso: x.toISOString() }
}

function Soins() {
  const { profil } = useAuth()
  const { patient } = usePatients()
  const [c, setC] = useState(VIDE)
  const [med, setMed] = useState({ medicament: '', notes: '' })
  const [quandReleve, setQuandReleve] = useState(valeurDateHeure)
  const [quandMed, setQuandMed] = useState(valeurDateHeure)
  const [releves, setReleves] = useState([])
  const [msg, setMsg] = useState({})
  const role = profil.infirmier ? 'infirmier' : 'medecin'
  const maj = k => e => setC(x => ({ ...x, [k]: e.target.value }))

  const charger = useCallback(async () => {
    if (!patient) return
    const { data } = await supabase.from('constantes_vitales').select('*').eq('patient_id', patient.id).order('date_mesure', { ascending: false }).limit(10)
    setReleves(data || [])
  }, [patient])
  useEffect(() => { charger(); setMsg({}) }, [charger])

  const valider = async e => {
    e.preventDefault()
    const valeurs = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, k === 'notes' ? v || null : num(v)]))
    if (Object.entries(valeurs).some(([k, v]) => k !== 'notes' && v !== null && isNaN(v))) { setMsg({ alerte: 'Saisissez des nombres (ex. 37,4).' }); return }
    if (Object.values(valeurs).every(v => v === null)) { setMsg({ alerte: 'Renseignez au moins une constante.' }); return }
    const h = horodatage(quandReleve)
    if (h.erreur) { setMsg({ alerte: h.erreur }); return }
    const { error } = await supabase.from('constantes_vitales').insert({ ...valeurs, date_mesure: h.iso, patient_id: patient.id, service_id: patient.service_id, releve_par: profil.userId, role_releveur: role })
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser({ ...profil, role }, 'Constantes vitales enregistrées', { patient_id: patient.id, service_id: patient.service_id })
    setC(VIDE); setQuandReleve(valeurDateHeure()); setMsg({ succes: 'Prise validée et enregistrée au dossier.' }); charger()
  }

  const administrer = async e => {
    e.preventDefault()
    if (!med.medicament.trim()) return
    const h = horodatage(quandMed)
    if (h.erreur) { setMsg({ alerte: h.erreur }); return }
    const { error } = await supabase.from('administrations_medicament').insert({ medicament: med.medicament.trim(), notes: med.notes || null, heure_administration: h.iso, patient_id: patient.id, service_id: patient.service_id, administre_par: profil.userId, role_administrant: role })
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser({ ...profil, role }, `Médicament administré : ${med.medicament.trim()}`, { patient_id: patient.id, service_id: patient.service_id })
    setMed({ medicament: '', notes: '' }); setQuandMed(valeurDateHeure()); setMsg({ succes: 'Administration consignée.' })
  }

  const champ = (k, l) => <Champ label={l}><input className="saisie mono" inputMode="decimal" value={c[k]} onChange={maj(k)} style={{ fontSize: 16 }} /></Champ>

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(18px,3vw,32px) 20px 72px', display: 'grid', gap: 22 }}>
      <div><h1 className="titre-outil">Soins</h1><p className="intro">Saisissez les constantes et consignez chaque médicament donné. On vérifie toujours le nom du patient à voix haute avant un soin.</p></div>
      <SelecteurPatient>{patient && <BadgeSejour sejour={patient.sejour} />}</SelecteurPatient>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>
      {patient && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20, alignItems: 'start' }}>
          <form onSubmit={valider} style={{ border: '1px solid var(--filet)', background: '#fff', padding: 16, display: 'grid', gap: 12 }}>
            <div className="etiquette">Saisie des constantes</div>
            <ChampDate type="datetime-local" label="Date et heure du relevé" valeur={quandReleve} onChange={setQuandReleve} max={valeurDateHeure()} required />
            <div className="grille-champs" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
              {champ('temperature', 'Température (°C)')}{champ('pouls', 'Fréquence cardiaque')}
              {champ('tension_systolique', 'TA systolique')}{champ('tension_diastolique', 'TA diastolique')}
              {champ('saturation', 'Saturation (%)')}{champ('poids', 'Poids (kg)')}
            </div>
            <Champ label="Observations"><textarea className="saisie" rows={2} value={c.notes} onChange={maj('notes')} /></Champ>
            <button type="submit" className="btn btn-plein btn-bloc">Valider la prise</button>
          </form>

          <div style={{ display: 'grid', gap: 20 }}>
            <form onSubmit={administrer} style={{ border: '1px solid var(--filet)', background: '#fff', padding: 16, display: 'grid', gap: 12 }}>
              <div className="etiquette">Administration de médicament</div>
              <Champ label="Médicament et dose"><input className="saisie" value={med.medicament} onChange={e => setMed(m => ({ ...m, medicament: e.target.value }))} placeholder="Doliprane 500 mg" /></Champ>
              <ChampDate type="datetime-local" label="Date et heure d'administration" valeur={quandMed} onChange={setQuandMed} max={valeurDateHeure()} required />
              <Champ label="Notes"><input className="saisie" value={med.notes} onChange={e => setMed(m => ({ ...m, notes: e.target.value }))} placeholder="Après le repas" /></Champ>
              <button type="submit" className="btn">Consigner l'administration</button>
            </form>
            <div style={{ display: 'grid', gap: 8 }}>
              <div className="etiquette">Derniers relevés</div>
              {!releves.length ? <Vide>Aucune constante relevée pour ce patient.</Vide> : releves.map(r => (
                <div key={r.id} className="ligne-liste" style={{ display: 'grid', gap: 6 }}>
                  <span className="etiquette">{dateHeure(r.date_mesure)}</span>
                  <span className="mono" style={{ fontSize: 13.5, color: 'var(--encre)' }}>T° {nombre(r.temperature)} · FC {nombre(r.pouls)} · TA {r.tension_systolique ? `${r.tension_systolique}/${r.tension_diastolique ?? ''}` : '—'} · SpO₂ {nombre(r.saturation)}</span>
                  {r.notes && <span style={{ fontSize: 14, color: 'var(--texte)' }}>{r.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function EspaceInfirmier() {
  const { profil } = useAuth()
  const moi = profil.infirmier || profil.medecin
  return (
    <div style={{ minHeight: '100vh', background: 'var(--papier)' }}>
      <EnTeteEspace titre="Espace infirmier" qui={(moi?.prenom || nomComplet(moi)).toUpperCase()}
        liens={profil.medecin && <Link to="/medecin" style={{ color: 'var(--bleu-pale)', fontSize: 14 }}>Espace médecin →</Link>} />
      <PatientsProvider><Soins /></PatientsProvider>
    </div>
  )
}
