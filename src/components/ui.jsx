import { usePatients } from '../lib/patients.jsx'
import { statut } from '../lib/format.js'

export function EnTeteOutil({ titre, children }) {
  return (
    <div>
      <h1 className="titre-outil">{titre}</h1>
      {children && <p className="intro">{children}</p>}
    </div>
  )
}

export function Champ({ label, obligatoire, children, style }) {
  return (
    <label className={'champ' + (obligatoire ? ' obligatoire' : '')} style={style}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Saisie({ label, valeur, onChange, mono, obligatoire, ...rest }) {
  return (
    <Champ label={label} obligatoire={obligatoire}>
      <input type="text" className={'saisie' + (mono ? ' mono' : '')} value={valeur ?? ''} onChange={e => onChange(e.target.value)} {...rest} />
    </Champ>
  )
}

/** Champ date (type="date") ou date + heure (type="datetime-local") avec calendrier du navigateur. */
export function ChampDate({ label, valeur, onChange, type = 'date', obligatoire, ...rest }) {
  return (
    <Champ label={label} obligatoire={obligatoire}>
      <input type={type} lang="fr" className="saisie mono" value={valeur ?? ''} onChange={e => onChange(e.target.value)} required={obligatoire} {...rest} />
    </Champ>
  )
}

export function ZoneTexte({ label, valeur, onChange, rows = 3, obligatoire, ...rest }) {
  return (
    <Champ label={label} obligatoire={obligatoire}>
      <textarea className="saisie" rows={rows} value={valeur ?? ''} onChange={e => onChange(e.target.value)} {...rest} />
    </Champ>
  )
}

export function Badge({ cle, children }) {
  return <span className={'badge ' + cle}>{children}</span>
}

export function BadgeSejour({ sejour }) {
  const s = statut(sejour)
  return <Badge cle={s.cle}>{s.libelle}</Badge>
}

/** Bloc « Patient » commun aux outils de l'espace médecin. */
export function SelecteurPatient({ children }) {
  const { patients, patient, choisir, chargement } = usePatients()
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', justifyContent: 'space-between', border: '1px solid var(--filet)', background: '#fff', padding: 16, lineHeight: 1.3 }}>
      <label className="champ" style={{ flex: '1 1 260px' }}>
        <span style={{ fontSize: 11.5, letterSpacing: '0.1em' }}>Patient</span>
        <select className="saisie" value={patient?.id || ''} onChange={e => choisir(e.target.value)} disabled={chargement || !patients.length}>
          {chargement && <option>Chargement…</option>}
          {!chargement && !patients.length && <option>Aucun patient dans vos services</option>}
          {patients.map(p => <option key={p.id} value={p.id}>{p.nomComplet} — {p.service}</option>)}
        </select>
      </label>
      {children}
    </div>
  )
}

export function Chargement({ texte = 'Chargement…' }) {
  return <p className="etiquette" style={{ padding: '12px 0' }}>{texte}</p>
}

export function Vide({ children }) {
  return <p className="vide">{children}</p>
}

export function Message({ type = 'succes', children }) {
  if (!children) return null
  return <p className={type} role={type === 'alerte' ? 'alert' : 'status'}>{children}</p>
}
