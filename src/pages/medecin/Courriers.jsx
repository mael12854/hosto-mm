import { useEffect, useMemo, useRef, useState } from 'react'
import { Champ, EnTeteOutil, Message, Saisie, SelecteurPatient, ZoneTexte } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { useSites } from '../../lib/sites.jsx'
import { supabase, journaliser } from '../../lib/supabase.js'
import { nomMedecin } from '../../lib/format.js'
import { estMineur } from '../../lib/dossierOperatoire.js'
import { ENVELOPPES, MODELES, adressePostale, courrierHtml, formule, imprimerCourrier, pageCourrier, verifierAdresse } from '../../lib/courrier.js'

/** Largeur d'un A4 en pixels CSS (210 mm à 96 ppp). */
const A4_PX = 210 * 96 / 25.4

/** Échelle pour faire tenir une page A4 dans son cadre. */
function useEchelle() {
  const ref = useRef(null)
  const [k, setK] = useState(0.5)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setK(e.contentRect.width / A4_PX))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, k]
}

const DESTINATAIRES = [['patient', 'Le patient'], ['parents', 'Les parents'], ['medecin', 'Le médecin traitant'], ['autre', 'Autre destinataire']]

export default function Courriers() {
  const { profil } = useAuth()
  const { patient } = usePatients()
  const sites = useSites()
  const [modele, setModele] = useState('libre')
  const [dest, setDest] = useState('patient')
  const [siteId, setSiteId] = useState('')
  const [enveloppe, setEnveloppe] = useState('dl')
  const [repere, setRepere] = useState(false)
  const [donnees, setDonnees] = useState({})
  const [f, setF] = useState({ adresse: '', objet: '', corps: '', ouverture: '', politesse: '', piecesJointes: '' })
  const maj = k => v => setF(x => ({ ...x, [k]: v }))
  const [cadre, echelle] = useEchelle()
  const site = sites.parId(siteId) || sites.parDefaut
  const mineur = patient && estMineur(patient.date_naissance)

  // Données du dossier utiles aux modèles : prochain rendez-vous, prochaine opération, examens disponibles.
  useEffect(() => {
    if (!patient) return
    const maintenant = new Date().toISOString()
    Promise.all([
      supabase.from('rendez_vous').select('*').eq('patient_id', patient.id).order('date_heure', { ascending: false }).limit(10),
      supabase.from('operations').select('*').eq('patient_id', patient.id).neq('statut', 'annulée').gte('debut', maintenant).order('debut').limit(1),
      supabase.from('examens_laboratoire').select('*').eq('patient_id', patient.id).eq('statut', 'disponible').order('date_resultat', { ascending: false }).limit(8),
    ]).then(([r, o, e]) => {
      const rdvs = r.data || []
      setDonnees({
        rdvAVenir: [...rdvs].reverse().find(x => x.statut === 'prévu' && x.date_heure >= maintenant),
        rdvPasse: rdvs.find(x => x.date_heure < maintenant),
        op: o.data?.[0], examens: e.data || [],
      })
    })
  }, [patient])

  // Choisir un patient ou un modèle remplit l'adresse, l'objet et le texte.
  useEffect(() => {
    if (!patient) return
    const [, , destDefaut, fabrique] = MODELES.find(m => m[0] === modele)
    const d = destDefaut === 'medecin' ? 'medecin' : mineur && destDefaut === 'patient' ? 'parents' : destDefaut
    setDest(d)
    const rdv = modele === 'rdv_manque' ? donnees.rdvPasse : donnees.rdvAVenir
    const contenu = fabrique({ patient, rdv, siteRdv: sites.parId(rdv?.site_id), op: donnees.op, siteOp: sites.parId(donnees.op?.site_id), examens: donnees.examens, sejour: patient.sejours?.[0] })
    // Expéditeur : le site du rendez-vous ou de l'opération convoqués.
    const siteLie = modele === 'convocation_op' ? donnees.op?.site_id : ['convocation_rdv', 'rdv_manque'].includes(modele) ? rdv?.site_id : null
    if (siteLie) setSiteId(siteLie)
    const [ouverture, politesse] = formule(d)
    setF({
      adresse: adressePostale(patient, d), ...contenu, ouverture, politesse,
      piecesJointes: modele === 'convocation_op' ? 'livret « Mon opération », consentements à signer' : modele === 'sortie' ? 'bulletin de sortie, ordonnances' : '',
    })
  }, [patient, modele, donnees]) // eslint-disable-line react-hooks/exhaustive-deps

  const changerDest = d => {
    setDest(d)
    const [ouverture, politesse] = formule(d)
    setF(x => ({ ...x, adresse: d === 'autre' ? '' : adressePostale(patient, d), ouverture, politesse }))
  }

  const courrier = { ...f, site, enveloppe, repere, signataire: nomMedecin(profil.medecin), titreSignataire: `${patient?.service || 'Hôpital M&M'} · Hôpital M&M`, reference: patient ? `${patient.numero_dossier || ''}${patient.ipp ? ` · IPP ${patient.ipp}` : ''}` : '' }
  const alertes = verifierAdresse(f.adresse)
  const apercu = useMemo(() => pageCourrier(courrierHtml({ ...courrier, repere: true })), [JSON.stringify(courrier)]) // eslint-disable-line react-hooks/exhaustive-deps

  const lancer = () => {
    imprimerCourrier(courrier, `Courrier — ${patient?.nomComplet || ''}`)
    if (patient) journaliser(profil, `Courrier imprimé : ${f.objet || 'lettre'}`, { patient_id: patient.id, service_id: patient.service_id })
  }

  return (
    <>
      <EnTeteOutil titre="Courriers">
        Lettres prêtes à poster sous enveloppe à fenêtre : le nom et l'adresse du destinataire tombent dans la fenêtre transparente. Choisissez un modèle, vérifiez l'adresse, imprimez, pliez sur les repères.
      </EnTeteOutil>
      <SelecteurPatient />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 22, alignItems: 'start' }}>
        <div className="carte-blanche" style={{ display: 'grid', gap: 14 }}>
          <div className="grille-champs">
            <Champ label="Modèle">
              <select className="saisie" value={modele} onChange={e => setModele(e.target.value)}>{MODELES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </Champ>
            <Champ label="Destinataire">
              <select className="saisie" value={dest} onChange={e => changerDest(e.target.value)}>
                {DESTINATAIRES.filter(([k]) => k !== 'parents' || mineur).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Champ>
          </div>
          <ZoneTexte label="Adresse (dans la fenêtre de l'enveloppe)" rows={5} valeur={f.adresse} onChange={maj('adresse')} style={{ fontFamily: 'var(--mono)', fontSize: 14 }} />
          {alertes.map(a => <Message key={a} type="alerte">{a}</Message>)}
          <Saisie label="Objet" valeur={f.objet} onChange={maj('objet')} />
          <Saisie label="Formule d'appel" valeur={f.ouverture} onChange={maj('ouverture')} />
          <ZoneTexte label="Texte" rows={10} valeur={f.corps} onChange={maj('corps')} />
          <Saisie label="Formule de politesse" valeur={f.politesse} onChange={maj('politesse')} />
          <Saisie label="Pièces jointes" valeur={f.piecesJointes} onChange={maj('piecesJointes')} placeholder="Ordonnance, livret…" />
          <div className="grille-champs">
            <Champ label="Expéditeur">
              <select className="saisie" value={site?.id || ''} onChange={e => setSiteId(e.target.value)}>{sites.sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
            </Champ>
            <Champ label="Enveloppe">
              <select className="saisie" value={enveloppe} onChange={e => setEnveloppe(e.target.value)}>{ENVELOPPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </Champ>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={repere} onChange={e => setRepere(e.target.checked)} /> Imprimer le contour de la fenêtre (feuille de test)
          </label>
          <div className="rangee-btn">
            <button type="button" className="btn btn-plein" disabled={!patient && !f.adresse.trim()} onClick={lancer}>Imprimer le courrier</button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8, position: 'sticky', top: 16 }}>
          <div className="etiquette">Aperçu · le contour rouge montre la fenêtre de l'enveloppe</div>
          <div ref={cadre} style={{ width: '100%', aspectRatio: '210 / 297', background: '#fff', border: '1px solid var(--filet-fort)', overflow: 'hidden' }}>
            <iframe title="Aperçu du courrier" srcDoc={apercu} style={{ width: '210mm', height: '297mm', border: 0, transformOrigin: '0 0', transform: `scale(${echelle})`, pointerEvents: 'none' }} />
          </div>
        </div>
      </div>
    </>
  )
}
