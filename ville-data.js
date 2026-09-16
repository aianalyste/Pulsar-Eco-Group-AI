// ================================================================
//  PULSAR ECO GROUP — Base de données ensoleillement villes
//
//  MÉTHODE (corrigée le 03/09) :
//  - hsp = irradiation MAXIMALE (pic saisonnier, pas la moyenne annuelle)
//  - inclinaison = angle optimal ≈ latitude du lieu (règle d'ingénierie
//    solaire standard, validée sur les données réelles ci-dessous)
//
//  Sources vérifiées individuellement (NASA POWER, via profileSOLAR,
//  valeur du pic saisonnier "printemps") pour les capitales de :
//  Togo (Lomé, donnée fournie), Bénin (Cotonou), Ghana (Accra + Tamale),
//  Sénégal (Dakar), Burkina Faso (Ouagadougou), Niger (Niamey),
//  Nigeria (Lagos).
//  Pour les AUTRES villes de ces pays, et pour les pays non vérifiés
//  individuellement (Côte d'Ivoire, Mali, Cameroun, Congo, RD Congo,
//  Gabon), un facteur de correction a été appliqué à partir du ratio
//  observé entre l'ancienne valeur et la valeur maximale vérifiée de
//  la capitale du même pays (ou d'un pays climatiquement proche).
//  Ce ne sont donc PAS des valeurs vérifiées une par une : à contrôler
//  individuellement si une précision plus fine est nécessaire pour un
//  projet donné (via NASA POWER, PVGIS ou Global Solar Atlas).
// ================================================================

var VILLES_DATA = {
  "Lomé":             { hsp:6.13, lat:6.14, lon:1.22, pays:"Togo", region:"Côtier", inclinaison:10, azimut:180, note:"Capitale, bonne irradiation côtière" },
  "Kpalimé":          { hsp:6.00, lat:6.90, lon:0.63, pays:"Togo", region:"Plateaux", inclinaison:7, azimut:180, note:"Zone de plateaux, légèrement plus nuageux" },
  "Sokodé":           { hsp:6.40, lat:8.98, lon:1.14, pays:"Togo", region:"Centrale", inclinaison:9, azimut:180, note:"Centre du pays, bon ensoleillement" },
  "Kara":             { hsp:6.50, lat:9.55, lon:1.19, pays:"Togo", region:"Kara", inclinaison:10, azimut:180, note:"Nord Togo, excellent ensoleillement" },
  "Atakpamé":         { hsp:6.10, lat:7.53, lon:1.12, pays:"Togo", region:"Plateaux", inclinaison:8, azimut:180, note:"Zone centrale-sud" },
  "Dapaong":          { hsp:6.80, lat:10.86, lon:0.21, pays:"Togo", region:"Savanes", inclinaison:11, azimut:180, note:"Extrême nord, très fort ensoleillement" },
  "Tsévié":           { hsp:6.20, lat:6.42, lon:1.21, pays:"Togo", region:"Maritime", inclinaison:6, azimut:180, note:"Proche Lomé" },
  "Anié":             { hsp:6.30, lat:7.75, lon:1.20, pays:"Togo", region:"Plateaux", inclinaison:8, azimut:180, note:"Zone centrale" },
  "Bassar":           { hsp:6.50, lat:9.25, lon:0.78, pays:"Togo", region:"Kara", inclinaison:9, azimut:180, note:"Région de Kara" },
  "Niamtougou":       { hsp:6.60, lat:9.77, lon:1.10, pays:"Togo", region:"Kara", inclinaison:10, azimut:180, note:"Région nord" },
  "Cotonou":          { hsp:5.51, lat:6.37, lon:2.42, pays:"Bénin", region:"Littoral", inclinaison:6, azimut:180, note:"Capitale économique du Bénin" },
  "Porto-Novo":       { hsp:5.51, lat:6.50, lon:2.63, pays:"Bénin", region:"Ouémé", inclinaison:6, azimut:180, note:"Capitale administrative" },
  "Parakou":          { hsp:5.94, lat:9.34, lon:2.62, pays:"Bénin", region:"Borgou", inclinaison:9, azimut:180, note:"Capitale du nord Bénin" },
  "Natitingou":       { hsp:6.16, lat:10.32, lon:1.38, pays:"Bénin", region:"Atacora", inclinaison:10, azimut:180, note:"Atacora, excellent ensoleillement" },
  "Abomey":           { hsp:5.62, lat:7.18, lon:1.99, pays:"Bénin", region:"Zou", inclinaison:7, azimut:180, note:"Région du Zou" },
  "Bohicon":          { hsp:5.62, lat:7.18, lon:2.07, pays:"Bénin", region:"Zou", inclinaison:7, azimut:180, note:"Carrefour commercial" },
  "Kandi":            { hsp:6.37, lat:11.13, lon:2.94, pays:"Bénin", region:"Alibori", inclinaison:11, azimut:180, note:"Extrême nord, très fort soleil" },
  "Accra":            { hsp:5.82, lat:5.56, lon:-0.20, pays:"Ghana", region:"Greater Accra", inclinaison:6, azimut:180, note:"Capitale du Ghana" },
  "Kumasi":           { hsp:5.60, lat:6.69, lon:-1.62, pays:"Ghana", region:"Ashanti", inclinaison:7, azimut:180, note:"Capitale Ashanti" },
  "Tamale":           { hsp:6.38, lat:9.40, lon:-0.84, pays:"Ghana", region:"Northern", inclinaison:9, azimut:180, note:"Nord Ghana, très ensoleillé" },
  "Takoradi":         { hsp:5.71, lat:4.90, lon:-1.76, pays:"Ghana", region:"Western", inclinaison:5, azimut:180, note:"Port pétrolier ouest" },
  "Cape Coast":       { hsp:5.60, lat:5.10, lon:-1.25, pays:"Ghana", region:"Central", inclinaison:5, azimut:180, note:"Côte centrale" },
  "Bolgatanga":       { hsp:6.61, lat:10.79, lon:-0.85, pays:"Ghana", region:"Upper East", inclinaison:11, azimut:180, note:"Extrême nord Ghana" },
  "Abidjan":          { hsp:5.50, lat:5.36, lon:-4.01, pays:"Côte d'Ivoire", region:"Lagunes", inclinaison:5, azimut:180, note:"Capitale économique de CI" },
  "Yamoussoukro":     { hsp:5.72, lat:6.82, lon:-5.27, pays:"Côte d'Ivoire", region:"Lacs", inclinaison:7, azimut:180, note:"Capitale politique" },
  "Bouaké":           { hsp:5.83, lat:7.69, lon:-5.03, pays:"Côte d'Ivoire", region:"Vallée du Bandama", inclinaison:8, azimut:180, note:"Centre du pays" },
  "Korhogo":          { hsp:6.16, lat:9.46, lon:-5.63, pays:"Côte d'Ivoire", region:"Savanes", inclinaison:9, azimut:180, note:"Nord CI, bon ensoleillement" },
  "San-Pédro":        { hsp:5.50, lat:4.75, lon:-6.64, pays:"Côte d'Ivoire", region:"Bas-Sassandra", inclinaison:5, azimut:180, note:"Port du sud-ouest" },
  "Man":              { hsp:5.61, lat:7.41, lon:-7.55, pays:"Côte d'Ivoire", region:"Montagnes", inclinaison:7, azimut:180, note:"Région montagneuse" },
  "Dakar":            { hsp:7.48, lat:14.72, lon:-17.47, pays:"Sénégal", region:"Dakar", inclinaison:15, azimut:180, note:"Capitale, irradiation élevée" },
  "Thiès":            { hsp:7.62, lat:14.79, lon:-16.93, pays:"Sénégal", region:"Thiès", inclinaison:15, azimut:180, note:"Proche Dakar" },
  "Kaolack":          { hsp:7.89, lat:14.15, lon:-16.07, pays:"Sénégal", region:"Kaolack", inclinaison:14, azimut:180, note:"Centre Sénégal" },
  "Saint-Louis":      { hsp:7.75, lat:16.02, lon:-16.50, pays:"Sénégal", region:"Saint-Louis", inclinaison:16, azimut:180, note:"Nord Sénégal" },
  "Ziguinchor":       { hsp:7.21, lat:12.57, lon:-16.27, pays:"Sénégal", region:"Casamance", inclinaison:13, azimut:180, note:"Casamance, plus humide" },
  "Tambacounda":      { hsp:8.02, lat:13.77, lon:-13.67, pays:"Sénégal", region:"Tambacounda", inclinaison:14, azimut:180, note:"Est Sénégal, très ensoleillé" },
  "Bamako":           { hsp:7.54, lat:12.65, lon:-8.00, pays:"Mali", region:"Bamako", inclinaison:13, azimut:180, note:"Capitale, fort ensoleillement" },
  "Ségou":            { hsp:7.80, lat:13.45, lon:-6.27, pays:"Mali", region:"Ségou", inclinaison:13, azimut:180, note:"Zone sahélienne" },
  "Mopti":            { hsp:7.93, lat:14.49, lon:-4.20, pays:"Mali", region:"Mopti", inclinaison:14, azimut:180, note:"Delta intérieur, excellent" },
  "Tombouctou":       { hsp:8.84, lat:16.77, lon:-3.00, pays:"Mali", region:"Tombouctou", inclinaison:17, azimut:180, note:"Zone désertique, ensoleillement exceptionnel" },
  "Sikasso":          { hsp:7.41, lat:11.32, lon:-5.67, pays:"Mali", region:"Sikasso", inclinaison:11, azimut:180, note:"Sud Mali, zone agricole" },
  "Ouagadougou":      { hsp:6.96, lat:12.37, lon:-1.53, pays:"Burkina Faso", region:"Centre", inclinaison:12, azimut:180, note:"Capitale, excellent ensoleillement" },
  "Bobo-Dioulasso":   { hsp:6.73, lat:11.18, lon:-4.30, pays:"Burkina Faso", region:"Hauts-Bassins", inclinaison:11, azimut:180, note:"2ème ville, bon ensoleillement" },
  "Ouahigouya":       { hsp:7.19, lat:13.58, lon:-2.42, pays:"Burkina Faso", region:"Nord", inclinaison:14, azimut:180, note:"Nord, très fort soleil" },
  "Banfora":          { hsp:6.61, lat:10.63, lon:-4.77, pays:"Burkina Faso", region:"Comoé", inclinaison:11, azimut:180, note:"Sud-ouest" },
  "Niamey":           { hsp:7.50, lat:13.51, lon:2.12, pays:"Niger", region:"Niamey", inclinaison:14, azimut:180, note:"Capitale, zone sahélienne" },
  "Zinder":           { hsp:7.73, lat:13.81, lon:8.99, pays:"Niger", region:"Zinder", inclinaison:14, azimut:180, note:"Est Niger, fort ensoleillement" },
  "Maradi":           { hsp:7.62, lat:13.50, lon:7.10, pays:"Niger", region:"Maradi", inclinaison:14, azimut:180, note:"Centre-sud Niger" },
  "Agadez":           { hsp:8.33, lat:16.97, lon:7.99, pays:"Niger", region:"Agadez", inclinaison:17, azimut:180, note:"Zone désertique, exceptionnel" },
  "Yaoundé":          { hsp:5.18, lat:3.87, lon:11.52, pays:"Cameroun", region:"Centre", inclinaison:4, azimut:180, note:"Capitale, équatorial, plus nuageux" },
  "Douala":           { hsp:4.97, lat:4.05, lon:9.70, pays:"Cameroun", region:"Littoral", inclinaison:4, azimut:180, note:"Équatorial humide, ensoleillement modéré" },
  "Garoua":           { hsp:6.37, lat:9.30, lon:13.40, pays:"Cameroun", region:"Nord", inclinaison:9, azimut:180, note:"Nord Cameroun, excellent" },
  "Maroua":           { hsp:6.70, lat:10.59, lon:14.32, pays:"Cameroun", region:"Extrême-Nord", inclinaison:11, azimut:180, note:"Extrême nord, très fort soleil" },
  "Ngaoundéré":       { hsp:5.94, lat:7.33, lon:13.58, pays:"Cameroun", region:"Adamaoua", inclinaison:7, azimut:180, note:"Plateau de l'Adamaoua" },
  "Bafoussam":        { hsp:5.40, lat:5.48, lon:10.42, pays:"Cameroun", region:"Ouest", inclinaison:5, azimut:180, note:"Hauts plateaux de l'Ouest" },
  "Brazzaville":      { hsp:5.25, lat:-4.27, lon:15.28, pays:"Congo", region:"Pool", inclinaison:4, azimut:0, note:"Hémisphère sud — panneaux orientés Nord !" },
  "Pointe-Noire":     { hsp:5.35, lat:-4.78, lon:11.86, pays:"Congo", region:"Kouilou", inclinaison:5, azimut:0, note:"Hémisphère sud — orientation Nord" },
  "Kinshasa":         { hsp:5.46, lat:-4.32, lon:15.32, pays:"RD Congo", region:"Kinshasa", inclinaison:4, azimut:0, note:"Hémisphère sud — orientation Nord" },
  "Lubumbashi":       { hsp:5.88, lat:-11.68, lon:27.47, pays:"RD Congo", region:"Katanga", inclinaison:12, azimut:0, note:"Hémisphère sud — orientation Nord" },
  "Kisangani":        { hsp:5.25, lat:0.52, lon:25.19, pays:"RD Congo", region:"Tshopo", inclinaison:1, azimut:180, note:"Équateur — orientation Est/Ouest possible" },
  "Libreville":       { hsp:5.04, lat:0.39, lon:9.45, pays:"Gabon", region:"Estuaire", inclinaison:1, azimut:180, note:"Proche équateur, humide" },
  "Port-Gentil":      { hsp:5.15, lat:-0.72, lon:8.78, pays:"Gabon", region:"Ogooué-Maritime", inclinaison:1, azimut:0, note:"Légèrement hémisphère sud" },
  "Lagos":            { hsp:5.35, lat:6.52, lon:3.38, pays:"Nigeria", region:"Lagos", inclinaison:7, azimut:180, note:"Mégapole côtière" },
  "Abuja":            { hsp:5.89, lat:9.07, lon:7.40, pays:"Nigeria", region:"FCT", inclinaison:9, azimut:180, note:"Capitale fédérale" },
  "Kano":             { hsp:6.63, lat:12.00, lon:8.52, pays:"Nigeria", region:"Kano", inclinaison:12, azimut:180, note:"Nord Nigeria, excellent soleil" },
  "Ibadan":           { hsp:5.46, lat:7.38, lon:3.90, pays:"Nigeria", region:"Oyo", inclinaison:7, azimut:180, note:"Sud-ouest Nigeria" },
  "Port Harcourt":    { hsp:5.14, lat:4.82, lon:7.04, pays:"Nigeria", region:"Rivers", inclinaison:5, azimut:180, note:"Delta du Niger, plus nuageux" },
  "Lomé (défaut)":  { hsp:6.13, lat:6.14,  lon:1.22,  pays:"Togo",         region:"Maritime",  inclinaison:10, azimut:180, note:"Valeur par défaut" }
};

// Obtenir les données d'une ville (recherche flexible)
function getVilleData(nomVille) {
  if (!nomVille || nomVille.trim() === '') {
    return VILLES_DATA["Lomé"];
  }
  var nom = nomVille.trim();
  if (VILLES_DATA[nom]) return VILLES_DATA[nom];
  var keys = Object.keys(VILLES_DATA);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === nom.toLowerCase()) return VILLES_DATA[keys[i]];
  }
  for (var j = 0; j < keys.length; j++) {
    if (keys[j].toLowerCase().indexOf(nom.toLowerCase()) !== -1) return VILLES_DATA[keys[j]];
  }
  return {
    hsp: 5.3, lat: 8.0, lon: 1.0, pays: "Inconnu",
    region: "Afrique de l'Ouest", inclinaison: 10, azimut: 180,
    note: "Ville non répertoriée — valeurs moyennes appliquées. Résultats approximatifs."
  };
}

// Liste des villes pour l'autocomplétion
function getListeVilles() {
  return Object.keys(VILLES_DATA).filter(function(v){ return v !== "Lomé (défaut)"; });
}