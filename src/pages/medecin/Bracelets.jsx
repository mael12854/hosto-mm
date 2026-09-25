import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogoMark } from '../../components/Logo.jsx'
import { EnTeteOutil, SelecteurPatient, Saisie } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { journaliser } from '../../lib/supabase.js'
import { date, esc } from '../../lib/format.js'
import { imprimer } from '../../lib/impression.js'
import { payload, qrDataUrl, sansAllergie } from '../../lib/bracelet.js'

const Trous = ({ cote }) => (
  <div style={{ flex: 'none', width: 34, background: 'var(--papier)', [cote === 'g' ? 'borderRight' : 'borderLeft']: '1px dashed var(--filet-fort)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
    {[0, 1].map(i => <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', border: '1.5px solid var(--filet-fort)', background: '#fff' }} />)}
  </div>
)

const STYLE_BRACELET = `body{margin:0;font-family:'Source Sans 3',sans-serif;color:#1E262B}.b{display:flex;align-items:center;width:250mm;height:25mm;border:0.3mm solid #C2BBAC}.bar{width:2mm;height:100%;background:#1D5C74}.qr{height:21mm;width:21mm;margin:0 3mm;image-rendering:pixelated}.t{flex:1;min-width:0}.h{font-family:'IBM Plex Mono',monospace;font-size:7pt;letter-spacing:.1em;color:#1D5C74}.n{font-size:16pt;font-weight:700;line-height:1.1}.m{font-family:'IBM Plex Mono',monospace;font-size:8pt}.a{height:100%;width:32mm;background:#A8331F;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 3mm;box-sizing:border-box}.a span{font-family:'IBM Plex Mono',monospace;font-size:7pt}.a b{font-size:10pt}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}`

export default function Bracelets() {
  const { profil } = useAuth()
  const { patient } = usePatients()
  const nav = useNavigate()
  const [d, setD] = useState({ nom: '', dossier: '', service: '', naissance: '', groupe: '', allergies: '' })
  const maj = k => v => setD(x => ({ ...x, [k]: v }))

  useEffect(() => {
    if (!patient) return
    setD({
      nom: patient.nomComplet, dossier: patient.numero_dossier || patient.ipp || '', service: patient.service,
      naissance: date(patient.date_naissance), groupe: patient.groupe_sanguin || '', allergies: patient.allergies || '',
    })
  }, [patient])

  const qr = useMemo(() => qrDataUrl(payload(d)), [d])
  const allergie = !sansAllergie(d.allergies)

  const imprimerBracelet = () => {
    imprimer({
      titre: `Bracelet ${d.nom}`, page: '260mm 35mm', marge: '5mm', style: STYLE_BRACELET,
      corps: `<div class="b"><div class="bar"></div><img class="qr" src="${qr}" alt=""><div class="t"><div class="h">HÔPITAL M&amp;M · ${esc(d.service).toUpperCase()}</div><div class="n">${esc(d.nom)}</div><div class="m">${esc(d.dossier)} · NÉ(E) LE ${esc(d.naissance)} · GR. ${esc(d.groupe)}</div></div>${allergie ? `<div class="a"><span>ALLERGIE</span><b>${esc(d.allergies)}</b></div>` : ''}</div>`,
    })
    if (patient) journaliser(profil, `Bracelet imprimé : ${d.nom}`, { patient_id: patient.id, service_id: patient.service_id })
  }

  return (
    <>
      <EnTeteOutil titre="Générateur de bracelet">
        Saisissez l'identité du patient : le bracelet se compose en direct avec son QR code. Le QR contient le numéro de dossier et l'identité, lisibles par l'outil Scanner.
      </EnTeteOutil>
      <SelecteurPatient />

      <div className="cadre" style={{ display: 'grid', gap: 22 }}>
        <div className="grille-champs large">
          <Saisie label="Nom du patient" placeholder="Prénom Nom" valeur={d.nom} onChange={maj('nom')} />
          <Saisie label="N° de dossier" placeholder="MM-2026-0000" valeur={d.dossier} onChange={maj('dossier')} />
          <Saisie label="Service" placeholder="Urgences" valeur={d.service} onChange={maj('service')} />
          <Saisie label="Date de naissance" placeholder="jj/mm/aaaa" valeur={d.naissance} onChange={maj('naissance')} />
          <Saisie label="Groupe sanguin" placeholder="A+" valeur={d.groupe} onChange={maj('groupe')} />
          <Saisie label="Allergies" placeholder="Aucune" valeur={d.allergies} onChange={maj('allergies')} />
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <span className="etiquette">Aperçu — 250 × 25 mm</span>
          <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'stretch', background: '#fff', border: '1px solid var(--filet-fort)', minWidth: 640, maxWidth: 860, height: 104 }}>
              <Trous cote="g" />
              <div style={{ flex: 'none', width: 8, background: 'var(--bleu)' }} />
              <div style={{ flex: 'none', padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 84, height: 84, background: '#fff' }}>
                  {qr && <img src={qr} alt="QR code du bracelet" style={{ width: 84, height: 84, imageRendering: 'pixelated', display: 'block' }} />}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, padding: '10px 14px 10px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, lineHeight: 1.25 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LogoMark size={18} />
                  <span className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--bleu)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>HÔPITAL M&amp;M · {(d.service || '').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--encre)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nom || 'Nom du patient'}</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--anthracite)', whiteSpace: 'nowrap' }}>{d.dossier} · NÉ(E) LE {d.naissance} · GR. {d.groupe}</div>
              </div>
              {allergie && (
                <div style={{ flex: 'none', width: 130, background: 'var(--rouge)', color: '#fff', padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                  <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', fontWeight: 500 }}>ALLERGIE</span>
                  <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{d.allergies}</span>
                </div>
              )}
              <Trous cote="d" />
            </div>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--texte)' }}>Bande rouge uniquement si une allergie est renseignée. Le nom est toujours le plus gros élément du bracelet.</p>
        </div>

        <div className="rangee-btn">
          <button type="button" className="btn btn-plein" onClick={imprimerBracelet} disabled={!qr}>Imprimer le bracelet</button>
          <button type="button" className="btn" onClick={() => nav('/medecin/scanner', { state: { test: payload(d) } })}>Tester dans le scanner</button>
        </div>
      </div>
    </>
  )
}
