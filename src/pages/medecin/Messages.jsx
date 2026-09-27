import { useCallback, useEffect, useState } from 'react'
import Conversation from '../../components/Conversation.jsx'
import { Chargement, EnTeteOutil, Vide } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase } from '../../lib/supabase.js'
import { dateHeure } from '../../lib/format.js'

export default function Messages() {
  const { profil } = useAuth()
  const { patients, patient, choisir, chargement } = usePatients()
  const [resume, setResume] = useState({})

  // Dernier message et nombre de non-lus par patient.
  const chargerResume = useCallback(async () => {
    const { data } = await supabase.from('messages').select('patient_id, expediteur, lu, contenu, created_at').order('created_at')
    const r = {}
    for (const m of data || []) {
      const x = r[m.patient_id] || (r[m.patient_id] = { nonLus: 0 })
      x.dernier = m
      if (m.expediteur === 'patient' && !m.lu) x.nonLus++
    }
    setResume(r)
  }, [])
  useEffect(() => { chargerResume() }, [chargerResume])

  // Conversations actives d'abord (non-lus, puis les plus récentes), puis les autres patients.
  const tries = [...patients].sort((a, b) => {
    const ra = resume[a.id], rb = resume[b.id]
    return (rb?.nonLus || 0) - (ra?.nonLus || 0)
      || new Date(rb?.dernier?.created_at || 0) - new Date(ra?.dernier?.created_at || 0)
      || a.nomComplet.localeCompare(b.nomComplet, 'fr')
  })

  return (
    <>
      <EnTeteOutil titre="Messages">
        Échangez avec les patients qui ont un compte « Mon Hôpital M&amp;M ». Leurs questions arrivent ici ; vos réponses apparaissent dans leur espace.
      </EnTeteOutil>
      {chargement ? <Chargement /> : !patients.length ? <Vide>Aucun patient dans vos services.</Vide> : (
        <div className="messagerie">
          <nav aria-label="Conversations" style={{ display: 'grid', gap: 6 }}>
            {tries.map(p => {
              const r = resume[p.id]
              const actif = p.id === patient?.id
              return (
                <button key={p.id} type="button" onClick={() => choisir(p.id)}
                  style={{ textAlign: 'left', cursor: 'pointer', background: actif ? 'var(--bleu)' : '#fff', color: actif ? 'var(--papier)' : 'var(--encre)', border: `1px solid ${actif ? 'var(--bleu)' : 'var(--filet)'}`, padding: '10px 12px', display: 'grid', gap: 3, fontFamily: 'inherit' }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{p.nomComplet}</span>
                    {r?.nonLus > 0 && <span className="badge urgence" style={{ padding: '2px 7px' }}>{r.nonLus}</span>}
                  </span>
                  <span style={{ fontSize: 13, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r?.dernier ? `${r.dernier.expediteur === 'medecin' ? 'Vous : ' : ''}${r.dernier.contenu}` : p.auth_id ? 'Aucun message' : 'Pas de compte patient'}
                  </span>
                  {r?.dernier && <span className="mono" style={{ fontSize: 10.5, opacity: 0.75 }}>{dateHeure(r.dernier.created_at)}</span>}
                </button>
              )
            })}
          </nav>
          <section style={{ display: 'grid', gap: 10, minWidth: 0 }}>
            {patient && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--encre)' }}>{patient.nomComplet}</span>
                  <span className="etiquette">{patient.numero_dossier} · {patient.service}</span>
                </div>
                {!patient.auth_id && <p className="note" style={{ fontSize: 14 }}>Ce patient n'a pas encore de compte : il verra vos messages dès qu'il aura lié son dossier.</p>}
                <Conversation patientId={patient.id} moi="medecin" medecinId={profil.userId} nomAutre={patient.prenom} onLu={chargerResume} />
              </>
            )}
          </section>
        </div>
      )}
    </>
  )
}
