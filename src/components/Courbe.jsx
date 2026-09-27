import { useEffect, useMemo, useRef, useState } from 'react'
import { dateHeure, date as dateCourteFr } from '../lib/format.js'

// Couleurs de séries validées (écart CVD ≥ 15, contraste ≥ 3:1 sur blanc) — proches de la charte.
export const SERIES = ['#17739C', '#B85C2A']
const HORS_NORME = '#A8331F' // rouge soin : statut « hors norme », toujours accompagné d'un libellé

const H = 200, M = { g: 44, d: 58, h: 14, b: 28 }
const fr = (v, dec) => (v == null ? '—' : Number(v).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }))

/**
 * Courbe d'une mesure dans le temps (une seule échelle).
 * series : [{ nom, points: [{ t: Date|string, v: number }] }] — 1 ou 2 séries de même unité.
 * normale : [min, max] zone normale grisée ; les points hors zone sont signalés.
 */
export default function Courbe({ titre, unite, series, normale, decimales = 0, jours = false }) {
  const boite = useRef(null)
  const [largeur, setLargeur] = useState(320)
  const [survol, setSurvol] = useState(null)

  const donnees = useMemo(() => series.map((s, i) => ({
    ...s, couleur: SERIES[i],
    points: s.points.filter(p => p.v != null && !isNaN(p.v)).map(p => ({ t: new Date(p.t).getTime(), v: Number(p.v) })).sort((a, b) => a.t - b.t),
  })).filter(s => s.points.length), [series])

  const tous = donnees.flatMap(s => s.points)
  const vide = !tous.length

  // Largeur réelle du conteneur (le texte du graphique garde sa taille).
  useEffect(() => {
    const el = boite.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLargeur(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [vide])

  if (vide) {
    return (
      <figure className="carte-blanche" style={{ display: 'grid', gap: 6 }}>
        <figcaption style={{ fontSize: 15, fontWeight: 600, color: 'var(--encre)' }}>{titre} <span className="etiquette">{unite}</span></figcaption>
        <p style={{ fontSize: 14, color: 'var(--gris)' }}>Aucune mesure.</p>
      </figure>
    )
  }

  // Échelles
  let tMin = Math.min(...tous.map(p => p.t)), tMax = Math.max(...tous.map(p => p.t))
  if (tMin === tMax) { tMin -= 86400000; tMax += 86400000 }
  const valeurs = tous.map(p => p.v).concat(normale || [])
  let vMin = Math.min(...valeurs), vMax = Math.max(...valeurs)
  const marge = (vMax - vMin) * 0.12 || 1
  vMin -= marge; vMax += marge
  const W = largeur
  const x = t => M.g + ((t - tMin) / (tMax - tMin)) * (W - M.g - M.d)
  const y = v => M.h + (1 - (v - vMin) / (vMax - vMin)) * (H - M.h - M.b)
  // Zone normale : celle de la série si elle en a une, sinon celle du graphique.
  const horsNorme = (v, s) => { const z = s?.normale || normale; return !!z && (v < z[0] || v > z[1]) }

  // Graduations : 4 lignes horizontales, 2 à 5 dates
  const pasV = (vMax - vMin) / 4
  const gradV = [0, 1, 2, 3, 4].map(i => vMin + pasV * i)
  const nbT = Math.min(5, Math.max(2, Math.floor((W - M.g - M.d) / 110)))
  const gradT = Array.from({ length: nbT }, (_, i) => tMin + ((tMax - tMin) * i) / (nbT - 1))
  const etiquetteT = t => (tMax - tMin > 300 * 86400000
    ? new Date(t).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })
    : jours || tMax - tMin > 3 * 86400000
    ? new Date(t).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    : new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))

  // Survol : point le plus proche en x (toutes séries)
  const surMouvement = e => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    let meilleur = null
    for (const s of donnees) for (const p of s.points) {
      const d = Math.abs(x(p.t) - px)
      if (!meilleur || d < meilleur.d) meilleur = { d, t: p.t }
    }
    setSurvol(meilleur && meilleur.d < 40 ? meilleur.t : null)
  }
  const auSurvol = survol == null ? [] : donnees.map(s => ({ s, p: s.points.find(p => p.t === survol) })).filter(x => x.p)

  return (
    <figure className="carte-blanche" style={{ display: 'grid', gap: 8, margin: 0, minWidth: 0, overflow: 'hidden' }}>
      <figcaption style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--encre)' }}>{titre} <span className="etiquette">{unite}</span></span>
        {donnees.length > 1 && (
          <span style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--texte)' }}>
            {donnees.map(s => <span key={s.nom} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 2, background: s.couleur }} />{s.nom}</span>)}
          </span>
        )}
      </figcaption>

      <div ref={boite} style={{ position: 'relative', width: '100%', minWidth: 0 }}>
        <svg width={W} height={H} role="img" aria-label={`${titre} : ${tous.length} mesures`} onMouseMove={surMouvement} onMouseLeave={() => setSurvol(null)} style={{ display: 'block', overflow: 'visible' }}>
          {normale && (
            <g>
              <rect x={M.g} y={y(normale[1])} width={W - M.g - M.d} height={Math.max(0, y(normale[0]) - y(normale[1]))} fill="#34715C" opacity="0.08" />
              <text x={M.g + 6} y={y(normale[1]) + 11} fontSize="10" fill="#34715C" fontFamily="IBM Plex Mono, monospace">ZONE NORMALE</text>
            </g>
          )}
          {gradV.map(v => (
            <g key={v}>
              <line x1={M.g} x2={W - M.d} y1={y(v)} y2={y(v)} stroke="#EAE6DC" strokeWidth="1" />
              <text x={M.g - 6} y={y(v) + 3.5} fontSize="10.5" textAnchor="end" fill="#656C71" fontFamily="IBM Plex Mono, monospace">{fr(v, decimales)}</text>
            </g>
          ))}
          {gradT.map(t => (
            <text key={t} x={x(t)} y={H - 8} fontSize="10.5" textAnchor="middle" fill="#656C71" fontFamily="IBM Plex Mono, monospace">{etiquetteT(t)}</text>
          ))}
          {survol != null && <line x1={x(survol)} x2={x(survol)} y1={M.h} y2={H - M.b} stroke="#C2BBAC" strokeWidth="1" strokeDasharray="3 3" />}
          {donnees.map(s => (
            <g key={s.nom}>
              {s.points.length > 1 && <polyline fill="none" stroke={s.couleur} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={s.points.map(p => `${x(p.t)},${y(p.v)}`).join(' ')} />}
              {s.points.map(p => {
                const hn = horsNorme(p.v, s)
                return <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={survol === p.t ? 5.5 : 4} fill={hn ? HORS_NORME : s.couleur} stroke="#fff" strokeWidth="2" />
              })}
              {/* Étiquette directe : dernière valeur */}
              {(() => { const d = s.points[s.points.length - 1]; return (
                <text x={x(d.t) + 9} y={y(d.v) + 4} fontSize="12" fontWeight="600" fill="#1E262B" fontFamily="IBM Plex Mono, monospace">{fr(d.v, decimales)}</text>
              ) })()}
            </g>
          ))}
        </svg>
        {auSurvol.length > 0 && (
          <div role="status" style={{
            position: 'absolute', top: 0, left: Math.min(Math.max(x(survol) + 12, 0), W - 230), pointerEvents: 'none',
            background: '#fff', border: '1px solid var(--filet-fort)', padding: '7px 10px', fontSize: 13, minWidth: 220, boxShadow: '0 2px 6px rgba(30,38,43,.08)',
          }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--gris)', marginBottom: 3 }}>{jours ? dateCourteFr(survol) : dateHeure(survol)}</div>
            {auSurvol.map(({ s, p }) => (
              <div key={s.nom} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--encre)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: horsNorme(p.v, s) ? HORS_NORME : s.couleur }} />{s.nom}</span>
                <strong className="mono" style={{ whiteSpace: 'nowrap' }}>{fr(p.v, decimales)} {unite}{horsNorme(p.v, s) ? ' · hors norme' : ''}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {donnees.map(s => {
        const z = s.normale || normale, n = s.points.filter(p => horsNorme(p.v, s)).length
        return n > 0 && (
          <p key={s.nom} style={{ fontSize: 13, color: HORS_NORME, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: HORS_NORME }} />
            ⚠ {donnees.length > 1 ? `${s.nom} : ` : ''}{n} mesure{n > 1 ? 's' : ''} hors norme (normal : {fr(z[0], decimales)} – {fr(z[1], decimales)} {unite})
          </p>
        )
      })}
      <details>
        <summary className="etiquette" style={{ cursor: 'pointer' }}>Voir les valeurs</summary>
        <table className="tableau" style={{ marginTop: 8 }}>
          <thead><tr><th>Date</th>{donnees.map(s => <th key={s.nom}>{s.nom}</th>)}</tr></thead>
          <tbody>
            {[...new Set(tous.map(p => p.t))].sort((a, b) => b - a).map(t => (
              <tr key={t}>
                <td className="mono" style={{ fontSize: 12.5 }}>{jours ? dateCourteFr(t) : dateHeure(t)}</td>
                {donnees.map(s => { const p = s.points.find(q => q.t === t); return <td key={s.nom} className="mono" style={{ color: p && horsNorme(p.v, s) ? HORS_NORME : undefined }}>{p ? fr(p.v, decimales) : '—'}</td> })}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
