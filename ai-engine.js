// ================================================================
//  PULSAR ECO GROUP — MOTEUR IA v8.0
//  Basé sur FES12-Tech Module 3 — Dimensionnement SSPV
//  Formules certifiées IEC / NF C 15-100 / UTE C15-712
// ================================================================

// ===== CONSTANTES NORMATIVES (livre FES12) =====
var NORM = {
  PR_DIRECT:    0.75,  // Performance Ratio utilisation directe
  PR_BATTERIE:  0.60,  // Performance Ratio avec batterie
  EFF_PANNEAU:  0.90,
  EFF_CABLE:    0.95,
  EFF_REGU:     0.95,
  EFF_BATTERIE: 0.80,
  EFF_CONV:     0.93,
  DOD:          0.80,  // Profondeur de décharge batterie
  COEFF_SEC_ISC:1.25,  // Facteur sécurité Isc (norme)
  COEFF_SEC_PAN:1.10,  // Sécurité puissance panneaux
  CHUTE_TENSION_MAX: 0.03, // 3% max (UTE C15-712)
  RESISTIVITE_CU: 0.01786, // Ω.mm²/m cuivre
  DUREE_VIE: "5 à 8"
};

// ===== TENSION SYSTÈME selon puissance (tableau livre p.30) =====
function tensionSysteme(Pkwc) {
  if (Pkwc < 0.5) return 12;
  if (Pkwc < 2)   return 24;
  if (Pkwc < 10)  return 48;
  return 96;
}

// ===== SECTION CÂBLE (formule livre p.38) =====
// S = (2 × L × I) / (ΔU_max × σ)
// σ cuivre = 56 m/(Ω.mm²), ΔU = 3% Vnom
function sectionCable(L_m, I_A, V_nom) {
  var dU = 0.03 * V_nom;
  var sigma = 56; // conductivité cuivre
  var S = (2 * L_m * I_A) / (dU * sigma);
  // Normaliser à section commerciale
  var sections = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50];
  for (var i=0; i<sections.length; i++) {
    if (sections[i] >= S) return { S: sections[i], S_calc: S.toFixed(2) };
  }
  return { S: 70, S_calc: S.toFixed(2) };
}

// ===== CALIBRE FUSIBLE / DISJONCTEUR DC (formule livre p.46) =====
// 1.4 × Isc_stc < In < 2 × Isc_stc
function calibreProtectionDC(Isc_stc) {
  var In_min = 1.4 * Isc_stc;
  var In_max = 2.0 * Isc_stc;
  var calibres = [10,16,20,25,32,40,50,63,80,100,125];
  for (var i=0; i<calibres.length; i++) {
    if (calibres[i] > In_min && calibres[i] <= In_max) return calibres[i];
  }
  return Math.ceil(In_min * 1.2);
}

// ===== APPAREILS À INDUCTION =====
var MOTS_INDUCTION = ['climatiseur','clim','pompe','moteur','compresseur',
  'réfrigérateur','frigo','congélateur','machine à laver','fer','four',
  'micro-onde','perceuse','scie','aspirateur','broyeur'];
function coeffDemarrage(nom) {
  var n = (nom||'').toLowerCase();
  for (var i=0; i<MOTS_INDUCTION.length; i++)
    if (n.indexOf(MOTS_INDUCTION[i])!==-1) return 2.5;
  return 1.0;
}

// ================================================================
//  RECALCUL PROFESSIONNEL MÉNAGE / ENTREPRISE
// ================================================================
function recalculerMenage(data) {
  var ville = data.ville || {hsp:5.2, lat:6.14, inclinaison:6, azimut:180, pays:"Togo"};
  var HSP   = ville.hsp || 5.2;
  var equip = data.equipements || [];

  // Bilan de puissance (livre p.21)
  var E_Wh = 0, P_pic_W = 0, P_continue_W = 0;
  equip.forEach(function(eq) {
    var coeff = coeffDemarrage(eq.nom);
    E_Wh         += eq.power * eq.qty * eq.hours;
    P_pic_W      += eq.power * eq.qty * coeff;   // pic démarrage
    P_continue_W += eq.power * eq.qty;            // puissance continue
  });

  // Performance Ratio (livre p.29) — avec batterie = 0.60
  var PR = NORM.PR_BATTERIE;

  // Énergie à produire par les panneaux
  var E_PV_Wh = E_Wh / PR;

  // Puissance crête champ PV (livre p.28)
  var P_crete_Wc = E_PV_Wh / HSP;

  // Nombre de panneaux 400W
  var nb_pan = Math.max(1, Math.ceil(P_crete_Wc / 400));

  // Tension système (livre p.30)
  var V_sys = tensionSysteme((nb_pan * 400) / 1000);

  // Dimensionnement batterie (livre p.24)
  // Capacité = E_Wh × autonomie / (DOD × η_batterie)
  var auto = parseFloat(data.autonomie_jours) || 1;
  var C_bat_Wh = (E_Wh * auto) / (NORM.DOD * NORM.EFF_BATTERIE);
  // Batterie 48V/100Ah = 4800 Wh
  var C_bat_unitaire = V_sys * 100; // Ah × V
  var nb_bat = Math.max(1, Math.ceil(C_bat_Wh / C_bat_unitaire));

  // Dimensionnement onduleur (livre p.26-27)
  // Prendre en compte pic de puissance
  var P_ond_VA = Math.ceil(P_pic_W * 1.25 / 100) * 100;
  if (P_ond_VA < 300) P_ond_VA = 300;

  // Régulateur MPPT
  var I_sc_stc = 9.0; // Isc typique panneau 400W
  var Isc_champ = nb_pan * I_sc_stc;
  var I_regu = Math.ceil(Isc_champ * NORM.COEFF_SEC_ISC);

  // Câble DC (30m par défaut)
  var L_dc = 30;
  var I_dc = (nb_pan * 400) / V_sys;
  var cab_dc = sectionCable(L_dc, I_dc, V_sys);

  // Câble AC
  var I_ac = P_ond_VA / 220;
  var cab_ac = sectionCable(10, I_ac, 220);

  // Fusible DC (livre p.46)
  var In_fusible = calibreProtectionDC(I_sc_stc * nb_pan);

  // Parafoudre DC : Ucpv > 1.2 × Ns × Voc_stc (Voc_stc ≈ 49V pour 400W)
  var Ns = 1; // panneaux en série (simplifié)
  var Uoc_max = Math.round(1.2 * Ns * 49 * nb_pan);
  var Ucpv = Uoc_max <= 600 ? 800 : 1000;

  return {
    E_Wh, E_PV_Wh: Math.round(E_PV_Wh), PR,
    P_crete_Wc: Math.round(P_crete_Wc), P_pic_W: Math.round(P_pic_W),
    nb_pan, V_sys, kWc: ((nb_pan*400)/1000).toFixed(2),
    C_bat_Wh: Math.round(C_bat_Wh), nb_bat,
    cap_totale: ((nb_bat * C_bat_unitaire)/1000).toFixed(1),
    P_ond_VA, kVA: (P_ond_VA/1000).toFixed(1),
    I_regu, I_dc: I_dc.toFixed(1),
    cab_dc, cab_ac, In_fusible, Ucpv,
    HSP, auto, ville
  };
}

// ================================================================
//  RECALCUL AGRICOLE
// ================================================================
function recalculerAgri(data) {
  var ville = data.ville || {hsp:5.2, lat:6.14, inclinaison:8};
  var HSP   = ville.hsp || 5.2;
  var surface = parseFloat(data.surface_ha) || 1;
  var besoin  = parseFloat(data.culture_mm) || 5;
  var ef      = parseFloat(data.ef_irrig) || 0.9;
  var dp      = parseFloat(data.profondeur_m) || 20;
  var th      = parseFloat(data.hauteur_res_m) || 5;
  var hr      = parseFloat(data.heures_pompage) || 6;
  var pPan    = parseFloat(data.puissance_panneau_W) || 400;

  // Besoin eau
  var Q_jour = (surface * besoin * 10) / ef; // m³/jour
  var Q_h    = Q_jour / hr;                   // m³/h
  var Q_s    = Q_h / 3600;                    // m³/s

  // HMT avec pertes de charge 10%
  var HMT = (dp + th) * 1.10;

  // Puissance hydraulique Ph = ρ.g.Q.H (livre)
  var Ph  = 1000 * 9.81 * Q_s * HMT;    // W
  var Pp  = Ph / 0.50;                   // Puissance pompe η=50%
  var Ppv = Pp / (HSP * 0.75);          // Puissance PV

  var nb_pan = Math.max(1, Math.ceil(Ppv / pPan));
  var V_sys  = tensionSysteme((nb_pan * pPan) / 1000);

  var I_dc   = (nb_pan * pPan) / V_sys;
  var cab_dc = sectionCable(30, I_dc, V_sys);
  var In_fus = calibreProtectionDC(9.0 * nb_pan);
  var tuyau  = Q_h <= 3 ? "Ø40mm PN10" : Q_h <= 8 ? "Ø50mm PN10" : Q_h <= 18 ? "Ø75mm PN10" : "Ø110mm PN10";

  return {
    Q_jour: Q_jour.toFixed(1), Q_h: Q_h.toFixed(2),
    HMT: HMT.toFixed(1), Ph: Math.round(Ph),
    Pp_kW: (Pp/1000).toFixed(2), Ppv_kWc: (Ppv/1000).toFixed(2),
    nb_pan, pPan, kWc: ((nb_pan*pPan)/1000).toFixed(2),
    V_sys, I_dc: I_dc.toFixed(1), cab_dc, In_fus, tuyau,
    HSP, ville, surface_ha: surface,
    type_culture: data.type_culture, type_irrigation: data.type_irrigation
  };
}

// ================================================================
//  RECALCUL ENTREPRISE
// ================================================================
function recalculerEntreprise(data) {
  var ville = data.ville || {hsp:5.2, lat:6.14, inclinaison:6};
  var HSP   = ville.hsp || 5.2;
  var equip = data.equipements || [];

  var E_Wh = 0, P_pic_W = 0;
  equip.forEach(function(eq) {
    E_Wh    += eq.puissance * eq.quantite * eq.heures;
    P_pic_W += eq.puissance * eq.quantite * coeffDemarrage(eq.nom);
  });

  var PR     = data.typeInst === 'reseau' ? NORM.PR_DIRECT : NORM.PR_BATTERIE;
  var E_PV   = E_Wh / PR;
  var P_crete= E_PV / HSP;
  var nb_pan = Math.max(1, Math.ceil(P_crete / 550));
  var V_sys  = tensionSysteme((nb_pan*550)/1000);
  var P_ond  = Math.ceil(P_pic_W * 1.25 / 1000);
  if (P_ond < 3) P_ond = 3;

  var nb_bat = 0, C_bat_Wh = 0;
  if (data.typeInst !== 'reseau') {
    C_bat_Wh = E_Wh / (NORM.DOD * NORM.EFF_BATTERIE);
    nb_bat   = Math.max(1, Math.ceil(C_bat_Wh / (V_sys * 100)));
  }

  var I_dc   = (nb_pan * 550) / V_sys;
  var cab_dc = sectionCable(30, I_dc, V_sys);
  var In_fus = calibreProtectionDC(9.5 * nb_pan);

  return {
    E_Wh, E_PV: Math.round(E_PV), PR, P_crete: Math.round(P_crete),
    P_pic_W: Math.round(P_pic_W), nb_pan,
    kWc: ((nb_pan*550)/1000).toFixed(2), V_sys,
    P_ond_kVA: P_ond, nb_bat, C_bat_Wh: Math.round(C_bat_Wh),
    I_dc: I_dc.toFixed(1), cab_dc, In_fus,
    HSP, ville, typeInst: data.typeInst || 'autonome'
  };
}

// ================================================================
//  ANALYSES IA — MÉNAGE
// ================================================================
function analyserIA_Menage(data) {
  var ville = (window._villeSelectionnee||{}).data || {hsp:5.2,lat:6.14,inclinaison:6,azimut:180,pays:"Togo",region:"Maritime"};
  var nomV  = (window._villeSelectionnee||{}).nom || "Lomé";
  data.ville = ville;
  var r = recalculerMenage(data);

  var justification =
    "**Localisation :** " + nomV + " (" + ville.pays + ") · HSP = **" + r.HSP + "h/jour** (données NASA POWER)\n\n" +
    "**① Bilan de puissance (p.21 FES12)**\n" +
    "   Énergie journalière brute : **" + Math.round(r.E_Wh) + " Wh/jour**\n" +
    "   Puissance crête appareils : **" + r.P_pic_W + " W**\n\n" +
    "**② Puissance PV requise (p.28-29)**\n" +
    "   PR (avec batterie) = η_pan × η_câble × η_rég × η_bat × η_conv\n" +
    "   = 0.90 × 0.95 × 0.95 × 0.80 × 0.93 = **" + r.PR + " (" + (r.PR*100) + "%)**\n" +
    "   Énergie à produire : " + Math.round(r.E_Wh) + " ÷ " + r.PR + " = **" + r.E_PV_Wh + " Wh**\n" +
    "   P_crête = " + r.E_PV_Wh + " ÷ " + r.HSP + "h = **" + r.P_crete_Wc + " Wc**\n" +
    "   → **" + r.nb_pan + " panneau" + (r.nb_pan>1?'x':'') + " de 400W** (" + r.kWc + " kWc) · Tension système : **" + r.V_sys + " V**\n\n" +
    "**③ Banc de batteries (p.24)**\n" +
    "   C_bat = " + Math.round(r.E_Wh) + " Wh × " + r.auto + "j ÷ (DoD×η_bat) = **" + r.C_bat_Wh + " Wh**\n" +
    "   → **" + r.nb_bat + " batterie" + (r.nb_bat>1?'s':'') + " " + r.V_sys + "V/100Ah** · Capacité totale : **" + r.cap_totale + " kWh**\n\n" +
    "**④ Onduleur (p.26-27)**\n" +
    "   Puissance pic × 1.25 = " + r.P_pic_W + " × 1.25 = **" + r.P_ond_VA + " VA (" + r.kVA + " kVA)**\n\n" +
    "**⑤ Régulateur MPPT (p.31-34)**\n" +
    "   I_rég = 1.25 × Isc_champ = **" + r.I_regu + " A**";

  var decision =
    "• **" + r.nb_pan + " panneau" + (r.nb_pan>1?'x solaires':'u solaire') + " monocristallin 400W** — " + r.kWc + " kWc installés\n" +
    "• **" + r.nb_bat + " batterie" + (r.nb_bat>1?'s':'') + " LiFePO4 " + r.V_sys + "V/100Ah** — capacité " + r.cap_totale + " kWh, 2000+ cycles\n" +
    "• **1 onduleur hybride " + r.kVA + " kVA** — sortie 220V pure sinus\n" +
    "• **1 régulateur MPPT " + r.I_regu + "A/" + r.V_sys + "V** — rendement 97%\n" +
    "• **1 boîtier de jonction IP65** — connexions DC étanches\n" +
    "• **Durée de vie estimée :** " + NORM.DUREE_VIE + " ans";

  var cablage =
    "**Câbles (formule S = 2LI/ΔU.σ, chute max 3% · UTE C15-712)**\n" +
    "• DC panneaux → régulateur (L≈30m, I=" + r.I_dc + "A) : **" + r.cab_dc.S + " mm²** (calculé : " + r.cab_dc.S_calc + " mm²) · Double isolation 1000V DC\n" +
    "• AC onduleur → tableau : **" + r.cab_ac.S + " mm²** type H07VV-F\n" +
    "• Batterie → régulateur : **10 mm²** cuivre souple\n" +
    "• Terre : **6 mm²** vert/jaune\n\n" +
    "**Protections (p.44-62 FES12)**\n" +
    "• Fusible DC gPV : **" + r.In_fusible + "A** (1.4×Isc < In < 2×Isc · p.46)\n" +
    "• Disjoncteur AC : **20A** différentiel 30mA type AC\n" +
    "• Parafoudre DC : Ucpv = **" + r.Ucpv + "V** (Uoc_max = " + Math.round(1.2*49*r.nb_pan) + "V · p.51)\n" +
    "• Parafoudre AC type 2 : Uc > 1.45×230 = **334V** (p.58)\n" +
    "• Piquet de terre cuivré **1.5m**\n\n" +
    "**Outils & EPI**\n" +
    "• Gants isolants 1000V, lunettes anti-arc\n" +
    "• Multimètre DC/AC + pince ampèremétrique\n" +
    "• Tournevis isolés, sertisseuse, cosses, étiquettes danger";

  var orientation =
    "• **Ville :** " + nomV + " · Latitude : " + (ville.lat||6).toFixed(2) + "°\n" +
    "• **Inclinaison optimale :** **" + (ville.inclinaison||6) + "°** (= latitude locale)\n" +
    "• **Azimut :** " + ((ville.lat||6) >= 0 ? "180° Plein Sud" : "0° Plein Nord ⚠️ hémisphère Sud") + "\n" +
    "• **Espacement rangées :** ≥ 0.5m (éviter auto-ombrage)\n" +
    "• **Période dégagée :** horizon libre 8h00–16h00\n" +
    "• 💡 " + (ville.note || "Lomé — bonne irradiation côtière");

  var motivant =
    "🌟 **" + nomV + " reçoit " + r.HSP + "h de soleil utile chaque jour** — " + r.kWc + " kWc de panneaux captent cette énergie gratuitement pour votre foyer !\n\n" +
    "💡 **" + r.nb_pan + " panneau" + (r.nb_pan>1?'x':'') + " + " + r.nb_bat + " batterie" + (r.nb_bat>1?'s':'') + " = indépendance totale.** Climatiseur, réfrigérateur, éclairage — tout fonctionne 24h/24, même pendant les délestages. Vos voisins subissent les coupures, vous profitez du confort.\n\n" +
    "⚡ **PULSAR ECO GROUP** installe, certifie et garantit votre système pendant **" + NORM.DUREE_VIE + " ans**. Contactez-nous dès aujourd'hui !";

  return { justification, decision, cablage, orientation, motivant, nb_pan: r.nb_pan, ville, nomV };
}

// ================================================================
//  ANALYSE AGRICOLE
// ================================================================
function analyserIA_Agri(data) {
  var ville = (window._villeSelectionnee||{}).data || {hsp:5.2,lat:6.14,inclinaison:8,azimut:180,pays:"Togo"};
  var nomV  = (window._villeSelectionnee||{}).nom || "Lomé";
  data.ville = ville;
  var r = recalculerAgri(data);

  var justification =
    "**Localisation :** " + nomV + " · HSP = **" + r.HSP + "h/jour**\n\n" +
    "**① Besoin hydrique**\n" +
    "   Q_jour = " + r.surface_ha + "ha × " + data.culture_mm + "mm ÷ efficacité = **" + r.Q_jour + " m³/jour**\n" +
    "   Débit : " + r.Q_jour + " ÷ " + data.heures_pompage + "h = **" + r.Q_h + " m³/h**\n\n" +
    "**② HMT (Hauteur Manométrique Totale)**\n" +
    "   HMT = (" + data.profondeur_m + " + " + data.hauteur_res_m + ") × 1.10 = **" + r.HMT + " m**\n\n" +
    "**③ Puissance hydraulique**\n" +
    "   Ph = ρ.g.Q.H = 1000 × 9.81 × " + (parseFloat(r.Q_h)/3600).toFixed(4) + " × " + r.HMT + " = **" + r.Ph + " W**\n" +
    "   Puissance pompe (η=50%) = **" + r.Pp_kW + " kW**\n\n" +
    "**④ Puissance PV (p.28-29 FES12)**\n" +
    "   Ppv = " + r.Pp_kW + " kW ÷ (HSP × 0.75) = **" + r.Ppv_kWc + " kWc**\n" +
    "   → **" + r.nb_pan + " panneau" + (r.nb_pan>1?'x':'') + " de " + r.pPan + "W** (" + r.kWc + " kWc) · Tension : **" + r.V_sys + "V**";

  var decision =
    "• **Pompe immergée solaire " + r.Pp_kW + " kW** — débit " + r.Q_h + " m³/h à HMT " + r.HMT + "m\n" +
    "• **" + r.nb_pan + " panneau" + (r.nb_pan>1?'x':'') + " solaire" + (r.nb_pan>1?'s':'') + " " + r.pPan + "W** — total **" + r.kWc + " kWc**\n" +
    "• **1 contrôleur MPPT " + Math.ceil(r.I_dc*1.25) + "A/" + r.V_sys + "V** — protection pompe\n" +
    "• **Tuyauterie " + r.tuyau + "** — pression adaptée au débit " + r.Q_h + " m³/h\n" +
    "• **1 clapet anti-retour + 1 pressostat + 1 flotteur** niveau basse eau\n" +
    "• **Durée de vie estimée :** " + NORM.DUREE_VIE + " ans";

  var cablage =
    "**Câbles**\n" +
    "• DC pompe (L≈30m, I=" + r.I_dc + "A) : **" + r.cab_dc.S + " mm²** isolation 1000V DC UV+chaleur 80°C\n" +
    "• Câble terre : **6 mm²** vert/jaune\n" +
    "• Longueur max câble DC : **30m** (au-delà monter section)\n\n" +
    "**Protections (p.44-46 FES12)**\n" +
    "• Disjoncteur magnéto-thermique : **" + r.In_fus + "A**\n" +
    "• Fusible DC rapide : **" + r.In_fus + "A** côté régulateur\n" +
    "• Parafoudre DC indispensable (milieu ouvert agricole — risque foudre)\n" +
    "• Piquet de terre **2m cuivré** + boîtier IP65\n\n" +
    "**Outils & EPI**\n" +
    "• Gants 1000V, multimètre DC, clés dynamométriques\n" +
    "• Sertisseuse, cosses étanches, détecteur de tension";

  var orientation =
    "• **Ville :** " + nomV + " · Latitude : " + (ville.lat||6).toFixed(2) + "°\n" +
    "• **Inclinaison :** **" + (ville.inclinaison||8) + "°** — optimal pour " + nomV + "\n" +
    "• **Azimut :** " + ((ville.lat||6) >= 0 ? "Plein Sud" : "Plein Nord ⚠️") + "\n" +
    "• Distance forage/panneaux ≤ 30m · Nettoyage hebdomadaire";

  var motivant =
    "🌾 **" + r.surface_ha + " ha irrigué" + (r.surface_ha>1?'s':'') + " automatiquement à " + nomV + "** — " + r.Q_jour + " m³ d'eau livrés chaque jour par le soleil !\n\n" +
    "💧 **Zéro carburant, zéro panne.** La pompe démarre seule avec le soleil. Même en saison sèche, vos cultures prospèrent.\n\n" +
    "📈 **PULSAR ECO GROUP** — partenaire de votre prospérité agricole au Togo et en Afrique !";

  return { justification, decision, cablage, orientation, motivant, nb_pan: r.nb_pan, ville, nomV };
}

// ================================================================
//  ANALYSE ENTREPRISE
// ================================================================
function analyserIA_Entreprise(data) {
  var ville = (window._villeSelectionnee||{}).data || {hsp:5.2,lat:6.14,inclinaison:6,azimut:180,pays:"Togo"};
  var nomV  = (window._villeSelectionnee||{}).nom || "Lomé";
  data.ville = ville; data.typeInst = data.type_installation;
  var r = recalculerEntreprise(data);

  var justification =
    "**Localisation :** " + nomV + " · HSP = **" + r.HSP + "h/jour**\n\n" +
    "**① Bilan de puissance (p.21)**\n" +
    "   Énergie journalière : **" + (r.E_Wh/1000).toFixed(2) + " kWh/jour**\n" +
    "   Puissance pic (avec induction) : **" + r.P_pic_W + " W**\n\n" +
    "**② PV requis (PR=" + (r.PR*100) + "% · p.29)**\n" +
    "   P_crête = " + (r.E_Wh/1000).toFixed(2) + "kWh ÷ " + r.PR + " ÷ " + r.HSP + "h = **" + r.P_crete + " W**\n" +
    "   → **" + r.nb_pan + " panneau" + (r.nb_pan>1?'x':'') + " 550W** (" + r.kWc + " kWc) · Tension : **" + r.V_sys + "V**\n\n" +
    (r.nb_bat>0 ? "**③ Batteries**\n   C = " + (r.E_Wh/1000).toFixed(2) + "kWh ÷ DoD ÷ η = **" + (r.C_bat_Wh/1000).toFixed(1) + " kWh** → **" + r.nb_bat + " batterie" + (r.nb_bat>1?'s':'') + "**\n\n" : "") +
    "**④ Onduleur** : Ppic × 1.25 = **" + r.P_ond_kVA + " kVA**";

  var decision =
    "• **" + r.nb_pan + " panneau" + (r.nb_pan>1?'x':'') + " solaire" + (r.nb_pan>1?'s':'') + " 550W** — **" + r.kWc + " kWc** installés\n" +
    "• **1 onduleur " + r.typeInst + " " + r.P_ond_kVA + " kVA**\n" +
    (r.nb_bat>0 ? "• **" + r.nb_bat + " batterie" + (r.nb_bat>1?'s':'') + " " + r.V_sys + "V/100Ah**\n" : "• Connexion directe réseau EDC\n") +
    "• **1 régulateur MPPT " + Math.ceil(r.I_dc*1.25) + "A/" + r.V_sys + "V**\n" +
    "• **Tableau AC/DC + datalogger monitoring**\n" +
    "• **Durée de vie estimée :** " + NORM.DUREE_VIE + " ans";

  var cablage =
    "**Câbles**\n" +
    "• DC (L≈30m, I=" + r.I_dc + "A) : **" + r.cab_dc.S + " mm²** double isolation 1000V DC\n" +
    "• AC : **6 mm²** minimum H07VV-F\n" +
    "• Terre : **6 mm²** vert/jaune\n\n" +
    "**Protections (p.44-62 FES12)**\n" +
    "• Fusible DC : **" + r.In_fus + "A** par string (1.4×Isc < In < 2×Isc)\n" +
    "• Disjoncteur diff. AC : **30mA** type A\n" +
    "• Parafoudre DC 1000V + AC 400V\n" +
    "• Coffret IP65 · Terre < 5Ω (NF C 15-100)\n\n" +
    "**Outils & EPI**\n" +
    "• Gants 1000V, lunettes anti-arc, consignation électrique\n" +
    "• Détecteur tension, multimètre pro, EPI complets";

  var orientation =
    "• **Ville :** " + nomV + " · Latitude : " + (ville.lat||6).toFixed(2) + "°\n" +
    "• **Inclinaison :** **" + (ville.inclinaison||6) + "°** — Azimut : " + ((ville.lat||6)>=0?"Plein Sud":"Plein Nord ⚠️") + "\n" +
    "• Espacement rangées ≥ 1.5× hauteur panneau\n" +
    "• Charge structurelle toiture ≥ 15 kg/m²";

  var motivant =
    "🏢 **" + r.kWc + " kWc sur votre toiture à " + nomV + "** — " + r.HSP + "h de soleil par jour transformées en économies réelles !\n\n" +
    "💼 **Zéro délestage, zéro perte de production.** Vos concurrents s'arrêtent pendant les coupures, vous continuez.\n\n" +
    "🔋 **PULSAR ECO GROUP** — installation certifiée, garantie " + NORM.DUREE_VIE + " ans, partout en Afrique !";

  return { justification, decision, cablage, orientation, motivant, nb_pan: r.nb_pan, ville, nomV };
}

// ================================================================
//  AFFICHAGE RÉSULTATS
// ================================================================
function afficherResultatsIA(res, sceneId) {
  var blocs = [
    { titre:"📐 Justification Technique (FES12 Module 3)", contenu:res.justification, cls:"ia-calcul" },
    { titre:"✅ Solution & Équipements Recommandés",       contenu:res.decision,      cls:"ia-decision" },
    { titre:"🔌 Câblage, Protections & Outils",           contenu:res.cablage,       cls:"ia-cablage" },
    { titre:"🧭 Orientation & Positionnement",            contenu:res.orientation,   cls:"ia-orient" },
    { titre:"🌟 Message PULSAR-AI",                        contenu:res.motivant,      cls:"ia-motivant" }
  ];
  var html =
    '<div class="ia-container">' +
    '<div class="ia-header"><span class="ia-logo">⚡</span><div>' +
    '<h2>Rapport PULSAR-AI — Dimensionnement SSPV Professionnel</h2>' +
    '<span class="ia-subtitle">📍 ' + res.nomV + ' · HSP ' + res.ville.hsp + 'h/j · Normes FES12 / IEC / NF C 15-100</span>' +
    '</div></div>';
  blocs.forEach(function(b){
    html += '<div class="ia-bloc '+b.cls+'"><h3>'+b.titre+'</h3><div class="ia-contenu">'+fmt(b.contenu)+'</div></div>';
  });
  html +=
    '<div class="ia-bloc ia-3d-bloc">' +
    '<h3>🏗️ Conception 3D — ' + res.nb_pan + ' panneau' + (res.nb_pan>1?'x':'') + ' solaire' + (res.nb_pan>1?'s':'') + ' · ' + res.nomV + '</h3>' +
    '<div id="' + sceneId + '-3d" class="scene3d-wrap"></div>' +
    '</div></div>';
  return html;
}

function fmt(t) {
  return t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
          .replace(/^•\s(.+)/gm,'<li>$1</li>')
          .replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')
          .replace(/^([^<])/,'<p>$1').replace(/([^>])$/,'$1</p>');
}

// ================================================================
//  VISUALISATION 3D — Images Gemini dans cadre 3D pivotable
// ================================================================
function dessiner3DPanneaux(sceneId, nbPanneaux, inclinaisonDeg) {
  if (window._villeSelectionnee && window._villeSelectionnee.data)
    inclinaisonDeg = window._villeSelectionnee.data.inclinaison || inclinaisonDeg;
  inclinaisonDeg = inclinaisonDeg || 8;

  var wrap = document.getElementById(sceneId+'-3d');
  if (!wrap) return;

  // Choisir image selon nb panneaux
  var imgSrc = nbPanneaux <= 1 ? 'images/p1.png' :
               nbPanneaux <= 2 ? 'images/p2.png' :
               nbPanneaux <= 3 ? 'images/p3.png' :
               nbPanneaux <= 4 ? 'images/p4.png' : 'images/p5plus.png';

  var W = Math.max(wrap.offsetWidth||720, 600);
  var H = 520;

  var canvas = document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  canvas.style.cssText='width:100%;height:'+H+'px;cursor:grab;border-radius:12px;display:block;';
  wrap.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var panImg = new Image();
  panImg.onload  = function(){ draw(); startAuto(); };
  panImg.onerror = function(){ draw(); startAuto(); };
  panImg.src = imgSrc;

  var rotX=-0.20, rotY=0.38, drag=false, lx=0, ly=0;

  canvas.addEventListener('mousedown',function(e){drag=true;lx=e.clientX;ly=e.clientY;canvas.style.cursor='grabbing';e.preventDefault();});
  window.addEventListener('mouseup',  function(){drag=false;canvas.style.cursor='grab';});
  canvas.addEventListener('mousemove',function(e){
    if(!drag)return;
    rotY+=(e.clientX-lx)*0.006; rotX+=(e.clientY-ly)*0.006;
    rotX=Math.max(-0.7,Math.min(0.3,rotX));
    lx=e.clientX;ly=e.clientY;draw();
  });
  canvas.addEventListener('touchstart',function(e){drag=true;lx=e.touches[0].clientX;ly=e.touches[0].clientY;},{passive:true});
  canvas.addEventListener('touchend',  function(){drag=false;});
  canvas.addEventListener('touchmove', function(e){
    if(!drag)return;
    rotY+=(e.touches[0].clientX-lx)*0.008; rotX+=(e.touches[0].clientY-ly)*0.008;
    rotX=Math.max(-0.7,Math.min(0.3,rotX));
    lx=e.touches[0].clientX;ly=e.touches[0].clientY;draw();
  },{passive:true});

  // Projection 3D simple
  function proj(x,y,z){
    var cy=Math.cos(rotY),sy=Math.sin(rotY),cx=Math.cos(rotX),sx=Math.sin(rotX);
    var rx=x*cy+z*sy, ry=y, rz=-x*sy+z*cy;
    var fy=ry*cx-rz*sx, fz=ry*sx+rz*cx;
    var sc=420/(420+fz+150);
    return{x:W/2+rx*sc*160, y:H*0.52+fy*sc*160};
  }

  // Appliquer image Gemini sur plan incliné (texture mapping)
  function applyTexture(img, p0,p1,p2,p3){
    if(!img||!img.complete||!img.naturalWidth)return;
    var IW=img.naturalWidth,IH=img.naturalHeight;
    function tri(sx0,sy0,sx1,sy1,sx2,sy2,dx0,dy0,dx1,dy1,dx2,dy2){
      ctx.save();
      ctx.beginPath();ctx.moveTo(dx0,dy0);ctx.lineTo(dx1,dy1);ctx.lineTo(dx2,dy2);
      ctx.closePath();ctx.clip();
      var d=1/((sx1-sx0)*(sy2-sy0)-(sx2-sx0)*(sy1-sy0));
      var a=((dx1-dx0)*(sy2-sy0)-(dx2-dx0)*(sy1-sy0))*d;
      var b=((dx2-dx0)*(sx1-sx0)-(dx1-dx0)*(sx2-sx0))*d;
      var c2=((dy1-dy0)*(sy2-sy0)-(dy2-dy0)*(sy1-sy0))*d;
      var dd=((dy2-dy0)*(sx1-sx0)-(dy1-dy0)*(sx2-sx0))*d;
      var e=dx0-a*sx0-b*sy0,f=dy0-c2*sx0-dd*sy0;
      ctx.transform(a,c2,b,dd,e,f);ctx.drawImage(img,0,0);ctx.restore();
    }
    tri(0,IH,IW,IH,IW,0, p0.x,p0.y,p1.x,p1.y,p2.x,p2.y);
    tri(0,IH,IW,0,0,0,   p0.x,p0.y,p2.x,p2.y,p3.x,p3.y);
  }

  function draw(){
    ctx.clearRect(0,0,W,H);

    // Fond dégradé ciel
    var sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#0d1b3e');sky.addColorStop(0.6,'#1565c0');sky.addColorStop(1,'#1b5e20');
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

    // Soleil
    var sp=proj(2.5,3.5,3);
    var sg=ctx.createRadialGradient(sp.x,sp.y,2,sp.x,sp.y,50);
    sg.addColorStop(0,'rgba(255,245,80,1)');sg.addColorStop(.4,'rgba(255,200,30,.8)');sg.addColorStop(1,'rgba(255,130,0,0)');
    ctx.beginPath();ctx.arc(sp.x,sp.y,50,0,Math.PI*2);ctx.fillStyle=sg;ctx.fill();

    // Plan incliné avec l'image Gemini
    var inc=inclinaisonDeg*Math.PI/180;
    // Ratio image pour garder les proportions intactes
    var imgRatio = (panImg.complete&&panImg.naturalWidth) ? panImg.naturalHeight/panImg.naturalWidth : 0.75;
    var PW=3.2, PH=PW*imgRatio;
    var ci=Math.cos(inc),si=Math.sin(inc);
    var ox=-PW/2, oz=-0.3;

    var q=[
      proj(ox,      0,     oz),
      proj(ox+PW,   0,     oz),
      proj(ox+PW,   PH*ci, oz+PH*si),
      proj(ox,      PH*ci, oz+PH*si)
    ];

    // Ombre au sol
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.beginPath();ctx.ellipse(W/2, H*0.72, 120, 18, 0, 0, Math.PI*2);ctx.fill();

    // Texture image Gemini sur le plan
    applyTexture(panImg, q[0],q[1],q[2],q[3]);

    // Contour cadre
    ctx.beginPath();ctx.moveTo(q[0].x,q[0].y);
    q.forEach(function(p){ctx.lineTo(p.x,p.y);});ctx.closePath();
    ctx.strokeStyle='rgba(220,225,230,0.9)';ctx.lineWidth=2.5;ctx.stroke();

    // Supports
    var pts=[[ox+PW*0.25,oz+0.05],[ox+PW*0.75,oz+0.05]];
    pts.forEach(function(pt){
      var top=proj(pt[0],0,pt[1]),gnd=proj(pt[0],-1.2,pt[1]+0.06);
      ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(gnd.x,gnd.y);
      ctx.strokeStyle='rgba(160,165,170,0.85)';ctx.lineWidth=5;ctx.stroke();
      var gl=proj(pt[0]-0.2,-1.2,pt[1]),gr=proj(pt[0]+0.2,-1.2,pt[1]);
      ctx.beginPath();ctx.moveTo(gl.x,gl.y);ctx.lineTo(gr.x,gr.y);
      ctx.strokeStyle='rgba(130,135,140,0.8)';ctx.lineWidth=6;ctx.stroke();
    });

    // Légende inclinaison
    var nomV=(window._villeSelectionnee||{}).nom||'Lomé';
    var hsp=(window._villeSelectionnee&&window._villeSelectionnee.data)?window._villeSelectionnee.data.hsp:5.2;
    var legX=W-210, legY=14;
    ctx.fillStyle='rgba(10,25,60,0.82)';ctx.strokeStyle='rgba(79,195,247,0.8)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(legX,legY,196,90,7);ctx.fill();ctx.stroke();
    ctx.fillStyle='#e3f2fd';ctx.font='bold 12px Arial';
    ctx.fillText('📐 Inclinaison : '+inclinaisonDeg+'°',legX+10,legY+20);
    ctx.font='11px Arial';ctx.fillStyle='#ffee58';
    ctx.fillText('🧭 '+(((window._villeSelectionnee||{}).data||{}).lat>=0?'Azimut Sud (180°)':'Azimut Nord (0°)'),legX+10,legY+38);
    ctx.fillStyle='#80deea';
    ctx.fillText('☀️ HSP : '+hsp+'h/jour · '+nomV,legX+10,legY+55);
    ctx.fillStyle='#a5d6a7';
    ctx.fillText('🟦 '+nbPanneaux+' panneau'+(nbPanneaux>1?'x':'')+' solaire'+(nbPanneaux>1?'s':''),legX+10,legY+72);
    ctx.fillStyle='rgba(200,200,200,0.5)';ctx.font='9.5px Arial';
    ctx.fillText('Glisser = tourner · Touch OK',legX+10,legY+87);

    // Message bas
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.strokeStyle='rgba(255,238,88,0.5)';
    ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(8,H-42,W-16,34,6);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ffee58';ctx.font='bold 12px Arial';ctx.textAlign='center';
    ctx.fillText('☀️ Pour profiter d\'un maximum d\'ensoleillement à '+nomV+', veuillez respecter ce positionnement.',W/2,H-21);
    ctx.textAlign='left';
  }

  function startAuto(){
    var a=80;
    function f(){if(a>0&&!drag){rotY+=0.005;draw();a--;requestAnimationFrame(f);}}f();
  }
  if(panImg.complete){draw();startAuto();}
}

// ================================================================
//  STYLES CSS
// ================================================================
(function(){
  var s=document.createElement('style');
  s.textContent=`
    .ia-container{margin-top:22px;font-family:'Segoe UI',Arial,sans-serif;}
    .ia-header{background:linear-gradient(135deg,#0a192f,#1a3a5c 60%,#1b5e20);color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;display:flex;align-items:center;gap:14px;}
    .ia-header h2{margin:0 0 3px;font-size:.98rem;font-weight:700;}
    .ia-subtitle{font-size:.72rem;color:rgba(255,255,255,.6);}
    .ia-logo{font-size:2.2rem;}
    .ia-bloc{background:#f8faff;border-left:4px solid #1565c0;padding:18px 22px;margin-bottom:9px;border-radius:0 8px 8px 0;box-shadow:0 2px 8px rgba(0,0,0,.07);}
    .ia-bloc h3{margin:0 0 12px;font-size:.94rem;font-weight:700;padding-bottom:7px;border-bottom:1px solid #d0dcf5;color:#0d2244;}
    .ia-contenu{color:#1a2a1a;line-height:1.85;font-size:.9rem;}
    .ia-contenu p{margin:3px 0;} .ia-contenu li{margin-bottom:4px;} .ia-contenu ul{list-style:none;padding-left:2px;}
    .ia-calcul{background:#eef3ff;border-left-color:#1976d2;} .ia-calcul h3{color:#1565c0;}
    .ia-decision{background:#e8f5e9;border-left-color:#2e7d32;} .ia-decision h3{color:#1b5e20;}
    .ia-cablage{background:#fff8e1;border-left-color:#f57f17;} .ia-cablage h3{color:#e65100;}
    .ia-orient{background:#f3e5f5;border-left-color:#7b1fa2;} .ia-orient h3{color:#6a1b9a;}
    .ia-motivant{background:linear-gradient(135deg,#e8f5e9,#fffde7);border-left-color:#f9a825;padding:22px;} .ia-motivant h3{color:#e65100;}
    .ia-motivant .ia-contenu{font-size:.95rem;line-height:2.0;}
    .ia-3d-bloc{background:#0d1b3e;border-left:4px solid #4fc3f7;padding:18px;} .ia-3d-bloc h3{color:#4fc3f7;border-bottom:1px solid rgba(79,195,247,.2);padding-bottom:7px;margin-bottom:10px;}
    .scene3d-wrap{width:100%;border-radius:10px;overflow:hidden;min-height:520px;}
    .ia-loading{background:#e3f2fd;border:2px dashed #1976d2;padding:22px;border-radius:10px;text-align:center;color:#1565c0;font-size:1rem;animation:pls 1.4s ease-in-out infinite;}
    @keyframes pls{0%,100%{opacity:1}50%{opacity:.4}}
    .valider-btn{background:linear-gradient(135deg,#1565c0,#0d47a1);color:#fff;width:100%;padding:15px;font-size:1rem;border-radius:10px;border:none;cursor:pointer;margin-top:10px;font-weight:700;transition:all .2s;box-shadow:0 3px 10px rgba(21,101,192,.4);}
    .valider-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 14px rgba(21,101,192,.5);}
    .valider-btn:disabled{background:#aaa;cursor:not-allowed;box-shadow:none;}
  `;
  document.head.appendChild(s);
})();
