// Courriers pour enveloppe à fenêtre (A4) : l'adresse du destinataire est placée pour apparaître
// dans la fenêtre transparente d'une enveloppe DL (A4 plié en trois) ou C5 (A4 plié en deux).
import { esc } from './format.js'
import { adresseSite, siteDe } from './sites.jsx'
import { logoSvgTexte } from '../components/Logo.jsx'
import { imprimer } from './impression.js'
import { horairesJeun } from './interventions.js'

const BLEU = '#1D5C74', GRIS = '#656C71', FILET = '#D8D2C6'

/**
 * Fenêtre standard (enveloppe DL 110 × 220, fenêtre 45 × 100 à 20 mm du bord droit et 15 mm du bas) :
 * sur la feuille, zone utile d'environ 95 à 195 mm en largeur et 50 à 95 mm en hauteur.
 * Le bloc adresse est placé à 108 mm du bord gauche et 52 mm du haut (85 × 36 mm), avec une marge de jeu.
 */
export const FENETRE = { gauche: 108, haut: 52, largeur: 85, hauteur: 36 }

export const ENVELOPPES = [
  ['dl', 'DL 110 × 220 (A4 plié en trois)', [99, 198]],
  ['c5', 'C5 162 × 229 (A4 plié en deux)', [148.5]],
]

const lieuDate = (site, d = new Date()) => `${site?.nom || 'Paris'}, le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
const jourLong = d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const heure = d => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')

/** Adresse postale (norme La Poste : 6 lignes au plus, dernière ligne « CP VILLE » en majuscules). */
export function adressePostale(p, destinataire) {
  if (!p) return ''
  const nom = `${p.prenom || ''} ${(p.nom || '').toUpperCase()}`.trim()
  const civ = p.sexe === 'F' ? 'Madame' : p.sexe === 'M' ? 'Monsieur' : ''
  const tete = destinataire === 'parents' ? [`Aux parents ${/^[aeiouyhàâéèêëîïôûü]/i.test(nom) ? 'd’' : 'de '}${nom}`] : destinataire === 'medecin' ? [p.medecin_traitant ? (/^dr\b|^docteur/i.test(p.medecin_traitant) ? p.medecin_traitant : `Docteur ${p.medecin_traitant}`) : 'Docteur'] : [[civ, nom].filter(Boolean).join(' ')]
  if (destinataire === 'medecin') return [...tete, '', ''].join('\n')
  return [...tete, p.complement_adresse, p.adresse, [p.code_postal, (p.ville || '').toUpperCase()].filter(Boolean).join(' ')].filter(Boolean).join('\n')
}

/** Contrôles de l'adresse : nombre de lignes et longueur (38 caractères conseillés par ligne). */
export function verifierAdresse(texte) {
  const lignes = String(texte || '').split('\n').map(l => l.trim()).filter(Boolean)
  const alertes = []
  if (lignes.length < 3) alertes.push('Adresse incomplète : au moins le nom, la rue et « code postal + ville ».')
  if (lignes.length > 6) alertes.push('Plus de 6 lignes : la fin risque de sortir de la fenêtre.')
  const longues = lignes.filter(l => l.length > 38)
  if (longues.length) alertes.push(`Ligne trop longue (plus de 38 caractères) : « ${longues[0]} ».`)
  if (lignes.length && !/^\d{5}\s+\S/.test(lignes.at(-1))) alertes.push('La dernière ligne doit commencer par le code postal (5 chiffres) suivi de la ville.')
  return alertes
}

/**
 * Modèles : [code, libellé, destinataire par défaut, fabrique(données) → { objet, corps }].
 * donnees = { patient, rdv (prochain), op (prochaine), examens (disponibles), sejour (dernier), site, medecin }
 */
export const MODELES = [
  ['libre', 'Lettre libre', 'patient', () => ({ objet: '', corps: '' })],
  ['convocation_rdv', 'Convocation à un rendez-vous', 'patient', ({ patient, rdv, siteRdv }) => ({
    objet: 'Convocation à un rendez-vous',
    corps: rdv
      ? `Nous vous confirmons le rendez-vous de ${patient.prenom} le ${jourLong(rdv.date_heure)} à ${heure(rdv.date_heure)}${rdv.motif ? `, pour : ${rdv.motif.toLowerCase()}` : ''}.\n\nLieu : Hôpital M&M, ${siteRdv ? `${siteDe(siteRdv.nom)}, ${adresseSite(siteRdv)}` : '…'}.\n\nMerci de vous présenter 5 minutes avant l'heure, muni(e) de la carte Vitale et du carnet de santé. En cas d'empêchement, prévenez-nous le plus tôt possible : le créneau pourra être proposé à un autre patient.`
      : `Nous vous convoquons à un rendez-vous le ……………… à ……… h ………, pour : ………………….\n\nMerci de vous présenter 5 minutes avant l'heure, muni(e) de la carte Vitale et du carnet de santé.`,
  })],
  ['convocation_op', 'Convocation pour une opération', 'patient', ({ patient, op, siteOp }) => {
    if (!op) return { objet: 'Convocation pour une intervention', corps: "Aucune opération programmée pour ce patient : complétez la date, l'heure d'arrivée et l'intervention." }
    const j = horairesJeun(op.debut)
    return {
      objet: `Convocation : ${op.intervention}`,
      corps: `${patient.prenom} est attendu(e) pour son intervention (${op.intervention}${op.cote && op.cote !== 'Sans objet' ? `, côté ${op.cote.toLowerCase()}` : ''}) le ${jourLong(op.debut)}.\n\nHeure d'arrivée : ${heure(j.arrivee)}, à l'Hôpital M&M, ${siteOp ? `${siteDe(siteOp.nom)}, ${adresseSite(siteOp)}` : '…'}.\n\nJeûne : dernier repas solide avant ${heure(j.solides)}${new Date(j.solides).toDateString() !== new Date(op.debut).toDateString() ? ' (la veille)' : ''}, dernière boisson claire (eau, sirop, jus sans pulpe) avant ${heure(j.liquides)}.\n\nÀ apporter : carte Vitale, carnet de santé, ordonnances et radios, consentements signés${patient.date_naissance && (new Date(op.debut) - new Date(patient.date_naissance)) / 3.15576e10 < 18 ? " et l'autorisation d'opérer signée par les deux parents" : ''}. Vous trouverez joint le livret « Mon opération » : merci de le lire avant le jour J.\n\nSéjour prévu : ${op.sejour || '…'}.${/^ambulatoire/i.test(op.sejour || '') ? " Un adulte doit vous raccompagner et rester avec vous la première nuit." : ''}`,
    }
  }],
  ['resultats', "Résultats d'examens", 'patient', ({ examens }) => ({
    objet: "Vos résultats d'examens",
    corps: `Les résultats ${examens?.length ? `des examens suivants sont disponibles :\n${examens.map(x => `– ${x.type_examen} (${new Date(x.date_resultat || x.date_demande).toLocaleDateString('fr-FR')})`).join('\n')}` : 'de vos examens sont disponibles'}.\n\nVous pouvez les consulter dans « Mon Hôpital M&M ». ${'Ils sont commentés par le médecin lors de votre prochaine consultation ; n\'hésitez pas à nous écrire si vous avez une question.'}`,
  })],
  ['medecin_traitant', 'Courrier au médecin traitant', 'medecin', ({ patient, sejour }) => ({
    objet: `${patient.prenom} ${(patient.nom || '').toUpperCase()}, né(e) le ${patient.date_naissance ? new Date(patient.date_naissance + 'T12:00:00').toLocaleDateString('fr-FR') : '…'}`,
    corps: `J'ai vu en consultation votre patient(e) ${patient.prenom} ${(patient.nom || '').toUpperCase()}${sejour ? `, hospitalisé(e) du ${new Date(sejour.date_entree).toLocaleDateString('fr-FR')}${sejour.date_sortie ? ` au ${new Date(sejour.date_sortie).toLocaleDateString('fr-FR')}` : ''}${sejour.motif ? ` pour ${sejour.motif.toLowerCase()}` : ''}` : ''}.\n\nExamen : \n\nConclusion : \n\nTraitement : \n\nJe vous remercie de votre confiance et reste à votre disposition.`,
  })],
  ['sortie', 'Après une hospitalisation', 'patient', ({ patient, sejour }) => ({
    objet: 'Suite à votre hospitalisation',
    corps: `${patient.prenom} a été hospitalisé(e) à l'Hôpital M&M${sejour ? ` du ${new Date(sejour.date_entree).toLocaleDateString('fr-FR')}${sejour.date_sortie ? ` au ${new Date(sejour.date_sortie).toLocaleDateString('fr-FR')}` : ''}` : ''}. Nous espérons que le retour à la maison se passe bien.\n\nVous trouverez ci-joint le bulletin de sortie et les ordonnances. Les consignes et les prochains rendez-vous sont aussi dans « Mon Hôpital M&M ».\n\nEn cas de fièvre, de douleur qui augmente ou de toute inquiétude, contactez-nous ; en cas d'urgence vitale, appelez le 15.`,
  })],
  ['rdv_manque', 'Rendez-vous manqué', 'patient', ({ patient, rdv }) => ({
    objet: 'Rendez-vous manqué',
    corps: `${patient.prenom} était attendu(e) ${rdv ? `le ${jourLong(rdv.date_heure)} à ${heure(rdv.date_heure)}` : 'à un rendez-vous'} et n'a pas pu venir.\n\nCe suivi reste important : merci de nous contacter pour fixer un nouveau rendez-vous, par message dans « Mon Hôpital M&M » ou à l'accueil de l'hôpital.`,
  })],
]

export const formule = destinataire => (destinataire === 'medecin'
  ? ['Cher confrère,', 'Bien confraternellement.']
  : ['Madame, Monsieur,', "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."])

const STYLE = `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0}
body{font-family:'Source Sans 3',sans-serif;color:#1E262B;font-size:11pt;line-height:1.5}
.feuille{position:relative;width:210mm;min-height:297mm;padding:16mm 20mm 20mm;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.feuille + .feuille{page-break-before:always;break-before:page}
.exp .logo{width:56mm}
.exp .adr{font-family:'IBM Plex Mono',monospace;font-size:8pt;color:${GRIS};margin-top:2mm;line-height:1.45}
.dest{position:absolute;left:${FENETRE.gauche}mm;top:${FENETRE.haut}mm;width:${FENETRE.largeur}mm;height:${FENETRE.hauteur}mm;overflow:hidden}
.dest .retour{font-family:'IBM Plex Mono',monospace;font-size:6.5pt;color:${GRIS};border-bottom:0.2mm solid ${FILET};padding-bottom:0.8mm;margin-bottom:1.6mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dest .lignes{font-size:11pt;line-height:1.3;white-space:pre-line}
.dest.repere{outline:0.3mm dashed #A8331F;outline-offset:2mm}
.pli{position:absolute;left:4mm;width:6mm;border-top:0.25mm solid ${GRIS}}
/* L'en-tête occupe le haut de la feuille jusque sous la fenêtre : le texte commence vers 96 mm. */
.exp{height:${FENETRE.haut + FENETRE.hauteur - 16 + 8}mm}
.date{text-align:right;margin-bottom:6mm}
.ref{font-family:'IBM Plex Mono',monospace;font-size:8.5pt;color:${GRIS};margin-bottom:1mm}
.objet{font-weight:700;margin-bottom:6mm}.objet span{font-family:'IBM Plex Mono',monospace;font-size:8.5pt;font-weight:400;color:${BLEU};letter-spacing:.08em;margin-right:2mm}
.texte{white-space:pre-wrap}
.texte p{margin:0 0 3mm}
.signature{margin-top:10mm;margin-left:95mm}
.signature .nom{font-weight:700}.signature .titre{font-size:9.5pt;color:${GRIS}}
.signature .zone{height:20mm}
.pj{margin-top:6mm;font-size:9.5pt;color:${GRIS}}
.bas{position:absolute;left:20mm;right:20mm;bottom:10mm;border-top:0.25mm solid ${FILET};padding-top:1.5mm;font-family:'IBM Plex Mono',monospace;font-size:7pt;color:${GRIS};display:flex;justify-content:space-between}
`

/**
 * HTML d'un courrier. c = { site, adresse (texte multiligne), objet, corps, ouverture, politesse,
 * signataire, titreSignataire, reference, piecesJointes, enveloppe ('dl'|'c5'), repere (contour de test) }
 */
export function courrierHtml(c) {
  const plis = (ENVELOPPES.find(e => e[0] === c.enveloppe) || ENVELOPPES[0])[2]
  const retour = ['Hôpital M&M', c.site?.adresse, c.site ? `${c.site.code_postal} ${c.site.nom}` : ''].filter(Boolean).join(' · ')
  const paragraphes = String(c.corps || '').split(/\n{2,}/).map(t => `<p>${esc(t)}</p>`).join('')
  return `<div class="feuille">
  ${plis.map(y => `<div class="pli" style="top:${y}mm"></div>`).join('')}
  <div class="exp"><div class="logo">${logoSvgTexte}</div>${c.site ? `<div class="adr">${esc(siteDe(c.site.nom).toUpperCase())}<br>${esc(c.site.adresse || '')}<br>${esc(`${c.site.code_postal || ''} ${(c.site.ville || c.site.nom).toUpperCase()}`)}${c.site.telephone ? `<br>TÉL. ${esc(c.site.telephone)}` : ''}</div>` : ''}</div>
  <div class="dest${c.repere ? ' repere' : ''}"><div class="retour">${esc(retour)}</div><div class="lignes">${esc(String(c.adresse || '').split('\n').map(l => l.trim()).filter(Boolean).join('\n'))}</div></div>
  <div class="corps">
    <div class="date">${esc(lieuDate(c.site))}</div>
    ${c.reference ? `<div class="ref">RÉF. ${esc(c.reference)}</div>` : ''}
    ${c.objet ? `<div class="objet"><span>OBJET</span>${esc(c.objet)}</div>` : ''}
    <div class="texte"><p>${esc(c.ouverture || '')}</p>${paragraphes}<p>${esc(c.politesse || '')}</p></div>
    <div class="signature"><div class="nom">${esc(c.signataire || '')}</div><div class="titre">${esc(c.titreSignataire || '')}</div><div class="zone"></div></div>
    ${c.piecesJointes ? `<div class="pj">P. J. : ${esc(c.piecesJointes)}</div>` : ''}
  </div>
  <div class="bas"><span>HÔPITAL M&amp;M${c.site ? ` · ${esc(adresseSite(c.site).toUpperCase())}` : ''}</span><span>MESSAGES : « MON HÔPITAL M&amp;M »</span></div>
</div>`
}

/** Page complète (aperçu dans un cadre ou impression). */
export const pageCourrier = (corps, titre = 'Courrier') => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(titre)}</title>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:0}${STYLE}</style></head><body>${corps}</body></html>`

export function imprimerCourrier(c, titre) {
  imprimer({ titre: titre || `Courrier — ${c.objet || ''}`, corps: courrierHtml(c), page: 'A4', marge: '0', style: STYLE })
}
