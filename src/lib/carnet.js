// Carnet de santé type à imprimer — livret A5 aux couleurs de la charte.
// Seule l'identité du patient est pré-remplie ; tout le reste se complète à la main.
import { aujourdhui, date, esc } from './format.js'
import { logoSvgTexte, signeSvgTexte } from '../components/Logo.jsx'

const BLEU = '#1D5C74', ROUGE = '#A8331F', ENCRE = '#1E262B', GRIS = '#656C71', FILET = '#D8D2C6', GRILLE = '#E4DFD4'

function age(naissance) {
  if (!naissance) return ''
  const n = new Date(naissance + 'T12:00:00'), a = new Date()
  let mois = (a.getFullYear() - n.getFullYear()) * 12 + a.getMonth() - n.getMonth()
  if (a.getDate() < n.getDate()) mois--
  return mois < 24 ? `${mois} mois` : `${Math.floor(mois / 12)} ans`
}

/** Grille vierge pour tracer une courbe à la main : âge (0–18 ans) en abscisse. */
function grilleVierge(yMin, yMax, pasY, unite) {
  const W = 360, H = 190, g = 32, d = 8, h = 8, b = 24
  const x = a => g + (a / 18) * (W - g - d)
  const y = v => h + (1 - (v - yMin) / (yMax - yMin)) * (H - h - b)
  const lignesY = [], lignesX = []
  for (let v = yMin; v <= yMax; v += pasY / 2) {
    const majeure = (v - yMin) % pasY === 0
    lignesY.push(`<line x1="${g}" x2="${W - d}" y1="${y(v)}" y2="${y(v)}" stroke="${majeure ? '#CFC8BA' : GRILLE}" stroke-width="${majeure ? 0.6 : 0.4}"/>`
      + (majeure ? `<text x="${g - 4}" y="${y(v) + 3}" font-size="7.5" text-anchor="end" fill="${GRIS}" font-family="IBM Plex Mono,monospace">${v}</text>` : ''))
  }
  for (let a = 0; a <= 18; a++) {
    const majeure = a % 2 === 0
    lignesX.push(`<line x1="${x(a)}" x2="${x(a)}" y1="${h}" y2="${H - b}" stroke="${majeure ? '#CFC8BA' : GRILLE}" stroke-width="${majeure ? 0.6 : 0.4}"/>`
      + (majeure ? `<text x="${x(a)}" y="${H - b + 10}" font-size="7.5" text-anchor="middle" fill="${GRIS}" font-family="IBM Plex Mono,monospace">${a}</text>` : ''))
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">
${lignesY.join('')}${lignesX.join('')}
<rect x="${g}" y="${h}" width="${W - g - d}" height="${H - h - b}" fill="none" stroke="${BLEU}" stroke-width="0.8"/>
<text x="${W - d}" y="${H - 3}" font-size="7.5" text-anchor="end" fill="${GRIS}" font-family="IBM Plex Mono,monospace">ÂGE (ANS)</text>
<text x="${g + 4}" y="${h + 9}" font-size="7.5" fill="${BLEU}" font-family="IBM Plex Mono,monospace">${unite}</text>
</svg>`
}

// Calendrier vaccinal (repère imprimé ; dates, lots et visas à compléter).
const CALENDRIER = [
  ['2 mois', 'DTCaP-Hib-HépB'], ['2 mois', 'Pneumocoque'], ['4 mois', 'DTCaP-Hib-HépB'], ['4 mois', 'Pneumocoque'],
  ['5 mois', 'Méningocoque C'], ['11 mois', 'DTCaP-Hib-HépB'], ['11 mois', 'Pneumocoque'], ['12 mois', 'ROR'],
  ['12 mois', 'Méningocoque C'], ['16-18 mois', 'ROR'], ['6 ans', 'DTCaP (rappel)'], ['11-13 ans', 'dTcaP (rappel)'],
  ['11-14 ans', 'HPV'],
]

const STYLE = `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:'Source Sans 3',sans-serif;color:${ENCRE};font-size:10pt;line-height:1.4;background:#fff}
.page{height:182mm;display:flex;flex-direction:column;gap:3.5mm;page-break-after:always;break-after:page;overflow:hidden}
.page:last-child{page-break-after:auto;break-after:auto}
.tete{display:flex;justify-content:space-between;align-items:baseline;border-bottom:0.6mm solid ${BLEU};padding-bottom:2mm}
.tete h2{margin:0;font-size:14pt}.tete .n{font-family:'IBM Plex Mono',monospace;font-size:8pt;color:${BLEU}}
.pied{margin-top:auto;display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:7pt;color:${GRIS};border-top:0.2mm solid ${FILET};padding-top:1.5mm}
.k{font-family:'IBM Plex Mono',monospace;font-size:7pt;letter-spacing:.08em;color:${GRIS};text-transform:uppercase}
.v{font-size:11pt;min-height:5mm}
.grille{display:grid;grid-template-columns:1fr 1fr;gap:3mm 5mm}
.case{border-bottom:0.2mm solid ${FILET};padding-bottom:1.5mm}
.alerte{border:0.5mm solid ${ROUGE};padding:2.5mm 3mm;min-height:16mm}.alerte .k{color:${ROUGE}}.alerte .v{color:${ROUGE};font-weight:700}
table{width:100%;border-collapse:collapse;font-size:9pt}
th{font-family:'IBM Plex Mono',monospace;font-size:7pt;letter-spacing:.06em;color:${GRIS};font-weight:400;text-align:left;border-bottom:0.3mm solid ${BLEU};padding:1.2mm 1.5mm;text-transform:uppercase}
td{border-bottom:0.2mm solid ${FILET};padding:1.2mm 1.5mm;height:7mm;vertical-align:top}
td.repere{font-size:8.5pt;color:${GRIS}}
.titre-c{font-size:9pt;font-weight:600;margin:0 0 1mm}
.lignes div{border-bottom:0.2mm solid ${FILET};height:7mm}
.consult{border:0.3mm solid ${FILET};padding:2mm 3mm;display:grid;gap:1mm;align-content:start;flex:1}
.consult .haut{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:3mm}
.consult .lignes div{height:6.5mm}
.couv{border-top:12mm solid ${BLEU};border-bottom:1.2mm solid ${ROUGE};padding:10mm 2mm 4mm;justify-content:space-between}
.couv .sig{width:36mm}
.couv h1{font-size:32pt;line-height:1;margin:0;letter-spacing:-.02em}
.couv .sous{font-size:12pt;font-weight:300;margin-top:3mm;color:${BLEU}}
.couv .id{border-top:0.5mm solid ${BLEU};padding-top:4mm;display:grid;gap:1mm}
.couv .id .nom{font-size:18pt;font-weight:700;min-height:9mm}.couv .id .mono{font-family:'IBM Plex Mono',monospace;font-size:8.5pt;letter-spacing:.08em;color:${GRIS}}
.couv .logo{width:52mm}
`

/** Ouvre le carnet de santé type, prêt à imprimer (A5). Sans patient : carnet entièrement vierge. */
export function imprimerCarnet(patient = null) {
  const p = patient || {}
  const nom = `${p.prenom || ''} ${p.nom || ''}`.trim()
  const service = p.services?.nom || p.service || ''
  let n = 0
  const pied = () => `<div class="pied"><span>CARNET DE SANTÉ${nom ? ` · ${esc(nom.toUpperCase())}` : ''}</span><span>HÔPITAL M&amp;M · P. ${++n}</span></div>`
  const tete = (titre, num) => `<div class="tete"><h2>${esc(titre)}</h2><span class="n">${num}</span></div>`
  const vides = (nb, cols) => Array.from({ length: nb }, () => `<tr>${'<td></td>'.repeat(cols)}</tr>`).join('')
  const lignes = nb => `<div class="lignes">${'<div></div>'.repeat(nb)}</div>`
  const consultation = () => `<div class="consult">
      <div class="haut"><div class="case"><div class="k">Date</div><div class="v"></div></div><div class="case"><div class="k">Médecin</div><div class="v"></div></div><div class="case"><div class="k">Poids / taille</div><div class="v"></div></div></div>
      <div class="k" style="margin-top:1mm">Motif · examen · conclusion</div>${lignes(8)}</div>`

  const pages = [
    `<section class="page couv">
      <div class="sig">${signeSvgTexte}</div>
      <div><h1>Carnet<br>de santé</h1><div class="sous">Suivi médical, croissance et vaccinations</div></div>
      <div class="id">
        <div class="mono">PATIENT</div><div class="nom">${esc(nom)}</div>
        <div class="mono">NÉ(E) LE ${esc(date(p.date_naissance) || '…… / …… / ……………')} · DOSSIER ${esc(p.numero_dossier || '…………………')}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:6mm"><div class="logo">${logoSvgTexte}</div><span class="mono">ÉDITÉ LE ${aujourdhui()}</span></div>
      </div>
    </section>`,

    `<section class="page">${tete('Identité & urgence', '01')}
      <div class="grille">
        ${[['Nom', p.nom], ['Prénom', p.prenom], ['Date de naissance', date(p.date_naissance)], ['Âge', age(p.date_naissance)],
          ['Sexe', p.sexe === 'F' ? 'Féminin' : p.sexe === 'M' ? 'Masculin' : ''], ['Groupe sanguin', p.groupe_sanguin],
          ['N° de dossier', p.numero_dossier], ['IPP', p.ipp], ['Service', service], ['Chambre / lit', p.num_chambre]]
          .map(([k, v]) => `<div class="case"><div class="k">${k}</div><div class="v">${esc(v || '')}</div></div>`).join('')}
      </div>
      <div class="alerte"><div class="k">Allergies connues</div><div class="v">${esc(p.allergies || '')}</div></div>
      <div class="case"><div class="k">Antécédents médicaux et chirurgicaux</div><div class="v" style="white-space:pre-wrap;min-height:14mm">${esc(p.antecedents || '')}</div></div>
      <div class="case"><div class="k">En cas d'urgence, prévenir</div><div class="v" style="min-height:10mm">${esc([p.contact_urgence_nom, p.contact_urgence_lien && `(${p.contact_urgence_lien})`, p.contact_urgence_telephone].filter(Boolean).join(' '))}</div></div>
      <div class="case"><div class="k">Médecin traitant</div><div class="v" style="min-height:7mm">${esc(p.medecin_traitant || '')}</div></div>
      ${pied()}</section>`,

    `<section class="page">${tete('Courbes de croissance', '02')}
      <div><p class="titre-c">Taille (cm) selon l'âge</p>${grilleVierge(40, 200, 20, 'CM')}</div>
      <div><p class="titre-c">Poids (kg) selon l'âge</p>${grilleVierge(0, 100, 10, 'KG')}</div>
      ${pied()}</section>`,

    `<section class="page">${tete('Mesures', '03')}
      <table><thead><tr><th style="width:22%">Date</th><th>Âge</th><th>Taille (cm)</th><th>Poids (kg)</th><th>P. crânien</th><th style="width:15%">Visa</th></tr></thead>
      <tbody>${vides(19, 6)}</tbody></table>
      ${pied()}</section>`,

    `<section class="page">${tete('Vaccinations', '04')}
      <table><thead><tr><th style="width:18%">Âge</th><th style="width:26%">Vaccin</th><th style="width:18%">Date</th><th>Lot</th><th style="width:15%">Visa</th></tr></thead>
      <tbody>${CALENDRIER.map(([a, v]) => `<tr><td class="repere">${a}</td><td>${v}</td><td></td><td></td><td></td></tr>`).join('')}${vides(6, 5)}</tbody></table>
      ${pied()}</section>`,

    `<section class="page">${tete('Hospitalisations & examens', '05')}
      <div class="k">Hospitalisations</div>
      <table><thead><tr><th style="width:22%">Entrée</th><th style="width:22%">Sortie</th><th>Motif</th></tr></thead><tbody>${vides(5, 3)}</tbody></table>
      <div class="k">Examens</div>
      <table><thead><tr><th style="width:22%">Date</th><th>Examen</th><th>Résultat</th></tr></thead><tbody>${vides(6, 3)}</tbody></table>
      ${pied()}</section>`,

    `<section class="page">${tete('Consultations', '06')}${consultation()}${consultation()}${pied()}</section>`,
    `<section class="page">${tete('Consultations', '07')}${consultation()}${consultation()}${pied()}</section>`,
    `<section class="page">${tete('Notes', '08')}${lignes(21)}${pied()}</section>`,
  ]

  const w = window.open('', '_blank')
  if (!w) { alert('Autorisez les fenêtres surgissantes pour imprimer.'); return }
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Carnet de santé${nom ? ` — ${esc(nom)}` : ''}</title>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>@page{size:A5;margin:10mm}${STYLE}</style></head><body>${pages.join('')}</body></html>`)
  w.document.close()
  setTimeout(() => { try { w.focus(); w.print() } catch { /* fenêtre fermée */ } }, 900)
}
