// ================================================================
//  PULSAR ECO GROUP — PARCOURS PARTAGÉ v10
//  Chaque page module (menage-v10.html, agri-v10.html,
//  entreprise-v10.html) définit un objet WIZARD_CONFIG avant de
//  charger ce fichier :
//    WIZARD_CONFIG = {
//      nomModule: 'Ménage', panneauDefautId: 'p1', batterieDefautId: 'b1'
//    }
// ================================================================
var ETAT = {
  equipements: [],
  bilan: null, Ej: 0, Pc: 0, IR: 5.2,
  heureLever: 6, heureCoucher: 18,
  panneauChoisi: null, NP: 0, Ns: 1, N: 1, Vsys: 48,
  controleurType: 'MPPT', VmaxMPPT: 150,
  batterieChoisie: null, Cb: 0, Nb: 0, joursAuto: 1, reserveNuageuse: 0.20,
  logoDataUrl: null, nomEntreprise: '',
  resultatFinal: null
};

// ---------------- ÉTAPE 1 : tableau appareils ----------------
function addRow() {
  var t = document.getElementById('equipmentTable');
  var r = t.insertRow();
  r.innerHTML =
    '<td><input type="text" placeholder="Ex: Pompe immergée" oninput="verifierEtape1()"></td>' +
    '<td><input type="number" placeholder="750" min="0" oninput="verifierEtape1()"></td>' +
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

// ---------------- Navigation ----------------
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

// ---------------- ÉTAPE 2 : bande 24h (jour/nuit visible) ----------------
function construireBande24h() {
  var t = document.getElementById('equipmentTable');
  var cont = document.getElementById('bande24h-container');
  cont.innerHTML = '';
  ETAT.equipements = [];

  var hl = parseInt(document.getElementById('heure-lever').value) || 6;
  var hc = parseInt(document.getElementById('heure-coucher').value) || 18;
  ETAT.heureLever = hl; ETAT.heureCoucher = hc;

  for (var i = 1; i < t.rows.length; i++) {
    var c = t.rows[i].cells;
    var nom = c[0].children[0].value, pu = parseFloat(c[1].children[0].value), nombre = parseFloat(c[2].children[0].value);
    if (!nom || !(pu > 0) || !(nombre > 0)) continue;
    var idx = ETAT.equipements.length;
    ETAT.equipements.push({ nom: nom, pu: pu, nombre: nombre, heuresActives: new Array(24).fill(false) });

    var coeffInfo = trouverCoeffDemarrage(nom);
    var badge = coeffInfo ? ' <span style="color:#e65100;font-weight:700;">(inductif ×' + coeffInfo.coeff + ')</span>' : '';

    var bloc = document.createElement('div');
    bloc.className = 'bande24h-appareil';
    var cases = '';
    for (var h = 0; h < 24; h++) {
      var estJour = (h >= hl && h < hc);
      cases += '<div class="bande24h-case ' + (estJour ? 'jour' : 'nuit') + '"><label>' + h + 'h</label>' +
        '<input type="checkbox" data-idx="' + idx + '" data-h="' + h + '" onchange="majCompteurHeures(' + idx + ')"></div>';
    }
    bloc.innerHTML =
      '<div class="bande24h-titre"><span>' + nom + ' (' + pu + ' W × ' + nombre + ')' + badge + '</span>' +
      '<span class="bande24h-compteur" id="compteur-' + idx + '">0 h/jour</span></div>' +
      '<div class="bande24h-grille">' + cases + '</div>';
    cont.appendChild(bloc);
  }
  document.getElementById('predim-resultats').innerHTML = '';
  document.getElementById('nav-vers-3').style.display = 'none';
}

function majCompteurHeures(idx) {
  var boxes = document.querySelectorAll('input[data-idx="' + idx + '"]');
  var n = 0;
  boxes.forEach(function (b) {
    var h = parseInt(b.getAttribute('data-h'));
    ETAT.equipements[idx].heuresActives[h] = b.checked;
    if (b.checked) n++;
  });
  document.getElementById('compteur-' + idx).textContent = n + ' h/jour';
}

// ---------------- Lancer le prédimensionnement ----------------
function lancerPredimensionnement() {
  var manquants = ETAT.equipements.filter(function (eq) { return eq.heuresActives.every(function (h) { return !h; }); });
  if (manquants.length) {
    if (!confirm('⚠️ ' + manquants.length + ' appareil(s) n\'ont aucune heure cochée. Continuer quand même ?')) return;
  }

  ETAT.bilan = calculerBilanV10(ETAT.equipements, ETAT.heureLever, ETAT.heureCoucher);
  ETAT.Ej = calculerEnergieJournaliere(ETAT.bilan.E_total);
  ETAT.Pc = calculerPuissanceCrete(ETAT.Ej, ETAT.IR);

  var b = ETAT.bilan;
  var html = '';

  html += '<table class="recap-table"><caption style="font-weight:700;color:#0d2244;">Classement des appareils</caption>' +
    '<tr><th>Classiques</th><th>Inductifs (avec coefficient)</th></tr>' +
    '<tr><td>' + (b.classiques.map(function (l) { return l.nom; }).join(', ') || '—') + '</td>' +
    '<td>' + (b.inductifs.map(function (l) { return l.nom + ' (×' + l.coeff + ')'; }).join(', ') || '—') + '</td></tr></table>';

  html += '<table class="recap-table"><caption style="font-weight:700;color:#0d2244;">Bilan jour / nuit</caption>' +
    '<tr><th>Appareil</th><th>Heures/j</th><th>Jour (Wh)</th><th>Nuit (Wh)</th><th>PT (W)</th></tr>';
  b.lignes.forEach(function (l) {
    html += '<tr><td>' + l.nom + '</td><td>' + l.heures + '</td><td>' + l.E_jour.toFixed(0) + '</td><td>' + l.E_nuit.toFixed(0) + '</td><td>' + l.PT.toFixed(0) + '</td></tr>';
  });
  html += '<tr style="font-weight:700;background:#e3f2fd;"><td>TOTAL</td><td></td><td>' + b.E_jour_total.toFixed(0) + '</td><td>' + b.E_nuit_total.toFixed(0) + '</td><td>' + b.PT_total.toFixed(0) + '</td></tr></table>';

  html += '<table class="recap-table">' +
    '<tr><td>Énergie totale E</td><td><strong>' + b.E_total.toFixed(0) + ' Wh</strong></td></tr>' +
    '<tr><td>Énergie journalière Ej = 1,2 × E</td><td><strong>' + ETAT.Ej.toFixed(1) + ' Wh</strong></td></tr>' +
    '<tr><td>Puissance crête Pc</td><td><strong>' + ETAT.Pc.toFixed(0) + ' Wc</strong></td></tr>' +
    '<tr><td>Pointe de démarrage (heure ' + b.heure_pointe + 'h)</td><td><strong>' + b.P_pointe_max.toFixed(0) + ' W</strong></td></tr></table>';

  document.getElementById('predim-resultats').innerHTML = html;
  document.getElementById('nav-vers-3').style.display = 'flex';
}

// ---------------- ÉTAPE 3 : panneaux ----------------
function construireFiltresPanneaux() {
  var fabricants = PANNEAUX_CATALOGUE.map(function (p) { return p.fabricant; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
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

  if (!ETAT.panneauChoisi && WIZARD_CONFIG.panneauDefautId) {
    ETAT.panneauChoisi = PANNEAUX_CATALOGUE.filter(function (p) { return p.id === WIZARD_CONFIG.panneauDefautId; })[0] || null;
  }

  var html = '<table class="w-table"><tr><th></th><th>Fabricant</th><th>Modèle</th><th>Puissance</th><th>Année</th><th>VOC (V)</th><th>Icc (A)</th></tr>';
  liste.forEach(function (p) {
    var checked = ETAT.panneauChoisi && ETAT.panneauChoisi.id === p.id ? 'checked' : '';
    html += '<tr class="panneau-row' + (checked ? ' selected' : '') + '" id="row-' + p.id + '">' +
      '<td><input type="radio" name="panneauChoix" value="' + p.id + '" ' + checked + ' onchange="choisirPanneau(\'' + p.id + '\')"></td>' +
      '<td>' + p.fabricant + '</td><td>' + p.modele + '</td><td>' + p.puissance + ' W</td><td>' + p.annee + '</td>' +
      '<td>' + p.voc + '</td><td>' + p.icc + '</td></tr>';
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
    '<tr><td>Tension du système</td><td><strong>' + ETAT.Vsys + ' V</strong></td></tr></table>';
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

  var Ic = calculerIntensiteControleur(sp.N, ETAT.panneauChoisi.icc);
  document.getElementById('resultat-paralleles').innerHTML =
    '<table class="recap-table">' +
    '<tr><td>Séries (Ns) — on privilégie les séries longues</td><td><strong>' + ETAT.Ns + '</strong></td></tr>' +
    '<tr><td>Parallèles (N)</td><td><strong>' + ETAT.N + '</strong></td></tr>' +
    '<tr><td>Tension d\'une série (V1)</td><td><strong>' + ETAT.V_string + ' V</strong></td></tr>' +
    '<tr><td>Intensité du contrôleur</td><td><strong>' + Ic.normalise + ' A</strong> (calculé : ' + Ic.brut + ' A)</td></tr></table>';
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
    ETAT.batterieChoisie = BATTERIES_CATALOGUE.filter(function (b) { return b.id === WIZARD_CONFIG.batterieDefautId; })[0] ||
      BATTERIES_CATALOGUE.filter(function (b) { return b.type === 'Lithium-LiFePO4'; })[0];
  }

  var html = '<table class="w-table"><tr><th></th><th>Type de batterie</th><th>Capacité unitaire</th><th>Taux de décharge</th></tr>';
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
  ETAT.joursAuto = parseFloat(document.getElementById('jours-autonomie').value) || 1;
  ETAT.reserveNuageuse = (parseFloat(document.getElementById('reserve-nuageuse').value) || 20) / 100;
  var TD = TD_BATTERIE[ETAT.batterieChoisie.type];
  ETAT.Cb = calculerCapaciteBatterie(ETAT.bilan.E_nuit_total, ETAT.bilan.E_jour_total, ETAT.joursAuto, ETAT.Vsys, TD, ETAT.reserveNuageuse);
  ETAT.Nb = calculerNombreBatteries(ETAT.Cb, ETAT.batterieChoisie.capacite);

  var Cb_kWh_total = (ETAT.Nb * ETAT.batterieChoisie.capacite * ETAT.Vsys / 1000);
  document.getElementById('resultat-batteries').innerHTML =
    '<table class="recap-table">' +
    '<tr><td>Besoin de nuit + réserve nuageuse</td><td><strong>' + (ETAT.bilan.E_nuit_total + ETAT.reserveNuageuse * ETAT.bilan.E_jour_total).toFixed(0) + ' Wh</strong></td></tr>' +
    '<tr><td>Capacité de batterie nécessaire (Cb)</td><td><strong>' + ETAT.Cb.toFixed(1) + ' Ah</strong></td></tr>' +
    '<tr><td>Nombre de batteries</td><td><strong>' + ETAT.Nb + ' × ' + ETAT.batterieChoisie.capacite + ' Ah / ' + ETAT.Vsys + ' V</strong></td></tr>' +
    '<tr><td>Capacité totale installée</td><td><strong>' + Cb_kWh_total.toFixed(2) + ' kWh</strong></td></tr></table>';
  document.getElementById('btn-vers-5').disabled = false;
}

// ---------------- ÉTAPE 5 : marque blanche + validation ----------------
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
  ETAT.nomEntreprise = (document.getElementById('nom-entreprise').value || '').trim();
  var ia = document.getElementById('ia-results');
  ia.innerHTML = '<div class="ia-loading">⚡ PULSAR-AI assemble votre dossier de dimensionnement...</div>';
  ia.scrollIntoView({ behavior: 'smooth' });

  setTimeout(function () {
    var input = {
      equipements: ETAT.equipements,
      IR: ETAT.IR,
      joursAutonomie: ETAT.joursAuto,
      heureLever: ETAT.heureLever, heureCoucher: ETAT.heureCoucher,
      reserveNuageuse: ETAT.reserveNuageuse,
      panneau: ETAT.panneauChoisi,
      Vmax_MPPT: ETAT.controleurType === 'PWM' ? ETAT.panneauChoisi.voc : ETAT.VmaxMPPT,
      typeControleur: ETAT.controleurType,
      batterie: ETAT.batterieChoisie,
      L1: 30, L2: 1, L3: 30
    };
    var r = calculDimensionnementComplet(input);
    ETAT.resultatFinal = r;

    var ville = getVilleSelectionnee();
    var contexte = {
      nomModule: WIZARD_CONFIG.nomModule,
      ville: ville ? { nom: ville.nom } : null,
      controleurType: ETAT.controleurType,
      marque: { nom: ETAT.nomEntreprise, logoDataUrl: ETAT.logoDataUrl },
      prefixeRef: WIZARD_CONFIG.prefixeRef || 'PEG'
    };
    ETAT.sectionsRapport = construireSectionsRapport(r, contexte);
    ETAT.contexteRapport = contexte;

    ia.innerHTML = rendreRapportHTML(ETAT.sectionsRapport, contexte);

    setTimeout(function () {
      dessiner3DBlocs('rapport-3d', {
        Ns: r.Ns, N: r.N,
        inclinaisonDeg: (ville && ville.data.inclinaison) || 8,
        kWc: ((r.NP * r.panneau.puissance) / 1000).toFixed(2),
        ville: { nom: (ville && ville.nom) || '' }
      });
    }, 250);

    document.getElementById('btn-pdf').style.display = 'inline-block';
  }, 500);
}

function genererPDF() {
  if (!ETAT.sectionsRapport) { alert('Lancez d\'abord l\'analyse IA.'); return; }
  genererPDFDepuisSections(ETAT.sectionsRapport, ETAT.contexteRapport);
}
