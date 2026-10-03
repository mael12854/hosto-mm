import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionContact, SectionCoordonnees, nettoyer, verifierCoordonnees } from '../../components/ChampsCoordonnees.jsx'
import { Champ, ChampDate, EnTeteOutil, Message, Saisie, ZoneTexte } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { creerDossier, usePatients } from '../../lib/patients.jsx'
import { supabase, journaliser, messageErreur } from '../../lib/supabase.js'
import { valeurDate } from '../../lib/format.js'

const GROUPES_SANGUINS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']
const VIDE = {
  prenom: '', nom: '', date_naissance: '', lieu_naissance: '', sexe: '',
  adresse: '', complement_adresse: '', code_postal: '', ville: '', telephone: '', email: '',
  contact_urgence_nom: '', contact_urgence_lien: '', contact_urgence_telephone: '',
  groupe_sanguin: '', allergies: '', antecedents: '', traitement_en_cours: '', medecin_traitant: '',
  service_id: '', num_chambre: '',
}

export default function NouveauPatient() {
  const { profil } = useAuth()
  const { patients, charger, choisir } = usePatients()
  const [f, setF] = useState(VIDE)
  const [services, setServices] = useState([])
  const [msg, setMsg] = useState({})
  const [cree, setCree] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const maj = k => v => setF(x => ({ ...x, [k]: v }))

  useEffect(() => {
    supabase.from('medecin_services').select('services(id, nom)').eq('medecin_id', profil.userId).then(({ data }) => {
      const liste = (data || []).map(x => x.services).filter(Boolean).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
      setServices(liste)
      setF(x => ({ ...x, service_id: x.service_id || (liste.find(s => s.nom === 'Urgences') || liste[0])?.id || '' }))
    })
  }, [profil.userId])

  // Même personne déjà connue ? (prénom + nom + date de naissance)
  const doublon = f.prenom.trim() && f.nom.trim() && patients.find(p =>
    p.prenom?.toLowerCase() === f.prenom.trim().toLowerCase() && p.nom?.toLowerCase() === f.nom.trim().toLowerCase()
    && (!f.date_naissance || !p.date_naissance || p.date_naissance === f.date_naissance))

  const enregistrer = async e => {
    e.preventDefault()
    setMsg({})
    if (!f.prenom.trim() || !f.nom.trim()) { setMsg({ alerte: 'Indiquez au moins le prénom et le nom.' }); return }
    if (!f.service_id) { setMsg({ alerte: 'Choisissez le service de rattachement.' }); return }
    const invalide = verifierCoordonnees(f)
    if (invalide) { setMsg({ alerte: invalide }); return }
    setEnvoi(true)
    try {
      const champs = nettoyer(f)
      champs.nom = champs.nom.toUpperCase()
      const patient = await creerDossier(patients, champs)
      journaliser(profil, `Dossier créé : ${patient.prenom} ${patient.nom} (${patient.numero_dossier})`, { patient_id: patient.id, service_id: patient.service_id })
      await charger()
      choisir(patient.id)
      setCree(patient)
      setF({ ...VIDE, service_id: f.service_id })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setMsg({ alerte: messageErreur(err) })
    }
    setEnvoi(false)
  }

  return (
    <>
      <EnTeteOutil titre="Nouveau patient">
        Créez un dossier complet : identité, coordonnées, personne à prévenir et informations médicales. Le numéro de dossier et l'IPP sont attribués automatiquement.
      </EnTeteOutil>

      {cree && (
        <div className="carte" style={{ borderLeft: '4px solid var(--vert)', display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--encre)' }}>Dossier de {cree.prenom} {cree.nom} créé</div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--gris)' }}>DOSSIER {cree.numero_dossier} · IPP {cree.ipp || '—'}</div>
          <div className="rangee-btn">
            <Link to="/medecin/dossier" className="btn">Ouvrir le dossier</Link>
            <Link to="/medecin/admissions" className="btn">Faire entrer</Link>
            <Link to="/medecin/bracelets" className="btn">Imprimer le bracelet</Link>
          </div>
        </div>
      )}

      <form onSubmit={enregistrer} className="carte-blanche" style={{ display: 'grid', gap: 18 }} noValidate>
        <section className="section-form" style={{ borderTop: 0, paddingTop: 0 }}>
          <h2>Identité</h2>
          <div className="grille-champs">
            <Saisie label="Prénom" obligatoire valeur={f.prenom} onChange={maj('prenom')} autoComplete="off" />
            <Saisie label="Nom" obligatoire valeur={f.nom} onChange={maj('nom')} autoComplete="off" />
            <ChampDate label="Date de naissance" valeur={f.date_naissance} onChange={maj('date_naissance')} max={valeurDate()} />
            <Saisie label="Lieu de naissance" placeholder="Ville" valeur={f.lieu_naissance} onChange={maj('lieu_naissance')} />
            <Champ label="Sexe">
              <select className="saisie" value={f.sexe} onChange={e => maj('sexe')(e.target.value)}>
                <option value="">—</option><option value="F">Féminin</option><option value="M">Masculin</option>
              </select>
            </Champ>
          </div>
          {doublon && (
            <Message type="alerte">
              Un dossier existe peut-être déjà : {doublon.nomComplet} ({doublon.numero_dossier}).{' '}
              <Link to="/medecin/dossier" className="btn-lien bleu" onClick={() => choisir(doublon.id)}>VOIR CE DOSSIER →</Link>
            </Message>
          )}
        </section>

        <section className="section-form">
          <h2>Coordonnées</h2>
          <SectionCoordonnees f={f} maj={maj} setF={setF} />
        </section>

        <section className="section-form">
          <h2>Personne à prévenir</h2>
          <SectionContact f={f} maj={maj} />
        </section>

        <section className="section-form">
          <h2>Informations médicales</h2>
          <div className="grille-champs">
            <Champ label="Groupe sanguin">
              <select className="saisie mono" value={f.groupe_sanguin} onChange={e => maj('groupe_sanguin')(e.target.value)}>
                <option value="">Inconnu</option>{GROUPES_SANGUINS.map(g => <option key={g} value={g.replace('−', '-')}>{g}</option>)}
              </select>
            </Champ>
            <Saisie label="Médecin traitant" placeholder="Dr …" valeur={f.medecin_traitant} onChange={maj('medecin_traitant')} />
          </div>
          <Saisie label="Allergies" placeholder="Aucune connue" valeur={f.allergies} onChange={maj('allergies')} />
          <ZoneTexte label="Antécédents médicaux et chirurgicaux" rows={2} valeur={f.antecedents} onChange={maj('antecedents')} />
          <ZoneTexte label="Traitement en cours" rows={2} placeholder="Médicaments pris régulièrement" valeur={f.traitement_en_cours} onChange={maj('traitement_en_cours')} />
        </section>

        <section className="section-form">
          <h2>Rattachement</h2>
          <div className="grille-champs">
            <Champ label="Service" obligatoire>
              <select className="saisie" value={f.service_id} onChange={e => maj('service_id')(e.target.value)}>
                {!services.length && <option value="">Aucun service</option>}
                {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </Champ>
            <Saisie label="Chambre (facultatif)" valeur={f.num_chambre} onChange={maj('num_chambre')} />
          </div>
        </section>

        <Message type="alerte">{msg.alerte}</Message>
        <div className="rangee-btn">
          <button type="submit" className="btn btn-plein" disabled={envoi || !services.length}>{envoi ? 'Création…' : 'Créer le dossier'}</button>
          <button type="button" className="btn" onClick={() => { setF({ ...VIDE, service_id: f.service_id }); setMsg({}) }}>Effacer</button>
        </div>
      </form>
    </>
  )
}
