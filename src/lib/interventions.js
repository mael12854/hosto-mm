// Catalogue des interventions de l'Hôpital M&M.
// Chaque fiche remplit le livret « Mon opération » (src/lib/livret.js) et propose
// des valeurs par défaut à la programmation (anesthésie, durée, séjour, côté).
// Textes destinés aux patients et à leurs parents : phrases courtes, sans jargon.
// implant : pose d'un dispositif médical implantable (traçabilité obligatoire au dossier).

export const ANESTHESIES = ['Générale', 'Locorégionale', 'Locale', 'Sédation']
export const COTES = ['Droit', 'Gauche', 'Bilatéral', 'Sans objet']
export const SEJOURS = ['Ambulatoire (sortie le jour même)', '1 nuit', '2 à 3 jours', '4 jours ou plus']

/** Conseils valables pour toutes les interventions. */
export const COMMUN = {
  preparation: [
    "Prendre une douche la veille au soir et le matin, avec le savon indiqué, cheveux compris.",
    'Enlever vernis, bijoux, piercings, maquillage et lentilles avant de venir.',
    'Garder les ongles courts et propres.',
    'Signaler toute fièvre, toux, rhume ou maladie contagieuse dans les jours précédents : on décalera peut-être.',
  ],
  valise: [
    'Carte Vitale et carte de mutuelle',
    'Carnet de santé',
    'Ordonnances et traitements habituels',
    "Autorisation d'opérer signée (par les deux parents pour un mineur)",
    'Doudou, livre ou jeu calme',
    'Pyjama confortable, chaussons',
  ],
  jourJ: [
    "Accueil au secrétariat du site, puis installation en chambre ou en unité ambulatoire.",
    "Pose du bracelet d'identification : on vous demandera plusieurs fois votre nom, c'est normal.",
    "Tenue de bloc, vérification du jeûne, du côté à opérer et des allergies.",
    "Au bloc, l'équipe d'anesthésie installe le patient et l'endort ou l'anesthésie.",
    "Après l'intervention, passage en salle de réveil jusqu'à ce que tout soit stable.",
  ],
  alerte: [
    'Fièvre au-dessus de 38,5 °C',
    'Douleur qui augmente malgré les médicaments',
    'Saignement qui traverse le pansement',
    'Vomissements répétés, impossibilité de boire',
  ],
}

/** Fiches par intervention. */
export const INTERVENTIONS = [
  {
    code: 'appendicectomie', nom: 'Appendicectomie', service: 'Urgences', anesthesie: 'Générale', cote: false, duree: 60, sejour: '2 à 3 jours',
    description: "On retire l'appendice, un petit morceau d'intestin qui s'est infecté et fait mal au ventre (en bas à droite). Le plus souvent par cœlioscopie : trois petites incisions et une caméra.",
    preparation: ['Rien à manger ni à boire dès que le diagnostic est posé, sauf avis contraire.'],
    apres: ['Un peu mal au ventre et aux épaules les premiers jours : c\'est le gaz utilisé pendant la cœlioscopie.', 'Remarcher dès le soir ou le lendemain aide le ventre à repartir.', 'Pansements à garder propres et secs ; douche possible après 48 h.'],
    alerte: ['Ventre dur ou de plus en plus douloureux', 'Rougeur ou écoulement d\'une cicatrice'],
    reprise: { ecole: 'Après 1 semaine environ', sport: 'Pas de sport pendant 3 semaines' },
    controle: 'Consultation de contrôle 3 à 4 semaines après',
  },
  {
    code: 'amygdalectomie', nom: 'Amygdalectomie', service: 'Pédiatrie', anesthesie: 'Générale', cote: false, duree: 40, sejour: '1 nuit',
    description: "On enlève les amygdales, au fond de la gorge, quand elles sont trop grosses (ronflements, pauses respiratoires la nuit) ou infectées trop souvent.",
    preparation: ["Pas d'aspirine ni d'ibuprofène dans les 10 jours avant (risque de saignement)."],
    apres: ['Mal à la gorge pendant 8 à 10 jours, parfois aux oreilles : c\'est normal.', 'Manger froid ou tiède et mou (compotes, yaourts, glaces, purée).', 'Bien boire, même si ça pique.', 'Taches blanches au fond de la gorge : ce sont des croûtes normales, elles tombent vers J8-J10.'],
    alerte: ['Crachats de sang rouge ou saignement par la bouche ou le nez : venir aux urgences tout de suite', 'Refus de boire pendant plus de 12 h'],
    reprise: { ecole: 'Après 10 jours', sport: 'Pas de sport ni de piscine pendant 15 jours' },
    controle: 'Pas de contrôle systématique ; appeler en cas de doute',
  },
  {
    code: 'vegetations', nom: 'Ablation des végétations (adénoïdectomie)', service: 'Pédiatrie', anesthesie: 'Générale', cote: false, duree: 20, sejour: 'Ambulatoire (sortie le jour même)',
    description: "Les végétations sont au fond du nez. Quand elles sont trop grosses, elles bouchent le nez et donnent des otites. On les retire par la bouche, sans cicatrice.",
    preparation: ["Pas d'aspirine ni d'ibuprofène dans les 10 jours avant."],
    apres: ['Nez qui coule ou mauvaise haleine quelques jours.', 'Lavages de nez au sérum physiologique plusieurs fois par jour.', 'Manger normalement dès le soir, en commençant tiède.'],
    alerte: ['Saignement par le nez ou la bouche qui ne s\'arrête pas'],
    reprise: { ecole: 'Après 2 à 3 jours', sport: 'Après 1 semaine' },
    controle: 'Consultation de contrôle 1 mois après',
  },
  {
    code: 'aerateurs', nom: 'Aérateurs transtympaniques (yoyos)', service: 'Pédiatrie', anesthesie: 'Générale', cote: true, implant: true, duree: 20, sejour: 'Ambulatoire (sortie le jour même)',
    description: "On pose un tout petit tube dans le tympan pour aérer l'oreille et éviter que du liquide reste derrière (otites à répétition, baisse d'audition).",
    preparation: [],
    apres: ['Un peu d\'écoulement par l\'oreille les premiers jours, parfois teinté de sang.', 'Protéger les oreilles de l\'eau (bouchons) au bain et à la piscine selon l\'avis du médecin.', 'Le yoyo tombe tout seul en général au bout de 6 à 18 mois.'],
    alerte: ['Écoulement abondant ou malodorant de l\'oreille', 'Douleur forte de l\'oreille'],
    reprise: { ecole: 'Le lendemain', sport: 'Piscine avec bouchons, selon avis' },
    controle: 'Consultation de contrôle 1 à 2 mois après',
  },
  {
    code: 'ablation_att', nom: 'Ablation des aérateurs transtympaniques (ATT)', service: 'Pédiatrie', anesthesie: 'Générale', cote: true, duree: 15, sejour: 'Ambulatoire (sortie le jour même)',
    description: "Les yoyos posés dans les tympans ne sont pas tombés tout seuls, sont bouchés ou ne servent plus. On les retire pendant une anesthésie très courte au masque ; si le petit trou du tympan reste ouvert, on peut le refermer avec une petite greffe (myringoplastie).",
    preparation: ["Signaler tout écoulement d'oreille dans la semaine avant."],
    apres: ["Petit écoulement possible par l'oreille pendant 1 à 2 jours, parfois teinté de sang.", "Protéger l'oreille de l'eau jusqu'au contrôle : le trou du tympan doit se refermer.", 'Douleur faible : paracétamol si besoin.'],
    alerte: ["Écoulement de pus, fièvre, douleur forte de l'oreille", "Baisse d'audition qui ne revient pas"],
    reprise: { ecole: 'Le lendemain', sport: "Piscine et plongeon interdits jusqu'au contrôle" },
    controle: 'Consultation avec audiogramme 1 à 2 mois après',
  },
  {
    code: 'hernie_inguinale', nom: 'Cure de hernie inguinale', service: 'Pédiatrie', anesthesie: 'Générale', cote: true, duree: 45, sejour: 'Ambulatoire (sortie le jour même)',
    description: "Une hernie est une petite bosse à l'aine : un bout d'intestin passe par un trou de la paroi du ventre. On le remet en place et on ferme le passage.",
    preparation: [],
    apres: ['Petite cicatrice dans le pli de l\'aine, souvent avec des fils qui fondent tout seuls.', 'Bourse ou aine un peu gonflée quelques jours : c\'est normal.', 'Douche possible après 48 h, pas de bain pendant 1 semaine.'],
    alerte: ['Bosse dure et douloureuse qui revient'],
    reprise: { ecole: 'Après 3 à 5 jours', sport: 'Pas de sport pendant 3 semaines' },
    controle: 'Consultation de contrôle 1 mois après',
  },
  {
    code: 'posthectomie', nom: 'Posthectomie (phimosis)', service: 'Pédiatrie', anesthesie: 'Générale', cote: false, duree: 30, sejour: 'Ambulatoire (sortie le jour même)',
    description: "Quand la peau du bout du zizi est trop serrée et ne se décalotte pas, on la retire ou on l'élargit.",
    preparation: [],
    apres: ['Bout du zizi rouge et gonflé quelques jours.', 'Appliquer la crème ou la vaseline indiquée à chaque change ou pipi.', 'Vêtements amples ; bains de siège tièdes à partir du lendemain si prescrits.'],
    alerte: ['Impossibilité de faire pipi pendant plus de 8 h', 'Saignement qui ne s\'arrête pas en appuyant'],
    reprise: { ecole: 'Après 3 à 5 jours', sport: 'Pas de vélo ni de sport pendant 2 semaines' },
    controle: 'Consultation de contrôle 3 à 4 semaines après',
  },
  {
    code: 'orchidopexie', nom: 'Orchidopexie (testicule non descendu)', service: 'Pédiatrie', anesthesie: 'Générale', cote: true, duree: 45, sejour: 'Ambulatoire (sortie le jour même)',
    description: "Un testicule n'est pas descendu tout seul dans la bourse. On va le chercher et on le fixe à sa place.",
    preparation: [],
    apres: ['Bourse gonflée et un peu bleue pendant quelques jours.', 'Pas de vélo, trottinette ni jeux à califourchon pendant 3 semaines.'],
    alerte: ['Bourse très gonflée, dure ou très douloureuse'],
    reprise: { ecole: 'Après 3 à 5 jours', sport: 'Pas de sport pendant 3 semaines' },
    controle: 'Consultation de contrôle 1 à 2 mois après',
  },
  {
    code: 'fracture_reduction', nom: 'Réduction de fracture et plâtre', service: 'Orthopédie', anesthesie: 'Générale', cote: true, duree: 30, sejour: 'Ambulatoire (sortie le jour même)',
    description: "L'os cassé a bougé. Pendant que le patient dort, on le remet bien droit puis on pose un plâtre ou une résine pour qu'il se répare.",
    preparation: ['Rien à manger ni à boire en attendant l\'heure indiquée, même si l\'opération est faite en urgence.'],
    apres: ['Garder le membre surélevé (coussin, écharpe) les 48 premières heures.', 'Bouger les doigts ou les orteils souvent.', 'Ne rien glisser sous le plâtre, ne pas le mouiller.'],
    alerte: ['Doigts ou orteils froids, bleus, gonflés ou qui ne bougent plus : venir tout de suite', 'Plâtre qui serre, douleur qui augmente', 'Plâtre cassé, mouillé ou qui sent mauvais'],
    reprise: { ecole: 'Dès que la douleur le permet (2 à 3 jours)', sport: 'Pas de sport pendant toute la durée du plâtre' },
    controle: 'Radio et consultation de contrôle à J7, puis à l\'ablation du plâtre',
  },
  {
    code: 'osteosynthese', nom: 'Ostéosynthèse (broches, vis ou plaque)', service: 'Orthopédie', anesthesie: 'Générale', cote: true, implant: true, duree: 75, sejour: '1 nuit',
    description: "Pour réparer un os cassé qui ne tient pas en place avec un plâtre seul, on le fixe avec du matériel (broches, vis ou plaque), souvent retiré plus tard.",
    preparation: [],
    apres: ['Membre surélevé et glace (dans un linge) pour limiter le gonflement.', 'Pansement à refaire selon l\'ordonnance infirmière.', 'Antidouleurs à prendre régulièrement les premiers jours, sans attendre d\'avoir très mal.'],
    alerte: ['Doigts ou orteils froids, bleus ou insensibles', 'Rougeur, chaleur ou écoulement de la cicatrice', 'Broche qui sort ou bouge'],
    reprise: { ecole: 'Après 3 à 7 jours', sport: 'Selon l\'avis du chirurgien, en général 6 à 8 semaines' },
    controle: 'Radio et consultation à J7-J10, puis à 6 semaines',
  },
  {
    code: 'ablation_materiel', nom: 'Ablation de matériel d\'ostéosynthèse', service: 'Orthopédie', anesthesie: 'Générale', cote: true, duree: 30, sejour: 'Ambulatoire (sortie le jour même)',
    description: "L'os est réparé : on retire les broches, vis ou plaque qui l'ont tenu pendant la guérison, en général par la même cicatrice.",
    preparation: ['Apporter les dernières radios.'],
    apres: ['Pansement à garder propre et sec quelques jours.', 'Éviter les chocs sur l\'os pendant quelques semaines, le temps que les trous se rebouchent.'],
    alerte: ['Rougeur ou écoulement de la cicatrice'],
    reprise: { ecole: 'Après 1 à 3 jours', sport: 'Pas de sport de contact pendant 4 à 6 semaines' },
    controle: 'Consultation de contrôle 3 à 6 semaines après',
  },
  {
    code: 'arthroscopie_genou', nom: 'Arthroscopie du genou', service: 'Orthopédie', anesthesie: 'Générale', cote: true, duree: 60, sejour: 'Ambulatoire (sortie le jour même)',
    description: "On regarde et on répare l'intérieur du genou (ménisque, cartilage) avec une petite caméra, par deux ou trois petites incisions.",
    preparation: ['Apporter les béquilles si vous en avez, sinon on vous les prêtera.', 'Ne pas raser la jambe vous-même.'],
    apres: ['Glace sur le genou 20 min plusieurs fois par jour.', 'Béquilles selon les consignes ; kinésithérapie à commencer rapidement.', 'Injections anticoagulantes si prescrites.'],
    alerte: ['Mollet dur, rouge ou douloureux', 'Genou très gonflé et chaud, fièvre'],
    reprise: { ecole: 'Après 2 à 5 jours', sport: 'Selon le geste réalisé, souvent 4 à 6 semaines' },
    controle: 'Consultation de contrôle 3 à 6 semaines après',
  },
  {
    code: 'dents_sagesse', nom: 'Extraction des dents de sagesse', service: 'Médecine générale', anesthesie: 'Générale', cote: false, duree: 45, sejour: 'Ambulatoire (sortie le jour même)',
    description: "On retire les dents de sagesse (les dernières, tout au fond) qui n'ont pas la place de sortir ou qui font mal.",
    preparation: ['Faire un détartrage avant si le dentiste l\'a demandé.'],
    apres: ['Joues gonflées pendant 3 à 5 jours : glace sur les joues.', 'Manger mou et tiède, ne pas fumer, ne pas cracher.', 'Bains de bouche à commencer le lendemain, pas le jour même.'],
    alerte: ['Saignement qui ne s\'arrête pas en mordant une compresse 20 min', 'Gonflement qui augmente après J3, fièvre'],
    reprise: { ecole: 'Après 2 à 3 jours', sport: 'Après 1 semaine' },
    controle: 'Consultation de contrôle 1 semaine après si fils non résorbables',
  },
  {
    code: 'suture_plaie', nom: 'Parage et suture de plaie sous anesthésie', service: 'Urgences', anesthesie: 'Générale', cote: false, duree: 30, sejour: 'Ambulatoire (sortie le jour même)',
    description: "La plaie est trop grande, trop sale ou trop près d'un endroit délicat pour être recousue réveillé. On la nettoie bien et on la referme pendant que le patient dort.",
    preparation: [],
    apres: ['Pansement à refaire selon l\'ordonnance.', 'Fils à retirer entre J5 (visage) et J14 (genou, main), sauf fils résorbables.', 'Protéger la cicatrice du soleil pendant 1 an.'],
    alerte: ['Rougeur, chaleur, pus ou fièvre', 'Plaie qui se rouvre'],
    reprise: { ecole: 'Le lendemain si possible', sport: 'Après l\'ablation des fils' },
    controle: 'Ablation des fils chez le médecin ou l\'infirmière',
  },
  {
    code: 'cholecystectomie', nom: 'Cholécystectomie (vésicule biliaire)', service: 'Médecine générale', anesthesie: 'Générale', cote: false, duree: 75, sejour: '1 nuit',
    description: "On retire la vésicule biliaire, une petite poche sous le foie, quand elle contient des calculs qui font mal. Par cœlioscopie, avec de petites incisions.",
    preparation: ['Repas léger la veille au soir.'],
    apres: ['Douleur aux épaules les premiers jours : c\'est le gaz de la cœlioscopie.', 'Repas légers les premiers jours, puis alimentation normale.', 'Remarcher dès le soir.'],
    alerte: ['Jaunisse (peau ou yeux jaunes)', 'Douleur forte sous les côtes à droite, fièvre'],
    reprise: { ecole: 'Après 1 semaine', sport: 'Pas d\'effort pendant 3 à 4 semaines' },
    controle: 'Consultation de contrôle 1 mois après',
  },
  {
    code: 'autre', nom: 'Autre intervention', service: '', anesthesie: 'Générale', cote: true, duree: 60, sejour: 'Ambulatoire (sortie le jour même)',
    description: "Le chirurgien vous a expliqué l'intervention lors de la consultation. N'hésitez pas à reposer vos questions : il n'y a pas de question bête.",
    preparation: [], apres: ['Suivre l\'ordonnance et les consignes données à la sortie.'], alerte: [],
    reprise: { ecole: 'Selon l\'avis du chirurgien', sport: 'Selon l\'avis du chirurgien' }, controle: 'Selon l\'avis du chirurgien',
  },
]

export const ficheIntervention = code => INTERVENTIONS.find(i => i.code === code) || INTERVENTIONS.find(i => i.code === 'autre')

/**
 * Horaires de jeûne à partir de l'heure d'arrivée (règles usuelles de l'anesthésie) :
 * solides et lait non maternel 6 h avant, lait maternel 4 h, liquides clairs (eau, jus sans pulpe, sirop) 2 h.
 */
export function horairesJeun(debut, avanceArriveeMin = 90) {
  const arrivee = new Date(new Date(debut).getTime() - avanceArriveeMin * 60000)
  const moins = h => new Date(arrivee.getTime() - h * 3600000)
  return { arrivee, solides: moins(6), laitMaternel: moins(4), liquides: moins(2) }
}

/** Médicaments et soins propres à chaque intervention, ajoutés aux antalgiques de base. */
const POSTOP = {
  amygdalectomie: [{ nom: 'Bains de bouche ou pastilles adaptées à l\'âge', posologie: 'Après les repas, si besoin', duree: '10 jours' }],
  vegetations: [{ nom: 'Sérum physiologique (dosettes)', posologie: 'Lavage de nez 4 à 6 fois par jour', duree: '7 jours' }],
  aerateurs: [{ nom: 'Gouttes auriculaires antibiotiques', posologie: 'Seulement en cas d\'écoulement : 5 gouttes matin et soir dans l\'oreille concernée', duree: '7 jours' }, { nom: 'Bouchons d\'oreilles', posologie: 'Pour le bain et la piscine', duree: 'Jusqu\'au contrôle' }],
  ablation_att: [{ nom: 'Bouchons d\'oreilles', posologie: 'Protéger l\'oreille de l\'eau', duree: 'Jusqu\'au contrôle' }],
  hernie_inguinale: [{ nom: 'Soins infirmiers', posologie: 'Surveillance de la cicatrice, pansement sec', duree: '7 jours' }],
  posthectomie: [{ nom: 'Vaseline ou crème cicatrisante', posologie: 'À chaque change ou après chaque pipi', duree: '10 jours' }],
  orchidopexie: [{ nom: 'Soins infirmiers', posologie: 'Surveillance de la cicatrice, pansement sec', duree: '7 jours' }],
  fracture_reduction: [{ nom: 'Écharpe ou surélévation du membre', posologie: 'En permanence les 48 premières heures', duree: '48 heures' }],
  osteosynthese: [{ nom: 'Soins infirmiers à domicile', posologie: 'Réfection du pansement tous les 2 jours', duree: '15 jours' }, { nom: 'Vessie de glace', posologie: '20 minutes, 3 à 4 fois par jour, dans un linge', duree: '7 jours' }],
  ablation_materiel: [{ nom: 'Soins infirmiers', posologie: 'Pansement sec, ablation des fils', duree: '10 à 14 jours' }],
  arthroscopie_genou: [{ nom: 'Vessie de glace', posologie: '20 minutes, 3 à 4 fois par jour, dans un linge', duree: '10 jours' }, { nom: 'Kinésithérapie', posologie: 'Rééducation du genou, 2 à 3 séances par semaine', duree: '10 séances' }, { nom: 'Cannes anglaises (béquilles)', posologie: 'Appui selon les consignes', duree: 'Selon l\'avis du chirurgien' }],
  dents_sagesse: [{ nom: 'Bain de bouche antiseptique', posologie: 'À partir du lendemain, 3 fois par jour après les repas', duree: '7 jours' }, { nom: 'Vessie de glace', posologie: 'Sur les joues, 20 minutes plusieurs fois par jour', duree: '3 jours' }],
  suture_plaie: [{ nom: 'Soins infirmiers', posologie: 'Réfection du pansement tous les 2 jours, ablation des fils', duree: 'Selon la localisation (J5 à J14)' }],
  appendicectomie: [{ nom: 'Soins infirmiers', posologie: 'Surveillance des cicatrices, pansement sec', duree: '7 jours' }],
  cholecystectomie: [{ nom: 'Soins infirmiers', posologie: 'Surveillance des cicatrices, pansement sec', duree: '7 jours' }],
}
// Pas d'anti-inflammatoire proposé après une chirurgie où il augmente le risque de saignement.
const SANS_AINS = new Set(['amygdalectomie', 'vegetations'])

/**
 * Ordonnance post-opératoire type, à vérifier et adapter par le prescripteur.
 * age en années ; poids en kg (doses enfant calculées si connu).
 */
export function ordonnancePostop(code, { age, poids } = {}) {
  const enfant = age != null && age < 15
  const kg = Number(String(poids || '').replace(',', '.')) || null
  const dose = mgKg => (kg ? `${Math.round(mgKg * kg)} mg (${mgKg} mg/kg)` : `${mgKg} mg/kg`)
  const lignes = [{
    nom: enfant ? 'Paracétamol (suspension buvable ou sachet)' : 'Paracétamol 1 g',
    posologie: enfant ? `${dose(15)} toutes les 6 heures, sans dépasser 60 mg/kg par jour` : '1 comprimé toutes les 6 heures, sans dépasser 4 g par jour',
    duree: '5 jours',
  }]
  if (!SANS_AINS.has(code)) lignes.push({
    nom: enfant ? 'Ibuprofène (suspension buvable)' : 'Ibuprofène 400 mg',
    posologie: enfant ? `${dose(10)} toutes les 8 heures, au cours du repas, si la douleur persiste` : '1 comprimé toutes les 8 heures, au cours du repas, si la douleur persiste',
    duree: '3 jours',
  })
  return [...lignes, ...(POSTOP[code] || [])]
}
