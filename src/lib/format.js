// Formats français (France) : jj/mm/aaaa, 24 h, virgule décimale.

export const aujourdhui = () => new Date().toLocaleDateString('fr-FR')

export function date(d) {
  if (!d) return ''
  const x = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T12:00:00') : new Date(d)
  return isNaN(x) ? '' : x.toLocaleDateString('fr-FR')
}

export function dateHeure(d) {
  if (!d) return ''
  const x = new Date(d)
  return isNaN(x) ? '' : x.toLocaleDateString('fr-FR') + ' · ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** « 14 SEPT. 2026 » */
export function dateCourte(d) {
  const x = new Date(d)
  return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
}

/** jj/mm/aaaa → aaaa-mm-jj (null si invalide) */
export function versIso(t) {
  const m = String(t || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, j, mo, a] = m
  const iso = `${a}-${mo.padStart(2, '0')}-${j.padStart(2, '0')}`
  return isNaN(new Date(iso)) ? null : iso
}

export const nombre = n => (n == null || n === '' ? '—' : String(n).replace('.', ','))

export const nomComplet = p => (p ? `${p.prenom || ''} ${p.nom || ''}`.trim() : '')

/** « Dr Maël DOMENECH » */
export const nomMedecin = m => (m ? `Dr ${m.prenom || ''} ${(m.nom || '').toUpperCase()}`.trim() : '')

/** Statut affiché à partir d'une hospitalisation (triage P1 = le plus urgent). */
export function statut(h) {
  if (!h) return { cle: 'sorti', libelle: 'Sans séjour' }
  if (h.date_sortie && new Date(h.date_sortie) <= new Date()) return { cle: 'sorti', libelle: 'Sorti' }
  const n = h.niveau_urgence
  if (n && n <= 2) return { cle: 'urgence', libelle: 'Urgence' }
  if (n === 3) return { cle: 'surveiller', libelle: 'À surveiller' }
  return { cle: 'stable', libelle: 'Stable' }
}

export const esc = t => String(t ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]))

export const normaliser = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function taille(n) {
  if (n < 1024) return n + ' o'
  if (n < 1048576) return Math.round(n / 1024) + ' Ko'
  return (n / 1048576).toFixed(1).replace('.', ',') + ' Mo'
}

export const pluriel = (n, mot, motPluriel = mot + 's') => `${n} ${n > 1 ? motPluriel : mot}`
