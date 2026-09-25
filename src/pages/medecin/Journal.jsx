import { useEffect, useMemo, useState } from 'react'
import { Chargement, EnTeteOutil, Vide } from '../../components/ui.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase } from '../../lib/supabase.js'
import { dateHeure, nomComplet, normaliser } from '../../lib/format.js'

export default function Journal() {
  const { patients } = usePatients()
  const [lignes, setLignes] = useState(null)
  const [auteurs, setAuteurs] = useState({})
  const [q, setQ] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('journal_activite').select('*, services(nom)').order('created_at', { ascending: false }).limit(300),
      supabase.from('medecins').select('id, nom, prenom'),
      supabase.from('infirmiers').select('id, nom, prenom'),
    ]).then(([j, m, i]) => {
      const a = {}
      for (const x of i.data || []) a[x.id] = nomComplet(x)
      for (const x of m.data || []) a[x.id] = 'Dr ' + nomComplet(x)
      setAuteurs(a)
      setLignes(j.data || [])
    })
  }, [])

  const noms = useMemo(() => Object.fromEntries(patients.map(p => [p.id, p.nomComplet])), [patients])
  const filtre = (lignes || []).filter(l => !q || normaliser(`${l.action} ${noms[l.patient_id] || ''} ${auteurs[l.auteur_id] || ''}`).includes(normaliser(q)))

  return (
    <>
      <EnTeteOutil titre="Journal">Toutes les actions du personnel, de la plus récente à la plus ancienne. Un soin non consigné n'a pas eu lieu.</EnTeteOutil>
      <label className="champ" style={{ maxWidth: 420 }}><span>Filtrer</span><input type="search" className="saisie" value={q} onChange={e => setQ(e.target.value)} placeholder="Patient, action, auteur…" /></label>
      {lignes === null ? <Chargement /> : !filtre.length ? <Vide>Aucune entrée dans le journal.</Vide> : (
        <div className="defile-x">
          <table className="tableau">
            <thead><tr><th>Date</th><th>Action</th><th>Patient</th><th>Service</th><th>Auteur</th></tr></thead>
            <tbody>
              {filtre.map(l => (
                <tr key={l.id}>
                  <td className="mono" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{dateHeure(l.created_at)}</td>
                  <td>{l.action}{l.details ? <div style={{ fontSize: 13, color: 'var(--texte)' }}>{l.details}</div> : null}</td>
                  <td>{noms[l.patient_id] || '—'}</td>
                  <td>{l.services?.nom || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{auteurs[l.auteur_id] || '—'} <span className="etiquette">{l.role_auteur}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
