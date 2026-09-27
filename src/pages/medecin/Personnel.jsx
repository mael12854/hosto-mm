import { useCallback, useEffect, useState } from 'react'
import { LogoMark, signeInverseSvgTexte, signeSvgTexte } from '../../components/Logo.jsx'
import { Champ, Chargement, EnTeteOutil, Message, Saisie } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { usePatients } from '../../lib/patients.jsx'
import { supabase, messageErreur } from '../../lib/supabase.js'
import { esc, nomComplet } from '../../lib/format.js'
import { imprimer } from '../../lib/impression.js'

/** Badge personnel 85 × 54 mm de la charte : blanc pour les médecins, bleu pour les soins. */
function BadgePersonnel({ nom, fonction, services, soins }) {
  return (
    <div style={{ background: soins ? 'var(--bleu)' : '#fff', border: soins ? 'none' : '1px solid var(--filet-fort)', padding: 14, display: 'flex', gap: 12, alignItems: 'center', color: soins ? 'var(--papier)' : 'inherit' }}>
      <LogoMark variante={soins ? 'inverse' : 'couleur'} size={48} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: soins ? 'var(--papier)' : 'var(--encre)' }}>{nom}</div>
        <div style={{ fontSize: 13, color: soins ? 'var(--papier)' : 'var(--texte)' }}>{fonction}</div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', marginTop: 4, color: soins ? 'var(--bleu-pale)' : 'var(--bleu)' }}>{services.map(s => s.toUpperCase()).join(' · ') || 'SANS SERVICE'}</div>
      </div>
    </div>
  )
}

/** Badge 85 × 54 mm prêt à imprimer (une page par badge). */
function imprimerBadge({ nom, fonction, services, soins }) {
  const signe = soins ? signeInverseSvgTexte : signeSvgTexte
  imprimer({
    titre: `Badge ${nom}`, page: '85mm 54mm', marge: '0',
    style: `body{margin:0;font-family:'Source Sans 3',sans-serif}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.b{box-sizing:border-box;width:85mm;height:54mm;padding:5mm;display:flex;flex-direction:column;justify-content:space-between;background:${soins ? '#1D5C74' : '#fff'};color:${soins ? '#F4F1EA' : '#1E262B'};${soins ? '' : 'border:0.3mm solid #C2BBAC;'}}
.h{display:flex;align-items:center;gap:3mm}.s{width:14mm}.hm{font-weight:700;font-size:10pt}.hm span{color:${soins ? '#D6E7EE' : '#1D5C74'}}
.n{font-size:15pt;font-weight:700;line-height:1.1}.f{font-size:10pt;margin-top:1mm}
.v{font-family:'IBM Plex Mono',monospace;font-size:7pt;letter-spacing:.08em;color:${soins ? '#D6E7EE' : '#1D5C74'};border-top:0.3mm solid ${soins ? '#2C7189' : '#D8D2C6'};padding-top:1.5mm}`,
    corps: `<div class="b"><div class="h"><div class="s">${signe}</div><div class="hm">Hôpital <span>M&amp;M</span></div></div>
<div><div class="n">${esc(nom)}</div><div class="f">${esc(fonction)}</div></div>
<div class="v">${esc((services.join(' · ') || 'Sans service').toUpperCase())}</div></div>`,
  })
}

/** Donne le rôle médecin ou infirmier à un compte déjà créé (fonction nommer_personnel, réservée aux médecins). */
function Nommer({ onFait }) {
  const [f, setF] = useState({ email: '', role: 'infirmier', prenom: '', nom: '' })
  const [msg, setMsg] = useState({})
  const maj = k => v => setF(x => ({ ...x, [k]: v }))
  const nommer = async e => {
    e.preventDefault()
    const { data, error } = await supabase.rpc('nommer_personnel', { p_email: f.email, p_role: f.role, p_prenom: f.prenom.trim(), p_nom: f.nom.trim().toUpperCase() })
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    if (data === 'compte_introuvable') { setMsg({ alerte: "Aucun compte avec cette adresse. La personne doit d'abord créer son compte sur la page d'inscription." }); return }
    setMsg({ succes: `${f.prenom} ${f.nom} est maintenant ${f.role === 'medecin' ? 'médecin' : 'infirmier'}. Rattachez-le à ses services ci-dessous.` })
    setF({ email: '', role: 'infirmier', prenom: '', nom: '' })
    onFait()
  }
  return (
    <form onSubmit={nommer} className="carte-blanche" style={{ display: 'grid', gap: 14 }}>
      <div className="etiquette">Nommer du personnel</div>
      <p style={{ fontSize: 14, color: 'var(--texte)' }}>La personne crée d'abord son compte (page « Créer un compte »), puis vous lui donnez son rôle ici. Personne ne peut plus se déclarer médecin seul.</p>
      <div className="grille-champs">
        <label className="champ"><span>Adresse e-mail du compte</span><input type="email" required className="saisie" value={f.email} onChange={e => maj('email')(e.target.value)} /></label>
        <Champ label="Rôle">
          <select className="saisie" value={f.role} onChange={e => maj('role')(e.target.value)}>
            <option value="infirmier">Infirmier</option><option value="medecin">Médecin</option>
          </select>
        </Champ>
        <Saisie label="Prénom" required valeur={f.prenom} onChange={maj('prenom')} />
        <Saisie label="Nom" required valeur={f.nom} onChange={maj('nom')} />
      </div>
      <div className="rangee-btn"><button type="submit" className="btn">Nommer</button></div>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>
    </form>
  )
}

export default function Personnel() {
  const { profil } = useAuth()
  const { charger: rechargerPatients } = usePatients()
  const [d, setD] = useState(null)
  const [msg, setMsg] = useState({})

  const charger = useCallback(async () => {
    const [m, i, ms, is, s] = await Promise.all([
      supabase.from('medecins').select('*').order('nom'),
      supabase.from('infirmiers').select('*').order('nom'),
      supabase.from('medecin_services').select('*'),
      supabase.from('infirmier_services').select('*'),
      supabase.from('services').select('*').order('nom'),
    ])
    setD({ medecins: m.data || [], infirmiers: i.data || [], ms: ms.data || [], is: is.data || [], services: s.data || [] })
  }, [])
  useEffect(() => { charger() }, [charger])

  if (!d) return <><EnTeteOutil titre="Personnel" /><Chargement /></>
  const nomService = id => d.services.find(s => s.id === id)?.nom || ''
  const svcMed = id => d.ms.filter(x => x.medecin_id === id).map(x => nomService(x.service_id))
  const svcInf = id => d.is.filter(x => x.infirmier_id === id).map(x => nomService(x.service_id))

  const basculer = async (table, colonne, personneId, serviceId, actif) => {
    const ligne = { [colonne]: personneId, service_id: serviceId }
    const { error } = actif
      ? await supabase.from(table).delete().match(ligne)
      : await supabase.from(table).insert(ligne)
    if (error) { setMsg({ alerte: messageErreur(error) }); return }
    setMsg({ succes: 'Rattachement mis à jour.' })
    await charger()
    if (personneId === profil.userId) rechargerPatients()
  }

  const Rattachements = ({ table, colonne, personneId, liens }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {d.services.map(s => {
        const actif = liens.some(x => x[colonne] === personneId && x.service_id === s.id)
        return <button key={s.id} type="button" className={'btn-puce' + (actif ? ' actif' : '')} onClick={() => basculer(table, colonne, personneId, s.id, actif)}>{actif ? '✓ ' : '+ '}{s.nom}</button>
      })}
    </div>
  )

  return (
    <>
      <EnTeteOutil titre="Personnel">Médecins et infirmiers de l'hôpital, et leurs services de rattachement. Un membre du personnel ne voit que les patients de ses services.</EnTeteOutil>
      <Message type="succes">{msg.succes}</Message>
      <Message type="alerte">{msg.alerte}</Message>

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="etiquette">Mes services</div>
        <div className="carte-blanche"><Rattachements table="medecin_services" colonne="medecin_id" personneId={profil.userId} liens={d.ms} /></div>
      </div>

      <Nommer onFait={charger} />

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="etiquette">Médecins · {d.medecins.length}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
          {d.medecins.map(m => (
            <div key={m.id} style={{ display: 'grid', gap: 6 }}>
              <BadgePersonnel nom={nomComplet(m)} fonction="Médecin" services={svcMed(m.id)} />
              <button type="button" className="btn-lien bleu" style={{ justifySelf: 'start' }} onClick={() => imprimerBadge({ nom: nomComplet(m), fonction: 'Médecin', services: svcMed(m.id) })}>IMPRIMER LE BADGE</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="etiquette">Infirmiers · {d.infirmiers.length}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
          {d.infirmiers.map(i => (
            <div key={i.id} style={{ display: 'grid', gap: 8 }}>
              <BadgePersonnel soins nom={nomComplet(i)} fonction="Infirmier" services={svcInf(i.id)} />
              <button type="button" className="btn-lien bleu" style={{ justifySelf: 'start' }} onClick={() => imprimerBadge({ nom: nomComplet(i), fonction: 'Infirmier', services: svcInf(i.id), soins: true })}>IMPRIMER LE BADGE</button>
              <Rattachements table="infirmier_services" colonne="infirmier_id" personneId={i.id} liens={d.is} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
