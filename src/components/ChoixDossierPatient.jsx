import { useState } from 'react'
import { Chargement, Message } from './ui.jsx'
import { useSites } from '../lib/sites.jsx'
import { chargerDossierComplet, imprimerDossierPatient, piecesDossierPatient } from '../lib/dossierPatient.js'

const GROUPES = [['Dossier', 'Contenu du dossier'], ['Urgences', 'Urgences'], ['Hospitalisation', 'Hospitalisation'], ['Autorisations', 'Autorisations et alertes'], ['Bloc', 'Bloc opératoire']]

/** Bouton « Dossier complet » : charge tout le dossier, propose les pièces adaptées au patient, imprime. */
export default function ChoixDossierPatient({ patient, medecin = '', espace = 'personnel' }) {
  const sites = useSites()
  const [etat, setEtat] = useState(null) // null : fermé · 'chargement' · { donnees, pieces, situation }
  const [choix, setChoix] = useState([])
  const [erreur, setErreur] = useState('')

  const ouvrir = async () => {
    setEtat('chargement'); setErreur('')
    try {
      const donnees = await chargerDossierComplet(patient, espace)
      const { pieces, situation } = piecesDossierPatient({ patient, donnees, sites, medecin })
      setEtat({ donnees, pieces, situation }); setChoix(pieces.filter(x => x.defaut).map(x => x.code))
    } catch (e) { setErreur(e.message); setEtat(null) }
  }
  if (!etat) return <><button type="button" className="btn" onClick={ouvrir}>{espace === 'patient' ? 'Imprimer mon dossier complet' : 'Dossier complet à imprimer'}</button><Message type="alerte">{erreur}</Message></>
  if (etat === 'chargement') return <Chargement texte="Préparation du dossier…" />

  const { donnees, pieces, situation } = etat
  const basculer = code => setChoix(c => (c.includes(code) ? c.filter(x => x !== code) : [...c, code]))
  const groupes = GROUPES.filter(([g]) => pieces.some(x => x.groupe === g && (x.defaut || g !== 'Bloc')))
  return (
    <div className="carte-blanche" style={{ display: 'grid', gap: 14, flexBasis: '100%', borderTop: '3px solid var(--bleu)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--encre)' }}>{espace === 'patient' ? 'Mon dossier' : `Dossier de ${patient.nomComplet}`} · {choix.length} pièce{choix.length > 1 ? 's' : ''}</span>
        <span className="etiquette">{situation}</span>
      </div>
      <p style={{ fontSize: 14, color: 'var(--texte)' }}>{espace === 'patient' ? 'Tout ce qui est enregistré dans votre dossier, prêt à imprimer ou à enregistrer en PDF. Les autorisations (personne de confiance, soins d\'un mineur, droit à l\'image) peuvent être ajoutées pour les remplir et les rapporter signées.' : 'Les pièces cochées sont proposées pour ce patient : tout ce qui est enregistré dans son dossier, et les formulaires adaptés à sa situation, identité pré-remplie.'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 16, alignItems: 'start' }}>
        {groupes.map(([g, titre]) => (
          <div key={g} style={{ display: 'grid', gap: 2 }}>
            <div className="etiquette" style={{ marginBottom: 4 }}>{titre}</div>
            {pieces.filter(x => x.groupe === g && (x.defaut || g !== 'Bloc')).map(x => (
              <label key={x.code} className="ligne-check" style={{ justifyContent: 'flex-start', cursor: 'pointer', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <input type="checkbox" checked={choix.includes(x.code)} onChange={() => basculer(x.code)} />
                <span style={{ display: 'grid', minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, color: 'var(--encre)' }}>{x.titre}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: x.defaut ? 'var(--bleu)' : 'var(--gris)' }}>{x.defaut ? 'PROPOSÉE' : 'FACULTATIVE'} · {x.raison.toUpperCase()}</span>
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className="rangee-btn">
        <button type="button" className="btn" disabled={!choix.length} onClick={() => imprimerDossierPatient({ patient, donnees, sites, medecin }, choix)}>Imprimer {choix.length} pièce{choix.length > 1 ? 's' : ''}</button>
        <button type="button" className="btn" onClick={() => setChoix(pieces.filter(x => x.groupe !== 'Bloc' || x.defaut).map(x => x.code))}>Tout cocher</button>
        <button type="button" className="btn" onClick={() => setChoix(pieces.filter(x => x.defaut).map(x => x.code))}>Pièces proposées</button>
        <button type="button" className="btn-lien bleu" style={{ alignSelf: 'center' }} onClick={() => setEtat(null)}>FERMER</button>
      </div>
    </div>
  )
}
