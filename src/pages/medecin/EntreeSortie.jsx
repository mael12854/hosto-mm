import { useCallback, useEffect, useState } from 'react'
import { Logo } from '../../components/Logo.jsx'
import { EnTeteOutil, Message, SelecteurPatient, Saisie, ZoneTexte, Vide } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase, journaliser, messageErreur } from '../../lib/supabase.js'
import { aujourdhui, date, dateHeure, esc, nomMedecin, versIso } from '../../lib/format.js'
import { enteteHtml, envoyerParEmail, imprimer, piedHtml, telechargerPdf } from '../../lib/impression.js'

const VIDE = {
  date_entree: '', date_sortie: '', mode_sortie: '',
  motif_admission: '', antecedents_allergies: '', traitement_ville: '',
  evolution_clinique: '', examens_actes: '',
  traitement_sortie: '', rdv_suivi: '', consignes_post: '',
}

const SECTIONS = [
  ['Historique & Situation à l\'admission', [
    ['motif_admission', "Motif d'hospitalisation & Histoire de la maladie", 'Symptômes initiaux, contexte d\'admission...', 3],
    ['antecedents_allergies', 'Antécédents médicaux, chirurgicaux & Allergies', 'Pathologies chroniques, chirurgies passées, allergies connues...', 3],
    ['traitement_ville', 'Traitement de ville (habituel avant hospitalisation)', 'Traitements personnels pris au domicile...', 2],
  ]],
  ['Synthèse du séjour & Examens', [
    ['evolution_clinique', 'Évolution clinique & Synthèse des soins', 'Résumé du déroulé du séjour, réponse aux traitements...', 3],
    ['examens_actes', 'Examens complémentaires & Actes réalisés', 'Bilan biologique, imagerie, interventions...', 2],
  ]],
  ['Modalités de sortie & Suivi post-hospitalisation', [
    ['traitement_sortie', 'Traitement médical de sortie (modifications & prescriptions)', 'Ordonnance/Traitement à poursuivre à la maison...', 2],
    ['rdv_suivi', 'Rendez-vous & Suivi médical', 'RDV de contrôle, consultations prévues...', 2],
    ['consignes_post', 'Consignes & Soins à domicile', 'Soins infirmiers, rééducation, consignes d\'urgence...', 2],
  ]],
]

const depuisBase = d => ({ ...VIDE, ...Object.fromEntries(Object.keys(VIDE).map(k => [k, d[k] ?? ''])), date_entree: date(d.date_entree), date_sortie: date(d.date_sortie) })

export default function EntreeSortie() {
  const { profil } = useAuth()
  const { patient } = usePatients()
  const [f, setF] = useState(VIDE)
  const [docs, setDocs] = useState([])
  const [msg, setMsg] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const medecin = nomMedecin(profil?.medecin)
  const maj = k => v => setF(x => ({ ...x, [k]: v }))

  const charger = useCallback(async () => {
    if (!patient) { setDocs([]); return }
    const { data } = await supabase.from('documents_officiels').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false })
    setDocs(data || [])
  }, [patient])

  useEffect(() => {
    charger()
    setMsg({})
    setF(patient ? { ...VIDE, date_entree: date(patient.sejour?.date_entree), antecedents_allergies: [patient.antecedents, patient.allergies && 'Allergies : ' + patient.allergies].filter(Boolean).join('\n') } : VIDE)
  }, [patient, charger])

  const enregistrer = async () => {
    if (!patient) return
    for (const k of ['date_entree', 'date_sortie']) {
      if (f[k] && !versIso(f[k])) { setMsg({ alerte: 'Date invalide : utilisez le format jj/mm/aaaa.' }); return }
    }
    setEnvoi(true)
    const { error } = await supabase.from('documents_officiels').insert({
      ...f,
      date_entree: versIso(f.date_entree), date_sortie: versIso(f.date_sortie),
      patient_id: patient.id, service_id: patient.service_id,
      hospitalisation_id: patient.sejour?.id || null, medecin_id: profil.userId,
    })
    setEnvoi(false)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser(profil, 'Bulletin Entrée / Sortie enregistré', { patient_id: patient.id, service_id: patient.service_id })
    setMsg({ succes: 'Bulletin enregistré dans le dossier patient.' })
    charger()
  }

  const corpsHtml = () => {
    const bloc = (k, l) => `<div class="k">${esc(l)}</div><div class="v">${esc(f[k])}</div>`
    return enteteHtml({ titre: 'Bulletin & Synthèse Entrée / Sortie', date: aujourdhui(), medecin, service: patient?.service, patient: patient?.nomComplet })
      + `<h3><b>1.</b>Dates &amp; Modalités du séjour</h3>${bloc('date_entree', "Date d'entrée (admission)")}${bloc('date_sortie', 'Date de sortie effective / prévue')}${bloc('mode_sortie', 'Mode de sortie')}`
      + SECTIONS.map(([titre, champs], i) => `<h3><b>${i + 2}.</b>${esc(titre)}</h3>${champs.map(([k, l]) => bloc(k, l)).join('')}`).join('')
      + piedHtml('Document Officiel Entrée/Sortie — Hôpital M&M', `Édité le ${aujourdhui()}`)
  }

  // Texte de l'e-mail : seules les rubriques renseignées sont reprises.
  const texteBrut = (d = f) => [
    'BULLETIN & SYNTHÈSE ENTRÉE / SORTIE — Hôpital M&M',
    `${aujourdhui()} · ${medecin} · ${patient?.service || ''}`, `Patient : ${patient?.nomComplet || ''}`, '',
    `Date d'entrée : ${d.date_entree || '—'}`, `Date de sortie : ${d.date_sortie || '—'}`, `Mode de sortie : ${d.mode_sortie || '—'}`,
    ...SECTIONS.flatMap(([t, champs], i) => ['', `${i + 2}. ${t.toUpperCase()}`, ...champs.filter(([k]) => d[k]).map(([k, l]) => `${l} :\n${d[k]}`)]),
  ].join('\n')

  const envoyer = (d = f) => envoyerParEmail({ destinataire: patient?.email || '', sujet: `Bulletin Entrée / Sortie — ${patient?.nomComplet} — Hôpital M&M`, texte: texteBrut(d) })

  const titrePdf = `entree-sortie-${(patient?.nomComplet || 'patient').replace(/\s+/g, '-').toLowerCase()}.pdf`

  return (
    <>
      <EnTeteOutil titre="Entrée / Sortie">
        Renseignez les détails d'admission, l'historique, le déroulé du séjour et les modalités de sortie puis enregistrez dans le dossier patient Supabase.
      </EnTeteOutil>

      <SelecteurPatient>
        <button type="button" className="btn" disabled={!docs.length} onClick={() => { setF(depuisBase(docs[0])); setMsg({ succes: 'Dernier document repris : modifiez puis enregistrez une nouvelle version.' }) }}>
          Reprendre le dernier document
        </button>
      </SelecteurPatient>

      <div className="rangee-btn">
        <button type="button" className="btn btn-plein" onClick={enregistrer} disabled={!patient || envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer dans le dossier'}</button>
        <button type="button" className="btn" onClick={() => imprimer({ titre: 'Bulletin Entrée / Sortie', corps: corpsHtml() })} disabled={!patient}>Imprimer</button>
        <button type="button" className="btn" onClick={() => envoyer()} disabled={!patient}>Envoyer par email</button>
        <button type="button" className="btn" onClick={() => telechargerPdf({ nomFichier: titrePdf, corps: corpsHtml() })} disabled={!patient}>Télécharger en PDF</button>
      </div>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>

      <article className="document">
        <header>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ width: 190, maxWidth: '100%' }}><Logo /></div>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--encre)' }}>Bulletin &amp; Synthèse Entrée / Sortie</div>
          </div>
          <div className="meta">
            <span>{aujourdhui()}</span>
            <span>{medecin}</span>
            <span style={{ color: 'var(--bleu)' }}>{(patient?.service || '').toUpperCase()}</span>
          </div>
        </header>
        <div style={{ fontSize: 16, color: 'var(--encre)' }}>
          <span className="mono" style={{ fontSize: 11.5, letterSpacing: '0.1em', color: 'var(--gris)', marginRight: 8 }}>PATIENT</span>
          <strong style={{ fontWeight: 600 }}>{patient?.nomComplet || '—'}</strong>
        </div>

        <div className="section-doc">
          <h5><span className="num">1.</span>Dates &amp; Modalités du séjour</h5>
          <div className="grille-champs">
            <Saisie label="Date d'entrée (admission)" mono placeholder="jj/mm/aaaa" valeur={f.date_entree} onChange={maj('date_entree')} inputMode="numeric" />
            <Saisie label="Date de sortie effective / prévue" mono placeholder="jj/mm/aaaa" valeur={f.date_sortie} onChange={maj('date_sortie')} inputMode="numeric" />
            <Saisie label="Mode de sortie" placeholder="ex: Domicile, Transfert, RAD..." valeur={f.mode_sortie} onChange={maj('mode_sortie')} />
          </div>
        </div>

        {SECTIONS.map(([titre, champs], i) => (
          <div className="section-doc" key={titre}>
            <h5><span className="num">{i + 2}.</span>{titre}</h5>
            {champs.map(([k, l, ph, rows]) => <ZoneTexte key={k} label={l} placeholder={ph} rows={rows} valeur={f[k]} onChange={maj(k)} />)}
          </div>
        ))}

        <footer>
          <span style={{ minWidth: 0 }}>Document Officiel Entrée/Sortie — Hôpital M&amp;M</span>
          <span style={{ whiteSpace: 'nowrap' }}>Édité le {aujourdhui()}</span>
        </footer>
      </article>

      <div className="carte-blanche">
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--encre)', marginBottom: 10 }}>Documents d'entrée/sortie enregistrés</div>
        {docs.length === 0 ? (
          <Vide>Aucun document officiel d'entrée/sortie enregistré pour ce patient.</Vide>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {docs.map(d => (
              <div key={d.id} className="ligne-liste">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, color: 'var(--encre)', fontWeight: 600 }}>Bulletin du {dateHeure(d.created_at)}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--gris)' }}>ENTRÉE {date(d.date_entree) || '—'} · SORTIE {date(d.date_sortie) || '—'} · {(d.mode_sortie || '').toUpperCase()}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                  <button type="button" className="btn-lien bleu" onClick={() => envoyer(depuisBase(d))}>ENVOYER PAR EMAIL</button>
                  <button type="button" className="btn-lien bleu" onClick={() => { setF(depuisBase(d)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>OUVRIR</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
