// ================================================================
//  PULSAR ECO GROUP — LOGIQUE DU PARCOURS v9 (Module Ménage)
// ================================================================
var ETAT = {
  equipements: [],      // {nom, pu, nombre, heures, PT, E}
  bilan: null, Ej: 0, Pc: 0, IR: 5.2,
  panneauChoisi: null, NP: 0, Ns: 1, N: 1,
  controleurType: 'MPPT', VmaxMPPT: 150,
  batterieChoisie: null, Cb: 0, Nb: 0,
  logoDataUrl: null,
  resultatFinal: null
};

// ---------------- ÉTAPE 1 : tableau appareils ----------------
function addRow() {
  var t = document.getElementById('equipmentTable');
  var r = t.insertRow();
  r.innerHTML =
    '<td><input type="text" placeholder="Ex: Réfrigérateur" oninput="verifierEtape1()"></td>' +
    '<td><input type="number" placeholder="150" min="0" oninput="verifierEtape1()"></td>' +
    '<td><input type="number" placeholder="1" min="1" oninput="verifierEtape1()"></td>' +
    '<td><button class="del-btn" type="button" onclick="deleteRow(this)">✕</button></td>';
  verifierEtape1();
}
function deleteRow(btn) { btn.closest('tr').remove(); verifierEtape1(); }

function verifierEtape1() {
  var t = document.getElementById('equipmentTable');
  var ok = false;
  for (var i = 1; i < t.rows.length; i++) {
    var c = t.rows[i].cells;
    if (c[0].children[0].value && parseFloat(c[1].children[0].value) > 0 && parseFloat(c[2].children[0].value) > 0) { ok = true; break; }
  }
  return ok;
}

// ---------------- Navigation entre étapes ----------------
function allerEtape(n) {
  if (n === 2 && !passageVersEtape2Valide()) return;
  for (var i = 1; i <= 5; i++) {
    document.getElementById('panel-' + i).style.display = (i === n) ? 'block' : 'none';
    var stepEl = document.querySelector('.w-step[data-step="' + i + '"]');
    stepEl.classList.remove('active', 'done');
    if (i === n) stepEl.classList.add('active');
    else if (i < n) stepEl.classList.add('done');
  }
  if (n === 2) construireBande24h();
  if (n === 3) construireTableauPanneaux();
  if (n === 4) { construireTableauBatteries(); onControleurChange(); }
  window.scrollTo({ top: document.getElementById('panel-' + n).offsetTop - 20, behavior: 'smooth' });
}

function passageVersEtape2Valide() {
  var ville = getVilleSelectionnee();
  if (!ville) { alert('⚠️ Veuillez d\'abord sélectionner une ville.'); return false; }
  if (!verifierEtape1()) { alert('⚠️ Ajoutez au moins un appareil complet (nom, puissance, nombre).'); return false; }
  ETAT.IR = ville.data.hsp;
  return true;
}

// ---------------- ÉTAPE 2 : bande 24h ----------------
function construireBande24h() {
  var t = document.getElementById('equipmentTable');
  var cont = document.getElementById('bande24h-container');
  cont.innerHTML = '';
  ETAT.equipements = [];

  for (var i = 1; i < t.rows.length; i++) {
    var c = t.rows[i].cells;
    var nom = c[0].children[0].value, pu = parseFloat(c[1].children[0].value), nombre = parseFloat(c[2].children[0].value);
    if (!nom || !(pu > 0) || !(nombre > 0)) continue;
    var idx = ETAT.equipements.length;
    ETAT.equipements.push({ nom: nom, pu: pu, nombre: nombre, heures: 0 });

    var bloc = document.createElement('div');
    bloc.className = 'bande24h-appareil';
    var cases = '';
    for (var h = 0; h < 24; h++) {
      cases += '<div class="bande24h-case"><label>' + h + 'h</label>' +
        '<input type="checkbox" data-idx="' + idx + '" data-h="' + h + '" onchange="majCompteurHeures(' + idx + ')"></div>';
    }
    bloc.innerHTML =
      '<div class="bande24h-titre"><span>' + nom + ' (' + pu + ' W × ' + nombre + ')</span>' +
      '<span class="bande24h-compteur" id="compteur-' + idx + '">0 h/jour</span></div>' +
      '<div class="bande24h-grille">' + cases + '</div>';
    cont.appendChild(bloc);
  }
  document.getElementById('predim-resultats').innerHTML = '';
  document.getElementById('nav-vers-3').style.display = 'none';
}

function majCompteurHeures(idx) {
  var boxes = document.querySelectorAll('input[data-idx="' + idx + '"]:checked');
  var n = boxes.length;
  ETAT.equipements[idx].heures = n;
  document.getElementById('compteur-' + idx).textContent = n + ' h/jour';
}

// ---------------- Lancer le prédimensionnement ----------------
function lancerPredimensionnement() {
  var manquants = ETAT.equipements.filter(function (eq) { return eq.heures === 0; });
  if (manquants.length) {
    if (!confirm('⚠️ ' + manquants.length + ' appareil(s) n\'ont aucune heure cochée (temps d\'utilisation = 0h). Continuer quand même ?')) return;
  }

  ETAT.bilan = calculerBilan(ETAT.equipements);
  ETAT.Ej = calculerEnergieJournaliere(ETAT.bilan.E_total);
  ETAT.Pc = calculerPuissanceCrete(ETAT.Ej, ETAT.IR);

  var b = ETAT.bilan;
  var html = '';

  // Tableau de classement (classique / inductif)
  html += '<table class="recap-table"><caption>Classement des appareils</caption>' +
    '<tr><th>Appareils classiques</th><th>Appareils à démarrage inductif</th></tr>' +
    '<tr><td>' + (b.classiques.map(function (l) { return l.nom; }).join(', ') || '—') + '</td>' +
    '<td>' + (b.inductifs.map(function (l) { return l.nom; }).join(', ') || '—') + '</td></tr></table>';

  // Tableau de renseignement complet avec PT / E
  html += '<table class="recap-table"><caption>Tableau de renseignement des appareils</caption>' +
    '<tr><th>Appareil</th><th>Nombre</th><th>PU (W)</th><th>Temps (h)</th><th>PT (W)</th><th>Énergie (Wh)</th></tr>';
  b.lignes.forEach(function (l) {
    html += '<tr><td>' + l.nom + '</td><td>' + l.nombre + '</td><td>' + l.pu + '</td><td>' + l.heures + '</td><td>' + l.PT.toFixed(0) + '</td><td>' + l.E.toFixed(0) + '</td></tr>';
  });
  html += '<tr style="font-weight:700;background:#e3f2fd;"><td colspan="4">TOTAL</td><td>' + b.PT_total.toFixed(0) + ' W</td><td>' + b.E_total.toFixed(0) + ' Wh</td></tr></table>';

  html += '<table class="recap-table"><caption>Résultats du prédimensionnement</caption>' +
    '<tr><td>Énergie journalière Ej = 1,2 × E</td><td><strong>' + ETAT.Ej.toFixed(1) + ' Wh</strong></td></tr>' +
    '<tr><td>Irradiation (IR) de la zone</td><td><strong>' + ETAT.IR + ' kWh/m²/j</strong></td></tr>' +
    '<tr><td>Puissance crête Pc = Ej ÷ (η×η×RP×IR)</td><td><strong>' + ETAT.Pc.toFixed(0) + ' Wc</strong></td></tr></table>';

  document.getElementById('predim-resultats').innerHTML = html;
  document.getElementById('nav-vers-3').style.display = 'flex';
}

// ---------------- ÉTAPE 3 : choix des panneaux ----------------
function construireFiltresPanneaux() {
  var fabricants = [].concat.apply([], [PANNEAUX_CATALOGUE.map(function (p) { return p.fabricant; })]).filter(function (v, i, a) { return a.indexOf(v) === i; });
  var puissances = PANNEAUX_CATALOGUE.map(function (p) { return p.puissance; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
  var annees = PANNEAUX_CATALOGUE.map(function (p) { return p.annee; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();

  function options(list, suffix) { return list.map(function (v) { return '<option value="' + v + '">' + v + (suffix || '') + '</option>'; }).join(''); }

  document.getElementById('filtres-panneaux').innerHTML =
    '<select id="f-fabricant" onchange="construireTableauPanneaux()"><option value="">Tous les fabricants</option>' + options(fabricants) + '</select>' +
    '<select id="f-puissance" onchange="construireTableauPanneaux()"><option value="">Toutes puissances</option>' + options(puissances, ' W') + '</select>' +
    '<select id="f-annee" onchange="construireTableauPanneaux()"><option value="">Toutes années</option>' + options(annees) + '</select>';
}

function construireTableauPanneaux() {
  if (!document.getElementById('f-fabricant')) construireFiltresPanneaux();
  var ff = (document.getElementById('f-fabricant') || {}).value || '';
  var fp = (document.getElementById('f-puissance') || {}).value || '';
  var fa = (document.getElementById('f-annee') || {}).value || '';

  var liste = PANNEAUX_CATALOGUE.filter(function (p) {
    return (!ff || p.fabricant === ff) && (!fp || String(p.puissance) === fp) && (!fa || String(p.annee) === fa);
  });

  var html = '<table class="w-table"><tr><th></th><th>Fabricant</th><th>Modèle</th><th>Puissance</th><th>Année</th><th>VOC (V)</th><th>Icc (A)</th><th>Vmp (V)</th><th>Imp (A)</th></tr>';
  liste.forEach(function (p) {
    var checked = ETAT.panneauChoisi && ETAT.panneauChoisi.id === p.id ? 'checked' : '';
    html += '<tr class="panneau-row' + (checked ? ' selected' : '') + '" id="row-' + p.id + '">' +
      '<td><input type="radio" name="panneauChoix" value="' + p.id + '" ' + checked + ' onchange="choisirPanneau(\'' + p.id + '\')"></td>' +
      '<td>' + p.fabricant + '</td><td>' + p.modele + '</td><td>' + p.puissance + ' W</td><td>' + p.annee + '</td>' +
      '<td>' + p.voc + '</td><td>' + p.icc + '</td><td>' + p.vmp + '</td><td>' + p.imp + '</td></tr>';
  });
  html += '</table>';
  document.getElementById('tableau-panneaux').innerHTML = html;
}

function choisirPanneau(id) {
  ETAT.panneauChoisi = PANNEAUX_CATALOGUE.filter(function (p) { return p.id === id; })[0];
  document.querySelectorAll('.panneau-row').forEach(function (r) { r.classList.remove('selected'); });
  document.getElementById('row-' + id).classList.add('selected');
}

function calculerNbPanneauxUI() {
  if (!ETAT.panneauChoisi) { alert('⚠️ Sélectionnez un panneau dans le tableau.'); return; }
  ETAT.NP = calculerNombrePanneaux(ETAT.Pc, ETAT.panneauChoisi.puissance);
  ETAT.Vsys = tensionSysteme(ETAT.Pc);
  document.getElementById('resultat-panneaux').innerHTML =
    '<table class="recap-table"><tr><td>Nombre de panneaux NP = Pc ÷ Pu</td><td><strong>' + ETAT.NP + ' panneaux de ' + ETAT.panneauChoisi.puissance + ' W</strong></td></tr>' +
    '<tr><td>Puissance installée</td><td><strong>' + ((ETAT.NP * ETAT.panneauChoisi.puissance) / 1000).toFixed(2) + ' kWc</strong></td></tr>' +
    '<tr><td>Tension du système (selon Pc)</td><td><strong>' + ETAT.Vsys + ' V</strong></td></tr></table>';
  document.getElementById('btn-vers-4').disabled = false;
}

// ---------------- ÉTAPE 4 : contrôleur + batteries ----------------
function onControleurChange() {
  ETAT.controleurType = document.querySelector('input[name="controleur"]:checked').value;
  document.getElementById('alerte-pwm').style.display = ETAT.controleurType === 'PWM' ? 'block' : 'none';
  ETAT.VmaxMPPT = parseFloat(document.getElementById('vmax-mppt').value) || 150;

  if (!ETAT.panneauChoisi || !ETAT.NP) return;
  var sp = calculerSeriesParalleles(ETAT.NP, ETAT.panneauChoisi.voc, ETAT.controleurType === 'PWM' ? ETAT.panneauChoisi.voc : ETAT.VmaxMPPT);
  ETAT.Ns = sp.Ns; ETAT.N = sp.N; ETAT.V_string = sp.V_string;

  var Ic = calculerIntensiteControleur(ETAT.N, ETAT.panneauChoisi.icc);
  ETAT.Ic = Ic;
  document.getElementById('resultat-paralleles').innerHTML =
    '<table class="recap-table">' +
    '<tr><td>Nombre de séries (Ns)</td><td><strong>' + ETAT.Ns + '</strong></td></tr>' +
    '<tr><td>Nombre de parallèles (N)</td><td><strong>' + ETAT.N + '</strong></td></tr>' +
    '<tr><td>Tension d\'une série (V1 = Ns × Voc)</td><td><strong>' + ETAT.V_string + ' V</strong></td></tr>' +
    '<tr><td>Intensité du contrôleur Ic = K × N × Isc</td><td><strong>' + Ic.normalise + ' A</strong> (calculé : ' + Ic.brut + ' A)</td></tr></table>';
}

function construireFiltresBatteries() {
  var types = BATTERIES_CATALOGUE.map(function (b) { return b.type; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
  var capacites = BATTERIES_CATALOGUE.map(function (b) { return b.capacite; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });

  document.getElementById('filtres-batteries').innerHTML =
    '<select id="fb-type" onchange="construireTableauBatteries()"><option value="">Tous les types</option>' +
    types.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') + '</select>' +
    '<select id="fb-capacite" onchange="construireTableauBatteries()"><option value="">Toutes capacités</option>' +
    capacites.map(function (c) { return '<option value="' + c + '">' + c + ' Ah</option>'; }).join('') + '</select>';
}

function construireTableauBatteries() {
  if (!document.getElementById('fb-type')) construireFiltresBatteries();
  var ft = (document.getElementById('fb-type') || {}).value || '';
  var fc = (document.getElementById('fb-capacite') || {}).value || '';

  var liste = BATTERIES_CATALOGUE.filter(function (b) { return (!ft || b.type === ft) && (!fc || String(b.capacite) === fc); });
  if (!ETAT.batterieChoisie) {
    var defaut = BATTERIES_CATALOGUE.filter(function (b) { return b.type === 'Lithium-LiFePO4'; })[0];
    ETAT.batterieChoisie = defaut;
  }

  var html = '<table class="w-table"><tr><th></th><th>Type de batterie</th><th>Capacité unitaire</th><th>Taux de décharge (TD)</th></tr>';
  liste.forEach(function (b) {
    var checked = ETAT.batterieChoisie && ETAT.batterieChoisie.id === b.id ? 'checked' : '';
    html += '<tr class="batterie-row' + (checked ? ' selected' : '') + '" id="brow-' + b.id + '">' +
      '<td><input type="radio" name="batterieChoix" value="' + b.id + '" ' + checked + ' onchange="choisirBatterie(\'' + b.id + '\')"></td>' +
      '<td>' + b.type + '</td><td>' + b.capacite + ' Ah</td><td>' + (TD_BATTERIE[b.type] * 100) + ' %</td></tr>';
  });
  html += '</table>';
  document.getElementById('tableau-batteries').innerHTML = html;
}

function choisirBatterie(id) {
  ETAT.batterieChoisie = BATTERIES_CATALOGUE.filter(function (b) { return b.id === id; })[0];
  document.querySelectorAll('.batterie-row').forEach(function (r) { r.classList.remove('selected'); });
  document.getElementById('brow-' + id).classList.add('selected');
}

function calculerNbBatteriesUI() {
  if (!ETAT.batterieChoisie) { alert('⚠️ Sélectionnez un type de batterie.'); return; }
  var joursAuto = parseFloat(document.getElementById('jours-autonomie').value) || 1;
  var TD = TD_BATTERIE[ETAT.batterieChoisie.type];
  ETAT.Cb = calculerCapaciteBatterie(ETAT.Ej, joursAuto, ETAT.Vsys, TD);
  ETAT.Nb = calculerNombreBatteries(ETAT.Cb, ETAT.batterieChoisie.capacite);
  ETAT.joursAuto = joursAuto;

  var Cb_kWh_total = (ETAT.Nb * ETAT.batterieChoisie.capacite * ETAT.Vsys / 1000);
  document.getElementById('resultat-batteries').innerHTML =
    '<table class="recap-table">' +
    '<tr><td>Capacité de batterie nécessaire (Cb)</td><td><strong>' + ETAT.Cb.toFixed(1) + ' Ah</strong></td></tr>' +
    '<tr><td>Nombre de batteries Nb = Cb ÷ Cu</td><td><strong>' + ETAT.Nb + ' batterie(s) de ' + ETAT.batterieChoisie.capacite + ' Ah / ' + ETAT.Vsys + ' V</strong></td></tr>' +
    '<tr><td>Capacité totale installée</td><td><strong>' + Cb_kWh_total.toFixed(2) + ' kWh</strong> (à comparer à Ej = ' + (ETAT.Ej / 1000).toFixed(2) + ' kWh)</td></tr></table>';
  document.getElementById('btn-vers-5').disabled = false;
}

// ---------------- ÉTAPE 5 : validation & analyse IA ----------------
function onLogoChange(e) {
  var f = e.target.files[0];
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function (ev) {
    ETAT.logoDataUrl = ev.target.result;
    document.getElementById('logo-apercu').innerHTML = '<img src="' + ev.target.result + '" style="max-height:70px;margin-top:8px;border-radius:8px;">';
  };
  reader.readAsDataURL(f);
}

function validerEtLancerAnalyseIA() {
  var ia = document.getElementById('ia-results');
  ia.innerHTML = '<div class="ia-loading">⚡ PULSAR-AI assemble votre dossier de dimensionnement...</div>';
  ia.scrollIntoView({ behavior: 'smooth' });

  setTimeout(function () {
    var input = {
      equipements: ETAT.equipements,
      IR: ETAT.IR,
      joursAutonomie: ETAT.joursAuto || 1,
      panneau: ETAT.panneauChoisi,
      Vmax_MPPT: ETAT.controleurType === 'PWM' ? ETAT.panneauChoisi.voc : ETAT.VmaxMPPT,
      typeControleur: ETAT.controleurType,
      batterie: ETAT.batterieChoisie,
      L1: 30, L2: 1, L3: 30 // longueurs max des plages, conformément à la consigne
    };
    var r = calculDimensionnementComplet(input);
    ETAT.resultatFinal = r;
    ia.innerHTML = construireRapportHTML(r);

    var ville = getVilleSelectionnee();
    setTimeout(function () {
      dessiner3DPro('rapport-3d', {
        nbPanneaux: r.NP, Ns: r.Ns, N: r.N,
        inclinaisonDeg: (ville && ville.data.inclinaison) || 8,
        ville: { nom: (ville && ville.nom) || 'Lomé', hsp: r.IR, lat: ville && ville.data.lat },
        kWc: ((r.NP * r.panneau.puissance) / 1000).toFixed(2)
      });
    }, 300);

    document.getElementById('btn-pdf').style.display = 'inline-block';
  }, 600);
}

function construireRapportHTML(r) {
  var b = r.bilan;
  var kWc = ((r.NP * r.panneau.puissance) / 1000).toFixed(2);
  var E_besoin_kWh = (b.E_total / 1000).toFixed(2);
  var E_produite_kWh = (r.E_produite_Wh / 1000).toFixed(2);
  var ecart = (r.E_produite_Wh - b.E_total) >= 0 ? 'Excédentaire ✅' : 'Insuffisante ⚠️';

  var html = '<div class="ia-container">' +
    '<div class="ia-header"><span class="ia-logo">⚡</span><div>' +
    '<h2>Rapport PULSAR-AI — Dimensionnement Solaire Domestique</h2>' +
    '<span class="ia-subtitle">📍 IR ' + r.IR + ' kWh/m²/j · Méthode conforme à la formation FES12</span>' +
    '</div></div>';

  // 1. Tableau appareils
  html += '<div class="ia-bloc ia-calcul"><h3>① Tableau de renseignement des appareils</h3><div class="ia-contenu">' +
    '<table class="recap-table"><tr><th>Appareil</th><th>Nombre</th><th>PU (W)</th><th>Temps (h)</th><th>PT (W)</th><th>Énergie (Wh)</th></tr>';
  b.lignes.forEach(function (l) {
    html += '<tr><td>' + l.nom + '</td><td>' + l.nombre + '</td><td>' + l.pu + '</td><td>' + l.heures + '</td><td>' + l.PT.toFixed(0) + '</td><td>' + l.E.toFixed(0) + '</td></tr>';
  });
  html += '<tr style="font-weight:700;"><td colspan="4">TOTAL</td><td>PT = ' + b.PT_total.toFixed(0) + ' W</td><td>E = ' + b.E_total.toFixed(0) + ' Wh</td></tr></table>' +
    '<p>Énergie journalière : Ej = 1,2 × E = <strong>' + r.Ej.toFixed(1) + ' Wh</strong><br>' +
    'Puissance crête : Pc = Ej ÷ (η ondu × η rég × RP × IR) = <strong>' + r.Pc.toFixed(0) + ' Wc</strong></p></div></div>';

  // 2. Classement
  html += '<div class="ia-bloc"><h3>② Classement des appareils</h3><div class="ia-contenu">' +
    '<p><strong>Classiques :</strong> ' + (b.classiques.map(function (l) { return l.nom; }).join(', ') || '—') + '</p>' +
    '<p><strong>Inductifs (démarrage) :</strong> ' + (b.inductifs.map(function (l) { return l.nom; }).join(', ') || '—') + '</p></div></div>';

  // 3. Heures d'utilisation (grille 24h)
  html += '<div class="ia-bloc"><h3>③ Heures d\'utilisation des appareils</h3><div class="ia-contenu">';
  ETAT.equipements.forEach(function (eq, idx) {
    var boxes = document.querySelectorAll('input[data-idx="' + idx + '"]:checked');
    var heuresOn = Array.prototype.map.call(boxes, function (c) { return parseInt(c.getAttribute('data-h')); });
    var spans = '';
    for (var h = 0; h < 24; h++) spans += '<span class="' + (heuresOn.indexOf(h) !== -1 ? 'on' : 'off') + '"></span>';
    html += '<p style="margin-bottom:2px;font-size:.82rem;"><strong>' + eq.nom + '</strong> (' + eq.heures + ' h/j)</p><div class="grille24-mini">' + spans + '</div>';
  });
  html += '</div></div>';

  // 4. Tableau panneaux
  html += '<div class="ia-bloc ia-decision"><h3>④ Panneaux solaires sélectionnés</h3><div class="ia-contenu">' +
    '<table class="recap-table"><tr><th>Fabricant</th><th>Modèle</th><th>Puissance</th><th>VOC</th><th>Icc</th><th>Quantité</th></tr>' +
    '<tr><td>' + r.panneau.fabricant + '</td><td>' + r.panneau.modele + '</td><td>' + r.panneau.puissance + ' W</td><td>' + r.panneau.voc + ' V</td><td>' + r.panneau.icc + ' A</td><td>' + r.NP + '</td></tr></table>' +
    '<p>Puissance installée : <strong>' + kWc + ' kWc</strong> · Tension du système : <strong>' + r.Vsys + ' V</strong> · Montage : <strong>' + r.Ns + ' séries × ' + r.N + ' parallèles</strong> · Contrôleur : <strong>' + ETAT.controleurType + '</strong></p></div></div>';

  // 5. Tableau batteries
  html += '<div class="ia-bloc ia-decision"><h3>⑤ Batteries sélectionnées</h3><div class="ia-contenu">' +
    '<table class="recap-table"><tr><th>Type</th><th>Capacité unitaire</th><th>TD</th><th>Quantité</th><th>Capacité totale</th></tr>' +
    '<tr><td>' + r.batterie.type + '</td><td>' + r.batterie.capacite + ' Ah</td><td>' + (r.TD * 100) + ' %</td><td>' + r.Nb + '</td><td>' + (r.Cb_Wh_total / 1000).toFixed(2) + ' kWh</td></tr></table>' +
    '<p>Autonomie visée : <strong>' + r.joursAuto + ' jour(s)</strong> · Capacité calculée Cb = <strong>' + r.Cb.toFixed(1) + ' Ah</strong></p></div></div>';

  // 6. Comparaison énergie produite / besoin
  html += '<div class="ia-bloc"><h3>⑥ Énergie produite vs besoin du client</h3><div class="ia-contenu">' +
    '<table class="recap-table"><tr><th>Besoin quotidien du client (E)</th><th>Énergie produite estimée</th><th>Bilan</th></tr>' +
    '<tr><td>' + E_besoin_kWh + ' kWh/j</td><td>' + E_produite_kWh + ' kWh/j</td><td>' + ecart + '</td></tr></table></div></div>';

  // 7. Sections de câble
  html += '<div class="ia-bloc ia-cablage"><h3>⑦ Sections de câble</h3><div class="ia-contenu">' +
    '<table class="recap-table"><tr><th>Tronçon</th><th>Longueur (max)</th><th>Intensité</th><th>Tension réf.</th><th>Calculé</th><th>Section retenue</th></tr>' +
    '<tr><td>S1 — Panneaux → régulateur</td><td>' + r.L1 + ' m</td><td>' + r.I1 + ' A</td><td>' + r.V1 + ' V</td><td>' + r.S1.S_calc + ' mm²</td><td><strong>' + r.S1.S_normalise + ' mm²</strong></td></tr>' +
    '<tr><td>S2 — Batteries → régulateur</td><td>' + r.L2 + ' m</td><td>' + r.I2.toFixed(1) + ' A</td><td>' + r.V2 + ' V</td><td>' + r.S2.S_calc + ' mm²</td><td><strong>' + r.S2.S_normalise + ' mm²</strong></td></tr>' +
    '<tr><td>S3 — Convertisseur → sortie</td><td>' + r.L3 + ' m</td><td>' + r.I3.toFixed(1) + ' A</td><td>' + r.V3 + ' V</td><td>' + r.S3.S_calc + ' mm²</td><td><strong>' + r.S3.S_normalise + ' mm²</strong></td></tr></table></div></div>';

  // 8. Disjoncteurs
  html += '<div class="ia-bloc ia-cablage"><h3>⑧ Disjoncteurs / Protections</h3><div class="ia-contenu">' +
    '<table class="recap-table"><tr><th>Position</th><th>Tension nominale</th><th>Calibre</th></tr>' +
    '<tr><td>D1 — Côté panneaux</td><td>' + r.D1.V + ' V</td><td>' + r.D1.I + ' A</td></tr>' +
    '<tr><td>D2 — Côté batteries</td><td>' + r.D2.V + ' V</td><td>' + r.D2.I + ' A</td></tr>' +
    '<tr><td>D3 — Côté sortie AC</td><td>' + r.D3.V + ' V</td><td>' + r.D3.I + ' A</td></tr></table>' +
    '<p>Convertisseur : Pconv = K × PT = <strong>' + r.Pconv.normalise + ' W</strong> (calculé : ' + r.Pconv.brut + ' W)</p></div></div>';

  // 9. Message motivant
  html += '<div class="ia-bloc ia-motivant"><h3>🌟 Message PULSAR-AI</h3><div class="ia-contenu">' +
    '<p>🌟 Votre installation de <strong>' + kWc + ' kWc</strong> couvre vos besoins quotidiens de <strong>' + E_besoin_kWh + ' kWh</strong> avec <strong>' + r.Nb + ' batterie(s)</strong> pour ' + r.joursAuto + ' jour(s) d\'autonomie.</p>' +
    '<p>⚡ PULSAR ECO GROUP installe et garantit votre système solaire partout au Togo et en Afrique de l\'Ouest.</p></div></div>';

  // 10. Bloc 3D
  html += '<div class="ia-bloc ia-3d-bloc"><h3>🏗️ Conception 3D — ' + r.NP + ' panneau' + (r.NP > 1 ? 'x' : '') + ' solaire' + (r.NP > 1 ? 's' : '') + '</h3>' +
    '<div id="rapport-3d-3d" class="scene3d-wrap"></div></div>';

  html += '</div>';
  return html;
}

// ---------------- Export PDF ----------------
function genererPDF() {
  if (!ETAT.resultatFinal) { alert('Lancez d\'abord l\'analyse IA.'); return; }
  var r = ETAT.resultatFinal, b = r.bilan;
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF();
  var qn = 'PEG-' + Date.now();
  var y = 20;

  function ligne(txt, size, gras) {
    doc.setFontSize(size || 10);
    doc.setFont(undefined, gras ? 'bold' : 'normal');
    doc.text(String(txt), 15, y);
    y += (size || 10) * 0.55 + 2;
    if (y > 280) { doc.addPage(); y = 20; }
  }
  function tableauSimple(titre, entetes, lignes) {
    ligne(titre, 12, true);
    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    doc.text(entetes.join('   |   '), 15, y); y += 6;
    doc.setFont(undefined, 'normal');
    lignes.forEach(function (l) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(l.join('   |   '), 15, y); y += 5.5;
    });
    y += 4;
  }

  // En-tête avec logo
  try {
    var logo = ETAT.logoDataUrl || document.getElementById('logo').src;
    doc.addImage(logo, 'JPEG', 15, 10, 22, 22);
  } catch (e) {}
  doc.setFontSize(16); doc.setFont(undefined, 'bold');
  doc.text('PULSAR ECO GROUP — Rapport de Dimensionnement Solaire', 42, 18);
  doc.setFontSize(10); doc.setFont(undefined, 'normal');
  doc.text('N° ' + qn + '  ·  Date : ' + new Date().toLocaleDateString('fr-FR'), 42, 25);
  var ville = getVilleSelectionnee();
  if (ville) doc.text('Ville : ' + ville.nom + ' (IR = ' + r.IR + ' kWh/m²/j)', 42, 31);
  y = 40;
  doc.setLineWidth(0.3); doc.line(15, y, 195, y); y += 8;

  tableauSimple('① Tableau des appareils', ['Appareil', 'Nb', 'PU(W)', 'H', 'PT(W)', 'E(Wh)'],
    b.lignes.map(function (l) { return [l.nom, l.nombre, l.pu, l.heures, l.PT.toFixed(0), l.E.toFixed(0)]; }));
  ligne('TOTAL : PT = ' + b.PT_total.toFixed(0) + ' W   |   E = ' + b.E_total.toFixed(0) + ' Wh', 10, true);
  ligne('Ej = 1,2 × E = ' + r.Ej.toFixed(1) + ' Wh   |   Pc = ' + r.Pc.toFixed(0) + ' Wc', 10);
  y += 4;

  ligne('② Classement : Classiques = ' + (b.classiques.map(function (l) { return l.nom; }).join(', ') || '—'), 10);
  ligne('Inductifs = ' + (b.inductifs.map(function (l) { return l.nom; }).join(', ') || '—'), 10);
  y += 4;

  tableauSimple('④ Panneaux retenus', ['Fabricant', 'Modèle', 'P(W)', 'VOC', 'Icc', 'Qté'],
    [[r.panneau.fabricant, r.panneau.modele, r.panneau.puissance, r.panneau.voc, r.panneau.icc, r.NP]]);
  ligne('Installé : ' + ((r.NP * r.panneau.puissance) / 1000).toFixed(2) + ' kWc | Système ' + r.Vsys + ' V | ' + r.Ns + ' séries x ' + r.N + ' parallèles', 10);
  y += 4;

  tableauSimple('⑤ Batteries retenues', ['Type', 'Cap.(Ah)', 'TD', 'Qté', 'Total(kWh)'],
    [[r.batterie.type, r.batterie.capacite, (r.TD * 100) + '%', r.Nb, (r.Cb_Wh_total / 1000).toFixed(2)]]);
  y += 2;

  tableauSimple('⑦ Sections de câble', ['Tronçon', 'L(m)', 'I(A)', 'V(V)', 'Calculé', 'Retenu'],
    [
      ['S1 Panneaux->régulateur', r.L1, r.I1, r.V1, r.S1.S_calc + 'mm²', r.S1.S_normalise + 'mm²'],
      ['S2 Batteries->régulateur', r.L2, r.I2.toFixed(1), r.V2, r.S2.S_calc + 'mm²', r.S2.S_normalise + 'mm²'],
      ['S3 Convertisseur->sortie', r.L3, r.I3.toFixed(1), r.V3, r.S3.S_calc + 'mm²', r.S3.S_normalise + 'mm²']
    ]);

  tableauSimple('⑧ Disjoncteurs', ['Position', 'V(V)', 'I(A)'],
    [['D1 Panneaux', r.D1.V, r.D1.I], ['D2 Batteries', r.D2.V, r.D2.I], ['D3 Sortie AC', r.D3.V, r.D3.I]]);
  ligne('Convertisseur : Pconv = ' + r.Pconv.normalise + ' W', 10, true);

  // Image 3D
  var img3d = capturerScene3D('rapport-3d');
  if (img3d) {
    if (y > 200) { doc.addPage(); y = 20; }
    ligne('🏗️ Conception 3D', 12, true);
    try { doc.addImage(img3d, 'PNG', 15, y, 180, 90); y += 96; } catch (e) {}
  }

  doc.setFontSize(8); doc.setTextColor(100);
  doc.text('PULSAR ECO GROUP · pulsarecogroup@gmail.com · Lomé, Togo · Tél: +228 92196727 / 90104393', 15, 292);

  doc.save('Rapport_Solaire_' + qn + '.pdf');
}
