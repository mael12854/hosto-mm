// Constantes du bloc opératoire : statuts, horodatages, check-list « Sécurité du patient au bloc » (HAS).

/** Statuts dans l'ordre du parcours : [clé, libellé, classe de badge]. */
export const STATUTS = [
  ['prévue', 'Prévue', 'bleu'],
  ['prête', 'Prête', 'stable'],
  ['au_bloc', 'Au bloc', 'surveiller'],
  ['réveil', 'En réveil', 'bleu'],
  ['terminée', 'Terminée', 'sorti'],
  ['annulée', 'Annulée', 'sorti'],
]
export const statutOp = cle => STATUTS.find(s => s[0] === cle) || STATUTS[0]

/** Horodatages du parcours au bloc : [clé, libellé, statut atteint]. */
export const HEURES = [
  ['entree_bloc', 'Entrée au bloc', 'au_bloc'],
  ['induction', 'Induction anesthésique', null],
  ['incision', 'Incision', null],
  ['fin_intervention', "Fin de l'intervention", null],
  ['sortie_bloc', 'Sortie de salle', null],
  ['entree_reveil', 'Entrée en salle de réveil', 'réveil'],
  ['sortie_reveil', 'Sortie de salle de réveil', null],
]

/** Check-list HAS en trois temps : [temps, titre, éléments [clé, libellé]]. */
export const CHECKLIST = [
  ['avant_induction', "Avant l'induction anesthésique", [
    ['identite', 'Identité du patient confirmée (bracelet, patient ou parent)'],
    ['intervention', 'Intervention et site opératoire confirmés'],
    ['marquage', 'Côté ou site opératoire marqué (ou sans objet)'],
    ['installation', 'Installation du patient connue et cohérente'],
    ['documents', 'Dossier, consentements et imagerie présents'],
    ['materiel_anesthesie', "Matériel et médicaments d'anesthésie vérifiés"],
    ['allergies', 'Allergies vérifiées'],
    ['voies_aeriennes', "Risque d'intubation difficile ou d'inhalation évalué"],
    ['saignement', 'Risque de saignement important évalué'],
    ['jeun', 'Jeûne vérifié'],
  ]],
  ['avant_incision', "Avant l'incision (temps de pause)", [
    ['verification_croisee', "Vérification ultime croisée dans l'équipe : patient, intervention, côté"],
    ['partage', 'Points critiques partagés : durée, risques, anesthésie'],
    ['antibioprophylaxie', 'Antibioprophylaxie faite (ou sans objet)'],
    ['preparation_cutanee', 'Préparation cutanée faite'],
  ]],
  ['apres_intervention', "Avant la sortie de salle", [
    ['compte', 'Compte des compresses, aiguilles et instruments correct'],
    ['prelevements', 'Prélèvements étiquetés (ou sans objet)'],
    ['evenements', 'Événements indésirables signalés (ou aucun)'],
    ['prescriptions', 'Prescriptions post-opératoires faites'],
  ]],
]
export const ELEMENTS_CHECKLIST = CHECKLIST.flatMap(([, , items]) => items.map(([cle]) => cle))

/** Temps de la check-list complet ? */
export const tempsComplet = (checklist, temps) => CHECKLIST.find(c => c[0] === temps)[2].every(([cle]) => checklist?.[cle]?.ok)

/** Champs du compte-rendu opératoire structuré : [clé, libellé, lignes]. */
export const CHAMPS_CR = [
  ['indication', 'Indication', 2],
  ['installation', 'Installation et voie d\'abord', 2],
  ['constatations', 'Constatations', 3],
  ['geste', 'Geste réalisé', 4],
  ['materiel', 'Matériel ou implants posés', 1],
  ['prelevements', 'Prélèvements', 1],
  ['incidents', 'Incidents', 1],
  ['pertes', 'Pertes sanguines estimées', 1],
  ['fermeture', 'Fermeture et pansement', 1],
  ['suites', 'Consignes post-opératoires', 3],
]

/** Score d'Aldrete (sortie de salle de réveil autorisée à partir de 9/10). */
export const ALDRETE = [
  ['activite', 'Activité', ['Aucun mouvement', 'Bouge 2 membres', 'Bouge les 4 membres']],
  ['respiration', 'Respiration', ['Apnée', 'Dyspnée ou respiration limitée', 'Respire et tousse']],
  ['circulation', 'Circulation (TA)', ['± 50 % de la valeur de base', '± 20 à 50 %', '± 20 %']],
  ['conscience', 'Conscience', ['Ne répond pas', 'Réveillable', 'Bien réveillé']],
  ['saturation', 'Saturation', ['< 90 % sous O₂', '> 90 % sous O₂', '> 92 % à l\'air']],
]
