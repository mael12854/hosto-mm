import { useState } from 'react'
import { LogoMark, logoInverseSvgTexte, logoSvgTexte, signeInverseSvgTexte, signeSvgTexte } from '../../components/Logo.jsx'
import { Champ, EnTeteOutil, Saisie } from '../../components/ui.jsx'
import { esc } from '../../lib/format.js'
import { imprimer } from '../../lib/impression.js'

// Modèles d'affiche : [titre, consigne, repère, style]
const MODELES = [
  ["Salle d'attente", 'Asseyez-vous, on vous appelle.', 'Couloir · porte 2', 'clair'],
  ['Urgences', 'Signalez-vous immédiatement à un soignant.', 'Accueil · entrée principale', 'urgence'],
  ['Chambre 1', 'Frappez avant d\'entrer. Visites de 14 h à 19 h.', 'Service Médecine', 'bleu'],
  ['Pharmacie', 'Réservée au personnel soignant.', 'Salle de bain · placard du haut', 'clair'],
  ['Lavez-vous les mains', 'Avant et après chaque soin : 30 secondes de savon.', 'Tous les services', 'bleu'],
  ['Silence', 'Des patients se reposent.', 'Étage des chambres', 'clair'],
  ['Accès interdit', 'Personnel autorisé uniquement.', 'Bloc opératoire', 'urgence'],
]
const STYLES = {
  clair: { fond: '#F4F1EA', texte: '#1E262B', accent: '#1D5C74', repere: '#1D5C74', signe: 'couleur' },
  bleu: { fond: '#1D5C74', texte: '#F4F1EA', accent: '#D6E7EE', repere: '#D6E7EE', signe: 'inverse' },
  urgence: { fond: '#FFFFFF', texte: '#1E262B', accent: '#A8331F', repere: '#A8331F', signe: 'couleur' },
}

export default function Affiches() {
  const [a, setA] = useState({ titre: MODELES[0][0], consigne: MODELES[0][1], repere: MODELES[0][2], style: MODELES[0][3], format: 'A4' })
  const maj = k => v => setA(x => ({ ...x, [k]: v }))
  const st = STYLES[a.style]
  const paysage = a.format === 'A4 landscape'

  const lancer = () => {
    const signe = a.style === 'bleu' ? signeInverseSvgTexte : signeSvgTexte
    const logo = a.style === 'bleu' ? logoInverseSvgTexte : logoSvgTexte
    imprimer({
      titre: `Affiche — ${a.titre}`, page: a.format, marge: '0',
      style: `*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}body{margin:0;font-family:'Source Sans 3',sans-serif}
.p{width:100vw;height:100vh;padding:14mm;background:${st.fond};color:${st.texte};display:flex;flex-direction:column;justify-content:space-between;${a.style === 'urgence' ? 'border:6mm solid #A8331F;' : ''}}
.s{width:${paysage ? 55 : 70}mm}.t{font-size:${paysage ? 88 : 72}pt;font-weight:700;line-height:1;letter-spacing:-.02em}
.c{font-size:${paysage ? 32 : 28}pt;font-weight:300;margin-top:8mm;max-width:24ch}
.r{font-family:'IBM Plex Mono',monospace;font-size:16pt;letter-spacing:.12em;text-transform:uppercase;color:${st.repere};border-top:1mm solid ${st.accent};padding-top:5mm;display:flex;justify-content:space-between;align-items:center;gap:10mm}.l{width:70mm;flex:none;text-transform:none;letter-spacing:0}`,
      corps: `<div class="p"><div class="s">${signe}</div><div><div class="t">${esc(a.titre)}</div><div class="c">${esc(a.consigne)}</div></div><div class="r"><span>${esc(a.repere)}</span><span class="l">${logo}</span></div></div>`,
    })
  }

  return (
    <>
      <EnTeteOutil titre="Affiches">
        Affiches de porte au format de la charte : signe seul, une consigne, un repère de lieu. Choisissez un modèle, adaptez le texte, imprimez en A4.
      </EnTeteOutil>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {MODELES.map(([t, c, r, s]) => (
          <button key={t} type="button" className={'btn-puce' + (a.titre === t ? ' actif' : '')} onClick={() => setA(x => ({ ...x, titre: t, consigne: c, repere: r, style: s }))}>{t}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 22, alignItems: 'start' }}>
        <div className="carte-blanche" style={{ display: 'grid', gap: 14 }}>
          <Saisie label="Titre" valeur={a.titre} onChange={maj('titre')} />
          <Saisie label="Consigne" valeur={a.consigne} onChange={maj('consigne')} />
          <Saisie label="Repère de lieu" valeur={a.repere} onChange={maj('repere')} />
          <div className="grille-champs">
            <Champ label="Style">
              <select className="saisie" value={a.style} onChange={e => maj('style')(e.target.value)}>
                <option value="clair">Blanc papier</option><option value="bleu">Bleu M&amp;M</option><option value="urgence">Urgence (cadre rouge)</option>
              </select>
            </Champ>
            <Champ label="Format">
              <select className="saisie" value={a.format} onChange={e => maj('format')(e.target.value)}>
                <option value="A4">A4 portrait</option><option value="A4 landscape">A4 paysage</option>
              </select>
            </Champ>
          </div>
          <div className="rangee-btn"><button type="button" className="btn btn-plein" onClick={lancer}>Imprimer l'affiche</button></div>
        </div>

        <div aria-label="Aperçu de l'affiche" style={{
          aspectRatio: paysage ? '297 / 210' : '210 / 297', background: st.fond, color: st.texte, padding: '6%',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: a.style === 'urgence' ? '10px solid var(--rouge)' : '1px solid var(--filet-fort)',
          boxShadow: '0 1px 0 var(--filet)', containerType: 'inline-size',
        }}>
          <div style={{ width: '26%' }}><LogoMark variante={st.signe} /></div>
          <div>
            <div style={{ fontSize: paysage ? '11cqw' : '12cqw', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>{a.titre}</div>
            <div style={{ fontSize: '4.6cqw', fontWeight: 300, marginTop: '4%', maxWidth: '24ch' }}>{a.consigne}</div>
          </div>
          <div className="mono" style={{ fontSize: '2.6cqw', letterSpacing: '0.12em', textTransform: 'uppercase', color: st.repere, borderTop: `2px solid ${st.accent}`, paddingTop: '3%' }}>{a.repere}</div>
        </div>
      </div>
    </>
  )
}
