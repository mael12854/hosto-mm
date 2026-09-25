import { useCallback, useEffect, useState } from 'react'
import { BadgeSejour, Chargement, EnTeteOutil, Message, Vide } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase, journaliser, messageErreur } from '../../lib/supabase.js'

export default function Lits() {
  const { profil } = useAuth()
  const { patients } = usePatients()
  const [lits, setLits] = useState(null)
  const [services, setServices] = useState([])
  const [nouveau, setNouveau] = useState({ identifiant: '', service_id: '' })
  const [msg, setMsg] = useState({})

  const charger = useCallback(async () => {
    const [l, s] = await Promise.all([
      supabase.from('lits').select('*, services(nom)').order('identifiant'),
      supabase.from('medecin_services').select('services(id, nom)').eq('medecin_id', profil.userId),
    ])
    setLits(l.data || [])
    const mes = (s.data || []).map(x => x.services).filter(Boolean)
    setServices(mes)
    setNouveau(n => ({ ...n, service_id: n.service_id || mes[0]?.id || '' }))
  }, [profil.userId])
  useEffect(() => { charger() }, [charger])

  const affecter = async (lit, patient_id) => {
    const { error } = await supabase.from('lits').update({ patient_id: patient_id || null }).eq('id', lit.id)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser(profil, patient_id ? `Affectation au lit ${lit.identifiant}` : `Lit ${lit.identifiant} libéré`, { patient_id: patient_id || lit.patient_id, service_id: lit.service_id })
    setMsg({ succes: patient_id ? `Lit ${lit.identifiant} attribué.` : `Lit ${lit.identifiant} libéré.` })
    charger()
  }

  const ajouter = async e => {
    e.preventDefault()
    if (!nouveau.identifiant.trim() || !nouveau.service_id) return
    const { error } = await supabase.from('lits').insert({ identifiant: nouveau.identifiant.trim(), service_id: nouveau.service_id })
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    setNouveau(n => ({ ...n, identifiant: '' }))
    setMsg({ succes: 'Lit ajouté.' })
    charger()
  }

  const occupes = (lits || []).filter(l => l.patient_id).length

  return (
    <>
      <EnTeteOutil titre="Lits">Occupation des lits de vos services. Attribuez un lit à un patient ou libérez-le à la sortie.</EnTeteOutil>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>
      {lits === null ? <Chargement /> : (
        <>
          <div className="etiquette">{occupes} occupé{occupes > 1 ? 's' : ''} · {lits.length - occupes} libre{lits.length - occupes > 1 ? 's' : ''} · {lits.length} au total</div>
          {!lits.length ? <Vide>Aucun lit enregistré dans vos services.</Vide> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 14 }}>
              {lits.map(l => {
                const p = patients.find(x => x.id === l.patient_id)
                const candidats = patients.filter(x => x.service_id === l.service_id)
                return (
                  <div key={l.id} className="carte-blanche" style={{ borderLeft: `4px solid ${l.patient_id ? 'var(--bleu)' : 'var(--filet)'}`, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                      <span className="mono" style={{ fontSize: 20, color: 'var(--encre)' }}>{l.identifiant}</span>
                      <span className="etiquette">{l.services?.nom}</span>
                    </div>
                    {p ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--encre)' }}>{p.nomComplet}</span>
                        <BadgeSejour sejour={p.sejour} />
                      </div>
                    ) : <span className="statut-texte stable">LIBRE</span>}
                    <select className="saisie petite" value={l.patient_id || ''} onChange={e => affecter(l, e.target.value)} aria-label={`Patient du lit ${l.identifiant}`}>
                      <option value="">— Lit libre —</option>
                      {candidats.map(x => <option key={x.id} value={x.id}>{x.nomComplet}</option>)}
                    </select>
                  </div>
                )
              })}
            </div>
          )}
          {services.length > 0 && (
            <form onSubmit={ajouter} className="carte-blanche" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
              <label className="champ" style={{ flex: '1 1 160px' }}><span>Nouveau lit</span><input className="saisie mono" placeholder="004-A" value={nouveau.identifiant} onChange={e => setNouveau(n => ({ ...n, identifiant: e.target.value }))} /></label>
              <label className="champ" style={{ flex: '1 1 200px' }}><span>Service</span>
                <select className="saisie" value={nouveau.service_id} onChange={e => setNouveau(n => ({ ...n, service_id: e.target.value }))}>
                  {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </label>
              <button type="submit" className="btn">Ajouter le lit</button>
            </form>
          )}
        </>
      )}
    </>
  )
}
