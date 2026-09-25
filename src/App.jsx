import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth, espaceDe } from './lib/auth.jsx'
import { Chargement } from './components/ui.jsx'
import Accueil from './pages/Accueil.jsx'
import Connexion from './pages/Connexion.jsx'
import Inscription from './pages/Inscription.jsx'
import LierDossier from './pages/LierDossier.jsx'
import NouveauMotDePasse from './pages/NouveauMotDePasse.jsx'
import EspacePatient from './pages/EspacePatient.jsx'
import EspaceInfirmier from './pages/EspaceInfirmier.jsx'
import EspaceMedecin from './pages/medecin/EspaceMedecin.jsx'
import TableauDeBord from './pages/medecin/TableauDeBord.jsx'
import Ordonnance from './pages/medecin/Ordonnance.jsx'
import CompteRendu from './pages/medecin/CompteRendu.jsx'
import EntreeSortie from './pages/medecin/EntreeSortie.jsx'
import Bracelets from './pages/medecin/Bracelets.jsx'
import Scanner from './pages/medecin/Scanner.jsx'
import EditeurLibre from './pages/medecin/EditeurLibre.jsx'
import Lits from './pages/medecin/Lits.jsx'
import Journal from './pages/medecin/Journal.jsx'
import Personnel from './pages/medecin/Personnel.jsx'
import Statistiques from './pages/medecin/Statistiques.jsx'

/** Protège un espace : connexion requise et rôle autorisé. */
function Protege({ roles, children }) {
  const { session, profil, pret } = useAuth()
  if (session === undefined || !pret) return <div className="page"><Chargement /></div>
  if (!session) return <Navigate to="/connexion" replace />
  const ok = roles.some(r => (r === 'medecin' && profil?.medecin) || (r === 'infirmier' && profil?.infirmier) || (r === 'patient' && profil?.patient) || (r === 'compte' && profil))
  return ok ? children : <Navigate to={espaceDe(profil)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Accueil />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/inscription" element={<Inscription />} />
      <Route path="/nouveau-mot-de-passe" element={<NouveauMotDePasse />} />
      <Route path="/patient/lier" element={<Protege roles={['compte']}><LierDossier /></Protege>} />
      <Route path="/patient" element={<Protege roles={['patient']}><EspacePatient /></Protege>} />
      <Route path="/infirmier" element={<Protege roles={['infirmier']}><EspaceInfirmier /></Protege>} />
      <Route path="/medecin" element={<Protege roles={['medecin']}><EspaceMedecin /></Protege>}>
        <Route index element={<TableauDeBord />} />
        <Route path="ordonnance" element={<Ordonnance />} />
        <Route path="compte-rendu" element={<CompteRendu />} />
        <Route path="entree-sortie" element={<EntreeSortie />} />
        <Route path="bracelets" element={<Bracelets />} />
        <Route path="scanner" element={<Scanner />} />
        <Route path="editeur" element={<EditeurLibre />} />
        <Route path="lits" element={<Lits />} />
        <Route path="journal" element={<Journal />} />
        <Route path="personnel" element={<Personnel />} />
        <Route path="statistiques" element={<Statistiques />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
