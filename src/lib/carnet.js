// Carnet de santé imprimable — livret A5 aux couleurs de la charte.
import { supabase } from './supabase.js'
import { aujourdhui, date, dateHeure, esc, nombre } from './format.js'
import { logoSvgTexte, signeSvgTexte } from '../components/Logo.jsx'

const BLEU = '#1D5C74', ROUGE = '#A8331F', ENCRE = '#1E262B', GRIS = '#656C71', FILET = '#D8D2C6', SERIE = '#17739C'

function age(naissance) {
  if (!naissance) return ''
  const n = new Date(naissance + 'T12:00:00'), a = new Date()
  let mois = (a.getFullYear() - n.getFullYear()) * 12 + a.getMonth() - n.getMonth()
  if (a.getDate() < n.getDate()) mois--
  return mois < 24 ? `${mois} mois` : `${Math.floor(mois / 12)} ans`
}

/** Petite courbe SVG (une série) pour l'impression : axes gradués, points, dernière valeur étiquetée. */
function svgCourbe(points, unite, decimales = 1) {
  const pts = points.filter(p => p.v != null).map(p => ({ t: new Date(p.t).getTime(), v: Number(p.v) })).sort((a, b) => a.t - b.t)
  const W = 360, H = 150, g = 36, d = 44, h = 10, b = 22
  if (!pts.length) return `<div class="vide">Aucune mesure — reporter les mesures dans le tableau ci-dessous.</div>`
  let t0 = pts[0].t, t1 = pts[pts.length - 1].t
  if (t0 === t1) { t0 -= 86400000 * 30; t1 += 86400000 * 30 }
  let v0 = Math.min(...pts.map(p => p.v)), v1 = Math.max(...pts.map(p => p.v))
  const m = (v1 - v0) * 0.15 || 1; v0 -= m; v1 += m
  const x = t => g + ((t - t0) / (t1 - t0)) * (W - g - d)
  const y = v => h + (1 - (v - v0) / (v1 - v0)) * (H - h - b)
  const fr = v => Number(v).toLocaleString('fr-FR', { maximumFractionDigits: decimales })
  const grad = [0, 1, 2, 3].map(i => v0 + ((v1 - v0) * i) / 3)
  const dates = [t0, (t0 + t1) / 2, t1]
  const fmtT = t => new Date(t).toLocaleDateString('fr-FR', t1 - t0 > 300 * 86400000 ? { month: '2-digit', year: 'numeric' } : { day: '2-digit', month: '2-digit' })
  const der = pts[pts.length - 1]
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">
${grad.map(v => `<line x1="${g}" x2="${W - d}" y1="${y(v)}" y2="${y(v)}" stroke="#EAE6DC"/><text x="${g - 5}" y="${y(v) + 3}" font-size="8" text-anchor="end" fill="${GRIS}" font-family="IBM Plex Mono,monospace">${fr(v)}</text>`).join('')}
${dates.map(t => `<text x="${x(t)}" y="${H - 6}" font-size="8" text-anchor="middle" fill="${GRIS}" font-family="IBM Plex Mono,monospace">${fmtT(t)}</text>`).join('')}
${pts.length > 1 ? `<polyline fill="none" stroke="${SERIE}" stroke-width="1.6" stroke-linejoin="round" points="${pts.map(p => `${x(p.t)},${y(p.v)}`).join(' ')}"/>` : ''}
${pts.map(p => `<circle cx="${x(p.t)}" cy="${y(p.v)}" r="2.8" fill="${SERIE}" stroke="#fff" stroke-width="1.2"/>`).join('')}
<text x="${x(der.t) + 6}" y="${y(der.v) + 3}" font-size="9" font-weight="600" fill="${ENCRE}" font-family="IBM Plex Mono,monospace">${fr(der.v)} ${unite}</text>
</svg>`
}

const STYLE = `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:'Source Sans 3',sans-serif;color:${ENCRE};font-size:10pt;line-height:1.4;background:#fff}
.page{height:182mm;display:flex;flex-direction:column;gap:4mm;page-break-after:always;break-after:page;overflow:hidden;position:relative}
.page:last-child{page-break-after:auto;break-after:auto}
.tete{display:flex;justify-content:space-between;align-items:baseline;border-bottom:0.6mm solid ${BLEU};padding-bottom:2mm}
.tete h2{margin:0;font-size:14pt;color:${ENCRE}}.tete .n{font-family:'IBM Plex Mono',monospace;font-size:8pt;color:${BLEU}}
.pied{margin-top:auto;display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:7pt;color:${GRIS};border-top:0.2mm solid ${FILET};padding-top:1.5mm}
.k{font-family:'IBM Plex Mono',monospace;font-size:7pt;letter-spacing:.08em;color:${GRIS};text-transform:uppercase}
.v{font-size:11pt;color:${ENCRE};min-height:5mm}
.grille{display:grid;grid-template-columns:1fr 1fr;gap:3mm 5mm}
.case{border-bottom:0.2mm solid ${FILET};padding-bottom:1.5mm}
.alerte{border:0.5mm solid ${ROUGE};padding:2.5mm 3mm}.alerte .k{color:${ROUGE}}.alerte .v{color:${ROUGE};font-weight:700}
table{width:100%;border-collapse:collapse;font-size:9pt}
th{font-family:'IBM Plex Mono',monospace;font-size:7pt;letter-spacing:.06em;color:${GRIS};font-weight:400;text-align:left;border-bottom:0.3mm solid ${BLEU};padding:1.2mm 1.5mm;text-transform:uppercase}
td{border-bottom:0.2mm solid ${FILET};padding:1.4mm 1.5mm;height:6.5mm;vertical-align:top}
td.m{font-family:'IBM Plex Mono',monospace}
.vide{font-size:9pt;color:${GRIS};border:0.2mm dashed #C2BBAC;padding:3mm;text-align:center}
.courbes{display:grid;grid-template-columns:1fr;gap:2mm}
.titre-c{font-size:9pt;font-weight:600;margin:0 0 1mm}.titre-c span{font-family:'IBM Plex Mono',monospace;font-size:7pt;color:${GRIS}}
.lignes div{border-bottom:0.2mm solid ${FILET};height:7mm}
/* Couverture : bandeau bleu en bordure (imprimé même sans « arrière-plans ») */
.couv{border-top:12mm solid ${BLEU};border-bottom:1.2mm solid ${ROUGE};padding:10mm 2mm 4mm;justify-content:space-between}
.couv .sig{width:36mm}
.couv h1{font-size:32pt;line-height:1;margin:0;letter-spacing:-.02em;color:${ENCRE}}
.couv .sous{font-size:12pt;font-weight:300;margin-top:3mm;color:${BLEU}}
.couv .id{border-top:0.5mm solid ${BLEU};padding-top:4mm;display:grid;gap:1mm}
.couv .id .nom{font-size:18pt;font-weight:700;color:${ENCRE}}.couv .id .mono{font-family:'IBM Plex Mono',monospace;font-size:8.5pt;letter-spacing:.08em;color:${GRIS}}
.couv .logo{width:52mm}
`

/** Ouvre le carnet de santé du patient, prêt à imprimer (A5, une rubrique par page). */
export async function imprimerCarnet(patient) {
  const w = window.open('', '_blank')
  if (!w) { alert('Autorisez les fenêtres surgissantes pour imprimer.'); return }
  w.document.write('<p style="font-family:sans-serif;padding:20px">Préparation du carnet…</p>')

  const q = t => supabase.from(t).select('*').eq('patient_id', patient.id)
  const maintenant = new Date().toISOString()
  const [mes, vac, hos, ex, rdv, cst] = await Promise.all([
    q('mesures_croissance').order('date_mesure'),
    q('vaccinations').order('date_vaccination'),
    q('hospitalisations').order('date_entree', { ascending: false }),
    q('examens_laboratoire').eq('statut', 'disponible').order('date_resultat', { ascending: false }).limit(8),
    q('rendez_vous').eq('statut', 'prévu').gte('date_heure', maintenant).order('date_heure').limit(6),
    q('constantes_vitales').order('date_mesure', { ascending: false }).limit(1),
  ])
  const mesures = mes.data || [], vaccins = vac.data || [], sejours = hos.data || []
  const examens = ex.data || [], rdvs = rdv.data || [], derniere = cst.data?.[0]
  const nom = `${patient.prenom || ''} ${patient.nom || ''}`.trim()
  const service = patient.services?.nom || patient.service || ''
  let n = 0
  const pied = () => `<div class="pied"><span>CARNET DE SANTÉ · ${esc(nom.toUpperCase())}</span><span>HÔPITAL M&amp;M · P. ${++n}</span></div>`
  const tete = (titre, num) => `<div class="tete"><h2>${esc(titre)}</h2><span class="n">${num}</span></div>`
  const vides = (nb, cols) => Array.from({ length: nb }, () => `<tr>${'<td></td>'.repeat(cols)}</tr>`).join('')
  const derTaille = [...mesures].reverse().find(x => x.taille_cm), derPoids = [...mesures].reverse().find(x => x.poids_kg)

  const pages = [
    // 1. Couverture
    `<section class="page couv">
      <div class="sig">${signeSvgTexte}</div>
      <div><h1>Carnet<br>de santé</h1><div class="sous">Suivi médical, croissance et vaccinations</div></div>
      <div class="id">
        <div class="mono">PATIENT</div><div class="nom">${esc(nom)}</div>
        <div class="mono">NÉ(E) LE ${esc(date(patient.date_naissance) || '—')} · DOSSIER ${esc(patient.numero_dossier || '—')}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:6mm"><div class="logo">${logoSvgTexte}</div><span class="mono">ÉDITÉ LE ${aujourdhui()}</span></div>
      </div>
    </section>`,
    // 2. Identité & informations d'urgence
    `<section class="page">${tete('Identité & urgence', '01')}
      <div class="grille">
        ${[['Nom', patient.nom], ['Prénom', patient.prenom], ['Date de naissance', date(patient.date_naissance)], ['Âge', age(patient.date_naissance)],
          ['Sexe', patient.sexe === 'F' ? 'Féminin' : patient.sexe === 'M' ? 'Masculin' : ''], ['Groupe sanguin', patient.groupe_sanguin],
          ['N° de dossier', patient.numero_dossier], ['IPP', patient.ipp], ['Service', service], ['Chambre / lit', patient.num_chambre]]
          .map(([k, v]) => `<div class="case"><div class="k">${k}</div><div class="v">${esc(v || '')}</div></div>`).join('')}
      </div>
      <div class="alerte"><div class="k">Allergies connues</div><div class="v">${esc(patient.allergies || 'Aucune connue')}</div></div>
      <div class="case"><div class="k">Antécédents médicaux et chirurgicaux</div><div class="v" style="white-space:pre-wrap;min-height:14mm">${esc(patient.antecedents || '')}</div></div>
      <div class="case"><div class="k">En cas d'urgence, prévenir</div><div class="v" style="min-height:10mm"></div></div>
      <div class="case"><div class="k">Médecins de l'hôpital</div><div class="v">Dr Maël DOMENECH · Marin DOMENECH, infirmier en chef</div></div>
      ${pied()}</section>`,
    // 3. Croissance
    `<section class="page">${tete('Croissance', '02')}
      <div class="grille" style="grid-template-columns:repeat(3,1fr)">
        <div class="case"><div class="k">Dernière taille</div><div class="v">${derTaille ? `${nombre(derTaille.taille_cm)} cm` : '—'}</div></div>
        <div class="case"><div class="k">Dernier poids</div><div class="v">${derPoids ? `${nombre(derPoids.poids_kg)} kg` : '—'}</div></div>
        <div class="case"><div class="k">IMC</div><div class="v">${derTaille && derPoids ? nombre((derPoids.poids_kg / (derTaille.taille_cm / 100) ** 2).toFixed(1)) : '—'}</div></div>
      </div>
      <div class="courbes">
        <div><p class="titre-c">Taille <span>CM</span></p>${svgCourbe(mesures.map(x => ({ t: x.date_mesure + 'T12:00:00', v: x.taille_cm })), 'cm')}</div>
        <div><p class="titre-c">Poids <span>KG</span></p>${svgCourbe(mesures.map(x => ({ t: x.date_mesure + 'T12:00:00', v: x.poids_kg })), 'kg')}</div>
      </div>
      ${pied()}</section>`,
    // 4. Tableau des mesures (avec lignes à compléter)
    `<section class="page">${tete('Mesures', '03')}
      <table><thead><tr><th style="width:24%">Date</th><th>Âge</th><th>Taille (cm)</th><th>Poids (kg)</th><th>P. crânien (cm)</th></tr></thead>
      <tbody>${mesures.map(x => `<tr><td class="m">${date(x.date_mesure)}</td><td>${patient.date_naissance ? (() => { const nn = new Date(patient.date_naissance + 'T12:00:00'), a = new Date(x.date_mesure + 'T12:00:00'); const mo = (a.getFullYear() - nn.getFullYear()) * 12 + a.getMonth() - nn.getMonth(); return mo < 24 ? `${mo} mois` : `${Math.floor(mo / 12)} ans` })() : ''}</td><td class="m">${x.taille_cm ? nombre(x.taille_cm) : ''}</td><td class="m">${x.poids_kg ? nombre(x.poids_kg) : ''}</td><td class="m">${x.perimetre_cranien_cm ? nombre(x.perimetre_cranien_cm) : ''}</td></tr>`).join('')}
      ${vides(Math.max(4, 16 - mesures.length), 5)}</tbody></table>
      ${pied()}</section>`,
    // 5. Vaccinations
    `<section class="page">${tete('Vaccinations', '04')}
      <table><thead><tr><th style="width:22%">Date</th><th>Vaccin</th><th>Dose</th><th>Lot</th><th style="width:18%">Visa</th></tr></thead>
      <tbody>${vaccins.map(x => `<tr><td class="m">${date(x.date_vaccination)}</td><td>${esc(x.vaccin)}</td><td>${esc(x.dose || '')}</td><td class="m">${esc(x.lot || '')}</td><td></td></tr>`).join('')}
      ${vides(Math.max(4, 15 - vaccins.length), 5)}</tbody></table>
      ${pied()}</section>`,
    // 6. Suivi : séjours, examens, rendez-vous
    `<section class="page">${tete('Suivi médical', '05')}
      <div class="k">Hospitalisations</div>
      <table><thead><tr><th>Entrée</th><th>Sortie</th><th>Motif</th></tr></thead><tbody>
      ${sejours.length ? sejours.slice(0, 5).map(s => `<tr><td class="m">${date(s.date_entree)}</td><td class="m">${s.date_sortie ? date(s.date_sortie) : 'en cours'}</td><td>${esc(s.motif || '')}</td></tr>`).join('') : vides(2, 3)}</tbody></table>
      <div class="k">Résultats d'examens</div>
      <table><thead><tr><th>Date</th><th>Examen</th><th>Résultat</th></tr></thead><tbody>
      ${examens.length ? examens.slice(0, 5).map(x => `<tr><td class="m">${date(x.date_resultat)}</td><td>${esc(x.type_examen)}</td><td>${esc(x.resultat || '')}</td></tr>`).join('') : vides(2, 3)}</tbody></table>
      <div class="k">Prochains rendez-vous</div>
      <table><tbody>${rdvs.length ? rdvs.map(r => `<tr><td class="m" style="width:40%">${dateHeure(r.date_heure)}</td><td>${esc(r.motif || 'Consultation')}</td></tr>`).join('') : vides(2, 2)}</tbody></table>
      ${derniere ? `<div class="k">Dernières constantes · ${dateHeure(derniere.date_mesure)}</div><div class="v" style="font-family:'IBM Plex Mono',monospace;font-size:9pt">T° ${derniere.temperature != null ? nombre(derniere.temperature) + ' °C' : '—'} · FC ${derniere.pouls ?? '—'} · TA ${derniere.tension_systolique ? `${derniere.tension_systolique}/${derniere.tension_diastolique ?? ''}` : '—'} · SpO₂ ${derniere.saturation ?? '—'} %</div>` : ''}
      ${pied()}</section>`,
    // 7. Notes du médecin
    `<section class="page">${tete('Notes & consultations', '06')}
      <div class="lignes">${Array.from({ length: 21 }, () => '<div></div>').join('')}</div>
      ${pied()}</section>`,
  ]

  w.document.open()
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Carnet de santé — ${esc(nom)}</title>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>@page{size:A5;margin:10mm}${STYLE}</style></head><body>${pages.join('')}</body></html>`)
  w.document.close()
  setTimeout(() => { try { w.focus(); w.print() } catch { /* fenêtre fermée */ } }, 900)
}
