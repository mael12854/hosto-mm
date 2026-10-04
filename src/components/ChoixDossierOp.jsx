import { useMemo, useState } from 'react'
import { imprimerDossierOperatoire, piecesDossier } from '../lib/dossierOperatoire.js'

const GROUPES = [['Admission', 'Admission et consentements'], ['Bloc', 'Au bloc'], ['Après', "Après l'opération"]]

/** Bouton « Dossier opératoire » : choix des pièces (proposées selon le parcours) puis impression. */
export default function ChoixDossierOp({ donnees }) {
  const pieces = useMemo(() => piecesDossier(donnees), [donnees])
  const parDefaut = () => pieces.filter(x => x.defaut).map(x => x.code)
  const [ouvert, setOuvert] = useState(false)
  const [choix, setChoix] = useState(parDefaut)
  const basculer = code => setChoix(c => (c.includes(code) ? c.filter(x => x !== code) : [...c, code]))
  const sejour = donnees.op.sejour || ''

  if (!ouvert) return <button type="button" className="btn" onClick={() => { setChoix(parDefaut()); setOuvert(true) }}>Dossier opératoire à signer</button>

  return (
    <div className="carte-blanche" style={{ display: 'grid', gap: 14, flexBasis: '100%', borderTop: '3px solid var(--bleu)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--encre)' }}>Dossier opératoire · {choix.length} pièce{choix.length > 1 ? 's' : ''}</span>
        <span className="etiquette">{/^ambulatoire/i.test(sejour) ? 'Parcours ambulatoire' : `Hospitalisation · ${sejour}`}{donnees.mineur ? ' · patient mineur' : ''}</span>
      </div>
      <p style={{ fontSize: 14, color: 'var(--texte)' }}>Les pièces cochées sont proposées pour ce parcours. Ajoutez ou retirez celles dont vous avez besoin : chacune s'imprime sur une page A4, prête à signer.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16, alignItems: 'start' }}>
        {GROUPES.map(([g, titre]) => (
          <div key={g} style={{ display: 'grid', gap: 2 }}>
            <div className="etiquette" style={{ marginBottom: 4 }}>{titre}</div>
            {pieces.filter(x => x.groupe === g).map(x => (
              <label key={x.code} className="ligne-check" style={{ justifyContent: 'flex-start', cursor: 'pointer', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <input type="checkbox" checked={choix.includes(x.code)} onChange={() => basculer(x.code)} />
                <span style={{ display: 'grid', minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, color: 'var(--encre)' }}>{x.titre}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: x.defaut ? 'var(--bleu)' : 'var(--gris)' }}>{x.defaut ? `PROPOSÉE · ${x.raison.toUpperCase()}` : `FACULTATIVE · ${x.raison.toUpperCase()}`}</span>
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className="rangee-btn">
        <button type="button" className="btn" disabled={!choix.length} onClick={() => imprimerDossierOperatoire(donnees, choix)}>Imprimer {choix.length} pièce{choix.length > 1 ? 's' : ''}</button>
        <button type="button" className="btn" onClick={() => setChoix(pieces.map(x => x.code))}>Tout cocher</button>
        <button type="button" className="btn" onClick={() => setChoix(parDefaut())}>Pièces proposées</button>
        <button type="button" className="btn-lien bleu" style={{ alignSelf: 'center' }} onClick={() => setOuvert(false)}>FERMER</button>
      </div>
    </div>
  )
}
