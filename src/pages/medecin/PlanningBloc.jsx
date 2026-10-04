import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chargement, EnTeteOutil, Message } from '../../components/ui.jsx'
import { chargerOperations, minuit, plusJours, useBloc } from '../../lib/bloc.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { useSites } from '../../lib/sites.jsx'
import { heure } from '../../lib/format.js'
import { messageErreur } from '../../lib/supabase.js'
import { statutOp } from '../../lib/operations.js'

/** Lundi de la semaine de d. */
function lundi(d) { const x = minuit(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const jourCourt = d => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

export default function PlanningBloc() {
  const { patients } = usePatients()
  const sites = useSites()
  const bloc = useBloc()
  const [debut, setDebut] = useState(() => lundi(new Date()))
  const [ops, setOps] = useState(null)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    setOps(null)
    const { data, error } = await chargerOperations(debut.toISOString(), plusJours(debut, 7).toISOString())
    if (error) setErreur(messageErreur(error))
    setOps(data)
  }, [debut])
  useEffect(() => { charger() }, [charger])

  const salles = useMemo(() => bloc.salles.filter(s => !sites.actif || s.site_id === sites.actif)
    .sort((a, b) => sites.nom(a.site_id).localeCompare(sites.nom(b.site_id), 'fr') || a.ordre - b.ordre), [bloc.salles, sites])
  const jours = Array.from({ length: 7 }, (_, i) => plusJours(debut, i))
  const auj = minuit().getTime()
  const nomPatient = id => patients.find(p => p.id === id)?.nomComplet || 'Patient'
  const fin = plusJours(debut, 6)
  const total = (ops || []).filter(o => o.statut !== 'annulée' && salles.some(s => s.id === o.salle_id)).length

  return (
    <>
      <EnTeteOutil titre="Planning du bloc">Semaine par salle : chaque case liste les opérations du jour. Une salle ne peut pas être réservée deux fois sur le même créneau.</EnTeteOutil>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="rangee-btn" style={{ alignItems: 'center' }}>
          <button type="button" className="btn" onClick={() => setDebut(d => plusJours(d, -7))} aria-label="Semaine précédente">←</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--encre)' }}>Du {jourCourt(debut)} au {jourCourt(fin)}</span>
          <button type="button" className="btn" onClick={() => setDebut(d => plusJours(d, 7))} aria-label="Semaine suivante">→</button>
          <button type="button" className="btn-lien bleu" onClick={() => setDebut(lundi(new Date()))}>CETTE SEMAINE</button>
        </div>
        <span className="etiquette">{total} opération{total > 1 ? 's' : ''}</span>
      </div>
      <Message type="alerte">{erreur}</Message>
      {ops === null ? <Chargement /> : (
        <div className="defile-x">
          <div className="planning" style={{ gridTemplateColumns: `minmax(92px, 120px) repeat(${salles.length}, minmax(200px, 1fr))`, minWidth: 120 + salles.length * 200 }}>
            <div className="jour" style={{ minHeight: 0 }} />
            {salles.map(s => (
              <div key={s.id} className="jour" style={{ minHeight: 0, background: '#fff' }}>
                <span style={{ fontWeight: 700, color: 'var(--encre)' }}>{s.nom}</span><span className="etiquette">{sites.nom(s.site_id)}</span>
              </div>
            ))}
            {jours.map(j => (
              <div key={j.getTime()} style={{ display: 'contents' }}>
                <div className={'jour' + (j.getTime() === auj ? ' auj' : '')}>
                  <span style={{ fontWeight: 700, color: j.getTime() === auj ? 'var(--bleu)' : 'var(--encre)', textTransform: 'capitalize' }}>{jourCourt(j)}</span>
                </div>
                {salles.map(s => {
                  const items = (ops || []).filter(o => o.salle_id === s.id && minuit(new Date(o.debut)).getTime() === j.getTime())
                  return (
                    <div key={s.id} className={'jour' + (j.getTime() === auj ? ' auj' : '')}>
                      {items.map(o => (
                        <Link key={o.id} to={`/medecin/bloc/${o.id}`} className={'bloc-op' + (o.statut === 'annulée' ? ' annulee' : '')}>
                          <span className="mono" style={{ fontSize: 12 }}>{heure(o.debut)}–{heure(o.fin)}</span> · <strong>{nomPatient(o.patient_id)}</strong>
                          <div style={{ color: 'var(--texte)' }}>{o.intervention}</div>
                          <div className="mono" style={{ fontSize: 10.5, color: 'var(--gris)' }}>{statutOp(o.statut)[1].toUpperCase()}</div>
                        </Link>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
