import { useState } from 'react'
import { Champ, EnTeteOutil } from '../../components/ui.jsx'
import { useSites } from '../../lib/sites.jsx'
import { PAPIERS, imprimerPapiers } from '../../lib/papeterie.js'
import { PIECES_VIERGES } from '../../lib/dossierOperatoire.js'

const GROUPES = [['Admission', 'Admission et consentements'], ['Bloc', 'Au bloc'], ['Après', "Après l'opération"]]

function Case({ coche, onChange, titre, sous }) {
  return (
    <label className="ligne-check" style={{ justifyContent: 'flex-start', cursor: 'pointer', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
      <input type="checkbox" checked={coche} onChange={onChange} />
      <span style={{ display: 'grid', minWidth: 0 }}>
        <span style={{ fontSize: 14.5, color: 'var(--encre)' }}>{titre}</span>
        {sous && <span style={{ fontSize: 13, color: 'var(--gris)' }}>{sous}</span>}
      </span>
    </label>
  )
}

export default function PapiersVierges() {
  const sites = useSites()
  const [papiers, setPapiers] = useState(['entete'])
  const [pieces, setPieces] = useState([])
  const [siteChoisi, setSiteChoisi] = useState(null)
  const [exemplaires, setExemplaires] = useState(1)
  const siteId = siteChoisi ?? (sites.parDefaut?.id || '')
  const basculer = (liste, setListe, code) => setListe(liste.includes(code) ? liste.filter(x => x !== code) : [...liste, code])
  const total = (papiers.length + pieces.length) * Math.max(1, Number(exemplaires) || 1)

  return (
    <>
      <EnTeteOutil titre="Papiers vierges">
        Papiers aux couleurs de l'Hôpital M&amp;M à imprimer et remplir à la main : papier à en-tête, feuilles, formulaires, et toutes les pièces du dossier opératoire sans nom de patient.
      </EnTeteOutil>

      <div className="carte-blanche" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
        <Champ label="En-tête" style={{ flex: '1 1 240px' }}>
          <select className="saisie" value={siteId} onChange={e => setSiteChoisi(e.target.value)}>
            {sites.sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            <option value="">Sans adresse de site</option>
          </select>
        </Champ>
        <label className="champ" style={{ width: 140 }}><span>Exemplaires</span>
          <input type="number" min="1" max="50" className="saisie mono" value={exemplaires} onChange={e => setExemplaires(e.target.value)} />
        </label>
        <button type="button" className="btn btn-plein" disabled={!papiers.length && !pieces.length}
          onClick={() => imprimerPapiers({ papiers, pieces, site: sites.parId(siteId), exemplaires })}>
          Imprimer {total} page{total > 1 ? 's' : ''}
        </button>
      </div>

      <section className="carte-blanche" style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--encre)' }}>Papeterie</span>
          <span className="rangee-btn">
            <button type="button" className="btn-lien bleu" onClick={() => setPapiers(PAPIERS.map(p => p[0]))}>TOUT</button>
            <button type="button" className="btn-lien bleu" onClick={() => setPapiers([])}>AUCUN</button>
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '0 18px' }}>
          {PAPIERS.map(([code, titre, sous]) => <Case key={code} coche={papiers.includes(code)} onChange={() => basculer(papiers, setPapiers, code)} titre={titre} sous={sous} />)}
        </div>
      </section>

      <section className="carte-blanche" style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--encre)' }}>Dossier opératoire vierge</span>
          <span className="rangee-btn">
            <button type="button" className="btn-lien bleu" onClick={() => setPieces(PIECES_VIERGES.map(p => p.code))}>TOUT</button>
            <button type="button" className="btn-lien bleu" onClick={() => setPieces([])}>AUCUN</button>
          </span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--texte)' }}>Les mêmes pièces que le dossier d'une opération, sans patient ni intervention : pour la réserve du bloc ou une urgence.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16, alignItems: 'start' }}>
          {GROUPES.map(([g, titre]) => (
            <div key={g} style={{ display: 'grid', gap: 2 }}>
              <div className="etiquette" style={{ marginBottom: 4 }}>{titre}</div>
              {PIECES_VIERGES.filter(p => p.groupe === g).map(p => <Case key={p.code} coche={pieces.includes(p.code)} onChange={() => basculer(pieces, setPieces, p.code)} titre={p.titre} />)}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
