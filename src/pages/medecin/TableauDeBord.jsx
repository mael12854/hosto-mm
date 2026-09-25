import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeSejour, Chargement, EnTeteOutil, Vide } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase } from '../../lib/supabase.js'
import { dateHeure, nombre, statut } from '../../lib/format.js'

const BORD = { stable: 'var(--vert)', surveiller: 'var(--ambre)', urgence: 'var(--rouge)', sorti: 'var(--filet-fort)' }

/** Carte patient de la charte : filet de statut à gauche, constantes en mono. */
export function CartePatient({ p, constante, action }) {
  const s = statut(p.sejour)
  return (
    <article style={{ background: 'var(--papier)', border: '1px solid var(--filet)', borderLeft: `4px solid ${BORD[s.cle]}`, padding: 22, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--encre)' }}>{p.nomComplet}</div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--gris)' }}>{p.numero_dossier || p.ipp} · Service {p.service}{p.num_chambre ? ' · ' + p.num_chambre : ''}</div>
        </div>
        <BadgeSejour sejour={p.sejour} />
      </div>
      <div className="constantes">
        <div><div className="k">T°</div><div className="v">{nombre(constante?.temperature)}</div></div>
        <div><div className="k">FC</div><div className="v">{nombre(constante?.pouls)}</div></div>
        <div><div className="k">TA</div><div className="v">{constante?.tension_systolique ? `${constante.tension_systolique}/${constante.tension_diastolique ?? ''}` : '—'}</div></div>
        <div><div className="k">SpO₂</div><div className="v">{nombre(constante?.saturation)}</div></div>
      </div>
      <p style={{ fontSize: 14.5, color: 'var(--texte)' }}>
        Motif : {p.sejour?.motif || 'non renseigné'}.{constante ? ` Dernier relevé : ${dateHeure(constante.date_mesure)}.` : ' Aucune constante relevée.'}
      </p>
      {action}
    </article>
  )
}

export default function TableauDeBord() {
  const { profil } = useAuth()
  const { patients, chargement, choisir } = usePatients()
  const [constantes, setConstantes] = useState({})

  useEffect(() => {
    supabase.from('constantes_vitales').select('*').order('date_mesure', { ascending: false }).limit(200).then(({ data }) => {
      const m = {}
      for (const c of data || []) if (!m[c.patient_id]) m[c.patient_id] = c
      setConstantes(m)
    })
  }, [])

  const presents = patients.filter(p => statut(p.sejour).cle !== 'sorti')
  const ordre = { urgence: 0, surveiller: 1, stable: 2, sorti: 3 }
  const tries = [...patients].sort((a, b) => ordre[statut(a.sejour).cle] - ordre[statut(b.sejour).cle])

  return (
    <>
      <EnTeteOutil titre="Tableau de bord">
        Bonjour {profil?.medecin?.prenom}. {presents.length ? `${presents.length} patient${presents.length > 1 ? 's' : ''} hospitalisé${presents.length > 1 ? 's' : ''} dans vos services.` : 'Aucun patient hospitalisé dans vos services.'}
      </EnTeteOutil>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 1, background: 'var(--filet)', border: '1px solid var(--filet)' }}>
        {[
          ['Patients', patients.length, 'Dans vos services'],
          ['Hospitalisés', presents.length, 'Séjour en cours'],
          ['Urgences', patients.filter(p => statut(p.sejour).cle === 'urgence').length, 'Triage P1 – P2'],
          ['À surveiller', patients.filter(p => statut(p.sejour).cle === 'surveiller').length, 'Triage P3'],
        ].map(([k, v, t]) => (
          <div key={k} style={{ background: 'var(--papier)', padding: '22px 24px' }}>
            <div className="etiquette">{k}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--encre)' }}>{v}</div>
            <div style={{ fontSize: 14, color: 'var(--texte)' }}>{t}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="etiquette">Dossiers du jour</div>
        {chargement ? <Chargement /> : !patients.length ? (
          <Vide>Aucun patient. Demandez à être rattaché à un service dans « Personnel ».</Vide>
        ) : (
          <div className="grille-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 18 }}>
            {tries.map(p => (
              <CartePatient key={p.id} p={p} constante={constantes[p.id]}
                action={<div className="rangee-btn">
                  <Link to="/medecin/ordonnance" className="btn" onClick={() => choisir(p.id)}>Rédiger une ordonnance</Link>
                  <Link to="/medecin/entree-sortie" className="btn" onClick={() => choisir(p.id)}>Entrée / Sortie</Link>
                </div>} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
