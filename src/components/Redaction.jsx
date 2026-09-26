import { useCallback, useEffect, useState } from 'react'
import { Logo } from './Logo.jsx'
import { EnTeteOutil, Message, SelecteurPatient, Vide } from './ui.jsx'
import { useAuth } from '../lib/auth.jsx'
import { usePatients } from '../lib/patients.jsx'
import { supabase, journaliser, messageErreur } from '../lib/supabase.js'
import { aujourdhui, date, dateHeure, esc, nomMedecin } from '../lib/format.js'
import { enteteHtml, envoyerParEmail, imprimer, piedHtml, telechargerPdf } from '../lib/impression.js'

/**
 * Gabarit des outils de rédaction (Compte-rendu, Éditeur libre) :
 * un titre + un texte, enregistrés dans comptes_rendus (1re ligne = titre).
 */
export default function Redaction({ outil, intro, titreDefaut, modeles, placeholder }) {
  const { profil } = useAuth()
  const { patient } = usePatients()
  const [titre, setTitre] = useState(titreDefaut)
  const [texte, setTexte] = useState('')
  const [liste, setListe] = useState([])
  const [msg, setMsg] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const medecin = nomMedecin(profil?.medecin)

  const charger = useCallback(async () => {
    if (!patient) { setListe([]); return }
    const { data } = await supabase.from('comptes_rendus').select('*').eq('patient_id', patient.id).is('champs', null).order('created_at', { ascending: false })
    setListe(data || [])
  }, [patient])
  useEffect(() => { charger(); setMsg({}) }, [charger])

  const ouvrir = c => {
    const [t, ...reste] = (c.contenu || '').split('\n')
    setTitre(t); setTexte(reste.join('\n').replace(/^\n/, ''))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const enregistrer = async () => {
    if (!patient || !texte.trim()) { setMsg({ alerte: 'Rédigez le document avant de l\'enregistrer.' }); return }
    setEnvoi(true)
    const { error } = await supabase.from('comptes_rendus').insert({
      patient_id: patient.id, service_id: patient.service_id, medecin_id: profil.userId,
      hospitalisation_id: patient.sejour?.id || null, contenu: `${titre.trim() || titreDefaut}\n\n${texte}`,
    })
    setEnvoi(false)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    journaliser(profil, `${outil} : ${titre}`, { patient_id: patient.id, service_id: patient.service_id })
    setMsg({ succes: 'Document enregistré dans le dossier patient.' })
    charger()
  }

  const envoyer = (t, corpsTexte, le = aujourdhui()) => envoyerParEmail({
    destinataire: patient?.email || '', sujet: `${t} — ${patient?.nomComplet} — Hôpital M&M`,
    texte: `${t.toUpperCase()}\n${le} · ${medecin} · ${patient?.service || ''}\nPatient : ${patient?.nomComplet}\n\n${corpsTexte}`,
  })

  const corps = () => enteteHtml({ titre, date: aujourdhui(), medecin, service: patient?.service, patient: patient?.nomComplet })
    + `<div class="v">${esc(texte)}</div><p style="margin-top:28px">${esc(medecin)}</p>` + piedHtml(`${titre} — Hôpital M&M`, `Édité le ${aujourdhui()}`)

  return (
    <>
      <EnTeteOutil titre={outil}>{intro}</EnTeteOutil>
      <SelecteurPatient>
        {modeles && (
          <label className="champ" style={{ flex: '0 1 240px' }}>
            <span>Modèle</span>
            <select className="saisie" value="" onChange={e => { const m = modeles.find(x => x.titre === e.target.value); if (m) { setTitre(m.titre); setTexte(m.texte(patient, medecin)) } }}>
              <option value="">Choisir un modèle…</option>
              {modeles.map(m => <option key={m.titre}>{m.titre}</option>)}
            </select>
          </label>
        )}
      </SelecteurPatient>

      <div className="rangee-btn">
        <button type="button" className="btn btn-plein" onClick={enregistrer} disabled={!patient || envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer dans le dossier'}</button>
        <button type="button" className="btn" onClick={() => imprimer({ titre, corps: corps() })} disabled={!patient}>Imprimer</button>
        <button type="button" className="btn" onClick={() => envoyer(titre, texte)} disabled={!patient}>Envoyer par email</button>
        <button type="button" className="btn" onClick={() => telechargerPdf({ nomFichier: `${titre.toLowerCase().replace(/\W+/g, '-')}.pdf`, corps: corps() })} disabled={!patient}>Télécharger en PDF</button>
      </div>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>

      <article className="document">
        <header>
          <div style={{ display: 'grid', gap: 10, flex: '1 1 260px' }}>
            <div style={{ width: 190, maxWidth: '100%' }}><Logo /></div>
            <input className="saisie" value={titre} onChange={e => setTitre(e.target.value)} aria-label="Titre du document"
              style={{ fontSize: 19, fontWeight: 700, border: 'none', borderBottom: '1px dashed var(--filet-fort)', padding: '2px 0', background: 'transparent' }} />
          </div>
          <div className="meta">
            <span>{aujourdhui()}</span><span>{medecin}</span>
            <span style={{ color: 'var(--bleu)' }}>{(patient?.service || '').toUpperCase()}</span>
          </div>
        </header>
        <div style={{ fontSize: 16, color: 'var(--encre)' }}>
          <span className="mono" style={{ fontSize: 11.5, letterSpacing: '0.1em', color: 'var(--gris)', marginRight: 8 }}>PATIENT</span>
          <strong style={{ fontWeight: 600 }}>{patient?.nomComplet || '—'}</strong>
        </div>
        <textarea className="saisie" rows={16} value={texte} onChange={e => setTexte(e.target.value)} placeholder={placeholder} aria-label="Contenu du document" />
        <footer><span>{titre} — Hôpital M&amp;M</span><span style={{ whiteSpace: 'nowrap' }}>Édité le {aujourdhui()}</span></footer>
      </article>

      <div className="carte-blanche">
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--encre)', marginBottom: 10 }}>Documents enregistrés</div>
        {!liste.length ? <Vide>Aucun document enregistré pour ce patient.</Vide> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {liste.map(c => (
              <div key={c.id} className="ligne-liste">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--encre)' }}>{(c.contenu || '').split('\n')[0]}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--gris)' }}>{dateHeure(c.created_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                  <button type="button" className="btn-lien bleu" onClick={() => { const [t, ...r] = (c.contenu || '').split('\n'); envoyer(t, r.join('\n').trim(), date(c.created_at)) }}>ENVOYER PAR EMAIL</button>
                  <button type="button" className="btn-lien bleu" onClick={() => ouvrir(c)}>OUVRIR</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
