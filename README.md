# Hôpital M&M

Site de l'Hôpital M&M — l'hôpital de famille dirigé par Maël et Marin Domenech.
Réalisé d'après la charte de marque v1.0 (Claude Design), en français, connecté à Supabase.

## Espaces

| Adresse | Pour qui | Contenu |
| --- | --- | --- |
| `/` | Tout le monde | Accueil public : l'hôpital, les espaces, infos pratiques |
| `/connexion`, `/inscription` | Tout le monde | Connexion, création d'un compte patient |
| `/medecin` | Médecins | Tableau de bord, Ordonnance, Compte-rendu, Entrée / Sortie, Rendez-vous, Bracelets, Scanner, Éditeur libre, Lits, Journal, Personnel, Statistiques |
| `/infirmier` | Infirmiers | Saisie des constantes, administration des médicaments |
| `/patient` | Patients | Dernière visite, rendez-vous, ordonnances, bulletins de sortie |

Le rôle est déterminé à la connexion : une ligne dans `medecins`, `infirmiers` ou `patients.auth_id`.
Un patient crée son compte puis le lie à son dossier (n° de dossier + date de naissance).
Un membre du personnel ne voit que les patients des services auxquels il est rattaché (règles RLS).

Chaque document (bulletin, ordonnance, compte-rendu, document libre) peut être imprimé, téléchargé
en PDF ou envoyé par e-mail : le bouton ouvre la messagerie avec l'adresse du patient, l'objet et
le texte du document déjà remplis (lien `mailto:`).

## Démarrer

```bash
npm install
cp .env.example .env   # URL et clé publiable du projet Supabase « hopital-mm »
npm run dev            # http://localhost:5173
npm run build          # version de production dans dist/
```

## Déploiement

Site statique (Vite + React). Commande de build `npm run build`, dossier publié `dist`.

- **Vercel** : `vercel.json` contient déjà la configuration (Vite, `dist`, redirections) et les variables
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (valeurs publiques). Importer le dépôt suffit.
- **Netlify** : `public/_redirects` ; ajouter les deux variables dans les réglages du site.

## E-mails

Les e-mails de compte (création, mot de passe oublié…) passent par Supabase Auth et le relais SMTP de Brevo,
avec les modèles aux couleurs de l'hôpital : voir [`supabase/templates/LISEZMOI.md`](supabase/templates/LISEZMOI.md).

## Organisation du code

- `src/index.css` — jetons de la charte (couleurs, typographie Source Sans 3 / IBM Plex Mono, angles droits)
- `src/components/Logo.jsx` — logo et signe en SVG (couleur, blanc, anthracite)
- `src/lib/` — client Supabase, session et rôles, patients, formats français, impression / PDF / e-mail, bracelets QR
- `src/lib/medicaments.js` — répertoire de 432 médicaments `[nom, DCI, classe, forme]`
- `src/pages/` — pages publiques, espaces patient et infirmier ; `src/pages/medecin/` — outils du médecin

## Données Supabase

| Outil | Table |
| --- | --- |
| Entrée / Sortie | `documents_officiels` |
| Ordonnance | `prescriptions` (`contenu`, `lignes`, `pieces_jointes`) + stockage `pieces-jointes/<patient_id>/…` |
| Compte-rendu | `comptes_rendus` (`contenu` lisible + `champs` : rubriques structurées) |
| Éditeur libre | `comptes_rendus` (1re ligne = titre, `champs` vide) |
| Rendez-vous | `rendez_vous` (date et heure, motif, statut prévu / terminé / annulé) |
| Constantes, administrations | `constantes_vitales`, `administrations_medicament` |
| Lits, Journal, Personnel | `lits`, `journal_activite`, `medecins` / `infirmiers` / `*_services` |
