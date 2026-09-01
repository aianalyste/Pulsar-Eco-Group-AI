// ================================================================
//  PULSAR ECO GROUP — MOTEUR IA v10.0 (MOTEUR COMMUN)
//  Utilisé par les 3 modules : Ménage, Agricole, Entreprise/Institution
//
//  Nouveautés v10 (retours développeur du 28/08) :
//   - Heures d'usage réelles (grille 24h) -> séparation Jour / Nuit
//   - Auto-consommation directe le jour, batterie dimensionnée sur le
//     besoin de NUIT (+ réserve nuageuse), plus sur l'énergie totale
//   - Pointe de démarrage réelle (coefficients d'appareils inductifs,
//     heure où le plus d'appareils inductifs tournent en même temps)
//     -> dimensionne l'onduleur sur la vraie pointe, pas sur PT total
//   - Comparaison énergie produite/besoin recalculée et recadrée
//     (taux de couverture en %, plus deux gros chiffres qui s'affolent)
//   - Séries longues privilégiées (moins de parallèles) + MPPT
// ================================================================

// ===== CONSTANTES DU COURS (inchangées) =====
var C = {
  ETA_ONDULEUR:   0.9,
  ETA_REGULATEUR: 0.9,
  ETA_BATTERIE:   0.9,
  RP:             0.65,
  K_SECURITE:     1.25,
  RHO_CUIVRE:     16e-9,
  DELTA_V:        0.02,
  JOURS_AUTONOMIE_DEFAUT: 1,
  RESERVE_NUAGEUSE: 0.20,   // 20% du besoin jour ajouté en secours batterie (nuages)
  HEURE_LEVER_DEFAUT:   6,
  HEURE_COUCHER_DEFAUT: 18
};

var TD_BATTERIE = {
  "AGM":               0.50,
  "GEL":               0.80,
  "OPzV / OPzS":       0.80,
  "Lithium-ion":       0.90,
  "Lithium-LiFePO4":   0.95
};

var SECTIONS_COMMERCIALES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
var CALIBRES_DISJONCTEUR  = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630];
var TENSIONS_DISJONCTEUR  = [32, 48, 60, 150, 250, 300, 400, 500, 600, 1000];

// ================================================================
//  CATALOGUE PANNEAUX (⚠️ à personnaliser avec vos vrais fournisseurs)
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
//  1) BILAN ÉNERGÉTIQUE — jour / nuit + pointe de démarrage
//  equipements = [{ nom, pu, nombre, heuresActives: [24 booléens] }]
// ================================================================
function calculerBilanV10(equipements, heureLever, heureCoucher) {
  heureLever   = (heureLever   === undefined) ? C.HEURE_LEVER_DEFAUT   : heureLever;
  heureCoucher = (heureCoucher === undefined) ? C.HEURE_COUCHER_DEFAUT : heureCoucher;

  var lignes = [];
  var PT_total = 0, E_total = 0, E_jour_total = 0, E_nuit_total = 0;
  var classiques = [], inductifs = [];
  var courbePointe = new Array(24).fill(0); // puissance de pointe (W) par heure, tous appareils confondus

  equipements.forEach(function (eq) {
    var PT = eq.pu * eq.nombre;
    var heuresActives = eq.heuresActives || [];
    var nbHeures = heuresActives.filter(Boolean).length;
    var E = PT * nbHeures;

    var E_jour = 0, E_nuit = 0;
    for (var h = 0; h < 24; h++) {
      if (!heuresActives[h]) continue;
      var estJour = (h >= heureLever && h < heureCoucher);
      if (estJour) E_jour += PT; else E_nuit += PT;
    }

    var coeffInfo = (typeof trouverCoeffDemarrage === 'function') ? trouverCoeffDemarrage(eq.nom) : null;
    var coeff = coeffInfo ? coeffInfo.coeff : 1;
    var P_pointe_appareil = PT * coeff;

    for (var h2 = 0; h2 < 24; h2++) {
      if (heuresActives[h2]) courbePointe[h2] += P_pointe_appareil;
    }

    PT_total += PT; E_total += E; E_jour_total += E_jour; E_nuit_total += E_nuit;

    var ligne = {
      nom: eq.nom, pu: eq.pu, nombre: eq.nombre, heures: nbHeures,
      PT: PT, E: E, E_jour: E_jour, E_nuit: E_nuit,
      coeff: coeff, P_pointe: P_pointe_appareil,
      heuresActives: heuresActives
    };
    lignes.push(ligne);
    (coeff > 1 ? inductifs : classiques).push(ligne);
  });

  var P_pointe_max = 0, heure_pointe = 0;
  for (var h3 = 0; h3 < 24; h3++) {
    if (courbePointe[h3] > P_pointe_max) { P_pointe_max = courbePointe[h3]; heure_pointe = h3; }
  }

  return {
    lignes: lignes, PT_total: PT_total, E_total: E_total,
    E_jour_total: E_jour_total, E_nuit_total: E_nuit_total,
    classiques: classiques, inductifs: inductifs,
    courbePointe: courbePointe, P_pointe_max: P_pointe_max, heure_pointe: heure_pointe,
    heureLever: heureLever, heureCoucher: heureCoucher
  };
}

// ================================================================
//  2) ÉNERGIE JOURNALIÈRE :  Ej = 1,2 × E   (dimensionne les panneaux,
//     qui doivent couvrir la consommation jour ET recharger pour la nuit)
// ================================================================
function calculerEnergieJournaliere(E_total) {
  return 1.2 * E_total;
}

// ================================================================
//  3) PUISSANCE CRÊTE DES PANNEAUX :
//     Pc = Ej ÷ (η onduleur × η régulateur × RP × IR)
// ================================================================
function calculerPuissanceCrete(Ej, IR) {
  return Ej / (C.ETA_ONDULEUR * C.ETA_REGULATEUR * C.RP * IR);
}

function calculerNombrePanneaux(Pc, Pu) {
  return Math.ceil(Pc / Pu);
}

function tensionSysteme(Pc_Wc) {
  if (Pc_Wc < 500)  return 12;
  if (Pc_Wc <= 2000) return 24;
  return 48;
}

// Séries longues privilégiées (moins de parallèles), limité par la
// tension max d'entrée du régulateur MPPT.
function calculerSeriesParalleles(NP, Voc, Vmax_MPPT) {
  Vmax_MPPT = Vmax_MPPT || 150;
  var Ns = Math.max(1, Math.floor(Vmax_MPPT / Voc));
  Ns = Math.min(Ns, NP);
  var N = Math.ceil(NP / Ns);
  return { Ns: Ns, N: N, V_string: +(Ns * Voc).toFixed(2) };
}

function calculerIntensiteControleur(N, Isc) {
  var Ic_brut = C.K_SECURITE * N * Isc;
  return { brut: +Ic_brut.toFixed(2), normalise: prochaineValeur(Ic_brut, CALIBRES_DISJONCTEUR) };
}

// ================================================================
//  4) PUISSANCE DU CONVERTISSEUR — basée sur la POINTE RÉELLE de
//     démarrage (heure où le plus d'appareils inductifs tournent
//     ensemble), pas sur la puissance totale installée.
// ================================================================
function calculerPuissanceConvertisseur(P_pointe_max) {
  var brut = C.K_SECURITE * P_pointe_max;
  var normalise = Math.ceil(brut / 100) * 100;
  return { brut: +brut.toFixed(2), normalise: normalise };
}

// ================================================================
//  5) CAPACITÉ DES BATTERIES — dimensionnée sur le besoin de NUIT
//     (+ réserve nuageuse en journée), pas sur l'énergie totale du jour.
//     Cb = (E_nuit + réserve×E_jour) × jours_autonomie
//          ÷ (η ondu × η batterie × Vbat × TD)
// ================================================================
function calculerCapaciteBatterie(E_nuit, E_jour, joursAutonomie, Vbat, TD, reserveNuageuse) {
  reserveNuageuse = (reserveNuageuse === undefined) ? C.RESERVE_NUAGEUSE : reserveNuageuse;
  var besoin = E_nuit + reserveNuageuse * E_jour;
  return besoin * joursAutonomie / (C.ETA_ONDULEUR * C.ETA_BATTERIE * Vbat * TD);
}

function calculerNombreBatteries(Cb, Cu) {
  return Math.ceil(Cb / Cu);
}

// ================================================================
//  6) SECTIONS DE CÂBLE — toujours le MAX de la plage de longueur
// ================================================================
function calculerSectionCable(L_m, I_A, V_ref) {
  var dV = C.DELTA_V * V_ref;
  var S_mm2 = (2 * C.RHO_CUIVRE * L_m * I_A / dV) * 1e6;
  return { S_calc: +S_mm2.toFixed(2), S_normalise: prochaineValeur(S_mm2, SECTIONS_COMMERCIALES) };
}

function calculerDisjoncteur(V, I) {
  return { V: prochaineValeur(V, TENSIONS_DISJONCTEUR), I: prochaineValeur(C.K_SECURITE * I, CALIBRES_DISJONCTEUR) };
}

function prochaineValeur(x, liste) {
  for (var i = 0; i < liste.length; i++) if (liste[i] >= x) return liste[i];
  return liste[liste.length - 1];
}

// ================================================================
//  7) COMPARAISON ÉNERGIE PRODUITE / BESOIN — recadrée en TAUX DE
//     COUVERTURE (%) plutôt qu'en deux gros chiffres qui s'affolent.
//     Le surplus (~20-30%) est normal : marge nuages + vieillissement
//     des panneaux (dégradation ~0,5%/an) + pertes non modélisées.
// ================================================================
function calculerComparaisonEnergie(NP, Pu, IR, E_total) {
  var E_produite_Wh = NP * Pu * IR * (C.ETA_ONDULEUR * C.ETA_REGULATEUR * C.RP);
  var taux = E_total > 0 ? (E_produite_Wh / E_total) * 100 : 0;
  var marge = taux - 100;
  return {
    E_produite_Wh: E_produite_Wh,
    E_besoin_Wh: E_total,
    tauxCouverture: +taux.toFixed(0),
    margeSecurite: +marge.toFixed(0)
  };
}

// ================================================================
//  CALCUL COMPLET — enchaîne toutes les étapes
// ================================================================
function calculDimensionnementComplet(input) {
  // input = {
  //   equipements: [{nom,pu,nombre,heuresActives}], IR, joursAutonomie,
  //   heureLever, heureCoucher, reserveNuageuse,
  //   panneau, Vmax_MPPT, typeControleur, batterie,
  //   L1, L2, L3
  // }
  var bilan = calculerBilanV10(input.equipements, input.heureLever, input.heureCoucher);
  var Ej = calculerEnergieJournaliere(bilan.E_total);
  var Pc = calculerPuissanceCrete(Ej, input.IR);

  var NP = calculerNombrePanneaux(Pc, input.panneau.puissance);
  var Vsys = tensionSysteme(Pc);
  var sp = calculerSeriesParalleles(NP, input.panneau.voc, input.Vmax_MPPT);

  var Ic = calculerIntensiteControleur(sp.N, input.panneau.icc);
  var Pconv = calculerPuissanceConvertisseur(bilan.P_pointe_max);

  var TD = TD_BATTERIE[input.batterie.type] || 0.8;
  var joursAuto = input.joursAutonomie || C.JOURS_AUTONOMIE_DEFAUT;
  var reserveNuageuse = (input.reserveNuageuse === undefined) ? C.RESERVE_NUAGEUSE : input.reserveNuageuse;
  var Cb = calculerCapaciteBatterie(bilan.E_nuit_total, bilan.E_jour_total, joursAuto, Vsys, TD, reserveNuageuse);
  var Nb = calculerNombreBatteries(Cb, input.batterie.capacite);
  var Cb_Wh_total = Nb * input.batterie.capacite * Vsys;

  var L1 = input.L1 || 30, L2 = input.L2 || 1, L3 = input.L3 || 30;
  var V1 = sp.V_string;
  var S1 = calculerSectionCable(L1, Ic.normalise, V1);

  var I2_brut = Nb * (input.batterie.capacite * 0.4); // règle de 3 depuis 100Ah->40A (méthode du cours)
  var S2 = calculerSectionCable(L2, I2_brut, Vsys);

  var V3 = 230;
  var I3 = Pconv.normalise / V3;
  var S3 = calculerSectionCable(L3, I3, V3);

  var D1 = calculerDisjoncteur(V1, Ic.normalise);
  var D2 = calculerDisjoncteur(Vsys, I2_brut);
  var D3 = calculerDisjoncteur(V3, I3);

  var comparaison = calculerComparaisonEnergie(NP, input.panneau.puissance, input.IR, bilan.E_total);

  return {
    bilan: bilan, Ej: Ej, Pc: Pc, IR: input.IR,
    NP: NP, Vsys: Vsys, Ns: sp.Ns, N: sp.N, V_string: sp.V_string,
    panneau: input.panneau,
    Ic: Ic, Pconv: Pconv,
    batterie: input.batterie, TD: TD, joursAuto: joursAuto, reserveNuageuse: reserveNuageuse,
    Cb: Cb, Nb: Nb, Cb_Wh_total: Cb_Wh_total,
    S1: S1, S2: S2, S3: S3, L1: L1, L2: L2, L3: L3,
    V1: V1, I1: Ic.normalise, V2: Vsys, I2: I2_brut, V3: V3, I3: I3,
    D1: D1, D2: D2, D3: D3,
    comparaison: comparaison
  };
}
