import { useEffect, useState } from 'react'
import EnTeteEspace from '../components/EnTeteEspace.jsx'
import { Chargement, Vide } from '../components/ui.jsx'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../lib/supabase.js'
import { date, dateCourte, dateHeure, nomMedecin } from '../lib/format.js'

function Bloc({ titre, children }) {
  return <section style={{ display: 'grid', gap: 12 }}><div className="etiquette">{titre}</div>{children}</section>
}

export default function EspacePatient() {
  const { profil } = useAuth()
  const p = profil.patient
  const [d, setD] = useState(null)

  useEffect(() => {
    const q = t => supabase.from(t).select('*').eq('patient_id', p.id)
    Promise.all([
      q('comptes_rendus').order('created_at', { ascending: false }),
      q('prescriptions').order('created_at', { ascending: false }),
      q('documents_officiels').order('created_at', { ascending: false }),
      q('rendez_vous').gte('date_heure', new Date().toISOString()).order('date_heure'),
      supabase.from('medecins').select('id, nom, prenom'),
    ]).then(([cr, pr, doc, rdv, med]) => setD({ cr: cr.data || [], pr: pr.data || [], doc: doc.data || [], rdv: rdv.data || [], med: med.data || [] }))
  }, [p.id])

  const medecin = id => nomMedecin(d?.med.find(m => m.id === id))
  const derniere = d && [...d.cr.map(x => ({ ...x, genre: 'cr' })), ...d.pr.map(x => ({ ...x, genre: 'pr' }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  const [titre, ...corps] = (derniere?.contenu || '').split('\n')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fond)' }}>
      <EnTeteEspace clair titre="Mon Hôpital M&M" qui={(p.prenom || '').toUpperCase()} />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 72px', display: 'grid', gap: 28 }}>
        <div>
          <h1 className="titre-outil">Bonjour {p.prenom}.</h1>
          <p className="intro">Votre dossier {p.numero_dossier} · Service {p.services?.nom}. Pour toute question, demandez à Maël ou à Marin.</p>
        </div>
        {!d ? <Chargement /> : (
          <>
            <Bloc titre="Ma dernière visite">
              {!derniere ? <Vide>Aucune visite enregistrée pour le moment.</Vide> : (
                <div style={{ background: '#fff', border: '1px solid var(--filet)', padding: 16, display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--encre)', marginBottom: 6 }}>{titre || (derniere.genre === 'pr' ? 'Ordonnance' : 'Compte-rendu')}</div>
                    <p style={{ fontSize: 14.5, color: 'var(--texte)', whiteSpace: 'pre-wrap' }}>{corps.join('\n').trim()}</p>
                  </div>
                  <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5, color: 'var(--gris)', borderTop: '1px solid var(--filet)', paddingTop: 12 }}>
                    <span>{medecin(derniere.medecin_id)}</span><span>{dateCourte(derniere.created_at)}</span>
                  </div>
                </div>
              )}
            </Bloc>

            <Bloc titre="Mes prochains rendez-vous">
              {!d.rdv.length ? <Vide>Aucun rendez-vous prévu.</Vide> : d.rdv.map(r => (
                <div key={r.id} className="ligne-liste">
                  <span style={{ fontSize: 14.5, color: 'var(--encre)' }}>{r.motif || 'Consultation'}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--bleu)' }}>{dateHeure(r.date_heure)}</span>
                </div>
              ))}
            </Bloc>

            <Bloc titre="Mes ordonnances">
              {!d.pr.length ? <Vide>Aucune ordonnance.</Vide> : d.pr.map(o => (
                <details key={o.id} style={{ background: '#fff', border: '1px solid var(--filet)', padding: '11px 13px' }}>
                  <summary style={{ cursor: 'pointer', fontSize: 14.5, fontWeight: 600, color: 'var(--encre)' }}>{(o.contenu || '').split('\n')[0]} <span className="mono" style={{ fontSize: 11.5, color: 'var(--gris)', fontWeight: 400 }}>· {date(o.created_at)}</span></summary>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: 14.5, color: 'var(--texte)', marginTop: 10 }}>{o.contenu}</p>
                </details>
              ))}
            </Bloc>

            <Bloc titre="Mes bulletins d'entrée / sortie">
              {!d.doc.length ? <Vide>Aucun bulletin.</Vide> : d.doc.map(b => (
                <details key={b.id} style={{ background: '#fff', border: '1px solid var(--filet)', padding: '11px 13px' }}>
                  <summary style={{ cursor: 'pointer', fontSize: 14.5, fontWeight: 600, color: 'var(--encre)' }}>Séjour du {date(b.date_entree) || '—'} au {date(b.date_sortie) || '—'}</summary>
                  <div style={{ display: 'grid', gap: 8, marginTop: 10, fontSize: 14.5, color: 'var(--texte)' }}>
                    {[['Mode de sortie', b.mode_sortie], ['Traitement de sortie', b.traitement_sortie], ['Rendez-vous & suivi', b.rdv_suivi], ['Consignes à domicile', b.consignes_post]].filter(x => x[1]).map(([k, v]) => (
                      <div key={k}><div className="etiquette">{k}</div><p style={{ whiteSpace: 'pre-wrap' }}>{v}</p></div>
                    ))}
                  </div>
                </details>
              ))}
            </Bloc>
          </>
        )}
      </main>
    </div>
  )
}
