// ================================================================
//  PULSAR ECO GROUP — Composant champ ville avec autocomplétion
//  + carte miniature Google Maps
// ================================================================

function creerChampVille(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<div class="ville-bloc">' +
      '<label class="ville-label">📍 Ville d\'installation :</label>' +
      '<div class="ville-input-wrap">' +
        '<input type="text" id="villeInput" placeholder="Ex: Lomé, Kara, Accra, Dakar..." ' +
          'autocomplete="off" oninput="filtrerVilles()" onblur="cacherSuggestions()" ' +
          'onfocus="filtrerVilles()" onchange="villeChangee()">' +
        '<div id="ville-suggestions" class="ville-suggestions"></div>' +
      '</div>' +
      '<div id="ville-info" class="ville-info" style="display:none;"></div>' +
      '<div id="ville-map" class="ville-map" style="display:none;">' +
        '<iframe id="map-frame" width="100%" height="200" frameborder="0" ' +
          'style="border:0;border-radius:8px;" allowfullscreen="" loading="lazy"></iframe>' +
      '</div>' +
    '</div>';
}

function filtrerVilles() {
  var input = document.getElementById('villeInput');
  var sug   = document.getElementById('ville-suggestions');
  var val   = input.value.trim().toLowerCase();
  sug.innerHTML = '';

  var liste = getListeVilles();
  var filtrees = val === '' ? liste.slice(0, 12) :
    liste.filter(function(v){ return v.toLowerCase().indexOf(val) !== -1; }).slice(0, 10);

  if (filtrees.length === 0) { sug.style.display='none'; return; }

  filtrees.forEach(function(v) {
    var d = VILLES_DATA[v];
    var item = document.createElement('div');
    item.className = 'ville-item';
    item.innerHTML =
      '<span class="ville-nom">' + v + '</span>' +
      '<span class="ville-pays">' + d.pays + ' — HSP ' + d.hsp + 'h · ' + d.region + '</span>';
    item.onmousedown = function() { choisirVille(v); };
    sug.appendChild(item);
  });
  sug.style.display = 'block';
}

function cacherSuggestions() {
  setTimeout(function(){
    var sug = document.getElementById('ville-suggestions');
    if (sug) sug.style.display = 'none';
  }, 200);
}

function choisirVille(nom) {
  document.getElementById('villeInput').value = nom;
  document.getElementById('ville-suggestions').style.display = 'none';
  afficherInfoVille(nom);
  if (typeof verifierFormulaire === 'function') verifierFormulaire();
}

function villeChangee() {
  var val = document.getElementById('villeInput').value.trim();
  if (val) afficherInfoVille(val);
  if (typeof verifierFormulaire === 'function') verifierFormulaire();
}

function afficherInfoVille(nom) {
  var d = getVilleData(nom);
  var infoDiv = document.getElementById('ville-info');
  var mapDiv  = document.getElementById('ville-map');

  // Orientation selon hémisphère
  var hemi = d.lat >= 0 ? '↑ Plein Sud (hémisphère Nord)' : '↓ Plein Nord (hémisphère Sud)';
  var avertissement = d.pays === 'Inconnu' ?
    '<div class="ville-warn">⚠️ Ville non répertoriée — valeurs moyennes appliquées</div>' : '';

  infoDiv.style.display = 'block';
  infoDiv.innerHTML =
    avertissement +
    '<div class="ville-stats">' +
      '<div class="stat-item"><span class="stat-val">' + d.hsp + 'h</span><span class="stat-lbl">HSP/jour</span></div>' +
      '<div class="stat-item"><span class="stat-val">' + d.inclinaison + '°</span><span class="stat-lbl">Inclinaison</span></div>' +
      '<div class="stat-item"><span class="stat-val">' + hemi + '</span><span class="stat-lbl">Orientation</span></div>' +
      '<div class="stat-item"><span class="stat-val">' + d.pays + '</span><span class="stat-lbl">Pays</span></div>' +
    '</div>' +
    '<p class="ville-note">💡 ' + d.note + '</p>';

  // Carte Google Maps embed (sans clé API — mode satellite)
  mapDiv.style.display = 'block';
  var mapFrame = document.getElementById('map-frame');
  var mapUrl = 'https://maps.google.com/maps?q=' + d.lat + ',' + d.lon +
    '&z=10&output=embed&t=m';
  mapFrame.src = mapUrl;

  // Mettre à jour le HSP dans le formulaire si le champ existe
  var hspInput = document.getElementById('hsp') || document.getElementById('psh');
  if (hspInput) {
    hspInput.value = d.hsp;
    if (typeof verifierFormulaire === 'function') verifierFormulaire();
  }

  // Stocker globalement pour l'IA
  window._villeSelectionnee = { nom: nom, data: d };
}

function getVilleSelectionnee() {
  var input = document.getElementById('villeInput');
  if (!input || !input.value.trim()) return null;
  return { nom: input.value.trim(), data: getVilleData(input.value.trim()) };
}

// Styles du composant ville
(function() {
  var s = document.createElement('style');
  s.textContent = `
    .ville-bloc { margin:12px 0 16px; }
    .ville-label { display:block; font-weight:600; color:#0a192f; margin-bottom:6px; font-size:.95rem; }
    .ville-input-wrap { position:relative; }
    .ville-input-wrap input {
      width:100%; padding:10px 14px; font-size:1rem;
      border:2px solid #b0bec5; border-radius:8px;
      outline:none; box-sizing:border-box;
      transition:border-color .2s;
    }
    .ville-input-wrap input:focus { border-color:#1565c0; box-shadow:0 0 0 3px rgba(21,101,192,.15); }
    .ville-suggestions {
      position:absolute; top:100%; left:0; right:0;
      background:#fff; border:1.5px solid #1565c0;
      border-top:none; border-radius:0 0 8px 8px;
      max-height:220px; overflow-y:auto; z-index:999;
      box-shadow:0 6px 16px rgba(0,0,0,.15); display:none;
    }
    .ville-item { padding:9px 14px; cursor:pointer; border-bottom:.5px solid #e0e0e0; }
    .ville-item:hover { background:#e3f2fd; }
    .ville-nom { display:block; font-weight:600; font-size:.92rem; color:#0a192f; }
    .ville-pays { display:block; font-size:.78rem; color:#546e7a; margin-top:2px; }
    .ville-info { background:#e8f5e9; border:1.5px solid #43a047; border-radius:8px; padding:12px 14px; margin-top:8px; }
    .ville-warn { background:#fff3e0; border:1px solid #ff9800; border-radius:6px; padding:8px 12px; margin-bottom:8px; color:#e65100; font-size:.85rem; }
    .ville-stats { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:8px; }
    .stat-item { background:#fff; border-radius:6px; padding:7px 12px; text-align:center; min-width:90px; flex:1; border:.5px solid #a5d6a7; }
    .stat-val { display:block; font-size:.95rem; font-weight:700; color:#1b5e20; }
    .stat-lbl { display:block; font-size:.72rem; color:#558b2f; margin-top:2px; }
    .ville-note { margin:6px 0 0; font-size:.82rem; color:#2e7d32; font-style:italic; }
    .ville-map { margin-top:10px; border-radius:8px; overflow:hidden; border:1.5px solid #b0bec5; }
  `;
  document.head.appendChild(s);
})();
