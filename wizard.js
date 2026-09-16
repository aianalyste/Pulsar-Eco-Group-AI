// ================================================================
//  PULSAR ECO GROUP — PARCOURS COMPLET
//  6 étapes : Ville+Appareils -> Heures (2 bandes Jour/Nuit) -> Panneaux
//             -> Onduleur -> Batteries -> Validation
// ================================================================
var ETAT = {
  equipements: [],
  bilan: null, Ej: 0, Pc: 0, IR: 5.2,
  heureLever: 6, heureCoucher: 18,
  panneauChoisi: null, NP: 0, Ns: 1, N: 1, Vsys: 48,
  controleurType: 'MPPT', VmaxMPPT: 150,
  onduleurChoisi: null,
  batterieChoisie: null, Cb: 0, Nb: 0, joursAuto: 1,
  logoDataUrl: null, nomEntreprise: '',
  resultatFinal: null,
  projetId: null, projetNom: null
};

if (typeof firebaseConfig !== 'undefined') initFirebase();
if (firebaseEstConfigure()) {
  chargerCataloguesPartages(); // catalogues communs à tous les utilisateurs (Firestore)
} else {
  chargerCataloguesPersonnalises(); // repli local si Firebase non configuré
}

// ================================================================
//  AUTHENTIFICATION
// ================================================================
function afficherEcranAuth() {
  document.getElementById('ecran-auth').style.display = 'block';
  document.getElementById('ecran-mesprojets').style.display = 'none';
  document.getElementById('ecran-wizard').style.display = 'none';
}

function soumettreAuth(mode) {
  var email = document.getElementById('auth-email').value.trim();
  var mdp = document.getElementById('auth-mdp').value;
  var msg = document.getElementById('auth-message');
  msg.textContent = '';
  if (!email || !mdp) { msg.textContent = 'Renseignez un email et un mot de passe.'; return; }
  if (!firebaseEstConfigure()) { msg.textContent = '⚠️ Le système de comptes n\'est pas encore configuré.'; return; }

  var action = mode === 'inscription' ? creerCompte(email, mdp) : seConnecter(email, mdp);
  action.then(function () { afficherEcranMesProjets(); })
    .catch(function (err) { msg.textContent = traduireErreurFirebase(err); });
}

function traduireErreurFirebase(err) {
  var m = {
    'auth/email-already-in-use': 'Cet email a déjà un compte. Connectez-vous plutôt.',
    'auth/invalid-email': 'Adresse email invalide.',
    'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
    'auth/user-not-found': 'Aucun compte avec cet email.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/invalid-login-credentials': 'Email ou mot de passe incorrect, ou compte inexistant (cliquez "Créer un compte").'
  };
  return m[err.code] || ('Erreur : ' + err.message);
}

function deconnexion() { seDeconnecter().then(afficherEcranAuth); }

// ================================================================
//  MES PROJETS
// ================================================================
function afficherEcranMesProjets() {
  document.getElementById('ecran-auth').style.display = 'none';
  document.getElementById('ecran-mesprojets').style.display = 'block';
  document.getElementById('ecran-wizard').style.display = 'none';
  document.getElementById('mp-email').textContent = utilisateurActuel().email;

  listerMesProjets().then(function (liste) {
    var cont = document.getElementById('liste-projets');
    if (!liste.length) { cont.innerHTML = '<p class="w-hint">Aucun projet pour l\'instant. Créez-en un ci-dessous.</p>'; return; }
    cont.innerHTML = liste.map(function (p) {
      var date = p.dateMaj && p.dateMaj.toDate ? p.dateMaj.toDate().toLocaleDateString('fr-FR') : '';
      return '<div class="projet-carte">' +
        '<div><strong>' + p.nomProjet + '</strong><br><span class="w-hint">' + p.typeModule + ' · maj ' + date + '</span></div>' +
        '<div class="projet-actions">' +
        '<button onclick="ouvrirProjet(\'' + p.id + '\')">Ouvrir</button>' +
        '<button onclick="dupliquerProjetUI(\'' + p.id + '\')">Dupliquer</button>' +
        '<button onclick="renommerProjetUI(\'' + p.id + '\', \'' + p.nomProjet.replace(/'/g, "\\'") + '\')">Renommer</button>' +
        '<button onclick="supprimerProjetUI(\'' + p.id + '\')" class="del-btn">Supprimer</button>' +
        '</div></div>';
    }).join('');
  });
}

function creerNouveauProjet() {
  var nom = document.getElementById('nouveau-projet-nom').value.trim();
  var type = document.getElementById('nouveau-projet-type').value;
  if (!nom) { alert('Donnez un nom à votre projet (ex: "Ferme Kossi").'); return; }
  creerProjet(nom, type).then(function (ref) {
    ETAT.projetId = ref.id; ETAT.projetNom = nom;
    ouvrirWizard(type);
  });
}

function ouvrirProjet(projetId) {
  chargerProjet(projetId).then(function (p) {
    ETAT.projetId = p.id; ETAT.projetNom = p.nomProjet;
    Object.assign(ETAT, p.etatComplet.ETAT || {});
    ouvrirWizard(p.typeModule, p.etatComplet.etape || 1);
  });
}

function dupliquerProjetUI(projetId) {
  var nouveauNom = prompt('Nom du nouveau projet dupliqué :');
  if (!nouveauNom) return;
  dupliquerProjet(projetId, nouveauNom).then(function () { afficherEcranMesProjets(); });
}
function renommerProjetUI(projetId, ancienNom) {
  var nouveauNom = prompt('Nouveau nom :', ancienNom);
  if (!nouveauNom || nouveauNom === ancienNom) return;
  renommerProjet(projetId, nouveauNom).then(function () { afficherEcranMesProjets(); });
}
function supprimerProjetUI(projetId) {
  if (!confirm('Supprimer définitivement ce projet ?')) return;
  supprimerProjet(projetId).then(function () { afficherEcranMesProjets(); });
}

function sauvegardeAuto() {
  if (!ETAT.projetId) return;
  var etapeActuelle = parseInt(document.querySelector('.w-step.active').getAttribute('data-step'));
  sauvegarderProgressionProjet(ETAT.projetId, etapeActuelle, JSON.parse(JSON.stringify(ETAT)))
    .catch(function (e) { console.warn('Sauvegarde auto échouée :', e.message); });
}

// ================================================================
//  OUVERTURE DU WIZARD
// ================================================================
function ouvrirWizard(typeModule, etapeDepart) {
  document.getElementById('ecran-auth').style.display = 'none';
  document.getElementById('ecran-mesprojets').style.display = 'none';
  document.getElementById('ecran-wizard').style.display = 'block';
  document.getElementById('titre-wizard').textContent = ETAT.projetNom + ' — ' + typeModule;
  creerChampVille('ville-container');

  if (ETAT.equipements && ETAT.equipements.length) {
    reconstruireTableauDepuisEtat();
  } else {
    addRow();
  }
  allerEtape(etapeDepart || 1);
}

function reconstruireTableauDepuisEtat() {
  var t = document.getElementById('equipmentTable');
  while (t.rows.length > 1) t.deleteRow(1);
  ETAT.equipements.forEach(function (eq) {
    addRow();
    var r = t.rows[t.rows.length - 1];
    r.cells[0].children[0].value = eq.nom;
    r.cells[1].children[0].value = eq.pu;
    r.cells[2].children[0].value = eq.nombre;
    r.cells[3].children[0].value = eq.tempsDeclare || '';
  });
}

// ================================================================
//  ÉTAPE 1 : tableau appareils (+ colonne Temps d'utilisation)
// ================================================================
function addRow() {
  var t = document.getElementById('equipmentTable');
  var r = t.insertRow();
  r.innerHTML =
    '<td><input type="text" placeholder="Ex: Réfrigérateur" oninput="verifierEtape1()"></td>' +
    '<td><input type="number" placeholder="150" min="0" oninput="verifierEtape1()"></td>' +
    '<td><input type="number" placeholder="1" min="1" oninput="verifierEtape1()"></td>' +
    '<td><input type="number" placeholder="Ex: 5" min="1" max="24" oninput="verifierEtape1()"></td>' +
    '<td><button class="del-btn" type="button" onclick="deleteRow(this)">✕</button></td>';
  verifierEtape1();
}
function deleteRow(btn) { btn.closest('tr').remove(); verifierEtape1(); }

function verifierEtape1() {
  var t = document.getElementById('equipmentTable');
  var ok = false;
  for (var i = 1; i < t.rows.length; i++) {
    var c = t.rows[i].cells;
    if (c[0].children[0].value && parseFloat(c[1].children[0].value) > 0 && parseFloat(c[2].children[0].value) > 0 && parseFloat(c[3].children[0].value) > 0) { ok = true; break; }
  }
  return ok;
}

// ================================================================
//  Navigation
// ================================================================
var NB_ETAPES = 6;
function allerEtape(n) {
  if (n === 2 && !passageVersEtape2Valide()) return;
  if (n === 6 && !tousLesTempsAtteints()) { alert('⚠️ Complétez toutes les heures déclarées à l\'étape 2 avant de continuer.'); return; }

  for (var i = 1; i <= NB_ETAPES; i++) {
    var panel = document.getElementById('panel-' + i);
    if (panel) panel.style.display = (i === n) ? 'block' : 'none';
    var stepEl = document.querySelector('.w-step[data-step="' + i + '"]');
    if (stepEl) {
      stepEl.classList.remove('active', 'done');
      if (i === n) stepEl.classList.add('active'); else if (i < n) stepEl.classList.add('done');
    }
  }
  if (n === 2) construireBande24h();
  if (n === 3) construireTableauPanneaux();
  if (n === 4) construireTableauOnduleurs();
  if (n === 5) construireTableauBatteries();
  sauvegardeAuto();
  window.scrollTo({ top: document.getElementById('panel-' + n).offsetTop - 20, behavior: 'smooth' });
}

function passageVersEtape2Valide() {
  var ville = getVilleSelectionnee();
  if (!ville) { alert('⚠️ Sélectionnez d\'abord une ville.'); return false; }
  if (!verifierEtape1()) { alert('⚠️ Ajoutez au moins un appareil complet (nom, puissance, nombre, temps d\'utilisation).'); return false; }
  ETAT.IR = ville.data.hsp;
  return true;
}

// ================================================================
//  ÉTAPE 2 : DEUX BANDES SÉPARÉES — Jour (06h-18h) / Nuit (19h-05h)
// ================================================================
function construireBande24h() {
  var t = document.getElementById('equipmentTable');
  var cont = document.getElementById('bande24h-container');
  cont.innerHTML = '';
  ETAT.equipements = [];

  var hl = parseInt(document.getElementById('heure-lever').value);
  var hc = parseInt(document.getElementById('heure-coucher').value);
  if (isNaN(hl)) hl = 6;
  if (isNaN(hc)) hc = 18;
  ETAT.heureLever = hl; ETAT.heureCoucher = hc;

  // Bande Jour = hl à hc INCLUS ; Bande Nuit = le reste (hc+1 .. 23, 0 .. hl-1)
  var heuresJour = [];
  for (var h = hl; h <= hc; h++) heuresJour.push(h);
  var heuresNuit = [];
  for (var h2 = hc + 1; h2 < 24; h2++) heuresNuit.push(h2);
  for (var h3 = 0; h3 < hl; h3++) heuresNuit.push(h3);

  for (var i = 1; i < t.rows.length; i++) {
    var c = t.rows[i].cells;
    var nom = c[0].children[0].value, pu = parseFloat(c[1].children[0].value),
        nombre = parseFloat(c[2].children[0].value), tempsDeclare = parseInt(c[3].children[0].value);
    if (!nom || !(pu > 0) || !(nombre > 0) || !(tempsDeclare > 0)) continue;
    var idx = ETAT.equipements.length;
    ETAT.equipements.push({ nom: nom, pu: pu, nombre: nombre, tempsDeclare: tempsDeclare, heuresActives: new Array(24).fill(false) });

    var coeffInfo = trouverCoeffDemarrage(nom);
    var badge = coeffInfo ? ' <span style="color:#e65100;font-weight:700;">(inductif ×' + coeffInfo.coeff + ')</span>' : '';

    function construireCases(listeHeures, idx) {
      return listeHeures.map(function (h) {
        return '<div class="bande24h-case"><label>' + h + 'h</label>' +
          '<input type="checkbox" data-idx="' + idx + '" data-h="' + h + '" onchange="majCompteurHeures(' + idx + ')"></div>';
      }).join('');
    }

    var bloc = document.createElement('div');
    bloc.className = 'bande24h-appareil';
    bloc.innerHTML =
      '<div class="bande24h-titre"><span>' + nom + ' (' + pu + ' W × ' + nombre + ')' + badge + '</span>' +
      '<span class="bande24h-compteur" id="compteur-' + idx + '">0 / ' + tempsDeclare + ' h déclarées</span></div>' +

      '<div class="bande24h-groupe bande24h-groupe-jour">' +
        '<div class="bande24h-soustitre">☀️ Heures de jour (' + hl + 'h - ' + hc + 'h)</div>' +
        '<div class="bande24h-grille" id="grille-jour-' + idx + '">' + construireCases(heuresJour, idx) + '</div>' +
      '</div>' +

      '<div class="bande24h-groupe bande24h-groupe-nuit">' +
        '<div class="bande24h-soustitre">🌙 Heures de nuit (' + (hc + 1) + 'h - ' + (hl === 0 ? 23 : hl - 1) + 'h)</div>' +
        '<div class="bande24h-grille" id="grille-nuit-' + idx + '">' + construireCases(heuresNuit, idx) + '</div>' +
      '</div>';

    cont.appendChild(bloc);
  }
  document.getElementById('predim-resultats').innerHTML = '';
}

function majCompteurHeures(idx) {
  var eq = ETAT.equipements[idx];
  var boxes = document.querySelectorAll('input[data-idx="' + idx + '"]');
  var n = 0;
  boxes.forEach(function (b) {
    var h = parseInt(b.getAttribute('data-h'));
    eq.heuresActives[h] = b.checked;
    if (b.checked) n++;
  });

  var compteurEl = document.getElementById('compteur-' + idx);
  var atteint = n >= eq.tempsDeclare;
  compteurEl.textContent = n + ' / ' + eq.tempsDeclare + ' h déclarées';
  compteurEl.style.color = atteint ? '#2e7d32' : '#1565c0';

  // VERROUILLAGE : dès que le total déclaré est atteint, les cases non cochées (jour ET nuit) se grisent
  boxes.forEach(function (b) {
    if (!b.checked) b.disabled = atteint;
  });
  var gJour = document.getElementById('grille-jour-' + idx);
  var gNuit = document.getElementById('grille-nuit-' + idx);
  if (gJour) gJour.classList.toggle('grille-verrouillee', atteint);
  if (gNuit) gNuit.classList.toggle('grille-verrouillee', atteint);
}

function tousLesTempsAtteints() {
  return ETAT.equipements.every(function (eq) {
    return eq.heuresActives.filter(Boolean).length === eq.tempsDeclare;
  });
}

function lancerPredimensionnement() {
  if (!tousLesTempsAtteints()) {
    var manquants = ETAT.equipements.filter(function (eq) { return eq.heuresActives.filter(Boolean).length !== eq.tempsDeclare; });
    var detail = manquants.map(function (eq) {
      return eq.nom + ' : ' + eq.heuresActives.filter(Boolean).length + 'h cochées sur ' + eq.tempsDeclare + 'h déclarées';
    }).join(' · ');
    alert('⚠️ Complétez les heures avant de continuer :\n' + detail);
    return;
  }

  ETAT.bilan = calculerBilanV10(ETAT.equipements, ETAT.heureLever, ETAT.heureCoucher);
  ETAT.Ej = calculerEnergieJournaliere(ETAT.bilan.E_total);
  ETAT.Pc = calculerPuissanceCrete(ETAT.Ej, ETAT.IR);

  var b = ETAT.bilan;
  var html = '<table class="recap-table"><tr><th>Appareil</th><th>Temps</th><th>Jour(Wh)</th><th>Nuit(Wh)</th><th>PT(W)</th></tr>';
  b.lignes.forEach(function (l) {
    html += '<tr><td>' + l.nom + '</td><td>' + l.heures + 'h</td><td>' + l.E_jour.toFixed(0) + '</td><td>' + l.E_nuit.toFixed(0) + '</td><td>' + l.PT.toFixed(0) + '</td></tr>';
  });
  html += '<tr style="font-weight:700;background:#e3f2fd;"><td>TOTAL</td><td></td><td>' + b.E_jour_total.toFixed(0) + '</td><td>' + b.E_nuit_total.toFixed(0) + '</td><td>' + b.PT_total.toFixed(0) + '</td></tr></table>';
  html += '<table class="recap-table"><tr><td>Énergie journalière Ej</td><td><strong>' + ETAT.Ej.toFixed(1) + ' Wh</strong></td></tr>' +
    '<tr><td>Puissance crête Pc</td><td><strong>' + ETAT.Pc.toFixed(0) + ' Wc</strong></td></tr></table>';
  document.getElementById('predim-resultats').innerHTML = html;
  document.getElementById('nav-vers-3').style.display = 'flex';
  sauvegardeAuto();
}

// ================================================================
//  ÉTAPE 3 : PANNEAUX (+ écran "+Nouveau" avec photo)
// ================================================================
function construireTableauPanneaux() {
  if (!ETAT.panneauChoisi) ETAT.panneauChoisi = PANNEAUX_CATALOGUE[0];
  var html = '<table class="w-table"><tr><th></th><th>Fabricant</th><th>Modèle</th><th>Puissance</th><th>VOC</th><th>Icc</th><th>Source</th></tr>';
  PANNEAUX_CATALOGUE.forEach(function (p) {
    var checked = ETAT.panneauChoisi.id === p.id ? 'checked' : '';
    html += '<tr class="' + (checked ? 'selected' : '') + '"><td><input type="radio" name="panneauChoix" ' + checked + ' onchange="ETAT.panneauChoisi=' + "PANNEAUX_CATALOGUE.find(x=>x.id==='" + p.id + "')" + '"></td>' +
      '<td>' + p.fabricant + '</td><td>' + p.modele + '</td><td>' + p.puissance + ' W</td><td>' + p.voc + '</td><td>' + p.icc + '</td><td class="w-hint">' + p.source + '</td></tr>';
  });
  html += '</table>';
  document.getElementById('tableau-panneaux').innerHTML = html;
}

function calculerNbPanneauxUI() {
  if (!ETAT.panneauChoisi) { alert('Sélectionnez un panneau.'); return; }
  ETAT.VmaxMPPT = parseFloat(document.getElementById('vmax-mppt').value) || 150;
  var opt = calculerNombrePanneauxOptimise(ETAT.Pc, ETAT.panneauChoisi.voc, ETAT.VmaxMPPT)(ETAT.panneauChoisi.puissance);
  ETAT.NP = opt.NP_final; ETAT.Ns = opt.Ns; ETAT.N = opt.N; ETAT.V_string = opt.V_string;
  ETAT.Vsys = tensionSysteme(ETAT.Pc);

  var noteAjust = opt.ajusteNombrePremier ? '<p class="w-alerte">ℹ️ ' + opt.NP_calcule + ' panneaux calculés est un nombre premier (non divisible) : ajusté à ' + opt.NP_final + ' pour permettre un arrangement série/parallèle propre.</p>' : '';
  document.getElementById('resultat-panneaux').innerHTML = noteAjust +
    '<table class="recap-table">' +
    '<tr><td>Nombre total de panneaux</td><td><strong>' + ETAT.NP + '</strong></td></tr>' +
    '<tr><td>Arrangement (séries longues privilégiées)</td><td><strong>' + ETAT.Ns + ' séries × ' + ETAT.N + ' parallèles</strong></td></tr>' +
    '<tr><td>Tension d\'une série</td><td><strong>' + ETAT.V_string + ' V</strong></td></tr>' +
    '<tr><td>Puissance installée</td><td><strong>' + ((ETAT.NP * ETAT.panneauChoisi.puissance) / 1000).toFixed(2) + ' kWc</strong></td></tr>' +
    '<tr><td>Tension du système</td><td><strong>' + ETAT.Vsys + ' V</strong></td></tr></table>';
  document.getElementById('btn-vers-4').disabled = false;
  sauvegardeAuto();
}

function viderChamps(ids) {
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
}

function ouvrirAjoutPanneau() {
  viderChamps(['np-fabricant','np-modele','np-puissance','np-voc','np-icc','np-vmp','np-imp']);
  document.getElementById('modal-ajout-panneau').style.display = 'flex';
}
function fermerModal(id) { document.getElementById(id).style.display = 'none'; }
function photoPanneau(input) {
  lireFicheParPhoto(input, 'panneau', function (d) {
    document.getElementById('np-fabricant').value = d.fabricant || '';
    document.getElementById('np-modele').value = d.modele || '';
    document.getElementById('np-puissance').value = d.puissance || '';
    document.getElementById('np-voc').value = d.voc || '';
    document.getElementById('np-icc').value = d.icc || '';
    document.getElementById('np-vmp').value = d.vmp || '';
    document.getElementById('np-imp').value = d.imp || '';
  }, function (msg) { alert(msg); });
}
function validerAjoutPanneau() {
  var p = {
    fabricant: document.getElementById('np-fabricant').value, modele: document.getElementById('np-modele').value,
    puissance: parseFloat(document.getElementById('np-puissance').value), voc: parseFloat(document.getElementById('np-voc').value),
    icc: parseFloat(document.getElementById('np-icc').value), vmp: parseFloat(document.getElementById('np-vmp').value),
    imp: parseFloat(document.getElementById('np-imp').value), annee: new Date().getFullYear()
  };
  if (!p.fabricant || !p.puissance || !p.voc) { alert('Renseignez au moins fabricant, puissance et Voc.'); return; }
  sauvegarderComposantPartage('panneaux', p, PANNEAUX_CATALOGUE, function (saved) {
    ETAT.panneauChoisi = saved;
    fermerModal('modal-ajout-panneau');
    construireTableauPanneaux();
  });
}

// ================================================================
//  ÉTAPE 4 : ONDULEUR + contrôle de compatibilité
// ================================================================
function construireTableauOnduleurs() {
  if (!ETAT.onduleurChoisi) ETAT.onduleurChoisi = ONDULEURS_CATALOGUE[0];
  var html = '<table class="w-table"><tr><th></th><th>Fabricant</th><th>Modèle</th><th>P.Nominale</th><th>Tension Bat.</th><th>Voc Max</th><th>MPPT</th></tr>';
  ONDULEURS_CATALOGUE.forEach(function (o) {
    var checked = ETAT.onduleurChoisi.id === o.id ? 'checked' : '';
    html += '<tr class="' + (checked ? 'selected' : '') + '"><td><input type="radio" name="onduleurChoix" ' + checked + ' onchange="choisirOnduleur(\'' + o.id + '\')"></td>' +
      '<td>' + o.fabricant + '</td><td>' + o.modele + '</td><td>' + o.puissanceNominale + ' W</td>' +
      '<td>' + o.tensionBatMin + '-' + o.tensionBatMax + ' V</td><td>' + (o.vocMax || '—') + ' V</td><td>' + (o.mpptMin ? o.mpptMin + '-' + o.mpptMax + ' V' : '—') + '</td></tr>';
  });
  html += '</table>';
  document.getElementById('tableau-onduleurs').innerHTML = html;
  verifierCompatibiliteUI();
}

function choisirOnduleur(id) { ETAT.onduleurChoisi = ONDULEURS_CATALOGUE.find(function (o) { return o.id === id; }); verifierCompatibiliteUI(); }

function verifierCompatibiliteUI() {
  if (!ETAT.onduleurChoisi || !ETAT.NP) { document.getElementById('resultat-compat').innerHTML = ''; return; }
  var Pconv = calculerPuissanceConvertisseur(ETAT.bilan.P_pointe_max);
  var compat = verifierCompatibiliteOnduleur(ETAT.onduleurChoisi, ETAT.Vsys, ETAT.V_string, ETAT.N * ETAT.panneauChoisi.icc, Pconv.normalise);
  var html = compat.compatible
    ? '<div class="w-alerte" style="background:#e8f5e9;border-color:#2e7d32;color:#1b5e20;">✅ Compatible avec vos panneaux et batteries.</div>'
    : '<div class="w-alerte">❌ Incompatibilité détectée :<ul>' + compat.alertes.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul></div>';
  document.getElementById('resultat-compat').innerHTML = html;
  document.getElementById('btn-vers-5').disabled = !compat.compatible;
  sauvegardeAuto();
}

function ouvrirAjoutOnduleur() {
  viderChamps(['no-fabricant','no-modele','no-pnom','no-vbatmin','no-vbatmax','no-vocmax','no-mpptmin','no-mpptmax','no-imppmax']);
  document.getElementById('modal-ajout-onduleur').style.display = 'flex';
}
function photoOnduleur(input) {
  lireFicheParPhoto(input, 'onduleur', function (d) {
    document.getElementById('no-fabricant').value = d.fabricant || '';
    document.getElementById('no-modele').value = d.modele || '';
    document.getElementById('no-pnom').value = d.puissanceNominale || '';
    document.getElementById('no-vbatmin').value = d.tensionBatMin || '';
    document.getElementById('no-vbatmax').value = d.tensionBatMax || '';
    document.getElementById('no-vocmax').value = d.vocMax || '';
    document.getElementById('no-mpptmin').value = d.mpptMin || '';
    document.getElementById('no-mpptmax').value = d.mpptMax || '';
    document.getElementById('no-imppmax').value = d.imppMax || '';
  }, function (msg) { alert(msg); });
}
function validerAjoutOnduleur() {
  var o = {
    fabricant: document.getElementById('no-fabricant').value, modele: document.getElementById('no-modele').value,
    puissanceNominale: parseFloat(document.getElementById('no-pnom').value),
    puissanceCrete: parseFloat(document.getElementById('no-pnom').value) * 2,
    tensionBatMin: parseFloat(document.getElementById('no-vbatmin').value), tensionBatMax: parseFloat(document.getElementById('no-vbatmax').value),
    vocMax: parseFloat(document.getElementById('no-vocmax').value) || null,
    mpptMin: parseFloat(document.getElementById('no-mpptmin').value) || null, mpptMax: parseFloat(document.getElementById('no-mpptmax').value) || null,
    imppMax: parseFloat(document.getElementById('no-imppmax').value) || null, type: 'Personnalisé'
  };
  if (!o.fabricant || !o.puissanceNominale) { alert('Renseignez au moins fabricant et puissance nominale.'); return; }
  sauvegarderComposantPartage('onduleurs', o, ONDULEURS_CATALOGUE, function (saved) {
    ETAT.onduleurChoisi = saved;
    fermerModal('modal-ajout-onduleur');
    construireTableauOnduleurs();
  });
}

// ================================================================
//  ÉTAPE 5 : BATTERIES (+ stockage/Is + boucle d'optimisation)
// ================================================================
function construireTableauBatteries() {
  if (!ETAT.batterieChoisie) ETAT.batterieChoisie = BATTERIES_CATALOGUE.find(function (b) { return b.type === 'Lithium-LiFePO4'; });
  var html = '<table class="w-table"><tr><th></th><th>Fabricant</th><th>Modèle</th><th>Type</th><th>Tension</th><th>Capacité</th></tr>';
  BATTERIES_CATALOGUE.forEach(function (b) {
    var checked = ETAT.batterieChoisie.id === b.id ? 'checked' : '';
    html += '<tr class="' + (checked ? 'selected' : '') + '"><td><input type="radio" name="batterieChoix" ' + checked + ' onchange="choisirBatterie(\'' + b.id + '\')"></td>' +
      '<td>' + b.fabricant + '</td><td>' + b.modele + '</td><td>' + b.type + '</td><td>' + b.tension + ' V</td><td>' + b.capaciteAh + ' Ah / ' + b.capaciteWh + ' Wh</td></tr>';
  });
  html += '</table>';
  document.getElementById('tableau-batteries').innerHTML = html;
}
function choisirBatterie(id) { ETAT.batterieChoisie = BATTERIES_CATALOGUE.find(function (b) { return b.id === id; }); }

function ouvrirAjoutBatterie() {
  viderChamps(['nb-fabricant','nb-modele','nb-type','nb-tension','nb-ah','nb-wh']);
  document.getElementById('modal-ajout-batterie').style.display = 'flex';
}
function photoBatterie(input) {
  lireFicheParPhoto(input, 'batterie', function (d) {
    document.getElementById('nb-fabricant').value = d.fabricant || '';
    document.getElementById('nb-modele').value = d.modele || '';
    document.getElementById('nb-type').value = d.type || 'Lithium-LiFePO4';
    document.getElementById('nb-tension').value = d.tension || '';
    document.getElementById('nb-ah').value = d.capaciteAh || '';
    document.getElementById('nb-wh').value = d.capaciteWh || '';
  }, function (msg) { alert(msg); });
}
function validerAjoutBatterie() {
  var b = {
    fabricant: document.getElementById('nb-fabricant').value, modele: document.getElementById('nb-modele').value,
    type: document.getElementById('nb-type').value, tension: parseFloat(document.getElementById('nb-tension').value),
    capaciteAh: parseFloat(document.getElementById('nb-ah').value), capaciteWh: parseFloat(document.getElementById('nb-wh').value),
    dod: TD_BATTERIE[document.getElementById('nb-type').value] || 0.8, cycles: 4000
  };
  if (!b.fabricant || !b.tension || !b.capaciteAh) { alert('Renseignez au moins fabricant, tension et capacité.'); return; }
  sauvegarderComposantPartage('batteries', b, BATTERIES_CATALOGUE, function (saved) {
    ETAT.batterieChoisie = saved;
    fermerModal('modal-ajout-batterie');
    construireTableauBatteries();
  });
}

function calculerNbBatteriesUI() {
  if (!ETAT.batterieChoisie) { alert('Sélectionnez une batterie.'); return; }
  ETAT.joursAuto = parseFloat(document.getElementById('jours-autonomie').value) || 1;

  var stockage = calculerBesoinStockage(ETAT.bilan.E_jour_total, ETAT.bilan.E_nuit_total);
  var Is = calculerIndiceStockage(ETAT.bilan.E_nuit_total, ETAT.bilan.E_total);
  var TD = TD_BATTERIE[ETAT.batterieChoisie.type] || 0.8;
  var Cb = calculerCapaciteBatterie(stockage.avecMarge, ETAT.joursAuto, ETAT.Vsys, TD);
  var Nb0 = calculerNombreBatteries(Cb, ETAT.batterieChoisie.capaciteAh);
  var optim = optimiserNombreBatteries(Nb0, ETAT.batterieChoisie.capaciteAh, stockage.avecMarge * ETAT.joursAuto, ETAT.Vsys, TD);

  ETAT.Cb = Cb; ETAT.Nb = optim.Nb_final; ETAT.Is = Is; ETAT.stockage = stockage; ETAT.optimBatteries = optim;

  var jaugeIs = Math.round(Is * 100);
  var noteOptim = optim.Nb_final < optim.Nb_avant_optimisation
    ? '<p class="w-alerte" style="background:#e8f5e9;border-color:#2e7d32;color:#1b5e20;">✅ Optimisation : ' + optim.Nb_avant_optimisation + ' → ' + optim.Nb_final + ' batteries (écart ≤10% conservé, économie pour le client).</p>'
    : '<p class="w-hint">Aucune réduction possible sans dépasser 10% d\'écart avec le besoin réel.</p>';

  document.getElementById('resultat-batteries').innerHTML =
    '<div class="jauge-is"><div class="jauge-is-label">Indice de stockage (Is) : <strong>' + Is + '</strong></div>' +
    '<div class="jauge-is-barre"><div class="jauge-is-remplissage" style="width:' + jaugeIs + '%"></div></div></div>' +
    '<table class="recap-table">' +
    '<tr><td>Énergie à stocker (30%×jour + nuit, +10%)</td><td><strong>' + stockage.avecMarge.toFixed(0) + ' Wh</strong></td></tr>' +
    '<tr><td>Capacité batterie calculée (Cb)</td><td><strong>' + Cb.toFixed(1) + ' Ah</strong></td></tr>' +
    '<tr><td>Nombre de batteries (avant optimisation)</td><td>' + Nb0 + '</td></tr>' +
    '<tr><td>Nombre de batteries retenu</td><td><strong>' + ETAT.Nb + ' × ' + ETAT.batterieChoisie.capaciteAh + ' Ah</strong></td></tr></table>' +
    noteOptim;
  document.getElementById('btn-vers-6').disabled = false;
  sauvegardeAuto();
}

// ================================================================
//  ÉTAPE 6 : VALIDATION
// ================================================================
function onLogoChange(e) {
  var f = e.target.files[0]; if (!f) return;
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
  ia.innerHTML = '<div class="ia-loading">⚡ PULSAR-AI assemble votre dossier...</div>';
  ia.scrollIntoView({ behavior: 'smooth' });

  setTimeout(function () {
    var input = {
      equipements: ETAT.equipements, IR: ETAT.IR, joursAutonomie: ETAT.joursAuto,
      heureLever: ETAT.heureLever, heureCoucher: ETAT.heureCoucher,
      panneau: ETAT.panneauChoisi, Vmax_MPPT: ETAT.VmaxMPPT,
      batterie: { type: ETAT.batterieChoisie.type, capacite: ETAT.batterieChoisie.capaciteAh },
      onduleur: ETAT.onduleurChoisi, L1: 30, L2: 1, L3: 30
    };
    var r = calculDimensionnementComplet(input);
    ETAT.resultatFinal = r;

    var ville = getVilleSelectionnee();
    var contexte = {
      nomModule: ETAT.projetNom, ville: ville ? { nom: ville.nom } : null,
      marque: { nom: ETAT.nomEntreprise, logoDataUrl: ETAT.logoDataUrl }, prefixeRef: 'PEG'
    };
    ETAT.sectionsRapport = construireSectionsRapport(r, contexte);
    ETAT.contexteRapport = contexte;
    ia.innerHTML = rendreRapportHTML(ETAT.sectionsRapport, contexte);

    setTimeout(function () {
      dessiner3DBlocs('rapport-3d', {
        Ns: r.Ns, N: r.N, inclinaisonDeg: (ville && ville.data.inclinaison) || 8,
        kWc: ((r.NP * r.panneau.puissance) / 1000).toFixed(2), ville: { nom: (ville && ville.nom) || '' }
      });
    }, 250);

    document.getElementById('btn-pdf').style.display = 'inline-block';
    sauvegardeAuto();
  }, 500);
}

function genererPDF() {
  if (!ETAT.sectionsRapport) { alert('Lancez d\'abord l\'analyse IA.'); return; }
  genererPDFDepuisSections(ETAT.sectionsRapport, ETAT.contexteRapport);
}