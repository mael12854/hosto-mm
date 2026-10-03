import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'

const SitesCtx = createContext(null)
const CLE = 'hmm-site'

function lire() { try { return localStorage.getItem(CLE) || '' } catch { return '' } }
function ecrire(v) { try { localStorage.setItem(CLE, v) } catch { /* stockage indisponible */ } }

/** « site d'Igny », « site de Paris » : élision devant une voyelle ou un h. */
export const siteDe = nom => (/^[aeiouyhàâéèêëîïôûü]/i.test(nom || '') ? `site d'${nom}` : `site de ${nom}`)

/** Adresse postale d'un site : « 102 boulevard Gallieni, 92130 Issy-les-Moulineaux ». */
export const adresseSite = s => (s ? [s.adresse, [s.code_postal, s.nom].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '')

/**
 * Sites de l'hôpital (Issy-les-Moulineaux, Igny) et site de travail choisi.
 * actif = '' : les deux sites ; sinon l'id du site, mémorisé sur cet appareil.
 */
export function SitesProvider({ children }) {
  const [sites, setSites] = useState([])
  const [actif, setActifEtat] = useState(lire)

  useEffect(() => {
    supabase.from('sites').select('*').order('ordre').then(({ data }) => setSites(data || []))
  }, [])

  const setActif = useCallback(id => { setActifEtat(id); ecrire(id) }, [])

  const valeur = useMemo(() => {
    const parId = id => sites.find(s => s.id === id) || null
    const actifValide = sites.some(s => s.id === actif) ? actif : ''
    return {
      sites, actif: actifValide, setActif, parId,
      nom: id => parId(id)?.nom || '',
      /** Site proposé par défaut : le site de travail, sinon le premier. */
      parDefaut: parId(actifValide) || sites[0] || null,
      /** Garde les lignes du site de travail (toutes si « les deux sites »). */
      filtrer: (lignes, cle = 'site_id') => (actifValide ? lignes.filter(l => !l[cle] || l[cle] === actifValide) : lignes),
      /** Site d'un document : celui du séjour en cours du patient, sinon le site de travail. */
      dePatient: p => parId(p?.sejour && !p.sejour.date_sortie ? p.sejour.site_id : null) || parId(actifValide) || sites[0] || null,
    }
  }, [sites, actif, setActif])

  return <SitesCtx.Provider value={valeur}>{children}</SitesCtx.Provider>
}

export const useSites = () => useContext(SitesCtx)

/** Choix du site de travail, barre latérale ou en-tête bleu (compact). */
export function SelecteurSite({ compact }) {
  const { sites, actif, setActif } = useSites()
  if (sites.length < 2) return null
  return (
    <label className={'selecteur-site' + (compact ? ' compact' : '')}>
      <span>Site</span>
      <select value={actif} onChange={e => setActif(e.target.value)}>
        <option value="">Les deux sites</option>
        {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
      </select>
    </label>
  )
}
