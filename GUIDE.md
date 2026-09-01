# 🆕 PULSAR ECO GROUP — VERSION FINALE (fusion v9 + v10 + v11)

## Ce qui a changé

Il n'existe plus de "v9", "v10", "v11" séparées. Tout est fusionné en
**une seule version**, qui remplace directement `menage.html`,
`agri.html`, `entreprise.html`, et `index.html`. Toutes les
fonctionnalités validées sont incluses :

- Bilan énergétique jour/nuit, pointe de démarrage réelle (coefficients d'appareils inductifs)
- Tableau appareils avec temps d'utilisation + verrouillage de la bande horaire
- Stockage batterie : `(30%×jour + nuit) × 1,10` + indice de stockage Is
- Panneaux : jamais un nombre premier, séries longues privilégiées
- Boucle d'optimisation du nombre de batteries (économie client, écart ≤10%)
- Étape "Choix de l'onduleur" avec contrôle de compatibilité automatique
- Catalogues personnalisables (panneaux/batteries/onduleurs) + lecture de fiche technique par photo
- Comptes clients réels (email/mot de passe) + "Mes Projets" (sauvegarde auto, reprise, duplication)
- Rapport unique écran + PDF (jamais de désynchronisation), marque blanche (nom/logo client)
- Nouvelle scène 3D (fond blanc, panneaux groupés en blocs)

## ⚠️ RISQUE IMPORTANT — à lire avant de déployer

Cette version finale **exige un compte client (email + mot de passe)**
pour utiliser l'application, en plus de votre abonnement payant existant.
Cela signifie concrètement :

**Si vous mettez ceci en ligne sans configurer Firebase au préalable,
AUCUN client ne pourra utiliser le site du tout** — l'écran de
connexion affichera un message d'erreur au lieu du formulaire habituel.
Ce n'est pas une fonctionnalité en moins, c'est un blocage total.

👉 **Ne remplacez pas `index.html` en production tant que vous n'avez
pas terminé la configuration Firebase ci-dessous et tout testé.**

---

## Fichiers de cette version (remplacent les anciens)

```
index.html          Page d'accueil (une seule version par module)
menage.html          )
agri.html             )  Les 3 modules, parcours complet en 6 étapes
entreprise.html      )
moteur.js            Moteur de calcul complet
catalogues.js        Panneaux / Batteries / Onduleurs + ajouts personnalisés
comptes.js           Comptes clients + Mes Projets (Firebase)
lecture-fiche.js     Lecture de fiche technique par photo
rapport.js           Rapport unifié écran + PDF, marque blanche
scene3d.js           Visualisation 3D
coeff-demarrage.js   65 coefficients de démarrage
wizard.js / wizard.css   Parcours complet
functions/            Cloud Function (lecture photo) — à déployer séparément
```

Les anciens fichiers `ai-engine.js`, `menage-v9.*`, `*-v10.*`, `*-v11.*`
ne sont plus utilisés par le site — vous pouvez les supprimer du dépôt
une fois cette version validée (optionnel, ils ne gênent pas s'ils restent).

---

## Configuration Firebase (OBLIGATOIRE — 5 minutes, gratuit)

### A — Créer le projet
1. https://console.firebase.google.com → "Ajouter un projet"

### B — Authentification par email
Authentication → Sign-in method → activer "Email/Password"

### C — Base de données
Firestore Database → Créer (mode production) → onglet Règles → coller :
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

### D — Récupérer la configuration
⚙️ Paramètres du projet → Vos applications → `</>` Web → copier `firebaseConfig`

### E — Coller dans le code
Ouvrez `comptes.js`, remplacez les 6 valeurs en haut du fichier par les vôtres.

### F (optionnelle) — Lecture de fiche technique par photo
Nécessite en plus une clé API Anthropic + déploiement de la Cloud Function
(`functions/index.js`). Détail complet :
```bash
npm install -g firebase-tools
firebase login
firebase init functions   # dans le dossier du projet, ne pas écraser functions/index.js
cd functions
firebase functions:config:set anthropic.key="VOTRE_CLE_API"
firebase deploy --only functions
```
Sans cette étape, "+ Nouveau" reste utilisable en saisie manuelle uniquement.

---

## Déploiement

```bash
git add .
git commit -m "Version finale consolidee (v9+v10+v11 fusionnees)"
git push
```

## Test avant mise en ligne réelle

1. Configurez Firebase (étapes A à E, obligatoires)
2. Testez `menage.html` : créez un compte, un projet, parcourez les 6 étapes jusqu'au rapport + PDF
3. Faites de même pour `agri.html` et `entreprise.html`
4. Vérifiez en particulier : verrouillage de la bande horaire (étape 2), message de compatibilité onduleur (étape 4), jauge Is + optimisation batteries (étape 5)
5. Seulement après validation complète, considérez le site comme prêt pour vos vrais clients

Dites-moi ce qui ne fonctionne pas, je corrige directement.
