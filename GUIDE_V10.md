# 🆕 PULSAR ECO GROUP — v10 : Système complet refondu (3 modules)

## Ce qui a changé par rapport à la v9

Cette version répond aux 3 demandes urgentes + aux 4 points du "modèle
réel" discutés avec votre développeur. Rien de l'existant n'est supprimé :
v8 (original) et v9 (module Ménage seul) restent intacts. La v10 ajoute un
**moteur commun** et l'applique aux **3 modules** : Ménage, Agricole,
Entreprise & Institution.

## Nouveaux fichiers (aucun fichier existant modifié)

**Moteur commun (partagé par les 3 modules) :**
- `coeff-demarrage-v10.js` — les 65 coefficients de démarrage + reconnaissance automatique par mot-clé
- `moteur-v10.js` — calculs (jour/nuit, pointe réelle, batteries, sections, disjoncteurs)
- `scene3d-v10.js` — nouvelle scène 3D (fond blanc, blocs de panneaux)
- `rapport-v10.js` — rapport unique écran + PDF (corrige le bug PDF illisible), marque blanche
- `wizard-v10.js` / `wizard-v10.css` — le parcours en 5 étapes, partagé

**Pages par module :**
- `menage-v10.html`, `agri-v10.html`, `entreprise-v10.html`

## Réponse aux 3 demandes urgentes

### 1. PDF illisible → corrigé
Le vrai problème : le PDF et l'écran étaient générés par **deux bouts de
code séparés** qui pouvaient diverger, et le PDF ne dessinait que du texte
brut (pas de vraies grilles). En v10, **une seule fonction**
(`construireSectionsRapport`) produit les données, et **deux moteurs de
rendu** les affichent à l'identique : `rendreRapportHTML` pour l'écran,
`genererPDFDepuisSections` pour le PDF — avec la librairie
**jsPDF-AutoTable** (ajoutée via CDN) qui dessine de vrais tableaux
quadrillés, paginés automatiquement. Impossible désormais que le PDF
diffère de l'écran, puisque c'est la même donnée.

### 2. Marque blanche client → ajouté
Étape 5 : champ **"Nom de l'entreprise / du client"** + upload logo (déjà
existant). Les deux sont injectés dans l'en-tête du rapport ET du PDF —
le rapport ne porte plus "Pulsar Eco Group" mais le nom/logo du client
(la marque Pulsar n'apparaît qu'en petit pied de page).

### 3. Écart énergie produite/besoin → recalculé et redimensionné
Au lieu d'afficher deux gros chiffres qui donnent l'impression d'un
"presque du double", le rapport affiche maintenant un **taux de
couverture en %** avec une explication ("marge de 20-30% normale pour
les nuages et le vieillissement des panneaux"), en police plus petite
(section ⑥, `compact-kv`). Le calcul lui-même n'a pas de bug — la marge
vient du facteur 1,2 (Ej) déjà appliqué en amont, qui se cumule avec
l'arrondi des panneaux au nombre entier supérieur ; c'est désormais
présenté comme un avantage plutôt qu'un écart alarmant.

## Réponse aux 4 points du "modèle réel"

### 1. Heures d'utilisation obligatoires — fait
La bande horaire 24h (déjà en v9) est conservée mais désormais **codée
couleur jour/orange vs nuit/bleu** selon deux champs réglables (heure de
lever/coucher du soleil, étape 2). Chaque case cochée alimente directement
le calcul jour/nuit.

### 2. Auto-consommation jour vs batterie nuit — fait
Le moteur sépare **E_jour** et **E_nuit** par appareil. Les **panneaux**
sont dimensionnés sur l'énergie totale (jour + nuit, car ils doivent aussi
recharger les batteries) — inchangé. Mais les **batteries** sont
désormais dimensionnées sur `E_nuit + réserve_nuageuse × E_jour`
(réserve réglable, 20% par défaut) au lieu de l'énergie totale ×1,2.
**Résultat concret testé** : sur un profil avec beaucoup d'usage diurne
(cas typique agricole), le nombre de batteries chute nettement — exactement
l'effet demandé.

### 3. Pointe de démarrage réelle (appareils inductifs) — fait
Le tableau des 65 coefficients que vous avez fourni est intégré et
**reconnu automatiquement** par mot-clé sur le nom tapé par le client
("Pompe immergée forage" → reconnaît "Pompe immergée", coefficient 3).
Le moteur balaie les 24 heures, additionne la puissance de pointe
(`puissance × coefficient`) de tous les appareils actifs à chaque heure,
et retient **l'heure où cette pointe est maximale** pour dimensionner le
convertisseur — plus la simple somme brute de toutes les puissances.
Testé : un climatiseur (coeff 4) + un réfrigérateur (coeff 3) actifs
ensemble à 12h donnent bien la pointe retenue, pas la présence d'autres
appareils à d'autres heures.

### 4. Réserve nuageuse — fait
Champ réglable à l'étape 4 (20% par défaut), intégré au calcul de
capacité batterie (voir point 2).

## Nouvelle scène 3D (refonte complète)

- Fond **blanc**, grillage léger au sol
- Panneaux dessinés **individuellement en bloc** : Ns colonnes (séries) ×
  N rangées (parallèles), avec quadrillage de cellules PV par panneau
- Cote d'inclinaison affichée, légende compacte (2 couleurs : bleu
  panneaux + gris supports), infos clés (montage, inclinaison, kWc, ville)
- Toujours pivotable à la souris/tactile, et capturée automatiquement
  dans le PDF

## Les 3 modules, différences de configuration seulement

Le code est **partagé à 100%** (un seul moteur, un seul parcours). Seule
la configuration change par page :

| Module | Panneau par défaut | Batterie par défaut |
|---|---|---|
| Ménage | Pulsar Référence 600W | Lithium-LiFePO4 100Ah |
| Agricole | Pulsar Référence 600W | OPzV/OPzS 150Ah (courant pour pompage) |
| Entreprise & Institution | JA Solar 550W | Lithium-LiFePO4 200Ah |

**Note importante sur l'Agricole** : contrairement à l'ancien module v8
(qui calculait la puissance hydraulique Ph = ρ×g×Q×H à partir de la
surface/débit/HMT), la v10 traite la pompe comme un appareil de la liste
(avec son coefficient de démarrage ×3 reconnu automatiquement). C'est plus
simple et unifié, mais moins précis qu'un vrai calcul hydraulique. Si vous
voulez que je réintègre un sous-calcul hydraulique spécifique pour
affiner le dimensionnement de la pompe, dites-le-moi — c'est un ajout
ciblé, pas une refonte.

## Comment déployer (identique à la dernière fois)

```bash
git add .
git commit -m "v10 - moteur commun jour/nuit + pointe demarrage + PDF unifie + 3D refaite + marque blanche"
git push
```

Testez `menage-v10.html`, `agri-v10.html`, `entreprise-v10.html`
individuellement avant de mettre à jour les liens dans `index.html`.

## Vérifications que j'ai faites avant de vous livrer

- Moteur testé en ligne de commande : bilan jour/nuit correct, pointe de
  démarrage correctement détectée (climatiseur+frigo à midi), batteries
  réduites par rapport à un calcul sur l'énergie totale
- Tous les fichiers JavaScript vérifiés syntaxiquement valides
- Aucune référence résiduelle aux anciens fichiers v8/v9 dans le nouveau code
- Les 3 pages HTML générées sans placeholder oublié

## Ce que je n'ai PAS pu tester

Je n'ai pas de navigateur avec affichage graphique disponible ici, donc je
n'ai pas pu vérifier visuellement le rendu final (mise en page du parcours,
apparence de la 3D, mise en page du PDF réel). Testez ces 3 pages
attentivement de votre côté et signalez-moi tout défaut visuel — je
corrigerai directement.
