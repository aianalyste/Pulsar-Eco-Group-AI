// ================================================================
//  PULSAR ECO GROUP — CATALOGUES PARTAGÉS (Firestore)
//  Quand un utilisateur ajoute un panneau/batterie/onduleur via
//  "+ Nouveau", il devient visible pour TOUT LE MONDE, pas seulement
//  sur son propre navigateur. Nécessite Firebase configuré (comptes.js)
//  et les règles Firestore mises à jour (voir GUIDE).
//
//  ⚠️ Doit être chargé APRÈS comptes.js (utilise firebase.firestore())
// ================================================================

var COLLECTIONS_PARTAGEES = {
  panneaux: 'catalogue_panneaux',
  batteries: 'catalogue_batteries',
  onduleurs: 'catalogue_onduleurs'
};

function chargerCataloguesPartages() {
  var db = firebase.firestore();
  var cibles = { panneaux: PANNEAUX_CATALOGUE, batteries: BATTERIES_CATALOGUE, onduleurs: ONDULEURS_CATALOGUE };

  Object.keys(COLLECTIONS_PARTAGEES).forEach(function (categorie) {
    db.collection(COLLECTIONS_PARTAGEES[categorie]).get().then(function (snap) {
      snap.forEach(function (doc) {
        var deja = cibles[categorie].some(function (c) { return c.id === doc.id; });
        if (deja) return; // évite les doublons si rappelé plusieurs fois
        var d = doc.data();
        d.id = doc.id;
        cibles[categorie].push(d);
      });
    }).catch(function (e) {
      console.warn('Chargement du catalogue partagé "' + categorie + '" échoué :', e.message);
    });
  });
}

// Sauvegarde un composant ajouté par un utilisateur pour TOUS les autres.
// categorie: 'panneaux' | 'batteries' | 'onduleurs'
// tableauLocal: le tableau JS à mettre à jour immédiatement (affichage instantané)
// callback(saved) : appelé une fois l'ajout confirmé (ou en repli local)
function sauvegarderComposantPartage(categorie, composant, tableauLocal, callback) {
  if (!firebaseEstConfigure()) {
    // Repli : pas de compte cloud disponible, on garde en local uniquement
    var savedLocal = sauvegarderComposantPersonnalise(categorie, composant);
    tableauLocal.push(savedLocal);
    alert('⚠️ Comptes non configurés : cet ajout reste uniquement sur votre appareil, il ne sera pas visible par les autres utilisateurs.');
    callback(savedLocal);
    return;
  }

  composant.source = 'ajouté par un utilisateur';
  composant.dateAjout = firebase.firestore.FieldValue.serverTimestamp();
  var user = (typeof utilisateurActuel === 'function') ? utilisateurActuel() : null;
  composant.ajoutePar = user ? user.email : 'inconnu';

  firebase.firestore().collection(COLLECTIONS_PARTAGEES[categorie]).add(composant)
    .then(function (ref) {
      composant.id = ref.id;
      tableauLocal.push(composant);
      callback(composant);
    })
    .catch(function (e) {
      alert('⚠️ Échec de l\'enregistrement partagé (' + e.message + '). Ajout conservé localement uniquement.');
      var savedLocal = sauvegarderComposantPersonnalise(categorie, composant);
      tableauLocal.push(savedLocal);
      callback(savedLocal);
    });
}