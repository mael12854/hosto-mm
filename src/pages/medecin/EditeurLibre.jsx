import Redaction from '../../components/Redaction.jsx'
import { aujourdhui } from '../../lib/format.js'

export default function EditeurLibre() {
  return (
    <Redaction
      outil="Éditeur libre"
      titreDefaut="Document"
      intro="Certificat, arrêt de travail, courrier : rédigez librement un document officiel à l'en-tête de l'hôpital."
      placeholder="Rédigez votre document…"
      modeles={[
        { titre: 'Certificat médical', texte: (p, m) => `Je soussigné ${m}, médecin à l'Hôpital M&M, certifie avoir examiné ce jour ${p?.nomComplet || '…'}.\n\n…\n\nCertificat établi à la demande de l'intéressé et remis en main propre pour faire valoir ce que de droit.\n\nFait le ${aujourdhui()}.` },
        { titre: 'Arrêt de travail', texte: (p, m) => `Je soussigné ${m}, médecin à l'Hôpital M&M, certifie que l'état de santé de ${p?.nomComplet || '…'} nécessite un arrêt de travail du ${aujourdhui()} au … inclus.\n\nSorties autorisées : …\n\nFait le ${aujourdhui()}.` },
        { titre: 'Courrier au médecin traitant', texte: (p, m) => `Cher confrère,\n\nJ'ai vu ce jour ${p?.nomComplet || '…'} pour …\n\n…\n\nBien confraternellement,\n${m}` },
      ]}
    />
  )
}
