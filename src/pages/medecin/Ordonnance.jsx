import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Logo } from '../../components/Logo.jsx'
import { EnTeteOutil, Message, SelecteurPatient } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { MEDICAMENTS } from '../../lib/medicaments.js'
import { BUCKET_PJ, supabase, journaliser, messageErreur } from '../../lib/supabase.js'
import { aujourdhui, date, dateHeure, esc, nomMedecin, normaliser, pluriel, taille } from '../../lib/format.js'
import { enteteHtml, envoyerParEmail, imprimer, piedHtml } from '../../lib/impression.js'

const cle = r => r.join('|')
const CLASSES = ['Toutes', ...Array.from(new Set(MEDICAMENTS.map(r => r[2]))).sort((a, b) => a.localeCompare(b, 'fr'))]

export default function Ordonnance() {
  const { profil } = useAuth()
  const { patient } = usePatients()
  const [q, setQ] = useState('')
  const [classe, setClasse] = useState('Toutes')
  const [ord, setOrd] = useState([])
  const [poso, setPoso] = useState({})
  const [duree, setDuree] = useState({})
  const [pj, setPj] = useState([])
  const [dossier, setDossier] = useState([])
  const [historique, setHistorique] = useState([])
  const [msg, setMsg] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const pjRef = useRef(pj)
  pjRef.current = pj
  const medecin = nomMedecin(profil?.medecin)

  const filtres = useMemo(() => {
    const n = normaliser(q)
    return MEDICAMENTS.filter(r => (classe === 'Toutes' || r[2] === classe) && (!n || normaliser(r[0] + ' ' + r[1] + ' ' + r[3]).includes(n)))
  }, [q, classe])

  const charger = useCallback(async () => {
    if (!patient) { setDossier([]); setHistorique([]); return }
    const [doc, cr, pr] = await Promise.all([
      supabase.from('documents_officiels').select('id, created_at').eq('patient_id', patient.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('comptes_rendus').select('id, created_at, contenu').eq('patient_id', patient.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('prescriptions').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false }).limit(10),
    ])
    setDossier([
      ...(doc.data || []).map(d => ({ id: 'doc-' + d.id, nom: `Bulletin Entrée / Sortie du ${date(d.created_at)}` })),
      ...(cr.data || []).map(d => ({ id: 'cr-' + d.id, nom: `${(d.contenu || 'Compte-rendu').split('\n')[0].slice(0, 40)} du ${date(d.created_at)}` })),
    ])
    setHistorique(pr.data || [])
  }, [patient])

  useEffect(() => { charger() }, [charger])
  useEffect(() => () => pjRef.current.forEach(d => d.url && URL.revokeObjectURL(d.url)), [])

  const basculer = r => setOrd(o => (o.some(x => cle(x) === cle(r)) ? o.filter(x => cle(x) !== cle(r)) : [...o, r]))

  const ajouterFichiers = liste => {
    const arr = Array.from(liste || []).map(f => ({ id: Math.random().toString(36).slice(2), nom: f.name, taille: f.size, url: URL.createObjectURL(f), fichier: f, src: 'Fichier' }))
    if (arr.length) { setPj(x => [...x, ...arr]); setMsg({}) }
  }
  const retirerPj = d => { if (d.url) URL.revokeObjectURL(d.url); setPj(x => x.filter(y => y.id !== d.id)) }
  const basculerDossier = d => setPj(x => (x.some(y => y.id === d.id) ? x.filter(y => y.id !== d.id) : [...x, { id: d.id, nom: d.nom, src: 'Dossier' }]))

  const vider = () => { pj.forEach(d => d.url && URL.revokeObjectURL(d.url)); setOrd([]); setPoso({}); setDuree({}); setPj([]); setMsg({}) }

  const ligneTexte = r => {
    const k = cle(r)
    return `— ${r[0]} (${r[3]})${poso[k] ? ' : ' + poso[k] : ''}${duree[k] ? ' · pendant ' + duree[k] : ''}`
  }

  const enregistrer = async () => {
    if (!ord.length) { setMsg({ alerte: "Ajoutez au moins un médicament avant d'enregistrer." }); return }
    if (!patient) return
    setEnvoi(true)
    try {
      const pieces = []
      for (const d of pj) {
        if (d.src === 'Dossier') { pieces.push({ nom: d.nom, source: 'dossier' }); continue }
        const chemin = `${patient.id}/${Date.now()}-${d.nom.replace(/[^\w.-]+/g, '_')}`
        const { error } = await supabase.storage.from(BUCKET_PJ).upload(chemin, d.fichier)
        if (error) throw error
        pieces.push({ nom: d.nom, chemin, taille: d.taille, source: 'fichier' })
      }
      const contenu = ['Ordonnance', '', ...ord.map(ligneTexte), ...(pieces.length ? ['', 'Pièces jointes :', ...pieces.map(p => '• ' + p.nom)] : [])].join('\n')
      const { error } = await supabase.from('prescriptions').insert({
        patient_id: patient.id, service_id: patient.service_id, medecin_id: profil.userId,
        hospitalisation_id: patient.sejour?.id || null, contenu,
        lignes: ord.map(r => ({ nom: r[0], dci: r[1], classe: r[2], forme: r[3], posologie: poso[cle(r)] || '', duree: duree[cle(r)] || '' })),
        pieces_jointes: pieces,
      })
      if (error) throw error
      journaliser(profil, `Ordonnance rédigée (${pluriel(ord.length, 'médicament')})`, { patient_id: patient.id, service_id: patient.service_id })
      setMsg({ succes: `Ordonnance enregistrée : ${pluriel(ord.length, 'médicament')}, ${pluriel(pieces.length, 'document joint', 'documents joints')}.` })
      charger()
    } catch (e) {
      setMsg({ alerte: messageErreur(e) })
    }
    setEnvoi(false)
  }

  const imprimerOrd = () => {
    const lignes = ord.map(r => { const k = cle(r); return `<li><b>${esc(r[0])}</b> — ${esc(r[3])}<br><span>${esc(poso[k] || '')}${duree[k] ? ' · pendant ' + esc(duree[k]) : ''}</span></li>` }).join('')
    const pieces = pj.length ? `<h3>Pièces jointes</h3><ul class="pj">${pj.map(d => `<li>${esc(d.nom)}</li>`).join('')}</ul>` : ''
    imprimer({
      titre: 'Ordonnance', page: 'A5',
      corps: enteteHtml({ titre: 'Ordonnance', date: aujourdhui(), medecin, service: patient?.service, patient: patient?.nomComplet })
        + `<ol>${lignes}</ol>${pieces}` + piedHtml('Document officiel — Hôpital M&M', `${patient?.numero_dossier || ''}`),
    })
  }

  const envoyer = (texte, le = aujourdhui()) => envoyerParEmail({
    destinataire: patient?.email || '', sujet: `Ordonnance — ${patient?.nomComplet} — Hôpital M&M`,
    texte: `ORDONNANCE\n${le} · ${medecin} · ${patient?.service || ''}\nPatient : ${patient?.nomComplet}\n\n${texte}`,
  })

  const envoyerCourante = () => envoyer([...ord.map(ligneTexte), ...(pj.length ? ['', 'Pièces jointes :', ...pj.map(d => '• ' + d.nom)] : [])].join('\n'))

  const ouvrirPj = async p => {
    const { data, error } = await supabase.storage.from(BUCKET_PJ).createSignedUrl(p.chemin, 60)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  return (
    <>
      <EnTeteOutil titre="Ordonnance">
        Choisissez les médicaments dans le répertoire de l'hôpital, précisez posologie et durée, joignez les documents utiles (examens, compte-rendu, photo…), puis enregistrez ou imprimez l'ordonnance.
      </EnTeteOutil>
      <SelecteurPatient />

      <div className="cadre" style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 460px', minWidth: 0, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <label className="champ" style={{ flex: '1 1 260px' }}>
              <span>Rechercher</span>
              <input type="search" className="saisie" value={q} onChange={e => setQ(e.target.value)} placeholder="Doliprane, amoxicilline, sirop…" />
            </label>
            <div className="mono" style={{ fontSize: 12.5, color: 'var(--anthracite)', paddingBottom: 12, whiteSpace: 'nowrap' }}>{filtres.length} / {MEDICAMENTS.length} MÉDICAMENTS</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CLASSES.map(c => <button key={c} type="button" className={'btn-puce' + (c === classe ? ' actif' : '')} onClick={() => setClasse(c)}>{c}</button>)}
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--filet)', maxHeight: 560, overflowY: 'auto' }}>
            {filtres.map(r => {
              const on = ord.some(x => cle(x) === cle(r))
              return (
                <div key={cle(r)} style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: '1px solid #EAE6DC' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--encre)' }}>{r[0]}</span>
                      <span style={{ fontSize: 14, color: 'var(--texte)' }}>{r[3]}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 11.5, color: 'var(--gris)', marginTop: 2 }}>{r[1]} · {r[2]}</div>
                  </div>
                  <button type="button" onClick={() => basculer(r)} style={{ flex: 'none', fontSize: 13.5, fontWeight: 600, padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap', border: '1px solid var(--bleu)', background: on ? 'var(--bleu)' : '#fff', color: on ? 'var(--papier)' : 'var(--bleu)' }}>
                    {on ? '✓ Ajouté' : 'Ajouter'}
                  </button>
                </div>
              )
            })}
            {!filtres.length && <p style={{ fontSize: 14.5, color: 'var(--gris)', padding: '24px 16px', textAlign: 'center' }}>Aucun médicament trouvé. Essayez la molécule plutôt que la marque.</p>}
          </div>
        </div>

        <aside style={{ flex: '1 1 320px', minWidth: 0, display: 'grid', gap: 14, lineHeight: 1.3 }}>
          <article style={{ background: '#fff', border: '1px solid var(--filet-fort)', padding: 18, display: 'grid', gap: 12 }}>
            <header style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--bleu)', paddingBottom: 10 }}>
              <div style={{ display: 'grid', gap: 6 }}><div style={{ width: 150 }}><Logo /></div><span style={{ fontSize: 16, fontWeight: 700, color: 'var(--encre)' }}>Ordonnance</span></div>
              <div className="mono" style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--anthracite)', display: 'flex', flexDirection: 'column', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <span>{aujourdhui()}</span><span>{medecin}</span><span>Patient : {patient?.nomComplet || '—'}</span>
              </div>
            </header>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span className="etiquette">Prescription</span>
              <span className="etiquette" style={{ whiteSpace: 'nowrap' }}>{ord.length} LIGNE{ord.length > 1 ? 'S' : ''}</span>
            </div>
            {ord.map(r => {
              const k = cle(r)
              return (
                <div key={k} style={{ display: 'grid', gap: 8, borderBottom: '1px dotted var(--filet-fort)', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--encre)' }}>{r[0]}</div><div style={{ fontSize: 13, color: 'var(--texte)' }}>{r[3]}</div></div>
                    <button type="button" className="btn-lien" onClick={() => basculer(r)}>RETIRER</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 8 }}>
                    <input type="text" className="saisie petite" value={poso[k] || ''} onChange={e => setPoso(p => ({ ...p, [k]: e.target.value }))} placeholder="Posologie : 1 le soir" aria-label="Posologie" />
                    <input type="text" className="saisie petite" value={duree[k] || ''} onChange={e => setDuree(p => ({ ...p, [k]: e.target.value }))} placeholder="Durée : 5 j" aria-label="Durée" />
                  </div>
                </div>
              )
            })}
            {!ord.length && <p style={{ fontSize: 14, color: 'var(--gris)' }}>Aucun médicament. Cliquez « Ajouter » dans le répertoire.</p>}
          </article>

          <div style={{ background: '#fff', border: '1px solid var(--filet-fort)', padding: 18, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--encre)' }}>Documents joints</span>
              <span className="etiquette" style={{ whiteSpace: 'nowrap' }}>{pj.length} PIÈCE{pj.length > 1 ? 'S' : ''}</span>
            </div>
            <label onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); ajouterFichiers(e.dataTransfer?.files) }}
              style={{ display: 'grid', gap: 4, justifyItems: 'center', textAlign: 'center', border: '1px dashed var(--bleu)', background: 'var(--papier)', padding: '18px 12px', cursor: 'pointer' }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--bleu)' }}>Joindre des documents</span>
              <span style={{ fontSize: 13, color: 'var(--texte)' }}>Glissez ici ou cliquez · PDF, image, texte</span>
              <input type="file" multiple accept=".pdf,image/*,.txt,.doc,.docx" style={{ display: 'none' }} onChange={e => { ajouterFichiers(e.target.files); e.target.value = '' }} />
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span className="etiquette" style={{ width: '100%' }}>Joindre un document du dossier</span>
              {!dossier.length && <span style={{ fontSize: 13, color: 'var(--gris)' }}>Aucun document enregistré dans ce dossier.</span>}
              {dossier.map(d => {
                const on = pj.some(x => x.id === d.id)
                return (
                  <button key={d.id} type="button" onClick={() => basculerDossier(d)} style={{ fontSize: 13, fontWeight: 600, padding: '7px 10px', cursor: 'pointer', textAlign: 'left', border: '1px solid var(--bleu)', background: on ? 'var(--bleu)' : '#fff', color: on ? 'var(--papier)' : 'var(--bleu)' }}>
                    {on ? '✓ ' : '+ '}{d.nom}
                  </button>
                )
              })}
            </div>
            {pj.map(d => {
              const ext = d.src === 'Dossier' ? 'DOS' : (d.nom.split('.').pop() || 'DOC').slice(0, 4).toUpperCase()
              return (
                <div key={d.id} style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid var(--filet)', padding: '8px 10px' }}>
                  <span className="mono" style={{ flex: 'none', fontSize: 10.5, letterSpacing: '0.06em', color: 'var(--papier)', background: 'var(--anthracite)', padding: '4px 6px' }}>{ext}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--encre)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nom}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--gris)' }}>{d.src === 'Dossier' ? 'DOSSIER PATIENT' : taille(d.taille)}</div>
                  </div>
                  {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="mono" style={{ flex: 'none', fontSize: 12 }}>VOIR</a>}
                  <button type="button" className="btn-lien" onClick={() => retirerPj(d)}>RETIRER</button>
                </div>
              )
            })}
          </div>

          <div className="rangee-btn">
            <button type="button" className="btn btn-plein" onClick={enregistrer} disabled={envoi || !patient}>{envoi ? 'Enregistrement…' : 'Enregistrer dans le dossier'}</button>
            <button type="button" className="btn" onClick={imprimerOrd} disabled={!ord.length}>Imprimer</button>
            <button type="button" className="btn" onClick={envoyerCourante} disabled={!ord.length}>Envoyer par email</button>
            {(ord.length > 0 || pj.length > 0) && <button type="button" className="btn" onClick={vider}>Tout vider</button>}
          </div>
          <Message type="succes">{msg.succes}</Message>
          <Message type="alerte">{msg.alerte}</Message>
        </aside>
      </div>

      <div className="carte-blanche">
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--encre)', marginBottom: 10 }}>Ordonnances enregistrées</div>
        {!historique.length ? <p className="vide">Aucune ordonnance enregistrée pour ce patient.</p> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {historique.map(h => (
              <details key={h.id} style={{ border: '1px solid var(--filet)', padding: '11px 13px' }}>
                <summary style={{ cursor: 'pointer', fontSize: 14.5, color: 'var(--encre)', fontWeight: 600 }}>
                  {(h.contenu || '').split('\n')[0] || 'Ordonnance'} <span className="mono" style={{ fontSize: 11.5, color: 'var(--gris)', fontWeight: 400 }}>· {dateHeure(h.created_at)}</span>
                </summary>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: 14.5, color: 'var(--texte)', marginTop: 10 }}>{h.contenu}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <button type="button" className="btn-lien bleu" onClick={() => envoyer((h.contenu || '').split('\n').slice(1).join('\n').trim(), date(h.created_at))}>ENVOYER PAR EMAIL</button>
                  {(h.pieces_jointes || []).filter(p => p.chemin).map(p => (
                    <button key={p.chemin} type="button" className="btn-lien bleu" onClick={() => ouvrirPj(p)}>VOIR {p.nom.toUpperCase()}</button>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
