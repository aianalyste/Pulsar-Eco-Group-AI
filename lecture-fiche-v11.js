// ================================================================
//  PULSAR ECO GROUP — LECTURE DE FICHE TECHNIQUE PAR PHOTO (client) v11
//  Point 4 : bouton "Prendre photo" -> lecture IA -> remplissage auto
// ================================================================

function lireFicheParPhoto(fichierInput, categorie, callbackRemplissage, callbackErreur) {
  var fichier = fichierInput.files[0];
  if (!fichier) return;

  var reader = new FileReader();
  reader.onload = function (e) {
    var base64 = e.target.result.split(',')[1]; // retire le préfixe data:image/...;base64,

    if (!firebaseEstConfigure()) {
      callbackErreur('La lecture automatique par photo nécessite la configuration du backend (voir GUIDE_V11.md). Vous pouvez remplir les champs manuellement en attendant.');
      return;
    }

    var fn = firebase.functions().httpsCallable('lireFicheTechnique');
    fn({ imageBase64: base64, categorie: categorie })
      .then(function (result) { callbackRemplissage(result.data.donnees); })
      .catch(function (err) { callbackErreur('Lecture impossible : ' + err.message + '. Remplissez les champs manuellement.'); });
  };
  reader.readAsDataURL(fichier);
}
