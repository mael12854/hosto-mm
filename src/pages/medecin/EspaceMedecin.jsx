import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogoMark } from '../../components/Logo.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { PatientsProvider } from '../../lib/patients.jsx'
import { nomMedecin } from '../../lib/format.js'

const OUTILS = [
  ['', 'Tableau de bord'],
  ['ordonnance', 'Ordonnance'],
  ['compte-rendu', 'Compte-rendu'],
  ['entree-sortie', 'Entrée / Sortie'],
  ['rendez-vous', 'Rendez-vous'],
  ['bracelets', 'Bracelets'],
  ['scanner', 'Scanner'],
  ['editeur', 'Éditeur libre'],
  ['lits', 'Lits'],
  ['journal', 'Journal'],
  ['personnel', 'Personnel'],
  ['statistiques', 'Statistiques'],
]

export default function EspaceMedecin() {
  const { profil, deconnexion } = useAuth()
  const nav = useNavigate()
  return (
    <PatientsProvider>
      <div className="coque">
        <aside className="barre no-print">
          <div className="barre-interne">
            <Link to="/medecin" className="barre-marque">
              <LogoMark variante="inverse" size={30} />
              <div><div className="nom">Hôpital M&amp;M</div><div className="espace">ESPACE MÉDECIN</div></div>
            </Link>
            <nav aria-label="Outils">
              {OUTILS.map(([chemin, libelle]) => (
                <NavLink key={chemin} to={chemin ? `/medecin/${chemin}` : '/medecin'} end={!chemin}>{libelle}</NavLink>
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
