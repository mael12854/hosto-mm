// Documents de sortie d'une opération : compte-rendu opératoire et ordonnance post-opératoire.
// Utilisés par la fiche opération, l'espace patient et les dossiers complets.
import { aujourdhui, date, dateHeure, esc } from './format.js'
import { CHAMPS_CR } from './operations.js'
import { enteteHtml, imprimer, piedHtml } from './impression.js'

const cote = op => (op.cote && op.cote !== 'Sans objet' ? ` · côté ${esc(op.cote.toLowerCase())}` : '')

/** Corps du compte-rendu opératoire (cr = champs du compte-rendu). */
export function crOperatoireHtml({ op, cr = op.compte_rendu || {}, patient, site, chirurgien }) {
  const h = op.heures || {}
  return enteteHtml({ titre: 'Compte-rendu opératoire', date: date(op.debut), medecin: chirurgien, service: patient?.service, patient: patient?.nomComplet, site })
    + `<p class="pat"><span>INTERVENTION</span>${esc(op.intervention)}${cote(op)} · ${esc(op.anesthesie || '')}${op.anesthesiste ? ` · ${esc(op.anesthesiste)}` : ''}</p>`
    + (h.incision || h.fin_intervention ? `<p class="pat"><span>HORAIRES</span>${h.incision ? `incision ${esc(dateHeure(h.incision))}` : ''}${h.fin_intervention ? ` · fin ${esc(dateHeure(h.fin_intervention))}` : ''}</p>` : '')
    + (op.equipe ? `<p class="pat"><span>ÉQUIPE</span>${esc(op.equipe)}</p>` : '')
    + CHAMPS_CR.filter(([k]) => cr[k]).map(([k, l]) => `<div class="k">${esc(l)}</div><div class="v">${esc(cr[k])}</div>`).join('')
    + piedHtml(`Signé ${op.compte_rendu_signe_le ? `le ${dateHeure(op.compte_rendu_signe_le)}` : '— non signé'} · ${chirurgien || ''}`, `Hôpital M&M · ${aujourdhui()}`)
}

export function imprimerCrOperatoire(d) {
  imprimer({ titre: `Compte-rendu opératoire — ${d.patient?.nomComplet || ''}`, corps: crOperatoireHtml(d) })
}

/** Corps de l'ordonnance post-opératoire (A5) ; lignes = [{ nom, posologie, duree }]. */
export function ordoPostopHtml({ op, lignes, patient, site, medecin, le, poids }) {
  return enteteHtml({ titre: 'Ordonnance post-opératoire', date: le ? date(le) : aujourdhui(), medecin, service: patient?.service, patient: patient?.nomComplet, site })
    + `<p class="pat"><span>APRÈS</span>${esc(op.intervention)}${cote(op)} du ${esc(date(op.debut))}${poids ? ` · poids ${esc(String(poids).replace('.', ','))} kg` : ''}</p>`
    + `<ol>${(lignes || []).filter(l => l.nom?.trim()).map(l => `<li><b>${esc(l.nom)}</b>${l.posologie ? `<br><span>${esc(l.posologie)}</span>` : ''}${l.duree ? `<br><span>Pendant ${esc(l.duree)}</span>` : ''}</li>`).join('')}</ol>`
    + piedHtml('Ordonnance post-opératoire — Hôpital M&M', patient?.numero_dossier || '')
}

export function imprimerOrdoPostop(d) {
  imprimer({ titre: `Ordonnance post-opératoire — ${d.patient?.nomComplet || ''}`, corps: ordoPostopHtml(d), page: 'A5' })
}

/** Texte de l'ordonnance (colonne contenu, lisible partout). */
export const texteOrdoPostop = (op, lignes) => ['Ordonnance post-opératoire', `Après : ${op.intervention}`, '', ...lignes.filter(l => l.nom?.trim()).map((l, i) => `${i + 1}. ${l.nom}${l.posologie ? ` — ${l.posologie}` : ''}${l.duree ? ` (${l.duree})` : ''}`)].join('\n')
