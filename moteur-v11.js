// ================================================================
//  PULSAR ECO GROUP — MOTEUR IA v11.0
//  Évolutions validées le 29/08-30/08 (6 points) :
//   1) Stockage : (30%×E_jour + E_nuit) × 1,10  +  indice Is
//   3) Tableau appareils V2 : temps d'utilisation + verrouillage (UI, wizard-v11.js)
//   4) Écran Onduleur + contrôle de compatibilité
//   5) Panneaux : nombre jamais premier, séries max / parallèles min
//   6) Boucle d'optimisation : réduction du nombre de batteries (≤10% d'écart)
// ================================================================

var C = {
  ETA_ONDULEUR:   0.9,
  ETA_REGULATEUR: 0.9,
  ETA_BATTERIE:   0.9,
  RP:             0.65,
  K_SECURITE:     1.25,
  RHO_CUIVRE:     16e-9,
  DELTA_V:        0.02,
  JOURS_AUTONOMIE_DEFAUT: 1,
  MARGE_STOCKAGE: 0.10,      // point 1 : marge appliquée sur l'énergie à stocker
  PART_JOUR_STOCKAGE: 0.30,  // point 1 : 30% de l'énergie du jour entre dans le besoin de stockage
  MARGE_OPTIMISATION: 0.10,  // point 6 : écart maximal toléré pour retirer une batterie
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
//  1) BILAN ÉNERGÉTIQUE — jour / nuit + pointe de démarrage
//  (inchangé par rapport au v10 ; equipements = [{nom,pu,nombre,heuresActives[24]}])
// ================================================================
function calculerBilanV10(equipements, heureLever, heureCoucher) {
  heureLever   = (heureLever   === undefined) ? C.HEURE_LEVER_DEFAUT   : heureLever;
  heureCoucher = (heureCoucher === undefined) ? C.HEURE_COUCHER_DEFAUT : heureCoucher;

  var lignes = [];
  var PT_total = 0, E_total = 0, E_jour_total = 0, E_nuit_total = 0;
  var classiques = [], inductifs = [];
  var courbePointe = new Array(24).fill(0);

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
    for (var h2 = 0; h2 < 24; h2++) if (heuresActives[h2]) courbePointe[h2] += P_pointe_appareil;

    PT_total += PT; E_total += E; E_jour_total += E_jour; E_nuit_total += E_nuit;

    var ligne = {
      nom: eq.nom, pu: eq.pu, nombre: eq.nombre, heures: nbHeures,
      PT: PT, E: E, E_jour: E_jour, E_nuit: E_nuit,
      coeff: coeff, P_pointe: P_pointe_appareil, heuresActives: heuresActives
    };
    lignes.push(ligne);
    (coeff > 1 ? inductifs : classiques).push(ligne);
  });

  var P_pointe_max = 0, heure_pointe = 0;
  for (var h3 = 0; h3 < 24; h3++) if (courbePointe[h3] > P_pointe_max) { P_pointe_max = courbePointe[h3]; heure_pointe = h3; }

  return {
    lignes: lignes, PT_total: PT_total, E_total: E_total,
    E_jour_total: E_jour_total, E_nuit_total: E_nuit_total,
    classiques: classiques, inductifs: inductifs,
    courbePointe: courbePointe, P_pointe_max: P_pointe_max, heure_pointe: heure_pointe,
    heureLever: heureLever, heureCoucher: heureCoucher
  };
}

function calculerEnergieJournaliere(E_total) { return 1.2 * E_total; }
function calculerPuissanceCrete(Ej, IR) { return Ej / (C.ETA_ONDULEUR * C.ETA_REGULATEUR * C.RP * IR); }
function tensionSysteme(Pc_Wc) { if (Pc_Wc < 500) return 12; if (Pc_Wc <= 2000) return 24; return 48; }

// ================================================================
//  POINT 5 — NOMBRE DE PANNEAUX : jamais premier, séries max / parallèles min
// ================================================================
function estPremier(n) {
  if (n < 2) return false;
  for (var i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

// Renvoie la plus grande paire de diviseurs (Ns, N) d'un nombre composé n,
// avec Ns le plus grand possible sous la contrainte Ns*Voc <= VmaxMPPT (séries longues / parallèles mini)
function factoriserPourSeriesLongues(n, Voc, VmaxMPPT) {
  var meilleurNs = 1, meilleurN = n;
  for (var d = 1; d <= n; d++) {
    if (n % d !== 0) continue;
    var Ns = d, N = n / d;
    if (Ns * Voc <= VmaxMPPT && Ns >= meilleurNs) { meilleurNs = Ns; meilleurN = N; }
  }
  return { Ns: meilleurNs, N: meilleurN };
}

function calculerNombrePanneauxOptimise(Pc, Voc, VmaxMPPT) {
  return function (Pu) {
    var NP = Math.ceil(Pc / Pu);
    if (NP < 1) NP = 1;
    var ajuste = false;
    if (estPremier(NP) && NP > 2) { NP = NP + 1; ajuste = true; }
    var fp = factoriserPourSeriesLongues(NP, Voc, VmaxMPPT || 150);
    return {
      NP_calcule: Math.ceil(Pc / Pu),
      NP_final: fp.Ns * fp.N,
      ajusteNombrePremier: ajuste,
      Ns: fp.Ns, N: fp.N,
      V_string: +(fp.Ns * Voc).toFixed(2)
    };
  };
}

function calculerIntensiteControleur(N, Isc) {
  var Ic_brut = C.K_SECURITE * N * Isc;
  return { brut: +Ic_brut.toFixed(2), normalise: prochaineValeur(Ic_brut, CALIBRES_DISJONCTEUR) };
}

function calculerPuissanceConvertisseur(P_pointe_max) {
  var brut = C.K_SECURITE * P_pointe_max;
  return { brut: +brut.toFixed(2), normalise: Math.ceil(brut / 100) * 100 };
}

// ================================================================
//  POINT 1 — CAPACITÉ DE STOCKAGE + INDICE DE STOCKAGE (Is)
// ================================================================
function calculerBesoinStockage(E_jour, E_nuit) {
  var base = C.PART_JOUR_STOCKAGE * E_jour + E_nuit;
  var avecMarge = base * (1 + C.MARGE_STOCKAGE);
  return { base: base, avecMarge: avecMarge };
}

function calculerIndiceStockage(E_nuit, E_total) {
  if (E_total <= 0) return 0;
  return +(E_nuit / E_total).toFixed(2);
}

function calculerCapaciteBatterie(energieAStocker, joursAutonomie, Vbat, TD) {
  return energieAStocker * joursAutonomie / (C.ETA_ONDULEUR * C.ETA_BATTERIE * Vbat * TD);
}

function calculerNombreBatteries(Cb, Cu) { return Math.ceil(Cb / Cu); }

// ================================================================
//  POINT 6 — BOUCLE D'OPTIMISATION : réduire le nombre de batteries
//  tant que l'écart avec le besoin réel reste <= MARGE_OPTIMISATION
// ================================================================
function optimiserNombreBatteries(Nb_initial, Cu, energieAStocker, Vbat, TD) {
  var etapes = [];
  var Nb = Nb_initial;
  var capaciteWh = function (n) { return n * Cu * C.ETA_ONDULEUR * C.ETA_BATTERIE * Vbat * TD; };

  while (Nb > 1) {
    var capActuelle = capaciteWh(Nb - 1);
    var ecart = (capActuelle - energieAStocker) / energieAStocker; // négatif si insuffisant
    etapes.push({ Nb: Nb - 1, capaciteWh: +capActuelle.toFixed(0), ecart: +(ecart * 100).toFixed(1) });
    if (ecart >= -C.MARGE_OPTIMISATION) {
      Nb = Nb - 1; // on peut retirer une batterie de plus, on continue la boucle
    } else {
      break; // retirer une de plus ferait tomber sous le besoin - marge tolérée : on s'arrête
    }
  }
  return { Nb_final: Nb, Nb_avant_optimisation: Nb_initial, etapesTestees: etapes };
}

// ================================================================
//  SECTIONS DE CÂBLE / DISJONCTEURS (inchangé)
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
//  POINT 4 — CONTRÔLE DE COMPATIBILITÉ ONDULEUR
// ================================================================
function verifierCompatibiliteOnduleur(onduleur, Vsys, V_string_max, Isc_total_parallele, Pconv_W) {
  var alertes = [];
  if (onduleur.tensionBatMin !== undefined && (Vsys < onduleur.tensionBatMin || Vsys > onduleur.tensionBatMax)) {
    alertes.push('Tension batterie système (' + Vsys + 'V) hors de la plage acceptée par l\'onduleur (' + onduleur.tensionBatMin + '-' + onduleur.tensionBatMax + 'V).');
  }
  if (onduleur.vocMax !== undefined && V_string_max > onduleur.vocMax) {
    alertes.push('Tension d\'une série de panneaux (' + V_string_max + 'V) dépasse la tension max d\'entrée PV de l\'onduleur (' + onduleur.vocMax + 'V).');
  }
  if (onduleur.imppMax !== undefined && Isc_total_parallele > onduleur.imppMax) {
    alertes.push('Courant total des panneaux en parallèle (' + Isc_total_parallele.toFixed(1) + 'A) dépasse le courant max d\'entrée PV de l\'onduleur (' + onduleur.imppMax + 'A).');
  }
  if (onduleur.puissanceNominale !== undefined && Pconv_W > onduleur.puissanceNominale) {
    alertes.push('Puissance requise (' + Pconv_W + 'W) dépasse la puissance nominale de l\'onduleur (' + onduleur.puissanceNominale + 'W).');
  }
  return { compatible: alertes.length === 0, alertes: alertes };
}

// ================================================================
//  CALCUL COMPLET — enchaîne toutes les étapes (v11)
// ================================================================
function calculDimensionnementComplet(input) {
  var bilan = calculerBilanV10(input.equipements, input.heureLever, input.heureCoucher);
  var Ej = calculerEnergieJournaliere(bilan.E_total);
  var Pc = calculerPuissanceCrete(Ej, input.IR);

  var optimNP = calculerNombrePanneauxOptimise(Pc, input.panneau.voc, input.Vmax_MPPT)(input.panneau.puissance);
  var NP = optimNP.NP_final, Ns = optimNP.Ns, N = optimNP.N, V_string = optimNP.V_string;
  var Vsys = tensionSysteme(Pc);

  var Ic = calculerIntensiteControleur(N, input.panneau.icc);
  var Pconv = calculerPuissanceConvertisseur(bilan.P_pointe_max);

  // Point 1 : stockage
  var stockage = calculerBesoinStockage(bilan.E_jour_total, bilan.E_nuit_total);
  var Is = calculerIndiceStockage(bilan.E_nuit_total, bilan.E_total);
  var TD = TD_BATTERIE[input.batterie.type] || 0.8;
  var joursAuto = input.joursAutonomie || C.JOURS_AUTONOMIE_DEFAUT;
  var Cb = calculerCapaciteBatterie(stockage.avecMarge, joursAuto, Vsys, TD);
  var Nb_initial = calculerNombreBatteries(Cb, input.batterie.capacite);

  // Point 6 : optimisation (réduction du nombre de batteries)
  var optimBatteries = optimiserNombreBatteries(Nb_initial, input.batterie.capacite, stockage.avecMarge * joursAuto, Vsys, TD);
  var Nb = optimBatteries.Nb_final;
  var Cb_Wh_total = Nb * input.batterie.capacite * Vsys;

  var L1 = input.L1 || 30, L2 = input.L2 || 1, L3 = input.L3 || 30;
  var S1 = calculerSectionCable(L1, Ic.normalise, V_string);
  var I2_brut = Nb * (input.batterie.capacite * 0.4);
  var S2 = calculerSectionCable(L2, I2_brut, Vsys);
  var V3 = 230;
  var I3 = Pconv.normalise / V3;
  var S3 = calculerSectionCable(L3, I3, V3);

  var D1 = calculerDisjoncteur(V_string, Ic.normalise);
  var D2 = calculerDisjoncteur(Vsys, I2_brut);
  var D3 = calculerDisjoncteur(V3, I3);

  // Point 4 : compatibilité onduleur (si un onduleur a été choisi)
  var compatOnduleur = null;
  if (input.onduleur) {
    compatOnduleur = verifierCompatibiliteOnduleur(input.onduleur, Vsys, V_string, N * input.panneau.icc, Pconv.normalise);
  }

  var E_produite_Wh = NP * input.panneau.puissance * input.IR * (C.ETA_ONDULEUR * C.ETA_REGULATEUR * C.RP);
  var taux = bilan.E_total > 0 ? (E_produite_Wh / bilan.E_total) * 100 : 0;

  return {
    bilan: bilan, Ej: Ej, Pc: Pc, IR: input.IR,
    NP: NP, NP_calcule: optimNP.NP_calcule, ajusteNombrePremier: optimNP.ajusteNombrePremier,
    Vsys: Vsys, Ns: Ns, N: N, V_string: V_string,
    panneau: input.panneau,
    Ic: Ic, Pconv: Pconv,
    batterie: input.batterie, TD: TD, joursAuto: joursAuto,
    stockage: stockage, Is: Is,
    Cb: Cb, Nb: Nb, Nb_initial: Nb_initial, optimBatteries: optimBatteries, Cb_Wh_total: Cb_Wh_total,
    S1: S1, S2: S2, S3: S3, L1: L1, L2: L2, L3: L3,
    V1: V_string, I1: Ic.normalise, V2: Vsys, I2: I2_brut, V3: V3, I3: I3,
    D1: D1, D2: D2, D3: D3,
    onduleur: input.onduleur || null, compatOnduleur: compatOnduleur,
    comparaison: { E_produite_Wh: E_produite_Wh, E_besoin_Wh: bilan.E_total, tauxCouverture: +taux.toFixed(0), margeSecurite: +(taux - 100).toFixed(0) }
  };
}
