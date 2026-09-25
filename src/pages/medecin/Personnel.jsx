import { useCallback, useEffect, useState } from 'react'
import { LogoMark } from '../../components/Logo.jsx'
import { Chargement, EnTeteOutil, Message } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase, messageErreur } from '../../lib/supabase.js'
import { nomComplet } from '../../lib/format.js'

/** Badge personnel 85 × 54 mm de la charte : blanc pour les médecins, bleu pour les soins. */
function BadgePersonnel({ nom, fonction, services, soins }) {
  return (
    <div style={{ background: soins ? 'var(--bleu)' : '#fff', border: soins ? 'none' : '1px solid var(--filet-fort)', padding: 14, display: 'flex', gap: 12, alignItems: 'center', color: soins ? 'var(--papier)' : 'inherit' }}>
      <LogoMark variante={soins ? 'inverse' : 'couleur'} size={48} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: soins ? 'var(--papier)' : 'var(--encre)' }}>{nom}</div>
        <div style={{ fontSize: 13, color: soins ? 'var(--papier)' : 'var(--texte)' }}>{fonction}</div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', marginTop: 4, color: soins ? 'var(--bleu-pale)' : 'var(--bleu)' }}>{services.map(s => s.toUpperCase()).join(' · ') || 'SANS SERVICE'}</div>
      </div>
    </div>
  )
}

export default function Personnel() {
  const { profil } = useAuth()
  const { charger: rechargerPatients } = usePatients()
  const [d, setD] = useState(null)
  const [msg, setMsg] = useState({})

  const charger = useCallback(async () => {
    const [m, i, ms, is, s] = await Promise.all([
      supabase.from('medecins').select('*').order('nom'),
      supabase.from('infirmiers').select('*').order('nom'),
      supabase.from('medecin_services').select('*'),
      supabase.from('infirmier_services').select('*'),
      supabase.from('services').select('*').order('nom'),
    ])
    setD({ medecins: m.data || [], infirmiers: i.data || [], ms: ms.data || [], is: is.data || [], services: s.data || [] })
  }, [])
  useEffect(() => { charger() }, [charger])

  if (!d) return <><EnTeteOutil titre="Personnel" /><Chargement /></>
  const nomService = id => d.services.find(s => s.id === id)?.nom || ''
  const svcMed = id => d.ms.filter(x => x.medecin_id === id).map(x => nomService(x.service_id))
  const svcInf = id => d.is.filter(x => x.infirmier_id === id).map(x => nomService(x.service_id))

  const basculer = async (table, colonne, personneId, serviceId, actif) => {
    const ligne = { [colonne]: personneId, service_id: serviceId }
    const { error } = actif
      ? await supabase.from(table).delete().match(ligne)
      : await supabase.from(table).insert(ligne)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    setMsg({ succes: 'Rattachement mis à jour.' })
    await charger()
    if (personneId === profil.userId) rechargerPatients()
  }

  const Rattachements = ({ table, colonne, personneId, liens }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {d.services.map(s => {
        const actif = liens.some(x => x[colonne] === personneId && x.service_id === s.id)
        return <button key={s.id} type="button" className={'btn-puce' + (actif ? ' actif' : '')} onClick={() => basculer(table, colonne, personneId, s.id, actif)}>{actif ? '✓ ' : '+ '}{s.nom}</button>
      })}
    </div>
  )

  return (
    <>
      <EnTeteOutil titre="Personnel">Médecins et infirmiers de l'hôpital, et leurs services de rattachement. Un membre du personnel ne voit que les patients de ses services.</EnTeteOutil>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="etiquette">Mes services</div>
        <div className="carte-blanche"><Rattachements table="medecin_services" colonne="medecin_id" personneId={profil.userId} liens={d.ms} /></div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="etiquette">Médecins · {d.medecins.length}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
          {d.medecins.map(m => <BadgePersonnel key={m.id} nom={nomComplet(m)} fonction="Médecin" services={svcMed(m.id)} />)}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="etiquette">Infirmiers · {d.infirmiers.length}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
          {d.infirmiers.map(i => (
            <div key={i.id} style={{ display: 'grid', gap: 8 }}>
              <BadgePersonnel soins nom={nomComplet(i)} fonction="Infirmier" services={svcInf(i.id)} />
              <Rattachements table="infirmier_services" colonne="infirmier_id" personneId={i.id} liens={d.is} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
