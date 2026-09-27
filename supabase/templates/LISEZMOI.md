# E-mails de l'Hôpital M&M (Supabase Auth + Brevo)

Les e-mails de compte (création, mot de passe oublié…) sont envoyés par Supabase Auth,
**via le relais SMTP de Brevo**, avec les modèles HTML de ce dossier.

| Fichier | Modèle Supabase | Quand |
| --- | --- | --- |
| `confirmation.html` | Confirm signup | **Création de compte** patient |
| `recovery.html` | Reset password | **Mot de passe oublié** → page `/nouveau-mot-de-passe` |
| `magic_link.html` | Magic link | Connexion par lien (si activée) |
| `invite.html` | Invite user | Invitation envoyée depuis Supabase |
| `email_change.html` | Change email address | Changement d'adresse |
| `reauthentication.html` | Reauthentication | Code pour une opération sensible |
| `password_changed_notification.html` | Password changed | Alerte de sécurité |
| `email_changed_notification.html` | Email address changed | Alerte de sécurité |

Les modèles sont générés par `node scripts/generer-emails.mjs` : modifier le script, pas les fichiers HTML.

## 1. Brevo : récupérer les identifiants SMTP

1. Brevo → **Paramètres → SMTP & API → onglet SMTP**.
2. Noter le **login SMTP** (du type `xxxx@smtp-brevo.com`) et générer une **clé SMTP**.
3. Brevo → **Expéditeurs, domaines et IP dédiées** : valider l'adresse d'expédition
   (ex. `hopital@votre-domaine.fr`) et, idéalement, authentifier le domaine (SPF, DKIM).

## 2. Supabase : envoyer par Brevo

Tableau de bord Supabase → projet **hopital-mm** → **Authentication → Emails → SMTP Settings** :

| Champ | Valeur |
| --- | --- |
| Enable custom SMTP | activé |
| Sender email | l'adresse validée dans Brevo |
| Sender name | `Hôpital M&M` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | le login SMTP Brevo |
| Password | la clé SMTP Brevo (jamais dans le dépôt) |

## 3. Supabase : coller les modèles

**Authentication → Emails → Templates** : pour chaque modèle, copier l'**objet** indiqué dans
`supabase/config.toml` et le contenu du fichier HTML correspondant, puis enregistrer.

## 4. Supabase : adresses du site

**Authentication → URL Configuration** :

- **Site URL** : l'adresse du site en production (ex. `https://hosto-mm.vercel.app`).
  Le logo des e-mails est chargé depuis `{{ .SiteURL }}/email/logo.png`.
- **Redirect URLs** : ajouter `https://<site>/nouveau-mot-de-passe` et `https://<site>/patient/lier`.

## Tester

Créer un compte depuis `/inscription`, puis « Mot de passe oublié » sur `/connexion`.
En cas d'e-mail non reçu : Supabase → **Logs → Auth**, et Brevo → **Transactionnel → Logs**.

## Rappel de rendez-vous la veille (automatique)

La fonction `supabase/functions/rappels-rendez-vous` est déployée et appelée chaque jour à
16 h UTC (18 h à Paris l'été, 17 h l'hiver) par la tâche planifiée `rappels-rendez-vous-veille` (pg_cron).
Elle envoie un e-mail à chaque patient ayant un rendez-vous « prévu » le lendemain, une seule fois.

Pour l'activer, deux secrets sont nécessaires : **Supabase → Edge Functions → Secrets** :

| Secret | Valeur |
| --- | --- |
| `BREVO_API_KEY` | clé **API** Brevo (`xkeysib-…`, Brevo → Paramètres → SMTP & API → onglet **Clés API**) — ce n'est pas la clé SMTP |
| `RAPPEL_EXPEDITEUR` | l'adresse d'expédition validée dans Brevo |
| `SITE_URL` (facultatif) | adresse du site, par défaut `https://hosto-mm.vercel.app` |

Sans ces secrets, la fonction ne fait rien. Suivi : Supabase → Edge Functions → rappels-rendez-vous → Logs.
