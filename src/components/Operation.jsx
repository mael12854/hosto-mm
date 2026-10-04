import { useEffect, useState } from 'react'
import { ALDRETE, CHAMPS_CR, CHECKLIST, ELEMENTS_CHECKLIST, HEURES, statutOp } from '../lib/operations.js'
import { dateHeure, heure, valeurDateHeure } from '../lib/format.js'
import { ChampDate, ZoneTexte } from './ui.jsx'

export function BadgeOp({ statut }) {
  const [, libelle, cle] = statutOp(statut)
  return <span className={'badge ' + cle}>{libelle}</span>
}

/** Avancement de la check-list : « 12 / 18 ». */
export const avancementChecklist = c => `${ELEMENTS_CHECKLIST.filter(k => c?.[k]?.ok).length} / ${ELEMENTS_CHECKLIST.length}`

/** Check-list HAS : chaque case enregistre qui l'a cochée et quand. */
export function Checklist({ op, qui, enregistrer, lectureSeule }) {
  const c = op.checklist || {}
  const basculer = (cle, na = false) => {
    const actuel = c[cle]
    const suivant = actuel?.ok && !!actuel.na === na ? null : { ok: true, na, par: qui, le: new Date().toISOString() }
    const nouveau = { ...c }
    if (suivant) nouveau[cle] = suivant; else delete nouveau[cle]
    enregistrer({ checklist: nouveau }, suivant ? `Check-list : ${cle}${na ? ' (sans objet)' : ''}` : `Check-list : ${cle} décoché`)
  }
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {CHECKLIST.map(([temps, titre, items]) => {
        const faits = items.filter(([k]) => c[k]?.ok).length
        return (
          <section key={temps} className="carte-blanche" style={{ display: 'grid', gap: 8, borderTop: `3px solid ${faits === items.length ? 'var(--vert)' : 'var(--bleu)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--encre)' }}>{titre}</span>
              <span className={'statut-texte ' + (faits === items.length ? 'stable' : 'surveiller')}>{faits} / {items.length}</span>
            </div>
            {items.map(([cle, libelle]) => {
              const x = c[cle]
              return (
                <div key={cle} className="ligne-check">
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, cursor: lectureSeule ? 'default' : 'pointer' }}>
                    <input type="checkbox" checked={!!x?.ok && !x?.na} disabled={lectureSeule} onChange={() => basculer(cle)} />
                    <span style={{ fontSize: 14.5, color: 'var(--encre)' }}>{libelle}</span>
                  </label>
                  <span style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 'none' }}>
                    {x?.ok && <span className="mono" style={{ fontSize: 11, color: 'var(--gris)' }}>{x.na ? 'N/A · ' : ''}{x.par} · {heure(x.le)}</span>}
                    {!lectureSeule && <button type="button" className={'btn-puce' + (x?.na ? ' actif' : '')} onClick={() => basculer(cle, true)} title="Sans objet">N/A</button>}
                  </span>
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}

/** Horaires du parcours au bloc : bouton « Maintenant » ou saisie de l'heure. */
export function Horaires({ op, enregistrer }) {
  const h = op.heures || {}
  const poser = (cle, libelle, statut, valeur) => {
    const heures = { ...h, [cle]: valeur }
    if (!valeur) delete heures[cle]
    const champs = { heures }
    if (valeur && statut && op.statut !== 'terminée') champs.statut = statut
    enregistrer(champs, valeur ? `${libelle} : ${dateHeure(valeur)}` : `${libelle} effacé`)
  }
  return (
    <div className="carte-blanche" style={{ display: 'grid', gap: 2 }}>
      {HEURES.map(([cle, libelle, statut]) => (
        <div key={cle} className="ligne-check">
          <span style={{ fontSize: 14.5, color: 'var(--encre)', flex: '1 1 180px' }}>{libelle}</span>
          {h[cle] ? (
            <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 15, color: 'var(--encre)' }}>{dateHeure(h[cle])}</span>
              <button type="button" className="btn-lien" onClick={() => poser(cle, libelle, null, null)}>EFFACER</button>
            </span>
          ) : (
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="datetime-local" lang="fr" className="saisie petite mono" style={{ width: 'auto' }} aria-label={libelle}
                onChange={e => e.target.value && poser(cle, libelle, statut, new Date(e.target.value).toISOString())} />
              <button type="button" className="btn" onClick={() => poser(cle, libelle, statut, new Date().toISOString())}>Maintenant</button>
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/** Compte-rendu opératoire structuré. */
export function CompteRenduOp({ op, enregistrer, imprimerCr }) {
  const [f, setF] = useState(() => op.compte_rendu || {})
  useEffect(() => { setF(op.compte_rendu || {}) }, [op.id, op.compte_rendu])
  const signe = !!op.compte_rendu_signe_le
  return (
    <div className="carte-blanche" style={{ display: 'grid', gap: 12 }}>
      {CHAMPS_CR.map(([cle, libelle, lignes]) => (
        <ZoneTexte key={cle} label={libelle} rows={Math.max(2, lignes)} valeur={f[cle]} onChange={v => setF(x => ({ ...x, [cle]: v }))} disabled={signe} />
      ))}
      {signe && <div className="note">Compte-rendu signé le {dateHeure(op.compte_rendu_signe_le)}.</div>}
      <div className="rangee-btn">
        {!signe && <button type="button" className="btn btn-plein" onClick={() => enregistrer({ compte_rendu: f }, 'Compte-rendu opératoire enregistré')}>Enregistrer</button>}
        {!signe && <button type="button" className="btn" onClick={() => { if (window.confirm('Signer le compte-rendu ? Il ne sera plus modifiable.')) enregistrer({ compte_rendu: f, compte_rendu_signe_le: new Date().toISOString() }, 'Compte-rendu opératoire signé') }}>Signer</button>}
        {signe && <button type="button" className="btn" onClick={() => enregistrer({ compte_rendu_signe_le: null }, 'Compte-rendu opératoire rouvert')}>Rouvrir</button>}
        <button type="button" className="btn" onClick={() => imprimerCr(f)}>Imprimer</button>
      </div>
    </div>
  )
}

/** Salle de réveil : score d'Aldrete, douleur, consignes de sortie, fin du parcours. */
export function Reveil({ op, enregistrer }) {
  const [r, setR] = useState(() => op.reveil || {})
  const [consignes, setConsignes] = useState(op.consignes_sortie || '')
  useEffect(() => { setR(op.reveil || {}); setConsignes(op.consignes_sortie || '') }, [op.id, op.reveil, op.consignes_sortie])
  const total = ALDRETE.every(([k]) => r[k] != null) ? ALDRETE.reduce((s, [k]) => s + Number(r[k]), 0) : null
  const champs = () => ({ reveil: { ...r, aldrete: total }, consignes_sortie: consignes.trim() || null })
  const terminer = () => {
    if (total == null || total < 9) { if (!window.confirm(`Score d'Aldrete ${total ?? 'incomplet'} : la sortie est recommandée à partir de 9. Terminer quand même ?`)) return }
    enregistrer({ ...champs(), statut: 'terminée', heures: { ...op.heures, sortie_reveil: op.heures?.sortie_reveil || new Date().toISOString() } }, `Sortie de salle de réveil (Aldrete ${total ?? '—'})`)
  }
  return (
    <div className="carte-blanche" style={{ display: 'grid', gap: 14 }}>
      <div className="defile-x">
        <table className="tableau">
          <thead><tr><th>Score d'Aldrete</th><th>0</th><th>1</th><th>2</th></tr></thead>
          <tbody>{ALDRETE.map(([cle, libelle, niveaux]) => (
            <tr key={cle}>
              <td style={{ fontWeight: 600 }}>{libelle}</td>
              {niveaux.map((n, i) => (
                <td key={i}>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13.5 }}>
                    <input type="radio" name={`aldrete-${cle}`} checked={Number(r[cle]) === i && r[cle] != null} onChange={() => setR(x => ({ ...x, [cle]: i }))} />{n}
                  </label>
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-end' }}>
        <div><div className="etiquette">Total</div><div className="mono" style={{ fontSize: 26, color: total != null && total >= 9 ? 'var(--vert)' : 'var(--encre)' }}>{total ?? '—'} / 10</div></div>
        <label className="champ" style={{ width: 160 }}><span>Douleur (EVA 0-10)</span>
          <input type="number" min="0" max="10" className="saisie mono" value={r.eva ?? ''} onChange={e => setR(x => ({ ...x, eva: e.target.value === '' ? null : Math.max(0, Math.min(10, Number(e.target.value))) }))} />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14.5, paddingBottom: 10 }}>
          <input type="checkbox" checked={!!r.nausees} onChange={e => setR(x => ({ ...x, nausees: e.target.checked }))} /> Nausées ou vomissements
        </label>
      </div>
      <ZoneTexte label="Notes de surveillance" rows={2} valeur={r.notes} onChange={v => setR(x => ({ ...x, notes: v }))} />
      <ZoneTexte label="Consignes de sortie (visibles par le patient et dans son livret)" rows={3} valeur={consignes} onChange={setConsignes} />
      <div className="rangee-btn">
        <button type="button" className="btn" onClick={() => enregistrer(champs(), 'Surveillance de réveil enregistrée')}>Enregistrer</button>
        {op.statut !== 'terminée' && <button type="button" className="btn btn-plein" onClick={terminer}>Sortie de réveil · terminer</button>}
      </div>
    </div>
  )
}

/** Saisie date + heure de début et durée, utilisée à la programmation. */
export function CreneauOp({ debut, duree, setDebut, setDuree }) {
  return (
    <>
      <ChampDate type="datetime-local" label="Début" valeur={debut} onChange={setDebut} min={valeurDateHeure()} required />
      <label className="champ"><span>Durée (min)</span>
        <input type="number" min="10" step="5" className="saisie mono" value={duree} onChange={e => setDuree(e.target.value)} />
      </label>
    </>
  )
}
