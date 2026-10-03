import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CarnetSante from '../../components/CarnetSante.jsx'
import Courbe from '../../components/Courbe.jsx'
import { CHAMPS_COORDONNEES, SectionContact, SectionCoordonnees, SectionSuivi, nettoyer, verifierCoordonnees } from '../../components/ChampsCoordonnees.jsx'
import { BadgeSejour, Chargement, EnTeteOutil, Message, SelecteurPatient, Vide } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase, journaliser, messageErreur } from '../../lib/supabase.js'
import { date, dateHeure, nomComplet, nomMedecin } from '../../lib/format.js'

const ONGLETS = ['Résumé', 'Constantes', 'Médicaments donnés', 'Documents', 'Examens', 'Rendez-vous', 'Carnet de santé']

function Ligne({ titre, meta, children }) {
  return (
    <details style={{ background: '#fff', border: '1px solid var(--filet)', padding: '11px 13px' }}>
      <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--encre)' }}>{titre}</span>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--gris)' }}>{meta}</span>
      </summary>
      <div style={{ marginTop: 10, fontSize: 14.5, color: 'var(--texte)', whiteSpace: 'pre-wrap' }}>{children}</div>
    </details>
  )
}

const versFormulaire = p => Object.fromEntries(CHAMPS_COORDONNEES.map(k => [k, p[k] ?? '']))

/** Coordonnées, personne à prévenir et suivi, avec modification sur place. */
function Coordonnees({ p }) {
  const { profil } = useAuth()
  const { charger } = usePatients()
  const [f, setF] = useState(null)
  const [msg, setMsg] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const maj = k => v => setF(x => ({ ...x, [k]: v }))
  useEffect(() => { setF(null); setMsg({}) }, [p.id])

  const enregistrer = async e => {
    e.preventDefault()
    const invalide = verifierCoordonnees(f)
    if (invalide) { setMsg({ alerte: invalide }); return }
    setEnvoi(true)
    const champs = nettoyer(f)
    const modifies = CHAMPS_COORDONNEES.filter(k => (champs[k] ?? null) !== (p[k] ?? null))
    if (modifies.length) {
      const { error } = await supabase.from('patients').update(champs).eq('id', p.id)
      if (error) { setMsg({ alerte: messageErreur(error) }); setEnvoi(false); return }
      journaliser(profil, `Coordonnées modifiées : ${p.nomComplet}`, { patient_id: p.id, service_id: p.service_id })
      await charger()
    }
    setEnvoi(false); setF(null)
    setMsg({ succes: modifies.length ? 'Coordonnées enregistrées.' : 'Aucune modification.' })
  }

  if (f) return (
    <form onSubmit={enregistrer} className="carte-blanche" style={{ display: 'grid', gap: 18, borderTop: '3px solid var(--bleu)' }} noValidate>
      <section className="section-form" style={{ borderTop: 0, paddingTop: 0 }}>
        <h2>Coordonnées</h2>
        <SectionCoordonnees f={f} maj={maj} setF={setF} />
      </section>
      <section className="section-form"><h2>Personne à prévenir</h2><SectionContact f={f} maj={maj} /></section>
      <section className="section-form"><h2>Suivi</h2><SectionSuivi f={f} maj={maj} /></section>
      <Message type="alerte">{msg.alerte}</Message>
      <div className="rangee-btn">
        <button type="submit" className="btn btn-plein" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button type="button" className="btn" onClick={() => { setF(null); setMsg({}) }}>Annuler</button>
      </div>
    </form>
  )

  const lignes = [
    ['Adresse', [p.adresse, p.complement_adresse, [p.code_postal, p.ville].filter(Boolean).join(' ')].filter(Boolean).join('\n')],
    ['Téléphone', p.telephone], ['E-mail', p.email],
    ['Personne à prévenir', [p.contact_urgence_nom, p.contact_urgence_lien && `(${p.contact_urgence_lien})`, p.contact_urgence_telephone].filter(Boolean).join(' ')],
    ['Médecin traitant', p.medecin_traitant], ['Lieu de naissance', p.lieu_naissance], ['Traitement en cours', p.traitement_en_cours],
  ].filter(([, v]) => v)
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <span className="etiquette">Coordonnées</span>
        <button type="button" className="btn-lien bleu" onClick={() => { setF(versFormulaire(p)); setMsg({}) }}>{lignes.length ? 'MODIFIER' : 'AJOUTER LES COORDONNÉES'}</button>
      </div>
      <Message type="succes">{msg.succes}</Message>
      {!lignes.length ? <Vide>Aucune coordonnée renseignée.</Vide> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 1, background: 'var(--filet)', border: '1px solid var(--filet)' }}>
          {lignes.map(([k, v]) => (
            <div key={k} style={{ background: '#fff', padding: '12px 14px' }}>
              <div className="etiquette">{k}</div>
              <div style={{ fontSize: 14.5, color: 'var(--encre)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dossier() {
  const { profil } = useAuth()
  const { patient } = usePatients()
  const [onglet, setOnglet] = useState('Résumé')
  const [d, setD] = useState(null)

  // Rechargé quand on change de patient, pas quand sa fiche est mise à jour.
  const patientId = patient?.id
  const charger = useCallback(async () => {
    if (!patientId) return
    const q = t => supabase.from(t).select('*').eq('patient_id', patientId)
    const [cst, adm, pr, cr, doc, ex, rdv, med, inf] = await Promise.all([
      q('constantes_vitales').order('date_mesure'),
      q('administrations_medicament').order('heure_administration', { ascending: false }),
      q('prescriptions').order('created_at', { ascending: false }),
      q('comptes_rendus').order('created_at', { ascending: false }),
      q('documents_officiels').order('created_at', { ascending: false }),
      q('examens_laboratoire').order('date_demande', { ascending: false }),
      q('rendez_vous').order('date_heure', { ascending: false }),
      supabase.from('medecins').select('id, nom, prenom'),
      supabase.from('infirmiers').select('id, nom, prenom'),
    ])
    const personnes = {}
    for (const x of inf.data || []) personnes[x.id] = nomComplet(x)
    for (const x of med.data || []) personnes[x.id] = nomMedecin(x)
    setD({ cst: cst.data || [], adm: adm.data || [], pr: pr.data || [], cr: cr.data || [], doc: doc.data || [], ex: ex.data || [], rdv: rdv.data || [], personnes })
  }, [patientId])
  useEffect(() => { setD(null); charger() }, [charger])

  const pts = k => (d?.cst || []).map(c => ({ t: c.date_mesure, v: c[k] }))

  return (
    <>
      <EnTeteOutil titre="Dossier patient">Tout le dossier au même endroit : séjours, constantes, soins, documents, examens, rendez-vous et carnet de santé.</EnTeteOutil>
      <SelecteurPatient />

      {patient && (
        <article className="carte" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'flex-start', borderLeft: '4px solid var(--bleu)' }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--encre)' }}>{patient.nomComplet}</div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--gris)' }}>
              DOSSIER {patient.numero_dossier} · IPP {patient.ipp || '—'} · {patient.service.toUpperCase()}{patient.num_chambre ? ` · ${patient.num_chambre.toUpperCase()}` : ''}
            </div>
            <div style={{ fontSize: 14.5, color: 'var(--texte)' }}>
              {patient.date_naissance ? `Né(e) le ${date(patient.date_naissance)}` : 'Date de naissance inconnue'}
              {patient.sexe ? ` · ${patient.sexe === 'F' ? 'Féminin' : 'Masculin'}` : ''} · Groupe {patient.groupe_sanguin || '—'}
              {patient.auth_id ? ' · compte patient actif' : ''}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
            <BadgeSejour sejour={patient.sejour} />
            {patient.allergies && <span className="badge urgence">Allergie : {patient.allergies}</span>}
          </div>
        </article>
      )}

      <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ONGLETS.map(o => <button key={o} type="button" role="tab" aria-selected={o === onglet} className={'btn-puce' + (o === onglet ? ' actif' : '')} onClick={() => setOnglet(o)}>{o}</button>)}
      </div>

      {!patient ? <Vide>Choisissez un patient.</Vide> : !d ? <Chargement /> : (
        <div role="tabpanel" style={{ display: 'grid', gap: 14 }}>
          {onglet === 'Résumé' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 1, background: 'var(--filet)', border: '1px solid var(--filet)' }}>
                {[['Séjours', patient.sejours.length], ['Relevés', d.cst.length], ['Médicaments donnés', d.adm.length], ['Ordonnances', d.pr.length], ['Comptes-rendus', d.cr.length], ['Examens', d.ex.length]].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--papier)', padding: '14px 16px' }}><div className="etiquette">{k}</div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--encre)' }}>{v}</div></div>
                ))}
              </div>
              <Coordonnees p={patient} />
              {patient.antecedents && <div className="note"><strong style={{ color: 'var(--encre)' }}>Antécédents : </strong>{patient.antecedents}</div>}
              <div className="etiquette">Séjours</div>
              {!patient.sejours.length ? <Vide>Aucun séjour.</Vide> : (
                <div className="defile-x"><table className="tableau">
                  <thead><tr><th>Entrée</th><th>Sortie</th><th>Triage</th><th>Motif</th></tr></thead>
                  <tbody>{patient.sejours.map(s => (
                    <tr key={s.id}><td className="mono">{dateHeure(s.date_entree)}</td><td className="mono">{s.date_sortie ? dateHeure(s.date_sortie) : 'En cours'}</td><td className="mono">{s.niveau_urgence ? `P${s.niveau_urgence}` : '—'}</td><td>{s.motif || '—'}</td></tr>
                  ))}</tbody>
                </table></div>
              )}
              <div className="rangee-btn">
                <Link to="/medecin/compte-rendu" className="btn">Nouveau compte-rendu</Link>
                <Link to="/medecin/ordonnance" className="btn">Nouvelle ordonnance</Link>
                <Link to="/medecin/messages" className="btn">Écrire au patient</Link>
              </div>
            </>
          )}

          {onglet === 'Constantes' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 16 }}>
              <Courbe titre="Température" unite="°C" decimales={1} normale={[36, 37.8]} series={[{ nom: 'Température', points: pts('temperature') }]} />
              <Courbe titre="Fréquence cardiaque" unite="/min" normale={[60, 100]} series={[{ nom: 'FC', points: pts('pouls') }]} />
              <Courbe titre="Tension artérielle" unite="mmHg" series={[
                { nom: 'Systolique', points: pts('tension_systolique'), normale: [90, 140] },
                { nom: 'Diastolique', points: pts('tension_diastolique'), normale: [60, 90] },
              ]} />
              <Courbe titre="Saturation" unite="%" normale={[95, 100]} series={[{ nom: 'SpO₂', points: pts('saturation') }]} />
              <Courbe titre="Poids" unite="kg" decimales={1} series={[{ nom: 'Poids', points: pts('poids') }]} />
            </div>
          )}

          {onglet === 'Médicaments donnés' && (!d.adm.length ? <Vide>Aucun médicament administré enregistré.</Vide> : (
            <div className="defile-x"><table className="tableau">
              <thead><tr><th>Date et heure</th><th>Médicament</th><th>Donné par</th><th>Notes</th></tr></thead>
              <tbody>{d.adm.map(a => (
                <tr key={a.id}>
                  <td className="mono" style={{ whiteSpace: 'nowrap' }}>{dateHeure(a.heure_administration)}</td>
                  <td style={{ fontWeight: 600 }}>{a.medicament}</td>
                  <td>{d.personnes[a.administre_par] || '—'} <span className="etiquette">{a.role_administrant}</span></td>
                  <td>{a.notes || '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ))}

          {onglet === 'Documents' && (
            <>
              <div className="etiquette">Ordonnances · {d.pr.length}</div>
              {!d.pr.length ? <Vide>Aucune ordonnance.</Vide> : d.pr.map(x => <Ligne key={x.id} titre={(x.contenu || '').split('\n')[0] || 'Ordonnance'} meta={`${dateHeure(x.created_at)} · ${d.personnes[x.medecin_id] || ''}`}>{x.contenu}</Ligne>)}
              <div className="etiquette">Comptes-rendus et documents · {d.cr.length}</div>
              {!d.cr.length ? <Vide>Aucun compte-rendu.</Vide> : d.cr.map(x => <Ligne key={x.id} titre={(x.contenu || '').split('\n')[0]} meta={`${dateHeure(x.created_at)} · ${d.personnes[x.medecin_id] || ''}`}>{x.contenu.split('\n').slice(1).join('\n').replace(/^-+\n/, '')}</Ligne>)}
              <div className="etiquette">Bulletins Entrée / Sortie · {d.doc.length}</div>
              {!d.doc.length ? <Vide>Aucun bulletin.</Vide> : d.doc.map(x => (
                <Ligne key={x.id} titre={`Séjour du ${date(x.date_entree) || '—'} au ${date(x.date_sortie) || '—'}`} meta={dateHeure(x.created_at)}>
                  {[['Motif', x.motif_admission], ['Évolution', x.evolution_clinique], ['Traitement de sortie', x.traitement_sortie], ['Suivi', x.rdv_suivi], ['Consignes', x.consignes_post]].filter(y => y[1]).map(([k, v]) => `${k} : ${v}`).join('\n\n')}
                </Ligne>
              ))}
            </>
          )}

          {onglet === 'Examens' && (!d.ex.length ? <Vide>Aucun examen.</Vide> : (
            <div className="defile-x"><table className="tableau">
              <thead><tr><th>Demandé le</th><th>Examen</th><th>Statut</th><th>Résultat</th></tr></thead>
              <tbody>{d.ex.map(x => (
                <tr key={x.id}>
                  <td className="mono" style={{ whiteSpace: 'nowrap' }}>{dateHeure(x.date_demande)}</td>
                  <td style={{ fontWeight: 600 }}>{x.type_examen}</td>
                  <td><span className={'statut-texte ' + ({ 'demandé': 'surveiller', en_cours: 'stable', disponible: 'stable' }[x.statut] || '')}>{({ 'demandé': 'DEMANDÉ', en_cours: 'EN COURS', disponible: 'DISPONIBLE' })[x.statut] || x.statut}</span></td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{x.resultat || '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ))}

          {onglet === 'Rendez-vous' && (!d.rdv.length ? <Vide>Aucun rendez-vous.</Vide> : (
            <div className="defile-x"><table className="tableau">
              <thead><tr><th>Date et heure</th><th>Motif</th><th>Statut</th></tr></thead>
              <tbody>{d.rdv.map(r => (
                <tr key={r.id}><td className="mono">{dateHeure(r.date_heure)}</td><td>{r.motif || 'Consultation'}</td><td className="mono">{r.statut.toUpperCase()}</td></tr>
              ))}</tbody>
            </table></div>
          ))}

          {onglet === 'Carnet de santé' && <CarnetSante patient={patient} editable profil={profil} />}
        </div>
      )}
    </>
  )
}
