# 🆕 PULSAR ECO GROUP — Module Ménage v9 (IA conforme au cours FES12)

## Ce qui a changé

Le module **Ménage** a été entièrement refondu pour suivre **exactement** la
méthode enseignée dans votre formation (fichier `Dimensionnement_Solaire.docx`)
et le parcours décrit dans la consigne (point 14). Rien n'a été supprimé :
vos fichiers `menage.html` / `menage.js` / `ai-engine.js` d'origine sont
**intacts** et votre site continue de fonctionner normalement tant que vous
ne changez pas le lien.

### Nouveaux fichiers ajoutés (aucun fichier existant modifié)
- `ai-engine-v9.js` — moteur de calcul, formules **identiques** au cours
- `menage-v9.html` / `menage-v9.js` / `menage-v9.css` — nouveau parcours en 5 étapes
- `scene3d-v9.js` — visualisation 3D améliorée (BONUS demandé)

## Le nouveau parcours (conforme au point 14 de la consigne)

1. **Ville + tableau appareils** (Nom, Puissance unitaire, Nombre) → la ville
   choisie donne directement l'irradiation (IR = HSP de la ville, déjà dans
   `ville-data.js`, +60 villes africaines).
2. **Bande horaire 24h** — pour chaque appareil ajouté, on coche les heures
   d'utilisation. Le nombre de cases cochées devient automatiquement le
   "Temps d'utilisation (H)". *(Voir note ci-dessous.)*
   → bouton **Lancer le prédimensionnement** : classement appareils
   classiques/inductifs, tableau complet avec PT et Énergie, calcul de
   **Ej** et **Pc** — exactement les formules du cours.
3. **Choix des panneaux** — tableau filtrable (fabricant / puissance / année)
   avec les paramètres (VOC, Icc...) → bouton **Calculer le nombre de
   panneaux nécessaire** (NP = Pc / Pu).
4. **Contrôleur de charge (PWM/MPPT) + batteries** — le nombre de parallèles
   est déterminé automatiquement ; tableau de batteries filtrable (type +
   capacité, LiFePO4 par défaut) → bouton **Calculer le nombre de
   batteries**.
5. **Logo + VALIDER ET LANCER L'ANALYSE IA** — génère le rapport complet
   (à l'écran + PDF téléchargeable) avec **tous** les tableaux demandés :
   appareils, classement, heures d'utilisation, panneaux, batteries,
   comparaison énergie produite/besoin, sections de câble, disjoncteurs,
   message motivant, et la conception 3D.

## Choix que j'ai dû faire — à valider avec vous

1. **"4 champs" de la consigne** : j'ai réparti Nom/PU/Nombre à l'étape 1 et
   le Temps d'utilisation se déduit de la bande 24h à l'étape 2 (plus
   précis qu'une saisie manuelle en double). Si vous préférez que le champ
   "Temps d'utilisation" soit aussi saisissable en heures à l'étape 1 (en
   plus de la bande horaire), dites-le moi, c'est un ajustement rapide.

2. **Nombre de séries de panneaux (Ns)** : le cours fixe un exemple (8
   panneaux en série) sans donner de formule. J'ai ajouté une règle
   transparente et modifiable :
   `Ns = Tension max d'entrée du régulateur MPPT ÷ VOC du panneau`
   Le champ "Tension max MPPT" est réglable à l'étape 4 (150 V par défaut,
   valeur courante pour un régulateur MPPT grand public). **Pour retrouver
   exactement l'exemple du cours (Ns=8, N=2, V=333,52V), réglez ce champ
   à 350 V** — j'ai vérifié que le moteur reproduit alors *exactement* les
   chiffres de votre formation (Pc=9366Wc, Ic=50A, Pconv=5500W, Cb=586Ah,
   Nb=4 batteries, etc.). Ajustez cette valeur selon le régulateur que vous
   installez réellement.

3. **Sections de câble** : la consigne demande d'utiliser **toujours le
   maximum de la plage de longueur** (ex: 30 m au lieu des 20 m utilisés
   dans l'exemple manuscrit du cours). C'est ce que fait l'outil — il donne
   donc des sections légèrement plus grandes (plus sûres) que l'exemple
   manuscrit, ce qui est normal et voulu par votre consigne.

4. **Disjoncteurs** : le cours choisit des calibres "légèrement supérieurs"
   sans formule stricte. J'ai réutilisé la même constante de sécurité K=1,25
   déjà utilisée dans le cours (pour Ic et Pconv), appliquée aussi aux
   calibres de disjoncteurs, puis arrondie au calibre commercial disponible
   juste au-dessus. C'est cohérent avec la logique du cours.

## Catalogues panneaux & batteries — À PERSONNALISER

J'ai ajouté un catalogue de référence (10 panneaux, 12 batteries) dans
`ai-engine-v9.js`, avec des caractéristiques réalistes de fabricants connus
(JA Solar, Jinko, Canadian Solar, Longi, Trina, Risen), **plus un panneau
"Pulsar Référence" qui reproduit exactement les valeurs de votre cours**
(600W, VOC 41,69V, Icc 18,4A). Comme pour `COMPTES_GRATUITS` dans
`paiement.js`, il vous suffit d'éditer les tableaux `PANNEAUX_CATALOGUE` et
`BATTERIES_CATALOGUE` en haut du fichier pour y mettre vos vrais
fournisseurs/prix. Structure très simple, même logique que le reste du
projet.

## BONUS ajoutés

- **Vérification du bilan énergétique** : le rapport final compare
  automatiquement l'énergie que vos panneaux vont produire à l'énergie
  dont le client a besoin (tableau ⑥), avec un verdict Excédentaire/Insuffisant.
- **3D améliorée** : la scène 3D affiche maintenant le montage exact
  (Ns séries × N parallèles), l'inclinaison précise avec cote, la
  puissance installée en kWc, en plus de l'inclinaison/azimut déjà présents.
- **Filtres panneaux/batteries** en tableau, comme demandé, avec
  sélection par clic et mise en évidence visuelle de la ligne choisie.

## Comment tester

1. Ouvrez `menage-v9.html` dans un navigateur (ou mettez le dossier en
   ligne comme d'habitude via GitHub Pages).
2. Suivez les 5 étapes avec un exemple test.
3. Une fois validé, mettez à jour le lien `index.html` (`href="menage.html"`
   → `href="menage-v9.html"`) pour le rendre visible aux clients, ou
   dites-le-moi et je le fais pour vous après vos tests.

## Étendre à Agriculture / Entreprise

Le moteur `ai-engine-v9.js` est écrit en fonctions indépendantes
(`calculerBilan`, `calculerEnergieJournaliere`, `calculerPuissanceCrete`,
etc.) réutilisables. Si vous voulez que j'applique la même méthode et le
même parcours en 5 étapes aux modules Agricole et Entreprise, dites-le-moi
et je le fais suivre le même modèle.
