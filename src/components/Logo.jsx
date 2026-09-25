import { useId } from 'react'

// Le signe : deux cercles identiques qui se recouvrent (Maël et Marin),
// la croix de soin dans le recouvrement.
function Signe({ cy, variante, id }) {
  const clip = `${id}-lentille`
  const mask = `${id}-masque`
  const cercle = { inverse: '#F4F1EA', encre: '#2F3A40' }[variante] || '#1D5C74'
  const croix = { inverse: '#F4F1EA', encre: '#2F3A40' }[variante] || '#A8331F'
  return (
    <>
      <defs>
        <clipPath id={clip}><circle cx="76" cy={cy} r="62" /></clipPath>
        {variante === 'inverse' && (
          <mask id={mask}>
            <rect x="0" y="0" width="890" height="224" fill="#fff" />
            <g clipPath={`url(#${clip})`}><circle cx="148" cy={cy} r="62" fill="#000" /></g>
          </mask>
        )}
      </defs>
      <g mask={variante === 'inverse' ? `url(#${mask})` : undefined}>
        <circle cx="76" cy={cy} r="62" fill={cercle} />
        <circle cx="148" cy={cy} r="62" fill={cercle} />
      </g>
      {variante !== 'inverse' && (
        <g clipPath={`url(#${clip})`}><circle cx="148" cy={cy} r="62" fill="#F4F1EA" /></g>
      )}
      <rect x="103" y={cy - 30} width="18" height="60" fill={croix} />
      <rect x="92" y={cy - 9} width="40" height="18" fill={croix} />
    </>
  )
}

/** Logo complet horizontal. variante : 'couleur' | 'inverse' | 'encre' */
export function Logo({ variante = 'couleur', style, className }) {
  const id = useId().replace(/:/g, '')
  const texte = variante === 'inverse' ? '#F4F1EA' : '#2F3A40'
  const mm = variante === 'couleur' ? '#1D5C74' : texte
  return (
    <svg viewBox="0 0 890 160" role="img" aria-label="Hôpital M&M" className={className}
      style={{ display: 'block', width: '100%', height: 'auto', ...style }}>
      <Signe cy={80} variante={variante} id={id} />
      <text x="256" y="113" fontFamily="'Source Sans 3', Helvetica, sans-serif" fontSize="104" fontWeight="700" letterSpacing="-2">
        <tspan fill={texte}>Hôpital</tspan><tspan fill={mm} dx="24">M&amp;M</tspan>
      </text>
    </svg>
  )
}

/** Signe seul (carré). variante : 'couleur' | 'inverse' | 'encre' */
export function LogoMark({ variante = 'couleur', size, style }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 224 224" role="img" aria-label="Signe Hôpital M&M"
      style={{ display: 'block', width: size || '100%', height: 'auto', flex: 'none', ...style }}>
      <Signe cy={112} variante={variante} id={id} />
    </svg>
  )
}

/** Code SVG du logo, pour les fenêtres d'impression. */
export const logoSvgTexte = `<svg viewBox="0 0 890 160" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:auto"><defs><clipPath id="l"><circle cx="76" cy="80" r="62"/></clipPath></defs><circle cx="76" cy="80" r="62" fill="#1D5C74"/><circle cx="148" cy="80" r="62" fill="#1D5C74"/><g clip-path="url(#l)"><circle cx="148" cy="80" r="62" fill="#F4F1EA"/></g><rect x="103" y="50" width="18" height="60" fill="#A8331F"/><rect x="92" y="71" width="40" height="18" fill="#A8331F"/><text x="256" y="113" font-family="'Source Sans 3', Helvetica, sans-serif" font-size="104" font-weight="700" letter-spacing="-2"><tspan fill="#2F3A40">Hôpital</tspan><tspan fill="#1D5C74" dx="24">M&amp;M</tspan></text></svg>`

export const signeSvgTexte = `<svg viewBox="0 0 224 224" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:auto"><defs><clipPath id="s"><circle cx="76" cy="112" r="62"/></clipPath></defs><circle cx="76" cy="112" r="62" fill="#1D5C74"/><circle cx="148" cy="112" r="62" fill="#1D5C74"/><g clip-path="url(#s)"><circle cx="148" cy="112" r="62" fill="#F4F1EA"/></g><rect x="103" y="82" width="18" height="60" fill="#A8331F"/><rect x="92" y="103" width="40" height="18" fill="#A8331F"/></svg>`
