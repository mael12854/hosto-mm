// Livret « Mon opération » à imprimer (A5), rempli d'après l'intervention choisie dans le catalogue.
import { date, esc } from './format.js'
import { adresseSite, siteDe } from './sites.jsx'
import { COMMUN, ficheIntervention, horairesJeun } from './interventions.js'
import { logoSvgTexte, signeSvgTexte } from '../components/Logo.jsx'

const BLEU = '#1D5C74', ROUGE = '#A8331F', ENCRE = '#1E262B', GRIS = '#656C71', FILET = '#D8D2C6', PAPIER = '#F4F1EA'

const ANESTHESIE = {
  'Générale': "Le patient est complètement endormi pendant toute l'opération : il ne sent rien et ne se souvient de rien. Pour un enfant, l'endormissement se fait souvent avec un masque qui sent bon, puis on pose la perfusion quand il dort.",
  'Locorégionale': "On endort seulement la partie du corps opérée (un bras, une jambe…) avec une piqûre près des nerfs. Le patient peut rester réveillé ou somnoler.",
  'Locale': "On endort seulement la zone opérée avec une petite piqûre ou une crème. Le patient reste réveillé et peut parler à l'équipe.",
  'Sédation': "Le patient est très détendu et somnole grâce à un médicament, sans être complètement endormi.",
}

const STYLE = `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:'Source Sans 3',sans-serif;color:${ENCRE};font-size:10pt;line-height:1.38;background:#fff}
.page{height:182mm;display:flex;flex-direction:column;gap:3mm;page-break-after:always;break-after:page;overflow:hidden}
.page:last-child{page-break-after:auto;break-after:auto}
.tete{display:flex;justify-content:space-between;align-items:baseline;border-bottom:0.6mm solid ${BLEU};padding-bottom:2mm}
.tete h2{margin:0;font-size:14pt}.tete .n{font-family:'IBM Plex Mono',monospace;font-size:8pt;color:${BLEU}}
.pied{margin-top:auto;display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:7pt;color:${GRIS};border-top:0.2mm solid ${FILET};padding-top:1.5mm}
.k{font-family:'IBM Plex Mono',monospace;font-size:7pt;letter-spacing:.08em;color:${GRIS};text-transform:uppercase}
.v{font-size:11pt}
.grille{display:grid;grid-template-columns:1fr 1fr;gap:2.5mm 5mm}
.case{border-bottom:0.2mm solid ${FILET};padding-bottom:1.2mm}
.fort{background:${PAPIER};border-left:1.2mm solid ${BLEU};padding:2.5mm 3mm}
.fort .grand{font-family:'IBM Plex Mono',monospace;font-size:18pt;color:${ENCRE};line-height:1.1}
.alerte{border:0.5mm solid ${ROUGE};padding:2.5mm 3mm}.alerte .k{color:${ROUGE}}
ul{margin:0;padding-left:4.5mm}li{margin:0.8mm 0}
.coche li{list-style:none;margin-left:-4.5mm;padding-left:6mm;position:relative}
.coche li::before{content:'';position:absolute;left:0;top:1.2mm;width:3mm;height:3mm;border:0.3mm solid ${BLEU}}
h3{margin:1mm 0 0;font-size:10.5pt;color:${BLEU}}
p{margin:0}
.jeun{width:100%;border-collapse:collapse;font-size:9.5pt}
.jeun td{border-bottom:0.2mm solid ${FILET};padding:1.6mm 1.5mm;vertical-align:top}
.jeun td.h{font-family:'IBM Plex Mono',monospace;font-size:11pt;white-space:nowrap;text-align:right;color:${ENCRE}}
.lignes div{border-bottom:0.2mm solid ${FILET};height:7mm}
.couv{border-top:12mm solid ${BLEU};border-bottom:1.2mm solid ${ROUGE};padding:10mm 2mm 4mm;justify-content:space-between}
.couv .sig{width:34mm}
.couv h1{font-size:30pt;line-height:1;margin:0;letter-spacing:-.02em}
.couv .sous{font-size:13pt;font-weight:600;margin-top:3mm;color:${BLEU}}
.couv .id{border-top:0.5mm solid ${BLEU};padding-top:4mm;display:grid;gap:1mm}
.couv .nom{font-size:17pt;font-weight:700}.couv .mono{font-family:'IBM Plex Mono',monospace;font-size:8.5pt;letter-spacing:.08em;color:${GRIS}}
.couv .logo{width:50mm}
`

const heure = d => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')
/** Heure, précédée de « la veille, » si elle tombe le jour d'avant l'opération. */
const heureJ = (d, jour) => (new Date(d).toDateString() !== new Date(jour).toDateString() ? `la veille, ${heure(d)}` : heure(d))
const jourLong = d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const liste = (items, cls = '') => (items.length ? `<ul class="${cls}">${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '')

/** Contenu HTML du livret (pages A5). op : opération ; patient ; site ; chirurgien (nom affiché). */
export function livretHtml({ op, patient, site, chirurgien }) {
  const f = ficheIntervention(op.code_intervention)
  const nom = `${patient?.prenom || ''} ${patient?.nom || ''}`.trim()
  const titre = op.intervention || f.nom
  const j = horairesJeun(op.debut)
  const cote = op.cote && op.cote !== 'Sans objet' ? op.cote : ''
  const anesthesie = op.anesthesie || f.anesthesie
  let n = 0
  const pied = () => `<div class="pied"><span>MON OPÉRATION${nom ? ` · ${esc(nom.toUpperCase())}` : ''}</span><span>HÔPITAL M&amp;M · P. ${++n}</span></div>`
  const tete = (t, num) => `<div class="tete"><h2>${esc(t)}</h2><span class="n">${num}</span></div>`

  return [
    `<section class="page couv">
      <div class="sig">${signeSvgTexte}</div>
      <div><h1>Mon<br>opération</h1><div class="sous">${esc(titre)}${cote ? ` · côté ${esc(cote.toLowerCase())}` : ''}</div></div>
      <div class="id">
        <div class="mono">PATIENT</div><div class="nom">${esc(nom)}</div>
        <div class="mono">${esc(jourLong(op.debut).toUpperCase())}${site ? ` · ${esc(siteDe(site.nom).toUpperCase())}` : ''}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:6mm"><div class="logo">${logoSvgTexte}</div><span class="mono">À GARDER ET À APPORTER</span></div>
      </div>
    </section>`,

    `<section class="page">${tete('Mon rendez-vous', '01')}
      <div class="fort"><div class="k">Arrivée à l'hôpital</div><div class="grand">${esc(heure(j.arrivee))}</div><div class="v">${esc(jourLong(op.debut))}</div></div>
      <div class="grille">
        <div class="case"><div class="k">Heure prévue de l'opération</div><div class="v">${esc(heure(op.debut))}</div></div>
        <div class="case"><div class="k">Durée prévue</div><div class="v">${Math.round((new Date(op.fin) - new Date(op.debut)) / 60000)} min environ</div></div>
        <div class="case"><div class="k">Intervention</div><div class="v">${esc(titre)}</div></div>
        <div class="case"><div class="k">Côté</div><div class="v">${esc(cote || '—')}</div></div>
        <div class="case"><div class="k">Anesthésie</div><div class="v">${esc(anesthesie)}</div></div>
        <div class="case"><div class="k">Séjour</div><div class="v">${esc(op.sejour || f.sejour)}</div></div>
        <div class="case"><div class="k">Chirurgien</div><div class="v">${esc(chirurgien || '—')}</div></div>
        <div class="case"><div class="k">Service</div><div class="v">${esc(patient?.service || f.service || '—')}</div></div>
      </div>
      ${site ? `<div class="case"><div class="k">Adresse</div><div class="v">Hôpital M&amp;M, ${esc(siteDe(site.nom))}<br>${esc(adresseSite(site))}</div></div>` : ''}
      <p style="font-size:9pt;color:${GRIS}">L'heure de l'opération peut changer de quelques heures selon les urgences du jour. Merci d'arriver à l'heure indiquée.</p>
      ${pied()}</section>`,

    `<section class="page">${tete('Mon opération, c\'est quoi ?', '02')}
      <h3>${esc(f.nom)}</h3><p>${esc(f.description)}</p>
      <h3>L'anesthésie : ${esc(anesthesie.toLowerCase())}</h3><p>${esc(ANESTHESIE[anesthesie] || ANESTHESIE['Générale'])}</p>
      <p>Une consultation avec le médecin anesthésiste a lieu avant l'opération. C'est le moment de poser toutes les questions.</p>
      <h3>Mes questions pour l'équipe</h3>
      <div class="lignes">${'<div></div>'.repeat(7)}</div>
      ${pied()}</section>`,

    `<section class="page">${tete('Avant : je me prépare', '03')}
      <div class="alerte" style="border-color:${BLEU}"><div class="k" style="color:${BLEU}">Je suis à jeun : horaires à respecter</div>
        <table class="jeun">
          <tr><td>Dernier repas solide, lait (biberon), chewing-gum, bonbon</td><td class="h">${esc(heureJ(j.solides, op.debut))}</td></tr>
          <tr><td>Dernière tétée (lait maternel)</td><td class="h">${esc(heureJ(j.laitMaternel, op.debut))}</td></tr>
          <tr><td>Dernière boisson claire : eau, sirop, jus sans pulpe (pas de lait)</td><td class="h">${esc(heureJ(j.liquides, op.debut))}</td></tr>
        </table>
        <p style="font-size:8.5pt;color:${GRIS};margin-top:1mm">Horaires calculés pour une arrivée à ${esc(heure(j.arrivee))} le ${esc(date(op.debut))}. Sans jeûne respecté, l'opération est reportée.</p>
      </div>
      ${op.consignes_preop ? `<div class="fort"><div class="k">Consignes de votre médecin</div><p style="white-space:pre-wrap">${esc(op.consignes_preop)}</p></div>` : ''}
      <h3>Je me prépare</h3>${liste([...f.preparation, ...COMMUN.preparation], 'coche')}
      ${pied()}</section>`,

    `<section class="page">${tete('Le jour de l\'opération', '04')}
      <h3>Dans mon sac</h3>${liste(COMMUN.valise, 'coche')}
      <h3>Comment ça se passe</h3>${liste(COMMUN.jourJ)}
      ${pied()}</section>`,

    `<section class="page">${tete('Après l\'opération', '05')}
      ${liste(f.apres)}
      <div class="grille">
        <div class="case"><div class="k">Retour à l'école</div><div class="v">${esc(f.reprise.ecole)}</div></div>
        <div class="case"><div class="k">Sport</div><div class="v">${esc(f.reprise.sport)}</div></div>
      </div>
      <div class="case"><div class="k">Contrôle</div><div class="v">${esc(f.controle)}</div></div>
      ${op.consignes_sortie ? `<div class="fort"><div class="k">Consignes de sortie</div><p style="white-space:pre-wrap">${esc(op.consignes_sortie)}</p></div>` : ''}
      ${pied()}</section>`,

    `<section class="page">${tete('Quand appeler ?', '06')}
      <div class="alerte"><div class="k">Appelez ou revenez si</div>${liste([...f.alerte, ...COMMUN.alerte])}</div>
      <div class="grille">
        <div class="case"><div class="k">Urgence vitale</div><div class="v" style="font-family:'IBM Plex Mono',monospace;font-size:16pt">15</div></div>
        <div class="case"><div class="k">Hôpital M&amp;M</div><div class="v">${site ? `${esc(siteDe(site.nom))}${site.telephone ? ` · ${esc(site.telephone)}` : ''}` : ''}<br><span style="font-size:9pt">Message possible dans « Mon Hôpital M&amp;M »</span></div></div>
      </div>
      <h3>Mes notes</h3><div class="lignes">${'<div></div>'.repeat(6)}</div>
      ${pied()}</section>`,
  ].join('')
}

/** Ouvre le livret prêt à imprimer. */
export function imprimerLivret(donnees) {
  const nom = `${donnees.patient?.prenom || ''} ${donnees.patient?.nom || ''}`.trim()
  const w = window.open('', '_blank')
  if (!w) { alert('Autorisez les fenêtres surgissantes pour imprimer.'); return }
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Mon opération${nom ? ` — ${esc(nom)}` : ''}</title>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>@page{size:A5;margin:10mm}${STYLE}</style></head><body>${livretHtml(donnees)}</body></html>`)
  w.document.close()
  setTimeout(() => { try { w.focus(); w.print() } catch { /* fenêtre fermée */ } }, 900)
}
