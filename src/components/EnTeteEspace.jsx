import { Link, useNavigate } from 'react-router-dom'
import { LogoMark } from './Logo.jsx'
import { useAuth } from '../lib/auth.jsx'

/** En-tête des espaces infirmier (bleu) et patient (papier), comme dans la charte. */
export default function EnTeteEspace({ titre, qui, clair, liens }) {
  const { deconnexion } = useAuth()
  const nav = useNavigate()
  const fg = clair ? 'var(--encre)' : 'var(--papier)'
  return (
    <header className="no-print" style={{ background: clair ? 'var(--papier)' : 'var(--bleu)', borderBottom: clair ? '1px solid var(--filet)' : 'none', color: fg }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: fg }}>
          <LogoMark variante={clair ? 'couleur' : 'inverse'} size={30} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{titre}</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {liens}
          <span className="mono" style={{ fontSize: 11.5, letterSpacing: '0.06em', color: clair ? 'var(--gris)' : 'var(--bleu-pale)' }}>{qui}</span>
          <button type="button" onClick={async () => { await deconnexion(); nav('/') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.08em', color: clair ? 'var(--bleu)' : 'var(--bleu-pale)', padding: 4 }}>
            DÉCONNEXION
          </button>
        </div>
      </div>
    </header>
  )
}
