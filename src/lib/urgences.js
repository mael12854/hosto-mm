// Domaines d'urgence : tout patient arrive dans « Urgences » (à trier), puis est orienté vers un domaine.
// Le service reste « Urgences » (droits d'accès inchangés) ; le domaine est noté sur le séjour (filiere_urgence).

/** [code, libellé, aide] — « generale » d'abord : patients pas encore orientés. */
export const FILIERES = [
  ['generale', 'Urgences', 'À trier : pas encore orienté'],
  ['pediatrie', 'Urgences pédiatriques', 'Enfants de moins de 15 ans'],
  ['orl', 'Urgences ORL', 'Oreilles, nez, gorge'],
  ['ophtalmo', 'Urgences ophtalmologiques', 'Yeux, vision'],
  ['trauma', 'Urgences traumatologiques', 'Chutes, fractures, entorses, plaies'],
  ['cardio', 'Urgences cardiologiques', 'Douleur thoracique, malaise, palpitations'],
  ['gyneco', 'Urgences gynécologiques et obstétricales', 'Grossesse, douleurs gynécologiques'],
  ['dentaire', 'Urgences dentaires', 'Dents, gencives, mâchoire'],
  ['psy', 'Urgences psychiatriques', 'Crise, angoisse, idées noires'],
]

export const libelleFiliere = code => (FILIERES.find(f => f[0] === code) || FILIERES[0])[1]
/** Libellé court pour les badges : « ORL », « Pédiatriques »… */
export const courtFiliere = code => {
  if (!code || code === 'generale') return 'À trier'
  const t = libelleFiliere(code).replace(/^Urgences /, '')
  return /^[A-Z]{2,}/.test(t) ? t : t.charAt(0).toUpperCase() + t.slice(1)
}

/** Le séjour est-il aux urgences ? (domaine noté, ou service « Urgences »). */
export const estAuxUrgences = (sejour, nomService) => !!sejour && (!!sejour.filiere_urgence || nomService === 'Urgences')
/** Domaine du séjour ; un séjour aux urgences sans domaine est « à trier ». */
export const filiereDe = (sejour, nomService) => (estAuxUrgences(sejour, nomService) ? sejour.filiere_urgence || 'generale' : null)

const MOTS = [
  ['orl', /oreille|otite|gorge|angine|nez|saign\w* (du|de) nez|épistaxis|sinus|amygdal|corps étranger.*(nez|oreille)/i],
  ['ophtalmo', /\b(œil|oeil|yeux|vue|vision|paupière|conjonctiv)/i],
  ['dentaire', /\bdent|gencive|mâchoire|carie/i],
  ['cardio', /thora|poitrine|cœur|coeur|palpitation|malaise|syncope/i],
  ['gyneco', /grossesse|enceinte|contraction|règles|gynéco|accouch/i],
  ['psy', /angoisse|panique|suicid|idées noires|crise de nerfs|agitation/i],
  ['trauma', /chute|tomb|fracture|entorse|plaie|coupure|bless|bras|jambe|poignet|cheville|genou|coude|doigt|vélo|trottinette/i],
]

/** Domaine conseillé d'après l'âge (moins de 15 ans → pédiatrie) puis le motif. */
export function filiereSuggeree(patient, motif) {
  if (patient?.date_naissance) {
    const ans = (Date.now() - new Date(patient.date_naissance + 'T12:00:00')) / 3.15576e10
    if (ans < 15) return 'pediatrie'
  }
  const m = MOTS.find(([, re]) => re.test(motif || ''))
  return m ? m[0] : null
}
