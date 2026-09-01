// ================================================================
//  PULSAR ECO GROUP — COMPTES & MES PROJETS v11 (point 2)
//  Utilise Firebase (Authentication + Firestore), service gratuit
//  jusqu'à un volume largement suffisant pour démarrer.
//
//  ⚠️ CONFIGURATION REQUISE avant que ce fichier fonctionne :
//  1. Aller sur https://console.firebase.google.com
//  2. Créer un projet (gratuit, "Spark plan")
//  3. Authentication -> Sign-in method -> activer "Email/Password"
//  4. Firestore Database -> Créer une base (mode production)
//  5. Project settings -> vos apps -> "Config" -> copier les 6 valeurs
//     ci-dessous (firebaseConfig)
//  6. Régles Firestore recommandées (Firestore -> Règles) :
//     rules_version = '2';
//     service cloud.firestore {
//       match /databases/{database}/documents {
//         match /projets/{projetId} {
//           allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.uid;
//           allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
//         }
//       }
//     }
// ================================================================

// ================================================================
//  PULSAR ECO GROUP — COMPTES & MES PROJETS
//  Utilise Firebase (Authentication + Firestore).
//  ✅ Configuration déjà remplie avec le projet "pulsar-eco-group".
// ================================================================

var firebaseConfig = {
  apiKey: "AIzaSyDygmPjCKQ4BXrCzz8nNxXvhftMxQbQg-Y",
  authDomain: "pulsar-eco-group.firebaseapp.com",
  projectId: "pulsar-eco-group",
  storageBucket: "pulsar-eco-group.firebasestorage.app",
  messagingSenderId: "255766033995",
  appId: "1:255766033995:web:c4ea6eeaac236ee2893fce"
};

var _fbApp = null, _fbAuth = null, _fbDb = null, _configured = false;

function initFirebase() {
  if (firebaseConfig.apiKey === "VOTRE_API_KEY") {
    console.warn("⚠️ Firebase non configuré : remplissez firebaseConfig dans comptes.js");
    return false;
  }
  _fbApp = firebase.initializeApp(firebaseConfig);
  _fbAuth = firebase.auth();
  _fbDb = firebase.firestore();
  _configured = true;
  return true;
}

function firebaseEstConfigure() { return _configured; }

// ---------------- Authentification ----------------
function creerCompte(email, motDePasse) {
  return _fbAuth.createUserWithEmailAndPassword(email, motDePasse);
}
function seConnecter(email, motDePasse) {
  return _fbAuth.signInWithEmailAndPassword(email, motDePasse);
}
function seDeconnecter() {
  return _fbAuth.signOut();
}
function utilisateurActuel() {
  return _fbAuth ? _fbAuth.currentUser : null;
}
function surChangementAuth(callback) {
  if (_fbAuth) _fbAuth.onAuthStateChanged(callback);
}

// ---------------- Mes Projets ----------------
function creerProjet(nomProjet, typeModule) {
  var user = utilisateurActuel();
  if (!user) return Promise.reject(new Error('Non connecté'));
  var projet = {
    uid: user.uid,
    nomProjet: nomProjet,
    typeModule: typeModule,
    dateCreation: firebase.firestore.FieldValue.serverTimestamp(),
    dateMaj: firebase.firestore.FieldValue.serverTimestamp(),
    etatComplet: { etape: 1, ETAT: {} }
  };
  return _fbDb.collection('projets').add(projet);
}

function sauvegarderProgressionProjet(projetId, etape, etatWizard) {
  return _fbDb.collection('projets').doc(projetId).update({
    dateMaj: firebase.firestore.FieldValue.serverTimestamp(),
    etatComplet: { etape: etape, ETAT: etatWizard }
  });
}

function listerMesProjets() {
  var user = utilisateurActuel();
  if (!user) return Promise.resolve([]);
  return _fbDb.collection('projets').where('uid', '==', user.uid).orderBy('dateMaj', 'desc').get()
    .then(function (snap) {
      var liste = [];
      snap.forEach(function (doc) { liste.push(Object.assign({ id: doc.id }, doc.data())); });
      return liste;
    });
}

function chargerProjet(projetId) {
  return _fbDb.collection('projets').doc(projetId).get().then(function (doc) {
    if (!doc.exists) throw new Error('Projet introuvable');
    return Object.assign({ id: doc.id }, doc.data());
  });
}

function dupliquerProjet(projetId, nouveauNom) {
  return chargerProjet(projetId).then(function (p) {
    return creerProjet(nouveauNom, p.typeModule).then(function (ref) {
      return sauvegarderProgressionProjet(ref.id, p.etatComplet.etape, p.etatComplet.ETAT).then(function () { return ref.id; });
    });
  });
}

function renommerProjet(projetId, nouveauNom) {
  return _fbDb.collection('projets').doc(projetId).update({ nomProjet: nouveauNom });
}

function supprimerProjet(projetId) {
  return _fbDb.collection('projets').doc(projetId).delete();
}
