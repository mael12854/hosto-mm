import { useCallback, useEffect, useState } from 'react'
import { Logo } from '../../components/Logo.jsx'
import { Champ, ChampDate, EnTeteOutil, Message, Saisie, SelecteurPatient, Vide, ZoneTexte } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase, journaliser, messageErreur } from '../../lib/supabase.js'
import { aujourdhui, dateHeure, esc, nombre, nomMedecin, valeurDateHeure } from '../../lib/format.js'
import { enteteHtml, envoyerParEmail, imprimer, piedHtml, telechargerPdf } from '../../lib/impression.js'

const TITRES = {
  'Consultation': 'Compte-rendu de consultation',
  "Consultation d'urgence": "Compte-rendu de consultation d'urgence",
  'Contrôle / suivi': 'Compte-rendu de contrôle',
  'Visite en hospitalisation': 'Compte-rendu de visite en hospitalisation',
}
const titreDe = type => TITRES[type] || 'Compte-rendu'

const VIDE = {
  date_consultation: '', type: 'Consultation', adresse_par: '',
  motif: '', histoire: '', antecedents: '', traitement_cours: '',
  temperature: '', pouls: '', tension: '', saturation: '', poids: '', examen: '',
  diagnostic: '', examens_demandes: '', traitement: '',
  conduite: '', prochain_rdv: '',
}

// Rubriques numérotées : [titre, [[clé, libellé, aide, lignes]]]. La 2 a aussi les constantes, la 4 le prochain rendez-vous.
const SECTIONS = [
  ['Motif & histoire de la maladie', [
    ['motif', 'Motif de consultation', 'Douleur, fièvre, contrôle de plâtre…', 1],
    ['histoire', 'Histoire de la maladie', 'Début des symptômes, évolution, contexte…', 3],
    ['antecedents', 'Antécédents & allergies', 'Pathologies, chirurgies, allergies connues…', 2],
    ['traitement_cours', 'Traitement en cours', 'Médicaments pris actuellement…', 2],
  ]],
  ['Examen clinique', [
    ['examen', 'Examen physique', 'Inspection, palpation, auscultation…', 3],
  ]],
  ['Conclusion', [
    ['diagnostic', 'Diagnostic retenu / hypothèses', 'Diagnostic principal, diagnostics différentiels…', 2],
    ['examens_demandes', 'Examens complémentaires demandés', 'Bilan biologique, radiographie, échographie…', 2],
    ['traitement', 'Traitement prescrit', 'Médicaments, posologie, durée…', 2],
  ]],
  ['Conduite à tenir & suivi', [
    ['conduite', 'Consignes données au patient', 'Repos, surveillance, signes qui doivent faire revenir…', 3],
  ]],
]
const CONSTANTES = [['temperature', 'T° (°C)'], ['pouls', 'FC (/min)'], ['tension', 'TA'], ['saturation', 'SpO₂ (%)'], ['poids', 'Poids (kg)']]
const OBLIGATOIRES = ['motif', 'diagnostic']
const libelle = (k, l) => (OBLIGATOIRES.includes(k) ? `${l} — obligatoire` : l)
const ligneConstantes = d => CONSTANTES.filter(([k]) => d[k]).map(([k, l]) => `${l} ${d[k]}`).join(' · ')

export default function CompteRendu() {
  const { profil } = useAuth()
  const { patient } = usePatients()
  const [f, setF] = useState(VIDE)
  const [docs, setDocs] = useState([])
  const [msg, setMsg] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const medecin = nomMedecin(profil?.medecin)
  const maj = k => v => setF(x => ({ ...x, [k]: v }))
  const titre = titreDe(f.type)

  const charger = useCallback(async () => {
    if (!patient) { setDocs([]); return }
    const { data } = await supabase.from('comptes_rendus').select('*').eq('patient_id', patient.id).not('champs', 'is', null).order('created_at', { ascending: false })
    setDocs(data || [])
  }, [patient])

  // Nouveau compte-rendu : maintenant, antécédents du dossier et dernières constantes relevées.
  const nouveau = useCallback(async () => {
    if (!patient) { setF(VIDE); return }
    const base = {
      ...VIDE, date_consultation: valeurDateHeure(),
      type: patient.sejour && !patient.sejour.date_sortie ? 'Visite en hospitalisation' : 'Consultation',
      motif: patient.sejour?.motif || '',
      antecedents: [patient.antecedents, patient.allergies && 'Allergies : ' + patient.allergies].filter(Boolean).join('\n'),
    }
    const { data } = await supabase.from('constantes_vitales').select('*').eq('patient_id', patient.id).order('date_mesure', { ascending: false }).limit(1)
    const c = data?.[0]
    if (c) Object.assign(base, {
      temperature: c.temperature != null ? nombre(c.temperature) : '', pouls: c.pouls ?? '', saturation: c.saturation ?? '',
      poids: c.poids != null ? nombre(c.poids) : '', tension: c.tension_systolique ? `${c.tension_systolique}/${c.tension_diastolique ?? ''}` : '',
    })
    setF(base)
  }, [patient])

  useEffect(() => { charger(); nouveau(); setMsg({}) }, [charger, nouveau])

  const texteBrut = (d = f) => {
    const lignes = [
      titreDe(d.type).toUpperCase(),
      '--------------------------------------------------',
      `Date : ${dateHeure(d.date_consultation)}`, `Type : ${d.type}`,
    ]
    if (d.adresse_par) lignes.push(`Adressé par : ${d.adresse_par}`)
    SECTIONS.forEach(([t, champs], i) => {
      lignes.push('', `${i + 1}. ${t.toUpperCase()}`)
      if (i === 1 && ligneConstantes(d)) lignes.push(`Constantes : ${ligneConstantes(d)}`)
      champs.filter(([k]) => d[k]).forEach(([k, l]) => lignes.push(`${l} :`, d[k]))
      if (i === 3 && d.prochain_rdv) lignes.push(`Prochain rendez-vous : ${dateHeure(d.prochain_rdv)}`)
    })
    return lignes.join('\n')
  }

  const enregistrer = async () => {
    if (!patient) return
    if (OBLIGATOIRES.some(k => !f[k].trim())) { setMsg({ alerte: 'Renseignez au minimum le motif de consultation et le diagnostic.' }); return }
    const rdv = f.prochain_rdv ? new Date(f.prochain_rdv) : null
    if (rdv && rdv < new Date()) { setMsg({ alerte: 'Le prochain rendez-vous doit être dans le futur.' }); return }
    setEnvoi(true)
    const { error } = await supabase.from('comptes_rendus').insert({
      patient_id: patient.id, service_id: patient.service_id, medecin_id: profil.userId,
      hospitalisation_id: patient.sejour?.id || null, contenu: texteBrut(), champs: f,
    })
    if (error) { setEnvoi(false); setMsg({ alerte: messageErreur(error) }); return }
    let suite = ''
    if (rdv) {
      const r = await supabase.from('rendez_vous').insert({
        patient_id: patient.id, service_id: patient.service_id, medecin_id: profil.userId,
        date_heure: rdv.toISOString(), motif: `Contrôle — ${f.motif}`.slice(0, 200), statut: 'prévu',
      })
      suite = r.error ? ` Le rendez-vous n'a pas pu être programmé : ${messageErreur(r.error)}` : ` Rendez-vous de contrôle programmé le ${dateHeure(rdv)}.`
    }
    setEnvoi(false)
    journaliser(profil, `${titre} enregistré`, { patient_id: patient.id, service_id: patient.service_id })
    setMsg({ succes: 'Compte-rendu enregistré dans le dossier patient.' + suite })
    charger()
  }

  const corpsHtml = () => {
    const bloc = (l, v) => (v ? `<div class="k">${esc(l)}</div><div class="v">${esc(v)}</div>` : '')
    const sections = SECTIONS.map(([t, champs], i) => `<h3><b>${i + 1}.</b>${esc(t)}</h3>`
      + (i === 1 ? bloc('Constantes', ligneConstantes(f)) : '')
      + champs.map(([k, l]) => bloc(l, f[k])).join('')
      + (i === 3 ? bloc('Prochain rendez-vous', f.prochain_rdv && dateHeure(f.prochain_rdv)) : '')).join('')
    return enteteHtml({ titre, date: dateHeure(f.date_consultation), medecin, service: patient?.service, patient: patient?.nomComplet })
      + `<p class="pat"><span>TYPE</span>${esc(f.type)}${f.adresse_par ? ` · adressé par ${esc(f.adresse_par)}` : ''}</p>`
      + sections + `<p style="margin-top:24px">${esc(medecin)}</p>` + piedHtml(`${titre} — Hôpital M&M`, `Édité le ${aujourdhui()}`)
  }

  const envoyer = (d = f) => envoyerParEmail({ destinataire: patient?.email || '', sujet: `${titreDe(d.type)} — ${patient?.nomComplet} — Hôpital M&M`, texte: texteBrut(d) })
  const ouvrir = d => { setF({ ...VIDE, ...d.champs }); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <>
      <EnTeteOutil titre="Compte-rendu">
        Renseignez le motif, l'examen clinique, la conclusion et la conduite à tenir, puis enregistrez dans le dossier patient. Un prochain rendez-vous saisi ici est programmé automatiquement.
      </EnTeteOutil>

      <SelecteurPatient>
        <div className="rangee-btn">
          <button type="button" className="btn" onClick={() => { nouveau(); setMsg({}) }}>Nouveau compte-rendu</button>
          <button type="button" className="btn" disabled={!docs.length} onClick={() => { ouvrir(docs[0]); setMsg({ succes: 'Dernier compte-rendu repris : modifiez puis enregistrez une nouvelle version.' }) }}>Reprendre le dernier document</button>
        </div>
      </SelecteurPatient>

      <div className="rangee-btn">
        <button type="button" className="btn btn-plein" onClick={enregistrer} disabled={!patient || envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer dans le dossier'}</button>
        <button type="button" className="btn" onClick={() => imprimer({ titre, corps: corpsHtml() })} disabled={!patient}>Imprimer</button>
        <button type="button" className="btn" onClick={() => envoyer()} disabled={!patient}>Envoyer par email</button>
        <button type="button" className="btn" onClick={() => telechargerPdf({ nomFichier: `compte-rendu-${(patient?.nomComplet || 'patient').replace(/\s+/g, '-').toLowerCase()}.pdf`, corps: corpsHtml() })} disabled={!patient}>Télécharger en PDF</button>
      </div>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>

      <article className="document">
        <header>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ width: 190, maxWidth: '100%' }}><Logo /></div>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--encre)' }}>{titre}</div>
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

        <div className="grille-champs">
          <ChampDate type="datetime-local" label="Date et heure de consultation" valeur={f.date_consultation} onChange={maj('date_consultation')} />
          <Champ label="Type de consultation">
            <select className="saisie" value={f.type} onChange={e => maj('type')(e.target.value)}>
              {Object.keys(TITRES).map(t => <option key={t}>{t}</option>)}
            </select>
          </Champ>
          <Saisie label="Adressé par" placeholder="Venu seul, adressé par papa…" valeur={f.adresse_par} onChange={maj('adresse_par')} />
        </div>

        {SECTIONS.map(([t, champs], i) => (
          <div className="section-doc" key={t}>
            <h5><span className="num">{i + 1}.</span>{t}</h5>
            {i === 1 && (
              <div className="grille-champs" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                {CONSTANTES.map(([k, l]) => <Saisie key={k} label={l} mono inputMode={k === 'tension' ? 'text' : 'decimal'} placeholder={k === 'tension' ? '12/8' : ''} valeur={f[k]} onChange={maj(k)} />)}
              </div>
            )}
            {champs.map(([k, l, aide, lignes]) => lignes === 1
              ? <Saisie key={k} label={libelle(k, l)} obligatoire={OBLIGATOIRES.includes(k)} placeholder={aide} valeur={f[k]} onChange={maj(k)} />
              : <ZoneTexte key={k} label={libelle(k, l)} obligatoire={OBLIGATOIRES.includes(k)} placeholder={aide} rows={lignes} valeur={f[k]} onChange={maj(k)} />)}
            {i === 3 && (
              <div className="grille-champs">
                <ChampDate type="datetime-local" label="Prochain rendez-vous (facultatif)" valeur={f.prochain_rdv} onChange={maj('prochain_rdv')} min={valeurDateHeure()} />
              </div>
            )}
          </div>
        ))}

        <footer>
          <span style={{ minWidth: 0 }}>{titre} — Hôpital M&amp;M</span>
          <span style={{ whiteSpace: 'nowrap' }}>Édité le {aujourdhui()}</span>
        </footer>
      </article>

      <div className="carte-blanche">
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--encre)', marginBottom: 10 }}>Comptes-rendus enregistrés</div>
        {!docs.length ? <Vide>Aucun compte-rendu enregistré pour ce patient.</Vide> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {docs.map(d => (
              <div key={d.id} className="ligne-liste">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--encre)' }}>{titreDe(d.champs?.type)} — {d.champs?.motif}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--gris)' }}>{dateHeure(d.champs?.date_consultation || d.created_at)}{d.champs?.diagnostic ? ` · ${d.champs.diagnostic.split('\n')[0].slice(0, 60).toUpperCase()}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                  <button type="button" className="btn-lien bleu" onClick={() => envoyer({ ...VIDE, ...d.champs })}>ENVOYER PAR EMAIL</button>
                  <button type="button" className="btn-lien bleu" onClick={() => ouvrir(d)}>OUVRIR</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
