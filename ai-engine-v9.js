// ================================================================
//  PULSAR ECO GROUP — MOTEUR IA v9.0
//  Reproduit EXACTEMENT la méthode enseignée en formation
//  (bilan énergétique -> panneaux -> tension système -> parallèles
//   -> contrôleur -> convertisseur -> batteries -> sections -> disjoncteurs)
//  Chaque formule ci-dessous correspond à une étape numérotée du cours.
// ================================================================

// ===== CONSTANTES DU COURS =====
var C = {
  ETA_ONDULEUR:  0.9,   // rendement onduleur (η ondu)
  ETA_REGULATEUR:0.9,   // rendement régulateur (η reg) — utilisé dans le calcul de Pc
  RP:            0.65,  // Ratio de Performance photovoltaïque
  K_SECURITE:    1.25,  // constante de sécurité (Ic, Pconv, disjoncteurs)
  RHO_CUIVRE:    16e-9, // résistivité du cuivre (Ω.m)
  DELTA_V:       0.02,  // chute de tension admissible (2%)
  JOURS_AUTONOMIE_DEFAUT: 1
};

// Taux de décharge (TD) par type de batterie — tableau du cours
var TD_BATTERIE = {
  "AGM":              0.50,
  "GEL":               0.80,
  "OPzV / OPzS":        0.80,
  "Lithium-ion":        0.90,
  "Lithium-LiFePO4":   0.95
};

// Sections de câble commerciales normalisées (mm²)
var SECTIONS_COMMERCIALES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

// Calibres de disjoncteurs / fusibles commerciaux (A)
var CALIBRES_DISJONCTEUR = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630];

// Tensions de disjoncteurs commerciales (V)
var TENSIONS_DISJONCTEUR = [32, 48, 60, 150, 250, 300, 400, 500, 600, 1000];

// Mots-clés appareils à démarrage inductif (cité dans le cours : "appareil classique / appareil inductif")
var MOTS_INDUCTION = ['climatiseur','clim','pompe','moteur','compresseur',
  'réfrigérateur','frigo','frigidaire','congélateur','machine à laver','fer à repasser',
  'four','micro-onde','perceuse','scie','aspirateur','broyeur','mixeur','ventilo','ventilateur'];

function estInductif(nom) {
  var n = (nom || '').toLowerCase();
  for (var i = 0; i < MOTS_INDUCTION.length; i++)
    if (n.indexOf(MOTS_INDUCTION[i]) !== -1) return true;
  return false;
}

// ================================================================
//  CATALOGUE PANNEAUX — DONNÉES DE RÉFÉRENCE
//  ⚠️ À personnaliser avec vos vrais fournisseurs (fichier facile à éditer,
//  même logique que COMPTES_GRATUITS dans paiement.js)
// ================================================================
var PANNEAUX_CATALOGUE = [
  { id:'p1', fabricant:'Pulsar Référence', modele:'PR-600M', puissance:600, annee:2026, voc:41.69, icc:18.4, vmp:34.8, imp:17.2 },
  { id:'p2', fabricant:'JA Solar',   modele:'JAM72S30',   puissance:550, annee:2024, voc:49.8,  icc:14.1, vmp:41.7, imp:13.2 },
  { id:'p3', fabricant:'JA Solar',   modele:'JAM54S31',   puissance:415, annee:2025, voc:38.1,  icc:13.9, vmp:31.9, imp:13.0 },
  { id:'p4', fabricant:'Jinko Solar',modele:'Tiger Neo',  puissance:475, annee:2024, voc:44.9,  icc:13.5, vmp:37.5, imp:12.7 },
  { id:'p5', fabricant:'Jinko Solar',modele:'Tiger Pro',  puissance:400, annee:2023, voc:37.6,  icc:13.6, vmp:31.4, imp:12.7 },
  { id:'p6', fabricant:'Canadian Solar',modele:'HiKu6',   puissance:545, annee:2024, voc:49.5,  icc:14.0, vmp:41.4, imp:13.2 },
  { id:'p7', fabricant:'Canadian Solar',modele:'HiKu5',   puissance:365, annee:2022, voc:40.4,  icc:11.6, vmp:33.6, imp:10.9 },
  { id:'p8', fabricant:'Longi',      modele:'Hi-MO6',     puissance:585, annee:2025, voc:50.3,  icc:14.5, vmp:42.1, imp:13.9 },
  { id:'p9', fabricant:'Trina Solar',modele:'Vertex S+',  puissance:445, annee:2024, voc:39.9,  icc:14.2, vmp:33.4, imp:13.3 },
  { id:'p10',fabricant:'Risen',      modele:'Titan',      puissance:590, annee:2025, voc:51.2,  icc:14.6, vmp:42.9, imp:13.8 }
];

// ================================================================
//  CATALOGUE BATTERIES — DONNÉES DE RÉFÉRENCE (⚠️ idem, à personnaliser)
// ================================================================
var BATTERIES_CATALOGUE = [
  { id:'b1', type:'Lithium-LiFePO4', capacite:100 },
  { id:'b2', type:'Lithium-LiFePO4', capacite:150 },
  { id:'b3', type:'Lithium-LiFePO4', capacite:200 },
  { id:'b4', type:'Lithium-LiFePO4', capacite:280 },
  { id:'b5', type:'Lithium-ion',     capacite:100 },
  { id:'b6', type:'Lithium-ion',     capacite:200 },
  { id:'b7', type:'OPzV / OPzS',     capacite:150 },
  { id:'b8', type:'OPzV / OPzS',     capacite:200 },
  { id:'b9', type:'GEL',             capacite:100 },
  { id:'b10',type:'GEL',             capacite:200 },
  { id:'b11',type:'AGM',             capacite:100 },
  { id:'b12',type:'AGM',             capacite:150 }
];

// ================================================================
//  1) BILAN ÉNERGÉTIQUE — tableau des appareils
//  equipements = [{nom, pu(W), nombre, heures}]
//  heures = nombre d'heures cochées sur la bande 24h (voir menage-v9.js)
// ================================================================
function calculerBilan(equipements) {
  var lignes = [];
  var PT_total = 0, E_total = 0;
  var classiques = [], inductifs = [];

  equipements.forEach(function (eq) {
    var PT = eq.pu * eq.nombre;
    var E  = PT * eq.heures;
    PT_total += PT;
    E_total  += E;
    var ligne = { nom: eq.nom, pu: eq.pu, nombre: eq.nombre, heures: eq.heures, PT: PT, E: E };
    lignes.push(ligne);
    (estInductif(eq.nom) ? inductifs : classiques).push(ligne);
  });

  return { lignes: lignes, PT_total: PT_total, E_total: E_total, classiques: classiques, inductifs: inductifs };
}

// ================================================================
//  2) ÉNERGIE JOURNALIÈRE :  Ej = 1,2 × E
// ================================================================
function calculerEnergieJournaliere(E_total) {
  return 1.2 * E_total;
}

// ================================================================
//  3) PUISSANCE CRÊTE DES PANNEAUX :
//     Pc = Ej ÷ (η onduleur × η régulateur × RP × IR)
//     IR = irradiation de la zone (= HSP de la ville choisie)
// ================================================================
function calculerPuissanceCrete(Ej, IR) {
  return Ej / (C.ETA_ONDULEUR * C.ETA_REGULATEUR * C.RP * IR);
}

// ================================================================
//  4) NOMBRE DE PANNEAUX :  NP = Pc / Pu
// ================================================================
function calculerNombrePanneaux(Pc, Pu) {
  return Math.ceil(Pc / Pu);
}

// ================================================================
//  6) TENSION DU SYSTÈME (selon Pc, en Wc)
// ================================================================
function tensionSysteme(Pc_Wc) {
  if (Pc_Wc < 500)  return 12;
  if (Pc_Wc <= 2000) return 24;
  return 48;
}

// ================================================================
//  7) NOMBRE DE SÉRIES (Ns) ET DE PARALLÈLES (N)
//  Le cours fixe un exemple (8 en série) sans formule stricte ; on
//  propose ici une règle transparente et modifiable par l'utilisateur :
//  Ns = tension max d'entrée du régulateur MPPT ÷ Voc du panneau
// ================================================================
function calculerSeriesParalleles(NP, Voc, Vmax_MPPT) {
  Vmax_MPPT = Vmax_MPPT || 150; // valeur usuelle régulateur MPPT grand public
  var Ns = Math.max(1, Math.floor(Vmax_MPPT / Voc));
  Ns = Math.min(Ns, NP);
  var N = Math.ceil(NP / Ns);
  return { Ns: Ns, N: N, V_string: +(Ns * Voc).toFixed(2) };
}

// ================================================================
//  8) INTENSITÉ DU CONTRÔLEUR DE CHARGE :  Ic = K × N × Isc
// ================================================================
function calculerIntensiteControleur(N, Isc) {
  var Ic_brut = C.K_SECURITE * N * Isc;
  return { brut: +Ic_brut.toFixed(2), normalise: prochaineValeur(Ic_brut, CALIBRES_DISJONCTEUR) };
}

// ================================================================
//  9) PUISSANCE DU CONVERTISSEUR :  Pconv = K × PT
// ================================================================
function calculerPuissanceConvertisseur(PT_total) {
  var brut = C.K_SECURITE * PT_total;
  var normalise = Math.ceil(brut / 100) * 100; // arrondi à la centaine supérieure (comme le cours : 5461 -> 5500)
  return { brut: +brut.toFixed(2), normalise: normalise };
}

// ================================================================
//  10) CAPACITÉ DES BATTERIES :
//      Cb = (Ej × jours d'autonomie) / (η ondu × η batterie × Vbat × TD)
// ================================================================
function calculerCapaciteBatterie(Ej, joursAutonomie, Vbat, TD) {
  return Ej * joursAutonomie / (C.ETA_ONDULEUR * 0.9 /*η batterie, cours p.9*/ * Vbat * TD);
}

// ================================================================
//  11) NOMBRE DE BATTERIES :  Nb = Cb / Cu
// ================================================================
function calculerNombreBatteries(Cb, Cu) {
  return Math.ceil(Cb / Cu);
}

// ================================================================
//  12) SECTION DE CÂBLE :  S = (2 × ρ × L × I) / (Δ × V)
//      Consigne : toujours utiliser le MAX de la plage de longueur,
//      puis choisir la 1ère section commerciale >= au résultat.
// ================================================================
function calculerSectionCable(L_m, I_A, V_ref) {
  var dV = C.DELTA_V * V_ref;
  var S_m2 = (2 * C.RHO_CUIVRE * L_m * I_A) / dV;
  var S_mm2 = S_m2 * 1e6;
  return { S_calc: +S_mm2.toFixed(2), S_normalise: prochaineValeur(S_mm2, SECTIONS_COMMERCIALES) };
}

// ================================================================
//  13) DISJONCTEURS — calibre normalisé >= K x I, tension normalisée >= V
// ================================================================
function calculerDisjoncteur(V, I) {
  var I_marge = C.K_SECURITE * I;
  return {
    V: prochaineValeur(V, TENSIONS_DISJONCTEUR),
    I: prochaineValeur(I_marge, CALIBRES_DISJONCTEUR)
  };
}

// ===== Utilitaire : 1ère valeur d'une liste normalisée >= x =====
function prochaineValeur(x, liste) {
  for (var i = 0; i < liste.length; i++) if (liste[i] >= x) return liste[i];
  return liste[liste.length - 1];
}

// ================================================================
//  CALCUL COMPLET — enchaîne toutes les étapes du cours
// ================================================================
function calculDimensionnementComplet(input) {
  // input = {
  //   equipements, IR, joursAutonomie,
  //   panneau: {puissance, voc, icc, ...}, Vmax_MPPT,
  //   typeControleur: 'MPPT'|'PWM',
  //   batterie: {type, capacite},
  //   L1, L2, L3 (longueurs de câble, max de chaque plage)
  // }
  var bilan = calculerBilan(input.equipements);
  var Ej = calculerEnergieJournaliere(bilan.E_total);
  var Pc = calculerPuissanceCrete(Ej, input.IR);

  var NP = calculerNombrePanneaux(Pc, input.panneau.puissance);
  var Vsys = tensionSysteme(Pc);
  var sp = calculerSeriesParalleles(NP, input.panneau.voc, input.Vmax_MPPT);

  var Ic = calculerIntensiteControleur(sp.N, input.panneau.icc);
  var Pconv = calculerPuissanceConvertisseur(bilan.PT_total);

  var TD = TD_BATTERIE[input.batterie.type] || 0.8;
  var joursAuto = input.joursAutonomie || C.JOURS_AUTONOMIE_DEFAUT;
  var Cb = calculerCapaciteBatterie(Ej, joursAuto, Vsys, TD);
  var Nb = calculerNombreBatteries(Cb, input.batterie.capacite);
  var Cb_Wh_total = Nb * input.batterie.capacite * Vsys;

  // Sections de câbles (L max de chaque plage, I1 = Ic normalisé)
  var L1 = input.L1 || 30, L2 = input.L2 || 1, L3 = input.L3 || 30;
  var V1 = sp.V_string;
  var S1 = calculerSectionCable(L1, Ic.normalise, V1);

  // I2 = intensité délivrée par le parc batteries (règle de 3 depuis 100Ah->40A comme le cours)
  var I2_brut = Nb * (input.batterie.capacite * 0.4);
  var S2 = calculerSectionCable(L2, I2_brut, Vsys);

  var V3 = 230; // sortie AC monophasée standard
  var I3 = Pconv.normalise / V3;
  var S3 = calculerSectionCable(L3, I3, V3);

  var D1 = calculerDisjoncteur(V1, Ic.normalise);
  var D2 = calculerDisjoncteur(Vsys, I2_brut);
  var D3 = calculerDisjoncteur(V3, I3);

  // Comparaison énergie produite vs besoin
  var E_produite_Wh = NP * input.panneau.puissance * input.IR * (C.ETA_ONDULEUR * C.ETA_REGULATEUR * C.RP);

  return {
    bilan: bilan, Ej: Ej, Pc: Pc, IR: input.IR,
    NP: NP, Vsys: Vsys, Ns: sp.Ns, N: sp.N, V_string: sp.V_string,
    panneau: input.panneau,
    Ic: Ic, Pconv: Pconv,
    batterie: input.batterie, TD: TD, joursAuto: joursAuto,
    Cb: Cb, Nb: Nb, Cb_Wh_total: Cb_Wh_total,
    S1: S1, S2: S2, S3: S3, L1: L1, L2: L2, L3: L3,
    V1: V1, I1: Ic.normalise, V2: Vsys, I2: I2_brut, V3: V3, I3: I3,
    D1: D1, D2: D2, D3: D3,
    E_produite_Wh: E_produite_Wh
  };
}
