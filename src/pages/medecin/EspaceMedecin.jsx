import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { SelecteurSite } from '../../lib/sites.jsx'
import { LogoMark } from '../../components/Logo.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { PatientsProvider } from '../../lib/patients.jsx'
import { nomMedecin } from '../../lib/format.js'
import { supabase } from '../../lib/supabase.js'

// Menu groupé par thème : [titre du groupe, [[chemin, libellé]]].
const GROUPES = [
  ['Accueil', [['', 'Tableau de bord'], ['dossier', 'Dossier patient'], ['nouveau-patient', 'Nouveau patient'], ['messages', 'Messages']]],
  ['Soins', [['file-attente', "File d'attente"], ['admissions', 'Admissions'], ['rendez-vous', 'Rendez-vous'], ['examens', 'Examens']]],
  ['Bloc opératoire', [['bloc', 'Bloc du jour'], ['bloc/planning', 'Planning du bloc'], ['bloc/programmer', 'Programmer une opération']]],
  ['Documents', [['ordonnance', 'Ordonnance'], ['compte-rendu', 'Compte-rendu'], ['entree-sortie', 'Entrée / Sortie'], ['editeur', 'Éditeur libre']]],
  ['Outils', [['bracelets', 'Bracelets'], ['scanner', 'Scanner'], ['affiches', 'Affiches'], ['papiers', 'Papiers vierges'], ['lits', 'Lits']]],
  ['Gestion', [['journal', 'Journal'], ['personnel', 'Personnel'], ['statistiques', 'Statistiques']]],
]

export default function EspaceMedecin() {
  const { profil, deconnexion } = useAuth()
  const nav = useNavigate()
  const [nonLus, setNonLus] = useState(0)

  // Messages de patients non lus (pastille du menu), relus chaque minute.
  useEffect(() => {
    const compter = () => supabase.from('messages').select('id', { count: 'exact', head: true }).eq('expediteur', 'patient').eq('lu', false)
      .then(({ count }) => setNonLus(count || 0))
    compter()
    const t = setInterval(compter, 60000)
    return () => clearInterval(t)
  }, [])

  return (
    <PatientsProvider>
      <div className="coque">
        <aside className="barre no-print">
          <div className="barre-interne">
            <Link to="/medecin" className="barre-marque">
              <LogoMark variante="inverse" size={30} />
              <div><div className="nom">Hôpital M&amp;M</div><div className="espace">ESPACE MÉDECIN</div></div>
            </Link>
            <SelecteurSite />
            <nav aria-label="Outils">
              {GROUPES.map(([groupe, outils]) => (
                <div key={groupe} className="groupe-menu">
                  <div className="titre-groupe">{groupe}</div>
                  {outils.map(([chemin, libelle]) => (
                    <NavLink key={chemin} to={chemin ? `/medecin/${chemin}` : '/medecin'} end>
                      {libelle}{chemin === 'messages' && nonLus > 0 && <span className="pastille" aria-label={`${nonLus} non lus`}>{nonLus}</span>}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
            <div className="bas">
              <div className="qui">{nomMedecin(profil?.medecin).toUpperCase()}</div>
              {profil?.infirmier && <Link to="/infirmier" className="lien-espace">Espace infirmier →</Link>}
              <button type="button" className="deconnexion" onClick={async () => { await deconnexion(); nav('/') }}>DÉCONNEXION</button>
            </div>
          </div>
        </aside>
        <main className="contenu">
          <Outlet />
        </main>
      </div>
    </PatientsProvider>
  )
}
