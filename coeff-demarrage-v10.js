// ================================================================
//  COEFFICIENTS DE DEMARRAGE PAR APPAREIL
//  Source : tableau fourni (www.gt-outillage.com)
//  coeff x puissanceRef = puissance de pointe au demarrage
// ================================================================
var COEFF_DEMARRAGE = {
  'aiguille_vibrante': { nom: 'Aiguille vibrante', coeff: 2, puissanceRef: 2200 },
  'aspirateur': { nom: 'Aspirateur', coeff: 2, puissanceRef: 900 },
  'aspirateur_professionnel': { nom: 'Aspirateur professionnel', coeff: 2, puissanceRef: 1400 },
  'betonniere': { nom: 'Bétonnière', coeff: 3, puissanceRef: 2000 },
  'bouilloire': { nom: 'Bouilloire', coeff: 1, puissanceRef: 2000 },
  'cafetiere': { nom: 'Cafetière', coeff: 1, puissanceRef: 1000 },
  'carotteuse': { nom: 'Carotteuse', coeff: 2, puissanceRef: 2000 },
  'cisaille': { nom: 'Cisaille', coeff: 2, puissanceRef: 270 },
  'chargeur_de_batterie': { nom: 'Chargeur de batterie', coeff: 1.2, puissanceRef: 140 },
  'chaudiere_bois': { nom: 'Chaudière bois', coeff: 1.2, puissanceRef: 1000 },
  'chaudiere_fioul': { nom: 'Chaudière fioul', coeff: 3, puissanceRef: 1000 },
  'chaudiere_gaz': { nom: 'Chaudière gaz', coeff: 1.2, puissanceRef: 1000 },
  'chauffage_radiateur': { nom: 'Chauffage (radiateur)', coeff: 1, puissanceRef: 1800 },
  'chauffe_eau_electrique': { nom: 'Chauffe-eau électrique', coeff: 1, puissanceRef: 2000 },
  'climatiseur': { nom: 'Climatiseur', coeff: 4, puissanceRef: 1400 },
  'compresseur_d_air': { nom: 'Compresseur d\'air', coeff: 3, puissanceRef: 2200 },
  'congelateur': { nom: 'Congélateur', coeff: 3, puissanceRef: 400 },
  'decapeur_thermique': { nom: 'Décapeur thermique', coeff: 1.2, puissanceRef: 1500 },
  'demolisseur_marteau': { nom: 'Démolisseur / Marteau', coeff: 1.2, puissanceRef: 2200 },
  'fendeuse_a_buche_triphasee': { nom: 'Fendeuse à bûche triphasée', coeff: 2.5, puissanceRef: 2200 },
  'friteuse': { nom: 'Friteuse', coeff: 1.2, puissanceRef: 4100 },
  'foreuse': { nom: 'Foreuse', coeff: 2, puissanceRef: 1600 },
  'four_a_micro_ondes': { nom: 'Four à micro-ondes', coeff: 2, puissanceRef: 1200 },
  'gacheur_projecteur': { nom: 'Gâcheur-Projecteur', coeff: 3, puissanceRef: 4500 },
  'grignoteuse': { nom: 'Grignoteuse', coeff: 2, puissanceRef: 500 },
  'hifi_tv_ordinateur_imprimante_photocopieur': { nom: 'Hifi, TV, Ordinateur, Imprimante, Photocopieur', coeff: 1, puissanceRef: 600 },
  'lapidaire': { nom: 'Lapidaire', coeff: 2, puissanceRef: 700 },
  'lumiere_a_incandescence': { nom: 'Lumière à incandescence', coeff: 1, puissanceRef: 100 },
  'lumiere_halogene': { nom: 'Lumière halogène', coeff: 1, puissanceRef: 500 },
  'lumiere_basse_consommation': { nom: 'Lumière basse consommation', coeff: 2, puissanceRef: 100 },
  'lumiere_neon': { nom: 'Lumière Néon', coeff: 2, puissanceRef: 250 },
  'machine_a_laver_le_linge': { nom: 'Machine à laver le linge', coeff: 4, puissanceRef: 1500 },
  'machine_a_projeter': { nom: 'Machine à projeter', coeff: 3.5, puissanceRef: 2200 },
  'marteau_perforateur': { nom: 'Marteau perforateur', coeff: 1.6, puissanceRef: 1250 },
  'marteau_piqueur': { nom: 'Marteau piqueur', coeff: 1.2, puissanceRef: 1500 },
  'melangeur_malaxeur': { nom: 'Mélangeur / Malaxeur', coeff: 2, puissanceRef: 1150 },
  'meuleuse_angulaire': { nom: 'Meuleuse angulaire', coeff: 1.6, puissanceRef: 2000 },
  'monte_charge': { nom: 'Monte charge', coeff: 3, puissanceRef: 2200 },
  'moteur_electrique_a_vide': { nom: 'Moteur électrique à vide', coeff: 1.5, puissanceRef: 736 },
  'moteur_electrique_en_charge': { nom: 'Moteur électrique en charge', coeff: 3, puissanceRef: 736 },
  'nettoyeur_haute_pression': { nom: 'Nettoyeur haute pression', coeff: 4, puissanceRef: 1800 },
  'onduleur': { nom: 'Onduleur', coeff: 3.5, puissanceRef: 800 },
  'perceuse': { nom: 'Perceuse', coeff: 1.6, puissanceRef: 750 },
  'pompe_a_chaleur_pac': { nom: 'Pompe à chaleur (PAC)', coeff: 3, puissanceRef: 1000 },
  'pompe_a_piston_airless': { nom: 'Pompe à piston Airless', coeff: 2, puissanceRef: 800 },
  'pompe_d_alimentation': { nom: 'Pompe d\'alimentation', coeff: 2, puissanceRef: 500 },
  'pompe_de_surface': { nom: 'Pompe de surface', coeff: 2, puissanceRef: 800 },
  'pompe_immergee_relevage': { nom: 'Pompe immergée / relevage', coeff: 3, puissanceRef: 800 },
  'ponceuse_a_bande': { nom: 'Ponceuse à bande', coeff: 2, puissanceRef: 750 },
  'ponceuse_excentrique': { nom: 'Ponceuse excentrique', coeff: 2, puissanceRef: 600 },
  'ponceuse_vibrante': { nom: 'Ponceuse vibrante', coeff: 2, puissanceRef: 330 },
  'pulverisateur_de_platre': { nom: 'Pulvérisateur de plâtre', coeff: 3, puissanceRef: 1500 },
  'rainureuse': { nom: 'Rainureuse', coeff: 2, puissanceRef: 1400 },
  'rabot': { nom: 'Rabot', coeff: 2, puissanceRef: 850 },
  'refrigerateur_vitrine_refrigeree': { nom: 'Réfrigérateur / Vitrine réfrigérée', coeff: 3, puissanceRef: 400 },
  'scie_a_bois': { nom: 'Scie à bois', coeff: 4, puissanceRef: 1500 },
  'scie_a_onglet': { nom: 'Scie à onglet', coeff: 2, puissanceRef: 1600 },
  'scie_circulaire': { nom: 'Scie circulaire', coeff: 2, puissanceRef: 1600 },
  'scie_sauteuse': { nom: 'Scie sauteuse', coeff: 1.6, puissanceRef: 750 },
  'seche_linge': { nom: 'Sèche-linge', coeff: 3, puissanceRef: 2400 },
  'ouverture_de_porte_de_garage': { nom: 'Ouverture de porte de garage', coeff: 3, puissanceRef: 600 },
  'touret_a_meuler': { nom: 'Touret à meuler', coeff: 2, puissanceRef: 700 },
  'treuil_galant': { nom: 'Treuil, Galant', coeff: 3, puissanceRef: 750 },
  'tariere': { nom: 'Tarière', coeff: 3, puissanceRef: 1000 },
  'ventilateur': { nom: 'Ventilateur', coeff: 2, puissanceRef: 200 },
};

// Recherche le coefficient d'un appareil a partir de son nom saisi
// (recherche par mots-cles, insensible a la casse/accents ; score = nombre
// de mots du catalogue retrouves dans le nom saisi, on garde le meilleur score)
function trouverCoeffDemarrage(nomSaisi) {
  var repl = {'é':'e','è':'e','ê':'e','à':'a','â':'a','ô':'o','î':'i','ç':'c','û':'u','ù':'u'};
  function normaliser(s) {
    s = (s || '').toLowerCase();
    for (var k in repl) s = s.split(k).join(repl[k]);
    return s;
  }
  var n = normaliser(nomSaisi);
  var meilleur = null, meilleurScore = 0;
  for (var cle in COEFF_DEMARRAGE) {
    var entree = COEFF_DEMARRAGE[cle];
    var mots = normaliser(entree.nom).split(/[^a-z0-9]+/).filter(function (m) { return m.length >= 3; });
    var score = 0;
    mots.forEach(function (m) { if (n.indexOf(m) !== -1) score++; });
    if (score > meilleurScore) { meilleur = entree; meilleurScore = score; }
  }
  return meilleur; // null si aucun appareil reconnu -> coefficient 1 (classique) par defaut
}
