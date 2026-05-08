# 📋 PULSAR ECO GROUP — Guide Administrateur Complet

## 🗂️ Structure des fichiers

```
Pulsar-Eco-Group/
├── index.html          → Page d'accueil + choix profil
├── menage.html         → Module Ménage
├── agri.html           → Module Agricole
├── entreprise.html     → Module Entreprises
├── paiement.js         ⭐ Abonnements + FedaPay
├── ai-engine.js        ⭐ Moteur IA (calculs FES12)
├── guide.js            ⭐ Guide interactif avec doigt
├── ville-data.js       ⭐ Base données +60 villes africaines
├── ville-input.js      ⭐ Champ ville + OpenStreetMap
├── menage.js / agri.js / entre.js → Logiques modules
├── form.css / style.css → Styles
└── images/             → Images et panneaux Gemini
```

---

## 1️⃣ Ajouter un utilisateur GRATUIT

**Fichier :** `paiement.js` — Cherchez `var COMPTES_GRATUITS`

```javascript
var COMPTES_GRATUITS = [
  { contact: 'blanckombate93@gmail.com', nom: 'Admin Blanck' },
  { contact: '92196727',                 nom: 'Frère Admin' },
  // Ajoutez ici :
  { contact: 'nouveau@email.com',        nom: 'Nom Patron' },
  { contact: '90000000',                 nom: 'Autre Personne' },
];
```

Sauvegardez → `git add . → git commit -m "Ajout utilisateur gratuit" → git push`

---

## 2️⃣ Modifier les tarifs d'abonnement

**Fichier :** `paiement.js` — Cherchez `var PLANS`

```javascript
var PLANS = [
  { id:'heure',   prix: 500,    ... },  // ← modifiez le prix ici
  { id:'jour',    prix: 1000,   ... },
  { id:'semaine', prix: 3000,   ... },
  { id:'mois',    prix: 15000,  ... },
  { id:'annee',   prix: 100000, ... }
];
```

---

## 3️⃣ Passer du mode TEST au mode LIVE FedaPay

**Fichier :** `paiement.js` — Cherchez `CLÉS API FEDAPAY`

```javascript
// MODE TEST (actuel — pour les tests)
var FEDAPAY_PUBLIC_KEY = 'pk_sandbox_8xx1MmQ0UypP-74eMT1I7txl';
var FEDAPAY_SECRET_KEY = 'sk_sandbox_p24QxLvaCrZ5JH2baULA0Fry';
var FEDAPAY_ENV        = 'sandbox';

// MODE LIVE (décommentez et remplissez quand prêt)
// var FEDAPAY_PUBLIC_KEY = 'pk_live_VOTRE_CLE_PUBLIQUE';
// var FEDAPAY_SECRET_KEY = 'sk_live_VOTRE_CLE_SECRETE';
// var FEDAPAY_ENV        = 'live';
```

Pour passer en LIVE :
1. Connectez-vous sur dashboard.fedapay.com
2. Récupérez vos clés LIVE (pk_live_... et sk_live_...)
3. Commentez les lignes sandbox
4. Décommentez les lignes live et mettez vos vraies clés
5. `git push` pour mettre à jour

---

## 4️⃣ Comment fonctionne le paiement (étapes)

1. Client choisit son profil → système vérifie l'accès
2. Pas d'abonnement → page d'abonnement s'affiche
3. Client choisit un plan (heure / jour / semaine...)
4. Choisit opérateur : T-Money ou Flooz
5. Entre son numéro de téléphone + email pour reconnexion
6. FedaPay prend en charge : interface sécurisée PIN
7. Confirmation automatique → accès immédiat accordé
8. Prochaine visite → reconnexion avec email/numéro

---

## 5️⃣ Mettre en ligne sur GitHub (sans changer le lien)

### Première mise en ligne
```bash
git init
git add .
git commit -m "Pulsar Eco Group v8 - Version complète"
git branch -M main
git remote add origin https://github.com/blanckombate93-web/Pulsar-Eco-Group.git
git push -u origin main
```
Puis : **Settings → Pages → main → / (root) → Save**

### Mettre à jour (le lien ne change JAMAIS)
```bash
git add .
git commit -m "Description de la modification"
git push
```
Site mis à jour en 2-3 minutes automatiquement.

---

## 6️⃣ Tableau de bord : où modifier chaque chose

| Quoi modifier | Fichier | Chercher |
|---|---|---|
| Utilisateurs gratuits | `paiement.js` | `COMPTES_GRATUITS` |
| Tarifs abonnement | `paiement.js` | `var PLANS` |
| Clés FedaPay TEST→LIVE | `paiement.js` | `CLÉS API FEDAPAY` |
| Données villes | `ville-data.js` | `var VILLES_DATA` |
| Formules calcul IA | `ai-engine.js` | `recalculerMenage` |
| Styles / couleurs | `form.css` et `style.css` | — |
| Contacts footer | Chaque `.html` | section `<footer>` |

---

## 7️⃣ Test de paiement (mode sandbox)

Utilisez ces numéros de test FedaPay sandbox :
- **T-Money test :** 90000000 (PIN: 1234)
- **Flooz test :** 91000000 (PIN: 1234)

---

*Pulsar Eco Group © 2026 — Lomé, Togo*
*Développé avec IA Claude (Anthropic)*
