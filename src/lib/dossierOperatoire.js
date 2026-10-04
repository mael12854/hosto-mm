// Dossier opératoire à imprimer (A4) : toutes les pièces à signer, pré-remplies avec l'identité et l'opération.
import { date, dateHeure, esc } from './format.js'
import { adresseSite, siteDe } from './sites.jsx'
import { ALDRETE, CHAMPS_CR, CHECKLIST, HEURES } from './operations.js'
import { ficheIntervention, horairesJeun } from './interventions.js'
import { logoSvgTexte } from '../components/Logo.jsx'
import { imprimer } from './impression.js'

const BLEU = '#1D5C74', ROUGE = '#A8331F', GRIS = '#656C71', FILET = '#D8D2C6', PAPIER = '#F4F1EA'

const STYLE = `
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
.grille{display:grid;grid-template-columns:repeat(3,1fr);gap:2.5mm 5mm}.grille.deux{grid-template-columns:1fr 1fr}
.case{border-bottom:0.25mm solid ${FILET};padding-bottom:1mm}
h2{margin:0.6mm 0 0;font-size:11pt;color:${BLEU}}
p{margin:0}.petit{font-size:9pt;color:${GRIS}}
ul{margin:0;padding-left:5mm}li{margin:0.6mm 0}
.alerte{border:0.5mm solid ${ROUGE};padding:2mm 3mm}.alerte .k,.alerte .v{color:${ROUGE}}.alerte .v{font-weight:700}
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
td.c{text-align:center;width:11mm}
.boite{display:inline-block;width:3.6mm;height:3.6mm;border:0.35mm solid ${BLEU};vertical-align:-0.6mm;text-align:center;line-height:3mm;font-size:9pt;font-weight:700;color:${BLEU}}
.coche{display:grid;gap:1.6mm}.coche div{display:flex;gap:2.5mm;align-items:baseline}.coche .lg{flex:1;border-bottom:0.25mm solid ${FILET}}
.vide td{height:6.6mm}
.etiquettes{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.etiquettes div{border:0.3mm dashed ${GRIS};height:24mm;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:7.5pt;color:${GRIS}}
.lignes div{border-bottom:0.25mm solid ${FILET};height:6mm}
footer{display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:7.5pt;color:${GRIS};border-top:0.25mm solid ${FILET};padding-top:1.5mm}
`

const boite = ok => `<span class="boite">${ok ? '✓' : ''}</span>`

/** Case de signature ; court : nom + signature seulement (pages chargées). */
function signature(role, nom = '', court = false) {
  if (court) return `<div class="sig court"><div class="r">${esc(role)}</div><div class="l">${esc(nom)}</div><div class="zone"></div></div>`
  return `<div class="sig"><div class="r">${esc(role)}</div><div class="k">Nom et prénom</div><div class="l">${esc(nom)}</div>
<div class="k">Date et heure</div><div class="l"></div><div class="zone"></div></div>`
}

/**
 * Dossier opératoire complet. d = { op, patient, site, salle, chirurgien, mineur }
 * Pages : garde, consentement chirurgical, anesthésie, autorisation parentale (mineur), préparation,
 * check-list HAS, surveillance et réveil, compte-rendu opératoire, prescriptions et sortie.
 */
export function dossierOperatoireHtml({ op, patient: p, site, salle, chirurgien, mineur }) {
  const f = ficheIntervention(op.code_intervention)
  const nom = `${p.prenom || ''} ${p.nom || ''}`.trim()
  const cote = op.cote && op.cote !== 'Sans objet' ? op.cote : 'Sans objet'
  const j = horairesJeun(op.debut)
  const total = mineur ? 9 : 8
  let n = 0
  const pied = () => `<footer><span>DOSSIER OPÉRATOIRE · ${esc(nom.toUpperCase())} · ${esc(p.numero_dossier || '')}</span><span>PAGE ${++n} / ${total}</span></footer>`
  const entete = titre => `<header><div><div class="logo">${logoSvgTexte}</div>${site ? `<div class="adr">${esc(siteDe(site.nom).toUpperCase())} · ${esc(adresseSite(site))}</div>` : ''}</div>
<div class="t"><div class="n">DOSSIER OPÉRATOIRE</div><h1>${esc(titre)}</h1></div></header>
<div class="bandeau"><div><div class="k">Patient</div><div class="v"><strong>${esc(nom)}</strong></div></div><div><div class="k">Né(e) le</div><div class="v">${esc(date(p.date_naissance) || '—')}</div></div>
<div><div class="k">Dossier · IPP</div><div class="v">${esc(p.numero_dossier || '—')} · ${esc(p.ipp || '—')}</div></div><div><div class="k">Opération</div><div class="v">${esc(date(op.debut))}</div></div></div>`
  const fait = () => `<div class="fait"><span>Fait à</span><span>le</span></div>`
  const ch = op.compte_rendu || {}
  const heures = op.heures || {}

  const pages = [
    `<section class="page">${entete("Fiche d'identification")}
      <div class="grille">
        <div class="case"><div class="k">Intervention</div><div class="v"><strong>${esc(op.intervention)}</strong></div></div>
        <div class="case"><div class="k">Côté</div><div class="v"><strong>${esc(cote)}</strong></div></div>
        <div class="case"><div class="k">Anesthésie</div><div class="v">${esc(op.anesthesie || '—')}</div></div>
        <div class="case"><div class="k">Date et heure</div><div class="v">${esc(dateHeure(op.debut))}</div></div>
        <div class="case"><div class="k">Durée prévue</div><div class="v">${Math.round((new Date(op.fin) - new Date(op.debut)) / 60000)} min</div></div>
        <div class="case"><div class="k">Séjour</div><div class="v">${esc(op.sejour || f.sejour)}</div></div>
        <div class="case"><div class="k">Site · salle</div><div class="v">${esc(site?.nom || '—')} · ${esc(salle?.nom || '—')}</div></div>
        <div class="case"><div class="k">Chirurgien</div><div class="v">${esc(chirurgien || '—')}</div></div>
        <div class="case"><div class="k">Anesthésiste</div><div class="v">${esc(op.anesthesiste || '')}</div></div>
        <div class="case"><div class="k">Service</div><div class="v">${esc(p.service || '—')}</div></div>
        <div class="case"><div class="k">Sexe · groupe sanguin</div><div class="v">${esc(p.sexe === 'F' ? 'Féminin' : p.sexe === 'M' ? 'Masculin' : '—')} · ${esc(p.groupe_sanguin || '—')}</div></div>
        <div class="case"><div class="k">Équipe</div><div class="v">${esc(op.equipe || '')}</div></div>
      </div>
      <div class="alerte"><div class="k">Allergies</div><div class="v">${esc(p.allergies || 'Aucune connue — à vérifier')}</div></div>
      <div class="grille deux">
        <div class="case"><div class="k">Antécédents</div><div class="v" style="white-space:pre-wrap">${esc(p.antecedents || '')}</div></div>
        <div class="case"><div class="k">Traitement en cours</div><div class="v" style="white-space:pre-wrap">${esc(p.traitement_en_cours || '')}</div></div>
        <div class="case"><div class="k">Personne à prévenir</div><div class="v">${esc([p.contact_urgence_nom, p.contact_urgence_lien && `(${p.contact_urgence_lien})`, p.contact_urgence_telephone].filter(Boolean).join(' '))}</div></div>
        <div class="case"><div class="k">Médecin traitant</div><div class="v">${esc(p.medecin_traitant || '')}</div></div>
      </div>
      <h2>Pièces du dossier</h2>
      <div class="coche">${['Consentement éclairé à l\'intervention', 'Consultation et consentement d\'anesthésie', ...(mineur ? ["Autorisation d'opérer un mineur"] : []), 'Fiche de préparation pré-opératoire', 'Check-list sécurité du patient au bloc', 'Feuille de surveillance et salle de réveil', 'Compte-rendu opératoire', 'Prescriptions post-opératoires et sortie', 'Livret « Mon opération » remis au patient']
        .map(t => `<div>${boite(false)}<span class="lg">${esc(t)}</span></div>`).join('')}</div>
      <h2>Étiquettes patient</h2><div class="etiquettes"><div>ÉTIQUETTE</div><div>ÉTIQUETTE</div><div>ÉTIQUETTE</div></div>
      ${pied()}</section>`,

    `<section class="page">${entete("Consentement éclairé à l'intervention")}
      <p>Je soussigné(e), patient ou représentant légal du patient, déclare avoir été informé(e) par le Dr <strong>${esc(chirurgien || '……………………')}</strong>,
      au cours d'une consultation, de l'intervention prévue : <strong>${esc(op.intervention)}</strong>${cote !== 'Sans objet' ? `, côté <strong>${esc(cote.toLowerCase())}</strong>` : ''}.</p>
      <p>${esc(f.description)}</p>
      <h2>J'ai été informé(e)</h2>
      <ul>
        <li>du but de l'intervention, de son déroulement et de sa durée prévisible ;</li>
        <li>des bénéfices attendus et des autres traitements possibles ;</li>
        <li>des risques fréquents et des risques graves, même rares (infection, saignement, cicatrice, complications liées à l'anesthésie) ;</li>
        <li>des suites habituelles : ${esc(f.apres.slice(0, 2).map(t => t.charAt(0).toLowerCase() + t.slice(1).replace(/\.$/, '')).join(' ; '))} ;</li>
        <li>de la possibilité qu'une découverte pendant l'opération nécessite un geste complémentaire indispensable.</li>
      </ul>
      <p>J'ai pu poser toutes mes questions et j'ai reçu des réponses claires. J'ai reçu le livret « Mon opération ». Je sais que je peux retirer mon consentement à tout moment avant l'intervention.</p>
      <div class="coche"><div>${boite(op.consentement_signe)}<span class="lg">J'accepte l'intervention proposée</span></div>
      <div>${boite(false)}<span class="lg">J'accepte une éventuelle transfusion de sang si elle est indispensable</span></div></div>
      ${fait()}
      <div class="sigs">${signature(mineur ? 'Représentant légal 1' : 'Patient', mineur ? '' : nom)}${mineur ? signature('Représentant légal 2') : ''}${signature('Chirurgien', chirurgien)}</div>
      ${pied()}</section>`,

    `<section class="page">${entete("Consultation et consentement d'anesthésie")}
      <div class="grille">
        <div class="case"><div class="k">Consultation le</div><div class="v">${esc(date(op.consult_anesthesie_le) || '')}</div></div>
        <div class="case"><div class="k">Anesthésiste</div><div class="v">${esc(op.anesthesiste || '')}</div></div>
        <div class="case"><div class="k">Type d'anesthésie prévu</div><div class="v">${esc(op.anesthesie || '')}</div></div>
        <div class="case"><div class="k">Score ASA</div><div class="v">${op.asa ? `ASA ${op.asa}` : '1 · 2 · 3 · 4'}</div></div>
        <div class="case"><div class="k">Poids · taille</div><div class="v"></div></div>
        <div class="case"><div class="k">Intubation difficile prévisible</div><div class="v">${boite(false)} non  ${boite(false)} oui</div></div>
      </div>
      <div class="alerte"><div class="k">Allergies</div><div class="v">${esc(p.allergies || '')}</div></div>
      <div class="grille deux"><div class="case"><div class="k">Antécédents anesthésiques</div><div class="v"></div></div><div class="case"><div class="k">Traitement à poursuivre ou arrêter</div><div class="v">${esc(p.traitement_en_cours || '')}</div></div></div>
      <h2>Jeûne prescrit</h2>
      <table><tr><td>Solides, lait non maternel</td><td>jusqu'à ${esc(dateHeure(j.solides))}</td></tr><tr><td>Lait maternel</td><td>jusqu'à ${esc(dateHeure(j.laitMaternel))}</td></tr><tr><td>Liquides clairs</td><td>jusqu'à ${esc(dateHeure(j.liquides))}</td></tr></table>
      <h2>Prémédication</h2><div class="lignes"><div></div><div></div></div>
      <p>J'ai été informé(e) du type d'anesthésie, de ses bénéfices et de ses risques, et des consignes de jeûne. J'ai pu poser mes questions. J'accepte l'anesthésie proposée et, si besoin, son adaptation par l'anesthésiste pendant l'intervention.</p>
      ${fait()}
      <div class="sigs">${signature(mineur ? 'Représentant légal' : 'Patient', mineur ? '' : nom)}${signature('Médecin anesthésiste', op.anesthesiste)}</div>
      ${pied()}</section>`,

    ...(mineur ? [`<section class="page">${entete("Autorisation d'opérer un mineur")}
      <p>Nous soussignés, titulaires de l'autorité parentale sur l'enfant <strong>${esc(nom)}</strong>, né(e) le <strong>${esc(date(p.date_naissance) || '……')}</strong>,
      autorisons l'équipe de l'Hôpital M&amp;M à pratiquer l'intervention <strong>${esc(op.intervention)}</strong> ainsi que l'anesthésie nécessaire,
      et tout acte médical ou chirurgical urgent que son état rendrait indispensable.</p>
      ${['Parent / représentant légal 1', 'Parent / représentant légal 2'].map(t => `<h2>${t}</h2>
      <div class="grille"><div class="case"><div class="k">Nom et prénom</div><div class="v"></div></div><div class="case"><div class="k">Lien avec l'enfant</div><div class="v"></div></div><div class="case"><div class="k">Téléphone</div><div class="v"></div></div></div>
      <div class="case"><div class="k">Adresse</div><div class="v">${esc([p.adresse, [p.code_postal, p.ville].filter(Boolean).join(' ')].filter(Boolean).join(', '))}</div></div>`).join('')}
      <div class="coche"><div>${boite(false)}<span class="lg">Un seul parent signe : l'autre parent est informé et d'accord (acte usuel) ou l'autorité parentale est exercée seul(e) (joindre le justificatif)</span></div>
      <div>${boite(false)}<span class="lg">Nous autorisons la sortie de l'enfant accompagné de l'un de nous ou de la personne désignée ci-dessous</span></div></div>
      <div class="case"><div class="k">Personne autorisée à reprendre l'enfant</div><div class="v"></div></div>
      ${fait()}
      <div class="sigs">${signature('Parent / représentant légal 1')}${signature('Parent / représentant légal 2')}</div>
      ${pied()}</section>`] : []),

    `<section class="page">${entete('Préparation pré-opératoire')}
      <table><thead><tr><th>Vérification</th><th class="c">Oui</th><th class="c">Non</th><th>Heure · remarque</th></tr></thead><tbody>
      ${['Douche pré-opératoire la veille', 'Douche pré-opératoire le matin', `Jeûne respecté (solides avant ${esc(dateHeure(j.solides))})`, 'Bijoux, piercings, vernis, maquillage retirés', 'Lentilles, lunettes, appareil dentaire ou auditif retirés', "Bracelet d'identification posé et vérifié", `Site opératoire marqué (côté : ${esc(cote)})`, 'Prémédication donnée', 'Vessie vidée', 'Tenue de bloc', 'Consentements signés présents', 'Dossier, imagerie et bilan sanguin joints', 'Constantes prises (T°, FC, TA, SpO₂, poids)']
        .map(t => `<tr><td>${t}</td><td class="c">${boite(false)}</td><td class="c">${boite(false)}</td><td></td></tr>`).join('')}
      </tbody></table>
      <div class="grille"><div class="case"><div class="k">Départ au bloc à</div><div class="v"></div></div><div class="case"><div class="k">Accompagné par</div><div class="v"></div></div><div class="case"><div class="k">Doudou / objet personnel</div><div class="v"></div></div></div>
      <div class="sigs">${signature('Infirmier(e) du service')}${signature('Infirmier(e) du bloc (accueil)')}</div>
      ${pied()}</section>`,

    `<section class="page">${entete('Check-list « Sécurité du patient au bloc »')}
      <p class="petit">Selon la check-list de la Haute Autorité de santé. Cocher « Oui » ou « N/A » (sans objet) ; toute réponse « Non » doit être résolue avant de poursuivre.</p>
      ${CHECKLIST.map(([, titre, items]) => `<h2>${esc(titre)}</h2><table class="serre"><thead><tr><th>Élément</th><th class="c">Oui</th><th class="c">Non</th><th class="c">N/A</th><th style="width:34mm">Par · heure</th></tr></thead><tbody>
        ${items.map(([cle, lib]) => { const x = op.checklist?.[cle]; return `<tr><td>${esc(lib)}</td><td class="c">${boite(x?.ok && !x?.na)}</td><td class="c">${boite(false)}</td><td class="c">${boite(x?.na)}</td><td class="petit">${x?.ok ? esc([x.par, x.le && new Date(x.le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })].filter(Boolean).join(' · ')) : ''}</td></tr>` }).join('')}
      </tbody></table>`).join('')}
      <div class="coche"><div>${boite(false)}<span class="lg">Décision : GO — l'intervention peut commencer</span></div><div>${boite(false)}<span class="lg">Décision : NO GO — intervention retardée ou annulée (motif au verso)</span></div></div>
      <div class="sigs">${signature('Coordonnateur check-list', '', true)}${signature('Chirurgien', chirurgien, true)}${signature('Anesthésiste', op.anesthesiste, true)}</div>
      ${pied()}</section>`,

    `<section class="page">${entete('Surveillance per- et post-opératoire')}
      <h2>Horaires</h2>
      <div class="grille">${HEURES.map(([cle, lib]) => `<div class="case"><div class="k">${esc(lib)}</div><div class="v">${heures[cle] ? esc(dateHeure(heures[cle])) : ''}</div></div>`).join('')}</div>
      <h2>Surveillance</h2>
      <table class="vide"><thead><tr><th>Heure</th><th>FC</th><th>TA</th><th>SpO₂</th><th>T°</th><th>EVA</th><th>Observations · traitements</th><th>Visa</th></tr></thead>
      <tbody>${'<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>'.repeat(8)}</tbody></table>
      <h2>Score d'Aldrete (sortie à partir de 9 / 10)</h2>
      <table class="serre"><thead><tr><th>Critère</th><th>0</th><th>1</th><th>2</th><th class="c">Entrée</th><th class="c">Sortie</th></tr></thead><tbody>
      ${ALDRETE.map(([cle, lib, niv]) => `<tr><td>${esc(lib)}</td>${niv.map(x => `<td class="petit">${esc(x)}</td>`).join('')}<td class="c"></td><td class="c">${op.reveil?.[cle] ?? ''}</td></tr>`).join('')}
      <tr><td><strong>Total</strong></td><td></td><td></td><td></td><td class="c"></td><td class="c"><strong>${op.reveil?.aldrete ?? ''}</strong></td></tr></tbody></table>
      <div class="sigs">${signature('Infirmier(e) de salle de réveil')}${signature('Sortie de salle de réveil autorisée par', op.anesthesiste)}</div>
      ${pied()}</section>`,

    `<section class="page">${entete('Compte-rendu opératoire')}
      <div class="grille">
        <div class="case"><div class="k">Opérateur</div><div class="v">${esc(chirurgien || '')}</div></div>
        <div class="case"><div class="k">Aides · équipe</div><div class="v">${esc(op.equipe || '')}</div></div>
        <div class="case"><div class="k">Anesthésie</div><div class="v">${esc([op.anesthesie, op.anesthesiste].filter(Boolean).join(' · '))}</div></div>
        <div class="case"><div class="k">Incision</div><div class="v">${heures.incision ? esc(dateHeure(heures.incision)) : ''}</div></div>
        <div class="case"><div class="k">Fin</div><div class="v">${heures.fin_intervention ? esc(dateHeure(heures.fin_intervention)) : ''}</div></div>
        <div class="case"><div class="k">Côté</div><div class="v">${esc(cote)}</div></div>
      </div>
      ${(() => {
        const champ = ([cle, lib, nb]) => `<div class="case"><div class="k">${esc(lib)}</div>${ch[cle] ? `<div class="v" style="white-space:pre-wrap">${esc(ch[cle])}</div>` : `<div class="lignes">${'<div></div>'.repeat(nb)}</div>`}</div>`
        const courts = CHAMPS_CR.filter(c => c[2] === 1), longs = CHAMPS_CR.filter(c => c[2] > 1)
        return longs.slice(0, 4).map(champ).join('') + `<div class="grille deux">${courts.map(champ).join('')}</div>` + longs.slice(4).map(champ).join('')
      })()}
      <div class="sigs">${signature('Chirurgien', chirurgien)}</div>
      ${pied()}</section>`,

    `<section class="page">${entete('Prescriptions post-opératoires et sortie')}
      <h2>Prescriptions</h2>
      <table class="vide"><thead><tr><th>Médicament</th><th>Dose</th><th>Voie</th><th>Horaires</th><th>Durée</th></tr></thead><tbody>${'<tr><td></td><td></td><td></td><td></td><td></td></tr>'.repeat(5)}</tbody></table>
      <div class="grille"><div class="case"><div class="k">Pansement</div><div class="v"></div></div><div class="case"><div class="k">Ablation des fils</div><div class="v"></div></div><div class="case"><div class="k">Rendez-vous de contrôle</div><div class="v">${esc(f.controle)}</div></div></div>
      <div class="case"><div class="k">Consignes de sortie</div><div class="v" style="white-space:pre-wrap;min-height:14mm">${esc(op.consignes_sortie || '')}</div></div>
      <h2>Autorisation de sortie</h2>
      <div class="coche"><div>${boite(false)}<span class="lg">Patient conscient, douleur contrôlée, boit sans vomir, a uriné</span></div><div>${boite(false)}<span class="lg">Accompagnant présent pour le retour et la première nuit (ambulatoire)</span></div><div>${boite(false)}<span class="lg">Ordonnances, arrêt ou certificat scolaire, rendez-vous remis</span></div></div>
      <p>Je reconnais avoir reçu les consignes de sortie, les ordonnances et le livret « Mon opération », et savoir quand appeler.</p>
      ${fait()}
      <div class="sigs">${signature('Médecin autorisant la sortie', chirurgien)}${signature(mineur ? 'Parent / représentant légal' : 'Patient', mineur ? '' : nom)}</div>
      ${pied()}</section>`,
  ]
  return pages.join('')
}

/** Ouvre le dossier opératoire prêt à imprimer. */
export function imprimerDossierOperatoire(d) {
  const nom = `${d.patient.prenom || ''} ${d.patient.nom || ''}`.trim()
  imprimer({ titre: `Dossier opératoire — ${nom}`, corps: dossierOperatoireHtml(d), page: 'A4', marge: '11mm', style: STYLE })
}

/** Mineur à la date de l'opération ? */
export function estMineur(naissance, le = new Date()) {
  if (!naissance) return false
  const n = new Date(naissance + 'T12:00:00'), d = new Date(le)
  let ans = d.getFullYear() - n.getFullYear()
  if (d.getMonth() < n.getMonth() || (d.getMonth() === n.getMonth() && d.getDate() < n.getDate())) ans--
  return ans < 18
}
