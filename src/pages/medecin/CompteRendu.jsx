import Redaction from '../../components/Redaction.jsx'

const MODELE = `MOTIF DE CONSULTATION
…

EXAMEN CLINIQUE
Constantes : T° … °C · FC … · TA …/…
…

CONCLUSION
…

CONDUITE À TENIR
…`

export default function CompteRendu() {
  return (
    <Redaction
      outil="Compte-rendu"
      titreDefaut="Compte-rendu de consultation"
      intro="Rédigez le compte-rendu de consultation ou d'hospitalisation, puis enregistrez-le dans le dossier patient."
      placeholder={MODELE}
      modeles={[
        { titre: 'Compte-rendu de consultation', texte: () => MODELE },
        { titre: "Compte-rendu d'hospitalisation", texte: p => `MOTIF D'HOSPITALISATION\n${p?.sejour?.motif || '…'}\n\nDÉROULÉ DU SÉJOUR\n…\n\nEXAMENS RÉALISÉS\n…\n\nCONCLUSION\n…` },
      ]}
    />
  )
}
