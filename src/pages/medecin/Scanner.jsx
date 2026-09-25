import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import jsQR from 'jsqr'
import { LogoMark } from '../../components/Logo.jsx'
import { EnTeteOutil } from '../../components/ui.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { lirePayload, sansAllergie } from '../../lib/bracelet.js'

export default function Scanner() {
  const { state } = useLocation()
  const { patients, choisir } = usePatients()
  const video = useRef(null)
  const canvas = useRef(null)
  const flux = useRef(null)
  const minuteur = useRef(null)
  const [cam, setCam] = useState('off')
  const [camErr, setCamErr] = useState('')
  const [scan, setScan] = useState(() => lirePayload(state?.test))
  const [mauvais, setMauvais] = useState(false)

  const arreter = useCallback(() => {
    clearTimeout(minuteur.current)
    flux.current?.getTracks().forEach(t => t.stop())
    flux.current = null
    if (video.current) video.current.srcObject = null
    setCam('off')
  }, [])

  const lire = useCallback(() => {
    if (!flux.current) return
    const v = video.current, c = canvas.current
    if (v && c && v.readyState >= 2) {
      const w = v.videoWidth, h = v.videoHeight
      c.width = w; c.height = h
      const ctx = c.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(v, 0, 0, w, h)
      const r = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
      if (r) {
        let txt = r.data
        try { txt = new TextDecoder().decode(new Uint8Array(r.binaryData)) } catch { /* texte brut */ }
        const p = lirePayload(txt)
        if (p) { navigator.vibrate?.(80); arreter(); setScan(p); setMauvais(false); return }
        setMauvais(true)
      }
    }
    minuteur.current = setTimeout(lire, 160)
  }, [arreter])

  const demarrer = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('indisponible')
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      flux.current = s
      const v = video.current
      v.srcObject = s; v.muted = true; v.setAttribute('playsinline', '')
      await v.play()
      setCam('on'); setCamErr(''); setMauvais(false)
      lire()
    } catch (e) {
      setCam('off')
      setCamErr(e.name === 'NotAllowedError' ? 'Accès à la caméra refusé. Autorisez-le dans le navigateur.' : 'Caméra indisponible sur cet appareil.')
    }
  }

  useEffect(() => arreter, [arreter])

  const trouve = scan && patients.find(p => (p.numero_dossier && p.numero_dossier === scan.dossier) || (p.ipp && p.ipp === scan.dossier))

  return (
    <>
      <EnTeteOutil titre="Scanner de bracelet">
        Présentez le QR code du bracelet devant la caméra. L'identité du patient s'affiche dès la lecture : on vérifie toujours le nom à voix haute avant un soin.
      </EnTeteOutil>

      <div className="cadre" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 22, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ position: 'relative', background: 'var(--encre)', aspectRatio: '4 / 3', overflow: 'hidden' }}>
            <video ref={video} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <canvas ref={canvas} style={{ display: 'none' }} />
            <div style={{ position: 'absolute', inset: '18%', border: '2px solid var(--papier)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: '18%', right: '18%', top: '50%', height: 2, background: 'var(--rouge)', opacity: 0.9, pointerEvents: 'none' }} />
            {cam !== 'on' && (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--encre)', color: 'var(--papier)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, textAlign: 'center' }}>
                <LogoMark variante="inverse" size={48} />
                <span className="mono" style={{ fontSize: 12, letterSpacing: '0.1em' }}>CAMÉRA INACTIVE</span>
                {camErr && <span style={{ fontSize: 14, color: 'var(--bleu-pale)', maxWidth: '34ch' }}>{camErr}</span>}
              </div>
            )}
          </div>
          <div className="rangee-btn">
            {cam !== 'on'
              ? <button type="button" className="btn btn-plein" onClick={demarrer}>Activer la caméra</button>
              : <button type="button" className="btn" onClick={arreter}>Arrêter la caméra</button>}
          </div>
          <span className="etiquette">{cam === 'on' ? 'Lecture en cours — cadrez le QR dans le carré' : 'En attente'}</span>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <span className="etiquette">Patient identifié</span>
          {scan && (
            <article style={{ background: '#fff', border: '1px solid var(--filet)', borderLeft: '4px solid var(--bleu)', padding: 20, display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--encre)', lineHeight: 1.15 }}>{scan.nom}</div>
                  <div className="mono" style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--gris)', marginTop: 4 }}>{scan.dossier} · {scan.service}</div>
                </div>
                <span className="badge stable">Bracelet valide</span>
              </div>
              <div className="constantes" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                <div><div className="k">NAISSANCE</div><div className="v" style={{ fontSize: 15 }}>{scan.naissance}</div></div>
                <div><div className="k">GROUPE</div><div className="v" style={{ fontSize: 15 }}>{scan.groupe}</div></div>
              </div>
              {!sansAllergie(scan.allergies) && (
                <div style={{ background: 'var(--rouge)', color: '#fff', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em' }}>ALLERGIE</span>
                  <strong style={{ fontSize: 15, fontWeight: 600 }}>{scan.allergies}</strong>
                </div>
              )}
              <div className="rangee-btn">
                {trouve
                  ? <Link to="/medecin/entree-sortie" className="btn btn-plein" onClick={() => choisir(trouve.id)}>Ouvrir le dossier</Link>
                  : <span className="etiquette" style={{ alignSelf: 'center' }}>Dossier absent de vos services</span>}
                <button type="button" className="btn" onClick={() => { setScan(null); setMauvais(false); demarrer() }}>Scanner un autre bracelet</button>
              </div>
            </article>
          )}
          {!scan && !mauvais && <p className="vide" style={{ padding: '24px 16px' }}>Aucun bracelet lu. Activez la caméra ou utilisez « Tester dans le scanner » depuis le générateur.</p>}
          {!scan && mauvais && <p className="alerte">QR code non reconnu : ce n'est pas un bracelet Hôpital M&amp;M.</p>}
        </div>
      </div>
    </>
  )
}
