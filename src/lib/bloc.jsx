import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { nomMedecin } from './format.js'

/** Salles de bloc et médecins (chirurgiens), chargés une fois par page. */
export function useBloc() {
  const [salles, setSalles] = useState([])
  const [medecins, setMedecins] = useState([])
  useEffect(() => {
    supabase.from('salles_operation').select('*').order('ordre').then(({ data }) => setSalles(data || []))
    supabase.from('medecins').select('id, nom, prenom').order('nom').then(({ data }) => setMedecins(data || []))
  }, [])
  return {
    salles, medecins,
    salle: id => salles.find(s => s.id === id) || null,
    chirurgien: id => nomMedecin(medecins.find(m => m.id === id)),
  }
}

/** Opérations entre deux dates (ISO), triées par heure de début. */
export async function chargerOperations(debut, fin) {
  const { data, error } = await supabase.from('operations').select('*').gte('debut', debut).lt('debut', fin).order('debut')
  return { data: data || [], error }
}

/** Début de journée locale (minuit). */
export function minuit(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export function plusJours(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
