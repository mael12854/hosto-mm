// Dossier patient complet à imprimer (A4), adapté à chaque patient :
// synthèse de tout ce qui est enregistré + formulaires selon la situation (urgences et domaine,
// hospitalisation, mineur ou majeur, allergie, opération prévue).
import { supabase } from './supabase.js'
import { date, dateHeure, esc, nomComplet, nomMedecin, statut } from './format.js'
import { adresseSite, siteDe } from './sites.jsx'
import { logoSvgTexte } from '../components/Logo.jsx'
import { imprimer } from './impression.js'
import { FILIERES, filiereDe, libelleFiliere } from './urgences.js'
import { CHAMPS_CR } from './operations.js'

/** Compte-rendu opératoire rempli (au moins un champ). */
const crRempli = o => !!o.compte_rendu && Object.values(o.compte_rendu).some(v => String(v || '').trim())
import { boite, champ, coches, dossierOperatoireHtml, estMineur, fait, signature } from './dossierOperatoire.js'
import { PAPIERS, STYLE_PAPIERS } from './papeterie.js'

const FILET = '#D8D2C6'

const STYLE = STYLE_PAPIERS + `
.page.flux{min-height:0}
.bloc{border:0.3mm solid ${FILET};padding:2mm 3mm;break-inside:avoid;display:grid;gap:1mm}
.bloc .t{font-weight:600}.bloc .m{font-family:'IBM Plex Mono',monospace;font-size:8pt;color:#656C71}
.pre{white-space:pre-wrap}
.vide-txt{font-size:9.5pt;color:#656C71;font-style:italic}
`

const vides = (n, cols, h = '') => (`<tr${h ? ` style="height:${h}"` : ''}>` + '<td></td>'.repeat(cols) + '</tr>').repeat(n)
const ouiNon = (lignes, cols = ['Oui', 'Non']) => `<table class="serre"><thead><tr><th></th>${cols.map(c => `<th class="c">${c}</th>`).join('')}<th>Précisions</th></tr></thead><tbody>
${lignes.map(l => `<tr><td>${l}</td>${cols.map(() => `<td class="c">${boite(false)}</td>`).join('')}<td></td></tr>`).join('')}</tbody></table>`
const rien = t => `<p class="vide-txt">${t}</p>`
const nb = v => (v == null || v === '' ? '' : String(v).replace('.', ','))

/**
 * Charge tout le dossier du patient, selon les droits de la personne connectée.
 * espace = 'patient' : le patient lui-même (opérations par mes_operations, sans compte-rendu ni check-list).
 */
export async function chargerDossierComplet(patient, espace = 'personnel') {
  const q = t => supabase.from(t).select('*').eq('patient_id', patient.id)
  const lui = espace === 'patient'
  const r = await Promise.all([
    q('constantes_vitales').order('date_mesure', { ascending: false }),
    q('administrations_medicament').order('heure_administration', { ascending: false }),
    q('prescriptions').order('created_at', { ascending: false }),
    q('comptes_rendus').order('created_at', { ascending: false }),
    q('documents_officiels').order('created_at', { ascending: false }),
    q('examens_laboratoire').order('date_demande', { ascending: false }),
    q('rendez_vous').order('date_heure', { ascending: false }),
    lui ? supabase.rpc('mes_operations') : q('operations').order('debut', { ascending: false }),
    q('mesures_croissance').order('date_mesure', { ascending: false }),
    q('vaccinations').order('date_vaccination', { ascending: false }),
    supabase.from('medecins').select('id, nom, prenom'),
    supabase.from('infirmiers').select('id, nom, prenom'),
    lui ? Promise.resolve({ data: [] }) : supabase.from('salles_operation').select('*'),
    q('hospitalisations').order('date_entree', { ascending: false }),
    lui ? supabase.rpc('mes_comptes_rendus_operatoires') : Promise.resolve({ data: [] }),
  ])
  const [cst, adm, pr, cr, doc, ex, rdv, opsBruts, mes, vac, med, inf, salles, sejours, crop] = r.map(x => x.data || [])
  // Espace patient : comptes-rendus opératoires signés rattachés à leur opération.
  const crs = Object.fromEntries(crop.map(x => [x.operation_id, x]))
  const ops = opsBruts.map(o => (crs[o.id] ? { ...o, compte_rendu: crs[o.id].compte_rendu, compte_rendu_signe_le: crs[o.id].compte_rendu_signe_le } : o))
  const personnes = {}
  for (const x of inf) personnes[x.id] = nomComplet(x)
  for (const x of med) personnes[x.id] = nomMedecin(x)
  return { cst, adm, pr, cr, doc, ex, rdv, ops, mes, vac, personnes, salles, sejours, espace }
}

/** Contexte : patient, données, situation (urgences, hospitalisé, mineur…). */
function contexte({ patient: brut, donnees: d, sites, medecin }) {
  // Séjours : ceux chargés avec le dossier si le patient n'en apporte pas (espace patient).
  const p = brut.sejours ? brut : { ...brut, sejours: d.sejours || [], sejour: (d.sejours || [])[0] || null }
  const enCours = p.sejour && statut(p.sejour).cle !== 'sorti' ? p.sejour : null
  const filiere = enCours ? filiereDe(enCours, p.service) : null
  const maintenant = new Date()
  const opAVenir = [...d.ops].reverse().find(o => !['terminée', 'annulée'].includes(o.statut) && new Date(o.fin) > new Date(maintenant.getTime() - 24 * 3600e3))
  const site = sites.parId(enCours?.site_id) || sites.parId(opAVenir?.site_id) || sites.parDefaut
  return {
    p, d, sites, site, medecin, enCours, filiere, opAVenir, espacePatient: d.espace === 'patient',
    mineur: estMineur(p.date_naissance),
    age: p.date_naissance ? Math.floor((maintenant - new Date(p.date_naissance + 'T12:00:00')) / 3.15576e10) : null,
    allergie: !!p.allergies?.trim() && !/^aucune/i.test(p.allergies.trim()),
    nom: `${p.prenom || ''} ${(p.nom || '').toUpperCase()}`.trim(),
    qui: id => d.personnes[id] || '',
  }
}

// ——— Registre des pièces : [code, titre, groupe, proposée ?, raison, flux (plusieurs pages possibles)] ———
const PIECES = [
  ['garde', 'Page de garde et sommaire', 'Dossier', () => true, 'Toujours'],
  ['identite', 'Identité, coordonnées et contacts', 'Dossier', () => true, 'Toujours'],
  ['synthese', 'Synthèse médicale', 'Dossier', () => true, 'Toujours'],
  ['sejours', 'Séjours', 'Dossier', c => c.p.sejours?.length > 0, 'Séjours enregistrés', true],
  ['constantes', 'Constantes vitales', 'Dossier', c => c.d.cst.length > 0, 'Relevés enregistrés', true],
  ['medicaments', 'Médicaments administrés', 'Dossier', c => c.d.adm.length > 0, 'Administrations enregistrées', true],
  ['ordonnances', 'Ordonnances', 'Dossier', c => c.d.pr.length > 0, 'Ordonnances enregistrées', true],
  ['comptes_rendus', 'Comptes-rendus', 'Dossier', c => c.d.cr.length > 0, 'Comptes-rendus enregistrés', true],
  ['bulletins', 'Bulletins entrée / sortie', 'Dossier', c => c.d.doc.length > 0, 'Bulletins enregistrés', true],
  ['examens', 'Examens', 'Dossier', c => c.d.ex.length > 0, 'Examens enregistrés', true],
  ['rendez_vous', 'Rendez-vous', 'Dossier', c => c.d.rdv.length > 0, 'Rendez-vous enregistrés', true],
  ['operations', 'Opérations', 'Dossier', c => c.d.ops.length > 0, 'Opérations enregistrées', true],
  ['cr_operatoires', 'Comptes-rendus opératoires', 'Dossier', c => c.d.ops.some(crRempli), 'Comptes-rendus opératoires rédigés', true],
  ['ordo_postop', 'Ordonnances post-opératoires', 'Dossier', c => c.d.pr.some(x => x.operation_id), 'Ordonnances après une opération', true],
  ['carnet', 'Carnet de santé : croissance et vaccins', 'Dossier', c => c.d.mes.length > 0 || c.d.vac.length > 0, 'Mesures ou vaccins enregistrés', true],

  ['triage', "Fiche de triage d'accueil (IOA)", 'Urgences', c => !!c.filiere, 'Passage aux urgences en cours'],
  ['filiere', 'Fiche du domaine d\'urgence', 'Urgences', c => !!c.filiere, 'Selon le domaine d\'orientation'],
  ['observation', 'Observation médicale des urgences', 'Urgences', c => !!c.filiere, 'Passage aux urgences en cours'],

  ['surveillance', 'Feuille de surveillance', 'Hospitalisation', c => !!c.enCours, 'Séjour en cours'],
  ['administration', 'Administration des médicaments', 'Hospitalisation', c => !!c.enCours && !c.filiere, 'Hospitalisation en cours'],
  ['transmissions', 'Transmissions ciblées', 'Hospitalisation', c => !!c.enCours, 'Séjour en cours'],
  ['risques', 'Évaluation des risques (chute, escarres, nutrition)', 'Hospitalisation', c => !!c.enCours && !c.filiere, 'Hospitalisation en cours'],
  ['sortie', 'Bulletin de sortie et consignes', 'Hospitalisation', c => !!c.enCours, 'Séjour en cours'],

  ['soins_mineur', 'Autorisation de soins pour un mineur', 'Autorisations', c => c.mineur, 'Patient mineur'],
  ['confiance', 'Désignation de la personne de confiance', 'Autorisations', c => !c.mineur && !!c.enCours, 'Adulte hospitalisé'],
  ['allergie', 'Alerte allergie', 'Autorisations', c => c.allergie, 'Allergie connue'],
  ['image', "Droit à l'image et partage d'informations", 'Autorisations', () => false, 'Si besoin'],

  ['dossier_operatoire', 'Dossier opératoire de la prochaine opération', 'Bloc', c => !!c.opAVenir, 'Opération programmée'],
]

/** Pièces disponibles, avec celles proposées pour ce patient. */
// Pièces que le patient peut imprimer lui-même : son dossier et ses autorisations (pas les fiches de soins).
const PIECES_PATIENT = new Set(['garde', 'identite', 'synthese', 'sejours', 'constantes', 'medicaments', 'ordonnances', 'comptes_rendus', 'bulletins', 'examens', 'rendez_vous', 'operations', 'cr_operatoires', 'ordo_postop', 'carnet', 'soins_mineur', 'confiance', 'image'])

export function piecesDossierPatient(entree) {
  const c = contexte(entree)
  const liste = c.espacePatient ? PIECES.filter(x => PIECES_PATIENT.has(x[0])) : PIECES
  return {
    situation: [c.filiere ? `${c.filiere === 'generale' ? 'Urgences · à trier' : libelleFiliere(c.filiere)}` : c.enCours ? `Hospitalisé · ${c.p.service}` : 'Pas de séjour en cours', c.mineur ? 'mineur' : 'majeur', c.opAVenir ? 'opération prévue' : ''].filter(Boolean).join(' · '),
    pieces: liste.map(([code, titre, groupe, quand, raison]) => ({
      code, groupe, raison, defaut: c.espacePatient && ['soins_mineur', 'confiance', 'image'].includes(code) ? false : !!quand(c),
      titre: code === 'filiere' && c.filiere ? (c.filiere === 'generale' ? "Fiche d'orientation (Urgences, à trier)" : `Fiche · ${libelleFiliere(c.filiere)}`) : titre,
    })),
  }
}

// ——— Formulaires du domaine d'urgence ———
function ficheFiliere(c) {
  const f = c.filiere || 'generale'
  const motif = esc(c.enCours?.motif || '')
  const base = `<div class="grille">${champ('Motif', motif)}${champ('Arrivée', esc(dateHeure(c.enCours?.date_entree)))}${champ('Triage', c.enCours?.niveau_urgence ? `P${c.enCours.niveau_urgence}` : '')}</div>`
  const sig = `<div class="sigs">${signature('Médecin', c.medecin, true)}${signature('Infirmier(e)', '', true)}</div>`
  const F = {
    generale: () => `${base}
      <p>Le patient est arrivé aux Urgences et n'est pas encore orienté. Cocher le domaine retenu après le triage.</p>
      <table class="serre"><thead><tr><th class="c"></th><th>Domaine</th><th>Pour</th></tr></thead><tbody>
      ${FILIERES.filter(x => x[0] !== 'generale').map(([, l, aide]) => `<tr><td class="c">${boite(false)}</td><td><strong>${esc(l)}</strong></td><td class="petit">${esc(aide)}</td></tr>`).join('')}
      </tbody></table>
      ${champ("Raison de l'orientation", '', 'min-height:16mm')}
      <div class="grille deux">${champ('Orienté le (heure)')}${champ('Vers le box / la salle')}</div>${sig}`,
    pediatrie: () => `${base}
      <div class="grille quatre">${champ('Âge', c.age != null ? `${c.age} an${c.age > 1 ? 's' : ''}` : '')}${champ('Poids (kg)')}${champ('T° (°C)')}${champ('FC · FR')}</div>
      <div class="alerte"><div class="k">Signes de gravité : appeler le médecin immédiatement</div>
      ${coches(['Enfant somnolent, difficile à réveiller, geignard', 'Détresse respiratoire (tirage, battement des ailes du nez, pauses)', 'Taches violacées qui ne s\'effacent pas (purpura)', 'Déshydratation : yeux creux, pas de larmes, pas de pipi depuis 6 h', 'Nourrisson de moins de 3 mois avec fièvre', 'Convulsion'])}</div>
      <h2>Évaluation</h2>${ouiNon(['Douleur évaluée (EVENDOL avant 7 ans, visages ensuite) — score :', 'Fièvre traitée (heure, médicament, dose/kg)', 'Vaccins à jour (carnet de santé vu)', 'Allergies vérifiées avec le parent', 'Mange et boit', 'Parent présent (nom, lien)'])}
      ${champ('Observations', '', 'min-height:14mm')}${sig}`,
    orl: () => `${base}
      <h2>Examen ORL</h2>
      <div class="grille deux">${champ('Oreille droite (otoscopie)')}${champ('Oreille gauche (otoscopie)')}${champ('Fosses nasales')}${champ('Gorge, amygdales')}</div>
      ${ouiNon(['Saignement de nez (épistaxis) : côté, abondance, durée', 'Méchage ou compression faits', 'Corps étranger (nez, oreille, gorge)', 'Gêne pour respirer ou avaler, voix modifiée', 'Fièvre, ganglions', 'Baisse d\'audition, vertiges', 'Antécédent d\'amygdalectomie récente (moins de 15 jours)'])}
      ${champ('Traitement, gestes', '', 'min-height:14mm')}${sig}`,
    ophtalmo: () => `${base}
      <h2>Examen des yeux</h2>
      <table class="quadr"><thead><tr><th></th><th>Œil droit</th><th>Œil gauche</th></tr></thead><tbody>
      ${['Acuité visuelle', 'Rougeur', 'Douleur', 'Corps étranger', 'Test à la fluorescéine', 'Pupille, réflexes'].map(l => `<tr style="height:9mm"><td>${l}</td><td></td><td></td></tr>`).join('')}</tbody></table>
      ${ouiNon(['Traumatisme (choc, projection, produit chimique)', 'Lavage oculaire fait (produit chimique)', 'Lentilles de contact', 'Baisse brutale de la vision : avis ophtalmologique urgent'])}
      ${champ('Traitement, consignes', '', 'min-height:12mm')}${sig}`,
    trauma: () => `${base}
      <div class="grille">${champ('Mécanisme (chute, choc, vélo…)')}${champ('Heure de l\'accident')}${champ('Côté', `${boite(false)} droit  ${boite(false)} gauche`)}</div>
      <h2>Lésions</h2>
      <table class="quadr"><thead><tr><th>Localisation</th><th>Type (plaie, fracture, entorse…)</th><th>Radio</th><th>Geste</th></tr></thead><tbody>${vides(5, 4, '9mm')}</tbody></table>
      ${ouiNon(['Membre chaud, coloré, sensible et mobile en aval', 'Perte de connaissance, vomissements (choc à la tête)', 'Vaccin antitétanique à jour', 'Immobilisation posée (attelle, écharpe, plâtre)', 'Antalgique donné (heure)', 'Glace, surélévation'])}
      ${champ('Conduite à tenir', '', 'min-height:12mm')}${sig}`,
    cardio: () => `${base}
      <div class="alerte"><div class="k">Douleur thoracique : ECG dans les 10 minutes</div><div class="grille">${champ('ECG fait à')}${champ('Lu par')}${champ('Résultat')}</div></div>
      <h2>Douleur</h2>
      <div class="grille">${champ('Début')}${champ('Type (serrement, brûlure…)')}${champ('Irradiation')}</div>
      <div class="grille quatre">${champ('TA bras droit')}${champ('TA bras gauche')}${champ('FC')}${champ('SpO₂')}</div>
      ${ouiNon(['Facteurs de risque : tabac, tension, diabète, cholestérol, hérédité', 'Malaise, perte de connaissance, palpitations', 'Essoufflement', 'Prise de sang (troponine) — heure', 'Traitement en cours (anticoagulant…)'])}
      ${champ('Conduite à tenir', '', 'min-height:12mm')}${sig}`,
    gyneco: () => `${base}
      <div class="grille quatre">${champ('Date des dernières règles')}${champ('Grossesse', `${boite(false)} non  ${boite(false)} oui`)}${champ('Terme (SA)')}${champ('Test de grossesse')}</div>
      ${ouiNon(['Saignements (abondance)', 'Douleurs, contractions (fréquence)', 'Perte de liquide', 'Mouvements du bébé perçus', 'Fièvre, brûlures urinaires', 'Groupe sanguin et rhésus connus'])}
      ${champ('Examen', '', 'min-height:14mm')}${champ('Conduite à tenir', '', 'min-height:12mm')}${sig}`,
    dentaire: () => `${base}
      <h2>Dents concernées</h2>
      <table class="quadr"><tbody><tr>${['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'].map(n => `<td class="c" style="height:9mm;font-size:8pt;vertical-align:bottom">${n}</td>`).join('')}</tr>
      <tr>${['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'].map(n => `<td class="c" style="height:9mm;font-size:8pt;vertical-align:top">${n}</td>`).join('')}</tr></tbody></table>
      <p class="petit">Entourer la ou les dents. Dent de lait chez l'enfant : noter « lait ».</p>
      ${ouiNon(['Dent cassée ou tombée (garder la dent dans du lait, venir dans l\'heure)', 'Gonflement de la joue, fièvre (abcès)', 'Saignement des gencives', 'Douleur la nuit, au chaud ou au froid', 'Choc au visage associé'])}
      ${champ('Traitement, rendez-vous dentiste', '', 'min-height:12mm')}${sig}`,
    psy: () => `${base}
      <div class="alerte"><div class="k">Sécurité</div>${coches(['Objets dangereux retirés (ceinture, lacets, objets coupants, médicaments)', 'Patient installé au calme, sous surveillance visuelle', 'Accompagnant présent ou prévenu'])}</div>
      <h2>Évaluation</h2>
      ${ouiNon(['Idées de mort ou de suicide', 'Projet ou moyen précis', 'Geste récent', 'Agitation, agressivité', 'Alcool, médicaments, produits', 'Suivi psychiatrique connu (nom du soignant)', 'Accepte les soins'])}
      <div class="grille">${champ('Risque', `${boite(false)} faible  ${boite(false)} moyen  ${boite(false)} élevé`)}${champ('Surveillance toutes les')}${champ('Avis psychiatrique demandé à')}</div>
      ${champ('Observations', '', 'min-height:14mm')}${sig}`,
  }
  return (F[f] || F.generale)()
}

// ——— Corps de chaque pièce ———
const CORPS = {
  garde: (c, titres) => `
    <div class="encadre"><strong style="font-size:15pt">${esc(c.nom)}</strong><br>${esc(c.p.service || '')} · ${esc(c.site ? siteDe(c.site.nom) : '')}<br><span class="petit">Dossier édité le ${esc(new Date().toLocaleDateString('fr-FR'))} ${c.espacePatient ? 'depuis « Mon Hôpital M&amp;M »' : `par ${esc(c.medecin || '……')}`}</span></div>
    <div class="grille">${champ('Situation', esc(c.filiere ? (c.filiere === 'generale' ? 'Urgences · à trier' : libelleFiliere(c.filiere)) : c.enCours ? 'Hospitalisé' : 'Pas de séjour en cours'))}${champ('Âge', c.age != null ? `${c.age} ans${c.mineur ? ' · mineur' : ''}` : '')}${champ('Groupe sanguin', esc(c.p.groupe_sanguin || ''))}</div>
    ${c.allergie ? `<div class="alerte"><div class="k">Allergies</div><div class="v">${esc(c.p.allergies)}</div></div>` : ''}
    <h2>Sommaire</h2>
    <div class="sommaire">${titres.map((t, i) => `<div><span class="num">${String(i + 1).padStart(2, '0')}</span><span>${esc(t)}</span></div>`).join('')}</div>
    <h2>Étiquettes patient</h2><div class="etiquettes"><div>ÉTIQUETTE</div><div>ÉTIQUETTE</div><div>ÉTIQUETTE</div></div>`,

  identite: c => { const p = c.p; return `
    <h2>Identité</h2><div class="grille">${champ('Nom', esc((p.nom || '').toUpperCase()))}${champ('Prénom', esc(p.prenom || ''))}${champ('Date de naissance', esc(date(p.date_naissance)))}${champ('Lieu de naissance', esc(p.lieu_naissance || ''))}${champ('Sexe', p.sexe === 'F' ? 'Féminin' : p.sexe === 'M' ? 'Masculin' : '')}${champ('Groupe sanguin', esc(p.groupe_sanguin || ''))}${champ('N° de dossier', esc(p.numero_dossier || ''))}${champ('IPP', esc(p.ipp || ''))}${champ('Service · chambre', esc([p.service, p.num_chambre].filter(Boolean).join(' · ')))}</div>
    <h2>Coordonnées</h2>${champ('Adresse', esc([p.adresse, p.complement_adresse, [p.code_postal, p.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')))}
    <div class="grille">${champ('Téléphone', esc(p.telephone || ''))}${champ('E-mail', esc(p.email || ''))}${champ('Compte « Mon Hôpital M&amp;M »', p.auth_id ? 'Actif' : 'Non')}</div>
    <h2>Personne à prévenir</h2><div class="grille">${champ('Nom', esc(p.contact_urgence_nom || ''))}${champ('Lien', esc(p.contact_urgence_lien || ''))}${champ('Téléphone', esc(p.contact_urgence_telephone || ''))}</div>
    <h2>Suivi</h2><div class="grille deux">${champ('Médecin traitant', esc(p.medecin_traitant || ''))}${champ('Mutuelle · n° de sécurité sociale')}</div>
    <div class="sigs">${signature('Informations vérifiées avec le patient ou ses parents', '', true)}</div>` },

  synthese: c => { const p = c.p, s = c.enCours, dernier = c.d.cst[0]
    const prochain = [...c.d.rdv].reverse().find(r => r.statut === 'prévu' && new Date(r.date_heure) > new Date())
    return `
    <div class="alerte"><div class="k">Allergies</div><div class="v">${esc(p.allergies || 'Aucune connue — à vérifier')}</div></div>
    <div class="grille deux">${champ('Antécédents', esc(p.antecedents || ''), 'white-space:pre-wrap;min-height:14mm')}${champ('Traitement en cours', esc(p.traitement_en_cours || ''), 'white-space:pre-wrap;min-height:14mm')}</div>
    <h2>Séjour en cours</h2>${s ? `<div class="grille">${champ('Entrée', esc(dateHeure(s.date_entree)))}${champ('Site', esc(c.sites.nom(s.site_id)))}${champ('Triage', s.niveau_urgence ? `P${s.niveau_urgence}` : '')}${champ('Service · domaine', esc([p.service, c.filiere && libelleFiliere(c.filiere)].filter(Boolean).join(' · ')))}${champ('Statut', esc(statut(s).libelle || ''))}${champ('Motif', esc(s.motif || ''))}</div>` : rien('Aucun séjour en cours.')}
    <h2>Dernières constantes</h2>${dernier ? `<div class="grille quatre">${champ('Le', esc(dateHeure(dernier.date_mesure)))}${champ('T°', nb(dernier.temperature))}${champ('FC', nb(dernier.pouls))}${champ('TA', dernier.tension_systolique ? `${dernier.tension_systolique}/${dernier.tension_diastolique ?? ''}` : '')}${champ('SpO₂', nb(dernier.saturation))}${champ('Poids', nb(dernier.poids))}</div>` : rien('Aucun relevé.')}
    <h2>À venir</h2><div class="grille deux">${champ('Prochain rendez-vous', prochain ? esc(`${dateHeure(prochain.date_heure)} · ${prochain.motif || 'Consultation'} · ${c.sites.nom(prochain.site_id)}`) : '—')}${champ('Opération', c.opAVenir ? esc(`${dateHeure(c.opAVenir.debut)} · ${c.opAVenir.intervention}`) : '—')}</div>
    ${champ('Examens en attente', esc(c.d.ex.filter(x => x.statut !== 'disponible').map(x => x.type_examen).join(' · ') || '—'))}
    <h2>En chiffres</h2><div class="grille quatre">${[['Séjours', p.sejours?.length || 0], ['Ordonnances', c.d.pr.length], ['Comptes-rendus', c.d.cr.length], ['Examens', c.d.ex.length], ['Rendez-vous', c.d.rdv.length], ['Opérations', c.d.ops.length], ['Relevés', c.d.cst.length], ['Vaccins', c.d.vac.length]].map(([k, v]) => champ(k, String(v))).join('')}</div>` },

  sejours: c => `<table class="serre"><thead><tr><th>Entrée</th><th>Sortie</th><th>Site</th><th>Domaine</th><th>Triage</th><th>Motif</th></tr></thead><tbody>
    ${(c.p.sejours || []).map(s => `<tr><td>${esc(dateHeure(s.date_entree))}</td><td>${s.date_sortie ? esc(dateHeure(s.date_sortie)) : 'En cours'}</td><td>${esc(c.sites.nom(s.site_id))}</td><td>${s.filiere_urgence ? esc(libelleFiliere(s.filiere_urgence)) : ''}</td><td>${s.niveau_urgence ? `P${s.niveau_urgence}` : ''}</td><td>${esc(s.motif || '')}</td></tr>`).join('')}</tbody></table>`,

  constantes: c => `<table class="serre"><thead><tr><th>Date</th><th>T°</th><th>FC</th><th>TA</th><th>SpO₂</th><th>Poids</th><th>Observations</th><th>Par</th></tr></thead><tbody>
    ${c.d.cst.map(x => `<tr><td>${esc(dateHeure(x.date_mesure))}</td><td>${nb(x.temperature)}</td><td>${nb(x.pouls)}</td><td>${x.tension_systolique ? `${x.tension_systolique}/${x.tension_diastolique ?? ''}` : ''}</td><td>${nb(x.saturation)}</td><td>${nb(x.poids)}</td><td>${esc(x.notes || '')}</td><td class="petit">${esc(c.qui(x.releve_par))}</td></tr>`).join('')}</tbody></table>`,

  medicaments: c => `<table class="serre"><thead><tr><th>Date et heure</th><th>Médicament</th><th>Notes</th><th>Donné par</th></tr></thead><tbody>
    ${c.d.adm.map(x => `<tr><td>${esc(dateHeure(x.heure_administration))}</td><td><strong>${esc(x.medicament)}</strong></td><td>${esc(x.notes || '')}</td><td class="petit">${esc(c.qui(x.administre_par))} ${esc(x.role_administrant || '')}</td></tr>`).join('')}</tbody></table>`,

  ordonnances: c => c.d.pr.map(x => `<div class="bloc"><div class="t">Ordonnance${x.operation_id ? ' post-opératoire' : ''} du ${esc(date(x.created_at))}</div><div class="m">${esc([c.qui(x.medecin_id), c.sites.nom(x.site_id)].filter(Boolean).join(' · '))}</div>
    ${(x.lignes || []).length ? `<ol style="margin:0;padding-left:5mm">${x.lignes.map(l => `<li><strong>${esc(l.nom)}</strong>${l.forme ? ` — ${esc(l.forme)}` : ''}${l.posologie ? `<br><span class="petit">${esc(l.posologie)}${l.duree ? ` · pendant ${esc(l.duree)}` : ''}</span>` : ''}</li>`).join('')}</ol>` : `<div class="pre">${esc((x.contenu || '').split('\n').slice(1).join('\n').trim())}</div>`}</div>`).join(''),

  comptes_rendus: c => c.d.cr.map(x => { const [titre, ...reste] = (x.contenu || '').split('\n')
    return `<div class="bloc"><div class="t">${esc(titre || 'Compte-rendu')}</div><div class="m">${esc(dateHeure(x.created_at))} · ${esc(c.qui(x.medecin_id))}</div><div class="pre">${esc(reste.join('\n').replace(/^-+\n/, '').trim())}</div></div>` }).join(''),

  bulletins: c => c.d.doc.map(x => `<div class="bloc"><div class="t">Séjour du ${esc(date(x.date_entree) || '—')} au ${esc(date(x.date_sortie) || '—')}</div>
    ${[['Motif', x.motif_admission], ['Évolution', x.evolution_clinique], ['Mode de sortie', x.mode_sortie], ['Traitement de sortie', x.traitement_sortie], ['Suivi', x.rdv_suivi], ['Consignes', x.consignes_post]].filter(y => y[1]).map(([k, v]) => `<div><span class="k">${k}</span><div class="pre">${esc(v)}</div></div>`).join('')}</div>`).join(''),

  examens: c => `<table class="serre"><thead><tr><th>Demandé le</th><th>Examen</th><th>Statut</th><th>Résultat</th></tr></thead><tbody>
    ${c.d.ex.map(x => `<tr><td>${esc(dateHeure(x.date_demande))}</td><td><strong>${esc(x.type_examen)}</strong></td><td>${esc(x.statut)}</td><td class="pre">${esc(x.resultat || '')}</td></tr>`).join('')}</tbody></table>`,

  rendez_vous: c => `<table class="serre"><thead><tr><th>Date et heure</th><th>Site</th><th>Motif</th><th>Statut</th></tr></thead><tbody>
    ${c.d.rdv.map(r => `<tr><td>${esc(dateHeure(r.date_heure))}</td><td>${esc(c.sites.nom(r.site_id))}</td><td>${esc(r.motif || 'Consultation')}</td><td>${esc(r.statut)}</td></tr>`).join('')}</tbody></table>`,

  operations: c => c.d.ops.map(o => `<div class="bloc"><div class="t">${esc(o.intervention)}${o.cote && o.cote !== 'Sans objet' ? ` · côté ${esc(o.cote.toLowerCase())}` : ''}</div>
    <div class="m">${esc(dateHeure(o.debut))} · ${esc(c.sites.nom(o.site_id))} · ${esc(o.statut.toUpperCase())} · ${esc(o.chirurgien || c.qui(o.chirurgien_id))} · ${esc(o.anesthesie || '')} · ${esc(o.sejour || '')}</div>
    ${o.compte_rendu?.geste ? `<div><span class="k">Geste réalisé</span><div class="pre">${esc(o.compte_rendu.geste)}</div></div>` : ''}${o.consignes_sortie ? `<div><span class="k">Consignes de sortie</span><div class="pre">${esc(o.consignes_sortie)}</div></div>` : ''}</div>`).join(''),

  cr_operatoires: c => c.d.ops.filter(crRempli).map(o => `<div class="bloc"><div class="t">${esc(o.intervention)}${o.cote && o.cote !== 'Sans objet' ? ` · côté ${esc(o.cote.toLowerCase())}` : ''}</div>
    <div class="m">${esc(dateHeure(o.debut))} · ${esc(c.sites.nom(o.site_id))} · ${esc(o.chirurgien || c.qui(o.chirurgien_id))} · ${esc(o.anesthesie || '')} · ${o.compte_rendu_signe_le ? `signé le ${esc(dateHeure(o.compte_rendu_signe_le))}` : 'NON SIGNÉ'}</div>
    ${CHAMPS_CR.filter(([k]) => o.compte_rendu?.[k]).map(([k, l]) => `<div><span class="k">${esc(l)}</span><div class="pre">${esc(o.compte_rendu[k])}</div></div>`).join('')}</div>`).join(''),

  ordo_postop: c => c.d.pr.filter(x => x.operation_id).map(x => { const o = c.d.ops.find(y => y.id === x.operation_id)
    return `<div class="bloc"><div class="t">Ordonnance post-opératoire du ${esc(date(x.created_at))}</div><div class="m">${esc(o ? `Après : ${o.intervention} du ${date(o.debut)}` : '')} · ${esc(c.qui(x.medecin_id))}</div>
    <ol style="margin:0;padding-left:5mm">${(x.lignes || []).map(l => `<li><strong>${esc(l.nom)}</strong>${l.posologie ? `<br><span class="petit">${esc(l.posologie)}${l.duree ? ` · pendant ${esc(l.duree)}` : ''}</span>` : ''}</li>`).join('')}</ol></div>` }).join(''),

  carnet: c => `<h2>Croissance</h2>${c.d.mes.length ? `<table class="serre"><thead><tr><th>Date</th><th>Taille (cm)</th><th>Poids (kg)</th><th>Périmètre crânien</th></tr></thead><tbody>${c.d.mes.map(m => `<tr><td>${esc(date(m.date_mesure))}</td><td>${nb(m.taille_cm)}</td><td>${nb(m.poids_kg)}</td><td>${nb(m.perimetre_cranien_cm)}</td></tr>`).join('')}</tbody></table>` : rien('Aucune mesure.')}
    <h2>Vaccinations</h2>${c.d.vac.length ? `<table class="serre"><thead><tr><th>Date</th><th>Vaccin</th><th>Dose</th><th>Lot</th></tr></thead><tbody>${c.d.vac.map(v => `<tr><td>${esc(date(v.date_vaccination))}</td><td>${esc(v.vaccin)}</td><td>${esc(v.dose || '')}</td><td>${esc(v.lot || '')}</td></tr>`).join('')}</tbody></table>` : rien('Aucune vaccination enregistrée.')}`,

  triage: c => { const s = c.enCours || {}; return `
    <div class="grille">${champ('Arrivée', esc(dateHeure(s.date_entree)))}${champ('Mode d\'arrivée', `${boite(false)} à pied  ${boite(false)} pompiers  ${boite(false)} SAMU  ${boite(false)} parents`)}${champ('Accompagnant')}</div>
    ${champ('Motif de venue', esc(s.motif || ''), 'min-height:10mm')}
    <h2>Constantes à l'accueil</h2>
    <div class="grille quatre">${['T° (°C)', 'FC (/min)', 'TA (mmHg)', 'SpO₂ (%)', 'FR (/min)', 'Glycémie', 'Douleur (0-10)', 'Poids (kg)'].map(k => champ(k)).join('')}</div>
    <h2>Niveau de tri</h2>
    <table class="serre"><tbody>${[[1, 'Urgence vitale', 'immédiat'], [2, 'Très urgent', 'sous 15 min'], [3, 'À surveiller', 'sous 30 min'], [4, 'Peu urgent', 'sous 1 h'], [5, 'Non urgent', 'sous 2 h']].map(([n, l, d]) => `<tr><td class="c">${boite(s.niveau_urgence === n)}</td><td><strong>P${n}</strong> ${l}</td><td class="petit">${d}</td></tr>`).join('')}</tbody></table>
    <h2>Orientation</h2>
    <div class="sommaire">${FILIERES.map(([k, l]) => `<div>${boite(c.filiere === k)}<span>${esc(k === 'generale' ? 'Urgences (à trier)' : l)}</span></div>`).join('')}</div>
    ${coches(['Bracelet posé', 'Allergies vérifiées' + (c.allergie ? ` : ${esc(c.p.allergies)}` : ''), 'Installé en salle d\'attente / box n° :'])}
    <div class="sigs">${signature("Infirmier(e) d'accueil et d'orientation (IOA)", '', true)}</div>` },

  filiere: c => ficheFiliere(c),

  observation: c => `
    <div class="grille">${champ('Vu le (heure)')}${champ('Médecin', esc(c.medecin || ''))}${champ('Domaine', esc(c.filiere ? libelleFiliere(c.filiere) : ''))}</div>
    ${champ('Histoire de la maladie', esc(c.enCours?.motif || ''), 'min-height:18mm')}
    ${champ('Examen clinique', '', 'min-height:26mm')}
    ${champ('Hypothèses diagnostiques', '', 'min-height:12mm')}
    <h2>Examens demandés</h2>${coches(['Biologie :', 'Radiographie :', 'Échographie / scanner :', 'ECG', 'Avis spécialisé :'])}
    ${champ('Traitement aux urgences', '', 'min-height:12mm')}
    <h2>Décision</h2>
    <div class="sommaire">${['Retour à domicile', 'Hospitalisation (service)', 'Surveillance aux urgences', 'Transfert vers un autre hôpital', 'Passage au bloc opératoire', 'Sortie contre avis médical'].map(t => `<div>${boite(false)}<span>${t}</span></div>`).join('')}</div>
    <div class="sigs">${signature('Médecin', c.medecin, true)}</div>`,

  risques: c => c.mineur ? `
    <h2>Risque de chute (enfant)</h2>${ouiNon(['Moins de 3 ans', 'Médicament sédatif ou anesthésie récente', 'Plâtre, perfusion, béquilles', 'Agitation, troubles de l\'équilibre', 'Lit à barrières relevées'])}
    <h2>Peau</h2>${ouiNon(['Zones d\'appui rouges (plâtre, attelle, couche)', 'Immobilisé plus de 24 h', 'Matériel en contact avec la peau (sonde, capteur)'])}
    <h2>Nutrition</h2><div class="grille">${champ('Poids d\'entrée')}${champ('Taille')}${champ('Mange', `${boite(false)} bien  ${boite(false)} peu  ${boite(false)} rien`)}</div>
    ${champ('Mesures prises', '', 'min-height:16mm')}
    <div class="sigs">${signature('Infirmier(e)', '', true)}</div>` : `
    <h2>Risque de chute</h2>${ouiNon(['Chute dans les 6 derniers mois', 'Plus de 65 ans', 'Médicaments (somnifères, tension, sédatifs)', 'Troubles de la marche ou de l\'équilibre', 'Confusion, désorientation', 'Lunettes, appareil auditif nécessaires'])}
    <h2>Risque d'escarres (échelle de Braden : risque si 18 ou moins)</h2>
    <table class="serre quadr"><thead><tr><th>Critère</th><th class="c">1</th><th class="c">2</th><th class="c">3</th><th class="c">4</th></tr></thead><tbody>
    ${['Perception sensorielle', 'Humidité de la peau', 'Activité', 'Mobilité', 'Nutrition', 'Frottement, cisaillement (1 à 3)'].map(l => `<tr><td>${l}</td><td class="c">${boite(false)}</td><td class="c">${boite(false)}</td><td class="c">${boite(false)}</td><td class="c">${boite(false)}</td></tr>`).join('')}
    <tr><td><strong>Total / 23</strong></td><td colspan="4"></td></tr></tbody></table>
    <h2>Nutrition</h2><div class="grille">${champ('Poids')}${champ('Perte de poids récente')}${champ('Appétit', `${boite(false)} normal  ${boite(false)} diminué`)}</div>
    ${champ('Mesures prises (matelas, lever, aide aux repas…)', '', 'min-height:12mm')}
    <div class="sigs">${signature('Infirmier(e)', '', true)}</div>`,

  sortie: c => `
    <div class="grille">${champ('Entrée', esc(dateHeure(c.enCours?.date_entree)))}${champ('Sortie le')}${champ('Mode', `${boite(false)} domicile  ${boite(false)} transfert  ${boite(false)} autre`)}</div>
    ${champ('Diagnostic de sortie', '', 'min-height:12mm')}
    <h2>Traitement de sortie</h2><table class="vide"><thead><tr><th>Médicament</th><th>Dose</th><th>Horaires</th><th>Durée</th></tr></thead><tbody>${vides(4, 4)}</tbody></table>
    ${champ('Consignes', '', 'min-height:16mm')}
    <div class="grille deux">${champ('Rendez-vous de suivi')}${champ('Soins à domicile')}</div>
    <h2>Documents remis</h2>${coches(['Ordonnances', 'Compte-rendu ou bulletin de sortie', 'Courrier au médecin traitant', c.mineur ? 'Certificat d\'absence scolaire' : 'Arrêt de travail', 'Radios, résultats d\'examens'])}
    <div class="sigs">${signature('Médecin', c.medecin, true)}${signature(c.mineur ? 'Parent' : 'Patient', c.mineur ? '' : c.nom, true)}</div>`,

  soins_mineur: c => `
    <p>Nous soussignés, titulaires de l'autorité parentale sur l'enfant <strong>${esc(c.nom)}</strong>, né(e) le <strong>${esc(date(c.p.date_naissance) || '……')}</strong>,
    autorisons l'équipe de l'Hôpital M&amp;M à pratiquer les examens et soins nécessaires à son état de santé, et en cas d'urgence tout acte médical ou chirurgical indispensable.</p>
    ${['Parent / représentant légal 1', 'Parent / représentant légal 2'].map(t => `<h2>${t}</h2><div class="grille">${champ('Nom et prénom')}${champ('Lien')}${champ('Téléphone')}</div>`).join('')}
    ${coches(["Nous autorisons l'hôpital à donner des nouvelles par téléphone aux personnes ci-dessus", "Nous autorisons la sortie de l'enfant avec l'un de nous ou la personne désignée ci-dessous", 'L\'autorité parentale est exercée par un seul parent (justificatif joint)'])}
    ${champ("Personne autorisée à reprendre l'enfant")}
    ${fait()}<div class="sigs">${signature('Parent / représentant légal 1')}${signature('Parent / représentant légal 2')}</div>`,

  confiance: c => `
    <p>Toute personne majeure peut désigner une personne de confiance (article L1111-6 du Code de la santé publique). Elle peut l'accompagner, assister aux entretiens médicaux et être consultée si elle n'est plus en état d'exprimer sa volonté. La désignation peut être modifiée à tout moment.</p>
    ${coches(['Je ne souhaite pas désigner de personne de confiance', 'Je désigne la personne ci-dessous', 'Elle est aussi la personne à prévenir'])}
    <div class="grille">${champ('Nom et prénom', esc(c.p.contact_urgence_nom || ''))}${champ('Lien', esc(c.p.contact_urgence_lien || ''))}${champ('Téléphone', esc(c.p.contact_urgence_telephone || ''))}</div>
    ${champ('Adresse')}${fait()}
    <div class="sigs">${signature('Patient', c.nom)}${signature('Personne de confiance')}</div>`,

  allergie: c => `
    <div class="alerte" style="padding:5mm 6mm"><div class="k" style="font-size:9pt">Patient allergique</div><div class="v" style="font-size:20pt;line-height:1.2;margin-top:2mm">${esc(c.p.allergies)}</div></div>
    ${ouiNon(['Bracelet ou étiquette « allergie » posé(e)', 'Allergie inscrite sur la feuille de soins et les prescriptions', 'Médecins et pharmacie informés', 'Allergie au latex : matériel sans latex', 'Allergie alimentaire : cuisine prévenue', 'Trousse d\'urgence (adrénaline) disponible'], ['Oui', 'N/A'])}
    ${champ('Réaction connue (type, gravité, date)', '', 'min-height:14mm')}${champ('Conduite en cas de réaction', '', 'min-height:12mm')}
    <div class="sigs">${signature('Médecin', c.medecin, true)}${signature('Infirmier(e)', '', true)}</div>`,

  image: c => `
    <h2>Droit à l'image</h2>
    ${coches(['J\'accepte que des photos soient prises pour le dossier médical (plaies, lésions, évolution)', 'J\'accepte qu\'elles servent à l\'enseignement, sans que je sois reconnaissable', 'Je refuse toute photo'])}
    <h2>Partage d'informations</h2>
    ${coches(['J\'accepte que mon médecin traitant reçoive les comptes-rendus', 'J\'accepte de recevoir mes documents dans « Mon Hôpital M&amp;M »', 'J\'accepte les rappels de rendez-vous par e-mail', 'Personnes à qui l\'équipe peut donner des nouvelles :'])}
    ${champ('Personnes autorisées', esc(c.p.contact_urgence_nom || ''), 'min-height:10mm')}${fait()}
    <div class="sigs">${signature(c.mineur ? 'Parent / représentant légal' : 'Patient', c.mineur ? '' : c.nom)}</div>`,
}

/** HTML complet du dossier patient pour les pièces choisies. */
export function dossierPatientHtml(entree, codes) {
  const c = contexte(entree)
  const pieces = piecesDossierPatient(entree).pieces
  const choisies = pieces.filter(x => codes.includes(x.code))
  const titres = choisies.map(x => x.titre)
  const entete = titre => `<header><div><div class="logo">${logoSvgTexte}</div>${c.site ? `<div class="adr">${esc(siteDe(c.site.nom).toUpperCase())} · ${esc(adresseSite(c.site))}</div>` : ''}</div>
<div class="t"><div class="n">DOSSIER PATIENT</div><h1>${esc(titre)}</h1></div></header>
<div class="bandeau"><div><div class="k">Patient</div><div class="v"><strong>${esc(c.nom)}</strong></div></div><div><div class="k">Né(e) le</div><div class="v">${esc(date(c.p.date_naissance) || '—')}</div></div>
<div><div class="k">Dossier · IPP</div><div class="v">${esc([c.p.numero_dossier, c.p.ipp].filter(Boolean).join(' · '))}</div></div><div><div class="k">Service</div><div class="v">${esc(c.p.service || '')}</div></div></div>`
  const pied = (i) => `<footer><span>DOSSIER PATIENT · ${esc(c.nom)} · ${esc(c.p.numero_dossier || '')}</span><span>PIÈCE ${i + 1} / ${choisies.length}</span></footer>`
  const flux = new Set(PIECES.filter(x => x[5]).map(x => x[0]))
  const papiers = Object.fromEntries(PAPIERS.map(([code, , , page]) => [code, page]))
  return choisies.map((x, i) => {
    if (x.code === 'dossier_operatoire') {
      const o = c.opAVenir
      return dossierOperatoireHtml({ op: o, patient: c.p, site: c.sites.parId(o.site_id), salle: c.d.salles.find(s => s.id === o.salle_id), chirurgien: c.qui(o.chirurgien_id), mineur: estMineur(c.p.date_naissance, o.debut), ordonnance: c.d.pr.find(x => x.operation_id === o.id)?.lignes })
    }
    if (['surveillance', 'transmissions', 'administration'].includes(x.code)) return `<section class="page" data-piece="${x.code}">${papiers[x.code](c.site, c.p)}</section>`
    return `<section class="page${flux.has(x.code) ? ' flux' : ''}" data-piece="${x.code}">${entete(x.titre)}${CORPS[x.code](c, titres)}${pied(i)}</section>`
  }).join('')
}

export function imprimerDossierPatient(entree, codes) {
  imprimer({ titre: `Dossier patient — ${entree.patient.nomComplet}`, corps: dossierPatientHtml(entree, codes), page: 'A4', marge: '11mm', style: STYLE })
}

