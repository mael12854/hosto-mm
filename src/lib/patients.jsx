import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import { nomComplet } from './format.js'

const PatientsCtx = createContext(null)
const CLE_SELECTION = 'hmm-patient'

function lire() { try { return localStorage.getItem(CLE_SELECTION) || '' } catch { return '' } }
function ecrire(v) { try { localStorage.setItem(CLE_SELECTION, v) } catch { /* stockage indisponible */ } }

/** Patients visibles par le personnel connecté (RLS : services de rattachement). */
export function PatientsProvider({ children }) {
  const [patients, setPatients] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [selId, setSelId] = useState(lire)

  const charger = useCallback(async () => {
    setChargement(true)
    const [p, h] = await Promise.all([
      supabase.from('patients').select('*, services(nom)').order('nom'),
      supabase.from('hospitalisations').select('*').order('date_entree', { ascending: false }),
    ])
    if (p.error) setErreur(p.error.message)
    const sejours = h.data || []
    setPatients((p.data || []).map(x => ({
      ...x,
      nomComplet: nomComplet(x),
      service: x.services?.nom || '',
      sejour: sejours.find(s => s.patient_id === x.id) || null,
      sejours: sejours.filter(s => s.patient_id === x.id),
    })))
    setChargement(false)
  }, [])

  useEffect(() => { charger() }, [charger])

  const choisir = useCallback(id => { setSelId(id); ecrire(id) }, [])
  const patient = useMemo(() => patients.find(p => p.id === selId) || patients[0] || null, [patients, selId])

  return (
    <PatientsCtx.Provider value={{ patients, patient, choisir, charger, chargement, erreur }}>
      {children}
    </PatientsCtx.Provider>
  )
}

export const usePatients = () => useContext(PatientsCtx)

/** Prochain numéro de dossier « aaaa-nnnn » d'après les dossiers visibles. */
export function prochainNumero(patients, decalage = 0) {
  const annee = new Date().getFullYear()
  const max = patients.map(p => String(p.numero_dossier || '').match(new RegExp(`^${annee}-(\\d+)$`)))
    .filter(Boolean).reduce((m, x) => Math.max(m, Number(x[1])), 0)
  return `${annee}-${String(max + 1 + decalage).padStart(4, '0')}`
}

/** Crée le dossier ; réessaie avec le numéro suivant si un autre service l'a déjà pris. */
export async function creerDossier(patients, champs) {
  for (let essai = 0; essai < 5; essai++) {
    const { data, error } = await supabase.from('patients').insert({ ...champs, numero_dossier: prochainNumero(patients, essai) }).select().single()
    if (!error) return data
    if (error.code !== '23505') throw error
  }
  throw new Error("Impossible d'attribuer un numéro de dossier. Réessayez.")
}
