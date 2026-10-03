import { useEffect, useId, useRef, useState } from 'react'

// Base Adresse Nationale (IGN) : gratuite, sans clé, adresses de France.
const API = 'https://data.geopf.fr/geocodage/search'

/**
 * Adresse avec suggestions : on tape, la liste des adresses possibles s'affiche au-dessus du champ.
 * onChoisir reçoit { adresse, code_postal, ville } quand une suggestion est choisie.
 */
export default function ChampAdresse({ label = 'Adresse', valeur, onChange, onChoisir }) {
  const [suggestions, setSuggestions] = useState([])
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(-1)
  const [etat, setEtat] = useState('')
  const choisie = useRef('')
  const id = useId()

  useEffect(() => {
    const q = (valeur || '').trim()
    if (q.length < 3 || q === choisie.current) { setSuggestions([]); setEtat(''); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setEtat('recherche')
      try {
        const r = await fetch(`${API}?q=${encodeURIComponent(q)}&autocomplete=1&limit=6`, { signal: ctrl.signal })
        const json = await r.json()
        const liste = (json.features || []).map(f => f.properties).map(p => ({
          libelle: p.label, adresse: p.name, code_postal: p.postcode || '', ville: p.city || '', contexte: p.context || '',
        }))
        setSuggestions(liste); setActif(-1); setOuvert(true); setEtat(liste.length ? '' : 'aucune')
      } catch (e) {
        if (e.name !== 'AbortError') { setSuggestions([]); setEtat('hors-ligne') }
      }
    }, 250)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [valeur])

  const choisir = s => {
    choisie.current = s.adresse
    onChoisir({ adresse: s.adresse, code_postal: s.code_postal, ville: s.ville })
    setOuvert(false); setSuggestions([])
  }

  const clavier = e => {
    if (!ouvert || !suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActif(i => (i + 1) % suggestions.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActif(i => (i <= 0 ? suggestions.length : i) - 1) }
    else if (e.key === 'Enter' && actif >= 0) { e.preventDefault(); choisir(suggestions[actif]) }
    else if (e.key === 'Escape') setOuvert(false)
  }

  const visible = ouvert && suggestions.length > 0
  return (
    <div className="champ champ-adresse">
      <label htmlFor={id + 'q'}>{label}</label>
      <div style={{ position: 'relative' }}>
        {visible && (
          <ul id={id + 'l'} role="listbox" aria-label="Adresses possibles" className="suggestions">
            {suggestions.map((s, i) => (
              <li key={s.libelle + i} role="option" aria-selected={i === actif}
                onMouseDown={e => { e.preventDefault(); choisir(s) }} onMouseEnter={() => setActif(i)}>
                <span className="principal">{s.adresse}</span>
                <span className="secondaire">{s.code_postal} {s.ville}{s.contexte ? ` · ${s.contexte.split(', ').slice(1).join(', ')}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
        <input id={id + 'q'} type="text" className="saisie" autoComplete="off" placeholder="Tapez le numéro et la rue : 12 rue des Lilas…"
          role="combobox" aria-expanded={visible} aria-controls={id + 'l'} aria-autocomplete="list"
          value={valeur ?? ''} onChange={e => { choisie.current = ''; onChange(e.target.value) }}
          onKeyDown={clavier} onFocus={() => suggestions.length && setOuvert(true)} onBlur={() => setOuvert(false)} />
      </div>
      {etat === 'recherche' && <span className="aide">Recherche…</span>}
      {etat === 'aucune' && <span className="aide">Aucune adresse trouvée : vous pouvez la saisir telle quelle.</span>}
      {etat === 'hors-ligne' && <span className="aide">Suggestions indisponibles : saisissez l'adresse à la main.</span>}
    </div>
  )
}
