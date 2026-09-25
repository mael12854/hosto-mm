import { esc } from './format.js'
import { logoSvgTexte } from '../components/Logo.jsx'

const POLICES = '<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">'

const STYLE_DOC = `
body{margin:0;font-family:'Source Sans 3',sans-serif;color:#1E262B;font-size:12pt;line-height:1.45}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2px solid #1D5C74;padding-bottom:10px;margin-bottom:14px}
.logo{width:60mm}.titre{font-size:14pt;font-weight:700;margin-top:6px}
.m{font-family:'IBM Plex Mono',monospace;font-size:9pt;text-align:right;white-space:nowrap}
.m .s{color:#1D5C74}
.pat{margin:0 0 12px}.pat span{font-family:'IBM Plex Mono',monospace;font-size:8.5pt;letter-spacing:.1em;color:#656C71;margin-right:6px}
h3{font-size:12pt;color:#1D5C74;margin:16px 0 6px}h3 b{font-family:'IBM Plex Mono',monospace;color:#A8331F;margin-right:6px}
.k{font-family:'IBM Plex Mono',monospace;font-size:8pt;letter-spacing:.08em;color:#656C71;text-transform:uppercase;margin-top:8px}
.v{white-space:pre-wrap;min-height:1em}
ol{padding-left:18px}li{margin:8px 0}li span{font-family:'IBM Plex Mono',monospace;font-size:10pt}
.pj li{margin:3px 0}
footer{margin-top:24px;display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:8.5pt;color:#656C71;border-top:1px solid #D8D2C6;padding-top:6px}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}`

/** En-tête officiel commun à tous les documents imprimés. */
export function enteteHtml({ titre, date, medecin, service, patient }) {
  return `<header><div><div class="logo">${logoSvgTexte}</div><div class="titre">${esc(titre)}</div></div>
<div class="m">${esc(date)}<br>${esc(medecin)}<br><span class="s">${esc(String(service || '').toUpperCase())}</span></div></header>
${patient ? `<p class="pat"><span>PATIENT</span><strong>${esc(patient)}</strong></p>` : ''}`
}

export function piedHtml(gauche, droite) {
  return `<footer><span>${esc(gauche)}</span><span>${esc(droite)}</span></footer>`
}

/** Ouvre une fenêtre d'impression contenant le document. */
export function imprimer({ titre, corps, page = 'A4', marge = '12mm', style = STYLE_DOC }) {
  const w = window.open('', '_blank')
  if (!w) { alert("Autorisez les fenêtres surgissantes pour imprimer."); return }
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(titre)}</title>${POLICES}<style>@page{size:${page};margin:${marge}}${style}</style></head><body>${corps}</body></html>`)
  w.document.close()
  setTimeout(() => { try { w.focus(); w.print() } catch { /* fenêtre fermée */ } }, 700)
}

/** Télécharge le document au format PDF. */
export async function telechargerPdf({ nomFichier, corps, format = 'a4' }) {
  const { default: html2pdf } = await import('html2pdf.js')
  const conteneur = document.createElement('div')
  conteneur.innerHTML = `<style>${STYLE_DOC.replace(/body\{/, '.pdf-doc{')}</style><div class="pdf-doc" style="padding:4mm;width:186mm;background:#fff">${corps}</div>`
  await html2pdf().set({
    margin: 12, filename: nomFichier,
    image: { type: 'jpeg', quality: 0.96 },
    html2canvas: { scale: 2, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format, orientation: 'portrait' },
  }).from(conteneur).save()
}

// Au-delà, certaines messageries tronquent le lien mailto.
const LONGUEUR_MAX = 1800

/** Ouvre la messagerie avec un e-mail prérempli : destinataire, objet et texte du document. */
export function envoyerParEmail({ destinataire = '', sujet, texte }) {
  let corps = `Bonjour,\n\nVeuillez trouver ci-dessous votre document de l'Hôpital M&M.\n\n${texte}\n\n—\nHôpital M&M`
  if (corps.length > LONGUEUR_MAX) {
    corps = corps.slice(0, LONGUEUR_MAX) + '\n\n[…] Document complet : joignez le PDF (bouton « Télécharger en PDF »).'
  }
  const adresse = String(destinataire).replace(/[\s?&#]/g, '')
  window.location.href = `mailto:${adresse}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`
}
