// Rappel e-mail la veille d'un rendez-vous — Hôpital M&M.
// Déclenché chaque jour à 18 h (pg_cron). Envoie via l'API Brevo les rappels des rendez-vous
// « prévus » du lendemain (heure de Paris), une seule fois (colonne rappel_envoye_le).
// Secrets à définir dans Supabase (Edge Functions → Secrets) :
//   BREVO_API_KEY       clé API Brevo (xkeysib-…)
//   RAPPEL_EXPEDITEUR   adresse d'expédition validée dans Brevo
//   SITE_URL            (facultatif) adresse du site, pour le logo
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const TZ = "Europe/Paris"
const jourParis = (d: Date) => new Intl.DateTimeFormat("fr-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
const heureParis = (d: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d)
const jourLong = (d: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d)
const esc = (t: string) => String(t ?? "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]!))

function html(site: string, prenom: string, quand: string, heure: string, service: string, motif: string) {
  const SANS = "'Source Sans 3','Segoe UI',Helvetica,Arial,sans-serif", MONO = "'IBM Plex Mono',Menlo,Consolas,monospace"
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#E7E2D8;font-family:${SANS};color:#48525A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#E7E2D8"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 0 20px"><img src="${site}/email/logo.png" width="220" alt="Hôpital M&amp;M" style="display:block;border:0;width:220px;height:auto"></td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #D8D2C6;border-top:3px solid #1D5C74;padding:30px 28px">
<p style="margin:0 0 10px;font-family:${MONO};font-size:11px;letter-spacing:.12em;color:#1D5C74">RAPPEL DE RENDEZ-VOUS</p>
<h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;font-weight:700;color:#1E262B">À demain, ${esc(prenom)}</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55">Vous avez rendez-vous à l'Hôpital M&amp;M :</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="border:1px solid #D8D2C6;width:100%"><tr>
<td style="padding:14px 16px;background:#F4F1EA"><p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:.1em;color:#656C71">DATE</p><p style="margin:2px 0 0;font-size:16px;color:#1E262B;font-weight:600">${esc(quand)}</p></td>
<td style="padding:14px 16px;background:#F4F1EA"><p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:.1em;color:#656C71">HEURE</p><p style="margin:2px 0 0;font-family:${MONO};font-size:22px;color:#1E262B">${esc(heure)}</p></td>
</tr></table>
<p style="margin:16px 0 0;font-size:16px;line-height:1.55">Service : <strong style="color:#1E262B">${esc(service)}</strong>${motif ? `<br>Motif : ${esc(motif)}` : ""}</p>
<p style="margin:16px 0 0;font-size:16px;line-height:1.55">Merci de vous présenter 5 minutes avant l'heure. En cas d'empêchement, écrivez-nous depuis « Mon Hôpital M&amp;M ».</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 0"><tr><td bgcolor="#1D5C74"><a href="${site}/patient" style="display:inline-block;padding:13px 22px;font-size:15px;font-weight:600;color:#F4F1EA;text-decoration:none">Voir mon rendez-vous</a></td></tr></table>
</td></tr>
<tr><td style="padding:18px 4px 0"><p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:.06em;color:#656C71">HÔPITAL M&amp;M · L'HÔPITAL DE FAMILLE DE MAËL ET MARIN</p></td></tr>
</table></td></tr></table></body></html>`
}

Deno.serve(async () => {
  const cle = Deno.env.get("BREVO_API_KEY")
  const expediteur = Deno.env.get("RAPPEL_EXPEDITEUR")
  const site = (Deno.env.get("SITE_URL") || "https://hosto-mm.vercel.app").replace(/\/$/, "")
  if (!cle || !expediteur) {
    return Response.json({ ok: false, erreur: "Secrets BREVO_API_KEY et RAPPEL_EXPEDITEUR à définir dans Supabase (Edge Functions → Secrets)." }, { status: 200 })
  }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  const maintenant = new Date()
  const demain = jourParis(new Date(maintenant.getTime() + 24 * 3600 * 1000))
  const { data: rdvs, error } = await db.from("rendez_vous")
    .select("id, date_heure, motif, patients(prenom, nom, email, auth_id), services(nom)")
    .eq("statut", "prévu").is("rappel_envoye_le", null)
    .gte("date_heure", maintenant.toISOString())
    .lt("date_heure", new Date(maintenant.getTime() + 48 * 3600 * 1000).toISOString())
  if (error) return Response.json({ ok: false, erreur: error.message }, { status: 500 })

  const resultats: Record<string, string> = {}
  for (const r of rdvs ?? []) {
    const d = new Date(r.date_heure)
    if (jourParis(d) !== demain) continue
    // deno-lint-ignore no-explicit-any
    const p = r.patients as any, s = r.services as any
    // E-mail du dossier, sinon celui du compte « Mon Hôpital M&M ».
    let email = p?.email as string | null
    if (!email && p?.auth_id) email = (await db.auth.admin.getUserById(p.auth_id)).data.user?.email ?? null
    if (!email) { resultats[r.id] = "sans e-mail"; continue }
    const envoi = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": cle, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: expediteur, name: "Hôpital M&M" },
        to: [{ email, name: `${p.prenom} ${p.nom}` }],
        subject: `Rappel : rendez-vous demain à ${heureParis(d)} — Hôpital M&M`,
        htmlContent: html(site, p.prenom, jourLong(d), heureParis(d), s?.nom || "", r.motif || ""),
      }),
    })
    if (envoi.ok) {
      await db.from("rendez_vous").update({ rappel_envoye_le: new Date().toISOString() }).eq("id", r.id)
      resultats[r.id] = "envoyé"
    } else {
      resultats[r.id] = `erreur Brevo ${envoi.status}`
    }
  }
  return Response.json({ ok: true, demain, resultats })
})
