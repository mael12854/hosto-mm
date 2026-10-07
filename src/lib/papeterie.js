// Papiers vierges aux couleurs de la charte (A4) : en-tête, feuilles, formulaires à remplir à la main,
// et pièces du dossier opératoire sans patient.
import { esc } from './format.js'
import { adresseSite, siteDe } from './sites.jsx'
import { logoSvgTexte } from '../components/Logo.jsx'
import { imprimer } from './impression.js'
import { STYLE_DOSSIER, champ, coches, dossierViergeHtml, fait, signature } from './dossierOperatoire.js'

const BLEU = '#1D5C74', FILET = '#D8D2C6'

export const STYLE_PAPIERS = STYLE_DOSSIER + `
.corps-libre{flex:1}
.page > footer:last-child{margin-top:auto}.sigs + footer{margin-top:0 !important}
.lignee{flex:1;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent calc(8mm - 0.25mm),${FILET} calc(8mm - 0.25mm),${FILET} 8mm)}
.quadrillee{flex:1;background-image:linear-gradient(${FILET} 0.2mm,transparent 0.2mm),linear-gradient(90deg,${FILET} 0.2mm,transparent 0.2mm);background-size:5mm 5mm;border:0.25mm solid ${FILET}}
.ord{flex:1;border-left:0.8mm solid ${BLEU};padding-left:4mm;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent calc(9mm - 0.25mm),${FILET} calc(9mm - 0.25mm),${FILET} 9mm)}
.pied-site{font-family:'IBM Plex Mono',monospace;font-size:7.5pt;color:#656C71;text-align:center;letter-spacing:.06em}
`

const vides = (n, cols, h = '') => (`<tr${h ? ` style="height:${h}"` : ''}>` + '<td></td>'.repeat(cols) + '</tr>').repeat(n)

/** En-tête commun : logo, site, titre (facultatif). */
const dateFr = d => (d ? new Date(String(d).length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('fr-FR') : '')

/** En-tête commun : logo, site, titre (facultatif), bandeau patient (pré-rempli si patient fourni). */
function entete(site, titre, avecPatient = true, patient = null) {
  return `<header><div><div class="logo">${logoSvgTexte}</div>${site ? `<div class="adr">${esc(siteDe(site.nom).toUpperCase())} · ${esc(adresseSite(site))}</div>` : ''}</div>
<div class="t">${titre ? `<div class="n">HÔPITAL M&amp;M</div><h1>${esc(titre)}</h1>` : ''}</div></header>
${avecPatient ? `<div class="bandeau"><div><div class="k">Patient</div><div class="v"><strong>${esc(patient ? `${patient.prenom || ''} ${(patient.nom || '').toUpperCase()}`.trim() : '')}</strong></div></div><div><div class="k">Né(e) le</div><div class="v">${esc(dateFr(patient?.date_naissance))}</div></div><div><div class="k">Dossier · IPP</div><div class="v">${patient ? esc([patient.numero_dossier, patient.ipp].filter(Boolean).join(' · ')) : ''}</div></div><div><div class="k">Date</div><div class="v"></div></div></div>` : ''}`
}
const pied = (site, titre) => `<footer><span>${esc((titre || 'Hôpital M&M').toUpperCase())}</span><span>HÔPITAL M&amp;M${site ? ` · ${esc(site.nom.toUpperCase())}` : ''}</span></footer>`

/** Papiers : [code, titre, description, page(site)]. */
export const PAPIERS = [
  ['entete', 'Papier à en-tête', 'Logo et adresse du site, page libre', (site, patient) => `${entete(site, '', false, patient)}<div class="corps-libre"></div><div class="pied-site">HÔPITAL M&amp;M${site ? ` · ${esc(adresseSite(site).toUpperCase())}` : ''}</div>`],
  ['lignee', 'Feuille lignée', 'Notes, courrier, observations', (site, patient) => `${entete(site, 'Notes', true, patient)}<div class="lignee"></div>${pied(site, 'Notes')}`],
  ['quadrillee', 'Feuille quadrillée 5 mm', 'Schémas, dessins, courbes', (site, patient) => `${entete(site, 'Feuille quadrillée', true, patient)}<div class="quadrillee"></div>${pied(site, 'Feuille quadrillée')}`],
  ['ordonnance', 'Ordonnance vierge', 'À remplir et signer à la main', (site, patient) => `${entete(site, 'Ordonnance', true, patient)}
    <div class="grille">${champ('Médecin')}${champ('Poids (enfant)')}${champ('Allergies')}</div>
    <div class="ord"></div>
    <div class="grille deux">${champ('Renouvelable', '□ non  □ oui, ____ fois')}${champ('À délivrer', '□ en une fois  □ par mois')}</div>
    <div class="sigs">${signature('Médecin prescripteur', '', true)}</div>${pied(site, 'Ordonnance')}`],
  ['surveillance', 'Feuille de surveillance', 'Constantes et observations, 22 relevés', (site, patient) => `${entete(site, 'Feuille de surveillance', true, patient)}
    <table class="vide quadr"><thead><tr><th style="width:24mm">Date · heure</th><th>T°</th><th>FC</th><th>TA</th><th>SpO₂</th><th>FR</th><th>Douleur</th><th>Diurèse</th><th>Observations</th><th>Visa</th></tr></thead>
    <tbody>${vides(22, 10, '8.6mm')}</tbody></table>${pied(site, 'Feuille de surveillance')}`],
  ['transmissions', 'Transmissions ciblées', 'Cible · données · actions · résultats', (site, patient) => `${entete(site, 'Transmissions ciblées', true, patient)}
    <table class="quadr"><thead><tr><th style="width:22mm">Date · heure</th><th style="width:28mm">Cible</th><th>Données</th><th>Actions</th><th>Résultats</th><th style="width:14mm">Visa</th></tr></thead>
    <tbody>${vides(11, 6, '18mm')}</tbody></table>${pied(site, 'Transmissions ciblées')}`],
  ['administration', 'Administration des médicaments', 'Plan de soins sur 24 h', (site, patient) => `${entete(site, 'Administration des médicaments', true, patient)}
    <div class="grille">${champ('Service · chambre')}${champ('Allergies')}${champ('Poids')}</div>
    <table class="quadr serre"><thead><tr><th style="width:52mm">Médicament · dose · voie</th>${['6 h', '8 h', '10 h', '12 h', '14 h', '16 h', '18 h', '20 h', '22 h', '0 h', 'Si besoin'].map(h => `<th class="c">${h}</th>`).join('')}</tr></thead>
    <tbody>${vides(18, 12, '10.5mm')}</tbody></table>${pied(site, 'Administration des médicaments')}`],
  ['fiche_patient', 'Fiche de renseignements patient', 'Identité, coordonnées, santé', (site, patient) => `${entete(site, 'Fiche de renseignements', false, patient)}
    <h2>Identité</h2><div class="grille">${champ('Nom')}${champ('Prénom')}${champ('Date de naissance')}${champ('Sexe', '□ F  □ M')}${champ('Lieu de naissance')}${champ('N° de sécurité sociale')}</div>
    <h2>Coordonnées</h2>${champ('Adresse')}<div class="grille">${champ('Code postal')}${champ('Ville')}${champ('Téléphone')}</div>${champ('E-mail')}
    <h2>Personne à prévenir</h2><div class="grille">${champ('Nom et prénom')}${champ('Lien')}${champ('Téléphone')}</div>
    <h2>Santé</h2><div class="grille">${champ('Médecin traitant')}${champ('Groupe sanguin')}${champ('Mutuelle')}</div>
    <div class="alerte"><div class="k">Allergies</div><div class="v" style="min-height:9mm"></div></div>
    ${champ('Antécédents médicaux et chirurgicaux', '', 'min-height:16mm')}${champ('Traitements en cours', '', 'min-height:12mm')}
    ${coches(['J\'accepte la création de mon compte « Mon Hôpital M&amp;M »', 'Je souhaite recevoir les rappels de rendez-vous par e-mail'])}
    ${fait()}<div class="sigs">${signature('Patient ou représentant légal', '', true)}</div>`],
  ['examen', "Demande d'examens", 'Biologie et imagerie', (site, patient) => `${entete(site, "Demande d'examens", true, patient)}
    <div class="grille">${champ('Médecin demandeur')}${champ('Urgence', '□ non  □ oui')}${champ('À jeun', '□ non  □ oui')}</div>
    <h2>Biologie</h2>${coches(['Numération formule sanguine (NFS)', 'Ionogramme, créatinine', 'CRP', 'Bilan de coagulation (TP, TCA)', 'Groupe sanguin, RAI', 'Glycémie', 'Bilan hépatique', 'ECBU', 'Autre :'])}
    <h2>Imagerie et explorations</h2>${coches(['Radiographie :', 'Échographie :', 'Scanner :', 'IRM :', 'Électrocardiogramme (ECG)', 'Autre :'])}
    ${champ('Renseignements cliniques', '', 'min-height:20mm')}
    <div class="sigs">${signature('Médecin', '', true)}${signature('Prélèvement fait par', '', true)}</div>${pied(site, "Demande d'examens")}`],
  ['certificat', 'Certificat médical', 'Certificat libre à rédiger', (site, patient) => `${entete(site, 'Certificat médical', false, patient)}
    <p style="margin-top:6mm">Je soussigné(e), Dr <span style="border-bottom:0.25mm solid ${FILET};padding:0 40mm"></span>, certifie avoir examiné ce jour</p>
    <p>M. / Mme / l'enfant <span style="border-bottom:0.25mm solid ${FILET};padding:0 50mm"></span>, né(e) le <span style="border-bottom:0.25mm solid ${FILET};padding:0 18mm"></span></p>
    <div class="ord" style="flex:0 0 120mm"></div>
    <p>Certificat établi à la demande de l'intéressé(e) et remis en main propre pour faire valoir ce que de droit.</p>
    ${fait()}<div class="sigs">${signature('Médecin', '', true)}</div>${pied(site, 'Certificat médical')}`],
]

/**
 * Imprime les papiers choisis. papiers : codes de PAPIERS ; pieces : codes du dossier opératoire ;
 * site : en-tête ; exemplaires : nombre de copies de chaque page.
 */
export function imprimerPapiers({ papiers = [], pieces = [], site = null, exemplaires = 1 }) {
  const n = Math.max(1, Math.min(50, Number(exemplaires) || 1))
  const pages = PAPIERS.filter(([code]) => papiers.includes(code)).map(([code, , , page]) => `<section class="page" data-papier="${code}">${page(site)}</section>`)
  const dossier = pieces.length ? dossierViergeHtml(pieces, site) : ''
  const corps = Array.from({ length: n }, () => pages.join('') + dossier).join('')
  imprimer({ titre: 'Papiers vierges — Hôpital M&M', corps, page: 'A4', marge: '11mm', style: STYLE_PAPIERS })
}
