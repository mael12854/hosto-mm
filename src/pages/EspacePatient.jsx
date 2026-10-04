import { useEffect, useState } from 'react'
import EnTeteEspace from '../components/EnTeteEspace.jsx'
import Conversation from '../components/Conversation.jsx'
import CarnetSante from '../components/CarnetSante.jsx'
import { Chargement, Vide } from '../components/ui.jsx'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../lib/supabase.js'
import { adresseSite, siteDe, useSites } from '../lib/sites.jsx'
import { imprimerLivret } from '../lib/livret.js'
import { ficheIntervention, horairesJeun } from '../lib/interventions.js'
import { statutOp } from '../lib/operations.js'
import { date, dateCourte, dateHeure, heure, nomMedecin } from '../lib/format.js'

function Bloc({ titre, children }) {
  return <section style={{ display: 'grid', gap: 12 }}><div className="etiquette">{titre}</div>{children}</section>
}

export default function EspacePatient() {
  const { profil } = useAuth()
  const p = profil.patient
  const sites = useSites()
  const [d, setD] = useState(null)

  useEffect(() => {
    const q = t => supabase.from(t).select('*').eq('patient_id', p.id)
    Promise.all([
      q('comptes_rendus').order('created_at', { ascending: false }),
      q('prescriptions').order('created_at', { ascending: false }),
      q('documents_officiels').order('created_at', { ascending: false }),
      q('rendez_vous').gte('date_heure', new Date().toISOString()).order('date_heure'),
      q('examens_laboratoire').eq('statut', 'disponible').order('date_resultat', { ascending: false }),
      supabase.from('medecins').select('id, nom, prenom'),
      supabase.rpc('mes_operations'),
    ]).then(([cr, pr, doc, rdv, ex, med, ops]) => setD({ cr: cr.data || [], pr: pr.data || [], doc: doc.data || [], rdv: rdv.data || [], ex: ex.data || [], med: med.data || [], ops: ops.data || [] }))
  }, [p.id])

  const medecin = id => nomMedecin(d?.med.find(m => m.id === id))
  const derniere = d && [...d.cr.map(x => ({ ...x, genre: 'cr' })), ...d.pr.map(x => ({ ...x, genre: 'pr' }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  const [titreBrut, ...corpsBrut] = (derniere?.contenu || '').split('\n')
  // Compte-rendu structuré : résumé lisible (motif, diagnostic, consignes, prochain rendez-vous).
  const c = derniere?.champs
  const titre = c ? `Consultation — ${c.motif}` : titreBrut
  const corps = c
    ? [c.diagnostic && `Conclusion : ${c.diagnostic}`, c.traitement && `Traitement : ${c.traitement}`, c.conduite && `Consignes : ${c.conduite}`, c.prochain_rdv && `Prochain rendez-vous : ${dateHeure(c.prochain_rdv)}`].filter(Boolean)
    : corpsBrut

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

            <Bloc titre="Mes messages avec l'équipe médicale">
              <Conversation patientId={p.id} moi="patient" nomAutre="Hôpital M&M" />
            </Bloc>

            <Bloc titre="Mes prochains rendez-vous">
              {!d.rdv.length ? <Vide>Aucun rendez-vous prévu.</Vide> : d.rdv.map(r => (
                <div key={r.id} className="ligne-liste">
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 14.5, color: 'var(--encre)', display: 'block' }}>{r.motif || 'Consultation'}</span>
                    {sites.parId(r.site_id) && <span style={{ fontSize: 13.5, color: 'var(--texte)' }}>{siteDe(sites.nom(r.site_id)).replace(/^s/, 'S')} · {adresseSite(sites.parId(r.site_id))}</span>}
                  </span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--bleu)' }}>{dateHeure(r.date_heure)}</span>
                </div>
              ))}
            </Bloc>

            {d.ops.length > 0 && (
              <Bloc titre="Mes opérations">
                {d.ops.map(o => {
                  const site = sites.parId(o.site_id), aVenir = !['terminée'].includes(o.statut) && new Date(o.fin) > new Date()
                  const j = horairesJeun(o.debut)
                  return (
                    <div key={o.id} style={{ background: '#fff', border: '1px solid var(--filet)', borderLeft: `4px solid ${aVenir ? 'var(--bleu)' : 'var(--vert)'}`, padding: 16, display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--encre)' }}>{o.intervention}{o.cote && o.cote !== 'Sans objet' ? ` · côté ${o.cote.toLowerCase()}` : ''}</span>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--bleu)' }}>{aVenir ? dateHeure(o.debut) : `${statutOp(o.statut)[1].toUpperCase()} · ${date(o.debut)}`}</span>
                      </div>
                      {site && <span style={{ fontSize: 14, color: 'var(--texte)' }}>{siteDe(site.nom).replace(/^s/, 'S')} · {adresseSite(site)}{o.chirurgien ? ` · ${o.chirurgien}` : ''}</span>}
                      {aVenir && <p style={{ fontSize: 14.5, color: 'var(--texte)' }}>{ficheIntervention(o.code_intervention).description}</p>}
                      {aVenir && (
                        <div className="note" style={{ padding: '12px 16px', fontSize: 14.5 }}>
                          <strong style={{ color: 'var(--encre)' }}>Arrivée à {heure(j.arrivee)}.</strong> Dernier repas avant le {dateHeure(j.solides)} · dernière boisson claire (eau, sirop) avant le {dateHeure(j.liquides)}.
                          {o.consignes_preop && <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{o.consignes_preop}</div>}
                        </div>
                      )}
                      {o.consignes_sortie && <div><div className="etiquette">Consignes de sortie</div><p style={{ fontSize: 14.5, color: 'var(--texte)', whiteSpace: 'pre-wrap' }}>{o.consignes_sortie}</p></div>}
                      <button type="button" className="btn" style={{ justifySelf: 'start' }} onClick={() => imprimerLivret({ op: o, patient: { ...p, service: p.services?.nom }, site, chirurgien: o.chirurgien })}>Imprimer mon livret « Mon opération »</button>
                    </div>
                  )
                })}
              </Bloc>
            )}

            <Bloc titre="Mes résultats d'examens">
              {!d.ex.length ? <Vide>Aucun résultat disponible.</Vide> : d.ex.map(x => (
                <div key={x.id} style={{ background: '#fff', border: '1px solid var(--filet)', borderLeft: '4px solid var(--vert)', padding: '11px 13px', display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--encre)' }}>{x.type_examen}</span>
                    <span className="mono" style={{ fontSize: 11.5, color: 'var(--gris)' }}>{date(x.date_resultat)}</span>
                  </div>
                  <p style={{ fontSize: 14.5, color: 'var(--texte)', whiteSpace: 'pre-wrap' }}>{x.resultat}</p>
                </div>
              ))}
            </Bloc>

            <Bloc titre="Mon carnet de santé">
              <CarnetSante patient={p} />
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
