// ================================================================
//  PULSAR ECO GROUP — MOTEUR IA v5.0
//  Intégration ville + ensoleillement réel + 3D adaptée
// ================================================================

var CONST = {
  RENDEMENT_MPPT:      0.97,
  RENDEMENT_ONDULEUR:  0.95,
  RENDEMENT_BATTERIE:  0.85,
  PROFONDEUR_DECHARGE: 0.80,
  COEFF_SECURITE:      1.25,
  PERTE_TEMP:          0.88,
  DUREE_VIE:           "5 à 8"
};

// ================================================================
//  RECALCUL PROFESSIONNEL (ville intégrée)
// ================================================================
function recalculer(data, type) {
  var ville = data.ville || { hsp:5.2, inclinaison:6, azimut:180, pays:"Togo", nom:"Lomé" };
  var r = { ville: ville };

  if (type === 'menage' || type === 'entreprise') {
    var E    = type==='menage' ? parseFloat(data.consommation_journaliere_Wh)
                               : parseFloat(data.consommation_journaliere_kWh)*1000;
    var hsp  = ville.hsp;
    var auto = parseFloat(data.autonomie_jours)||1;
    var pPan = type==='menage' ? 400 : 550;

    // Facteur température selon latitude (plus chaud = plus proche équateur)
    var facteurTemp = Math.abs(ville.lat||6) < 5 ? 0.85 : Math.abs(ville.lat||6) < 10 ? 0.88 : 0.90;

    var E_corr  = E / (CONST.RENDEMENT_MPPT * CONST.RENDEMENT_ONDULEUR * facteurTemp);
    var Ppv     = E_corr / hsp;
    var nb_pan  = Math.max(1, Math.ceil((Ppv * CONST.COEFF_SECURITE) / pPan));
    var Cbat    = (E * auto) / (CONST.PROFONDEUR_DECHARGE * CONST.RENDEMENT_BATTERIE);
    var nb_bat  = Math.max(1, Math.ceil(Cbat / 4800));
    var I_dc    = Math.round((nb_pan * pPan) / 48);
    var P_kVA   = Math.max(type==='entreprise'?3:1, Math.ceil(Ppv * CONST.COEFF_SECURITE / 1000));
    var nb_bat_e= (type==='entreprise' && data.type_installation==='reseau') ? 0 : nb_bat;

    Object.assign(r, { E, E_corr:Math.round(E_corr), Ppv:Math.round(Ppv),
      nb_pan, pPan, kWc:((nb_pan*pPan)/1000).toFixed(2),
      Cbat:Math.round(Cbat), nb_bat: type==='menage'?nb_bat:nb_bat_e,
      I_dc, P_kVA, hsp, auto, type, facteurTemp,
      typeInst: data.type_installation||'autonome' });

  } else if (type === 'agri') {
    var surface = parseFloat(data.surface_ha);
    var besoin  = parseFloat(data.culture_mm||5);
    var ef      = parseFloat(data.ef_irrigation||0.9);
    var dp      = parseFloat(data.profondeur_dynamique_m);
    var th      = parseFloat(data.hauteur_reservoir_m);
    var hr      = parseFloat(data.heures_pompage_par_jour);
    var psh     = ville.hsp;
    var pPan2   = parseFloat(data.puissance_panneau_W)||400;
    var wN      = surface*besoin*10/ef;
    var flow    = wN/hr;
    var HMT     = (dp+th)*1.1;
    var Ph      = 1000*9.81*(flow/3600)*HMT;
    var Pp      = Ph/0.50;
    var Ppv2    = Pp/(psh*0.75);
    var nb2     = Math.max(1, Math.ceil(Ppv2/pPan2));
    Object.assign(r, { waterNeed:wN.toFixed(1), flow:flow.toFixed(2),
      HMT:HMT.toFixed(1), Ph:Math.round(Ph), Pp_kW:(Pp/1000).toFixed(2),
      Ppv_kWc:(Ppv2/1000).toFixed(2), nb_pan:nb2, pPan:pPan2, hsp:psh,
      surface_ha:data.surface_ha, type_culture:data.type_culture,
      type_irrigation:data.type_irrigation, hr, type:'agri' });
  }
  return r;
}

function getCable(I) {
  if(I<=13) return{sec:"2.5 mm²",amp:"16A"};
  if(I<=18) return{sec:"4 mm²",amp:"25A"};
  if(I<=27) return{sec:"6 mm²",amp:"32A"};
  if(I<=36) return{sec:"10 mm²",amp:"40A"};
  if(I<=52) return{sec:"16 mm²",amp:"63A"};
  return          {sec:"25 mm²",amp:"80A"};
}

function hemiInfo(ville) {
  var az = (ville.azimut!==undefined) ? ville.azimut : (ville.lat>=0?180:0);
  return az===180 ? "Plein Sud" : "Plein Nord (hémisphère Sud)";
}

// ================================================================
//  ANALYSE MÉNAGE
// ================================================================
function analyserIA_Menage(data) {
  var ville = (window._villeSelectionnee||{}).data || { hsp:5.2,lat:6.14,inclinaison:6,azimut:180,pays:"Togo",region:"Maritime",note:"Lomé" };
  var nomVille = (window._villeSelectionnee||{}).nom || "Lomé";
  data.ville = ville; data.ville.nom = nomVille;
  var r   = recalculer(data, 'menage');
  var cab = getCable(r.I_dc);
  var mppt= r.I_dc<=30?"MPPT 30A/48V":r.I_dc<=60?"MPPT 60A/48V":"MPPT 80A/48V";
  var ori = hemiInfo(ville);

  var justification =
    "**Localisation :** " + nomVille + " (" + ville.pays + ") — " + ville.region + "\n" +
    "**Ensoleillement réel :** HSP = **" + ville.hsp + "h/jour** (données NASA POWER)\n" +
    "**Facteur perte thermique :** " + (r.facteurTemp*100).toFixed(0) + "% (température locale ~" + (Math.abs(ville.lat||6)<10?"35":"30") + "°C)\n\n" +
    "**Étape 1 — Énergie brute :** " + Math.round(r.E) + " Wh/jour\n" +
    "**Étape 2 — Énergie corrigée :** " + Math.round(r.E) + " ÷ (MPPT×onduleur×pertes thermiques) = **" + r.E_corr + " Wh/jour**\n" +
    "**Étape 3 — Puissance PV :** " + r.E_corr + " ÷ " + ville.hsp + "h HSP = **" + r.Ppv + " W**\n" +
    "**Étape 4 — Panneaux :** " + r.Ppv + " × 1.25 ÷ 400W = **" + r.nb_pan + " panneau" + (r.nb_pan>1?"x":"") + "** (" + r.kWc + " kWc)\n" +
    "**Étape 5 — Batteries :** " + Math.round(r.E) + " × " + r.auto + "j ÷ DoD ÷ rend. = **" + r.Cbat + " Wh** → **" + r.nb_bat + " batterie" + (r.nb_bat>1?"s":"") + "**";

  var decision =
    "• **" + r.nb_pan + " panneau" + (r.nb_pan>1?"x":"") + " solaire" + (r.nb_pan>1?"s":"") + " monocristallin 400W** — puissance totale **" + r.kWc + " kWc**\n" +
    "• **" + r.nb_bat + " batterie" + (r.nb_bat>1?"s":"") + " LiFePO4 48V/100Ah** — capacité **" + (r.nb_bat*4.8).toFixed(1) + " kWh**, 2000+ cycles\n" +
    "• **1 onduleur hybride " + r.P_kVA + " kVA** — sortie 220V pure sinus\n" +
    "• **1 régulateur " + mppt + "** — rendement 97%\n" +
    "• **1 boîtier de jonction IP65** — protection étanche\n" +
    "• **Durée de vie estimée :** " + CONST.DUREE_VIE + " ans";

  var cablage =
    "**Câbles nécessaires :**\n" +
    "• Câble DC panneaux → régulateur : **" + cab.sec + "** rouge+noir, isolation 1000V DC, certifié UV\n" +
    "• Câble AC onduleur → tableau : **2.5 mm²** type H07VV-F\n" +
    "• Câble batterie → régulateur : **10 mm²** cuivre souple\n" +
    "• Câble mise à la terre : **6 mm²** vert/jaune\n\n" +
    "**Protections électriques :**\n" +
    "• Disjoncteur DC : **" + cab.amp + "** par string\n" +
    "• Disjoncteur AC : **20A** différentiel 30mA type AC\n" +
    "• Fusible batterie : **125A**\n" +
    "• Parafoudre DC **600V** + Parafoudre AC **220V**\n" +
    "• Piquet de terre cuivré **1.5m**\n\n" +
    "**Outils & sécurité :**\n" +
    "• Gants isolants **1000V**, lunettes anti-arc\n" +
    "• Multimètre DC/AC + pince ampèremétrique\n" +
    "• Tournevis isolés, sertisseuse, cosses de câble\n" +
    "• Étiquettes signalisation danger électrique";

  var orientation =
    "• **Ville :** " + nomVille + " — Latitude " + (ville.lat||6).toFixed(2) + "°\n" +
    "• **Inclinaison optimale :** **" + ville.inclinaison + "°** (= latitude locale arrondie)\n" +
    "• **Orientation :** " + ori + " — ne jamais dévier de plus de ±15°\n" +
    "• **Ensoleillement local :** " + ville.hsp + "h/jour en moyenne annuelle\n" +
    (ville.lat < 0 ? "• ⚠️ **Hémisphère Sud détecté** — panneaux orientés vers le Nord !\n" : "") +
    "• **Espacement rangées :** ≥ 0.5m minimum\n" +
    "• **Zone dégagée :** horizon libre entre 8h00 et 16h00\n" +
    "• 💡 " + (ville.note||"");

  var motivant =
    "🌟 **" + nomVille + " bénéficie de " + ville.hsp + " heures de soleil utile chaque jour** — c'est de l'énergie gratuite, propre et inépuisable que PULSAR ECO GROUP met au service de votre foyer !\n\n" +
    "💡 Avec **" + r.nb_pan + " panneau" + (r.nb_pan>1?"x":"") + " de " + r.kWc + " kWc** et **" + r.nb_bat + " batterie" + (r.nb_bat>1?"s":"") + "**, votre maison à " + nomVille + " sera alimentée **24h/24**, même la nuit, même pendant les délestages. Climatiseur, réfrigérateur, éclairage — tout fonctionne normalement pendant que vos voisins subissent les coupures.\n\n" +
    "⚡ **PULSAR ECO GROUP** installe partout — " + nomVille + ", Lomé, Accra, Dakar... Votre installation est certifiée, garantie et suivie techniquement pendant **" + CONST.DUREE_VIE + " ans**. Prenez rendez-vous aujourd'hui — chaque jour sans solaire, c'est de l'argent perdu !";

  return { justification, decision, cablage, orientation, motivant,
           nb_pan:r.nb_pan, ville:ville, nomVille:nomVille };
}

// ================================================================
//  ANALYSE AGRICOLE
// ================================================================
function analyserIA_Agri(data) {
  var ville = (window._villeSelectionnee||{}).data || { hsp:5.2,lat:6.14,inclinaison:8,azimut:180,pays:"Togo",region:"Maritime",note:"Lomé" };
  var nomVille = (window._villeSelectionnee||{}).nom || "Lomé";
  data.ville = ville; data.ville.nom = nomVille;
  var r   = recalculer(data, 'agri');
  var I   = Math.round((r.nb_pan*r.pPan)/48);
  var cab = getCable(I);
  var mppt= parseFloat(r.Ppv_kWc)<=1.5?"MPPT 30A":parseFloat(r.Ppv_kWc)<=3?"MPPT 60A":"MPPT 80A";
  var tuyau = parseFloat(r.flow)<=5?"PEHD Ø50mm PN10":parseFloat(r.flow)<=15?"PEHD Ø75mm PN10":"PEHD Ø110mm PN10";
  var ori = hemiInfo(ville);

  var justification =
    "**Localisation :** " + nomVille + " (" + ville.pays + ") — " + ville.region + "\n" +
    "**Ensoleillement réel :** HSP = **" + ville.hsp + "h/jour** (données NASA POWER)\n\n" +
    "**Étape 1 — Besoin eau :** " + r.surface_ha + " ha × besoin culture ÷ efficacité = **" + r.waterNeed + " m³/jour**\n" +
    "**Étape 2 — Débit :** " + r.waterNeed + " ÷ " + r.hr + "h = **" + r.flow + " m³/h**\n" +
    "**Étape 3 — HMT :** (profondeur + réservoir) × 1.10 = **" + r.HMT + " m**\n" +
    "**Étape 4 — Puissance hydraulique :** ρ×g×Q×H = **" + r.Ph + " W**\n" +
    "**Étape 5 — Pompe :** " + r.Ph + " ÷ η(0.50) = **" + r.Pp_kW + " kW**\n" +
    "**Étape 6 — PV :** " + r.Pp_kW + " kW ÷ (" + ville.hsp + "h × 0.75) = **" + r.Ppv_kWc + " kWc** → **" + r.nb_pan + " panneau" + (r.nb_pan>1?"x":"") + "**";

  var decision =
    "• **Pompe immergée solaire " + r.Pp_kW + " kW** — débit " + r.flow + " m³/h à HMT " + r.HMT + " m\n" +
    "• **" + r.nb_pan + " panneau" + (r.nb_pan>1?"x":"") + " solaire" + (r.nb_pan>1?"s":"") + " " + r.pPan + "W** — total **" + r.Ppv_kWc + " kWc**\n" +
    "• **1 contrôleur " + mppt + "** — protection pompe\n" +
    "• **Tuyauterie " + tuyau + "** — pression adaptée\n" +
    "• **1 clapet anti-retour + pressostat + flotteur** basse eau\n" +
    "• **Durée de vie estimée :** " + CONST.DUREE_VIE + " ans";

  var cablage =
    "**Câbles nécessaires :**\n" +
    "• Câble DC pompe : **" + cab.sec + "** isolation 1000V DC, résistant UV 80°C\n" +
    "• Longueur max recommandée : **30m**\n" +
    "• Câble terre : **6 mm²** vert/jaune\n\n" +
    "**Protections :**\n" +
    "• Disjoncteur magnéto-thermique : **" + cab.amp + "**\n" +
    "• Fusible rapide DC : **32A**\n" +
    "• Parafoudre DC — indispensable en milieu ouvert\n" +
    "• Piquet de terre **2m cuivré**\n" +
    "• Boîtier IP65 sous abri\n\n" +
    "**Outils & sécurité :**\n" +
    "• Gants 1000V, multimètre DC, clés dynamométriques\n" +
    "• Sertisseuse, cosses étanches, détecteur de tension";

  var orientation =
    "• **Ville :** " + nomVille + " — Latitude " + (ville.lat||6).toFixed(2) + "°\n" +
    "• **Inclinaison :** **" + ville.inclinaison + "°** — optimal pour " + nomVille + "\n" +
    "• **Orientation :** " + ori + "\n" +
    "• **HSP local :** " + ville.hsp + "h/jour — " + ville.note + "\n" +
    (ville.lat < 0 ? "• ⚠️ **Hémisphère Sud** — orienter vers le Nord !\n" : "") +
    "• Distance forage/panneaux ≤ 30m\n" +
    "• Nettoyage hebdomadaire obligatoire";

  var motivant =
    "🌾 **" + r.surface_ha + " ha irrigué" + (parseFloat(r.surface_ha)>1?"s":"") + " automatiquement à " + nomVille + "**, grâce à **" + ville.hsp + "h de soleil par jour** — même en pleine saison sèche !\n\n" +
    "💧 Votre pompe de **" + r.Pp_kW + " kW** démarre seule dès le lever du soleil à " + nomVille + ". Zéro carburant, zéro facture. **" + r.waterNeed + " m³ d'eau par jour** pour vos cultures, sans effort.\n\n" +
    "📈 **Une irrigation maîtrisée = rendement doublé.** PULSAR ECO GROUP installe partout en Afrique — de Lomé à Dakar, de Cotonou à Abidjan. Votre prospérité agricole mérite le meilleur !";

  return { justification, decision, cablage, orientation, motivant,
           nb_pan:r.nb_pan, ville:ville, nomVille:nomVille };
}

// ================================================================
//  ANALYSE ENTREPRISE
// ================================================================
function analyserIA_Entreprise(data) {
  var ville = (window._villeSelectionnee||{}).data || { hsp:5.2,lat:6.14,inclinaison:6,azimut:180,pays:"Togo",region:"Maritime",note:"Lomé" };
  var nomVille = (window._villeSelectionnee||{}).nom || "Lomé";
  data.ville = ville; data.ville.nom = nomVille;
  var r   = recalculer(data, 'entreprise');
  var cab = getCable(r.I_dc);
  var mppt= r.Ppv<=5000?"MPPT 60A/48V":r.Ppv<=10000?"MPPT 80A/48V":"MPPT 100A/96V";
  var ori = hemiInfo(ville);

  var justification =
    "**Localisation :** " + nomVille + " (" + ville.pays + ") — " + ville.region + "\n" +
    "**Ensoleillement réel :** HSP = **" + ville.hsp + "h/jour** (données NASA POWER)\n\n" +
    "**Étape 1 — Énergie brute :** " + (r.E/1000).toFixed(2) + " kWh/jour\n" +
    "**Étape 2 — Énergie corrigée :** **" + (r.E_corr/1000).toFixed(2) + " kWh/jour**\n" +
    "**Étape 3 — Puissance PV :** " + (r.E_corr/1000).toFixed(2) + " ÷ " + ville.hsp + "h = **" + (r.Ppv/1000).toFixed(2) + " kWc**\n" +
    "**Étape 4 — Panneaux :** puissance × 1.25 ÷ 550W = **" + r.nb_pan + " panneau" + (r.nb_pan>1?"x":"") + " (" + r.kWc + " kWc)**\n" +
    (r.nb_bat>0 ? "**Étape 5 — Batteries :** énergie ÷ DoD ÷ rend. = **" + r.nb_bat + " batterie" + (r.nb_bat>1?"s":"") + "**" : "**Étape 5 :** Installation raccordée réseau — batteries non requises");

  var decision =
    "• **" + r.nb_pan + " panneau" + (r.nb_pan>1?"x":"") + " solaire" + (r.nb_pan>1?"s":"") + " monocristallin 550W** — **" + r.kWc + " kWc** installés\n" +
    "• **1 onduleur " + (r.typeInst==='reseau'?'grid-tie':'hybride') + " " + r.P_kVA + " kVA**\n" +
    (r.nb_bat>0 ? "• **" + r.nb_bat + " batterie" + (r.nb_bat>1?"s":"") + " LiFePO4 48V/100Ah**\n" : "• **Connexion réseau EDC directe**\n") +
    "• **1 régulateur " + mppt + "** — rendement 97%\n" +
    "• **Tableau AC/DC + datalogger monitoring**\n" +
    "• **Durée de vie estimée :** " + CONST.DUREE_VIE + " ans";

  var cablage =
    "**Câbles nécessaires :**\n" +
    "• Câble DC string : **" + cab.sec + "** double isolation 1000V DC\n" +
    "• Câble AC : **6 mm²** minimum H07VV-F\n" +
    "• Câble terre : **6 mm²** vert/jaune\n\n" +
    "**Protections :**\n" +
    "• Disjoncteur DC par string : **" + cab.amp + "**\n" +
    "• Disjoncteur différentiel AC : **30mA** type A\n" +
    "• Parafoudre DC **1000V** + AC **400V**\n" +
    "• Coffret IP65 — protections DC regroupées\n" +
    "• Mise à la terre < **5 Ω** (norme NFC 15-100)\n\n" +
    "**Outils & sécurité :**\n" +
    "• Gants 1000V + lunettes anti-arc\n" +
    "• Consignation électrique obligatoire\n" +
    "• Détecteur de tension, multimètre pro\n" +
    "• Datalogger solaire, EPI complets";

  var orientation =
    "• **Ville :** " + nomVille + " — Latitude " + (ville.lat||6).toFixed(2) + "°\n" +
    "• **Inclinaison :** **" + ville.inclinaison + "°** — optimal pour " + nomVille + "\n" +
    "• **Orientation :** " + ori + "\n" +
    "• **HSP local :** " + ville.hsp + "h/jour\n" +
    (ville.lat < 0 ? "• ⚠️ **Hémisphère Sud** — orienter vers le Nord !\n" : "") +
    "• Espacement rangées ≥ 1.5× hauteur panneau\n" +
    "• Vérifier charge structurelle toiture ≥ 15 kg/m²";

  var motivant =
    "🏢 **" + r.kWc + " kWc sur les toits de votre entreprise à " + nomVille + "** — " + ville.hsp + "h de soleil par jour transformées en énergie productive et en économies réelles !\n\n" +
    "💼 **Zéro délestage, zéro perte de production.** Pendant les coupures à " + nomVille + ", votre entreprise continue de fonctionner, de facturer, d'avancer. Vous gagnez du temps, de l'argent et une image professionnelle enviable.\n\n" +
    "🔋 **PULSAR ECO GROUP opère partout** — Togo, Bénin, Ghana, Côte d'Ivoire, Sénégal et au-delà. Votre installation est certifiée et garantie **" + CONST.DUREE_VIE + " ans**. Contactez-nous dès aujourd'hui !";

  return { justification, decision, cablage, orientation, motivant,
           nb_pan:r.nb_pan, ville:ville, nomVille:nomVille };
}

// ================================================================
//  AFFICHAGE — 5 blocs + 3D
// ================================================================
function afficherResultatsIA(res, sceneId) {
  var html =
    '<div class="ia-container">' +
    '<div class="ia-header"><span class="ia-logo">⚡</span>' +
    '<div><h2>Rapport PULSAR-AI — Dimensionnement Solaire Professionnel</h2>' +
    '<span class="ia-subtitle">📍 ' + res.nomVille + ' · HSP ' + res.ville.hsp + 'h/jour · Lat. ' + (res.ville.lat||6).toFixed(1) + '° · Données NASA POWER</span></div></div>';

  html += bloc("📐 Justification du Dimensionnement", res.justification, "ia-calcul");
  html += bloc("✅ Décision & Solution Recommandée",   res.decision,      "ia-decision");
  html += bloc("🔌 Câblage, Protections & Outils",    res.cablage,       "ia-cablage");
  html += bloc("🧭 Orientation & Positionnement",      res.orientation,   "ia-orient");
  html += bloc("🌟 Message PULSAR-AI",                 res.motivant,      "ia-motivant");

  html +=
    '<div class="ia-bloc ia-3d-bloc">' +
    '<h3>🏗️ Conception 3D — ' + res.nb_pan + ' Panneau' + (res.nb_pan>1?'x':'') + ' Solaire' + (res.nb_pan>1?'s':'') + ' à ' + res.nomVille + '</h3>' +
    '<p class="ia-3d-hint">↔️ Glisser pour tourner &nbsp;|&nbsp; 🖱️ Molette pour zoomer &nbsp;|&nbsp; 📱 Touch supporté</p>' +
    '<div id="' + sceneId + '-3d" class="scene3d-wrap"></div>' +
    '</div></div>';

  return html;
}

function bloc(titre, contenu, cls) {
  return '<div class="ia-bloc '+cls+'"><h3>'+titre+'</h3><div class="ia-contenu">'+fmt(contenu)+'</div></div>';
}
function fmt(t) {
  return t
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/^•\s(.+)/gm,'<li>$1</li>')
    .replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')
    .replace(/^([^<])/,'<p>$1').replace(/([^>])$/,'$1</p>');
}

// ================================================================
//  VISUALISATION 3D — panneaux grand format, texturés, légendes
// ================================================================
function dessiner3DPanneaux(sceneId, nbPanneaux, inclinaisonDeg) {
  // Utiliser l'inclinaison de la ville si disponible
  if (window._villeSelectionnee && window._villeSelectionnee.data) {
    inclinaisonDeg = window._villeSelectionnee.data.inclinaison || inclinaisonDeg;
  }
  inclinaisonDeg = inclinaisonDeg || 8;

  var wrap = document.getElementById(sceneId+'-3d');
  if (!wrap) return;
  var W = Math.max(wrap.offsetWidth||750, 650);
  var H = 600;

  var canvas = document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  canvas.style.cssText='width:100%;height:'+H+'px;cursor:grab;border-radius:10px;display:block;background:#0d1b3e;';
  wrap.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var imgS=new Image(), imgF=new Image(), loaded=0;
  function onLoad(){loaded++;if(loaded>=2){draw();startAuto();}}
  imgS.onload=imgF.onload=onLoad;
  imgS.onerror=imgF.onerror=onLoad;
  imgS.src='images/panneau_single.jpg';
  imgF.src='images/panneau1.jpg';

  var rotX=-0.28, rotY=0.50, zoom=1.0, drag=false, lx=0, ly=0;

  canvas.addEventListener('mousedown',function(e){drag=true;lx=e.clientX;ly=e.clientY;canvas.style.cursor='grabbing';e.preventDefault();});
  window.addEventListener('mouseup',function(){drag=false;canvas.style.cursor='grab';});
  canvas.addEventListener('mousemove',function(e){
    if(!drag)return;
    rotY+=(e.clientX-lx)*0.007;rotX+=(e.clientY-ly)*0.007;
    rotX=Math.max(-1.3,Math.min(0.15,rotX));
    lx=e.clientX;ly=e.clientY;draw();
  });
  canvas.addEventListener('wheel',function(e){
    zoom=Math.max(0.35,Math.min(3.5,zoom-e.deltaY*0.001));draw();
  },{passive:true});
  canvas.addEventListener('touchstart',function(e){drag=true;lx=e.touches[0].clientX;ly=e.touches[0].clientY;},{passive:true});
  canvas.addEventListener('touchend',function(){drag=false;});
  canvas.addEventListener('touchmove',function(e){
    if(!drag)return;
    rotY+=(e.touches[0].clientX-lx)*0.009;rotX+=(e.touches[0].clientY-ly)*0.009;
    rotX=Math.max(-1.3,Math.min(0.15,rotX));
    lx=e.touches[0].clientX;ly=e.touches[0].clientY;draw();
  },{passive:true});

  function proj(x,y,z){
    var cy=Math.cos(rotY),sy=Math.sin(rotY),cx=Math.cos(rotX),sx=Math.sin(rotX);
    var rx=x*cy+z*sy, ry=y, rz=-x*sy+z*cy;
    var fy=ry*cx-rz*sx, fz=ry*sx+rz*cx;
    var fov=560, sc=fov/(fov+fz+300);
    return{x:W/2+rx*sc*zoom*130, y:H/2+fy*sc*zoom*130, z:fz, s:sc};
  }

  function drawGrid(){
    var N=7;
    for(var i=-N;i<=N;i++){
      ctx.strokeStyle=i===0?'rgba(255,255,255,0.18)':'rgba(100,200,100,0.13)';
      ctx.lineWidth=i===0?1.2:0.7;
      var a=proj(i,0,-N),b=proj(i,0,N);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      var c=proj(-N,0,i),d=proj(N,0,i);
      ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.stroke();
    }
    function axe(dx,dy,dz,col,lbl){
      var O=proj(0,0,0),E=proj(dx,dy,dz);
      ctx.beginPath();ctx.moveTo(O.x,O.y);ctx.lineTo(E.x,E.y);
      ctx.strokeStyle=col;ctx.lineWidth=2.8;ctx.stroke();
      ctx.fillStyle=col;ctx.font='bold 14px Arial';ctx.fillText(lbl,E.x+5,E.y+4);
    }
    axe(4,0,0,'rgba(230,60,60,.9)','X');
    axe(0,4,0,'rgba(60,200,60,.9)','Y');
    axe(0,0,4,'rgba(60,130,230,.9)','Z');
  }

  function mapTri(img,sx0,sy0,sx1,sy1,sx2,sy2,dx0,dy0,dx1,dy1,dx2,dy2){
    ctx.save();
    ctx.beginPath();ctx.moveTo(dx0,dy0);ctx.lineTo(dx1,dy1);ctx.lineTo(dx2,dy2);
    ctx.closePath();ctx.clip();
    var d=1/((sx1-sx0)*(sy2-sy0)-(sx2-sx0)*(sy1-sy0));
    var a=((dx1-dx0)*(sy2-sy0)-(dx2-dx0)*(sy1-sy0))*d;
    var b=((dx2-dx0)*(sx1-sx0)-(dx1-dx0)*(sx2-sx0))*d;
    var c=((dy1-dy0)*(sy2-sy0)-(dy2-dy0)*(sy1-sy0))*d;
    var dd=((dy2-dy0)*(sx1-sx0)-(dy1-dy0)*(sx2-sx0))*d;
    var e=dx0-a*sx0-b*sy0,f=dy0-c*sx0-dd*sy0;
    ctx.transform(a,c,b,dd,e,f);ctx.drawImage(img,0,0);ctx.restore();
  }

  function drawPanel(cx,cz,inclRad,img){
    // Grand format: 2.0 × 1.3
    var PW=2.0,PH=1.3,PT=0.06;
    var ci=Math.cos(inclRad),si=Math.sin(inclRad);
    var ox=cx-PW/2;
    var q=[proj(ox,0,cz),proj(ox+PW,0,cz),
           proj(ox+PW,PH*ci,cz+PH*si),proj(ox,PH*ci,cz+PH*si)];

    if(img&&img.complete&&img.naturalWidth){
      var IW=img.naturalWidth,IH=img.naturalHeight;
      mapTri(img,0,IH,IW,IH,IW,0, q[0].x,q[0].y,q[1].x,q[1].y,q[2].x,q[2].y);
      mapTri(img,0,IH,IW,0,0,0,   q[0].x,q[0].y,q[2].x,q[2].y,q[3].x,q[3].y);
    }
    // Cadre aluminium épais
    ctx.beginPath();ctx.moveTo(q[0].x,q[0].y);
    q.forEach(function(p){ctx.lineTo(p.x,p.y);});ctx.closePath();
    ctx.strokeStyle='rgba(210,215,220,1)';ctx.lineWidth=3;ctx.stroke();

    // Épaisseur panneau
    var bot=[proj(ox,-PT,cz),proj(ox+PW,-PT,cz),proj(ox+PW,0,cz),proj(ox,0,cz)];
    ctx.beginPath();ctx.moveTo(bot[0].x,bot[0].y);
    bot.forEach(function(b){ctx.lineTo(b.x,b.y);});ctx.closePath();
    ctx.fillStyle='rgba(70,75,80,0.9)';ctx.fill();
    ctx.strokeStyle='#444';ctx.lineWidth=1;ctx.stroke();

    // 2 supports métalliques
    [[ox+PW*0.25,cz],[ox+PW*0.75,cz]].forEach(function(pt){
      var top2=proj(pt[0],0,pt[1]),gnd=proj(pt[0],-1.1,pt[1]+0.08);
      ctx.beginPath();ctx.moveTo(top2.x,top2.y);ctx.lineTo(gnd.x,gnd.y);
      ctx.strokeStyle='rgba(160,165,170,0.85)';ctx.lineWidth=5;ctx.stroke();
      var gl=proj(pt[0]-0.18,-1.1,pt[1]),gr=proj(pt[0]+0.18,-1.1,pt[1]);
      ctx.beginPath();ctx.moveTo(gl.x,gl.y);ctx.lineTo(gr.x,gr.y);
      ctx.strokeStyle='rgba(130,135,140,0.8)';ctx.lineWidth=6;ctx.stroke();
    });
  }

  function bulle(bx,by,lignes,couleur){
    couleur=couleur||'rgba(10,25,60,0.88)';
    var bw=190,lh=18,bh=lignes.length*lh+14;
    bx=Math.max(5,Math.min(W-bw-5,bx));
    by=Math.max(5,Math.min(H-bh-5,by));
    ctx.fillStyle=couleur;ctx.strokeStyle='rgba(79,195,247,0.85)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(bx,by,bw,bh,7);ctx.fill();ctx.stroke();
    ctx.fillStyle='#e3f2fd';ctx.font='11.5px Arial';
    lignes.forEach(function(l,i){ctx.fillText(l,bx+9,by+16+i*lh);});
  }

  function drawSoleil(){
    var nomV=(window._villeSelectionnee||{}).nom||'Lomé';
    var sp=proj(6,8,7);
    var gr=ctx.createRadialGradient(sp.x,sp.y,3,sp.x,sp.y,65);
    gr.addColorStop(0,'rgba(255,245,80,1)');
    gr.addColorStop(0.35,'rgba(255,200,30,0.85)');
    gr.addColorStop(1,'rgba(255,120,0,0)');
    ctx.beginPath();ctx.arc(sp.x,sp.y,65,0,Math.PI*2);ctx.fillStyle=gr;ctx.fill();
    for(var a=0;a<8;a++){
      var ang=a/8*Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(sp.x+Math.cos(ang)*68,sp.y+Math.sin(ang)*68);
      ctx.lineTo(sp.x+Math.cos(ang)*90,sp.y+Math.sin(ang)*90);
      ctx.strokeStyle='rgba(255,215,0,0.4)';ctx.lineWidth=2.2;ctx.stroke();
    }
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    var sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#0d1b3e');sky.addColorStop(0.62,'#1a4a8a');sky.addColorStop(1,'#1b5e20');
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    drawSoleil();drawGrid();

    var nb=nbPanneaux;
    var cols=nb===1?1:nb<=4?Math.min(nb,2):nb<=9?3:4;
    var rows=Math.ceil(nb/cols);
    var gX=2.7,gZ=3.2;
    var sX=-(cols-1)*gX/2, sZ=-(rows-1)*gZ/2;
    var incl=inclinaisonDeg*Math.PI/180;
    var img=nb===1?imgS:imgF;

    var posPremier=null, pos=[];
    var count=0;
    for(var rr=0;rr<rows&&count<nb;rr++){
      for(var cc=0;cc<cols&&count<nb;cc++){
        var px=sX+cc*gX, pz=sZ+rr*gZ;
        drawPanel(px,pz,incl,img);
        if(!posPremier) posPremier={px,pz};
        pos.push({px,pz});
        count++;
      }
    }

    // Légendes
    if(posPremier){
      var nomV=(window._villeSelectionnee||{}).nom||'Lomé';
      var villeD=(window._villeSelectionnee||{}).data||{};
      var p1=proj(posPremier.px-1.1,0.5,posPremier.pz);
      bulle(p1.x-200,p1.y-20,[
        '🟦 Panneau N°1',
        'Monocristallin 400W',
        'Rendement ≥ 21%',
        'Cadre aluminium anodisé'
      ]);
      var pLast=pos[pos.length-1];
      var p2=proj(pLast.px+1.1,0.9,pLast.pz);
      bulle(p2.x+10,p2.y-60,[
        '📍 '+nomV,
        'Inclinaison : '+inclinaisonDeg+'°',
        'Azimut : '+(villeD.azimut===0?'Plein Nord':'Plein Sud'),
        'HSP : '+(villeD.hsp||5.2)+'h/jour'
      ],'rgba(10,40,20,0.88)');
      var pCab=proj(0,-1.15,0);
      bulle(pCab.x-95,pCab.y+5,[
        '⚡ Câbles DC → MPPT',
        '🔩 Structure aluminium',
        '🌱 Mise à la terre'
      ],'rgba(40,25,5,0.85)');
    }

    // HUD
    var nomV2=(window._villeSelectionnee||{}).nom||'Lomé';
    var hspV=(window._villeSelectionnee&&window._villeSelectionnee.data)?window._villeSelectionnee.data.hsp:5.2;
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.strokeStyle='rgba(79,195,247,0.5)';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(10,10,260,82,8);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='bold 13px Arial';
    ctx.fillText('📍 '+nomV2+' — '+inclinaisonDeg+'° inclinaison',18,30);
    ctx.font='11.5px Arial';ctx.fillStyle='#ffee58';
    ctx.fillText('🔆 HSP : '+hspV+'h/jour   🧭 Azimut Sud',18,50);
    ctx.fillStyle='#80deea';
    ctx.fillText('🟦 '+nb+' panneau'+(nb>1?'x':'')+' solaire'+(nb>1?'s':''),18,68);
    ctx.fillStyle='rgba(200,200,200,0.5)';ctx.font='10px Arial';
    ctx.fillText('Glisser=tourner · Molette=zoom · Touch OK',18,84);
  }

  function startAuto(){
    var a=100;
    function f(){if(a>0&&!drag){rotY+=0.005;draw();a--;requestAnimationFrame(f);}}
    f();
  }
  if(loaded>=2){draw();startAuto();}
}

// ================================================================
//  STYLES
// ================================================================
(function(){
  var s=document.createElement('style');
  s.textContent=`
    .ia-container{margin-top:25px;font-family:'Segoe UI',Arial,sans-serif;}
    .ia-header{background:linear-gradient(135deg,#0a192f,#1a3a5c 60%,#1b5e20);color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;display:flex;align-items:center;gap:16px;}
    .ia-header h2{margin:0 0 4px;font-size:1rem;font-weight:700;}
    .ia-subtitle{font-size:.75rem;color:rgba(255,255,255,.65);}
    .ia-logo{font-size:2.4rem;}
    .ia-bloc{background:#f8faff;border-left:4px solid #1565c0;padding:20px 24px;margin-bottom:10px;border-radius:0 8px 8px 0;box-shadow:0 2px 8px rgba(0,0,0,.07);}
    .ia-bloc h3{margin:0 0 14px;font-size:.97rem;font-weight:700;padding-bottom:8px;border-bottom:1px solid #d0dcf5;color:#0d2244;}
    .ia-contenu{color:#1a2a1a;line-height:1.9;font-size:.92rem;}
    .ia-contenu p{margin:3px 0;} .ia-contenu li{margin-bottom:5px;} .ia-contenu ul{list-style:none;padding-left:4px;}
    .ia-calcul{background:#eef3ff;border-left-color:#1976d2;} .ia-calcul h3{color:#1565c0;}
    .ia-decision{background:#e8f5e9;border-left-color:#2e7d32;} .ia-decision h3{color:#1b5e20;}
    .ia-cablage{background:#fff8e1;border-left-color:#f57f17;} .ia-cablage h3{color:#e65100;}
    .ia-orient{background:#f3e5f5;border-left-color:#7b1fa2;} .ia-orient h3{color:#6a1b9a;}
    .ia-motivant{background:linear-gradient(135deg,#e8f5e9,#fffde7);border-left-color:#f9a825;padding:24px;} .ia-motivant h3{color:#e65100;}
    .ia-motivant .ia-contenu{font-size:.97rem;line-height:2.1;}
    .ia-3d-bloc{background:#0d1b3e;border-left:4px solid #4fc3f7;padding:20px;} .ia-3d-bloc h3{color:#4fc3f7;border-bottom:1px solid rgba(79,195,247,.25);padding-bottom:8px;margin-bottom:8px;}
    .ia-3d-hint{color:#90caf9;font-size:.8rem;margin:0 0 12px;font-style:italic;}
    .scene3d-wrap{width:100%;border-radius:10px;overflow:hidden;min-height:600px;}
    .ia-loading{background:#e3f2fd;border:2px dashed #1976d2;padding:24px;border-radius:10px;text-align:center;color:#1565c0;font-size:1rem;animation:pls 1.4s ease-in-out infinite;}
    @keyframes pls{0%,100%{opacity:1}50%{opacity:.4}}
    .valider-btn{background:linear-gradient(135deg,#1565c0,#0d47a1);color:#fff;width:100%;padding:16px;font-size:1rem;border-radius:10px;border:none;cursor:pointer;margin-top:12px;font-weight:700;letter-spacing:.3px;transition:all .2s;box-shadow:0 3px 10px rgba(21,101,192,.4);}
    .valider-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 14px rgba(21,101,192,.5);}
    .valider-btn:disabled{background:#aaa;cursor:not-allowed;box-shadow:none;}
  `;
  document.head.appendChild(s);
})();
