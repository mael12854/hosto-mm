// Dossier opératoire à imprimer (A4) : une pièce par page, pré-remplie avec l'identité et l'opération.
// Les pièces proposées dépendent du parcours : ambulatoire ou hospitalisation, mineur ou majeur,
// type d'anesthésie, côté opéré, allergie, pose d'un implant. Chaque pièce peut être ajoutée ou retirée.
import { date, dateHeure, esc } from './format.js'
import { adresseSite, siteDe } from './sites.jsx'
import { ALDRETE, CHAMPS_CR, CHECKLIST, HEURES } from './operations.js'
import { COMMUN, ficheIntervention, horairesJeun } from './interventions.js'
import { logoSvgTexte } from '../components/Logo.jsx'
import { imprimer } from './impression.js'

const BLEU = '#1D5C74', ROUGE = '#A8331F', GRIS = '#656C71', FILET = '#D8D2C6', PAPIER = '#F4F1EA'

export const STYLE_DOSSIER = `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:'Source Sans 3',sans-serif;color:#1E262B;font-size:10.5pt;line-height:1.4}
.page{page-break-after:always;break-after:page;display:flex;flex-direction:column;gap:2.6mm;min-height:268mm}
.page:last-child{page-break-after:auto;break-after:auto}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:6mm;border-bottom:0.7mm solid ${BLEU};padding-bottom:2.5mm}
header .logo{width:52mm}header .adr{font-family:'IBM Plex Mono',monospace;font-size:7.5pt;color:${GRIS};margin-top:1mm}
header .t{text-align:right}header h1{margin:0;font-size:15pt;line-height:1.15}header .n{font-family:'IBM Plex Mono',monospace;font-size:8pt;color:${BLEU};letter-spacing:.08em}
.bandeau{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:0;border:0.3mm solid ${FILET};background:${PAPIER}}
.bandeau div{padding:1.6mm 2.4mm;border-left:0.3mm solid ${FILET}}.bandeau div:first-child{border-left:0}
.k{font-family:'IBM Plex Mono',monospace;font-size:7pt;letter-spacing:.08em;color:${GRIS};text-transform:uppercase}
.v{font-size:10.5pt;min-height:5mm}
.grille{display:grid;grid-template-columns:repeat(3,1fr);gap:2.5mm 5mm}.grille.deux{grid-template-columns:1fr 1fr}.grille.quatre{grid-template-columns:repeat(4,1fr)}
.case{border-bottom:0.25mm solid ${FILET};padding-bottom:1mm}
h2{margin:0.6mm 0 0;font-size:11pt;color:${BLEU}}
p{margin:0}.petit{font-size:9pt;color:${GRIS}}
ul{margin:0;padding-left:5mm}li{margin:0.5mm 0}
.alerte{border:0.5mm solid ${ROUGE};padding:2mm 3mm}.alerte .k,.alerte .v{color:${ROUGE}}.alerte .v{font-weight:700}
.encadre{background:${PAPIER};border-left:1.2mm solid ${BLEU};padding:2mm 3mm}
.sigs{display:grid;grid-template-columns:repeat(auto-fit,minmax(55mm,1fr));gap:4mm;margin-top:auto}
.sig{border:0.3mm solid ${BLEU};padding:2mm 2.5mm;display:grid;gap:1.2mm;break-inside:avoid}
.sig .r{font-weight:600;font-size:9.5pt;color:${BLEU}}
.sig .l{border-bottom:0.25mm solid ${FILET};min-height:6mm;font-size:9.5pt;padding-top:1mm}
.sig.court{gap:0.8mm;padding:1.5mm 2.5mm}.sig.court .zone{height:11mm}
.sig .zone{height:15mm;border:0.25mm dashed ${FILET};position:relative}
.sig .zone::after{content:'Signature';position:absolute;left:2mm;top:1mm;font-family:'IBM Plex Mono',monospace;font-size:6.5pt;color:${GRIS};letter-spacing:.08em;text-transform:uppercase}
.fait{display:flex;gap:6mm;font-size:10pt}.fait span{flex:1;border-bottom:0.25mm solid ${FILET};padding-bottom:1mm}
table{width:100%;border-collapse:collapse;font-size:9.5pt}
th{font-family:'IBM Plex Mono',monospace;font-size:7pt;letter-spacing:.06em;color:${GRIS};font-weight:400;text-align:left;border-bottom:0.35mm solid ${BLEU};padding:1.2mm 1.5mm;text-transform:uppercase}
td{border-bottom:0.25mm solid ${FILET};padding:0.9mm 1.5mm;vertical-align:top}
.serre td{padding:0.45mm 1.5mm;font-size:8.8pt;line-height:1.3}.serre th{padding:0.8mm 1.5mm}
.quadr td{border-left:0.25mm solid ${FILET}}.quadr td:first-child{border-left:0}
td.c{text-align:center;width:11mm}
.boite{display:inline-block;width:3.6mm;height:3.6mm;border:0.35mm solid ${BLEU};vertical-align:-0.6mm;text-align:center;line-height:3mm;font-size:9pt;font-weight:700;color:${BLEU}}
.coche{display:grid;gap:1.6mm}.coche div{display:flex;gap:2.5mm;align-items:baseline}.coche .lg{flex:1;border-bottom:0.25mm solid ${FILET}}
.vide td{height:6.6mm}
.etiquettes{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.etiquettes div{border:0.3mm dashed ${GRIS};height:22mm;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:7.5pt;color:${GRIS}}
.lignes div{border-bottom:0.25mm solid ${FILET};height:6mm}
.sommaire{columns:2;column-gap:8mm;font-size:9.5pt}.sommaire div{display:flex;gap:2mm;break-inside:avoid;margin:0.6mm 0}.sommaire .num{font-family:'IBM Plex Mono',monospace;color:${BLEU};width:6mm}
footer{display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:7.5pt;color:${GRIS};border-top:0.25mm solid ${FILET};padding-top:1.5mm}
`

export const boite = ok => `<span class="boite">${ok ? '✓' : ''}</span>`
export const coches = items => `<div class="coche">${items.map(t => `<div>${boite(false)}<span class="lg">${t}</span></div>`).join('')}</div>`
const ouiNon = (lignes, cols = ['Oui', 'Non']) => `<table class="serre"><thead><tr><th></th>${cols.map(c => `<th class="c">${c}</th>`).join('')}<th>Précisions</th></tr></thead><tbody>
${lignes.map(l => `<tr><td>${l}</td>${cols.map(() => `<td class="c">${boite(false)}</td>`).join('')}<td></td></tr>`).join('')}</tbody></table>`
const vides = (n, cols) => ('<tr>' + '<td></td>'.repeat(cols) + '</tr>').repeat(n)
export const champ = (k, v = '', style = '') => `<div class="case"><div class="k">${k}</div><div class="v"${style ? ` style="${style}"` : ''}>${v}</div></div>`
const TIRETS = '……………………………'
/** Date et heure, ou pointillés à remplir (papiers vierges). */
const dh = d => (d ? dateHeure(d) : '…… / …… · …… h ……')
const dd = d => (d ? date(d) : '…… / …… / ……')
export const fait = () => `<div class="fait"><span>Fait à</span><span>le</span></div>`

/** Case de signature ; court : nom + signature seulement (pages chargées). */
export function signature(role, nom = '', court = false) {
  if (court) return `<div class="sig court"><div class="r">${esc(role)}</div><div class="l">${esc(nom || '')}</div><div class="zone"></div></div>`
  return `<div class="sig"><div class="r">${esc(role)}</div><div class="k">Nom et prénom</div><div class="l">${esc(nom || '')}</div>
<div class="k">Date et heure</div><div class="l"></div><div class="zone"></div></div>`
}

function age(naissance, le) {
  if (!naissance) return null
  const n = new Date(naissance + 'T12:00:00'), d = new Date(le)
  let ans = d.getFullYear() - n.getFullYear()
  if (d.getMonth() < n.getMonth() || (d.getMonth() === n.getMonth() && d.getDate() < n.getDate())) ans--
  return ans
}

/** Mineur à la date de l'opération ? */
export const estMineur = (naissance, le = new Date()) => { const a = age(naissance, le); return a != null && a < 18 }

/** Contexte commun à toutes les pièces. */
const FICHE_VIERGE = { description: '', apres: [], alerte: [], reprise: { ecole: '', sport: '' }, controle: '', sejour: '', anesthesie: '' }

function contexte({ op, patient: p, site, salle, chirurgien, mineur, vierge }) {
  const f = vierge ? FICHE_VIERGE : ficheIntervention(op.code_intervention)
  const sejour = op.sejour || f.sejour
  return {
    op, p, f, site, salle, chirurgien, mineur: !!mineur, sejour: vierge ? '……………………' : sejour,
    ambu: /^ambulatoire/i.test(sejour), age: age(p.date_naissance, op.debut),
    nom: `${p.prenom || ''} ${p.nom || ''}`.trim(),
    cote: vierge ? '……………' : op.cote && op.cote !== 'Sans objet' ? op.cote : 'Sans objet',
    anesthesie: op.anesthesie || f.anesthesie,
    j: op.debut ? horairesJeun(op.debut) : { arrivee: null, solides: null, laitMaternel: null, liquides: null },
    heures: op.heures || {}, ch: op.compte_rendu || {}, vierge: !!vierge,
    adresse: [p.adresse, p.complement_adresse, [p.code_postal, p.ville].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    representant: vierge ? 'Patient ou représentant légal' : mineur ? 'Représentant légal' : 'Patient',
  }
}

// ——— Silhouette pour le marquage du site opératoire (vue de face : la droite du patient est à gauche). ———
function silhouette(cote) {
  const r = c => (cote === c || cote === 'Bilatéral' ? ROUGE : '#B9B2A4')
  const corps = x => `<g transform="translate(${x},0)" fill="none" stroke-width="1.6">
<circle cx="60" cy="22" r="14" stroke="#8F887B"/><rect x="40" y="40" width="40" height="70" rx="8" stroke="#8F887B"/>
<path d="M40 48 L18 100" stroke="${r('Droit')}"/><path d="M80 48 L102 100" stroke="${r('Gauche')}"/>
<path d="M50 110 L44 182" stroke="${r('Droit')}"/><path d="M70 110 L76 182" stroke="${r('Gauche')}"/></g>`
  return `<svg viewBox="0 0 300 200" width="100%" style="max-height:62mm;display:block" xmlns="http://www.w3.org/2000/svg">
${corps(20)}${corps(160)}
<text x="80" y="198" font-size="9" text-anchor="middle" fill="${GRIS}" font-family="IBM Plex Mono,monospace">FACE</text>
<text x="220" y="198" font-size="9" text-anchor="middle" fill="${GRIS}" font-family="IBM Plex Mono,monospace">DOS</text>
<text x="34" y="44" font-size="10" fill="${r('Droit')}" font-family="IBM Plex Mono,monospace">D</text><text x="120" y="44" font-size="10" fill="${r('Gauche')}" font-family="IBM Plex Mono,monospace">G</text>
<text x="174" y="44" font-size="10" fill="${r('Gauche')}" font-family="IBM Plex Mono,monospace">G</text><text x="260" y="44" font-size="10" fill="${r('Droit')}" font-family="IBM Plex Mono,monospace">D</text>
</svg>`
}

// ——— Registre des pièces : [code, titre, groupe, proposée par défaut ?, raison affichée] ———
const PIECES = [
  // Admission et consentements
  ['garde', "Fiche d'identification", 'Admission', () => true, 'Toujours'],
  ['questionnaire', 'Questionnaire pré-anesthésique', 'Admission', c => c.anesthesie !== 'Locale', 'Anesthésie générale, locorégionale ou sédation'],
  ['consentement', "Consentement éclairé à l'intervention", 'Admission', () => true, 'Toujours'],
  ['anesthesie', "Consultation et consentement d'anesthésie", 'Admission', c => c.anesthesie !== 'Locale', 'Anesthésie générale, locorégionale ou sédation'],
  ['mineur', "Autorisation d'opérer un mineur", 'Admission', c => c.mineur, 'Patient mineur'],
  ['confiance', 'Désignation de la personne de confiance', 'Admission', c => !c.mineur, 'Patient majeur'],
  ['charte_ambu', "Charte de la chirurgie ambulatoire", 'Admission', c => c.ambu, 'Sortie le jour même'],
  ['appel_veille', "Appel de la veille", 'Admission', c => c.ambu, 'Sortie le jour même'],
  ['admission', 'Admission et inventaire des effets personnels', 'Admission', c => !c.ambu, 'Hospitalisation'],
  ['parent_nuit', "Présence d'un parent la nuit", 'Admission', c => !c.ambu && c.mineur, 'Enfant hospitalisé'],
  // Bloc
  ['allergie', 'Alerte allergie', 'Bloc', c => !!c.p.allergies?.trim() && !/^aucune/i.test(c.p.allergies.trim()), 'Allergie connue'],
  ['marquage', 'Marquage du site opératoire', 'Bloc', c => c.cote !== 'Sans objet', 'Côté à opérer'],
  ['preparation', 'Préparation pré-opératoire', 'Bloc', () => true, 'Toujours'],
  ['liaison_bloc', 'Fiche de liaison service → bloc', 'Bloc', () => true, 'Toujours'],
  ['checklist', 'Check-list « Sécurité du patient au bloc »', 'Bloc', () => true, 'Toujours'],
  ['comptage', 'Comptage des textiles et instruments', 'Bloc', c => c.anesthesie !== 'Locale', 'Intervention au bloc'],
  ['dmi', 'Traçabilité des dispositifs implantables', 'Bloc', c => !!c.f.implant, 'Pose d\'un implant'],
  ['surveillance', 'Surveillance per- et post-opératoire', 'Bloc', () => true, 'Toujours'],
  ['cr', 'Compte-rendu opératoire', 'Bloc', () => true, 'Toujours'],
  // Après l'opération
  ['douleur', 'Évaluation de la douleur', 'Après', () => true, 'Toujours'],
  ['plan_soins', 'Plan de soins post-opératoire J0 → J3', 'Après', c => !c.ambu, 'Hospitalisation'],
  ['thrombose', 'Prévention de la thrombose veineuse', 'Après', c => !c.ambu && !c.mineur, 'Adulte hospitalisé'],
  ['chung', 'Critères de sortie ambulatoire (score de Chung)', 'Après', c => c.ambu, 'Sortie le jour même'],
  ['sortie', 'Prescriptions et autorisation de sortie', 'Après', () => true, 'Toujours'],
  ['consignes', 'Consignes de sortie remises', 'Après', () => true, 'Toujours'],
  ['appel_lendemain', 'Appel du lendemain', 'Après', c => c.ambu, 'Sortie le jour même'],
  ['lettre', 'Lettre de liaison au médecin traitant', 'Après', () => true, 'Toujours'],
  ['certificats', 'Certificats et attestations', 'Après', () => true, 'Toujours'],
]

/** Liste des pièces disponibles pour cette opération, avec celles proposées par défaut. */
export function piecesDossier(d) {
  const c = contexte(d)
  return PIECES.map(([code, titre, groupe, quand, raison]) => ({ code, titre, groupe, defaut: !!quand(c), raison }))
}

// ——— Corps de chaque pièce ———
const CORPS = {
  garde: (c, liste) => `
    <div class="grille">
      ${champ('Intervention', `<strong>${esc(c.op.intervention || TIRETS)}</strong>`)}${champ('Côté', `<strong>${esc(c.cote)}</strong>`)}${champ('Anesthésie', esc(c.anesthesie))}
      ${champ('Date et heure', esc(dh(c.op.debut)))}${champ('Durée prévue', `${c.op.debut ? `${Math.round((new Date(c.op.fin) - new Date(c.op.debut)) / 60000)} min` : ''}`)}${champ('Séjour', esc(c.sejour))}
      ${champ('Site · salle', `${esc(c.site?.nom || '—')} · ${esc(c.salle?.nom || '—')}`)}${champ('Chirurgien', esc(c.chirurgien || '—'))}${champ('Anesthésiste', esc(c.op.anesthesiste || ''))}
      ${champ('Service', esc(c.p.service || '—'))}${champ('Âge · sexe · groupe', `${c.age != null ? `${c.age} ans` : '—'} · ${esc(c.p.sexe === 'F' ? 'F' : c.p.sexe === 'M' ? 'M' : '—')} · ${esc(c.p.groupe_sanguin || '—')}`)}${champ('Équipe', esc(c.op.equipe || ''))}
    </div>
    <div class="alerte"><div class="k">Allergies</div><div class="v">${esc(c.p.allergies || (c.vierge ? '' : 'Aucune connue — à vérifier'))}</div></div>
    <div class="grille deux">
      ${champ('Antécédents', esc(c.p.antecedents || ''), 'white-space:pre-wrap')}${champ('Traitement en cours', esc(c.p.traitement_en_cours || ''), 'white-space:pre-wrap')}
      ${champ('Personne à prévenir', esc([c.p.contact_urgence_nom, c.p.contact_urgence_lien && `(${c.p.contact_urgence_lien})`, c.p.contact_urgence_telephone].filter(Boolean).join(' ')))}${champ('Médecin traitant', esc(c.p.medecin_traitant || ''))}
    </div>
    <h2>Pièces de ce dossier · ${c.ambu ? 'parcours ambulatoire' : 'hospitalisation'}${c.mineur ? ' · patient mineur' : ''}</h2>
    <div class="sommaire">${liste.map((t, i) => `<div><span class="num">${String(i + 1).padStart(2, '0')}</span>${boite(false)}<span>${esc(t)}</span></div>`).join('')}</div>
    <h2>Étiquettes patient</h2><div class="etiquettes"><div>ÉTIQUETTE</div><div>ÉTIQUETTE</div><div>ÉTIQUETTE</div></div>`,

  questionnaire: c => `
    <p class="petit">À remplir par ${c.mineur ? 'les parents' : 'le patient'} avant la consultation d'anesthésie. Répondre à toutes les questions ; en cas de doute, cocher « Oui » et préciser.</p>
    <div class="grille quatre">${champ('Poids (kg)')}${champ('Taille (cm)')}${champ('Dernière opération')}${champ('Médecin traitant', esc(c.p.medecin_traitant || ''))}</div>
    ${ouiNon([
      'Allergie à un médicament, au latex, à un aliment, à un pansement',
      'Asthme, bronchite, essoufflement, toux en ce moment',
      'Rhume, fièvre, otite ou maladie contagieuse ces 15 derniers jours',
      'Ronflements, pauses respiratoires pendant le sommeil',
      'Maladie du cœur, souffle, malaise',
      'Saignements faciles (nez, gencives), bleus fréquents, règles abondantes',
      'Problème lors d\'une anesthésie (vous ou un membre de la famille)',
      'Nausées ou vomissements après une anesthésie',
      ...(c.mineur && (c.age ?? 18) < 12 ? ['Dents qui bougent, appareil dentaire', 'Naissance prématurée, vaccins non à jour'] : ['Dents fragiles, prothèse ou appareil dentaire', 'Tabac, alcool, autres produits']),
      'Diabète, épilepsie, maladie des reins ou du foie',
      'Médicaments pris régulièrement (y compris homéopathie, plantes)',
      ...(!c.mineur && c.p.sexe === 'F' ? ['Grossesse possible ou allaitement'] : []),
    ])}
    ${champ('Traitements en cours (nom, dose)', esc(c.p.traitement_en_cours || ''), 'min-height:12mm;white-space:pre-wrap')}
    ${champ('Autres informations utiles', '', 'min-height:10mm')}
    ${fait()}
    <div class="sigs">${signature(c.mineur ? 'Parent / représentant légal' : 'Patient', c.mineur ? '' : c.nom)}${signature('Lu par le médecin anesthésiste', c.op.anesthesiste)}</div>`,

  consentement: c => `
    <p>Je soussigné(e), patient ou représentant légal du patient, déclare avoir été informé(e) par le Dr <strong>${esc(c.chirurgien || '……………………')}</strong>,
    au cours d'une consultation, de l'intervention prévue : <strong>${esc(c.op.intervention || TIRETS)}</strong>${c.cote !== 'Sans objet' ? `, côté <strong>${esc(c.cote.toLowerCase())}</strong>` : ''}.</p>
    ${c.vierge ? `<div class="lignes"><div></div><div></div></div>` : `<p>${esc(c.f.description)}</p>`}
    <h2>J'ai été informé(e)</h2>
    <ul>
      <li>du but de l'intervention, de son déroulement et de sa durée prévisible ;</li>
      <li>des bénéfices attendus et des autres traitements possibles ;</li>
      <li>des risques fréquents et des risques graves, même rares (infection, saignement, cicatrice, complications liées à l'anesthésie) ;</li>
      <li>des suites habituelles${c.vierge ? ' ;' : ` : ${esc(c.f.apres.slice(0, 2).map(t => t.charAt(0).toLowerCase() + t.slice(1).replace(/\.$/, '')).join(' ; '))} ;`}</li>
      <li>${c.ambu ? 'des conditions de la chirurgie ambulatoire : sortie le jour même si tout va bien, accompagnant obligatoire, possibilité de rester une nuit si besoin ;' : `de la durée prévisible d'hospitalisation : ${esc(c.sejour)} ;`}</li>
      <li>de la possibilité qu'une découverte pendant l'opération nécessite un geste complémentaire indispensable.</li>
    </ul>
    <p>J'ai pu poser toutes mes questions et j'ai reçu des réponses claires. J'ai reçu le livret « Mon opération ». Je sais que je peux retirer mon consentement à tout moment avant l'intervention.</p>
    <div class="coche"><div>${boite(c.op.consentement_signe)}<span class="lg">J'accepte l'intervention proposée</span></div>
    <div>${boite(false)}<span class="lg">J'accepte une éventuelle transfusion de sang si elle est indispensable</span></div>
    <div>${boite(false)}<span class="lg">J'accepte que des photos de l'opération soient prises pour le dossier médical</span></div></div>
    ${fait()}
    <div class="sigs">${signature(c.mineur ? 'Représentant légal 1' : 'Patient', c.mineur ? '' : c.nom)}${c.mineur ? signature('Représentant légal 2') : ''}${signature('Chirurgien', c.chirurgien)}</div>`,

  anesthesie: c => `
    <div class="grille">
      ${champ('Consultation le', esc(dd(c.op.consult_anesthesie_le) || ''))}${champ('Anesthésiste', esc(c.op.anesthesiste || ''))}${champ("Type d'anesthésie prévu", esc(c.anesthesie))}
      ${champ('Score ASA', c.op.asa ? `ASA ${c.op.asa}` : '1 · 2 · 3 · 4')}${champ('Poids · taille')}${champ('Intubation difficile prévisible', `${boite(false)} non  ${boite(false)} oui`)}
    </div>
    <div class="alerte"><div class="k">Allergies</div><div class="v">${esc(c.p.allergies || '')}</div></div>
    <div class="grille deux">${champ('Antécédents anesthésiques')}${champ('Traitement à poursuivre ou arrêter', esc(c.p.traitement_en_cours || ''))}</div>
    <h2>Jeûne prescrit</h2>
    <table><tr><td>Solides, lait non maternel</td><td>jusqu'à ${esc(dh(c.j.solides))}</td></tr><tr><td>Lait maternel</td><td>jusqu'à ${esc(dh(c.j.laitMaternel))}</td></tr><tr><td>Liquides clairs</td><td>jusqu'à ${esc(dh(c.j.liquides))}</td></tr></table>
    <h2>Prémédication</h2><div class="lignes"><div></div><div></div></div>
    <p>J'ai été informé(e) du type d'anesthésie, de ses bénéfices et de ses risques, et des consignes de jeûne. J'ai pu poser mes questions. J'accepte l'anesthésie proposée et, si besoin, son adaptation par l'anesthésiste pendant l'intervention.</p>
    ${fait()}
    <div class="sigs">${signature(c.representant, c.mineur ? '' : c.nom)}${signature('Médecin anesthésiste', c.op.anesthesiste)}</div>`,

  mineur: c => `
    <p>Nous soussignés, titulaires de l'autorité parentale sur l'enfant <strong>${esc(c.nom || TIRETS)}</strong>, né(e) le <strong>${esc(dd(c.p.date_naissance) || '……')}</strong>,
    autorisons l'équipe de l'Hôpital M&amp;M à pratiquer l'intervention <strong>${esc(c.op.intervention || TIRETS)}</strong> ainsi que l'anesthésie nécessaire,
    et tout acte médical ou chirurgical urgent que son état rendrait indispensable.</p>
    ${['Parent / représentant légal 1', 'Parent / représentant légal 2'].map(t => `<h2>${t}</h2>
    <div class="grille">${champ('Nom et prénom')}${champ("Lien avec l'enfant")}${champ('Téléphone')}</div>
    ${champ('Adresse', esc(c.adresse))}`).join('')}
    ${coches(["Un seul parent signe : l'autre parent est informé et d'accord (acte usuel) ou l'autorité parentale est exercée seul(e) (joindre le justificatif)", "Nous autorisons la sortie de l'enfant accompagné de l'un de nous ou de la personne désignée ci-dessous"])}
    ${champ("Personne autorisée à reprendre l'enfant")}
    ${fait()}
    <div class="sigs">${signature('Parent / représentant légal 1')}${signature('Parent / représentant légal 2')}</div>`,

  confiance: c => `
    <p>Toute personne majeure peut désigner une personne de confiance (article L1111-6 du Code de la santé publique). Elle peut vous accompagner dans vos démarches, assister aux entretiens médicaux et être consultée si vous n'êtes plus en état d'exprimer votre volonté. Cette désignation est valable pour la durée de l'hospitalisation, sauf si vous en décidez autrement, et vous pouvez la modifier à tout moment.</p>
    ${coches(['Je ne souhaite pas désigner de personne de confiance', 'Je désigne la personne ci-dessous comme personne de confiance', 'Cette personne est aussi la personne à prévenir'])}
    <h2>Personne de confiance</h2>
    <div class="grille">${champ('Nom et prénom', esc(c.p.contact_urgence_nom || ''))}${champ('Lien', esc(c.p.contact_urgence_lien || ''))}${champ('Téléphone', esc(c.p.contact_urgence_telephone || ''))}</div>
    ${champ('Adresse')}
    ${coches(["Elle accepte d'être ma personne de confiance", "Je lui ai remis mes directives anticipées (ou je l'informe de leur existence)"])}
    ${fait()}
    <div class="sigs">${signature('Patient', c.nom)}${signature('Personne de confiance')}${signature('Soignant ayant recueilli la désignation')}</div>`,

  charte_ambu: c => `
    <p>La chirurgie ambulatoire permet de rentrer chez soi le jour même. Pour qu'elle se passe en toute sécurité, ${c.mineur ? 'les parents s\'engagent' : 'je m\'engage'} à respecter ces règles :</p>
    ${coches([
      `Respecter le jeûne : dernier repas avant ${esc(dh(c.j.solides))}, dernière boisson claire avant ${esc(dh(c.j.liquides))}`,
      'Prendre la douche pré-opératoire la veille et le matin, venir sans bijoux ni vernis',
      `Arriver à ${esc(dh(c.j.arrivee))} et prévenir en cas de retard, de fièvre ou d'empêchement`,
      `Être raccompagné(e) par un adulte${c.mineur && (c.age ?? 18) < 10 ? ' (deux adultes en voiture : un qui conduit, un qui surveille l\'enfant)' : ''} ; pas de transport en commun seul(e)`,
      'Ne pas rester seul(e) la première nuit ; un adulte reste présent jusqu\'au lendemain',
      ...(c.mineur ? ['Surveiller l\'enfant au retour : jeux calmes, pas de vélo ni de trottinette le jour même'] : ['Ne pas conduire, ne pas utiliser de machine, ne pas prendre de décision importante pendant 24 heures', 'Pas d\'alcool ni de somnifère pendant 24 heures']),
      'Habiter, la première nuit, à moins d\'une heure d\'un hôpital',
      'Être joignable par téléphone la veille et le lendemain de l\'opération',
      'Accepter de rester hospitalisé(e) une nuit si l\'équipe le juge nécessaire',
    ])}
    <h2>Retour et première nuit</h2>
    <div class="grille">${champ('Accompagnant (nom et prénom)')}${champ('Téléphone joignable')}${champ('Lien')}</div>
    ${champ('Adresse de la première nuit', esc(c.adresse))}
    ${fait()}
    <div class="sigs">${signature(c.representant, c.mineur ? '' : c.nom)}${signature('Infirmier(e) de l\'unité ambulatoire')}</div>`,

  appel_veille: c => `
    <div class="grille">${champ('Appel le')}${champ('Numéro appelé', esc(c.p.telephone || c.p.contact_urgence_telephone || ''))}${champ('Personne jointe')}</div>
    ${coches(['Joint(e) au 1er appel', 'Joint(e) après plusieurs appels — heures :', 'Non joint(e) : message laissé, médecin prévenu'])}
    <h2>Points vérifiés</h2>
    ${ouiNon([
      `Heure d'arrivée confirmée : ${esc(dh(c.j.arrivee))}, ${esc(c.site ? siteDe(c.site.nom) : '')}`,
      `Jeûne compris (solides avant ${esc(dh(c.j.solides))}, liquides clairs avant ${esc(dh(c.j.liquides))})`,
      'Douche pré-opératoire expliquée',
      'Pas de fièvre, rhume, toux, maladie contagieuse',
      'Traitements habituels : à prendre ou arrêter selon consignes',
      'Accompagnant prévu pour le retour et la nuit',
      'Documents à apporter : carte Vitale, carnet de santé, consentements, radios',
      ...(c.mineur ? ['Présence d\'un parent confirmée, doudou autorisé'] : []),
      'Questions du patient : réponses données',
    ])}
    ${champ('Remarques · conduite à tenir', '', 'min-height:16mm')}
    <div class="sigs">${signature('Infirmier(e) ayant appelé')}</div>`,

  admission: c => `
    <div class="grille">${champ("Date et heure d'entrée")}${champ('Chambre · lit', esc(c.p.num_chambre || ''))}${champ('Durée prévue', esc(c.sejour))}</div>
    <div class="grille">${champ('Régime alimentaire')}${champ('Personnes autorisées en visite')}${champ('Personnes à qui donner des nouvelles')}</div>
    <h2>Inventaire des effets personnels</h2>
    <table class="serre"><thead><tr><th>Objet</th><th class="c">Gardé</th><th class="c">Famille</th><th class="c">Coffre</th><th>Description</th></tr></thead><tbody>
    ${['Lunettes ou lentilles', 'Appareil dentaire', 'Appareil auditif', 'Bijoux, montre', 'Téléphone, tablette, chargeur', 'Argent, carte bancaire', 'Vêtements', 'Doudou, jouet, livre', 'Médicaments personnels', 'Autre']
      .map(o => `<tr><td>${o}</td><td class="c">${boite(false)}</td><td class="c">${boite(false)}</td><td class="c">${boite(false)}</td><td></td></tr>`).join('')}
    </tbody></table>
    <p class="petit">L'Hôpital M&amp;M n'est responsable que des objets déposés au coffre contre reçu. Les médicaments personnels sont confiés à l'équipe pendant le séjour.</p>
    ${coches(['Livret d\'accueil et règles de vie du service remis', 'Bracelet d\'identification posé', 'Sonnette et fonctionnement de la chambre expliqués'])}
    <div class="sigs">${signature(c.representant, c.mineur ? '' : c.nom)}${signature('Soignant ayant fait l\'inventaire')}</div>`,

  parent_nuit: c => `
    <p>Un parent peut rester auprès de <strong>${esc(c.nom || TIRETS)}</strong> pendant son hospitalisation, y compris la nuit, sur un lit d'accompagnant dans la chambre.</p>
    <h2>Parent accompagnant</h2>
    <div class="grille">${champ('Nom et prénom')}${champ("Lien avec l'enfant")}${champ('Téléphone')}</div>
    <div class="grille">${champ('Nuits du')}${champ('au')}${champ('Repas accompagnant', `${boite(false)} oui  ${boite(false)} non`)}</div>
    <h2>Je m'engage à</h2>
    ${coches([
      'Prévenir l\'équipe quand je quitte la chambre, même pour un moment',
      'Ne donner à manger ou à boire à l\'enfant qu\'avec l\'accord de l\'équipe',
      'Ne pas donner de médicament personnel à l\'enfant',
      'Respecter le repos des autres patients et les horaires du service',
      'Laisser l\'équipe faire les soins et la surveillance la nuit',
      'Signaler tout changement (douleur, vomissements, saignement, fièvre)',
    ])}
    ${champ('Second parent ou relais autorisé', '', '')}
    ${fait()}
    <div class="sigs">${signature('Parent accompagnant')}${signature('Cadre ou infirmier(e) du service')}</div>`,

  allergie: c => `
    <div class="alerte" style="padding:5mm 6mm"><div class="k" style="font-size:9pt">Patient allergique</div><div class="v" style="font-size:20pt;line-height:1.2;margin-top:2mm">${esc(c.p.allergies)}</div></div>
    <h2>Mesures à prendre</h2>
    ${ouiNon([
      'Bracelet ou étiquette « allergie » posé(e)',
      'Allergie inscrite sur la feuille d\'anesthésie et la check-list',
      'Anesthésiste informé(e)',
      'Chirurgien et équipe de bloc informés',
      'Antibioprophylaxie adaptée à l\'allergie',
      'Allergie au latex : salle et matériel sans latex, premier patient du programme',
      'Antiseptique et pansements compatibles',
      'Repas : cuisine et service prévenus (allergie alimentaire)',
      'Trousse d\'urgence (adrénaline) disponible',
    ], ['Oui', 'N/A'])}
    ${champ('Réaction connue (type, gravité, date)', '', 'min-height:14mm')}
    ${champ('Traitement en cas de réaction', '', 'min-height:12mm')}
    <div class="sigs">${signature('Médecin anesthésiste', c.op.anesthesiste)}${signature('Infirmier(e)')}</div>`,

  marquage: c => `
    <div class="alerte"><div class="k">Côté à opérer</div><div class="v" style="font-size:16pt">${esc(c.cote.toUpperCase())} · ${esc(c.op.intervention || TIRETS)}</div></div>
    <p>Le site opératoire est marqué sur la peau au feutre indélébile par le chirurgien, ${c.mineur ? 'en présence d\'un parent' : 'patient réveillé et participant'}, avant la prémédication. La marque doit rester visible après la préparation cutanée.</p>
    ${silhouette(c.cote)}
    <p class="petit">Vue de face : la droite du patient est à gauche du dessin. Entourer précisément la zone marquée.</p>
    ${ouiNon([
      `Côté confirmé avec ${c.mineur ? 'le parent' : 'le patient'} et le dossier (imagerie, consultation)`,
      'Marque visible après installation et badigeon',
      'Côté vérifié de nouveau au temps de pause de la check-list',
    ])}
    <div class="sigs">${signature('Chirurgien ayant marqué', c.chirurgien)}${signature(c.mineur ? 'Parent présent' : 'Patient', c.mineur ? '' : c.nom)}</div>`,

  preparation: c => `
    <table><thead><tr><th>Vérification</th><th class="c">Oui</th><th class="c">Non</th><th>Heure · remarque</th></tr></thead><tbody>
    ${['Douche pré-opératoire la veille', 'Douche pré-opératoire le matin', `Jeûne respecté (solides avant ${esc(dh(c.j.solides))})`, 'Bijoux, piercings, vernis, maquillage retirés', 'Lentilles, lunettes, appareil dentaire ou auditif retirés', "Bracelet d'identification posé et vérifié", `Site opératoire marqué (côté : ${esc(c.cote)})`, 'Prémédication donnée', 'Vessie vidée', 'Tenue de bloc', 'Consentements signés présents', 'Dossier, imagerie et bilan sanguin joints', 'Constantes prises (T°, FC, TA, SpO₂, poids)']
      .map(t => `<tr><td>${t}</td><td class="c">${boite(false)}</td><td class="c">${boite(false)}</td><td></td></tr>`).join('')}
    </tbody></table>
    <div class="grille">${champ('Départ au bloc à')}${champ('Accompagné par')}${champ(c.mineur ? 'Doudou / parent jusqu\'au bloc' : 'Objet personnel')}</div>
    <div class="sigs">${signature('Infirmier(e) du service')}${signature('Infirmier(e) du bloc (accueil)')}</div>`,

  liaison_bloc: c => `
    <div class="grille quatre">${champ('T° (°C)')}${champ('FC (/min)')}${champ('TA (mmHg)')}${champ('SpO₂ (%)')}${champ('Poids (kg)')}${champ('Douleur (0-10)')}${champ('Glycémie')}${champ('Dernière miction')}</div>
    <div class="grille deux">${champ('Dernier repas solide (heure réelle)')}${champ('Dernière boisson claire (heure réelle)')}</div>
    <h2>Dispositifs et risques</h2>
    ${ouiNon(['Perfusion ou cathéter', 'Sonde, drain, plâtre ou attelle', 'Risque infectieux (BMR, isolement)', 'Allergie' + (c.p.allergies ? ` : ${esc(c.p.allergies)}` : ''), 'Prothèse, implant, pacemaker', 'Handicap, troubles de la compréhension, langue étrangère', 'Anxiété importante'])}
    <h2>Prémédication et traitements donnés</h2>
    <table class="vide"><thead><tr><th>Médicament</th><th>Dose</th><th>Heure</th><th>Par</th></tr></thead><tbody>${vides(3, 4)}</tbody></table>
    ${champ('Transmissions particulières', '', 'min-height:14mm')}
    <div class="grille deux">${champ('Départ du service à')}${champ('Arrivée au bloc à')}</div>
    <div class="sigs">${signature('Infirmier(e) du service', '', true)}${signature('Infirmier(e) du bloc', '', true)}</div>`,

  checklist: c => `
    <p class="petit">Selon la check-list de la Haute Autorité de santé. Cocher « Oui » ou « N/A » (sans objet) ; toute réponse « Non » doit être résolue avant de poursuivre.</p>
    ${CHECKLIST.map(([, titre, items]) => `<h2>${esc(titre)}</h2><table class="serre"><thead><tr><th>Élément</th><th class="c">Oui</th><th class="c">Non</th><th class="c">N/A</th><th style="width:34mm">Par · heure</th></tr></thead><tbody>
      ${items.map(([cle, lib]) => { const x = c.op.checklist?.[cle]; return `<tr><td>${esc(lib)}</td><td class="c">${boite(x?.ok && !x?.na)}</td><td class="c">${boite(false)}</td><td class="c">${boite(x?.na)}</td><td class="petit">${x?.ok ? esc([x.par, x.le && new Date(x.le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })].filter(Boolean).join(' · ')) : ''}</td></tr>` }).join('')}
    </tbody></table>`).join('')}
    ${coches(["Décision : GO — l'intervention peut commencer", 'Décision : NO GO — intervention retardée ou annulée (motif au verso)'])}
    <div class="sigs">${signature('Coordonnateur check-list', '', true)}${signature('Chirurgien', c.chirurgien, true)}${signature('Anesthésiste', c.op.anesthesiste, true)}</div>`,

  comptage: c => `
    <p class="petit">Comptage à voix haute par l'instrumentiste et l'infirmier(e) circulant(e), à l'ouverture, avant la fermeture et en fin d'intervention. Tout écart est recherché avant la fermeture (radio si besoin).</p>
    <table class="quadr"><thead><tr><th>Élément</th><th>Initial</th><th>Ajouts</th><th>Avant fermeture</th><th>Final</th><th>Écart</th></tr></thead><tbody>
    ${['Compresses', 'Champs abdominaux / textiles', 'Tampons, mèches', 'Aiguilles', 'Lames de bistouri', 'Instruments (boîte)', 'Petits instruments séparés', 'Autres']
      .map(t => `<tr><td>${t}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}
    </tbody></table>
    <h2>Boîtes d'instruments</h2>
    <table class="vide"><thead><tr><th>Nom de la boîte</th><th>N° de stérilisation</th><th>Complète à l'ouverture</th><th>Complète à la fin</th></tr></thead><tbody>${vides(3, 4)}</tbody></table>
    ${coches(['Comptage final exact', 'Écart retrouvé et résolu', 'Écart non résolu : chirurgien informé, radio de contrôle faite'])}
    ${champ('Remarques', '', 'min-height:12mm')}
    <div class="sigs">${signature('Instrumentiste', '', true)}${signature('Circulant(e)', '', true)}${signature('Chirurgien', c.chirurgien, true)}</div>`,

  dmi: c => `
    <p>Tout dispositif médical implanté (broche, vis, plaque, aérateur, prothèse…) est tracé : désignation, fabricant, référence et numéro de lot. Coller les étiquettes du fabricant dans la dernière colonne.</p>
    <table class="quadr"><thead><tr><th>Désignation</th><th>Fabricant</th><th>Référence</th><th>N° de lot</th><th>Taille · qté</th><th style="width:42mm">Étiquette</th></tr></thead>
    <tbody>${'<tr style="height:19mm"><td></td><td></td><td></td><td></td><td></td><td></td></tr>'.repeat(6)}</tbody></table>
    ${coches(['Carte d\'implant ou document de traçabilité remis au patient', 'Information sur la conduite à tenir (surveillance, ablation prévue) donnée', `Ablation du matériel prévue : ${esc(c.f.code === 'aerateurs' ? 'chute spontanée habituelle, sinon ablation des ATT' : 'à décider au contrôle')}`])}
    <div class="sigs">${signature('Chirurgien', c.chirurgien, true)}${signature('Infirmier(e) de bloc', '', true)}</div>`,

  surveillance: c => `
    <h2>Horaires</h2>
    <div class="grille">${HEURES.map(([cle, lib]) => champ(esc(lib), c.heures[cle] ? esc(dateHeure(c.heures[cle])) : '')).join('')}</div>
    <h2>Surveillance</h2>
    <table class="vide"><thead><tr><th>Heure</th><th>FC</th><th>TA</th><th>SpO₂</th><th>T°</th><th>Douleur</th><th>Observations · traitements</th><th>Visa</th></tr></thead>
    <tbody>${vides(8, 8)}</tbody></table>
    <h2>Score d'Aldrete (sortie à partir de 9 / 10)</h2>
    <table class="serre"><thead><tr><th>Critère</th><th>0</th><th>1</th><th>2</th><th class="c">Entrée</th><th class="c">Sortie</th></tr></thead><tbody>
    ${ALDRETE.map(([cle, lib, niv]) => `<tr><td>${esc(lib)}</td>${niv.map(x => `<td class="petit">${esc(x)}</td>`).join('')}<td class="c"></td><td class="c">${c.op.reveil?.[cle] ?? ''}</td></tr>`).join('')}
    <tr><td><strong>Total</strong></td><td></td><td></td><td></td><td class="c"></td><td class="c"><strong>${c.op.reveil?.aldrete ?? ''}</strong></td></tr></tbody></table>
    <div class="sigs">${signature('Infirmier(e) de salle de réveil')}${signature('Sortie de salle de réveil autorisée par', c.op.anesthesiste)}</div>`,

  cr: c => `
    <div class="grille">
      ${champ('Opérateur', esc(c.chirurgien || ''))}${champ('Aides · équipe', esc(c.op.equipe || ''))}${champ('Anesthésie', esc([c.anesthesie, c.op.anesthesiste].filter(Boolean).join(' · ')))}
      ${champ('Incision', c.heures.incision ? esc(dateHeure(c.heures.incision)) : '')}${champ('Fin', c.heures.fin_intervention ? esc(dateHeure(c.heures.fin_intervention)) : '')}${champ('Côté', esc(c.cote))}
    </div>
    ${(() => {
      const bloc = ([cle, lib, nb]) => `<div class="case"><div class="k">${esc(lib)}</div>${c.ch[cle] ? `<div class="v" style="white-space:pre-wrap">${esc(c.ch[cle])}</div>` : `<div class="lignes">${'<div></div>'.repeat(nb > 2 ? nb - 1 : nb)}</div>`}</div>`
      const courts = CHAMPS_CR.filter(x => x[2] === 1), longs = CHAMPS_CR.filter(x => x[2] > 1)
      return longs.slice(0, 4).map(bloc).join('') + `<div class="grille deux">${courts.map(bloc).join('')}</div>` + longs.slice(4).map(bloc).join('')
    })()}
    <div class="sigs">${signature('Chirurgien', c.chirurgien)}</div>`,

  douleur: c => {
    const enfant = c.age != null && c.age < 7
    const temps = ['Réveil', 'H+1', 'H+2', 'H+4', 'H+6', c.ambu ? 'Sortie' : 'J1 matin']
    const grille = enfant
      ? `<h2>Échelle EVENDOL (enfant de moins de 7 ans) · traiter à partir de 4 / 15</h2>
      <table class="serre quadr"><thead><tr><th>Item (0 à 3)</th>${temps.map(t => `<th class="c" style="width:15mm">${t}</th>`).join('')}</tr></thead><tbody>
      ${['Expression vocale ou verbale (pleure, crie, gémit, dit qu\'il a mal)', 'Mimique (front plissé, sourcils froncés, bouche crispée)', 'Mouvements (s\'agite, se raidit, se crispe)', 'Positions (attitude inhabituelle, se protège, reste immobile)', 'Relation avec l\'environnement (consolable, s\'intéresse aux jeux)']
        .map(i => `<tr><td>${i}</td>${temps.map(() => '<td></td>').join('')}</tr>`).join('')}
      <tr><td><strong>Total / 15</strong></td>${temps.map(() => '<td></td>').join('')}</tr></tbody></table>
      <p class="petit">0 = absent ou normal · 1 = faible ou passager · 2 = moyen ou environ la moitié du temps · 3 = fort ou quasi permanent.</p>`
      : `<h2>${c.age != null && c.age < 12 ? 'Échelle des visages (FPS-R) ou' : 'Échelle numérique'} 0 à 10 · traiter à partir de 4</h2>
      <p class="petit">« Si 0 c'est pas mal du tout et 10 la pire douleur que tu peux imaginer, combien as-tu mal ? »</p>`
    return `${grille}
      <h2>Relevés et traitements</h2>
      <table class="vide quadr"><thead><tr><th>Date · heure</th><th>Score</th><th>Localisation</th><th>Traitement donné</th><th>Réévaluation</th><th>Visa</th></tr></thead><tbody>${vides(enfant ? 6 : 12, 6)}</tbody></table>
      <h2>Protocole antalgique prescrit</h2>
      <table class="vide"><thead><tr><th>Palier</th><th>Médicament et dose</th><th>Rythme</th><th>Si douleur ≥</th></tr></thead><tbody>${vides(3, 4)}</tbody></table>
      ${coches(['Moyens non médicamenteux proposés (distraction, doudou, froid, position)', 'Nausées et vomissements surveillés'])}
      <div class="sigs">${signature('Médecin prescripteur', c.chirurgien, true)}${signature('Infirmier(e)', '', true)}</div>`
  },

  plan_soins: () => {
    const temps = ['J0 soir', 'J1 matin', 'J1 soir', 'J2', 'J3']
    return `<p class="petit">Cocher ou noter à chaque passage. Toute anomalie est signalée au chirurgien.</p>
    <table class="serre quadr"><thead><tr><th>Surveillance · soin</th>${temps.map(t => `<th class="c" style="width:18mm">${t}</th>`).join('')}</tr></thead><tbody>
    ${['Température', 'Douleur (score)', 'Pansement propre et sec', 'Saignement', 'Drain / redon (quantité)', 'Perfusion (débit, point de ponction)', 'Reprise des boissons', 'Reprise de l\'alimentation', 'Nausées / vomissements', 'Miction', 'Transit', 'Premier lever, marche', 'Membre opéré : couleur, chaleur, mobilité', 'Hygiène, toilette', 'Moral, sommeil']
      .map(i => `<tr><td>${i}</td>${temps.map(() => '<td></td>').join('')}</tr>`).join('')}
    </tbody></table>
    <h2>Soins programmés</h2>
    <table class="vide quadr"><thead><tr><th>Soin</th><th>Prévu le</th><th>Fait le</th><th>Par</th></tr></thead><tbody>
    ${['Réfection du pansement', 'Ablation du drain / redon', 'Ablation de la perfusion', 'Bilan sanguin', 'Radio de contrôle', 'Kinésithérapie'].map(s => `<tr><td>${s}</td><td></td><td></td><td></td></tr>`).join('')}</tbody></table>
    ${champ('Transmissions', '', 'min-height:14mm')}
    <div class="sigs">${signature('Infirmier(e) référent(e)', '', true)}${signature('Chirurgien (visite)', '', true)}</div>`
  },

  thrombose: c => `
    <p>Après une opération, rester allongé favorise la formation de caillots dans les veines des jambes (phlébite). Le risque est évalué pour chaque adulte hospitalisé.</p>
    <h2>Facteurs de risque</h2>
    ${ouiNon(['Âge supérieur à 40 ans' + (c.age != null ? ` (${c.age} ans)` : ''), 'Antécédent de phlébite ou d\'embolie pulmonaire', 'Surpoids important', 'Pilule œstroprogestative, grossesse, post-partum', 'Cancer en cours', 'Immobilisation prévue (plâtre, alitement)', 'Chirurgie de plus d\'une heure ou orthopédique des membres inférieurs', 'Varices importantes'])}
    <div class="grille deux">${champ('Risque', `${boite(false)} faible  ${boite(false)} modéré  ${boite(false)} élevé`)}${champ('Contre-indication aux anticoagulants', `${boite(false)} non  ${boite(false)} oui`)}</div>
    <h2>Prévention prescrite</h2>
    ${coches(['Lever précoce dès le soir ou le lendemain', 'Bas ou chaussettes de contention, taille :', 'Anticoagulant injectable : nom, dose, durée :', 'Surveillance des plaquettes (si anticoagulant)', 'Ordonnance de sortie et infirmier(e) à domicile prévus'])}
    ${champ('Durée totale du traitement', '', '')}
    <div class="sigs">${signature('Médecin prescripteur', c.chirurgien)}</div>`,

  chung: c => `
    <p>Score de Chung (PADSS) : la sortie est possible à partir de <strong>9 / 10</strong>, patient accompagné, après accord médical.</p>
    <table class="serre quadr"><thead><tr><th>Critère</th><th>2</th><th>1</th><th>0</th><th class="c" style="width:15mm">H+1</th><th class="c" style="width:15mm">H+2</th><th class="c" style="width:15mm">Sortie</th></tr></thead><tbody>
    ${[['Signes vitaux (TA, FC)', '± 20 % de l\'entrée', '± 20 à 40 %', '> 40 %'], ['Déambulation', 'Marche assurée, sans vertige', 'Avec aide', 'Impossible'], ['Nausées, vomissements', 'Minimes', 'Modérés', 'Sévères'], ['Douleur', 'Minime, calmée par voie orale', 'Modérée', 'Sévère'], ['Saignement', 'Minime', 'Modéré', 'Sévère']]
      .map(([k, a, b, d]) => `<tr><td><strong>${k}</strong></td><td class="petit">${a}</td><td class="petit">${b}</td><td class="petit">${d}</td><td></td><td></td><td></td></tr>`).join('')}
    <tr><td><strong>Total / 10</strong></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table>
    <h2>Avant la sortie</h2>
    ${ouiNon(['A bu sans vomir', 'A uriné (si demandé)', 'Pansement propre, sans saignement', 'Accompagnant adulte présent', 'Ordonnances et consignes écrites remises, comprises', 'Numéro à appeler la nuit remis', 'Rendez-vous de contrôle donné', ...(c.mineur ? ['Enfant réveillé, consolable, joue'] : ['Ne conduira pas'])])}
    <div class="grille deux">${champ('Heure de sortie')}${champ('Sortie avec')}</div>
    <div class="sigs">${signature('Médecin autorisant la sortie', c.op.anesthesiste || c.chirurgien)}${signature('Infirmier(e)')}</div>`,

  sortie: c => `
    <h2>Prescriptions</h2>
    <table class="vide"><thead><tr><th>Médicament</th><th>Dose</th><th>Voie</th><th>Horaires</th><th>Durée</th></tr></thead><tbody>${vides(5, 5)}</tbody></table>
    <div class="grille">${champ('Pansement')}${champ('Ablation des fils')}${champ('Rendez-vous de contrôle', esc(c.f.controle))}</div>
    ${!c.ambu ? `<div class="grille">${champ('Date de sortie')}${champ('Mode de sortie', `${boite(false)} domicile  ${boite(false)} transfert`)}${champ('Transport', `${boite(false)} personnel  ${boite(false)} VSL / ambulance`)}</div>` : ''}
    ${champ('Consignes de sortie', esc(c.op.consignes_sortie || ''), 'white-space:pre-wrap;min-height:12mm')}
    <h2>Autorisation de sortie</h2>
    ${coches(['Patient conscient, douleur contrôlée, boit sans vomir, a uriné', c.ambu ? 'Accompagnant présent pour le retour et la première nuit' : 'Soins infirmiers à domicile organisés si besoin', `Ordonnances, ${c.mineur ? 'certificat scolaire' : 'arrêt de travail'} et rendez-vous remis`])}
    <p>Je reconnais avoir reçu les consignes de sortie, les ordonnances et le livret « Mon opération », et savoir quand appeler.</p>
    ${fait()}
    <div class="sigs">${signature('Médecin autorisant la sortie', c.chirurgien)}${signature(c.mineur ? 'Parent / représentant légal' : 'Patient', c.mineur ? '' : c.nom)}</div>`,

  consignes: c => `
    <div class="encadre"><strong>${esc(c.op.intervention || TIRETS)}</strong> du ${esc(dd(c.op.debut))} · ${esc(c.site ? siteDe(c.site.nom) : '')}</div>
    <h2>Après l'opération</h2>${c.vierge ? `<div class="lignes">${'<div></div>'.repeat(6)}</div>` : `<ul>${c.f.apres.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`}
    ${c.op.consignes_sortie ? `<h2>Consignes du médecin</h2><p style="white-space:pre-wrap">${esc(c.op.consignes_sortie)}</p>` : ''}
    <div class="grille">${champ("Retour à l'école / au travail", esc(c.f.reprise.ecole))}${champ('Sport', esc(c.f.reprise.sport))}${champ('Contrôle', esc(c.f.controle))}</div>
    <div class="grille deux">${champ('Rendez-vous de contrôle le')}${champ('Avec')}</div>
    <div class="alerte"><div class="k">Appelez ou revenez si</div><ul style="color:${ROUGE}">${[...c.f.alerte, ...COMMUN.alerte].map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
    <div class="grille">${champ('Urgence vitale', '<strong style="font-size:14pt">15</strong>')}${champ('Hôpital M&amp;M', esc(c.site ? `${siteDe(c.site.nom)}${c.site.telephone ? ` · ${c.site.telephone}` : ''}` : ''))}${champ('Message', '« Mon Hôpital M&amp;M »')}</div>
    <p>${c.mineur ? 'Nous avons' : "J'ai"} reçu ces consignes par écrit, elles ${c.mineur ? 'nous' : 'm\''}ont été expliquées et ${c.mineur ? 'nous les avons' : 'je les ai'} comprises.</p>
    <div class="sigs">${signature(c.representant, c.mineur ? '' : c.nom, true)}${signature('Infirmier(e) ayant expliqué', '', true)}</div>`,

  appel_lendemain: c => `
    <div class="grille">${champ('Appel le')}${champ('Numéro appelé', esc(c.p.telephone || c.p.contact_urgence_telephone || ''))}${champ('Personne jointe')}</div>
    ${coches(['Joint(e)', 'Non joint(e) après 3 appels : message laissé'])}
    <h2>Comment ça va ?</h2>
    ${ouiNon(['Douleur supportable avec les médicaments prescrits (score : ___ / 10)', 'Pas de nausées ni de vomissements', 'Boit et mange', 'Pansement propre, pas de saignement', 'Pas de fièvre', 'A uriné, transit normal', 'Nuit correcte', 'Ordonnance comprise et médicaments achetés', ...(c.mineur ? ['Enfant qui joue, se comporte comme d\'habitude'] : ['Accompagnant présent la nuit'])])}
    <div class="grille deux">${champ('Satisfaction (0 à 10)')}${champ('Problème signalé')}</div>
    <h2>Conduite à tenir</h2>
    ${coches(['Rien à signaler', 'Conseils donnés par téléphone', 'Chirurgien ou anesthésiste prévenu', 'Consultation avancée', 'Retour aux urgences conseillé'])}
    ${champ('Remarques', '', 'min-height:8mm')}
    <div class="sigs">${signature('Infirmier(e) ayant appelé')}</div>`,

  lettre: c => `
    <div class="grille deux">${champ('Destinataire', esc(c.p.medecin_traitant || 'Médecin traitant'))}${champ('Copie')}</div>
    <p>Cher confrère,</p>
    <p>Votre patient(e) <strong>${esc(c.nom || TIRETS)}</strong>${c.age != null ? `, ${c.age} ans,` : ''} a été opéré(e) le <strong>${esc(dd(c.op.debut))}</strong> à l'Hôpital M&amp;M (${esc(c.site ? siteDe(c.site.nom) : '')}) :
    <strong>${esc(c.op.intervention || TIRETS)}</strong>${c.cote !== 'Sans objet' ? `, côté ${esc(c.cote.toLowerCase())}` : ''}, sous anesthésie ${esc(c.anesthesie.toLowerCase())}, en ${c.ambu ? 'ambulatoire' : `hospitalisation (${esc(c.sejour)})`}.</p>
    ${champ('Geste réalisé', esc(c.ch.geste || ''), 'white-space:pre-wrap;min-height:12mm')}
    ${champ('Suites opératoires', '', 'min-height:12mm')}
    ${champ('Traitement de sortie', '', 'min-height:14mm')}
    ${champ('Points à surveiller', esc([...c.f.alerte].join(' · ')), 'min-height:10mm')}
    <div class="grille deux">${champ('Contrôle prévu', esc(c.f.controle))}${champ('Reprise', esc(`${c.f.reprise.ecole} · ${c.f.reprise.sport}`))}</div>
    <p>Je reste à votre disposition pour tout renseignement. Bien confraternellement.</p>
    <div class="sigs">${signature('Chirurgien', c.chirurgien)}</div>`,

  certificats: c => c.mineur ? `
    <h2>Certificat médical d'absence scolaire</h2>
    <p>Je soussigné(e), Dr <strong>${esc(c.chirurgien || '……………')}</strong>, certifie que l'état de santé de l'enfant <strong>${esc(c.nom || TIRETS)}</strong>, né(e) le ${esc(dd(c.p.date_naissance) || '……')}, opéré(e) le ${esc(dd(c.op.debut))},
    nécessite une absence scolaire du <span style="border-bottom:0.25mm solid ${FILET};padding:0 14mm"></span> au <span style="border-bottom:0.25mm solid ${FILET};padding:0 14mm"></span> inclus.</p>
    ${coches(['Dispense de sport et de piscine jusqu\'au :', 'Aménagements au retour (ascenseur, pas de port de cartable, récréation calme) :'])}
    ${fait()}
    <div class="sigs">${signature('Médecin', c.chirurgien, true)}</div>
    <h2>Attestation de présence parentale</h2>
    <p>Je soussigné(e), certifie que M. / Mme <span style="border-bottom:0.25mm solid ${FILET};padding:0 30mm"></span> a accompagné son enfant <strong>${esc(c.nom || TIRETS)}</strong>, ${c.ambu ? `pris(e) en charge en chirurgie ambulatoire le ${esc(dd(c.op.debut))}` : `hospitalisé(e) du ${esc(dd(c.op.debut))} au <span style="border-bottom:0.25mm solid ${FILET};padding:0 14mm"></span>`} à l'Hôpital M&amp;M, ${esc(c.site ? `${siteDe(c.site.nom)}, ${adresseSite(c.site)}` : '')}.</p>
    <p class="petit">Attestation remise à l'intéressé(e) pour faire valoir ce que de droit (employeur, congé de présence parentale).</p>
    ${fait()}
    <div class="sigs">${signature('Médecin ou cadre du service', '', true)}</div>` : `
    <h2>Bulletin de situation · attestation ${c.ambu ? 'de soins' : "d'hospitalisation"}</h2>
    <p>Je soussigné(e), certifie que <strong>${esc(c.nom || TIRETS)}</strong>, né(e) le ${esc(dd(c.p.date_naissance) || '……')}, ${c.ambu ? `a été pris(e) en charge en chirurgie ambulatoire le ${esc(dd(c.op.debut))}` : `est hospitalisé(e) depuis le ${esc(dd(c.op.debut))}, sortie prévue le <span style="border-bottom:0.25mm solid ${FILET};padding:0 14mm"></span>`} à l'Hôpital M&amp;M, ${esc(c.site ? `${siteDe(c.site.nom)}, ${adresseSite(c.site)}` : '')}.</p>
    ${fait()}
    <div class="sigs">${signature('Bureau des admissions', '', true)}</div>
    <h2>Arrêt de travail</h2>
    <p>Arrêt de travail prescrit du <span style="border-bottom:0.25mm solid ${FILET};padding:0 14mm"></span> au <span style="border-bottom:0.25mm solid ${FILET};padding:0 14mm"></span> inclus, sur l'avis d'arrêt de travail réglementaire (télétransmis ou formulaire Cerfa).</p>
    ${coches(['Arrêt télétransmis', 'Formulaire papier remis (volets 1 et 2 à envoyer à la caisse, volet 3 à l\'employeur)', 'Sorties autorisées', 'Reprise à temps partiel thérapeutique à discuter'])}
    ${champ('Accompagnant : attestation de présence pour', '', '')}
    ${fait()}
    <div class="sigs">${signature('Médecin', c.chirurgien, true)}</div>`,
}

/**
 * Dossier opératoire. d = { op, patient, site, salle, chirurgien, mineur } ;
 * codes = pièces à imprimer (par défaut celles proposées pour ce parcours).
 */
export function dossierOperatoireHtml(d, codes = null) {
  const c = contexte(d)
  const choisies = PIECES.filter(([code, , , quand]) => (codes ? codes.includes(code) : quand(c)))
  const titres = choisies.map(x => x[1])
  const total = choisies.length
  const entete = titre => `<header><div><div class="logo">${logoSvgTexte}</div>${c.site ? `<div class="adr">${esc(siteDe(c.site.nom).toUpperCase())} · ${esc(adresseSite(c.site))}</div>` : ''}</div>
<div class="t"><div class="n">DOSSIER OPÉRATOIRE${c.ambu ? ' · AMBULATOIRE' : ''}</div><h1>${esc(titre)}</h1></div></header>
<div class="bandeau"><div><div class="k">Patient</div><div class="v"><strong>${esc(c.nom)}</strong></div></div><div><div class="k">Né(e) le</div><div class="v">${esc(c.vierge ? '' : date(c.p.date_naissance) || '—')}</div></div>
<div><div class="k">Dossier · IPP</div><div class="v">${c.vierge ? '' : `${esc(c.p.numero_dossier || '—')} · ${esc(c.p.ipp || '—')}`}</div></div><div><div class="k">Opération</div><div class="v">${esc(date(c.op.debut))}</div></div></div>`
  return choisies.map(([code, titre], i) => `<section class="page" data-piece="${code}">${entete(titre)}${CORPS[code](c, titres)}
<footer><span>${['DOSSIER OPÉRATOIRE', c.nom.toUpperCase(), c.p.numero_dossier].filter(Boolean).map(esc).join(' · ')}</span><span>PIÈCE ${i + 1} / ${total}</span></footer></section>`).join('')
}

/** Ouvre le dossier opératoire prêt à imprimer. */
export function imprimerDossierOperatoire(d, codes = null) {
  const nom = `${d.patient.prenom || ''} ${d.patient.nom || ''}`.trim()
  imprimer({ titre: `Dossier opératoire — ${nom}`, corps: dossierOperatoireHtml(d, codes), page: 'A4', marge: '11mm', style: STYLE_DOSSIER })
}

/** Pièces du dossier opératoire en version vierge (sans patient), pour le site choisi. */
export function dossierViergeHtml(codes, site = null) {
  return dossierOperatoireHtml({ op: { intervention: '', debut: null, fin: null, checklist: {}, heures: {}, reveil: {} }, patient: {}, site, vierge: true }, codes)
}

/** Toutes les pièces, pour la page « Papiers vierges ». */
export const PIECES_VIERGES = PIECES.map(([code, titre, groupe]) => ({ code, titre, groupe }))
