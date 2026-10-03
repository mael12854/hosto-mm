import ChampAdresse from './ChampAdresse.jsx'
import { Champ, Saisie, ZoneTexte } from './ui.jsx'

const LIENS = ['Mère', 'Père', 'Frère', 'Sœur', 'Grand-mère', 'Grand-père', 'Tuteur / tutrice', 'Conjoint(e)', 'Ami(e)']

/** Champs modifiables du dossier : coordonnées, personne à prévenir, suivi. */
export const CHAMPS_COORDONNEES = [
  'adresse', 'complement_adresse', 'code_postal', 'ville', 'telephone', 'email',
  'contact_urgence_nom', 'contact_urgence_lien', 'contact_urgence_telephone', 'medecin_traitant', 'traitement_en_cours',
]

const telValide = t => !String(t || '').trim() || /^[+\d][\d\s.-]{7,}$/.test(String(t).trim())

/** Message d'erreur si un téléphone ou l'e-mail est mal saisi, sinon ''. */
export function verifierCoordonnees(f) {
  if (!telValide(f.telephone) || !telValide(f.contact_urgence_telephone)) return 'Numéro de téléphone incomplet (ex. 06 12 34 56 78).'
  if (String(f.email || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return 'Adresse e-mail invalide.'
  return ''
}

/** Chaînes nettoyées : vide → null, ville en majuscules. */
export function nettoyer(f) {
  const x = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'string' ? (v.trim() || null) : v]))
  if (x.ville) x.ville = x.ville.toUpperCase()
  return x
}

export function SectionCoordonnees({ f, maj, setF }) {
  return (
    <>
      <ChampAdresse valeur={f.adresse} onChange={maj('adresse')}
        onChoisir={a => setF(x => ({ ...x, adresse: a.adresse, code_postal: a.code_postal, ville: a.ville.toUpperCase() }))} />
      <div className="grille-champs">
        <Saisie label="Complément" placeholder="Bâtiment, étage, appartement…" valeur={f.complement_adresse} onChange={maj('complement_adresse')} />
        <Saisie label="Code postal" mono inputMode="numeric" maxLength={5} valeur={f.code_postal} onChange={v => maj('code_postal')(v.replace(/\D/g, ''))} />
        <Saisie label="Ville" valeur={f.ville} onChange={maj('ville')} />
      </div>
      <div className="grille-champs">
        <Saisie label="Téléphone" mono type="tel" inputMode="tel" placeholder="06 12 34 56 78" valeur={f.telephone} onChange={maj('telephone')} />
        <Saisie label="E-mail" type="email" inputMode="email" placeholder="prenom@exemple.fr" valeur={f.email} onChange={maj('email')} />
      </div>
    </>
  )
}

export function SectionContact({ f, maj }) {
  return (
    <div className="grille-champs">
      <Saisie label="Nom et prénom" valeur={f.contact_urgence_nom} onChange={maj('contact_urgence_nom')} />
      <Champ label="Lien">
        <input className="saisie" list="liens-contact" value={f.contact_urgence_lien ?? ''} onChange={e => maj('contact_urgence_lien')(e.target.value)} placeholder="Mère, père…" />
        <datalist id="liens-contact">{LIENS.map(l => <option key={l} value={l} />)}</datalist>
      </Champ>
      <Saisie label="Téléphone" mono type="tel" inputMode="tel" placeholder="06 12 34 56 78" valeur={f.contact_urgence_telephone} onChange={maj('contact_urgence_telephone')} />
    </div>
  )
}

export function SectionSuivi({ f, maj }) {
  return (
    <>
      <Saisie label="Médecin traitant" placeholder="Dr …" valeur={f.medecin_traitant} onChange={maj('medecin_traitant')} />
      <ZoneTexte label="Traitement en cours" rows={2} placeholder="Médicaments pris régulièrement" valeur={f.traitement_en_cours} onChange={maj('traitement_en_cours')} />
    </>
  )
}
