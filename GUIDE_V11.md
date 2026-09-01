# 🆕 PULSAR ECO GROUP — v11 : Les 6 points intégrés

## Important avant de commencer

Cette v11 **n'a jamais été testée dans un vrai navigateur** de mon côté
(je n'ai pas d'environnement graphique ici) — j'ai vérifié toute la
logique de calcul en ligne de commande (voir plus bas, résultats
exacts), et relu le code avec soin, mais **testez chaque étape
vous-même avant de mettre en ligne pour vos clients**, et signalez-moi
tout ce qui ne s'affiche pas comme prévu.

Contrairement aux versions précédentes, la v11 introduit un vrai
**backend** (comptes clients + sauvegarde en ligne + lecture de photo
par IA). Cette partie **ne fonctionnera pas tant que vous n'aurez pas
fait une configuration Firebase de 5 minutes** — expliquée point par
point ci-dessous. Sans cette configuration, l'app affiche un message
clair et propose un lien "Tester le parcours sans compte" pour que vous
puissiez quand même vérifier tout le reste (calculs, panneaux,
batteries, onduleur, rapport, PDF, 3D).

---

## Récapitulatif des 6 points intégrés

### 1. Stockage — formule + indice Is
```
Base = 30% × Énergie_jour + Énergie_nuit
Énergie à stocker = Base × 1,10
Is = Énergie_nuit / Énergie_totale   (affiché comme jauge visuelle 0→1)
```
Vérifié en ligne de commande : Base=5850 Wh, avec marge=6435 Wh, Is=0,24 — formule conforme.

### 2. Mes Projets / Historique (compte réel)
- Écran de connexion/inscription (email + mot de passe) au chargement de chaque module
- Écran "Mes Projets" : liste, créer, ouvrir, dupliquer, renommer, supprimer
- **Sauvegarde automatique à chaque étape** (`sauvegardeAuto()` appelée à chaque navigation) — corrige définitivement le bug de perte de données au clic retour
- Pas d'espace admin (comme demandé) — chaque client ne voit que ses propres projets
- Un client peut créer plusieurs projets

### 3. Tableau appareils V2
- Colonne "Temps d'utilisation (h)" ajoutée à l'étape 1
- À l'étape 2, la bande horaire se **verrouille automatiquement** dès que le nombre de cases cochées atteint le temps déclaré (cases restantes grisées, `disabled`)
- **Blocage strict** de la validation si un appareil n'a pas exactement son temps déclaré coché, avec message listant précisément quel(s) appareil(s) posent problème

### 4. Bases personnalisables + écran Onduleur + contrôle de compatibilité
- 3 catalogues (Panneaux, Batteries, **Onduleurs — nouveau**) avec de vraies données constructeurs vérifiées cette session : JA Solar JAM72S30-550/MR, batterie Pylontech US3000C (48V/3552Wh), onduleur Deye SUN-5K-SG04LP1-EU — le reste du catalogue utilise des valeurs courantes du marché à affiner avec vos fournisseurs réels
- Bouton "+ Nouveau" sur chaque écran avec **prise de photo** → lecture automatique par IA (Cloud Function, voir configuration plus bas) → remplissage des champs, correction manuelle possible
- **Étape "Choix de l'onduleur"** ajoutée au parcours (entre panneaux et batteries), avec **contrôle de compatibilité automatique** : tension batterie, Voc max, courant MPPT max, puissance nominale — alerte bloquante si incompatible
- Catalogues **généraux, non liés aux comptes clients** (comme demandé)

### 5. Panneaux — jamais un nombre premier, séries longues
Vérifié en ligne de commande :
- 13 panneaux calculés (nombre premier) → ajusté à 14 → factorisé en **7 séries × 2 parallèles**
- 16 panneaux (cas du cours) → **8 séries × 2 parallèles** (identique à l'exemple de formation)
- Le nombre affiché au client est toujours **Ns × N**, jamais le chiffre brut

### 6. Boucle d'optimisation batteries
Vérifié en ligne de commande : pour un cas où retirer une batterie ferait chuter la capacité de -13,9% (au-delà des -10% tolérés), le moteur **conserve** le nombre initial — la logique de sécurité fonctionne (elle ne réduit que si l'écart réel reste dans la marge acceptée).

---

## Configuration Firebase (obligatoire pour comptes + Mes Projets + photo IA)

Gratuit, sans carte bancaire, ~5 minutes.

### Étape A — Créer le projet Firebase
1. Allez sur **https://console.firebase.google.com**
2. "Ajouter un projet" → nommez-le (ex. "pulsar-eco-group") → suivez les étapes par défaut

### Étape B — Activer l'authentification par email
1. Menu de gauche → **Authentication** → "Get started"
2. Onglet "Sign-in method" → activez **"Email/Password"**

### Étape C — Créer la base de données
1. Menu de gauche → **Firestore Database** → "Créer une base de données"
2. Choisissez "Mode production", région proche (ex. `eur3` Europe)
3. Une fois créée : onglet **"Règles"**, remplacez le contenu par :
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projets/{projetId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
    }
  }
}
```
4. Publiez les règles.

### Étape D — Récupérer la configuration
1. Icône ⚙️ (Paramètres du projet) → onglet "Général" → section "Vos applications" → icône `</>` (Web)
2. Donnez un surnom, ne cochez pas Hosting, "Enregistrer l'application"
3. Copiez l'objet `firebaseConfig` affiché

### Étape E — Coller la configuration dans le code
Ouvrez **`comptes-v11.js`**, remplacez le début du fichier :
```javascript
var firebaseConfig = {
  apiKey: "VOTRE_API_KEY",           // ← collez vos vraies valeurs ici
  authDomain: "VOTRE_PROJET.firebaseapp.com",
  projectId: "VOTRE_PROJET",
  storageBucket: "VOTRE_PROJET.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
};
```

À partir de ce moment, comptes + Mes Projets fonctionnent. Testez : créez un compte, un projet, avancez de quelques étapes, revenez à "Mes Projets", rouvrez le projet — il doit reprendre exactement où vous étiez.

---

## Configuration de la lecture de fiche technique par photo (optionnelle mais demandée)

Ceci nécessite de **déployer une fonction serveur** (le navigateur ne
peut pas appeler l'API Claude directement sans exposer votre clé à
tout le monde — c'est pour ça qu'il faut ce détour).

### Étape A — Installer les outils Firebase (une seule fois)
Sur votre ordinateur, terminal :
```bash
npm install -g firebase-tools
firebase login
```

### Étape B — Initialiser les fonctions dans le projet
Depuis le dossier `Pulsar-v8` (qui contient déjà le dossier `functions/` fourni) :
```bash
firebase init functions
```
- Choisissez votre projet Firebase existant
- Langage : JavaScript
- **Ne remplacez pas** les fichiers `functions/index.js` et `functions/package.json` déjà fournis quand on vous le demande

### Étape C — Obtenir une clé API Anthropic
1. Allez sur **https://console.anthropic.com**
2. Créez une clé API (section "API Keys")
3. Prévoyez un petit budget — chaque lecture de photo coûte quelques centimes

### Étape D — Configurer la clé côté serveur (jamais dans le code du site)
```bash
cd functions
firebase functions:config:set anthropic.key="VOTRE_CLE_API"
```

### Étape E — Déployer
```bash
firebase deploy --only functions
```

Une fois déployée, le bouton "📸 Prendre photo" dans les écrans "+ Nouveau" fonctionnera automatiquement — le code client (`lecture-fiche-v11.js`) appelle cette fonction toute seule.

**Si vous ne faites pas cette étape** : les boutons "+ Nouveau" fonctionnent quand même en saisie manuelle, seul le remplissage automatique par photo sera indisponible (message d'erreur clair affiché à l'utilisateur, rien ne casse).

---

## Fichiers ajoutés (rien d'existant modifié)

```
moteur-v11.js         Moteur de calcul (points 1, 5, 6)
catalogues-v11.js     Panneaux/Batteries/Onduleurs + ajouts personnalisés
comptes-v11.js        Authentification + Mes Projets (point 2)
lecture-fiche-v11.js  Appel de la lecture photo (point 4)
rapport-v11.js        Rapport unifié écran+PDF (repris du v10, sections mises à jour)
scene3d-v11.js        3D (repris du v10)
coeff-demarrage-v11.js Coefficients de démarrage (repris du v10)
wizard-v11.js          Parcours complet en 6 étapes
wizard-v11.css         Styles
menage-v11.html / agri-v11.html / entreprise-v11.html
functions/index.js     Cloud Function de lecture photo (à déployer)
functions/package.json
```

## Comment tester

1. Configurez au minimum Firebase (comptes) — étapes A à E ci-dessus
2. `git add . && git commit -m "v11 - stockage Is, onduleur, optimisation, comptes, lecture photo" && git push`
3. Ouvrez `menage-v11.html`, créez un compte test, un projet, parcourez les 6 étapes
4. Vérifiez en particulier : le verrouillage de la bande horaire (étape 2), l'étape onduleur avec son message de compatibilité (étape 4), la jauge Is et le message d'optimisation batteries (étape 5)
5. Une fois satisfait, faites de même pour `agri-v11.html` et `entreprise-v11.html`

Dites-moi tout ce qui coince — j'ajuste directement.
