// Génère les modèles d'e-mails Supabase Auth aux couleurs de l'Hôpital M&M.
// Usage : node scripts/generer-emails.mjs  →  supabase/templates/*.html
// Les variables {{ .ConfirmationURL }}, {{ .Token }}, {{ .SiteURL }}… sont remplacées par Supabase.
import { mkdirSync, writeFileSync } from 'node:fs'

const C = {
  bleu: '#1D5C74', rouge: '#A8331F', encre: '#1E262B', texte: '#48525A', gris: '#656C71',
  papier: '#F4F1EA', fond: '#E7E2D8', filet: '#D8D2C6',
}
const SANS = "'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif"
const MONO = "'IBM Plex Mono', Menlo, Consolas, monospace"

const bouton = (lien, libelle) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px">
  <tr><td bgcolor="${C.bleu}" style="background:${C.bleu}">
    <a href="${lien}" style="display:inline-block;padding:13px 22px;font-family:${SANS};font-size:15px;font-weight:600;color:${C.papier};text-decoration:none">${libelle}</a>
  </td></tr>
</table>`

const code = (valeur, etiquette = 'CODE DE VÉRIFICATION') => `
<p style="margin:18px 0 6px;font-family:${MONO};font-size:11px;letter-spacing:0.1em;color:${C.gris}">${etiquette}</p>
<p style="margin:0;font-family:${MONO};font-size:28px;letter-spacing:0.18em;color:${C.encre}">${valeur}</p>`

const lienSecours = lien => `
<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:${C.gris}">Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br>
<a href="${lien}" style="color:${C.bleu};word-break:break-all">${lien}</a></p>`

const p = t => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:${C.texte}">${t}</p>`

function gabarit({ etiquette, titre, corps, pied = "Vous n'êtes pas à l'origine de cette demande ? Ignorez simplement cet e-mail : rien ne sera modifié." }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${titre} — Hôpital M&amp;M</title>
</head>
<body style="margin:0;padding:0;background:${C.fond};font-family:${SANS};color:${C.texte}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.fond}" style="background:${C.fond}">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
      <tr><td style="padding:0 0 20px">
        <a href="{{ .SiteURL }}" style="text-decoration:none"><img src="{{ .SiteURL }}/email/logo.png" width="220" height="40" alt="Hôpital M&amp;M" style="display:block;border:0;width:220px;height:auto;font-family:${SANS};font-size:22px;font-weight:700;color:${C.bleu}"></a>
      </td></tr>
      <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid ${C.filet};border-top:3px solid ${C.bleu};padding:30px 28px">
        <p style="margin:0 0 10px;font-family:${MONO};font-size:11px;letter-spacing:0.12em;color:${C.bleu}">${etiquette}</p>
        <h1 style="margin:0 0 18px;font-family:${SANS};font-size:24px;line-height:1.2;font-weight:700;color:${C.encre}">${titre}</h1>
        ${corps}
      </td></tr>
      <tr><td style="padding:18px 4px 0">
        <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:${C.gris}">${pied}</p>
        <p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:0.06em;color:${C.gris}">HÔPITAL M&amp;M · L'HÔPITAL DE FAMILLE DE MAËL ET MARIN<br>QUESTIONS : DEMANDER À MAËL OU À MARIN</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
`
}

// [fichier, section config.toml, objet, contenu]
const MODELES = [
  ['confirmation', 'template.confirmation', 'Confirmez votre adresse e-mail — Hôpital M&M', gabarit({
    etiquette: 'CRÉATION DE COMPTE', titre: 'Confirmez votre adresse e-mail',
    corps: p('Bienvenue à l\'Hôpital M&amp;M. Pour activer votre compte <strong style="color:' + C.encre + '">{{ .Email }}</strong>, confirmez votre adresse e-mail.')
      + bouton('{{ .ConfirmationURL }}', 'Confirmer mon adresse')
      + p('<br>Ensuite, liez votre compte à votre dossier avec le numéro inscrit sur votre bracelet et votre date de naissance.')
      + lienSecours('{{ .ConfirmationURL }}'),
    pied: "Vous n'avez pas créé de compte ? Ignorez cet e-mail : aucun compte ne sera activé.",
  })],
  ['recovery', 'template.recovery', 'Réinitialisez votre mot de passe — Hôpital M&M', gabarit({
    etiquette: 'MOT DE PASSE', titre: 'Réinitialisez votre mot de passe',
    corps: p('Une demande de nouveau mot de passe a été faite pour le compte <strong style="color:' + C.encre + '">{{ .Email }}</strong>. Le lien est valable une heure.')
      + bouton('{{ .ConfirmationURL }}', 'Choisir un nouveau mot de passe')
      + code('{{ .Token }}', 'OU SAISISSEZ CE CODE')
      + lienSecours('{{ .ConfirmationURL }}'),
    pied: "Vous n'avez rien demandé ? Ignorez cet e-mail : votre mot de passe actuel reste valable.",
  })],
  ['magic_link', 'template.magic_link', 'Votre lien de connexion — Hôpital M&M', gabarit({
    etiquette: 'CONNEXION', titre: 'Votre lien de connexion',
    corps: p('Cliquez sur le bouton pour vous connecter à l\'Hôpital M&amp;M. Le lien ne sert qu\'une fois.')
      + bouton('{{ .ConfirmationURL }}', 'Me connecter')
      + code('{{ .Token }}', 'OU SAISISSEZ CE CODE')
      + lienSecours('{{ .ConfirmationURL }}'),
  })],
  ['invite', 'template.invite', 'Vous êtes invité à rejoindre l\'Hôpital M&M', gabarit({
    etiquette: 'INVITATION', titre: 'Rejoignez l\'Hôpital M&amp;M',
    corps: p('Vous êtes invité à rejoindre la plateforme de l\'Hôpital M&amp;M. Acceptez l\'invitation pour créer votre compte et choisir votre mot de passe.')
      + bouton('{{ .ConfirmationURL }}', 'Accepter l\'invitation')
      + lienSecours('{{ .ConfirmationURL }}'),
    pied: "Vous ne vous attendiez pas à cette invitation ? Ignorez cet e-mail.",
  })],
  ['email_change', 'template.email_change', 'Confirmez votre nouvelle adresse e-mail — Hôpital M&M', gabarit({
    etiquette: 'ADRESSE E-MAIL', titre: 'Confirmez votre nouvelle adresse',
    corps: p('Vous avez demandé à remplacer <strong style="color:' + C.encre + '">{{ .Email }}</strong> par <strong style="color:' + C.encre + '">{{ .NewEmail }}</strong>.')
      + bouton('{{ .ConfirmationURL }}', 'Confirmer la nouvelle adresse')
      + lienSecours('{{ .ConfirmationURL }}'),
    pied: "Vous n'avez rien demandé ? Ignorez cet e-mail : votre adresse ne changera pas.",
  })],
  ['reauthentication', 'template.reauthentication', 'Votre code de vérification : {{ .Token }}', gabarit({
    etiquette: 'VÉRIFICATION', titre: 'Confirmez votre identité',
    corps: p('Pour terminer cette opération sensible, saisissez ce code dans l\'Hôpital M&amp;M.') + code('{{ .Token }}'),
  })],
  ['password_changed_notification', 'notification.password_changed', 'Votre mot de passe a été modifié — Hôpital M&M', gabarit({
    etiquette: 'SÉCURITÉ', titre: 'Votre mot de passe a été modifié',
    corps: p('Le mot de passe du compte <strong style="color:' + C.encre + '">{{ .Email }}</strong> vient d\'être modifié.')
      + p('C\'était bien vous ? Il n\'y a rien à faire.'),
    pied: "Ce n'était pas vous ? Réinitialisez tout de suite votre mot de passe depuis la page de connexion et prévenez Maël ou Marin.",
  })],
  ['email_changed_notification', 'notification.email_changed', 'Votre adresse e-mail a été modifiée — Hôpital M&M', gabarit({
    etiquette: 'SÉCURITÉ', titre: 'Votre adresse e-mail a été modifiée',
    corps: p('L\'adresse de votre compte est passée de <strong style="color:' + C.encre + '">{{ .OldEmail }}</strong> à <strong style="color:' + C.encre + '">{{ .Email }}</strong>.'),
    pied: "Ce n'était pas vous ? Prévenez tout de suite Maël ou Marin.",
  })],
]

const dossier = new URL('../supabase/templates/', import.meta.url)
mkdirSync(dossier, { recursive: true })
for (const [fichier, , , html] of MODELES) writeFileSync(new URL(fichier + '.html', dossier), html)

// Section à recopier dans supabase/config.toml (CLI) — pour le projet hébergé, voir supabase/templates/LISEZMOI.md
const toml = MODELES.map(([fichier, section, objet]) =>
  `[auth.email.${section}]\n${section.startsWith('notification') ? 'enabled = true\n' : ''}subject = "${objet}"\ncontent_path = "./supabase/templates/${fichier}.html"\n`).join('\n')
writeFileSync(new URL('../supabase/config.toml', import.meta.url), `# Modèles d'e-mails Auth — généré par scripts/generer-emails.mjs\nproject_id = "hopital-mm"\n\n${toml}`)
console.log(`${MODELES.length} modèles générés dans supabase/templates/`)
