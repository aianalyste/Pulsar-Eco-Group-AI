// ================================================================
//  PULSAR ECO GROUP — CATALOGUES v11
//  Entrées marquées "source: officielle" = données vérifiées sur
//  fiche technique constructeur ou distributeur agréé (recherche du
//  30/08/2026). Les autres sont des valeurs de référence courantes du
//  marché, à vérifier/ajuster avec vos propres fournisseurs.
//  Utilisez "+ Nouveau" dans l'application pour ajouter vos modèles réels.
// ================================================================

var PANNEAUX_CATALOGUE = [
  { id:'p1', fabricant:'JA Solar', modele:'JAM72S30-550/MR', puissance:550, annee:2024, voc:49.90, icc:14.00, vmp:41.96, imp:13.11, source:'officielle' },
  { id:'p2', fabricant:'JA Solar', modele:'JAM72S30-525/MR', puissance:525, annee:2024, voc:49.15, icc:13.65, vmp:41.15, imp:12.76, source:'officielle' },
  { id:'p3', fabricant:'Pulsar Référence', modele:'PR-600M', puissance:600, annee:2026, voc:41.69, icc:18.40, vmp:34.80, imp:17.20, source:'référence pédagogique' },
  { id:'p4', fabricant:'Jinko Solar', modele:'Tiger Neo 78HL4-BDV', puissance:475, annee:2024, voc:44.90, icc:13.50, vmp:37.50, imp:12.67, source:'courante marché' },
  { id:'p5', fabricant:'Jinko Solar', modele:'Tiger Pro 72HC', puissance:400, annee:2023, voc:37.60, icc:13.60, vmp:31.40, imp:12.74, source:'courante marché' },
  { id:'p6', fabricant:'Canadian Solar', modele:'HiKu6 CS6W', puissance:545, annee:2024, voc:49.50, icc:14.03, vmp:41.40, imp:13.17, source:'courante marché' },
  { id:'p7', fabricant:'Trina Solar', modele:'Vertex S+ TSM', puissance:445, annee:2024, voc:39.90, icc:14.20, vmp:33.40, imp:13.32, source:'courante marché' },
  { id:'p8', fabricant:'Longi', modele:'Hi-MO6 LR5', puissance:585, annee:2025, voc:50.30, icc:14.50, vmp:42.10, imp:13.89, source:'courante marché' },
  { id:'p9', fabricant:'Risen Energy', modele:'Titan RSM', puissance:590, annee:2025, voc:51.20, icc:14.60, vmp:42.90, imp:13.75, source:'courante marché' },
];

var BATTERIES_CATALOGUE = [
  { id:'b1', fabricant:'Pylontech', modele:'US3000C', type:'Lithium-LiFePO4', tension:48, capaciteAh:74, capaciteWh:3552, dod:0.95, cycles:6000, source:'officielle' },
  { id:'b2', fabricant:'Pylontech', modele:'US5000', type:'Lithium-LiFePO4', tension:48, capaciteAh:100, capaciteWh:4800, dod:0.95, cycles:6000, source:'courante marché' },
  { id:'b3', fabricant:'Générique', modele:'LiFePO4 48V 100Ah', type:'Lithium-LiFePO4', tension:48, capaciteAh:100, capaciteWh:4800, dod:0.95, cycles:6000, source:'référence pédagogique' },
  { id:'b4', fabricant:'Générique', modele:'LiFePO4 48V 200Ah', type:'Lithium-LiFePO4', tension:48, capaciteAh:200, capaciteWh:9600, dod:0.95, cycles:6000, source:'référence pédagogique' },
  { id:'b5', fabricant:'Générique', modele:'Lithium-ion 48V 100Ah', type:'Lithium-ion', tension:48, capaciteAh:100, capaciteWh:4800, dod:0.90, cycles:4000, source:'courante marché' },
  { id:'b6', fabricant:'Générique', modele:'OPzV 2V 1000Ah', type:'OPzV / OPzS', tension:2, capaciteAh:1000, capaciteWh:2000, dod:0.80, cycles:1500, source:'courante marché (pompage/agricole)' },
  { id:'b7', fabricant:'Générique', modele:'OPzS 2V 1500Ah', type:'OPzV / OPzS', tension:2, capaciteAh:1500, capaciteWh:3000, dod:0.80, cycles:1500, source:'courante marché (pompage/agricole)' },
  { id:'b8', fabricant:'Générique', modele:'GEL 12V 200Ah', type:'GEL', tension:12, capaciteAh:200, capaciteWh:2400, dod:0.80, cycles:1200, source:'courante marché' },
  { id:'b9', fabricant:'Générique', modele:'AGM 12V 100Ah', type:'AGM', tension:12, capaciteAh:100, capaciteWh:1200, dod:0.50, cycles:600, source:'courante marché' },
];

var ONDULEURS_CATALOGUE = [
  { id:'o1', fabricant:'Deye', modele:'SUN-5K-SG04LP1-EU', puissanceNominale:5000, puissanceCrete:10000,
    tensionBatMin:40, tensionBatMax:60, courantChargeMax:120, courantDechargeMax:120,
    vocMax:500, mpptMin:150, mpptMax:425, nbMppt:2, imppMax:13,
    tensionSortie:'230V mono', type:'Hybride', rendement:97.6, source:'officielle' },
  { id:'o2', fabricant:'Deye', modele:'SUN-3.6K-SG04LP1-EU', puissanceNominale:3600, puissanceCrete:7200,
    tensionBatMin:40, tensionBatMax:60, courantChargeMax:70, courantDechargeMax:70,
    vocMax:500, mpptMin:150, mpptMax:425, nbMppt:1, imppMax:17,
    tensionSortie:'230V mono', type:'Hybride', rendement:97.6, source:'officielle' },
  { id:'o3', fabricant:'Growatt', modele:'SPF 5000 ES', puissanceNominale:5000, puissanceCrete:10000,
    tensionBatMin:40, tensionBatMax:60, courantChargeMax:100, courantDechargeMax:100,
    vocMax:450, mpptMin:60, mpptMax:430, nbMppt:1, imppMax:18,
    tensionSortie:'230V mono', type:'Off-grid', rendement:93, source:'courante marché' },
  { id:'o4', fabricant:'Victron Energy', modele:'MultiPlus-II 48/5000', puissanceNominale:5000, puissanceCrete:10000,
    tensionBatMin:38, tensionBatMax:66, courantChargeMax:120, courantDechargeMax:120,
    vocMax:null, mpptMin:null, mpptMax:null, nbMppt:0, imppMax:null,
    tensionSortie:'230V mono', type:'Off-grid (MPPT séparé requis)', rendement:96, source:'courante marché' },
  { id:'o5', fabricant:'MPP Solar', modele:'PIP-5048MK', puissanceNominale:5000, puissanceCrete:10000,
    tensionBatMin:40, tensionBatMax:60, courantChargeMax:80, courantDechargeMax:80,
    vocMax:450, mpptMin:60, mpptMax:430, nbMppt:1, imppMax:18,
    tensionSortie:'230V mono', type:'Off-grid', rendement:93, source:'courante marché' },
  { id:'o6', fabricant:'ATESS', modele:'HPS30 (triphasé)', puissanceNominale:30000, puissanceCrete:45000,
    tensionBatMin:400, tensionBatMax:560, courantChargeMax:100, courantDechargeMax:100,
    vocMax:1000, mpptMin:480, mpptMax:800, nbMppt:2, imppMax:94,
    tensionSortie:'380V tri', type:'Hybride pro', rendement:97, source:'courante marché (pro/entreprise)' },
];

// ================================================================
//  Ajout de composants personnalisés (persistant en localStorage,
//  en attendant le backend v11 - point 2)
// ================================================================
function chargerCataloguesPersonnalises() {
  try {
    var perso = JSON.parse(localStorage.getItem('pulsar_catalogues_perso') || '{}');
    (perso.panneaux || []).forEach(function (p) { PANNEAUX_CATALOGUE.push(p); });
    (perso.batteries || []).forEach(function (b) { BATTERIES_CATALOGUE.push(b); });
    (perso.onduleurs || []).forEach(function (o) { ONDULEURS_CATALOGUE.push(o); });
  } catch (e) { /* localStorage indisponible : on ignore */ }
}

function sauvegarderComposantPersonnalise(categorie, composant) {
  composant.id = categorie[0] + 'perso' + Date.now();
  composant.source = 'ajouté par l\'utilisateur';
  try {
    var perso = JSON.parse(localStorage.getItem('pulsar_catalogues_perso') || '{}');
    if (!perso[categorie]) perso[categorie] = [];
    perso[categorie].push(composant);
    localStorage.setItem('pulsar_catalogues_perso', JSON.stringify(perso));
  } catch (e) { /* stockage plein ou indisponible */ }
  return composant;
}
