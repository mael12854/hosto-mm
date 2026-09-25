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
