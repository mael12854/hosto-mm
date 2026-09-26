import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeSejour, Chargement, EnTeteOutil, Vide } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase, journaliser } from '../../lib/supabase.js'
import { dateHeure, heure, nombre, statut } from '../../lib/format.js'

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
  const [rdvJour, setRdvJour] = useState(null)

  // Rendez-vous prévus aujourd'hui (minuit à minuit, heure locale).
  const chargerRdv = useCallback(async () => {
    const debut = new Date(); debut.setHours(0, 0, 0, 0)
    const fin = new Date(debut); fin.setDate(fin.getDate() + 1)
    const { data } = await supabase.from('rendez_vous').select('*').eq('statut', 'prévu')
      .gte('date_heure', debut.toISOString()).lt('date_heure', fin.toISOString()).order('date_heure')
    setRdvJour(data || [])
  }, [])
  useEffect(() => { chargerRdv() }, [chargerRdv])

  const terminer = async r => {
    const { error } = await supabase.from('rendez_vous').update({ statut: 'terminé' }).eq('id', r.id)
    if (!error) { journaliser(profil, `Rendez-vous terminé (${dateHeure(r.date_heure)})`, { patient_id: r.patient_id, service_id: r.service_id }); chargerRdv() }
  }

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
  const maintenant = new Date()
  const prochain = (rdvJour || []).find(r => new Date(r.date_heure) >= maintenant)
  const nomPatient = id => patients.find(p => p.id === id)

  return (
    <>
      <EnTeteOutil titre="Tableau de bord">
        Bonjour {profil?.medecin?.prenom}. {presents.length ? `${presents.length} patient${presents.length > 1 ? 's' : ''} hospitalisé${presents.length > 1 ? 's' : ''} dans vos services.` : 'Aucun patient hospitalisé dans vos services.'}
        {rdvJour?.length ? ` ${rdvJour.length} rendez-vous aujourd'hui${prochain ? `, le prochain à ${heure(prochain.date_heure)}` : ''}.` : ''}
      </EnTeteOutil>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 1, background: 'var(--filet)', border: '1px solid var(--filet)' }}>
        {[
          ['Patients', patients.length, 'Dans vos services'],
          ['Hospitalisés', presents.length, 'Séjour en cours'],
          ['Urgences', patients.filter(p => statut(p.sejour).cle === 'urgence').length, 'Triage P1 – P2'],
          ['À surveiller', patients.filter(p => statut(p.sejour).cle === 'surveiller').length, 'Triage P3'],
          ['Rendez-vous', rdvJour?.length ?? '…', "Aujourd'hui"],
        ].map(([k, v, t]) => (
          <div key={k} style={{ background: 'var(--papier)', padding: '22px 24px' }}>
            <div className="etiquette">{k}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--encre)' }}>{v}</div>
            <div style={{ fontSize: 14, color: 'var(--texte)' }}>{t}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div className="etiquette">Rendez-vous du jour · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <Link to="/medecin/rendez-vous" className="btn-lien bleu">TOUS LES RENDEZ-VOUS →</Link>
        </div>
        {rdvJour === null ? <Chargement /> : !rdvJour.length ? <Vide>Aucun rendez-vous prévu aujourd'hui.</Vide> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {rdvJour.map(r => {
              const p = nomPatient(r.patient_id)
              const passe = new Date(r.date_heure) < maintenant
              const estProchain = prochain?.id === r.id
              return (
                <div key={r.id} className="ligne-liste" style={{ flexWrap: 'wrap', borderLeft: `4px solid ${estProchain ? 'var(--bleu)' : 'var(--filet)'}`, opacity: passe ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', minWidth: 0, flex: '1 1 260px' }}>
                    <span className="mono" style={{ fontSize: 18, color: 'var(--encre)', flex: 'none' }}>{heure(r.date_heure)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--encre)' }}>{p?.nomComplet || 'Patient'}</div>
                      <div style={{ fontSize: 14, color: 'var(--texte)' }}>{r.motif || 'Consultation'}{p?.service ? ` · ${p.service}` : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {estProchain && <span className="badge bleu">Prochain</span>}
                    {passe && <span className="statut-texte surveiller">EN RETARD</span>}
                    <Link to="/medecin/compte-rendu" className="btn-lien bleu" onClick={() => choisir(r.patient_id)}>COMPTE-RENDU</Link>
                    <button type="button" className="btn-lien bleu" onClick={() => terminer(r)}>TERMINÉ</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
