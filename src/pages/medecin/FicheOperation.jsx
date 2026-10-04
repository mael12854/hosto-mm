import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeOp, Checklist, CompteRenduOp, Horaires, Reveil, avancementChecklist } from '../../components/Operation.jsx'
import { Chargement, ChampDate, EnTeteOutil, Message, Vide, ZoneTexte } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useBloc } from '../../lib/bloc.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { useSites } from '../../lib/sites.jsx'
import { supabase, journaliser, messageErreur } from '../../lib/supabase.js'
import { aujourdhui, date, dateHeure, esc, heure, nomComplet, nomMedecin } from '../../lib/format.js'
import { CHAMPS_CR, STATUTS, tempsComplet } from '../../lib/operations.js'
import { ANESTHESIES, SEJOURS } from '../../lib/interventions.js'
import { enteteHtml, imprimer, piedHtml } from '../../lib/impression.js'
import { imprimerLivret } from '../../lib/livret.js'
import { estMineur } from '../../lib/dossierOperatoire.js'
import ChoixDossierOp from '../../components/ChoixDossierOp.jsx'

const ONGLETS = ['Préparation', 'Check-list', 'Au bloc', 'Compte-rendu', 'Réveil']

function Preparation({ op, enregistrer }) {
  const [f, setF] = useState(op)
  useEffect(() => { setF(op) }, [op])
  const maj = k => v => setF(x => ({ ...x, [k]: v }))
  const pret = f.consentement_signe && f.consentement_anesthesie && f.jeun_verifie
  const champs = () => ({
    consult_anesthesie_le: f.consult_anesthesie_le || null, asa: f.asa ? Number(f.asa) : null, anesthesiste: f.anesthesiste?.trim() || null,
    consentement_signe: !!f.consentement_signe, consentement_anesthesie: !!f.consentement_anesthesie, jeun_verifie: !!f.jeun_verifie,
    consignes_preop: f.consignes_preop?.trim() || null, sejour: f.sejour, anesthesie: f.anesthesie,
  })
  return (
    <div className="carte-blanche" style={{ display: 'grid', gap: 14 }}>
      <div className="grille-champs">
        <ChampDate label="Consultation d'anesthésie le" valeur={f.consult_anesthesie_le} onChange={maj('consult_anesthesie_le')} />
        <label className="champ"><span>Score ASA</span>
          <select className="saisie mono" value={f.asa || ''} onChange={e => maj('asa')(e.target.value)}>
            <option value="">—</option>{[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>ASA {n}</option>)}
          </select>
        </label>
        <label className="champ"><span>Anesthésiste</span><input className="saisie" value={f.anesthesiste || ''} onChange={e => maj('anesthesiste')(e.target.value)} placeholder="Dr …" /></label>
        <label className="champ"><span>Anesthésie</span>
          <select className="saisie" value={f.anesthesie || ''} onChange={e => maj('anesthesie')(e.target.value)}>{ANESTHESIES.map(a => <option key={a}>{a}</option>)}</select>
        </label>
        <label className="champ"><span>Séjour</span>
          <select className="saisie" value={f.sejour || ''} onChange={e => maj('sejour')(e.target.value)}>{SEJOURS.map(s => <option key={s}>{s}</option>)}</select>
        </label>
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        {[['consentement_signe', "Consentement éclairé à l'intervention signé"], ['consentement_anesthesie', "Consentement d'anesthésie signé"], ['jeun_verifie', 'Jeûne vérifié le jour J']].map(([k, l]) => (
          <label key={k} className="ligne-check" style={{ justifyContent: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!f[k]} onChange={e => maj(k)(e.target.checked)} /><span style={{ fontSize: 14.5 }}>{l}</span>
          </label>
        ))}
      </div>
      <ZoneTexte label="Consignes avant l'opération (dans le livret du patient)" rows={3} valeur={f.consignes_preop} onChange={maj('consignes_preop')} />
      <div className="rangee-btn">
        <button type="button" className="btn" onClick={() => enregistrer(champs(), 'Préparation pré-opératoire enregistrée')}>Enregistrer</button>
        {op.statut === 'prévue' && <button type="button" className="btn btn-plein" disabled={!pret} title={pret ? '' : 'Consentements et jeûne à cocher'}
          onClick={() => enregistrer({ ...champs(), statut: 'prête' }, 'Patient prêt pour le bloc')}>Patient prêt pour le bloc</button>}
      </div>
    </div>
  )
}

export default function FicheOperation() {
  const { id } = useParams()
  const { profil } = useAuth()
  const { patients, choisir, chargement } = usePatients()
  const sites = useSites()
  const bloc = useBloc()
  const [op, setOp] = useState(null)
  const [erreur, setErreur] = useState('')
  const [onglet, setOnglet] = useState('Préparation')
  const [msg, setMsg] = useState({})

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('operations').select('*').eq('id', id).maybeSingle()
    if (error) setErreur(messageErreur(error))
    else if (!data) setErreur("Opération introuvable ou hors de vos services.")
    setOp(data || null)
  }, [id])
  useEffect(() => { charger() }, [charger])

  const patient = op && patients.find(p => p.id === op.patient_id)
  const qui = profil.medecin ? nomMedecin(profil.medecin) : nomComplet(profil.infirmier)

  const enregistrer = async (champs, action) => {
    const { data, error } = await supabase.from('operations').update({ ...champs, updated_at: new Date().toISOString() }).eq('id', op.id).select().single()
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    setOp(data); setMsg({ succes: `${action}.` })
    journaliser(profil, `${action} — ${op.intervention}`, { patient_id: op.patient_id, service_id: op.service_id })
  }

  if (erreur) return <><EnTeteOutil titre="Opération" /><Vide>{erreur}</Vide><Link to="/medecin/bloc" className="btn-lien bleu">← BLOC DU JOUR</Link></>
  if (op && !patient && !chargement) return <><EnTeteOutil titre="Opération" /><Vide>Le patient de cette opération n'est pas dans vos services.</Vide></>
  if (!op || !patient) return <><EnTeteOutil titre="Opération" /><Chargement /></>

  const site = sites.parId(op.site_id), salle = bloc.salle(op.salle_id), chirurgien = bloc.chirurgien(op.chirurgien_id)
  const donnees = { op, patient, site, salle, chirurgien, mineur: estMineur(patient.date_naissance, op.debut) }
  const imprimerCr = f => imprimer({
    titre: `Compte-rendu opératoire — ${patient.nomComplet}`,
    corps: enteteHtml({ titre: 'Compte-rendu opératoire', date: date(op.debut), medecin: chirurgien, service: patient.service, patient: patient.nomComplet, site })
      + `<p class="pat"><span>INTERVENTION</span>${esc(op.intervention)}${op.cote && op.cote !== 'Sans objet' ? ` · côté ${esc(op.cote.toLowerCase())}` : ''} · ${esc(op.anesthesie || '')}</p>`
      + CHAMPS_CR.filter(([k]) => f[k]).map(([k, l]) => `<div class="k">${esc(l)}</div><div class="v">${esc(f[k])}</div>`).join('')
      + piedHtml(`Signé ${op.compte_rendu_signe_le ? `le ${dateHeure(op.compte_rendu_signe_le)}` : '— non signé'}`, `Hôpital M&M · ${aujourdhui()}`),
  })

  return (
    <>
      <EnTeteOutil titre={op.intervention} />
      <article className="carte" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'flex-start', borderLeft: '4px solid var(--bleu)' }}>
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <Link to="/medecin/dossier" onClick={() => choisir(patient.id)} style={{ fontSize: 20, fontWeight: 700, color: 'var(--encre)' }}>{patient.nomComplet}</Link>
          <div className="mono" style={{ fontSize: 12, color: 'var(--gris)' }}>
            {dateHeure(op.debut).toUpperCase()} – {heure(op.fin)} · {(site?.nom || '').toUpperCase()} · {(salle?.nom || '').toUpperCase()}
          </div>
          <div style={{ fontSize: 14.5, color: 'var(--texte)' }}>
            {op.cote && op.cote !== 'Sans objet' ? <strong style={{ color: 'var(--encre)' }}>Côté {op.cote.toLowerCase()} · </strong> : null}
            {op.anesthesie} · {op.sejour} · {chirurgien}{op.anesthesiste ? ` · anesthésie ${op.anesthesiste}` : ''}
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--gris)' }}>CHECK-LIST {avancementChecklist(op.checklist)} · {['avant_induction', 'avant_incision', 'apres_intervention'].map(t => tempsComplet(op.checklist, t) ? '●' : '○').join(' ')}</div>
        </div>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
          <BadgeOp statut={op.statut} />
          {patient.allergies && <span className="badge urgence">Allergie : {patient.allergies}</span>}
          <select className="saisie petite" style={{ width: 'auto' }} value={op.statut} aria-label="Statut"
            onChange={e => (e.target.value !== 'annulée' || window.confirm("Annuler l'opération ? La salle sera libérée.")) && enregistrer({ statut: e.target.value }, `Statut : ${STATUTS.find(s => s[0] === e.target.value)[1]}`)}>
            {STATUTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </article>

      <div className="rangee-btn">
        <button type="button" className="btn" onClick={() => imprimerLivret(donnees)}>Livret « Mon opération »</button>
        <ChoixDossierOp key={op.id + op.sejour + op.anesthesie} donnees={donnees} />
        <Link to="/medecin/bloc" className="btn-lien bleu" style={{ alignSelf: 'center' }}>← BLOC DU JOUR</Link>
      </div>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>

      <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ONGLETS.map(o => <button key={o} type="button" role="tab" aria-selected={o === onglet} className={'btn-puce' + (o === onglet ? ' actif' : '')} onClick={() => { setOnglet(o); setMsg({}) }}>{o}</button>)}
      </div>
      <div role="tabpanel">
        {onglet === 'Préparation' && <Preparation op={op} enregistrer={enregistrer} />}
        {onglet === 'Check-list' && <Checklist op={op} qui={qui} enregistrer={enregistrer} />}
        {onglet === 'Au bloc' && <Horaires op={op} enregistrer={enregistrer} />}
        {onglet === 'Compte-rendu' && <CompteRenduOp op={op} enregistrer={enregistrer} imprimerCr={imprimerCr} />}
        {onglet === 'Réveil' && <Reveil op={op} enregistrer={enregistrer} />}
      </div>
    </>
  )
}
