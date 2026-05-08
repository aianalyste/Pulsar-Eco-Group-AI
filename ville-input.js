// ================================================================
//  PULSAR ECO GROUP — Champ ville avec autocomplétion + Google Maps
// ================================================================

function creerChampVille(containerId) {
  var c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML =
    '<div class="ville-bloc">' +
      '<label class="ville-label">📍 Ville d\'installation <span style="color:red">*</span></label>' +
      '<div class="ville-input-wrap">' +
        '<input type="text" id="villeInput" placeholder="Ex: Lomé, Kara, Accra, Dakar, Paris..." ' +
          'autocomplete="off" oninput="filtrerVilles()" onblur="cacherSugg()" onfocus="filtrerVilles()">' +
        '<div id="ville-sugg" class="ville-sugg"></div>' +
      '</div>' +
      '<div id="ville-info" style="display:none;"></div>' +
      '<div id="ville-map"  style="display:none;margin-top:8px;border-radius:8px;overflow:hidden;border:1.5px solid #b0bec5;"></div>' +
      '<div id="ville-inconnue" style="display:none;"></div>' +
    '</div>';

  // Styles
  if (!document.getElementById('ville-styles')) {
    var s = document.createElement('style');
    s.id = 'ville-styles';
    s.textContent = `
      .ville-bloc{margin:10px 0 16px;}
      .ville-label{display:block;font-weight:600;color:#0a192f;margin-bottom:6px;font-size:.93rem;}
      .ville-input-wrap{position:relative;}
      .ville-input-wrap input{width:100%;padding:10px 14px;font-size:.95rem;border:2px solid #b0bec5;border-radius:8px;outline:none;box-sizing:border-box;transition:border-color .2s;}
      .ville-input-wrap input:focus{border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.12);}
      .ville-sugg{position:absolute;top:100%;left:0;right:0;background:#fff;border:1.5px solid #1565c0;border-top:none;border-radius:0 0 8px 8px;max-height:200px;overflow-y:auto;z-index:999;box-shadow:0 6px 16px rgba(0,0,0,.12);display:none;}
      .ville-item{padding:9px 14px;cursor:pointer;border-bottom:.5px solid #e0e0e0;}
      .ville-item:hover{background:#e3f2fd;}
      .ville-nom{display:block;font-weight:600;font-size:.9rem;color:#0a192f;}
      .ville-meta{display:block;font-size:.75rem;color:#546e7a;margin-top:1px;}
      .ville-stats{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;}
      .stat-item{background:#fff;border-radius:6px;padding:7px 12px;text-align:center;min-width:80px;flex:1;border:.5px solid #a5d6a7;}
      .stat-val{display:block;font-size:.93rem;font-weight:700;color:#1b5e20;}
      .stat-lbl{display:block;font-size:.7rem;color:#558b2f;margin-top:1px;}
    `;
    document.head.appendChild(s);
  }
}

function filtrerVilles() {
  var inp  = document.getElementById('villeInput');
  var sugg = document.getElementById('ville-sugg');
  if (!inp || !sugg) return;
  var val = inp.value.trim().toLowerCase();
  sugg.innerHTML = '';

  var liste = typeof getListeVilles === 'function' ? getListeVilles() : [];
  var filtrees = val === '' ? liste.slice(0, 10) :
    liste.filter(function(v){ return v.toLowerCase().indexOf(val) !== -1; }).slice(0, 10);

  if (filtrees.length === 0 && val.length >= 2) {
    // Proposer la saisie manuelle pour ville inconnue
    var item = document.createElement('div');
    item.className = 'ville-item';
    item.innerHTML = '<span class="ville-nom">🔍 "' + inp.value.trim() + '" — ville non répertoriée</span>' +
      '<span class="ville-meta">Cliquez pour chercher via Google Maps</span>';
    item.onmousedown = function() { demanderInfosVilleInconnue(inp.value.trim()); };
    sugg.appendChild(item);
    sugg.style.display = 'block';
    return;
  }

  filtrees.forEach(function(v) {
    var d = VILLES_DATA[v];
    var item = document.createElement('div');
    item.className = 'ville-item';
    item.innerHTML =
      '<span class="ville-nom">' + v + '</span>' +
      '<span class="ville-meta">' + d.pays + ' · HSP ' + d.hsp + 'h · ' + d.region + '</span>';
    item.onmousedown = function() { choisirVille(v); };
    sugg.appendChild(item);
  });
  sugg.style.display = filtrees.length ? 'block' : 'none';
}

function cacherSugg() {
  setTimeout(function() {
    var s = document.getElementById('ville-sugg');
    if (s) s.style.display = 'none';
  }, 200);
}

function choisirVille(nom) {
  var inp = document.getElementById('villeInput');
  if (inp) inp.value = nom;
  cacherSugg();
  afficherInfoVille(nom, VILLES_DATA[nom]);
  window._villeSelectionnee = { nom: nom, data: VILLES_DATA[nom] };
  mettreAJourHSP(VILLES_DATA[nom].hsp);
  if (typeof verifierFormulaire === 'function') verifierFormulaire();
}

function afficherInfoVille(nom, d) {
  var info = document.getElementById('ville-info');
  var mapDiv = document.getElementById('ville-map');
  if (!info || !d) return;

  var hemi = (d.lat >= 0) ? '↑ Plein Sud' : '↓ Plein Nord ⚠️';
  info.style.display = 'block';
  info.style.cssText = 'background:#e8f5e9;border:1.5px solid #43a047;border-radius:8px;padding:12px 14px;margin-top:8px;';
  info.innerHTML =
    '<div class="ville-stats">' +
      '<div class="stat-item"><span class="stat-val">' + d.hsp + 'h</span><span class="stat-lbl">HSP/jour</span></div>' +
      '<div class="stat-item"><span class="stat-val">' + d.inclinaison + '°</span><span class="stat-lbl">Inclinaison</span></div>' +
      '<div class="stat-item"><span class="stat-val">' + hemi + '</span><span class="stat-lbl">Orientation</span></div>' +
      '<div class="stat-item"><span class="stat-val">' + d.pays + '</span><span class="stat-lbl">Pays</span></div>' +
    '</div>' +
    '<p style="margin:4px 0 0;font-size:.8rem;color:#2e7d32;font-style:italic;">💡 ' + (d.note||nom) + '</p>';

  // Carte Google Maps embed (sans clé API)
  mapDiv.style.display = 'block';
  mapDiv.innerHTML = '<iframe width="100%" height="180" frameborder="0" style="border:0;display:block;" ' +
    'src="https://maps.google.com/maps?q=' + d.lat + ',' + d.lon + '&z=9&output=embed" allowfullscreen loading="lazy"></iframe>';
}

// ================================================================
//  VILLE INCONNUE — formulaire + Google Maps Geocoding
// ================================================================
function demanderInfosVilleInconnue(nomVille) {
  cacherSugg();
  var div = document.getElementById('ville-inconnue');
  if (!div) return;
  div.style.display = 'block';
  div.style.cssText = 'background:#fff3e0;border:1.5px solid #ff9800;border-radius:10px;padding:16px;margin-top:10px;';
  div.innerHTML =
    '<p style="color:#e65100;font-weight:600;margin:0 0 12px;font-size:.9rem;">🔍 Ville non répertoriée — Renseignez le pays pour localiser automatiquement</p>' +
    '<label style="font-size:.88rem;font-weight:600;display:block;margin-bottom:5px;">Pays :</label>' +
    '<input id="pays-input" type="text" placeholder="Ex: Togo, France, Canada..." ' +
      'style="width:100%;padding:9px;border:1.5px solid #b0bec5;border-radius:7px;box-sizing:border-box;font-size:.9rem;margin-bottom:10px;">' +
    '<button onclick="rechercherVilleGoogleMaps(\'' + nomVille.replace(/'/g,"\\'") + '\')" ' +
      'style="width:100%;padding:10px;background:#e65100;color:#fff;border:none;border-radius:7px;cursor:pointer;font-weight:600;font-size:.9rem;">' +
      '🗺️ Localiser et utiliser cette ville' +
    '</button>' +
    '<div id="geocode-result" style="margin-top:10px;"></div>';
}

function rechercherVilleGoogleMaps(nomVille) {
  var pays = (document.getElementById('pays-input')||{}).value || '';
  var res  = document.getElementById('geocode-result');
  if (!pays.trim()) { if(res) res.innerHTML='<p style="color:red;font-size:.85rem;">Veuillez entrer le pays !</p>'; return; }
  if (res) res.innerHTML = '<p style="color:#1565c0;font-size:.85rem;">⏳ Recherche en cours...</p>';

  var query = encodeURIComponent(nomVille + ', ' + pays);
  var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + query + '&limit=1&addressdetails=1';

  fetch(url, { headers: { 'Accept-Language': 'fr', 'User-Agent': 'PulsarEcoGroup/1.0' } })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (!data || data.length === 0) {
        if(res) res.innerHTML = '<p style="color:red;font-size:.85rem;">❌ Ville introuvable. Vérifiez l\'orthographe.</p>';
        return;
      }
      var loc = data[0];
      var lat = parseFloat(loc.lat);
      var lon = parseFloat(loc.lon);
      var pays_nom = (loc.address && loc.address.country) ? loc.address.country : pays;

      // Estimer HSP selon latitude
      var absLat = Math.abs(lat);
      var hsp = absLat < 5 ? 4.8 : absLat < 10 ? 5.2 : absLat < 15 ? 5.6 :
                absLat < 20 ? 5.9 : absLat < 25 ? 6.2 : absLat < 30 ? 5.8 :
                absLat < 35 ? 5.4 : absLat < 40 ? 5.0 : absLat < 45 ? 4.5 : 4.0;
      var inclinaison = Math.round(absLat);
      var azimut = lat >= 0 ? 180 : 0;

      var villeData = {
        hsp: hsp, lat: lat, lon: lon,
        pays: pays_nom, region: pays,
        inclinaison: inclinaison, azimut: azimut,
        note: nomVille + ' (' + pays_nom + ') — données estimées via OpenStreetMap'
      };

      // Enregistrer dans le système
      window._villeSelectionnee = { nom: nomVille, data: villeData };
      var inp = document.getElementById('villeInput');
      if (inp) inp.value = nomVille;
      mettreAJourHSP(hsp);

      if (res) res.innerHTML =
        '<div style="background:#e8f5e9;border:1px solid #43a047;border-radius:7px;padding:10px;font-size:.85rem;color:#1b5e20;">' +
        '✅ <strong>' + nomVille + '</strong> trouvée !<br>' +
        '📍 Lat: ' + lat.toFixed(3) + '° · Lon: ' + lon.toFixed(3) + '° · HSP estimé: <strong>' + hsp + 'h/jour</strong>' +
        '</div>';

      // Afficher la carte
      var mapDiv = document.getElementById('ville-map');
      if (mapDiv) {
        mapDiv.style.display = 'block';
        mapDiv.innerHTML = '<iframe width="100%" height="180" frameborder="0" style="border:0;display:block;" ' +
          'src="https://maps.google.com/maps?q=' + lat + ',' + lon + '&z=10&output=embed" allowfullscreen loading="lazy"></iframe>';
      }

      // Afficher infos
      afficherInfoVille(nomVille, villeData);
      document.getElementById('ville-inconnue').style.display = 'none';
      if (typeof verifierFormulaire === 'function') verifierFormulaire();
    })
    .catch(function(err) {
      if(res) res.innerHTML = '<p style="color:red;font-size:.85rem;">❌ Erreur réseau : ' + err.message + '</p>';
    });
}

function mettreAJourHSP(hsp) {
  ['hsp','psh'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = hsp;
  });
}

function getVilleSelectionnee() {
  if (window._villeSelectionnee) return window._villeSelectionnee;
  var inp = document.getElementById('villeInput');
  if (inp && inp.value.trim() && typeof VILLES_DATA !== 'undefined' && VILLES_DATA[inp.value.trim()]) {
    return { nom: inp.value.trim(), data: VILLES_DATA[inp.value.trim()] };
  }
  return null;
}
