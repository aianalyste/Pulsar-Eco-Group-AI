// ================================================================
//  PULSAR ECO GROUP — MOTEUR IA
//  Bande horaire : Jour = 06h-17h (cases 6 à 17) / Nuit = 18h-05h (cases 18 à 23 puis 0 à 5)
// ================================================================

var C = {
  ETA_ONDULEUR:   0.9,
  ETA_REGULATEUR: 0.9,
  ETA_BATTERIE:   0.9,
  RP:             0.70,   // modifié : 0,65 -> 0,70 (demande boss)
  K_SECURITE:     1.25,
  RHO_CUIVRE:     16e-9,
  DELTA_V:        0.02,
  JOURS_AUTONOMIE_DEFAUT: 1,
  MARGE_STOCKAGE: 0.10,
  PART_JOUR_STOCKAGE: 0.30,
  MARGE_OPTIMISATION: 0.10,
  HEURE_LEVER_DEFAUT:   6,
  HEURE_COUCHER_DEFAUT: 17
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
//  BILAN ÉNERGÉTIQUE — jour / nuit + pointe de démarrage
//  equipements = [{nom,pu,nombre,heuresActives[24]}]
//  Jour = heureLever à heureCoucher INCLUS (ex: 06h-17h)
//  Nuit = le reste (ex: 18h-05h)
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
      // Jour = heureLever à heureCoucher INCLUS (ex: 6h..17h)
      var estJour = (h >= heureLever && h <= heureCoucher);
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

function estPremier(n) {
  if (n < 2) return false;
  for (var i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

// ================================================================
//  ÉTAPE 2 — ARRANGEMENT SÉRIE / PARALLÈLE (règle du responsable)
//  1) NP × Voc <= Voc max onduleur  -> UNE seule chaîne en série (NP peut être premier)
//  2) sinon -> au moins 2 chaînes parallèles, avec le MÊME nombre de panneaux
//     en série dans chaque chaîne (ex: 4 séries × 2 parallèles). NP ne peut alors
//     pas être premier : on prend le plus petit NP' >= NP qui se divise ainsi.
//  Vérification complémentaire : plage MPPT (Ns × Vmp) si les données existent.
//  Retour : Ns = panneaux en série par chaîne ; N = nombre de chaînes en parallèle.
// ================================================================
function limiteVocOnduleur(onduleur, repli) {
  if (onduleur && onduleur.vocMax) return onduleur.vocMax;
  return repli || 150;
}

function optionsMppt(panneau, onduleur) {
  return { vmp: panneau && panneau.vmp, mpptMin: onduleur && onduleur.mpptMin, mpptMax: onduleur && onduleur.mpptMax };
}

function calculerArrangementPanneaux(NP0, Voc, VocMax, opts) {
  opts = opts || {};
  var vmp = opts.vmp, mpptMin = opts.mpptMin, mpptMax = opts.mpptMax;
  if (NP0 < 1) NP0 = 1;
  var avert = [];

  if (!(Voc > 0) || !(VocMax > 0)) {
    return { NP_final: NP0, Ns: NP0, N: 1, V_string: 0, ajuste: false, possible: false, avertissements: ['Voc du panneau ou Voc max de l\'onduleur manquant : arrangement non vérifiable.'], motif: 'Données manquantes.' };
  }
  if (Voc > VocMax) {
    return { NP_final: NP0, Ns: 1, N: NP0, V_string: +Voc.toFixed(2), ajuste: false, possible: false, avertissements: ['Un seul panneau (Voc ' + Voc + ' V) dépasse déjà la tension max de l\'onduleur (' + VocMax + ' V).'], motif: 'Impossible avec cet onduleur.' };
  }

  function mpptOK(Ns) {
    if (!(vmp > 0) || !(mpptMin > 0)) return null;     // inconnu
    var v = Ns * vmp;
    return v >= mpptMin && (!(mpptMax > 0) || v <= mpptMax);
  }

  var res = null;
  if (NP0 * Voc <= VocMax) {
    res = { NP_final: NP0, Ns: NP0, N: 1,
      motif: NP0 + ' × ' + Voc + ' V = ' + (NP0 * Voc).toFixed(1) + ' V ≤ ' + VocMax + ' V (Voc max onduleur) : une seule chaîne en série suffit' +
             (estPremier(NP0) && NP0 > 2 ? ' (nombre premier accepté).' : '.') };
  } else {
    for (var NP = NP0; NP <= NP0 + 60 && !res; NP++) {
      var cands = [];
      var NsMin = (Math.floor(VocMax / Voc) >= 2) ? 2 : 1;   // chaînes d'au moins 2 panneaux dès que la tension le permet
      for (var Np = 2; Np <= NP; Np++) {
        if (NP % Np !== 0) continue;
        var Ns = NP / Np;
        if (Ns >= NsMin && Ns * Voc <= VocMax) cands.push({ Ns: Ns, N: Np });
      }
      if (!cands.length) continue;
      var choix = cands[0];                              // le moins de chaînes parallèles possible
      for (var i = 0; i < cands.length; i++) { if (mpptOK(cands[i].Ns) === true) { choix = cands[i]; break; } }
      res = { NP_final: NP, Ns: choix.Ns, N: choix.N,
        motif: NP0 + ' × ' + Voc + ' V = ' + (NP0 * Voc).toFixed(1) + ' V > ' + VocMax + ' V (Voc max onduleur) : au moins 2 chaînes parallèles égales → ' +
               choix.Ns + ' en série × ' + choix.N + ' en parallèle' + (NP !== NP0 ? ' (' + NP0 + ' ajusté à ' + NP + ' pour des chaînes égales)' : '') + '.' };
    }
    if (!res) {
      return { NP_final: NP0, Ns: 1, N: NP0, V_string: +Voc.toFixed(2), ajuste: false, possible: false, avertissements: ['Aucun arrangement trouvé.'], motif: 'Aucun arrangement trouvé.' };
    }
  }

  res.V_string = +(res.Ns * Voc).toFixed(2);
  res.ajuste = res.NP_final !== NP0;
  res.possible = true;
  var m = mpptOK(res.Ns);
  if (m === null) avert.push('Plage MPPT non vérifiée (Vmp du panneau ou MPPT min de l\'onduleur manquant).');
  else if (m === false) avert.push('Tension MPPT de la chaîne (' + (res.Ns * vmp).toFixed(0) + ' V) hors de la plage MPPT de l\'onduleur (' + mpptMin + '-' + (mpptMax || '?') + ' V).');
  res.avertissements = avert;
  return res;
}

// Conserve l'ancien nom : utilisé par le wizard et calculDimensionnementComplet
function calculerNombrePanneauxOptimise(Pc, Voc, VocMax, opts) {
  return function (Pu) {
    var NP = Math.ceil(Pc / Pu);
    if (NP < 1) NP = 1;
    var a = calculerArrangementPanneaux(NP, Voc, VocMax || 150, opts);
    return {
      NP_calcule: NP, NP_final: a.NP_final, ajusteNombrePremier: a.ajuste,
      Ns: a.Ns, N: a.N, V_string: a.V_string,
      possible: a.possible, motif: a.motif, avertissements: a.avertissements
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

function optimiserNombreBatteries(Nb_initial, Cu, energieAStocker, Vbat, TD) {
  var etapes = [];
  var Nb = Nb_initial;
  var capaciteWh = function (n) { return n * Cu * C.ETA_ONDULEUR * C.ETA_BATTERIE * Vbat * TD; };

  while (Nb > 1) {
    var capActuelle = capaciteWh(Nb - 1);
    var ecart = (capActuelle - energieAStocker) / energieAStocker;
    etapes.push({ Nb: Nb - 1, capaciteWh: +capActuelle.toFixed(0), ecart: +(ecart * 100).toFixed(1) });
    if (ecart >= -C.MARGE_OPTIMISATION) { Nb = Nb - 1; } else { break; }
  }
  return { Nb_final: Nb, Nb_avant_optimisation: Nb_initial, etapesTestees: etapes };
}

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

function calculDimensionnementComplet(input) {
  var bilan = calculerBilanV10(input.equipements, input.heureLever, input.heureCoucher);
  var Ej = calculerEnergieJournaliere(bilan.E_total);
  var Pc = calculerPuissanceCrete(Ej, input.IR);

  var optsMppt = optionsMppt(input.panneau, input.onduleur);
  var VocMax = limiteVocOnduleur(input.onduleur, input.Vmax_MPPT);
  var optimNP = calculerNombrePanneauxOptimise(Pc, input.panneau.voc, VocMax, optsMppt)(input.panneau.puissance);
  var NP = optimNP.NP_final, Ns = optimNP.Ns, N = optimNP.N, V_string = optimNP.V_string;
  var Vsys = tensionSysteme(Pc);

  var Ic = calculerIntensiteControleur(N, input.panneau.icc);
  var Pconv = calculerPuissanceConvertisseur(bilan.P_pointe_max);

  var stockage = calculerBesoinStockage(bilan.E_jour_total, bilan.E_nuit_total);
  var Is = calculerIndiceStockage(bilan.E_nuit_total, bilan.E_total);
  var TD = TD_BATTERIE[input.batterie.type] || 0.8;
  var joursAuto = input.joursAutonomie || C.JOURS_AUTONOMIE_DEFAUT;
  var Cb = calculerCapaciteBatterie(stockage.avecMarge, joursAuto, Vsys, TD);
  var Nb_initial = calculerNombreBatteries(Cb, input.batterie.capacite);

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

  var compatOnduleur = null;
  if (input.onduleur) {
    compatOnduleur = verifierCompatibiliteOnduleur(input.onduleur, Vsys, V_string, N * input.panneau.icc, Pconv.normalise);
  }

  var E_produite_Wh = NP * input.panneau.puissance * input.IR * (C.ETA_ONDULEUR * C.ETA_REGULATEUR * C.RP);
  var taux = bilan.E_total > 0 ? (E_produite_Wh / bilan.E_total) * 100 : 0;

  return {
    bilan: bilan, Ej: Ej, Pc: Pc, IR: input.IR,
    NP: NP, NP_calcule: optimNP.NP_calcule, ajusteNombrePremier: optimNP.ajusteNombrePremier,
    motifArrangement: optimNP.motif, avertissementsArrangement: optimNP.avertissements,
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


// ================================================================
//  ÉTAPE 3 — RECOMMANDATION AUTOMATIQUE (panneaux, onduleur, batteries)
//  Principe : éviter le surdimensionnement. Basée uniquement sur les règles
//  déjà validées (Vsys, Pconv, arrangement série/parallèle, compatibilité
//  onduleur, stockage + boucle d'optimisation des batteries).
//  Retour : { panneau, onduleur, batterie, arrangement, Nb, justifications[], alertes[] }
// ================================================================
function recommanderEquipements(p) {
  // p = { Pc, bilan, joursAutonomie, panneaux[], onduleurs[], batteries[] }
  var res = { panneau: null, onduleur: null, batterie: null, arrangement: null, Nb: 0, justifications: [], alertes: [] };
  var Vsys = tensionSysteme(p.Pc);
  var Pconv = calculerPuissanceConvertisseur(p.bilan.P_pointe_max);
  var jours = p.joursAutonomie || C.JOURS_AUTONOMIE_DEFAUT;
  res.Vsys = Vsys; res.Pconv = Pconv;

  // --- Onduleur + panneau (choisis ensemble car liés par la tension) ---
  var onds = p.onduleurs.filter(function (o) {
    return o.tensionBatMin !== undefined && Vsys >= o.tensionBatMin && Vsys <= o.tensionBatMax && o.puissanceNominale >= Pconv.normalise;
  }).sort(function (a, b) { return (a.puissanceNominale - b.puissanceNominale) || ((b.vocMax || 0) - (a.vocMax || 0)); });
  // Les onduleurs sans entrée PV (vocMax absent) ne conviennent que s'il n'y a rien d'autre
  var avecPV = onds.filter(function (o) { return o.vocMax; });
  if (avecPV.length) onds = avecPV;

  var trouve = false;
  for (var i = 0; i < onds.length && !trouve; i++) {
    var o = onds[i], meilleur = null;
    p.panneaux.forEach(function (pan) {
      var opt = calculerNombrePanneauxOptimise(p.Pc, pan.voc, limiteVocOnduleur(o, 150), optionsMppt(pan, o))(pan.puissance);
      if (!opt.possible) return;
      var compat = verifierCompatibiliteOnduleur(o, Vsys, opt.V_string, opt.N * pan.icc, Pconv.normalise);
      if (!compat.compatible) return;
      var surplus = opt.NP_final * pan.puissance - p.Pc;
      var cand = { pan: pan, opt: opt, surplus: surplus };
      if (!meilleur || surplus < meilleur.surplus || (surplus === meilleur.surplus && opt.NP_final < meilleur.opt.NP_final)) meilleur = cand;
    });
    if (meilleur) {
      trouve = true;
      res.onduleur = o; res.panneau = meilleur.pan; res.arrangement = meilleur.opt;
      res.justifications.push('Onduleur ' + o.fabricant + ' ' + o.modele + ' : le plus petit du catalogue qui accepte ' + Vsys + ' V de batterie et couvre ' + Pconv.normalise + ' W (' + o.puissanceNominale + ' W) — pas de surdimensionnement.');
      res.justifications.push('Panneau ' + meilleur.pan.fabricant + ' ' + meilleur.pan.modele + ' (' + meilleur.pan.puissance + ' W) : ' + meilleur.opt.NP_final + ' panneaux = ' + (meilleur.opt.NP_final * meilleur.pan.puissance) + ' Wc pour ' + Math.ceil(p.Pc) + ' Wc requis (écart minimal du catalogue compatible). ' + meilleur.opt.motif);
    }
  }
  if (!trouve && onds.length) {
    // Repli : meilleure approximation (onduleur le plus petit adapté en tension batterie et puissance), avec alertes explicites
    var o2 = onds[0], m2 = null;
    p.panneaux.forEach(function (pan) {
      var opt = calculerNombrePanneauxOptimise(p.Pc, pan.voc, limiteVocOnduleur(o2, 150), optionsMppt(pan, o2))(pan.puissance);
      if (!opt.possible) return;
      var sp = opt.NP_final * pan.puissance - p.Pc;
      if (!m2 || sp < m2.sp) m2 = { pan: pan, opt: opt, sp: sp };
    });
    if (m2) {
      trouve = true;
      res.onduleur = o2; res.panneau = m2.pan; res.arrangement = m2.opt;
      var cp = verifierCompatibiliteOnduleur(o2, Vsys, m2.opt.V_string, m2.opt.N * m2.pan.icc, Pconv.normalise);
      res.justifications.push('Onduleur ' + o2.fabricant + ' ' + o2.modele + ' + panneau ' + m2.pan.fabricant + ' ' + m2.pan.modele + ' : meilleure approximation du catalogue (' + m2.opt.NP_final + ' panneaux, ' + m2.opt.Ns + ' en série × ' + m2.opt.N + ' en parallèle).');
      cp.alertes.forEach(function (al) { res.alertes.push('Point d\'attention : ' + al); });
      res.alertes.push('Aucune combinaison entièrement compatible dans le catalogue : choisissez un autre onduleur ou ajoutez-en un via « + Nouvel onduleur ».');
    }
  }
  if (!trouve) res.alertes.push('Aucun onduleur du catalogue n\'accepte ' + Vsys + ' V de batterie avec ' + Pconv.normalise + ' W. Ajoutez un onduleur adapté via « + Nouvel onduleur ».');

  // --- Batteries : montage en parallèle uniquement -> tension batterie = tension système ---
  var stockage = calculerBesoinStockage(p.bilan.E_jour_total, p.bilan.E_nuit_total);
  var besoin = stockage.avecMarge * jours;
  var bats = p.batteries.filter(function (b) { return b.tension === Vsys; });
  var best = null;
  bats.forEach(function (b) {
    var TD = TD_BATTERIE[b.type] || 0.8;
    var Cb = calculerCapaciteBatterie(stockage.avecMarge, jours, Vsys, TD);
    var Nb0 = calculerNombreBatteries(Cb, b.capaciteAh);
    var opt = optimiserNombreBatteries(Nb0, b.capaciteAh, besoin, Vsys, TD);
    var cap = opt.Nb_final * b.capaciteAh * C.ETA_ONDULEUR * C.ETA_BATTERIE * Vsys * TD;
    var ecart = (cap - besoin) / besoin;
    var cand = { b: b, Nb: opt.Nb_final, ecart: ecart, TD: TD };
    var ok = ecart >= -C.MARGE_OPTIMISATION;
    var meilleurOk = best && best.ecart >= -C.MARGE_OPTIMISATION;
    if (!best || (ok && !meilleurOk) || (ok === meilleurOk && (Math.abs(ecart) < Math.abs(best.ecart) - 1e-9 ||
        (Math.abs(Math.abs(ecart) - Math.abs(best.ecart)) <= 1e-9 && (cand.Nb < best.Nb || (cand.Nb === best.Nb && b.type === 'Lithium-LiFePO4' && best.b.type !== 'Lithium-LiFePO4')))))) best = cand;
  });
  if (best) {
    res.batterie = best.b; res.Nb = best.Nb;
    res.justifications.push('Batterie ' + best.b.fabricant + ' ' + best.b.modele + ' (' + best.b.type + ', ' + best.b.tension + ' V) : ' + best.Nb + ' unité(s) en parallèle pour ' + Math.round(besoin) + ' Wh à stocker, écart ' + (best.ecart * 100).toFixed(0) + ' % (limite −10 %), tension égale à celle du système.');
  } else {
    res.alertes.push('Aucune batterie de ' + Vsys + ' V dans le catalogue (montage en parallèle uniquement). Ajoutez-en une via « + Nouvelle batterie ».');
  }
  return res;
}

// ================================================================
//  ÉTAPE 4 — PROFILS HORAIRES PAR DÉFAUT (centralisés, extensibles)
//  mots : fragments (minuscules, sans accent) cherchés dans le nom de l'appareil.
//  heures : ordre de PRÉFÉRENCE ; on prend les N premières (N = temps déclaré).
//  Les cases restent modifiables à la main. Jour = 6-17, nuit = 18-5.
//  Pour ajouter un appareil : ajouter une ligne ci-dessous.
// ================================================================
var PROFILS_HORAIRES = [
  { nom: 'Fer à repasser',       mots: ['fer a repasser', 'repasser', 'fer electrique'], heures: [15, 16, 14, 17, 13, 12, 11, 10, 9, 8] },
  { nom: 'Éclairage extérieur',  mots: ['exterieur', 'projecteur', 'lampadaire', 'eclairage ext'], heures: [19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 18] },
  { nom: 'Télévision',           mots: ['television', 'tele', 'tv', 'ecran plat'], heures: [19, 20, 21, 22, 18, 23, 17, 16, 15] },
  { nom: 'Réfrigérateur / congélateur', mots: ['refrigerateur', 'frigo', 'congelateur', 'frigidaire'], heures: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23] },
  { nom: 'Ventilateur',          mots: ['ventilateur', 'brasseur'], heures: [13, 14, 15, 16, 12, 17, 11, 22, 23, 0, 1, 2] },
  { nom: 'Pompe à eau',          mots: ['pompe'], heures: [9, 10, 11, 8, 12, 14, 15, 16, 7, 13, 17, 6] },
  { nom: 'Climatiseur',          mots: ['climatiseur', 'clim'], heures: [13, 14, 15, 16, 12, 22, 23, 0, 1, 2, 3, 4, 17, 21, 20, 19, 18, 5] },
  { nom: 'Éclairage intérieur',  mots: ['lampe', 'ampoule', 'eclairage', 'led'], heures: [19, 20, 21, 22, 18, 23, 5, 6] },
  { nom: 'Ordinateur',           mots: ['ordinateur', 'laptop', 'pc portable'], heures: [8, 9, 10, 11, 14, 15, 16, 17, 12, 13] }
];

function normaliserNomAppareil(n) {
  return String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function trouverProfilHoraire(nom) {
  var t = ' ' + normaliserNomAppareil(nom) + ' ';
  // on teste d'abord les profils les plus spécifiques (ordre du tableau)
  for (var i = 0; i < PROFILS_HORAIRES.length; i++) {
    var pr = PROFILS_HORAIRES[i];
    for (var j = 0; j < pr.mots.length; j++) {
      var m = pr.mots[j];
      var re = m.length <= 4 ? new RegExp('(^|[^a-z])' + m + '([^a-z]|$)') : null;
      if (re ? re.test(t) : t.indexOf(m) !== -1) return pr;
    }
  }
  return null;
}

// Retourne un tableau de 24 booléens, ou null si aucun profil
function proposerHeures(nom, tempsDeclare) {
  var pr = trouverProfilHoraire(nom);
  if (!pr) return null;
  var a = new Array(24).fill(false);
  pr.heures.slice(0, tempsDeclare).forEach(function (h) { a[h] = true; });
  return { heuresActives: a, profil: pr.nom, complet: pr.heures.length >= tempsDeclare };
}