import qrcode from 'qrcode-generator'

// Format du QR des bracelets Hôpital M&M : HMM1|dossier|nom|service|naissance|groupe|allergies
export function payload(d) {
  return 'HMM1|' + [d.dossier, d.nom, d.service, d.naissance, d.groupe, d.allergies].map(x => String(x || '').replace(/\|/g, '/')).join('|')
}

export function lirePayload(txt) {
  if (!txt || !txt.startsWith('HMM1|')) return null
  const [, dossier, nom, service, naissance, groupe, allergies] = txt.split('|')
  return { dossier, nom, service, naissance, groupe, allergies }
}

export function qrDataUrl(texte) {
  try {
    const q = qrcode(0, 'M')
    q.addData(unescape(encodeURIComponent(texte)))
    q.make()
    return q.createDataURL(6, 0)
  } catch {
    return ''
  }
}

export const sansAllergie = t => !t || /^aucune?s?$/i.test(String(t).trim())
