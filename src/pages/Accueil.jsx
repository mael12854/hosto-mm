import { Link } from 'react-router-dom'
import { Logo, LogoMark } from '../components/Logo.jsx'
import { useAuth, espaceDe } from '../lib/auth.jsx'

function Titre({ num, children }) {
  return <div className="titre-section"><span className="num">{num}</span><h2>{children}</h2></div>
}

const ESPACES = [
  ['Espace médecin', 'Ordonnances, comptes-rendus, bulletins d\'entrée / sortie, bracelets et suivi des lits.', true],
  ['Espace infirmier', 'Saisie des constantes et traçabilité de chaque médicament administré.', true],
  ['Mon Hôpital M&M', 'Pour les patients : dernière visite, ordonnances, rendez-vous et consignes de sortie.', false],
]

export default function Accueil() {
  const { session, profil } = useAuth()
  const cible = session ? espaceDe(profil) : '/connexion'
  return (
    <div className="page">
      <header style={{ padding: '56px 0 36px', borderBottom: '3px solid var(--bleu)' }}>
        <div style={{ maxWidth: 420, marginBottom: 40 }}><Logo /></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--bleu)', marginBottom: 16 }}>Hôpital de famille · Ouvert 7j/7</div>
            <h1 style={{ fontSize: 'clamp(34px, 5.6vw, 62px)', lineHeight: 1.02, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--encre)' }}>Soigner sérieusement, expliquer simplement.</h1>
            <p style={{ marginTop: 18, fontSize: 'clamp(17px, 2vw, 21px)', fontWeight: 300, maxWidth: '46ch', color: 'var(--texte)' }}>L'Hôpital M&amp;M accueille toute la famille, sans rendez-vous. Dirigé par Maël et Marin Domenech.</p>
          </div>
          <div style={{ flex: '0 1 300px', background: 'var(--papier)', border: '1px solid var(--filet)', padding: '22px 24px', display: 'grid', gap: 14 }}>
            <div className="etiquette" style={{ fontSize: 12 }}>Accès au dossier</div>
            <Link to={cible} className="btn btn-plein btn-bloc">{session ? 'Ouvrir mon espace' : 'Se connecter'}</Link>
            {!session && <Link to="/inscription" className="btn btn-bloc">Créer un compte patient</Link>}
          </div>
        </div>
      </header>

      <section style={{ padding: '72px 0 0' }}>
        <Titre num="01">L'hôpital</Titre>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 24 }}>
          <div className="carte" style={{ padding: 26 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bleu)', marginBottom: 10 }}>L'histoire</h3>
            <p style={{ fontSize: 15.5, color: 'var(--texte)' }}>L'Hôpital M&amp;M a été fondé à la maison par deux frères, Maël et Marin Domenech. Maël, 10 ans, médecin-chef, tient les dossiers et rédige les ordonnances. Marin, 6 ans, infirmier en chef, prend les constantes et rassure les patients.</p>
          </div>
          <div className="carte" style={{ padding: 26 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bleu)', marginBottom: 10 }}>La mission</h3>
            <p style={{ fontSize: 15.5, color: 'var(--texte)' }}>Chaque patient repart avec un diagnostic clair, une ordonnance lisible et le sentiment d'avoir été écouté. Aucun bobo n'est trop petit pour être noté au dossier.</p>
          </div>
          <div style={{ background: 'var(--bleu)', color: 'var(--papier)', padding: 26 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Nos trois principes</h3>
            <ul style={{ display: 'grid', gap: 12, fontSize: 15.5 }}>
              {["On écrit tout. Un soin non consigné n'a pas eu lieu.", 'On explique avant de soigner.', "Le patient est quelqu'un qu'on aime."].map((t, i) => (
                <li key={t} style={{ display: 'flex', gap: 10 }}><span className="mono" style={{ color: 'var(--bleu-pale)' }}>0{i + 1}</span><span>{t}</span></li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 1, background: 'var(--filet)', border: '1px solid var(--filet)', marginTop: 24 }}>
          {[['Services', '5', 'Urgences, pédiatrie, cardiologie…'], ['Personnel', 'Maël · Marin', "Et l'équipe soignante"], ['Ouverture', '7j/7', "Sauf pendant l'école"], ['Patients', 'Toute la famille', 'Animaux acceptés']].map(([k, v, t]) => (
            <div key={k} style={{ background: 'var(--papier)', padding: '22px 24px' }}>
              <div className="etiquette">{k}</div>
              <div style={{ fontSize: v.length > 6 ? 22 : 26, fontWeight: 700, color: 'var(--encre)' }}>{v}</div>
              <div style={{ fontSize: 14, color: 'var(--texte)' }}>{t}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '72px 0 0' }}>
        <Titre num="02">Les espaces</Titre>
        <p style={{ fontSize: 15.5, color: 'var(--texte)', maxWidth: '62ch', marginBottom: 24 }}>La plateforme compte trois espaces. Même en-tête, même grille : seul le contenu change selon votre rôle.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: 20 }}>
          {ESPACES.map(([titre, texte, bleu]) => (
            <div key={titre} style={{ border: '1px solid var(--filet)', background: '#fff', display: 'grid', gridTemplateRows: 'auto 1fr' }}>
              <div style={{ background: bleu ? 'var(--bleu)' : 'var(--papier)', borderBottom: bleu ? 'none' : '1px solid var(--filet)', color: bleu ? 'var(--papier)' : 'var(--encre)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <LogoMark variante={bleu ? 'inverse' : 'couleur'} size={26} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{titre}</span>
              </div>
              <div style={{ padding: 16, display: 'grid', gap: 14, alignContent: 'space-between' }}>
                <p style={{ fontSize: 14.5, color: 'var(--texte)' }}>{texte}</p>
                <Link to={cible} className="btn btn-bloc">Accéder</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '72px 0 0' }}>
        <Titre num="03">Infos pratiques</Titre>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 18 }}>
          {[['Urgences', 'Signalez-vous tout de suite à un soignant : vous êtes pris en charge en priorité.'], ['Salle d\'attente', 'Asseyez-vous, on vous appelle. Couloir, porte 2.'], ['Vos documents', 'Ordonnances et consignes de sortie sont dans « Mon Hôpital M&M ».']].map(([k, t]) => (
            <div key={k} className="carte"><h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--encre)', marginBottom: 8 }}>{k}</h3><p style={{ fontSize: 15, color: 'var(--texte)' }}>{t}</p></div>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: 72, borderTop: '3px solid var(--bleu)', paddingTop: 26, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 200, maxWidth: '50%' }}><Logo /></div>
        <p className="mono" style={{ fontSize: 11.5, letterSpacing: '0.06em', color: 'var(--gris)', textAlign: 'right' }}>HÔPITAL M&amp;M · {new Date().getFullYear()}<br />QUESTIONS : DEMANDER À MAËL OU À MARIN</p>
      </footer>
    </div>
  )
}
