import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chargement, EnTeteOutil, Message, Vide } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { siteDe, useSites } from '../../lib/sites.jsx'
import { supabase, journaliser, messageErreur } from '../../lib/supabase.js'
import { heure, statut } from '../../lib/format.js'

// Délai de prise en charge visé selon le triage (minutes).
const CIBLE = { 1: 0, 2: 15, 3: 30, 4: 60, 5: 120 }
const NIVEAUX = { 1: 'Urgence vitale', 2: 'Très urgent', 3: 'À surveiller', 4: 'Peu urgent', 5: 'Non urgent' }
const COULEUR = { 1: 'var(--rouge)', 2: 'var(--rouge)', 3: 'var(--ambre)', 4: 'var(--vert)', 5: 'var(--vert)' }
const COLONNES = [
  ['en_attente', 'En attente', 'var(--ambre)'],
  ['en_cours', 'En cours de prise en charge', 'var(--bleu)'],
  ['vu', 'Vus', 'var(--vert)'],
]

function duree(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return min % 60 ? `${h} h ${String(min % 60).padStart(2, '0')}` : `${h} h`
}

export default function FileUrgences() {
  const { profil } = useAuth()
  const { patients, chargement, charger, choisir } = usePatients()
  const sites = useSites()
  const [maintenant, setMaintenant] = useState(() => Date.now())
  const [msg, setMsg] = useState({})

  // L'attente se met à jour toutes les 30 s ; la liste est relue chaque minute.
  useEffect(() => {
    const t1 = setInterval(() => setMaintenant(Date.now()), 30000)
    const t2 = setInterval(charger, 60000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [charger])

  // Arrivés il y a plus de 24 h et jamais passés « vu » : séjours longs, hors de la file.
  const presentsTous = patients.filter(p => p.sejour && statut(p.sejour).cle !== 'sorti' && (!sites.actif || p.sejour.site_id === sites.actif))
  const anciens = presentsTous.filter(p => (p.sejour.statut_triage || 'en_attente') === 'en_attente' && maintenant - new Date(p.sejour.date_entree) > 24 * 3600000)
  const presents = presentsTous.filter(p => !anciens.includes(p))
  const niveau = p => p.sejour.niveau_urgence || 5
  const attente = p => Math.max(0, Math.round((maintenant - new Date(p.sejour.date_entree)) / 60000))
  const trier = liste => [...liste].sort((a, b) => niveau(a) - niveau(b) || new Date(a.sejour.date_entree) - new Date(b.sejour.date_entree))

  const modifier = async (p, champs, action) => {
    const { error } = await supabase.from('hospitalisations').update(champs).eq('id', p.sejour.id)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser(profil, `${action} : ${p.nomComplet}`, { patient_id: p.id, service_id: p.sejour.service_id })
    setMsg({ succes: `${p.nomComplet} : ${action.toLowerCase()}.` })
    charger()
  }

  return (
    <>
      <EnTeteOutil titre="File d'attente">
        {sites.actif ? `${siteDe(sites.nom(sites.actif)).replace(/^s/, 'S')} : patients` : 'Patients des deux sites,'} hospitalisés triés par priorité (P1 d'abord) puis par heure d'arrivée. L'attente passe en rouge quand le délai visé pour le niveau de triage est dépassé.
      </EnTeteOutil>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>

      {anciens.length > 0 && (
        <div className="note" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{anciens.length} patient{anciens.length > 1 ? 's' : ''} hospitalisé{anciens.length > 1 ? 's' : ''} depuis plus de 24 h {anciens.length > 1 ? 'sont' : 'est'} encore « en attente » ({anciens.map(p => p.nomComplet).join(', ')}) : hors de la file.</span>
          <button type="button" className="btn" onClick={async () => { for (const p of anciens) await modifier(p, { statut_triage: 'vu' }, 'Patient vu') }}>Marquer comme vu{anciens.length > 1 ? 's' : ''}</button>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, color: 'var(--texte)' }}>
        {Object.entries(CIBLE).map(([n, c]) => (
          <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: COULEUR[n] }} /> <strong className="mono">P{n}</strong> {NIVEAUX[n]} · {c ? `sous ${duree(c)}` : 'immédiat'}
          </span>
        ))}
      </div>

      {chargement ? <Chargement /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16, alignItems: 'start' }}>
          {COLONNES.map(([cle, titre, couleur]) => {
            const items = trier(presents.filter(p => (p.sejour.statut_triage || 'en_attente') === cle))
            return (
              <section key={cle} style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `3px solid ${couleur}`, paddingBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--encre)' }}>{titre}</span>
                  <span className="etiquette">{items.length}</span>
                </div>
                {!items.length ? <Vide>Personne.</Vide> : items.map((p, rang) => {
                  const n = niveau(p), min = attente(p), depasse = cle === 'en_attente' && min > CIBLE[n]
                  return (
                    <article key={p.id} className="carte-blanche" style={{ padding: 14, display: 'grid', gap: 8, borderLeft: `4px solid ${COULEUR[n]}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--encre)' }}>
                            {cle === 'en_attente' && <span className="mono" style={{ color: 'var(--gris)', marginRight: 6 }}>{rang + 1}.</span>}{p.nomComplet}
                          </div>
                          <div style={{ fontSize: 14, color: 'var(--texte)' }}>{p.sejour.motif || 'Motif non renseigné'}</div>
                        </div>
                        <span className="badge" style={{ background: COULEUR[n] }}>P{n}</span>
                      </div>
                      <div className="mono" style={{ fontSize: 12, color: depasse ? 'var(--rouge)' : 'var(--gris)', fontWeight: depasse ? 500 : 400 }}>
                        ARRIVÉE {heure(p.sejour.date_entree)} · {cle === 'vu' ? 'VU' : `ATTENTE ${duree(min).toUpperCase()}`}{depasse ? ' · DÉLAI DÉPASSÉ' : ''} · {p.service.toUpperCase()}{!sites.actif && p.sejour.site_id ? ` · ${sites.nom(p.sejour.site_id).toUpperCase()}` : ''}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        {cle === 'en_attente' && <button type="button" className="btn" onClick={() => modifier(p, { statut_triage: 'en_cours' }, 'Prise en charge')}>Je prends ce patient</button>}
                        {cle === 'en_cours' && <>
                          <button type="button" className="btn" onClick={() => modifier(p, { statut_triage: 'vu' }, 'Patient vu')}>Patient vu</button>
                          <button type="button" className="btn-lien bleu" onClick={() => modifier(p, { statut_triage: 'en_attente' }, 'Remis en attente')}>REMETTRE EN ATTENTE</button>
                        </>}
                        {cle !== 'vu' && (
                          <select className="saisie petite" style={{ width: 'auto' }} value={n} aria-label={`Triage de ${p.nomComplet}`}
                            onChange={e => modifier(p, { niveau_urgence: Number(e.target.value) }, `Triage P${e.target.value}`)}>
                            {Object.keys(CIBLE).map(k => <option key={k} value={k}>P{k}</option>)}
                          </select>
                        )}
                        <Link to="/medecin/compte-rendu" className="btn-lien bleu" onClick={() => choisir(p.id)}>COMPTE-RENDU</Link>
                      </div>
                    </article>
                  )
                })}
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
