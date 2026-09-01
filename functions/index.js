// ================================================================
//  PULSAR ECO GROUP — CLOUD FUNCTION : LECTURE DE FICHE TECHNIQUE (point 4)
//  À déployer sur Firebase Functions. Reçoit une image en base64,
//  appelle l'API Claude (vision) pour extraire les caractéristiques
//  techniques, renvoie un JSON structuré prêt à remplir le formulaire.
//
//  ⚠️ CONFIGURATION REQUISE :
//  1. Créer une clé API sur https://console.anthropic.com
//  2. Dans le dossier functions/ :  firebase functions:config:set anthropic.key="VOTRE_CLE"
//     (ou variable d'environnement ANTHROPIC_API_KEY selon votre version de Firebase Functions)
//  3. Déployer :  firebase deploy --only functions
//
//  Coût : chaque lecture de fiche technique consomme un petit appel API
//  Claude (quelques centimes). Prévoyez un budget selon le volume de
//  clients qui utiliseront "+ Nouveau" avec photo.
// ================================================================

const functions = require("firebase-functions");
const fetch = require("node-fetch");

const PROMPTS = {
  panneau: `Tu regardes la fiche technique d'un panneau solaire photovoltaïque. Extrais UNIQUEMENT ces valeurs et réponds en JSON strict, sans texte autour :
{"fabricant":"","modele":"","puissance":0,"voc":0,"icc":0,"vmp":0,"imp":0}
puissance en W, voc/vmp en V, icc/imp en A. Si une valeur est illisible, mets null.`,
  batterie: `Tu regardes la fiche technique d'une batterie de stockage solaire. Extrais UNIQUEMENT ces valeurs et réponds en JSON strict, sans texte autour :
{"fabricant":"","modele":"","type":"","tension":0,"capaciteAh":0,"capaciteWh":0,"dod":0,"cycles":0}
type parmi: "Lithium-LiFePO4","Lithium-ion","GEL","AGM","OPzV / OPzS". tension en V, dod en fraction (ex 0.9 pour 90%). Si illisible, mets null.`,
  onduleur: `Tu regardes la fiche technique d'un onduleur/convertisseur solaire. Extrais UNIQUEMENT ces valeurs et réponds en JSON strict, sans texte autour :
{"fabricant":"","modele":"","puissanceNominale":0,"puissanceCrete":0,"tensionBatMin":0,"tensionBatMax":0,"vocMax":0,"mpptMin":0,"mpptMax":0,"imppMax":0,"type":""}
puissances en W, tensions en V, courant en A. type parmi "Hybride","Off-grid","On-grid". Si illisible, mets null.`
};

exports.lireFicheTechnique = functions.https.onCall(async (data, context) => {
  const { imageBase64, categorie } = data;
  if (!imageBase64 || !PROMPTS[categorie]) {
    throw new functions.https.HttpsError('invalid-argument', 'Image ou catégorie manquante (panneau|batterie|onduleur).');
  }

  const apiKey = functions.config().anthropic ? functions.config().anthropic.key : process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Clé API Anthropic non configurée côté serveur.');
  }

  const mediaType = imageBase64.startsWith('/9j/') ? 'image/jpeg' : 'image/png';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: PROMPTS[categorie] }
        ]
      }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new functions.https.HttpsError('internal', 'Erreur API lecture image : ' + errText);
  }

  const result = await response.json();
  const texte = (result.content || []).map(b => b.text || '').join('').trim();

  try {
    const cleaned = texte.replace(/```json|```/g, '').trim();
    return { donnees: JSON.parse(cleaned) };
  } catch (e) {
    throw new functions.https.HttpsError('internal', 'Réponse IA non exploitable : ' + texte);
  }
});
