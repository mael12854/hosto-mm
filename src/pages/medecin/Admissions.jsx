import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeSejour, Champ, ChampDate, EnTeteOutil, Message, Saisie, Vide } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase, journaliser, messageErreur } from '../../lib/supabase.js'
import { dateHeure, statut, valeurDateHeure } from '../../lib/format.js'

const TRIAGE = [
  [1, 'P1 — Urgence vitale'], [2, 'P2 — Très urgent'], [3, 'P3 — À surveiller'], [4, 'P4 — Peu urgent'], [5, 'P5 — Non urgent'],
]
const NOUVEAU = { prenom: '', nom: '', date_naissance: '', sexe: '', groupe_sanguin: '', allergies: '' }

/** Accord selon le sexe : « entrée », « entré », ou « entré(e) » si inconnu. */
const accord = (mot, sexe) => mot + (sexe === 'F' ? 'e' : sexe === 'M' ? '' : '(e)')

/** Séjour en cours : entré, pas encore sorti. */
const hospitalise = p => p.sejour && statut(p.sejour).cle !== 'sorti'

/** Prochain numéro de dossier « aaaa-nnnn » d'après les dossiers visibles. */
function prochainNumero(patients, decalage = 0) {
  const annee = new Date().getFullYear()
  const max = patients.map(p => String(p.numero_dossier || '').match(new RegExp(`^${annee}-(\\d+)$`)))
    .filter(Boolean).reduce((m, x) => Math.max(m, Number(x[1])), 0)
  return `${annee}-${String(max + 1 + decalage).padStart(4, '0')}`
}

function Entrer({ services, lits, onFait }) {
  const { profil } = useAuth()
  const { patients } = usePatients()
  const [mode, setMode] = useState('existant')
  const [patientId, setPatientId] = useState('')
  const [nouveau, setNouveau] = useState(NOUVEAU)
  const [sejour, setSejour] = useState({ date_entree: valeurDateHeure(), service_id: '', motif: '', niveau_urgence: 4, lit_id: '' })
  const [msg, setMsg] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const majN = k => v => setNouveau(x => ({ ...x, [k]: v }))
  const majS = k => v => setSejour(x => ({ ...x, [k]: v }))

  const sortis = useMemo(() => patients.filter(p => !hospitalise(p)), [patients])
  const choisi = sortis.find(p => p.id === patientId)
  // Service par défaut : celui du patient choisi, sinon les Urgences, sinon le premier de mes services.
  const serviceId = sejour.service_id || choisi?.service_id || (services.find(s => s.nom === 'Urgences') || services[0])?.id || ''
  const litsLibres = lits.filter(l => l.service_id === serviceId && !l.patient_id)

  const faireEntrer = async e => {
    e.preventDefault()
    setMsg({})
    if (mode === 'existant' && !choisi) { setMsg({ alerte: 'Choisissez le patient à faire entrer.' }); return }
    if (mode === 'nouveau' && (!nouveau.prenom.trim() || !nouveau.nom.trim())) { setMsg({ alerte: 'Indiquez au moins le prénom et le nom du nouveau patient.' }); return }
    const entree = new Date(sejour.date_entree)
    if (!sejour.date_entree || isNaN(entree)) { setMsg({ alerte: "Indiquez la date et l'heure d'entrée." }); return }
    if (!serviceId) { setMsg({ alerte: 'Choisissez un service.' }); return }
    setEnvoi(true)
    try {
      let patient = choisi
      if (mode === 'nouveau') {
        // Numéro de dossier suivant ; on réessaie si un autre service l'a déjà pris.
        for (let essai = 0; essai < 5 && !patient; essai++) {
          const { data, error } = await supabase.from('patients').insert({
            prenom: nouveau.prenom.trim(), nom: nouveau.nom.trim().toUpperCase(), date_naissance: nouveau.date_naissance || null,
            sexe: nouveau.sexe || null, groupe_sanguin: nouveau.groupe_sanguin.trim() || null, allergies: nouveau.allergies.trim() || null,
            service_id: serviceId, numero_dossier: prochainNumero(patients, essai),
          }).select().single()
          if (error && error.code !== '23505') throw error
          patient = data
        }
        if (!patient) throw new Error('Impossible d\'attribuer un numéro de dossier. Réessayez.')
      } else if (patient.service_id !== serviceId) {
        const { error } = await supabase.from('patients').update({ service_id: serviceId }).eq('id', patient.id)
        if (error) throw error
      }
      const { error } = await supabase.from('hospitalisations').insert({
        patient_id: patient.id, service_id: serviceId, medecin_id: profil.userId,
        date_entree: entree.toISOString(), motif: sejour.motif.trim() || null, niveau_urgence: Number(sejour.niveau_urgence),
      })
      if (error) throw error
      const lit = litsLibres.find(l => l.id === sejour.lit_id)
      if (lit) await supabase.from('lits').update({ patient_id: patient.id }).eq('id', lit.id)
      const nom = `${patient.prenom} ${patient.nom}`
      journaliser(profil, `Entrée : ${nom} (triage P${sejour.niveau_urgence})${lit ? `, lit ${lit.identifiant}` : ''}`, { patient_id: patient.id, service_id: serviceId })
      setMsg({ succes: `${nom} est ${accord('entré', patient.sexe)} le ${dateHeure(entree)}${mode === 'nouveau' ? ` — dossier ${patient.numero_dossier}` : ''}${lit ? `, lit ${lit.identifiant}` : ''}.` })
      setPatientId(''); setNouveau(NOUVEAU); setSejour({ date_entree: valeurDateHeure(), service_id: '', motif: '', niveau_urgence: 4, lit_id: '' })
      onFait()
    } catch (err) {
      setMsg({ alerte: messageErreur(err) })
    }
    setEnvoi(false)
  }

  return (
    <form onSubmit={faireEntrer} className="carte-blanche" style={{ display: 'grid', gap: 16, borderTop: '3px solid var(--bleu)' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--encre)' }}>Faire entrer</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[['existant', 'Patient connu'], ['nouveau', 'Nouveau patient']].map(([k, l]) => (
          <button key={k} type="button" className={'btn-puce' + (mode === k ? ' actif' : '')} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>

      {mode === 'existant' ? (
        <Champ label="Patient">
          <select className="saisie" value={patientId} onChange={e => { setPatientId(e.target.value); majS('service_id')('') }}>
            <option value="">{sortis.length ? 'Choisir un patient…' : 'Tous vos patients sont déjà hospitalisés'}</option>
            {sortis.map(p => <option key={p.id} value={p.id}>{p.nomComplet} — {p.numero_dossier}</option>)}
          </select>
        </Champ>
      ) : (
        <div className="grille-champs">
          <Saisie label="Prénom" valeur={nouveau.prenom} onChange={majN('prenom')} />
          <Saisie label="Nom" valeur={nouveau.nom} onChange={majN('nom')} />
          <ChampDate label="Date de naissance" valeur={nouveau.date_naissance} onChange={majN('date_naissance')} max={valeurDateHeure().slice(0, 10)} />
          <Champ label="Sexe">
            <select className="saisie" value={nouveau.sexe} onChange={e => majN('sexe')(e.target.value)}>
              <option value="">—</option><option value="F">Féminin</option><option value="M">Masculin</option>
            </select>
          </Champ>
          <Saisie label="Groupe sanguin" mono placeholder="A+" valeur={nouveau.groupe_sanguin} onChange={majN('groupe_sanguin')} />
          <Saisie label="Allergies" placeholder="Aucune" valeur={nouveau.allergies} onChange={majN('allergies')} />
        </div>
      )}

      <div className="grille-champs">
        <ChampDate type="datetime-local" label="Date et heure d'entrée" valeur={sejour.date_entree} onChange={majS('date_entree')} required />
        <Champ label="Service">
          <select className="saisie" value={serviceId} onChange={e => setSejour(x => ({ ...x, service_id: e.target.value, lit_id: '' }))}>
            {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </Champ>
        <Champ label="Triage">
          <select className="saisie" value={sejour.niveau_urgence} onChange={e => majS('niveau_urgence')(e.target.value)}>
            {TRIAGE.map(([n, l]) => <option key={n} value={n}>{l}</option>)}
          </select>
        </Champ>
        <Champ label="Lit (facultatif)">
          <select className="saisie" value={sejour.lit_id} onChange={e => majS('lit_id')(e.target.value)}>
            <option value="">{litsLibres.length ? 'Sans lit' : 'Aucun lit libre'}</option>
            {litsLibres.map(l => <option key={l.id} value={l.id}>{l.identifiant}</option>)}
          </select>
        </Champ>
      </div>
      <Saisie label="Motif d'entrée" placeholder="Chute à vélo, fièvre, douleur au ventre…" valeur={sejour.motif} onChange={majS('motif')} />

      <div className="rangee-btn">
        <button type="submit" className="btn btn-plein" disabled={envoi || !services.length}>{envoi ? 'Enregistrement…' : 'Faire entrer'}</button>
      </div>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>
    </form>
  )
}

function Sortir({ lits, onFait }) {
  const { profil } = useAuth()
  const { patients, choisir } = usePatients()
  const [quand, setQuand] = useState({})
  const [msg, setMsg] = useState({})
  const presents = patients.filter(hospitalise)

  const faireSortir = async p => {
    const v = quand[p.id] || valeurDateHeure()
    const sortie = new Date(v)
    if (isNaN(sortie)) { setMsg({ alerte: "Indiquez la date et l'heure de sortie." }); return }
    if (sortie < new Date(p.sejour.date_entree)) { setMsg({ alerte: "La sortie ne peut pas précéder l'entrée." }); return }
    const { error } = await supabase.from('hospitalisations').update({ date_sortie: sortie.toISOString() }).eq('id', p.sejour.id)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    const sesLits = lits.filter(l => l.patient_id === p.id)
    for (const l of sesLits) await supabase.from('lits').update({ patient_id: null }).eq('id', l.id)
    journaliser(profil, `Sortie : ${p.nomComplet}${sesLits.length ? `, lit ${sesLits.map(l => l.identifiant).join(', ')} libéré` : ''}`, { patient_id: p.id, service_id: p.sejour.service_id })
    setMsg({ succes: `${p.nomComplet} est ${accord('sorti', p.sexe)} le ${dateHeure(sortie)}${sesLits.length ? ` — lit ${sesLits.map(l => l.identifiant).join(', ')} libéré` : ''}.` })
    onFait()
  }

  return (
    <div className="carte-blanche" style={{ display: 'grid', gap: 14, borderTop: '3px solid var(--anthracite)', alignContent: 'start' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--encre)' }}>Faire sortir</div>
        <span className="etiquette">{presents.length} hospitalisé{presents.length > 1 ? 's' : ''}</span>
      </div>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>
      {!presents.length ? <Vide>Aucun patient hospitalisé dans vos services.</Vide> : presents.map(p => {
        const lit = lits.find(l => l.patient_id === p.id)
        return (
          <div key={p.id} style={{ border: '1px solid var(--filet)', padding: 14, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--encre)' }}>{p.nomComplet}</div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--gris)' }}>
                  ENTRÉE {dateHeure(p.sejour.date_entree)} · {p.service.toUpperCase()}{lit ? ` · LIT ${lit.identifiant}` : ''}
                </div>
                {p.sejour.motif && <div style={{ fontSize: 14, color: 'var(--texte)', marginTop: 2 }}>{p.sejour.motif}</div>}
              </div>
              <BadgeSejour sejour={p.sejour} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 210px' }}>
                <ChampDate type="datetime-local" label="Date et heure de sortie" valeur={quand[p.id] ?? valeurDateHeure()} onChange={v => setQuand(q => ({ ...q, [p.id]: v }))} />
              </div>
              <button type="button" className="btn" onClick={() => faireSortir(p)}>Faire sortir</button>
            </div>
            <Link to="/medecin/entree-sortie" className="btn-lien bleu" style={{ justifySelf: 'start' }} onClick={() => choisir(p.id)}>RÉDIGER LE BULLETIN DE SORTIE (FACULTATIF) →</Link>
          </div>
        )
      })}
    </div>
  )
}

export default function Admissions() {
  const { profil } = useAuth()
  const { charger: rechargerPatients } = usePatients()
  const [services, setServices] = useState([])
  const [lits, setLits] = useState([])

  const charger = useCallback(async () => {
    const [s, l] = await Promise.all([
      supabase.from('medecin_services').select('services(id, nom)').eq('medecin_id', profil.userId),
      supabase.from('lits').select('*').order('identifiant'),
    ])
    setServices((s.data || []).map(x => x.services).filter(Boolean).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))
    setLits(l.data || [])
  }, [profil.userId])
  useEffect(() => { charger() }, [charger])

  const apres = () => { rechargerPatients(); charger() }

  return (
    <>
      <EnTeteOutil titre="Admissions">
        Faites entrer ou sortir un patient en quelques secondes, sans rédiger de bulletin. Le séjour, le lit et le journal sont mis à jour. Le bulletin Entrée / Sortie reste disponible pour le document officiel.
      </EnTeteOutil>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 20, alignItems: 'start' }}>
        <Entrer services={services} lits={lits} onFait={apres} />
        <Sortir lits={lits} onFait={apres} />
      </div>
    </>
  )
}
