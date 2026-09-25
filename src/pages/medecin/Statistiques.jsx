import { useEffect, useState } from 'react'
import { Chargement, EnTeteOutil } from '../../components/ui.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase } from '../../lib/supabase.js'
import { statut } from '../../lib/format.js'

function Tuile({ k, v, t }) {
  return (
    <div style={{ background: 'var(--papier)', padding: '22px 24px' }}>
      <div className="etiquette">{k}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--encre)' }}>{v}</div>
      <div style={{ fontSize: 14, color: 'var(--texte)' }}>{t}</div>
    </div>
  )
}

/** Barre horizontale : une seule couleur, le nombre toujours écrit. */
function Barres({ titre, donnees }) {
  const max = Math.max(1, ...donnees.map(d => d[1]))
  return (
    <div className="carte-blanche" style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--encre)' }}>{titre}</div>
      {donnees.map(([nom, n]) => (
        <div key={nom} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 160px) 1fr 36px', gap: 10, alignItems: 'center', fontSize: 14 }}>
          <span style={{ color: 'var(--texte)' }}>{nom}</span>
          <div style={{ background: 'var(--papier)', height: 14 }}><div style={{ width: `${(n / max) * 100}%`, height: '100%', background: 'var(--bleu)' }} /></div>
          <span className="mono" style={{ textAlign: 'right', color: 'var(--encre)' }}>{n}</span>
        </div>
      ))}
    </div>
  )
}

export default function Statistiques() {
  const { patients, chargement } = usePatients()
  const [c, setC] = useState(null)

  useEffect(() => {
    const t = ['prescriptions', 'comptes_rendus', 'documents_officiels', 'constantes_vitales', 'examens_laboratoire', 'lits']
    Promise.all(t.map(x => supabase.from(x).select('*', { count: 'exact', head: true }))).then(r => setC(Object.fromEntries(t.map((x, i) => [x, r[i].count ?? 0]))))
  }, [])

  if (chargement || !c) return <><EnTeteOutil titre="Statistiques" /><Chargement /></>
  const sejours = patients.flatMap(p => p.sejours)
  const parService = Object.entries(patients.reduce((a, p) => ({ ...a, [p.service]: (a[p.service] || 0) + 1 }), {}))
  const parStatut = ['urgence', 'surveiller', 'stable', 'sorti'].map(k => [{ urgence: 'Urgence', surveiller: 'À surveiller', stable: 'Stable', sorti: 'Sorti' }[k], patients.filter(p => statut(p.sejour).cle === k).length])

  return (
    <>
      <EnTeteOutil titre="Statistiques">Activité de vos services, calculée à partir des dossiers Supabase.</EnTeteOutil>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 1, background: 'var(--filet)', border: '1px solid var(--filet)' }}>
        <Tuile k="Patients" v={patients.length} t="Dans vos services" />
        <Tuile k="Séjours" v={sejours.length} t="Hospitalisations" />
        <Tuile k="Ordonnances" v={c.prescriptions} t="Rédigées" />
        <Tuile k="Comptes-rendus" v={c.comptes_rendus} t="Enregistrés" />
        <Tuile k="Bulletins E/S" v={c.documents_officiels} t="Entrée / Sortie" />
        <Tuile k="Constantes" v={c.constantes_vitales} t="Relevés" />
        <Tuile k="Examens" v={c.examens_laboratoire} t="Demandés" />
        <Tuile k="Lits" v={c.lits} t="Dans vos services" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 18 }}>
        <Barres titre="Patients par service" donnees={parService} />
        <Barres titre="Patients par statut" donnees={parStatut} />
      </div>
    </>
  )
}
