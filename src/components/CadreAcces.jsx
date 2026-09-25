import { Link } from 'react-router-dom'
import { Logo } from './Logo.jsx'

/** Mise en page des écrans de connexion / inscription. */
export default function CadreAcces({ titre, intro, children, pied }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 440, display: 'grid', gap: 22 }}>
        <Link to="/" style={{ width: 240, maxWidth: '70%' }} aria-label="Accueil Hôpital M&M"><Logo /></Link>
        <div style={{ background: 'var(--papier)', border: '1px solid var(--filet)', borderTop: '3px solid var(--bleu)', padding: 26, display: 'grid', gap: 18 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--encre)', letterSpacing: '-0.01em' }}>{titre}</h1>
            {intro && <p style={{ fontSize: 15, color: 'var(--texte)', marginTop: 6 }}>{intro}</p>}
          </div>
          {children}
        </div>
        {pied && <div style={{ fontSize: 14.5, color: 'var(--texte)' }}>{pied}</div>}
      </div>
    </div>
  )
}
