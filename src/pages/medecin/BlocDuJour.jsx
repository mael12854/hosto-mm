import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeOp, avancementChecklist } from '../../components/Operation.jsx'
import { Chargement, EnTeteOutil, Message, Vide } from '../../components/ui.jsx'
import { chargerOperations, minuit, plusJours, useBloc } from '../../lib/bloc.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { siteDe, useSites } from '../../lib/sites.jsx'
import { heure } from '../../lib/format.js'
import { messageErreur } from '../../lib/supabase.js'

const COLONNES = [
  ['À venir', ['prévue', 'prête'], 'var(--bleu)'],
  ['Au bloc', ['au_bloc'], 'var(--ambre)'],
  ['En réveil', ['réveil'], 'var(--bleu)'],
  ['Terminées', ['terminée'], 'var(--vert)'],
]

/** Carte d'une opération, utilisée dans le tableau du bloc et le tableau de bord. */
export function CarteOperation({ op, patient, bloc, sites }) {
  const allergie = patient?.allergies
  return (
    <Link to={`/medecin/bloc/${op.id}`} className="carte-op" style={{ borderLeftColor: op.statut === 'au_bloc' ? 'var(--ambre)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <span className="h">{heure(op.debut)} – {heure(op.fin)}</span><BadgeOp statut={op.statut} />
      </div>
      <span className="p">{patient?.nomComplet || 'Patient'}</span>
      <span className="i">{op.intervention}{op.cote && op.cote !== 'Sans objet' ? ` · côté ${op.cote.toLowerCase()}` : ''}</span>
      <span className="mono" style={{ fontSize: 11, color: 'var(--gris)' }}>
        {(bloc.salle(op.salle_id)?.nom || '').toUpperCase()}{!sites.actif ? ` · ${sites.nom(op.site_id).toUpperCase()}` : ''} · {bloc.chirurgien(op.chirurgien_id).toUpperCase()} · CHECK-LIST {avancementChecklist(op.checklist)}
      </span>
      {allergie && <span className="statut-texte urgence">ALLERGIE : {allergie.toUpperCase()}</span>}
    </Link>
  )
}

export default function BlocDuJour() {
  const { patients } = usePatients()
  const sites = useSites()
  const bloc = useBloc()
  const [ops, setOps] = useState(null)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const debut = minuit()
    const { data, error } = await chargerOperations(debut.toISOString(), plusJours(debut, 1).toISOString())
    if (error) setErreur(messageErreur(error))
    setOps(data)
  }, [])
  // Tableau en direct : relu toutes les 30 secondes.
  useEffect(() => { charger(); const t = setInterval(charger, 30000); return () => clearInterval(t) }, [charger])

  const visibles = sites.filtrer(ops || []).filter(o => o.statut !== 'annulée')
  const patient = id => patients.find(p => p.id === id)
  const annulees = sites.filtrer(ops || []).filter(o => o.statut === 'annulée').length

  return (
    <>
      <EnTeteOutil titre="Bloc du jour">
        {sites.actif ? `Bloc du ${siteDe(sites.nom(sites.actif))}` : 'Blocs des deux sites'}, {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}. Le tableau se met à jour tout seul.
      </EnTeteOutil>
      <div className="rangee-btn">
        <Link to="/medecin/bloc/programmer" className="btn btn-plein">Programmer une opération</Link>
        <Link to="/medecin/bloc/planning" className="btn">Planning de la semaine</Link>
      </div>
      <Message type="alerte">{erreur}</Message>
      {ops === null ? <Chargement /> : !visibles.length ? <Vide>Aucune opération aujourd'hui{sites.actif ? ` au ${siteDe(sites.nom(sites.actif))}` : ''}.</Vide> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16, alignItems: 'start' }}>
          {COLONNES.map(([titre, statuts, couleur]) => {
            const items = visibles.filter(o => statuts.includes(o.statut))
            return (
              <section key={titre} style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `3px solid ${couleur}`, paddingBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--encre)' }}>{titre}</span><span className="etiquette">{items.length}</span>
                </div>
                {!items.length ? <Vide>Personne.</Vide> : items.map(o => <CarteOperation key={o.id} op={o} patient={patient(o.patient_id)} bloc={bloc} sites={sites} />)}
              </section>
            )
          })}
        </div>
      )}
      {annulees > 0 && <div className="etiquette">{annulees} opération{annulees > 1 ? 's' : ''} annulée{annulees > 1 ? 's' : ''} aujourd'hui</div>}
    </>
  )
}
